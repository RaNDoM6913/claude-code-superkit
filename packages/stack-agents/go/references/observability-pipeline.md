# Observability Pipeline

> Reference document for go-observability-reviewer. Loaded on demand via Read tool.

## slog Handler Chain

Handlers process log records in a chain. Order matters for performance: cheap filters first, expensive operations last.

```
Record → Sampling → Formatting → Routing → Sinks
           ↓            ↓           ↓         ↓
    Drop 90% of      Add JSON    Split by   File, stdout,
    DEBUG records     format      level      network
```

### Handler Setup

```go
import (
    "log/slog"
    "os"
)

// Production: JSON to stdout (container logs → log aggregator)
func NewProductionLogger() *slog.Logger {
    handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level:     slog.LevelInfo,
        AddSource: true, // adds source file:line
    })
    return slog.New(handler)
}

// Development: human-readable text
func NewDevLogger() *slog.Logger {
    handler := slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    })
    return slog.New(handler)
}
```

### Custom Sampling Handler

```go
type SamplingHandler struct {
    inner    slog.Handler
    rate     float64 // 0.0 to 1.0
    minLevel slog.Level
}

func (h *SamplingHandler) Enabled(ctx context.Context, level slog.Level) bool {
    if level >= h.minLevel {
        return true // always log WARN+
    }
    return rand.Float64() < h.rate // sample DEBUG/INFO
}

func (h *SamplingHandler) Handle(ctx context.Context, r slog.Record) error {
    return h.inner.Handle(ctx, r)
}

func (h *SamplingHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
    return &SamplingHandler{inner: h.inner.WithAttrs(attrs), rate: h.rate, minLevel: h.minLevel}
}

func (h *SamplingHandler) WithGroup(name string) slog.Handler {
    return &SamplingHandler{inner: h.inner.WithGroup(name), rate: h.rate, minLevel: h.minLevel}
}
```

### Structured Logging Best Practices

```go
// CORRECT — structured key-value pairs
logger.Info("user created",
    "user_id", user.ID,
    "email", user.Email,
    "duration_ms", time.Since(start).Milliseconds(),
)

// CORRECT — with group
logger.WithGroup("request").Info("handled",
    "method", r.Method,
    "path", r.URL.Path,
    "status", status,
    "latency_ms", latency.Milliseconds(),
)

// WRONG — unstructured string formatting
logger.Info(fmt.Sprintf("user %d created in %v", user.ID, elapsed))

// WRONG — sensitive data in logs
logger.Info("auth", "password", req.Password, "token", token)
```

## Prometheus Patterns

### Metric Types

| Type | Use When | Example |
|------|----------|---------|
| Counter | Monotonically increasing | Total requests, errors, bytes sent |
| Gauge | Can go up and down | Active connections, queue depth |
| Histogram | Distribution of values | Request duration, response size |
| Summary | Client-side quantiles | Rarely used — prefer Histogram |

### Registration and Usage

```go
import "github.com/prometheus/client_golang/prometheus"

var (
    requestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Namespace: "myapp",
            Subsystem: "http",
            Name:      "requests_total",
            Help:      "Total HTTP requests by method, path, and status.",
        },
        []string{"method", "path", "status"},
    )

    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Namespace: "myapp",
            Subsystem: "http",
            Name:      "request_duration_seconds",
            Help:      "HTTP request duration in seconds.",
            Buckets:   []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10},
        },
        []string{"method", "path"},
    )

    activeConnections = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Namespace: "myapp",
            Subsystem: "server",
            Name:      "active_connections",
            Help:      "Number of active connections.",
        },
    )
)

func init() {
    prometheus.MustRegister(requestsTotal, requestDuration, activeConnections)
}
```

### Middleware Integration

```go
func MetricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        wrapped := &statusRecorder{ResponseWriter: w, status: 200}

        next.ServeHTTP(wrapped, r)

        duration := time.Since(start).Seconds()
        path := normalizePath(r.URL.Path) // prevent cardinality explosion

        requestsTotal.WithLabelValues(r.Method, path, strconv.Itoa(wrapped.status)).Inc()
        requestDuration.WithLabelValues(r.Method, path).Observe(duration)
    })
}
```

### Label Cardinality Rules

| Rule | Good | Bad |
|------|------|-----|
| Bounded label values | `method: GET/POST/PUT/DELETE` | `user_id: 1, 2, ..., 1M` |
| Normalize paths | `/api/users/{id}` | `/api/users/12345` |
| Max ~10 values per label | `status: 2xx, 3xx, 4xx, 5xx` | `status: 200, 201, 204, 301, ...` |
| No UUIDs or IDs in labels | Use log correlation instead | `request_id` as label |

### Histogram Bucket Selection

| Use Case | Buckets |
|----------|---------|
| Fast API (p99 < 100ms) | `.001, .005, .01, .025, .05, .1, .25, .5, 1` |
| Standard API (p99 < 1s) | `.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10` |
| Batch/background jobs | `.1, .5, 1, 5, 10, 30, 60, 120, 300` |
| File upload/download | `.1, .5, 1, 5, 10, 30, 60, 120, 300, 600` |

## OpenTelemetry Setup

### Tracer Provider

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

func initTracer(ctx context.Context) (func(context.Context) error, error) {
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("otel-collector:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, fmt.Errorf("create exporter: %w", err)
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String("myapp"),
            semconv.ServiceVersionKey.String("1.0.0"),
            semconv.DeploymentEnvironmentKey.String("production"),
        )),
        sdktrace.WithSampler(sdktrace.ParentBased(
            sdktrace.TraceIDRatioBased(0.1), // sample 10%
        )),
    )

    otel.SetTracerProvider(tp)
    return tp.Shutdown, nil
}
```

### Context Propagation in HTTP

```go
import "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

// Client — inject trace context into outgoing requests
client := &http.Client{
    Transport: otelhttp.NewTransport(http.DefaultTransport),
}

// Server — extract trace context from incoming requests
handler := otelhttp.NewHandler(mux, "server")
```

### Manual Span Creation

```go
func (s *Service) ProcessOrder(ctx context.Context, orderID int64) error {
    ctx, span := otel.Tracer("myapp").Start(ctx, "ProcessOrder")
    defer span.End()

    span.SetAttributes(
        attribute.Int64("order.id", orderID),
    )

    if err := s.validate(ctx, orderID); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return err
    }

    return s.execute(ctx, orderID)
}
```

## pprof Endpoints

```go
import "net/http/pprof"

// Separate debug server (recommended for production)
go func() {
    debugMux := http.NewServeMux()
    debugMux.HandleFunc("/debug/pprof/", pprof.Index)
    debugMux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
    debugMux.HandleFunc("/debug/pprof/profile", pprof.Profile)
    debugMux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
    debugMux.HandleFunc("/debug/pprof/trace", pprof.Trace)
    http.ListenAndServe("localhost:6060", debugMux) // localhost only!
}()
```

**Enable block/mutex profiling (off by default):**

```go
runtime.SetBlockProfileRate(1)  // 1 = every block event
runtime.SetMutexProfileFraction(5) // 1/5 of mutex events
```

## Health Checks

### Liveness vs Readiness

| Endpoint | Purpose | Checks | K8s Probe |
|----------|---------|--------|-----------|
| `/health` | Is the process alive? | Process up, not deadlocked | `livenessProbe` |
| `/ready` | Can it serve traffic? | DB connected, cache warm, deps OK | `readinessProbe` |

```go
func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (s *Server) readyHandler(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
    defer cancel()

    checks := map[string]error{
        "database": s.db.Ping(ctx),
        "cache":    s.cache.Ping(ctx),
    }

    status := http.StatusOK
    result := make(map[string]string)
    for name, err := range checks {
        if err != nil {
            status = http.StatusServiceUnavailable
            result[name] = err.Error()
        } else {
            result[name] = "ok"
        }
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(result)
}
```

### Kubernetes Probe Config

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3
```

## When to Use

Apply when reviewing observability setup and instrumentation. Flag violations as:
- **CRITICAL**: No structured logging (fmt.Printf in production), unbounded label cardinality, sensitive data in logs/metrics
- **WARNING**: Missing health/readiness endpoints, no request duration metrics, pprof exposed publicly
- **SUGGESTION**: Could add sampling handler, trace context propagation, histogram bucket tuning
