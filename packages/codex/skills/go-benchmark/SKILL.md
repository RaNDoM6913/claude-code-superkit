---
name: go-benchmark
description: Go benchmarking methodology knowledge — testing.B API, benchstat comparison, sub-benchmarks, profile capture (-cpuprofile/-memprofile/-trace), reading output, dead-code elimination trap. Activate when Go code contains `func Benchmark*`, uses `testing.B`, or user asks about Go benchmarks, benchstat, or performance measurement methodology.
user-invocable: false
tokens: 1933
---

# Go Benchmark Methodology

Upstream: https://pkg.go.dev/testing#hdr-Benchmarks · https://pkg.go.dev/golang.org/x/perf/cmd/benchstat

## Why Methodology Matters

Repeated samples expose variation. Choose the number of samples for the workload and comparison.

1. Collect repeated samples under comparable conditions. Six samples alone cannot establish significance.
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
b.StopTimer()
for i := 0; i < b.N; i++ {
    data := buildHeavyInput(i)
    b.StartTimer()
    _ = process(data)
    b.StopTimer()
}
```

For a traditional `b.N` loop, reset after one-time setup. From Go 1.24, `for b.Loop() { … }` resets the timer on its first call and stops it on return of false. Per-iteration preparation inside either loop is timed unless explicitly excluded.

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

Use `GOTOOLCHAIN=local GOPROXY=off GONOPROXY=none` for every example and
version query below. Inspect the selected package’s initialization, tests and
workspace sums first. Keep profiles, traces and benchmark logs in fresh
task-owned paths. For strict offline execution use a network-isolated runner.

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
| `-count N` | Repeated measurements per configuration |
| `-benchtime Xs` or `Nx` | Duration or fixed iterations |
| `-cpu 1,2,4` | Vary GOMAXPROCS |
| `-cpuprofile cpu.prof` | CPU profile |
| `-memprofile mem.prof` | Heap profile |
| `-trace trace.out` | Execution trace |
| `-run ^$` | Skip tests during benchmark runs |

## benchstat Workflow

Use the project's available `benchstat` version and record it with the results.
Codex skill installation does not install this executable. If it is missing,
report comparison as UNAVAILABLE; install a project-compatible version only
within existing setup authority. Sample output below is illustrative, not a
measured result for the current project.

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

- `± N%` — relative confidence interval around the sample median at the selected confidence level.
- `vs base` — relative delta; negative = faster/less.
- `p=0.002` — Mann-Whitney p-value; `< 0.05` is significant.
- `n=10` — sample count used in the comparison.

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

In a traditional `b.N` loop the compiler can eliminate unused work. The compiler treats calls inside the exact `for b.Loop() { … }` form specially. Classic failure: 0.3 ns/op for an operation that obviously can't be that fast.

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
| `-count=1` | Cannot estimate run-to-run variation | Collect repeated independent measurements |
| No benchstat / eyeballing percentages | False wins | Use benchstat; respect `p > 0.05` |
| Setup inside loop | Measures setup + work | Move one-time setup before the loop; for `b.N`, reset after setup |
| Laptop on battery / thermal throttle | CPU downclocks | Plug in, close heavy apps |
| `-benchtime=100x` in CI | 100 iterations form one measurement | Choose a duration or fixed workload suitable for the operation, and repeat measurements |
| Comparing across Go versions / hardware | Apples to oranges | Same machine, same `go version` |
| Ignoring `allocs/op` delta | CPU equal, allocs doubled | Read all three columns |
| Allocation cost is in scope but no measurement was recorded | Missing B/op and allocs/op | Use `-benchmem` or `b.ReportAllocs()` |

## Methodology Checklist

For a comparative claim, record comparable environments and independent repeated
measurements, the effect estimate, the confidence interval and the configured
test of significance. Inspect allocation metrics when the claim includes
memory. Additional machines are relevant when the claim covers them.

## Review Checklist

- A traditional `b.N` benchmark can lose its measured work to compiler
  optimization. Inspect the benchmark body and compiler evidence before
  reporting that failure. A missing sink on its own is insufficient, especially
  for a call inside `for b.Loop() { … }`.
- Report a single measurement as insufficient for a claimed distribution or
  speedup. One run can still verify that a benchmark executes.
- Check whether setup, cleanup and copying were intended to be timed.
- If allocations or throughput are claimed, check the actual B/op, allocs/op or
  bytes-per-operation basis. Choose sub-benchmarks when distinct input classes
  need separate estimates.
