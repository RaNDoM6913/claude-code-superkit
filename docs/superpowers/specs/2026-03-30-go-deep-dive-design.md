# Go Deep Dive & Quality Patterns — Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Release:** v1.3.7
**Approach:** Hybrid (C) — infrastructure improvements + Go content in parallel
**Source of knowledge:** [samber/cc-skills-golang](https://github.com/samber/cc-skills-golang) (40 Go skills, 3,141 assertions, +44pp improvement)
**Relationship:** Absorb patterns & knowledge, build in our format, recommend their repo as companion. No fork.

**Note:** Go rules go into new `packages/stack-rules/go/` directory (created during implementation). This mirrors the existing stack-agents/ and stack-hooks/ pattern.

---

## Summary

Massive Go-stack expansion inspired by cc-skills-golang. Two parallel tracks:

- **Track 1 (Infrastructure):** Token budgets, operating modes, persona framing, cross-references, evaluation framework
- **Track 2 (Go Content):** 5 new agents, 4 new hooks, 2 new rules, 1 new command, 19 reference docs, 6 existing agent enhancements

**Total new components:** +12 (agents/hooks/rules/commands) + 6 Codex skills + 19 reference docs + EVALUATIONS.md

---

## Track 1: Structural Improvements

### 1.1 Token Budget System

Formalize for all agents:
- **Body:** <2,500 tokens (core rules, checklist, modes)
- **references/:** on-demand details (recipes, decision tables, examples)

Apply to existing large agents by extracting detailed content into references/ subdirectories. Compact agents stay as-is.

### 1.2 Operating Modes for Language-Specific Agents

Add to go-reviewer, ts-reviewer, py-reviewer, rs-reviewer:

```markdown
**Modes:**
- **Coding mode** — Sequential. Apply conventions while writing new code.
- **Review mode** — Sequential. Audit PR diffs for violations.
- **Audit mode** — Up to 5 parallel sub-agents for full codebase scan.
```

Currently all work in review mode only. Coding mode provides guidance during implementation. Audit mode enables parallel full-codebase scanning.

### 1.3 Persona Framing

Add persona statement to each language-specific agent:

- **go-reviewer:** "You are a Go reliability engineer. Correctness and leak-freedom come before performance."
- **ts-reviewer:** "You are a TypeScript strictness advocate. Type safety and exhaustive handling prevent entire bug classes."
- **py-reviewer:** "You are a Python clarity engineer. Explicit is better than implicit."
- **rs-reviewer:** "You are a Rust safety engineer. If it compiles, it should be correct."

All new Go agents also get persona statements (see individual specs below).

### 1.4 Cross-Reference System

Introduce inter-agent reference format:

```markdown
-> See go-error-reviewer for detailed error handling patterns
-> See security-scanner for injection and crypto checks
```

Each concept lives in ONE canonical agent. Others reference it. Prevents duplication and contradictions.

### 1.5 Evaluation Framework (EVALUATIONS.md)

Create `EVALUATIONS.md` in project root:

```markdown
# Evaluations

## Methodology
- Adversarial design: test unique agent value, not common knowledge
- Assertions per agent: minimum 10
- Comparison: with agent vs without agent

## Results

| Agent | Assertions | With | Without | Delta | Uplift |
|-------|-----------|------|---------|-------|--------|
| go-reviewer | — | — | — | — | — |
| ... | — | — | — | — | — |

(To be filled as agents are tested)
```

Structure ready for future automated evaluation. Fill manually as agents are tested.

---

## Track 2: Go Content

### 2.1 Expand go-reviewer (existing)

**File:** `packages/stack-agents/go/go-reviewer.md`

**Changes:**

Add persona:
```markdown
**Persona:** You are a Go reliability engineer. You treat every goroutine as a liability,
every unwrapped error as a ticking bomb, and every interface with >3 methods as a design smell.
```

Add operating modes (Coding/Review/Audit).

Expand checklist from 12 to 20 points:
- Existing 12 remain unchanged
- +13: Zero-value safety (structs usable without explicit init)
- +14: Append aliasing (reuse of backing array causes data sharing)
- +15: Defer in loops (accumulates until function exit)
- +16: Float comparison (epsilon-based, never ==)
- +17: Typed nil interface trap (typed nil pointer in interface is NOT nil)
- +18: MixedCaps enforcement (not snake_case, not SCREAMING_CASE)
- +19: Interface size (<= 3 methods, consumer-side)
- +20: Functional options pattern for constructors with >3 parameters

Add parallel audit categories for Audit mode:
1. Layer violations + DI patterns
2. Error handling + wrapping
3. Naming + code style
4. Safety traps (nil, append, defer, float)
5. Interface design + struct patterns

Add cross-references to new specialized agents.

### 2.2 New Agent: go-error-reviewer.md

**File:** `packages/stack-agents/go/go-error-reviewer.md`
**Codex skill:** `packages/codex/skills/go-error-reviewer/SKILL.md`
**Source knowledge:** golang-error-handling from cc-skills-golang
**Purpose:** Deep exhaustive error handling audit. What go-reviewer checks superficially (points 2-3), this agent checks exhaustively.

**Persona:** "You are a Go reliability engineer. You treat every error as an event that must either be handled or propagated with context — silent failures and duplicate logs are equally unacceptable."

**Modes:**
- Coding mode — Sequential. Enforce error patterns while writing.
- Review mode — Sequential. Audit PR diffs for error handling violations.
- Audit mode — 5 parallel sub-agents (swallowed errors, missing wrapping, log-and-return, panic/recover, structured logging).

**Checklist (15 points):**
1. Never discard errors (`_ = doSomething()`)
2. Always wrap with context (`fmt.Errorf("Method: %w", err)`)
3. Errors logged OR returned, never both
4. `errors.Is()` / `errors.As()` instead of direct comparison
5. `errors.Join()` for multiple errors
6. Sentinel errors for expected conditions
7. Custom error types for rich context
8. slog structured logging (not log.Printf)
9. Low-cardinality messages (variables as attributes, not interpolation)
10. No panic in library code
11. recover() only at goroutine boundary
12. Error wrapping depth (don't re-wrap already wrapped)
13. Consistent error message format (lowercase, no punctuation)
14. Domain errors mapped to HTTP status (not raw errors in handlers)
15. sql.ErrNoRows / pgx.ErrNoRows mapped to domain ErrNotFound

**allowed-tools:** Read, Grep, Glob, Bash, Agent

**references/ files:**
- `error-creation.md` — sentinel errors, custom types, errors.Join patterns
- `error-wrapping.md` — fmt.Errorf %w, wrapping depth, context guidelines
- `error-inspection.md` — errors.Is, errors.As, unwrapping chains

### 2.3 New Agent: go-concurrency-reviewer.md

**File:** `packages/stack-agents/go/go-concurrency-reviewer.md`
**Codex skill:** `packages/codex/skills/go-concurrency-reviewer/SKILL.md`
**Source knowledge:** golang-concurrency, golang-context from cc-skills-golang
**Purpose:** Audit goroutines, channels, mutexes, context propagation.

**Persona:** "You are a Go concurrency engineer. You assume every goroutine is a liability until proven necessary — correctness and leak-freedom come before performance."

**Modes:**
- Coding mode — Sequential. Enforce concurrency safety while writing.
- Review mode — Sequential. Audit diffs for concurrency issues.
- Audit mode — 5 parallel sub-agents:
  1. Goroutine spawns + shutdown verification
  2. Mutable globals + shared state
  3. Channel usage (ownership, direction, closure)
  4. time.After loops, missing ctx.Done(), unbounded spawning
  5. Mutex usage, sync.Map, atomics

**Checklist (15 points):**
1. Every goroutine has shutdown mechanism (ctx, done channel, signal)
2. `context.Context` as first param, named `ctx`
3. ctx never stored in structs — pass explicitly
4. `context.Background()` only at entry points (main, init, tests)
5. defer cancel() immediately after WithCancel/WithTimeout
6. Only senders close channels
7. Directed channel types (`chan<-`, `<-chan`)
8. `ctx.Done()` in every select statement
9. Channel vs Mutex vs Atomic — correct primitive for use case
10. WaitGroup vs errgroup — correct choice for error propagation needs
11. No goroutine leaks (goleak verification)
12. `sync.Map` only for append-only or disjoint-key patterns
13. No `time.After` in loops (leaks per iteration)
14. Shared state protected (mutex OR channel, not both)
15. Race condition detection (`-race` flag in tests)

**Decision tables included in body:**

| Scenario | Use | Why |
|----------|-----|-----|
| Ownership transfer | Channel | Value moves to new owner |
| Shared mutable state | Mutex | Multiple readers/writers |
| Simple counter | Atomic | Lock-free, fastest |
| Fan-out with errors | errgroup | Collects first error |
| Wait for N tasks | WaitGroup | No error collection needed |

**allowed-tools:** Read, Grep, Glob, Bash, Agent

**references/ files:**
- `goroutine-lifecycle.md` — spawn patterns, shutdown, leak prevention
- `channel-patterns.md` — fan-out/fan-in, pipeline, signaling, ownership
- `sync-primitives.md` — mutex, atomic, sync.Map, sync.Pool, sync.Once
- `context-propagation.md` — creation, cancellation, timeouts, values

### 2.4 New Agent: go-performance-reviewer.md

**File:** `packages/stack-agents/go/go-performance-reviewer.md`
**Codex skill:** `packages/codex/skills/go-performance-reviewer/SKILL.md`
**Source knowledge:** golang-performance, golang-benchmark from cc-skills-golang
**Purpose:** Performance review with measurement-first discipline. No equivalent exists in superkit.

**Persona:** "You are a Go performance engineer. You never optimize without profiling first. Intuition about bottlenecks is wrong ~80% of the time."

**Modes:**
- Review mode — Sequential. Check diffs for known anti-patterns.
- Audit mode — 4 parallel sub-agents:
  1. Memory allocation hotspots
  2. CPU-bound operations
  3. I/O and connection patterns
  4. Caching opportunities

**Checklist (12 points):**
1. Profile before optimizing (pprof evidence required)
2. Benchmark with `b.Loop()` (Go 1.24+) or `b.N`
3. benchstat for statistical significance (not "looks faster")
4. alloc_objects analysis for memory hotspots
5. Escape analysis check (`-gcflags="-m"`)
6. String building (strings.Builder, not concatenation in loops)
7. Pre-allocation (`make([]T, 0, n)` when size known)
8. sync.Pool for hot-path allocations
9. No premature optimization (must have profiling data)
10. Connection pool tuning (sql.DB, http.Client)
11. Caching strategy decision (in-memory vs Redis vs none)
12. GC tuning awareness (GOGC, GOMEMLIMIT)

**Bottleneck decision tree:**
```
alloc_objects high    -> memory optimization (references/performance-profiling.md)
CPU dominant          -> CPU efficiency patterns
GC pauses high        -> runtime tuning (GOGC, GOMEMLIMIT)
Blocked goroutines    -> I/O optimization, connection pooling
Repeated computation  -> caching strategy
```

**allowed-tools:** Read, Grep, Glob, Bash, Agent

**references/ files:**
- `performance-profiling.md` — pprof workflow, benchstat, escape analysis, memory/CPU diagnosis

### 2.5 New Agent: go-modernizer.md

**File:** `packages/stack-agents/go/go-modernizer.md`
**Codex skill:** `packages/codex/skills/go-modernizer/SKILL.md`
**Source knowledge:** golang-modernize from cc-skills-golang
**Purpose:** Detect outdated patterns, suggest modern Go idioms (1.21-1.24+).

**Persona:** "You are a Go modernization engineer. You help codebases adopt new language features safely — one pattern at a time, with tests proving equivalence."

**Modes:**
- Review mode — Sequential. Flag outdated patterns in diffs.
- Audit mode — Full codebase scan for modernization opportunities.

**Checklist (10 points):**
1. Loop variable capture fix (Go 1.22 — `v := v` no longer needed)
2. `math/rand/v2` instead of `math/rand` (Go 1.22+)
3. `slices` package instead of `sort.Slice` (Go 1.21+)
4. `maps` package for map operations (Go 1.21+)
5. `slog` instead of `log` package (Go 1.21+)
6. `errors.Join()` instead of multierror libraries (Go 1.20+)
7. `context.WithoutCancel()` (Go 1.21+)
8. `testing/synctest` for deterministic concurrent tests (Go 1.24+)
9. Range over integers (Go 1.22+)
10. `go tool` modernize linter suggestions

**Trigger:** Can be dispatched from `/audit --modernize` flag.

**allowed-tools:** Read, Grep, Glob, Bash

### 2.6 New Agent: go-observability-reviewer.md

**File:** `packages/stack-agents/go/go-observability-reviewer.md`
**Codex skill:** `packages/codex/skills/go-observability-reviewer/SKILL.md`
**Source knowledge:** golang-observability from cc-skills-golang
**Purpose:** Audit logging, metrics, tracing, profiling endpoints.

**Persona:** "You are a Go observability engineer. You ensure every production service emits the signals needed to diagnose issues without attaching a debugger."

**Modes:**
- Review mode — Sequential. Check diffs for observability gaps.
- Audit mode — 5 parallel sub-agents (one per signal):
  1. Logs (slog usage, structured attributes, log levels)
  2. Metrics (Prometheus registration, histogram buckets)
  3. Traces (OpenTelemetry context propagation, span attributes)
  4. Profiles (pprof endpoint exposure)
  5. Health (readiness/liveness probes)

**Checklist (10 points):**
1. slog usage (not log.Printf, not fmt.Println)
2. Structured attributes (not string interpolation in log messages)
3. Log levels appropriate (Debug/Info/Warn/Error)
4. Prometheus metrics registered (not ad-hoc)
5. Histogram buckets configured (not default)
6. OpenTelemetry context propagation through call chain
7. Span attributes on critical paths
8. pprof endpoint available (/debug/pprof/)
9. Health check endpoint (/health, /ready)
10. Pipeline ordering: sampling -> formatting -> routing -> sinks

**references/ files:**
- `observability-pipeline.md` — slog handlers, Prometheus patterns, OpenTelemetry setup

**allowed-tools:** Read, Grep, Glob, Bash, Agent

---

## Track 2: New Go Hooks

### 2.7 New Hook: golangci-lint-on-edit.sh

**File:** `packages/stack-hooks/go/golangci-lint-on-edit.sh`
**Trigger:** PostToolUse(Edit/Write) for .go files
**Profile:** strict only (too slow for standard, ~2-5s)

**Logic:**
1. Extract file path from tool input
2. Check file extension is .go
3. Find nearest go.mod (walk up directory tree)
4. Check if `.golangci.yml` or `.golangci.yaml` exists in project
5. Run `golangci-lint run --fast` on the package containing edited file
6. Show first 10 issues to stderr (non-blocking, exit 0)

**Why separate hook (not extending go-vet):**
- go vet is lightweight (~100ms), runs in standard profile
- golangci-lint is heavy (~2-5s), only for strict profile
- Different granularity: vet = compiler checks, lint = style + patterns

### 2.8 New Hook: go-error-check-on-edit.sh

**File:** `packages/stack-hooks/go/go-error-check-on-edit.sh`
**Trigger:** PostToolUse(Edit/Write) for .go files
**Profile:** standard, strict

**Detects (grep-based, fast ~50ms):**
- `_ = ` followed by function call (swallowed error)
- `if err != nil { return nil }` or `return nil, nil` without wrapping
- `log.Print` + `return err` on adjacent lines (log-and-return anti-pattern)
- `fmt.Sprintf` inside `fmt.Errorf` argument (double formatting)

**Output format:**
```
warning: go-error-check: line 42 - error discarded with _ =
  Fix: handle or wrap: if err != nil { return fmt.Errorf("context: %w", err) }
```

**Non-blocking:** Always exit 0 (warns only).

### 2.9 New Hook: go-context-check-on-edit.sh

**File:** `packages/stack-hooks/go/go-context-check-on-edit.sh`
**Trigger:** PostToolUse(Edit/Write) for .go files
**Profile:** standard, strict

**Detects:**
- Public function with >1 parameter where first is not `ctx context.Context`
- `context.Background()` not in main/init/test functions
- `context.TODO()` in production code (not in test files)

**Limitations:** Grep-based, may produce false positives on helper functions and interface implementations. Warning only, never blocks.

**Non-blocking:** Always exit 0.

### 2.10 New Hook: go-safety-check-on-edit.sh

**File:** `packages/stack-hooks/go/go-safety-check-on-edit.sh`
**Trigger:** PostToolUse(Edit/Write) for .go files
**Profile:** standard, strict

**Detects:**
- `var m map[` without subsequent `make()` or `= map[` initialization (nil map write panic)
- `defer ` inside `for ` block scope (defer accumulation until function exit)
- `append(` on slice parameter without reassignment to same variable (append aliasing)

**Non-blocking:** Always exit 0.

---

## Track 2: New Go Rules

### 2.11 New Rule: go-conventions.md

**File:** `packages/stack-rules/go/go-conventions.md`
**alwaysApply:** false
**paths:** `**/*.go`

**Content — always-on guidance when writing Go code:**

**Naming:**
- MixedCaps (not snake_case). Acronyms fully capitalized: `HTTPClient`, `userID`
- Package names: lowercase, single word, no underscores. No `util`, `common`, `base`
- Interfaces: verb or -er suffix (`Reader`, `Validator`). Max 3 methods
- Error variables: `ErrNotFound`, `ErrValidation` (Err prefix)
- Avoid stuttering: `http.Client` not `http.HTTPClient`

**Patterns:**
- Constructors: `NewX()` returns `*X`, validate inside
- >3 optional params -> functional options pattern
- Enums via iota with Unknown = 0 as zero value
- Early returns (guard clauses), not deep nesting
- Accept interfaces, return structs

**Error Handling:**
- Always wrap: `fmt.Errorf("Method: %w", err)`
- Log OR return, never both
- Sentinel errors for expected conditions
- Domain errors map to HTTP status in handlers only

**Context:**
- `ctx context.Context` always first parameter
- Never store in structs
- `context.Background()` only in main/init/test

### 2.12 New Rule: go-safety.md

**File:** `packages/stack-rules/go/go-safety.md`
**alwaysApply:** false
**paths:** `**/*.go`

**Content — safety guardrails active when editing Go files:**

**Nil Traps:**
- Always `make()` maps before write
- Interface nil check: typed nil pointer in interface is NOT nil
- Check pointer receivers for nil in public methods

**Concurrency:**
- Every goroutine needs shutdown mechanism
- Only senders close channels
- Include ctx.Done() in every select
- No time.After in loops (leaks per iteration)

**Memory:**
- Append can alias backing array — always use return value
- Defer in loops accumulates until function exit — wrap in closure or extract to function
- Slice from large array retains full array in memory

**Numeric:**
- int64 -> int32 truncates silently — use explicit conversion with bounds check
- Float comparison: use epsilon, never ==

---

## Track 2: New Command

### 2.13 New Command: /benchmark

**File:** `packages/core/commands/benchmark.md`
**Codex skill:** `packages/codex/skills/benchmark/SKILL.md`
**Source knowledge:** golang-benchmark from cc-skills-golang
**Purpose:** Auto-detect and run Go benchmarks with statistical analysis.

**Arguments:** `[package] [--compare branch/commit]`

**Steps:**
1. Detect Go project (find go.mod)
2. Find benchmark functions (`grep -rn "func Benchmark" .`)
3. If no package specified, use package with most benchmarks
4. Run `go test -bench=. -benchmem -count=6 -timeout=10m ./package/...`
5. If `--compare` flag:
   a. Save current results to `/tmp/bench-new.txt`
   b. Stash changes, checkout target branch/commit
   c. Run same benchmarks, save to `/tmp/bench-old.txt`
   d. Restore original state
   e. Run `benchstat /tmp/bench-old.txt /tmp/bench-new.txt`
6. Report: table with ns/op, B/op, allocs/op, delta%, statistical significance

**Output format:**
```markdown
## Benchmark Results

| Benchmark | ns/op | B/op | allocs/op |
|-----------|-------|------|-----------|
| BenchmarkX | 1234 | 256 | 3 |

## Comparison (vs main)
[benchstat output with p-values]
```

**allowed-tools:** Read, Grep, Glob, Bash

---

## Track 2: Enhance Existing Agents

### 2.14 Enhance security-scanner.md — Go Section

Add Go-specific security checks from golang-security:
- `fmt.Sprintf` in SQL queries (expand existing pattern)
- `crypto/md5`, `crypto/sha1` for passwords (weak hash detection)
- `os.Exec` / `exec.Command` with user input (command injection)
- `html/template` vs `text/template` usage (XSS in Go)
- `net/http` server without timeouts (slowloris vulnerability)
- DREAD severity scoring reference

### 2.15 Enhance database-reviewer.md — Go/pgx Section

Add Go database patterns from golang-database:
- `*Context` methods required (QueryContext, ExecContext — not Query/Exec)
- `defer rows.Close()` immediately after QueryContext
- `sql.ErrNoRows` via `errors.Is()`, not direct comparison
- Connection pool tuning checks (MaxOpenConns, MaxIdleConns, ConnMaxLifetime)
- Transaction isolation level awareness
- No `SELECT *` without explicit column list

### 2.16 Enhance test-generator.md — Go Patterns

Add Go testing patterns from golang-testing:
- Table-driven test pattern with named subtests (`t.Run`)
- `t.Parallel()` for independent tests
- Fuzzing via `//go:build` + `-fuzz` flag
- `goleak.VerifyTestMain()` for goroutine leak detection
- Build tags for integration test separation (`//go:build integration`)
- `testing/synctest` for deterministic concurrent tests (Go 1.24+)

### 2.17 Enhance dependency-checker.md — Go Patterns

Add Go dependency patterns from golang-dependency-management:
- `govulncheck` integration (not just `go mod audit`)
- `tools.go` pattern for dev dependencies
- go.sum commitment requirement check
- Semantic import versioning (v2+ module paths)
- Dependabot/Renovate configuration for Go modules

### 2.18 Enhance debug-observer.md — Go Patterns

Add Go debugging patterns from golang-troubleshooting:
- `go tool pprof` workflow (CPU, memory, goroutine profiles)
- Delve debugger integration
- `GODEBUG` environment variables for runtime debugging
- Goroutine dump analysis (`kill -SIGQUIT` or `runtime.Stack`)
- Race detector: `go test -race` workflow
- Flaky test diagnosis methodology

### 2.19 Enhance architect.md — Go Project Layout

Add Go project layout patterns from golang-project-layout:
- cmd/internal/pkg directory organization
- CLI vs Service vs Library project structures
- Module path naming conventions
- Makefile essentials for Go projects (build, test, lint, run targets)

---

## Track 2: Reference Documents

### 2.20 Reference Documents Directory

**Location:** `packages/stack-agents/go/references/`

19 files loaded on-demand by agents via Read tool:

| File | Content Source | Used By |
|------|--------------|---------|
| `naming-conventions.md` | golang-naming | go-reviewer |
| `code-style.md` | golang-code-style | go-reviewer |
| `design-patterns.md` | golang-design-patterns | go-reviewer |
| `data-structures.md` | golang-data-structures | go-reviewer |
| `structs-interfaces.md` | golang-structs-interfaces | go-reviewer |
| `error-creation.md` | golang-error-handling | go-error-reviewer |
| `error-wrapping.md` | golang-error-handling | go-error-reviewer |
| `error-inspection.md` | golang-error-handling | go-error-reviewer |
| `goroutine-lifecycle.md` | golang-concurrency | go-concurrency-reviewer |
| `channel-patterns.md` | golang-concurrency | go-concurrency-reviewer |
| `sync-primitives.md` | golang-concurrency | go-concurrency-reviewer |
| `context-propagation.md` | golang-context | go-concurrency-reviewer |
| `performance-profiling.md` | golang-performance + golang-benchmark | go-performance-reviewer |
| `database-patterns.md` | golang-database | database-reviewer |
| `testing-patterns.md` | golang-testing | test-generator |
| `observability-pipeline.md` | golang-observability | go-observability-reviewer |
| `security-checklist.md` | golang-security | security-scanner |
| `modernize-guide.md` | golang-modernize | go-modernizer |
| `samber-libraries.md` | golang-samber-* (9 skills) | go-reviewer, go-error-reviewer |

Each reference file: 500-1,500 tokens of detailed patterns, decision tables, code examples.

---

## Ecosystem Recommendation

### README.md Addition

Add "Ecosystem & Companions" section:

```markdown
## Ecosystem & Companions

For deep Go-specific skills that complement Superkit's orchestration:
- **[cc-skills-golang](https://github.com/samber/cc-skills-golang)** — 40 production-grade
  Go skills (error handling, concurrency, security, observability, testing, and more)
  by Samuel Berthe. Install: `npx skills add https://github.com/samber/cc-skills-golang --skill '*'`
```

---

## Final Counts After Implementation

| Component | Before | After | Delta |
|-----------|--------|-------|-------|
| Core agents | 27 | 27 | 0 (6 enhanced) |
| Stack Go agents | 1 | 6 | +5 |
| Stack Go hooks | 2 | 6 | +4 |
| Stack Go rules | 0 | 2 | +2 |
| Core commands | 13 | 14 | +1 |
| Codex skills | 44 | 50 | +6 |
| Reference docs | 0 | 19 | +19 |
| EVALUATIONS.md | no | yes | new |

**Total stack agents:** 4 -> 9 (go: 1->6, ts: 1, py: 1, rs: 1)
**Total stack hooks:** 5 -> 9 (go: 2->6, ts: 1, py: 1, rs: 1)
**Total stack rules:** 0 -> 2 (go: 2)

---

## Implementation Order

### Phase 1: Infrastructure (no new files, improves existing)
1. Add operating modes to 4 stack reviewers
2. Add persona framing to 4 stack reviewers
3. Add cross-reference format to agents that reference each other
4. Create EVALUATIONS.md skeleton

### Phase 2: Go Reviewer Expansion
5. Expand go-reviewer checklist (12 -> 20 points)
6. Create references/ directory with first 5 reference docs (naming, code-style, design-patterns, data-structures, structs-interfaces)

### Phase 3: New Go Agents
7. go-error-reviewer + 3 reference docs (error-creation, error-wrapping, error-inspection)
8. go-concurrency-reviewer + 4 reference docs (goroutine-lifecycle, channel-patterns, sync-primitives, context-propagation)
9. go-performance-reviewer + 1 reference doc (performance-profiling)
10. go-modernizer + 1 reference doc (modernize-guide)
11. go-observability-reviewer + 1 reference doc (observability-pipeline)

### Phase 4: Go Hooks
12. go-error-check-on-edit.sh
13. go-context-check-on-edit.sh
14. go-safety-check-on-edit.sh
15. golangci-lint-on-edit.sh

### Phase 5: Go Rules + Command
16. go-conventions.md rule
17. go-safety.md rule
18. /benchmark command

### Phase 6: Enhance Existing Agents
19. security-scanner.md — Go security section
20. database-reviewer.md — Go/pgx section
21. test-generator.md — Go testing patterns
22. dependency-checker.md — Go dep patterns
23. debug-observer.md — Go debugging patterns
24. architect.md — Go project layout

### Phase 7: Remaining References + Codex
25. Remaining reference docs (database-patterns, testing-patterns, security-checklist, samber-libraries)
26. Create 6 Codex skill mirrors
27. README ecosystem section

### Phase 8: Documentation Updates (Tier 1 — ALWAYS)
28. Update CLAUDE.md — counts table, structure section, Go stack details
29. Update README.md — "What's Inside" table, Codex comparison, showcase description, badges, "What's New" section for v1.3.7
30. Update CHANGELOG.md — move [Unreleased] -> [1.3.7] — 2026-03-XX with full change list
31. Update packages/codex/AGENTS.md — Available Skills lists, add 6 new skills
32. Update packages/codex/INSTALL.md — skill counts, feature comparison table
33. Update docs/INSTALL-CLAUDE-CODE.md — step counts, file counts, hook counts
34. Update GitHub repo description — `gh repo edit --description` with new counts

### Phase 9: Documentation Updates (Tier 2 — Relevant)
35. Update docs/guide/ chapters that reference agent/hook/rule counts
36. Update setup.sh — summary output counts for Go stack
37. Verify all phase counts consistent across all docs
38. Run `grep -rn` for stale counts (old agent/hook/rule numbers)

### Phase 10: Release v1.3.7
39. Bump VERSION file: 1.3.6 -> 1.3.7
40. Bump package.json version: 1.3.6 -> 1.3.7
41. Run superkit-integrity verification (superkit-counts-verify.sh)
42. Run full checklist from CLAUDE.md "Checklist before commit"
43. Commit all changes: `feat(go): deep Go stack expansion — 5 agents, 4 hooks, 2 rules, 1 command, 19 references`
44. Push to main
45. Create GitHub release: `gh release create v1.3.7` with comprehensive release notes
46. Update GitHub release notes with emoji headers, full change summary

### Release Notes Template (v1.3.7)

```markdown
# v1.3.7 — Go Deep Dive

Massive Go-stack expansion inspired by [cc-skills-golang](https://github.com/samber/cc-skills-golang).

## New Go Agents
- **go-error-reviewer** — exhaustive error handling audit (15-point checklist)
- **go-concurrency-reviewer** — goroutine/channel/mutex/context audit (15-point checklist)
- **go-performance-reviewer** — measurement-first performance review (12-point checklist)
- **go-modernizer** — detect outdated patterns, suggest Go 1.21-1.24+ idioms
- **go-observability-reviewer** — logging/metrics/tracing/profiling audit (Five Signals)

## New Go Hooks
- **go-error-check-on-edit** — real-time swallowed error / log-and-return detection
- **go-context-check-on-edit** — context.Context first param enforcement
- **go-safety-check-on-edit** — nil map / defer-in-loop / append aliasing detection
- **golangci-lint-on-edit** — golangci-lint on edit (strict profile)

## New Go Rules
- **go-conventions** — naming, patterns, error handling, context conventions
- **go-safety** — nil traps, concurrency, memory, numeric safety guardrails

## New Commands
- **/benchmark** — auto-detect and run Go benchmarks with benchstat comparison

## Enhanced Agents
- **go-reviewer** — expanded 12->20 point checklist, operating modes, persona
- **security-scanner** — Go-specific security checks (weak hash, command injection, XSS)
- **database-reviewer** — Go/pgx patterns (Context methods, pool tuning, ErrNoRows)
- **test-generator** — Go testing patterns (table-driven, fuzzing, goleak, synctest)
- **dependency-checker** — govulncheck, tools.go, semantic versioning
- **debug-observer** — pprof, Delve, GODEBUG, race detector workflows
- **architect** — Go project layout (cmd/internal/pkg)

## Infrastructure
- Operating modes (Coding/Review/Audit) for all language-specific agents
- Persona framing for consistent agent behavior
- Cross-reference system between agents
- Token budget system with references/ on-demand loading
- EVALUATIONS.md framework
- 19 Go reference documents

## Ecosystem
- Recommended [cc-skills-golang](https://github.com/samber/cc-skills-golang) as companion
```

---

## Out of Scope (Future Releases)

- Plugin distribution system (.claude-plugin/, .cursor-plugin/, gemini-extension.json)
- Automated evaluation runner (fill EVALUATIONS.md manually first)
- Token budget enforcement hook (formalize later)
- ClawHub publishing
- Applying same depth to TypeScript/Python/Rust stacks
- samber/* library-specific agents (covered via samber-libraries.md reference only)
