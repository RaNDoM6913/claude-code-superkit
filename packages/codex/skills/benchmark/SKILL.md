---
name: benchmark
description: Run scoped Go benchmarks and compare measurements without changing the user's checkout
user-invocable: true
tokens: 953
---

# Go Benchmark Runner

Read applicable `AGENTS.md` instructions and discover available command/file tools. Benchmarks execute project code: inspect setup and side effects, confirm the selected target is authorized, and report missing prerequisites instead of starting services or installing tools implicitly.

## Step 1: Detect Project

1. Locate the relevant `go.mod` and configured benchmark commands. If absent, report "No Go project detected" and stop.
2. Find benchmark functions in the selected module's test files (for example, with `rg`). Inspect their dependencies and setup.
3. If none exist, report "No benchmark functions found" and stop; do not invent results.

## Step 2: Parse the Request

- No target: use the project's configured default; otherwise name the package with the most discovered benchmark functions as the selected scope.
- Package target: resolve and validate the requested package/pattern within the intended module.
- `--compare <ref>`: compare the current declared source state with a validated commit/ref.

Treat request text as data, not shell syntax. Record source revision and relevant dirty changes, Go version, OS/architecture, CPU and benchmark flags/environment so results can be interpreted.

## Step 3: Run Benchmarks

Use the project's configured command when present. A standalone example is:

```bash
go test -run='^$' -bench=. -benchmem -count=6 -timeout=10m ./package/...
```

Replace the package with the verified scope. `-run='^$'` excludes ordinary tests; package initialization and `TestMain` may still run. Preserve command exit and full output in a unique task-owned result directory, not a shared `/tmp/bench-new.txt`. A timeout, compilation failure or no matched benchmarks is incomplete evidence. Record samples rather than inventing an average or claiming six repetitions guarantee statistical significance.

## Step 4: Compare (if requested)

1. Resolve the comparison ref to a commit and verify the same benchmark cases/flags can run there.
2. Use an isolated checkout through the environment's supported worktree mechanism, or a separate temporary checkout when appropriate. Keep the current branch, index, uncommitted files and stash unchanged; do not stash/switch/reset the user's checkout for comparison.
3. Run baseline and current measurements under comparable toolchain, hardware, dependency and load conditions. State differing cases or environments; an added/changed benchmark body may not support a direct performance claim.
4. Save baseline and current raw outputs separately with their revision identities and exits. If isolated execution is unavailable, report comparison blocked rather than modifying the original checkout.
5. Use an installed `benchstat` version with the two result files and preserve its output. If absent, report raw measurements and unavailable statistical comparison; installing the latest tool is a separate authorized dependency change.
6. Clean up only the disposable checkout created for this task through its supported lifecycle, after preserving result files and ensuring it contains no user work.

## Step 5: Report

For a single run, report benchmark/package, measured ns/op, B/op and allocs/op with sample count, command, original exit, code/environment identity and evidence path. Explain the aggregation used if summarizing samples; do not imply benchmarks establish end-user latency or overall application performance.

For comparison, include the actual `benchstat` summary, matching/nonmatching benchmark cases and tool-reported uncertainty or significance warnings. Separate observed changes from explanations of cause. If commands failed, cases did not match, samples were inadequate or environments differed, label the affected comparison INCOMPLETE/UNVERIFIED rather than "unchanged" or "faster".
