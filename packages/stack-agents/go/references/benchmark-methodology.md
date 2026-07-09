# Benchmark Methodology

> Reference document for go-reviewer, go-performance-reviewer. Loaded on demand via Read tool.
> Upstream: https://pkg.go.dev/testing#hdr-Benchmarks · https://pkg.go.dev/golang.org/x/perf/cmd/benchstat

## Why Methodology Matters

A single benchmark run is a measurement, not an answer. CPUs, filesystems, and the Go scheduler introduce noise that dwarfs changes under ~10%. Without a repeatable methodology, "my change is 30% faster" often means "my last run happened to be fast."

Rules of the game:

1. Run every benchmark with `-count=6` (or more) — one run is noise.
2. Compare two versions with `benchstat` — it reports p-values, not just percentage deltas.
3. Quiet machine: close the browser, turn off other builds, plug in the laptop.
4. Use `-benchmem` always. Allocations are usually the thing that changed.

## `testing.B` Basics

```go
func BenchmarkUserLookup(b *testing.B) {
    repo := newRepo(b)

    b.ReportAllocs()   // always; force B/op + allocs/op output
    b.ResetTimer()     // drop setup cost from the measurement

    for i := 0; i < b.N; i++ {
        _, err := repo.FindByID(context.Background(), 42)
        if err != nil { b.Fatal(err) }
    }
}
```

- `b.N` — the framework adjusts this until the benchmark runs for `-benchtime` (default 1s).
- Write the body so that calling it `b.N` times is meaningful — don't do setup inside the loop.
- `b.Fatal` / `b.Fatalf` marks the whole benchmark as failed; don't swallow errors.

### Timing Control

```go
func BenchmarkWithSetup(b *testing.B) {
    for i := 0; i < b.N; i++ {
        data := buildHeavyInput(i) // setup cost we don't want to measure
        b.StartTimer()             // rare — default is running
        _ = process(data)
        b.StopTimer()              // stop measuring, keep the loop going
    }
}
```

Prefer `b.ResetTimer` right before the loop and avoid per-iteration StopTimer/StartTimer — the per-call overhead skews results.

### Throughput Reporting

`b.SetBytes(n)` makes the framework report `MB/s`:

```go
func BenchmarkJSON(b *testing.B) {
    payload := make([]byte, 4096)
    b.SetBytes(int64(len(payload)))
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _ = json.Unmarshal(payload, &out)
    }
}
// Output: ... 250 MB/s
```

Use `SetBytes` for I/O, parsing, compression — anything where "X MB/s" is the natural unit.

## Sub-Benchmarks

`b.Run` for parameter sweeps — input sizes, algorithm variants:

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

Output:

```
BenchmarkSort/n=100-8       500000   2643 ns/op
BenchmarkSort/n=1000-8       30000  38120 ns/op
BenchmarkSort/n=10000-8       2500 472900 ns/op
BenchmarkSort/n=100000-8       200 5.82e+06 ns/op
```

Use the `/` pattern in `-bench`: `go test -bench=BenchmarkSort/n=1000`.

## Running Benchmarks

```bash
# Basic — run every Benchmark*, capture memory, 6 samples
go test -bench=. -benchmem -count=6 ./...

# Focus a single benchmark, longer runtime for smaller-variance numbers
go test -bench=BenchmarkJSON -benchtime=3s -count=10

# Fixed iteration count (debugging flaky benchmarks)
go test -bench=. -benchtime=1000x

# CPU sweep — measure at 1/2/4/8 cores
go test -bench=. -cpu=1,2,4,8

# Alternate package
go test -bench=. ./pkg/cache/...
```

Key flags:

| Flag | Purpose |
|------|---------|
| `-bench regex` | Which benchmarks to run (`.` = all) |
| `-benchmem` | Report `B/op` + `allocs/op` — always on |
| `-count N` | Run each benchmark N times (≥ 6 for stats) |
| `-benchtime Xs` or `-benchtime Nx` | Target duration OR fixed iterations |
| `-cpu 1,2,4` | Set `GOMAXPROCS` for each run — finds contention |
| `-cpuprofile cpu.prof` | Capture CPU profile |
| `-memprofile mem.prof` | Capture heap profile |
| `-trace trace.out` | Execution tracer output |
| `-run ^$` | Skip tests (tests run by default alongside benchmarks) |

## benchstat Workflow

Install: `go install golang.org/x/perf/cmd/benchstat@latest`.

```bash
# Baseline — your current branch
go test -run ^$ -bench=BenchmarkProcess -benchmem -count=10 > old.txt

# Apply your change, then:
go test -run ^$ -bench=BenchmarkProcess -benchmem -count=10 > new.txt

benchstat old.txt new.txt
```

**Capture the two passes serially on the same quiet machine.** Run the `old.txt` pass, then the `new.txt` pass — never concurrently, and never on different hardware. Concurrent captures reintroduce the CPU/cache/scheduler contention that benchstat's `p`-values exist to remove, silently corrupting the comparison. This is orthogonal to the `-cpu` sweep, which varies `GOMAXPROCS` *within* a single pass.

Output:

```
                  │    old.txt    │              new.txt               │
                  │    sec/op     │    sec/op     vs base              │
Process-8            12.30m ± 2%     8.70m ± 1%  -29.27% (p=0.002 n=10)

                  │    old.txt    │             new.txt              │
                  │     B/op      │    B/op     vs base              │
Process-8             4.80Ki ± 0%   1.20Ki ± 0%  -75.00% (p=0.002 n=10)
```

Read:

- `± N%` — coefficient of variation; under 5% is stable.
- `vs base` — relative delta; negative is faster / less memory.
- `p=0.002` — Mann-Whitney U test p-value; `< 0.05` means statistically significant.
- `n=10` — sample size used (might be trimmed if outliers were rejected).

If `p > 0.05`, benchstat prints `~` — the delta is indistinguishable from noise. Don't claim wins on insignificant results.

## Profiling Alongside Benchmarks

```bash
go test -run ^$ -bench=BenchmarkProcess -cpuprofile cpu.prof -memprofile mem.prof -count=1

go tool pprof cpu.prof
# (pprof) top 20
# (pprof) list ProcessOrder
# (pprof) web      # flame graph in browser
```

For long-running benchmarks, also capture a trace:

```bash
go test -bench=BenchmarkProcess -trace trace.out -benchtime=5s
go tool trace trace.out
```

The trace UI shows goroutine scheduling, GC pauses, and syscall blocking — invaluable for diagnosing variance.

## The Dead Code Elimination Trap

Benchmarks that don't use their result get eliminated by the compiler. Classic failure mode: you measure 0.3 ns/op for a function that obviously can't be that fast.

```go
// WRONG — result unused, loop may be elided
func BenchmarkHash(b *testing.B) {
    for i := 0; i < b.N; i++ {
        hash("hello")
    }
}

// RIGHT — assign to a package-level sink
var sink uint64

func BenchmarkHash(b *testing.B) {
    var s uint64
    for i := 0; i < b.N; i++ {
        s = hash("hello")
    }
    sink = s // prevent elimination
}
```

Alternatives: pass the result to `b.Log` conditionally (`if sink == 0 { b.Log(sink) }`), or call `runtime.KeepAlive(result)`.

Symptom: nanoseconds per op that don't match the operation cost. `go test -gcflags="-m"` will show inlining / dead-store eliminations.

## Reading Benchmark Output

```
BenchmarkFoo-8    1000000    1234 ns/op    456 B/op    7 allocs/op
```

| Column | Meaning |
|--------|---------|
| `BenchmarkFoo-8` | Name + `GOMAXPROCS` |
| `1000000` | Iterations the framework chose (`b.N`) |
| `1234 ns/op` | Wall-clock nanoseconds per iteration |
| `456 B/op` | Bytes allocated per iteration (from `-benchmem`) |
| `7 allocs/op` | Number of heap allocations per iteration |

Derived:

- Ops/sec = `1e9 / ns/op` — handy for throughput claims
- Allocation pressure = `allocs/op` × call rate — often the real bottleneck on a GC'd language
- Target "0 allocs/op" for hot paths — it's achievable; profile to find the leak

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Running with `-count=1` | Can't distinguish signal from noise | `-count=6` minimum |
| No `benchstat` / just eyeball percentages | False wins on noise | Use `benchstat`; respect `p > 0.05` |
| Setup inside the loop body | Measures builder+work, not work | Pull setup out; use `b.ResetTimer` |
| Laptop on battery / thermal throttle | CPU downclocks mid-run | Plug in; close browser; disable Turbo Boost for stability if benchmarking often |
| `-benchtime=100x` in CI | Each op might take milliseconds; 100 samples is nothing | `-benchtime=2s` or more |
| Comparing across Go versions or hardware | Apples to oranges | Benchmark on the same machine, same `go version` |
| Capturing variants concurrently | benchstat still shows a delta, but it is contention, not code | Run the two passes serially |
| Ignoring `allocs/op` delta | CPU looks equal, but allocations doubled | Always read all three columns |
| `b.ReportAllocs` missing | `B/op` / `allocs/op` missing from output | Add `b.ReportAllocs()` at the top |

## Methodology Checklist

Before claiming a perf improvement:

- [ ] Ran with `-count=6` or higher
- [ ] Ran on a quiet machine (closed other heavy apps)
- [ ] Compared with `benchstat`, saw `p < 0.05`
- [ ] Inspected `B/op` and `allocs/op` — not just `ns/op`
- [ ] Added a sink or `runtime.KeepAlive` if the result isn't consumed
- [ ] Reproduced on a second machine / CI runner

## Review Checklist

When reviewing benchmark code, flag:

- **CRITICAL** — Benchmark result never consumed (`sink` missing) → measuring nothing
- **WARNING** — `-count=1` assumed in CI scripts or PR templates → no statistical rigor
- **WARNING** — Setup inside the loop body, no `b.ResetTimer`
- **WARNING** — Benchmark without `-benchmem` / no `b.ReportAllocs()` → missing allocation story
- **SUGGESTION** — No sub-benchmarks (`b.Run`) for a parameter sweep that would surface nonlinear cost
- **SUGGESTION** — Missing `b.SetBytes` in an I/O / parsing benchmark (throughput easier to reason about)

## Further Reading

- `testing` package: https://pkg.go.dev/testing#hdr-Benchmarks
- `benchstat`: https://pkg.go.dev/golang.org/x/perf/cmd/benchstat
- Profiling workflow: `packages/stack-agents/go/references/performance-profiling.md`
- Dave Cheney's "High Performance Go Workshop": https://dave.cheney.net/high-performance-go-workshop/gophercon-2019.html
- Escape analysis flag: `go build -gcflags="-m"`
