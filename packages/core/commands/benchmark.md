---
description: Run Go benchmarks with statistical analysis and optional comparison
argument-hint: "[package] [--compare branch/commit]"
allowed-tools: Read, Grep, Glob, Bash
---

# Go Benchmark Runner

## Role

Run Go benchmarks with memory stats and 6 repetitions; in `--compare` mode, benchmark two git refs and diff them with benchstat. Go-only command: on non-Go projects it exits at Step 1 with zero side effects.

## Hard Rules

1. No `go.mod` found → report "No Go project detected" and STOP.
2. No `func Benchmark` functions found → report "No benchmark functions found" and STOP.
3. Compare mode: record `ORIGINAL_REF` and `STASHED` (Step 4) BEFORE any `git checkout` or `git stash`. Never switch first.
4. Once Step 4 switched refs, the Restore epilogue (Step 6) ALWAYS runs — after success, after a failed benchmark run, after a missing tool, after any error. Never finish with the repo on another ref or with changes still stashed.
5. Never run destructive git commands (`reset --hard`, `clean -f`, checkout that overwrites uncommitted changes). Uncommitted changes are preserved only via `git stash push`.
6. Use the exact `go test` command from Step 3; do not lower `-count` below 6 (statistical significance needs repetitions).

## Step 1 — Detect Project

1. Find `go.mod` (repo root, else `Glob **/go.mod`). Missing → Hard Rule 1.
2. Find benchmarks: `grep -rn "func Benchmark" --include="*.go" .` Zero hits → Hard Rule 2.

Done when: `go.mod` confirmed AND ≥1 benchmark function found (or the command stopped with the exact message).

## Step 2 — Parse Arguments

Arguments: $ARGUMENTS

| Input | Result |
|-------|--------|
| (empty) | `PKG=./...` (all packages), MODE=single |
| `<package>` | `PKG=<package>` (e.g. `./pkg/cache/...`), MODE=single |
| `--compare <ref>` | MODE=compare against `<ref>`; PKG from remaining arg or `./...` |

Done when: PKG and MODE are fixed.

## Step 3 — Run Current Benchmarks

```bash
go test -bench=. -benchmem -count=6 -timeout=10m <PKG>
```

- MODE=single: parse output into the results table → go to Step 7.
- MODE=compare: save raw output to `/tmp/bench-new.txt`. If this run FAILS, report the error and STOP here (nothing was switched yet, no restore needed).

Done when: run finished; compare mode additionally has `/tmp/bench-new.txt` on disk.

## Step 4 — Compare Setup (compare mode only; single mode skips Steps 4–6)

1. Check benchstat: `command -v benchstat`. Missing → `go install golang.org/x/perf/cmd/benchstat@latest`, re-check. Still missing → set `FALLBACK=raw` and continue (Step 7 has a no-benchstat format).
2. Record the return point: `ORIGINAL_REF=$(git rev-parse --abbrev-ref HEAD)`; if that prints `HEAD` (detached), use `ORIGINAL_REF=$(git rev-parse HEAD)`.
3. `git status --porcelain` non-empty → `git stash push -u -m "benchmark-compare"`, set `STASHED=yes`; else `STASHED=no`.
4. `git checkout <ref>`. If checkout fails → go straight to Step 6.

Done when: benchstat status known, ORIGINAL_REF + STASHED recorded, repo on `<ref>`.

## Step 5 — Benchmark the Old Ref (compare mode only)

Run the exact Step 3 command again; save output to `/tmp/bench-old.txt`. If it fails, note the failure for the report and proceed to Step 6 anyway (Hard Rule 4).

Done when: `/tmp/bench-old.txt` written, or the failure recorded.

## Step 6 — Restore Epilogue (ALWAYS runs after Step 4 item 4, regardless of outcome)

1. `git checkout <ORIGINAL_REF>`
2. If `STASHED=yes`: `git stash pop`. On pop conflict: report the conflict, do NOT drop the stash — tell the user their changes remain in `git stash list`.
3. Verify with `git status`: original ref active, working tree state back.

Done when: repo is on ORIGINAL_REF and the stash is popped (or a pop conflict is explicitly reported).

## Step 7 — Report

Use exactly one of these templates.

### Single Run

```
## Benchmark Results — <PKG>

| Benchmark | ns/op | B/op | allocs/op |
|-----------|-------|------|-----------|
| BenchmarkGet-8 | 234 | 48 | 1 |
| BenchmarkSet-8 | 567 | 128 | 3 |

Ran 6 iterations per benchmark for statistical significance.
```

### Comparison (benchstat available)

Run `benchstat /tmp/bench-old.txt /tmp/bench-new.txt`, then:

```
## Benchmark Comparison — current vs <ref>

[benchstat output with p-values]

Summary:
- X benchmarks faster, Y slower, Z unchanged (at p < 0.05)
```

### Comparison (FALLBACK=raw, benchstat unavailable)

Build the delta table yourself from the two `/tmp/bench-*.txt` files (per benchmark, average the 6 runs):

```
## Benchmark Comparison — current vs <ref> (raw; benchstat unavailable)

| Benchmark | old ns/op | new ns/op | Δ% | old B/op | new B/op | old allocs/op | new allocs/op |
|-----------|-----------|-----------|----|----------|----------|---------------|---------------|

No statistical significance test applied — install benchstat for p-values:
go install golang.org/x/perf/cmd/benchstat@latest
```

## Done ONLY when

- [ ] Report emitted using one of the exact templates above.
- [ ] Compare mode: `git status` confirms the repo is back on ORIGINAL_REF with the stash popped (or a pop conflict explicitly reported).
- [ ] Every benchmark/checkout/tool failure that occurred is stated in the report, not silently swallowed.

## Recap

- No `go.mod` / no benchmarks → stop early with the exact message; zero side effects on non-Go projects.
- Record ORIGINAL_REF + STASHED before any git switch; the Step 6 Restore epilogue always runs after a switch.
- benchstat is checked (and installed) BEFORE use; raw delta table is the fallback.
- Exact `go test -bench=. -benchmem -count=6 -timeout=10m` invocation; report only via the fenced templates.
