# gRPC Patterns

> Reference document for go-reviewer. Loaded on demand via Read tool.
> Upstream: https://pkg.go.dev/google.golang.org/grpc · https://grpc.io/docs/languages/go/

## Service Definition

Proto-first. Write the contract, generate code with `protoc-gen-go` + `protoc-gen-go-grpc`.

```proto
// api/user.proto
syntax = "proto3";
package user.v1;
option go_package = "example.com/gen/user/v1;userv1";

service UserService {
    rpc GetUser (GetUserRequest) returns (User);                  // unary
    rpc ListUsers (ListUsersRequest) returns (stream User);       // server streaming
    rpc UploadUsers (stream User) returns (UploadUsersResponse);  // client streaming
    rpc Chat (stream Message) returns (stream Message);           // bidi streaming
}

message GetUserRequest { int64 id = 1; }
message User { int64 id = 1; string email = 2; }
```

Generation:

```bash
protoc --go_out=gen --go_opt=paths=source_relative \
       --go-grpc_out=gen --go-grpc_opt=paths=source_relative \
       api/user.proto
```

Version proto packages (`user.v1`, `user.v2`) — never break a shipped proto. Add fields (they're backward-compatible); don't renumber existing ones.

## Server Setup

```go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/reflection"
    userv1 "example.com/gen/user/v1"
)

func main() {
    lis, err := net.Listen("tcp", ":9090")
    if err != nil { log.Fatal(err) }

    srv := grpc.NewServer(
        grpc.UnaryInterceptor(loggingInterceptor),
        grpc.StreamInterceptor(streamLoggingInterceptor),
    )
    userv1.RegisterUserServiceServer(srv, &userServer{repo: repo})
    reflection.Register(srv) // dev only — gRPCurl, Evans

    if err := srv.Serve(lis); err != nil { log.Fatal(err) }
}
```

For graceful shutdown: `srv.GracefulStop()` on SIGTERM — waits for in-flight RPCs, rejects new ones.

## The Four Stream Types

### Unary

```go
func (s *userServer) GetUser(ctx context.Context, req *userv1.GetUserRequest) (*userv1.User, error) {
    u, err := s.repo.FindByID(ctx, req.Id)
    if err != nil {
        if errors.Is(err, domain.ErrNotFound) {
            return nil, status.Errorf(codes.NotFound, "user %d not found", req.Id)
        }
        return nil, status.Errorf(codes.Internal, "find user: %v", err)
    }
    return &userv1.User{Id: u.ID, Email: u.Email}, nil
}
```

### Server Streaming

Server sends 0..N responses; client reads until EOF.

```go
func (s *userServer) ListUsers(req *userv1.ListUsersRequest, stream userv1.UserService_ListUsersServer) error {
    users, err := s.repo.List(stream.Context(), req.PageSize)
    if err != nil { return status.Errorf(codes.Internal, "list users: %v", err) }

    for _, u := range users {
        if err := stream.Send(&userv1.User{Id: u.ID, Email: u.Email}); err != nil {
            return err // connection likely gone — no wrap needed
        }
    }
    return nil
}
```

Always check `stream.Context().Err()` in long loops to bail when the client cancels.

### Client Streaming

Client sends N requests; server returns one final response.

```go
func (s *userServer) UploadUsers(stream userv1.UserService_UploadUsersServer) error {
    var count int
    for {
        u, err := stream.Recv()
        if errors.Is(err, io.EOF) {
            return stream.SendAndClose(&userv1.UploadUsersResponse{Count: int32(count)})
        }
        if err != nil { return err }
        if err := s.repo.Save(stream.Context(), u); err != nil {
            return status.Errorf(codes.Internal, "save: %v", err)
        }
        count++
    }
}
```

### Bidi Streaming

Both sides send/recv concurrently. Typically use two goroutines.

```go
func (s *chatServer) Chat(stream chatv1.ChatService_ChatServer) error {
    errCh := make(chan error, 2)
    go func() {
        for {
            msg, err := stream.Recv()
            if errors.Is(err, io.EOF) { errCh <- nil; return }
            if err != nil { errCh <- err; return }
            s.broadcast(msg)
        }
    }()
    go func() {
        for msg := range s.subscribe() {
            if err := stream.Send(msg); err != nil { errCh <- err; return }
        }
        errCh <- nil
    }()
    return <-errCh
}
```

## Error Handling

Return `status.Error` / `status.Errorf` with a `codes.*` code. Raw Go errors get wrapped as `codes.Unknown` — always unhelpful for clients.

```go
import (
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

return nil, status.Errorf(codes.NotFound, "user %d not found", id)
return nil, status.Errorf(codes.InvalidArgument, "email required")
return nil, status.Errorf(codes.PermissionDenied, "caller lacks role")
return nil, status.Errorf(codes.DeadlineExceeded, "query timed out")
```

Canonical mapping (RFC): https://grpc.io/docs/guides/status-codes/

Client side:

```go
resp, err := client.GetUser(ctx, &userv1.GetUserRequest{Id: 42})
if err != nil {
    st, ok := status.FromError(err)
    if !ok {
        return fmt.Errorf("unknown error: %w", err)
    }
    switch st.Code() {
    case codes.NotFound:
        return handleNotFound()
    case codes.Unavailable:
        return retry()
    default:
        return fmt.Errorf("grpc: %s", st.Message())
    }
}
```

For rich error details (validation field lists, retry info), attach proto details: `status.WithDetails(&errdetails.BadRequest{...})`.

## Interceptors

Cross-cutting concerns: auth, logging, metrics, panic recovery. One unary interceptor + one stream interceptor per server, composed.

### Unary logging

```go
func loggingInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error) {
    start := time.Now()
    resp, err := handler(ctx, req)
    slog.Info("rpc",
        "method", info.FullMethod,
        "duration_ms", time.Since(start).Milliseconds(),
        "code", status.Code(err),
    )
    return resp, err
}
```

### Auth

```go
func authInterceptor(ctx context.Context, req interface{},
    info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {

    md, ok := metadata.FromIncomingContext(ctx)
    if !ok { return nil, status.Error(codes.Unauthenticated, "no metadata") }

    tokens := md.Get("authorization")
    if len(tokens) == 0 {
        return nil, status.Error(codes.Unauthenticated, "missing token")
    }
    user, err := verify(tokens[0])
    if err != nil {
        return nil, status.Error(codes.Unauthenticated, "invalid token")
    }
    ctx = context.WithValue(ctx, userCtxKey{}, user)
    return handler(ctx, req)
}
```

### Chain multiple interceptors

```go
srv := grpc.NewServer(
    grpc.ChainUnaryInterceptor(recoveryInterceptor, loggingInterceptor, authInterceptor),
    grpc.ChainStreamInterceptor(streamRecoveryInterceptor, streamLoggingInterceptor),
)
```

Well-known libraries: `go-grpc-middleware` (auth, logging, recovery, prometheus), `otelgrpc` (OpenTelemetry tracing).

## Deadline Propagation

Client sets a deadline on the context; gRPC sends it as `grpc-timeout` header; server sees it via `ctx.Done()`.

```go
// Client
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()
resp, err := client.GetUser(ctx, req) // timeout propagates

// Server — cascade to downstream calls
func (s *userServer) GetUser(ctx context.Context, req *userv1.GetUserRequest) (*userv1.User, error) {
    u, err := s.repo.FindByID(ctx, req.Id) // same ctx; DB honors the deadline
    // ...
}
```

Never start a background goroutine with `context.Background()` unless the work must outlive the request — detach only intentionally.

## Connection Lifecycle

```go
conn, err := grpc.NewClient("dns:///users.svc:9090",
    grpc.WithTransportCredentials(insecure.NewCredentials()), // TLS below
    grpc.WithDefaultServiceConfig(`{"loadBalancingPolicy":"round_robin"}`),
)
if err != nil { return err }
defer conn.Close()

client := userv1.NewUserServiceClient(conn)
```

- One `*grpc.ClientConn` per upstream service, shared across goroutines — it's already a pool.
- `grpc.NewClient` (replaces deprecated `grpc.Dial`) — defers actual connection until first RPC.
- For retries / hedging, set it in the ServiceConfig JSON, not ad-hoc on the client side.

## TLS & mTLS

### Server TLS

```go
cert, err := tls.LoadX509KeyPair("server.crt", "server.key")
if err != nil { return err }
creds := credentials.NewTLS(&tls.Config{Certificates: []tls.Certificate{cert}})
srv := grpc.NewServer(grpc.Creds(creds))
```

### Client TLS

```go
creds := credentials.NewTLS(&tls.Config{ServerName: "users.svc"})
conn, _ := grpc.NewClient("users.svc:443", grpc.WithTransportCredentials(creds))
```

### mTLS (both sides authenticate)

```go
// Server
pool := x509.NewCertPool()
caCert, _ := os.ReadFile("ca.crt")
pool.AppendCertsFromPEM(caCert)
creds := credentials.NewTLS(&tls.Config{
    Certificates: []tls.Certificate{serverCert},
    ClientAuth:   tls.RequireAndVerifyClientCert,
    ClientCAs:    pool,
})
```

Production: use SPIFFE / service mesh (Linkerd, Istio) for cert rotation; rolling your own expiry handling is a slow-moving incident factory.

## Testing: bufconn

`google.golang.org/grpc/test/bufconn` — in-memory listener, no ports, no network.

```go
import "google.golang.org/grpc/test/bufconn"

func newTestServer(t *testing.T) (userv1.UserServiceClient, func()) {
    lis := bufconn.Listen(1024 * 1024)
    srv := grpc.NewServer()
    userv1.RegisterUserServiceServer(srv, &userServer{repo: fakeRepo(t)})
    go srv.Serve(lis)

    dialer := func(context.Context, string) (net.Conn, error) { return lis.Dial() }
    conn, err := grpc.NewClient("passthrough:///bufnet",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithContextDialer(dialer),
    )
    if err != nil { t.Fatal(err) }

    return userv1.NewUserServiceClient(conn),
        func() { conn.Close(); srv.Stop() }
}
```

Use bufconn for integration tests spanning the full service layer. For handler-only unit tests, mock the generated server interface (`userv1.UserServiceServer`) and call methods directly.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Returning raw `errors.New` from handler | Client sees `codes.Unknown` | Use `status.Errorf(codes.*, ...)` |
| `context.Background()` inside a handler | Leaks past the RPC; can run forever | Pass the request `ctx` or detach deliberately |
| Creating a new `ClientConn` per request | TCP storm, TLS handshake on every call | One conn per upstream, shared |
| Blocking in a stream handler without checking `Context().Done()` | Hangs when client disconnects | Select on `ctx.Done()` in loops |
| Forgetting `reflection.Register` in dev | grpcurl returns "unknown service" | Register reflection; disable in prod |
| Breaking proto changes (renumber, rename) | Old clients crash | Add new fields with new numbers; never reuse |
| No interceptor for panic recovery | Single panic kills the server process | Add `grpc_recovery` or write one |
| Missing deadlines | Runaway calls pin goroutines | Always set client-side `WithTimeout` |

## Review Checklist

When reviewing gRPC code, flag:

- **CRITICAL** — Handler returns a raw error instead of `status.Error` (clients can't match on code)
- **CRITICAL** — No recovery interceptor (one panic kills the server)
- **CRITICAL** — `reflection.Register` enabled in production (schema + method enumeration leak)
- **WARNING** — Per-request `grpc.NewClient` / per-request `*grpc.ClientConn` (should be shared)
- **WARNING** — Stream handler without `select { case <-ctx.Done() }` in its loop
- **WARNING** — Proto field numbers renumbered or reused
- **WARNING** — Client RPC without a deadline
- **SUGGESTION** — Cross-cutting code (auth, logging, metrics) outside interceptors — should be an interceptor
- **SUGGESTION** — Missing `otelgrpc` interceptor in a traced system

## Further Reading

- gRPC Go docs: https://pkg.go.dev/google.golang.org/grpc
- Status codes guide: https://grpc.io/docs/guides/status-codes/
- `go-grpc-middleware`: https://github.com/grpc-ecosystem/go-grpc-middleware
- OpenTelemetry gRPC: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- Buf (proto tooling): https://buf.build/docs
