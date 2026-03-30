---
description: Run Go benchmarks with statistical analysis and optional comparison
argument-hint: "[package] [--compare branch/commit]"
allowed-tools: Read, Grep, Glob, Bash
---

# Go Benchmark Runner

## Step 1: Detect Project

1. Find `go.mod` — if not found, report "No Go project detected" and stop
2. Find benchmark functions: `grep -rn "func Benchmark" --include="*.go" .`
3. If no benchmarks found, report "No benchmark functions found" and stop

## Step 2: Parse Arguments

- No args: run all benchmarks in the package with most benchmark functions
- `<package>`: run benchmarks in specified package (e.g., `./pkg/cache/...`)
- `--compare <ref>`: compare current vs target branch/commit

## Step 3: Run Benchmarks

```bash
go test -bench=. -benchmem -count=6 -timeout=10m ./package/...
```

Parse output into structured table.

## Step 4: Compare (if --compare flag)

1. Save current results to `/tmp/bench-new.txt`
2. `git stash` (if dirty working tree)
3. `git checkout <ref>`
4. Run same benchmarks, save to `/tmp/bench-old.txt`
5. `git checkout -` (return to original branch)
6. `git stash pop` (if stashed)
7. Run: `benchstat /tmp/bench-old.txt /tmp/bench-new.txt`
8. If `benchstat` not available: `go install golang.org/x/perf/cmd/benchstat@latest`

## Step 5: Report

### Single Run Format

```
## Benchmark Results — ./pkg/cache/...

| Benchmark | ns/op | B/op | allocs/op |
|-----------|-------|------|-----------|
| BenchmarkGet-8 | 234 | 48 | 1 |
| BenchmarkSet-8 | 567 | 128 | 3 |

Ran 6 iterations per benchmark for statistical significance.
```

### Comparison Format

```
## Benchmark Comparison — current vs <ref>

[benchstat output with p-values]

Summary:
- X benchmarks faster, Y slower, Z unchanged (at p < 0.05)
```
