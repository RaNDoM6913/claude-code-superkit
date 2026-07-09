# Runtime Troubleshooting (live triage)

> Reference document for go-reviewer. Loaded on demand via Read tool.
> Upstream: go.dev/doc/diagnostics · github.com/go-delve/delve

Something is broken at runtime — a hang, a leak, a flake, a panic. This is the triage path: match the symptom to the right tool, and capture evidence *before* you touch anything. For pprof capture and analysis depth — reading a CPU profile, `alloc_objects` hot allocators, benchstat, GOGC/GOMEMLIMIT tuning — see `references/performance-profiling.md`. This document does not re-teach that; it covers the live-triage moves that reference lacks.

## Symptom → first move

| Symptom | First move |
|---------|-----------|
| Hang / deadlock | Goroutine dump (`?debug=2`) — read what every goroutine is blocked on |
| Memory leak (growing RSS) | Heap profile sampled over time; diff two captures (analysis → performance-profiling.md) |
| Goroutine leak | `runtime.NumGoroutine()` trend + two goroutine dumps, diff the stacks |
| High CPU | CPU profile → `references/performance-profiling.md` |
| Flaky test | `go test -race -count=100` |
| Slow / wrong HTTP | `httputil.DumpRequestOut` + `net/http/httptrace` |
| Crash / panic | Read the stack top-down; reproduce under Delve |
| GC pressure / long pauses | `GODEBUG=gctrace=1` |

Pick the row, run the move, then read the output slowly. The evidence tells you where to look; it rarely tells you the fix outright.

## Golden Rules (debugging discipline)

Work this list top to bottom. Each rule is a defense against a specific way of wasting an afternoon.

- [ ] **Reproduce before you fix.** No repro means you are guessing. A failing test that triggers the bug on demand is worth an hour of staring at code.
- [ ] **Change ONE variable at a time.** Two edits at once and a green result tells you nothing about which one mattered.
- [ ] **Read the actual error text.** The whole line, the whole stack — not the paraphrase in your head.
- [ ] **Bisect the search space.** Halve it every step: `git bisect`, comment out half, binary-search the input that triggers it.
- [ ] **Keep a log of what you ruled out.** Otherwise you re-test the same dead theory an hour later.
- [ ] **The bug is in YOUR code until proven otherwise.** The runtime and the stdlib are almost never the culprit.
- [ ] **When stuck, explain it out loud.** Rubber-duck the flow line by line; the gap usually surfaces mid-sentence.

## Red Flags (you are flailing — stop)

- [ ] Re-running the same command hoping for a different result.
- [ ] Adding `time.Sleep` to "fix" a race — you moved the window, you did not close it.
- [ ] Shotgun-editing several suspects at once.
- [ ] Blaming the runtime, scheduler, or stdlib first.
- [ ] Calling it "fixed" without knowing why it broke.
- [ ] Deleting or skipping a test to make CI green.

Hit two of these in a row → stop, back up, and reproduce cleanly before touching more code.

## Runtime techniques

### Delve (interactive debugging)

```
dlv debug ./cmd/app        # build + launch under the debugger
dlv attach <pid>           # attach to an already-running process
```

At the prompt: `break main.handleReq` (or `break file.go:42`), `continue` to reach it, `print myVar` to inspect state, `goroutines` / `stack` to see the wider picture. The loop is: set the breakpoint, `continue` to it, `print` the state, step. Use `attach` when a process is already wedged in staging and you want to look without restarting it.

### GODEBUG traces (no code change, no rebuild)

```
GODEBUG=schedtrace=1000 ./app     # scheduler snapshot every 1000ms
GODEBUG=gctrace=1 ./app           # one line per GC cycle
```

Read a `schedtrace` line — `SCHED 1000ms: gomaxprocs=8 idleprocs=0 runqueue=42 ...`: `idleprocs=0` alongside a large `runqueue` means the program is CPU-bound and goroutines are starving for a thread. Read a `gctrace` line — `gc 12 @4.5s 3%: 0.1+5.2+0.05 ms clock ... 45->48->24 MB`: the `45->48->24 MB` is heap-before → peak → heap-after, and `3%` is cumulative GC CPU. A steadily rising post-GC number (the last figure) across cycles is a real leak, not churn.

### Goroutine dump for hangs

```
curl localhost:6060/debug/pprof/goroutine?debug=2   # full stacks, human-readable
kill -QUIT <pid>                                     # no pprof endpoint? dumps all stacks to stderr
```

Read the blocked-on state at the top of each goroutine (`chan receive`, `sync.Mutex.Lock`, `select`, `IO wait`) and the wait duration in the header. The tell for a deadlock: a mutex or channel that *every* blocked goroutine is waiting on — trace back to whoever holds it and never releases.

### Safe production pprof

The `/debug/pprof` endpoint leaks memory contents and full stacks — treat it as privileged. Never bind it to a public interface: put it behind auth, or expose it only on `localhost` / a private admin interface. And **capture before you restart** — a restart destroys the evidence you need. Pull the goroutine dump and a heap profile *first*, then recycle the process.

### Flaky tests

```
go test -race -count=100 -run TestFlaky ./pkg/
```

`-count=100` defeats the test cache and forces real re-runs, exposing ordering and shared-state flakes; `-race` surfaces the data race underneath most of them. Green at `-count=1` but red at `-count=100` means the test leaks state between runs, or the code under test has a race.

### HTTP triage

```go
b, _ := httputil.DumpRequestOut(req, true)   // exact wire bytes, client side
b, _ := httputil.DumpResponse(resp, true)    // exact wire bytes of the response
```

When the request "looks right" but the server disagrees, dump the actual bytes — header casing, content encoding, a stray trailing `/`, a missing `Content-Type`. Pair with `net/http/httptrace` to time DNS, connection reuse, and TLS. **Strip `Authorization`, `Cookie`, and any token headers before pasting a dump into an issue or chat.**

---

Analysis depth (reading profiles, allocation hunting, GC tuning) lives in `references/performance-profiling.md`. For the underlying concurrency bugs a dump exposes — leaks, deadlocks, unclosed channels — the concurrency checklist in `go-concurrency-reviewer.md` is the catalog; this document is only the triage path to them.
