---
name: go-benchmark
description: Go benchmarking methodology knowledge — testing.B API, benchstat comparison, sub-benchmarks, profile capture (-cpuprofile/-memprofile/-trace), reading output, dead-code elimination trap. Activate when Go code contains `func Benchmark*`, uses `testing.B`, or user asks about Go benchmarks, benchstat, or performance measurement methodology.
user-invocable: false
---

# Go Benchmark Methodology

Upstream: https://pkg.go.dev/testing#hdr-Benchmarks · https://pkg.go.dev/golang.org/x/perf/cmd/benchstat

## Why Methodology Matters

A single run is a measurement, not an answer. Noise dwarfs changes under ~10%. Rules:

1. `-count=6` minimum (statistical significance).
2. Compare with `benchstat`, not eyeball percentages.
3. Quiet machine — close heavy apps; plug in the laptop.
4. Always use `-benchmem`. Allocations are usually what changed.

## testing.B Basics

```go
func BenchmarkUserLookup(b *testing.B) {
    repo := newRepo(b)
    b.ReportAllocs() // force B/op + allocs/op output
    b.ResetTimer()   // drop setup cost
    for i := 0; i < b.N; i++ {
        _, err := repo.FindByID(context.Background(), 42)
        if err != nil { b.Fatal(err) }
    }
}
```

- `b.N` is adjusted by the framework until total runtime hits `-benchtime` (default 1s).
- Write the body so `b.N` iterations make sense.
- Don't swallow errors — use `b.Fatal`.

### Timing Control

```go
for i := 0; i < b.N; i++ {
    data := buildHeavyInput(i)
    b.StartTimer()
    _ = process(data)
    b.StopTimer()
}
```

Prefer `b.ResetTimer` before the loop; per-iteration Start/Stop adds overhead.

### Throughput

```go
payload := make([]byte, 4096)
b.SetBytes(int64(len(payload)))
b.ResetTimer()
for i := 0; i < b.N; i++ { _ = json.Unmarshal(payload, &out) }
// Output: ... 250 MB/s
```

## Sub-Benchmarks

```go
func BenchmarkSort(b *testing.B) {
    for _, n := range []int{100, 1_000, 10_000, 100_000} {
        b.Run(fmt.Sprintf("n=%d", n), func(b *testing.B) {
            data := randInts(n)
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                cp := slices.Clone(data)
                slices.Sort(cp)
            }
        })
    }
}
```

Target a slash pattern: `go test -bench=BenchmarkSort/n=1000`.

## Running

```bash
go test -bench=. -benchmem -count=6 ./...
go test -bench=BenchmarkJSON -benchtime=3s -count=10
go test -bench=. -benchtime=1000x        # fixed iterations
go test -bench=. -cpu=1,2,4,8            # contention check
go test -bench=. ./pkg/cache/...
```

| Flag | Purpose |
|------|---------|
| `-bench regex` | Which benchmarks |
| `-benchmem` | Always on — B/op + allocs/op |
| `-count N` | Samples (≥ 6) |
| `-benchtime Xs` or `Nx` | Duration or fixed iterations |
| `-cpu 1,2,4` | Vary GOMAXPROCS |
| `-cpuprofile cpu.prof` | CPU profile |
| `-memprofile mem.prof` | Heap profile |
| `-trace trace.out` | Execution trace |
| `-run ^$` | Skip tests during benchmark runs |

## benchstat Workflow

Install: `go install golang.org/x/perf/cmd/benchstat@latest`.

```bash
go test -run ^$ -bench=BenchmarkProcess -benchmem -count=10 > old.txt
# apply change
go test -run ^$ -bench=BenchmarkProcess -benchmem -count=10 > new.txt
benchstat old.txt new.txt
```

Output:

```
                  │    old.txt    │              new.txt               │
                  │    sec/op     │    sec/op     vs base              │
Process-8            12.30m ± 2%     8.70m ± 1%  -29.27% (p=0.002 n=10)

                  │     B/op      │    B/op     vs base              │
Process-8             4.80Ki ± 0%   1.20Ki ± 0%  -75.00% (p=0.002 n=10)
```

- `± N%` — coefficient of variation; under 5% is stable.
- `vs base` — relative delta; negative = faster/less.
- `p=0.002` — Mann-Whitney p-value; `< 0.05` is significant.
- `n=10` — sample size (may be trimmed for outliers).

If `p > 0.05`, benchstat prints `~` — don't claim a win on insignificant results.

## Profiling Alongside

```bash
go test -run ^$ -bench=BenchmarkProcess -cpuprofile cpu.prof -memprofile mem.prof -count=1
go tool pprof cpu.prof
# (pprof) top 20
# (pprof) list ProcessOrder
# (pprof) web

go test -bench=BenchmarkProcess -trace trace.out -benchtime=5s
go tool trace trace.out
```

## Dead Code Elimination Trap

Benchmarks without a used result get eliminated. Classic failure: 0.3 ns/op for an operation that obviously can't be that fast.

```go
// WRONG — result unused
for i := 0; i < b.N; i++ { hash("hello") }

// RIGHT — assign to package-level sink
var sink uint64
func BenchmarkHash(b *testing.B) {
    var s uint64
    for i := 0; i < b.N; i++ { s = hash("hello") }
    sink = s
}
```

Alternatives: `runtime.KeepAlive(result)`, `if sink == 0 { b.Log(sink) }`. Symptom: ns/op too small for the work. Check with `go test -gcflags="-m"`.

## Reading Output

```
BenchmarkFoo-8    1000000    1234 ns/op    456 B/op    7 allocs/op
```

| Column | Meaning |
|--------|---------|
| `BenchmarkFoo-8` | Name + GOMAXPROCS |
| `1000000` | Iterations (`b.N`) |
| `1234 ns/op` | Wall-clock ns per op |
| `456 B/op` | Bytes allocated per op |
| `7 allocs/op` | Heap allocations per op |

Derived: ops/sec = `1e9 / ns/op`. Target "0 allocs/op" on hot paths.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| `-count=1` | Can't distinguish noise | `-count=6` minimum |
| No benchstat / eyeballing percentages | False wins | Use benchstat; respect `p > 0.05` |
| Setup inside loop | Measures setup + work | Pull out; `b.ResetTimer` |
| Laptop on battery / thermal throttle | CPU downclocks | Plug in, close heavy apps |
| `-benchtime=100x` in CI | 100 samples is nothing | `-benchtime=2s` or more |
| Comparing across Go versions / hardware | Apples to oranges | Same machine, same `go version` |
| Ignoring `allocs/op` delta | CPU equal, allocs doubled | Read all three columns |
| `b.ReportAllocs` missing | No allocation output | Add it |

## Methodology Checklist

Before claiming a win:

- [ ] `-count=6`+
- [ ] Quiet machine
- [ ] `benchstat` shows `p < 0.05`
- [ ] Inspected `B/op` and `allocs/op`
- [ ] Sink or `runtime.KeepAlive` if result unconsumed
- [ ] Reproduced on a second machine

## Review Checklist

Flag:

- **CRITICAL** — Benchmark result never consumed (missing sink) → measuring nothing
- **WARNING** — `-count=1` in CI / PR templates
- **WARNING** — Setup inside the loop, no `b.ResetTimer`
- **WARNING** — No `-benchmem` / `b.ReportAllocs()` missing
- **SUGGESTION** — No sub-benchmarks for a parameter sweep
- **SUGGESTION** — Missing `b.SetBytes` in I/O / parsing benchmarks
