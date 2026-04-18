---
name: go-grpc-patterns
description: gRPC Go knowledge — service/stream types, interceptors, status codes, deadline propagation, TLS/mTLS, bufconn testing, common pitfalls. Activate when Go code imports `google.golang.org/grpc`, handles `.proto` files, or user asks about gRPC services, interceptors, or status codes.
user-invocable: false
---

# gRPC Patterns (Go)

Upstream: https://pkg.go.dev/google.golang.org/grpc · https://grpc.io/docs/languages/go/

## Service Definition

Proto-first. Generate with `protoc-gen-go` + `protoc-gen-go-grpc`.

```proto
syntax = "proto3";
package user.v1;
option go_package = "example.com/gen/user/v1;userv1";

service UserService {
    rpc GetUser (GetUserRequest) returns (User);                  // unary
    rpc ListUsers (ListUsersRequest) returns (stream User);       // server streaming
    rpc UploadUsers (stream User) returns (UploadUsersResponse);  // client streaming
    rpc Chat (stream Message) returns (stream Message);           // bidi
}
```

Version packages (`user.v1`, `user.v2`) — never break a shipped proto. Add fields; never renumber.

## Server Setup

```go
lis, _ := net.Listen("tcp", ":9090")
srv := grpc.NewServer(
    grpc.UnaryInterceptor(loggingInterceptor),
    grpc.StreamInterceptor(streamLoggingInterceptor),
)
userv1.RegisterUserServiceServer(srv, &userServer{repo: repo})
reflection.Register(srv) // dev only
srv.Serve(lis)
```

Graceful shutdown: `srv.GracefulStop()` on SIGTERM.

## Four Stream Types

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

```go
func (s *userServer) ListUsers(req *userv1.ListUsersRequest, stream userv1.UserService_ListUsersServer) error {
    users, err := s.repo.List(stream.Context(), req.PageSize)
    if err != nil { return status.Errorf(codes.Internal, "list: %v", err) }
    for _, u := range users {
        if err := stream.Send(&userv1.User{Id: u.ID, Email: u.Email}); err != nil {
            return err
        }
    }
    return nil
}
```

Check `stream.Context().Err()` in long loops to bail on client cancellation.

### Client Streaming

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

### Bidi

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

Return `status.Error` / `status.Errorf` with a `codes.*` code. Raw Go errors become `codes.Unknown` — useless for clients.

```go
return nil, status.Errorf(codes.NotFound, "user %d not found", id)
return nil, status.Errorf(codes.InvalidArgument, "email required")
return nil, status.Errorf(codes.PermissionDenied, "missing role")
return nil, status.Errorf(codes.DeadlineExceeded, "timeout")
```

Client side:

```go
resp, err := client.GetUser(ctx, req)
if err != nil {
    st, ok := status.FromError(err)
    if !ok { return fmt.Errorf("unknown: %w", err) }
    switch st.Code() {
    case codes.NotFound:    return handleNotFound()
    case codes.Unavailable: return retry()
    default:                return fmt.Errorf("grpc: %s", st.Message())
    }
}
```

Rich details: `status.WithDetails(&errdetails.BadRequest{...})`.

## Interceptors

Cross-cutting: auth, logging, metrics, panic recovery.

### Logging

```go
func loggingInterceptor(ctx context.Context, req any, info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler) (any, error) {
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
md, ok := metadata.FromIncomingContext(ctx)
if !ok { return nil, status.Error(codes.Unauthenticated, "no metadata") }
tokens := md.Get("authorization")
if len(tokens) == 0 { return nil, status.Error(codes.Unauthenticated, "missing token") }
user, err := verify(tokens[0])
if err != nil { return nil, status.Error(codes.Unauthenticated, "invalid token") }
ctx = context.WithValue(ctx, userCtxKey{}, user)
return handler(ctx, req)
```

### Chain

```go
srv := grpc.NewServer(
    grpc.ChainUnaryInterceptor(recoveryInterceptor, loggingInterceptor, authInterceptor),
    grpc.ChainStreamInterceptor(streamRecovery, streamLogging),
)
```

Libraries: `go-grpc-middleware` (recovery, auth, prometheus), `otelgrpc` (tracing).

## Deadline Propagation

```go
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()
resp, err := client.GetUser(ctx, req) // timeout propagates as grpc-timeout header

// Server: pass ctx down to DB, other RPCs
u, err := s.repo.FindByID(ctx, req.Id)
```

Never use `context.Background()` in a handler unless you intentionally detach (work must outlive the request).

## Connection Lifecycle

```go
conn, err := grpc.NewClient("dns:///users.svc:9090",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
    grpc.WithDefaultServiceConfig(`{"loadBalancingPolicy":"round_robin"}`),
)
defer conn.Close()
client := userv1.NewUserServiceClient(conn)
```

- One `*grpc.ClientConn` per upstream service; share across goroutines.
- `grpc.NewClient` (new API) defers connection until first RPC.
- Retries / hedging via ServiceConfig JSON, not ad-hoc.

## TLS / mTLS

Server TLS:

```go
cert, _ := tls.LoadX509KeyPair("server.crt", "server.key")
creds := credentials.NewTLS(&tls.Config{Certificates: []tls.Certificate{cert}})
srv := grpc.NewServer(grpc.Creds(creds))
```

Client TLS:

```go
creds := credentials.NewTLS(&tls.Config{ServerName: "users.svc"})
conn, _ := grpc.NewClient("users.svc:443", grpc.WithTransportCredentials(creds))
```

mTLS (both sides authenticate):

```go
pool := x509.NewCertPool()
caCert, _ := os.ReadFile("ca.crt")
pool.AppendCertsFromPEM(caCert)
creds := credentials.NewTLS(&tls.Config{
    Certificates: []tls.Certificate{serverCert},
    ClientAuth:   tls.RequireAndVerifyClientCert,
    ClientCAs:    pool,
})
```

Production: SPIFFE / service mesh for cert rotation.

## Testing with bufconn

```go
import "google.golang.org/grpc/test/bufconn"

lis := bufconn.Listen(1024 * 1024)
srv := grpc.NewServer()
userv1.RegisterUserServiceServer(srv, &userServer{repo: fakeRepo(t)})
go srv.Serve(lis)

dialer := func(context.Context, string) (net.Conn, error) { return lis.Dial() }
conn, _ := grpc.NewClient("passthrough:///bufnet",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
    grpc.WithContextDialer(dialer),
)
client := userv1.NewUserServiceClient(conn)
```

In-memory, no ports. Use for integration tests spanning the service layer. For unit tests, mock the generated server interface.

## Review Checklist

Flag:

- **CRITICAL** — Handler returns raw error instead of `status.Error` (clients can't match)
- **CRITICAL** — No panic-recovery interceptor
- **CRITICAL** — `reflection.Register` enabled in production
- **WARNING** — Per-request `grpc.NewClient` / `*grpc.ClientConn`
- **WARNING** — Stream handler without `select { case <-ctx.Done() }` in loop
- **WARNING** — Proto field numbers renumbered/reused
- **WARNING** — Client RPC without deadline
- **SUGGESTION** — Auth/logging/metrics outside interceptors
- **SUGGESTION** — Missing `otelgrpc` in a traced system
