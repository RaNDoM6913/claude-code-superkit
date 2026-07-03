---
name: writing-commands
description: How to write Claude Code slash commands — canonical skeleton, orchestrator pattern, agent dispatch, auto-detection
tokens: 1736
user-invocable: false
---

# Writing Claude Code Commands

## Purpose

Author `.claude/commands/*.md` files that a model executes reliably: fixed skeleton, per-step done-when conditions, every fork enumerated, and a final report gated on completion.

## Use when / Do not use

- **Use when**: creating a new slash command or restructuring an existing one.
- **Do not use for**: agents (see `writing-agents`) or hooks (see `writing-hooks`) — commands are user-triggered workflows; agents are dispatched workers.

## Hard Rules — for every command you write

1. `$ARGUMENTS` appears EXACTLY once — at the step that parses it. Zero occurrences loses user input; two makes consumption ambiguous.
2. Linear integer numbering for steps/phases (1, 2, 3…). Never insert fractional numbers (2.5) — renumber instead.
3. Every step ends with a `Done when:` line stating a verifiable exit condition (file exists, command output seen, agent report received).
4. The final report is emitted ONLY after every non-skipped step's done-when holds; anything missing is listed as "Not done" — never claimed complete.
5. Every fork enumerates ALL branches plus an explicit else/default — no "as appropriate" or "use judgment".
6. Destructive actions (git checkout/stash, file deletion, migrations) get a gate: record restore state BEFORE the action; a restore step ALWAYS runs after it, on success and on failure.
7. `allowed-tools` lists only what the command needs (least privilege).

## Command Skeleton (canonical)

Frontmatter:

```yaml
---
description: One-line description (shown in /help)
argument-hint: <what-user-types>
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Agent  # only what this command needs
---
```

Body, in this order:

1. **Title + Role** — 1–2 sentences: what it does, when it stops early.
2. **Hard Rules** — ≤7 MUST/NEVER bullets; include destructive-action gates where relevant.
3. **Numbered Steps** — Step 1, Step 2, … each with concrete actions and `Done when:`. `$ARGUMENTS` sits in the parse step (`Arguments: $ARGUMENTS`).
4. **Output template** — exact fenced template the report must follow, plus a "Done ONLY when" checklist for longer commands.
5. **Recap** — 3–5 bullets restating the hard rules.

Living references — read before writing a command: `test.md` (linear detect → scope → run → report shape) and `benchmark.md` (destructive-gate shape: record ref/stash BEFORE git switch, always-run restore epilogue) in the same commands directory. If absent, follow the skeleton above.

Tiny commands (≤3 steps, no destructive actions) may omit Hard Rules and Recap; anything with destructive actions or 4+ steps includes both.

## The Orchestrator Pattern

Most powerful commands are **orchestrators** — they coordinate multiple agents through phases:

```
Phase 1: Understand  → read codebase, find patterns
Phase 2: Plan        → output structured checklist
Phase 3: Execute     → create/modify files
Phase 4: Verify      → dispatch health-checker agent
Phase 5: Test        → dispatch test-generator agent
Phase 6: Review      → dispatch reviewer agents (parallel)
Phase 7: Document    → dispatch docs-reviewer agent
Phase 8: Report      → summary table
```

Not every command needs many phases — the full `/dev` runs 16, but simple commands (lint, test) may have 2-3 phases.

### Phase discipline

- Each phase declares a `Done when:` condition an executor can verify.
- Conditional phases keep linear integer numbering; ALL skip conditions live in one skip table ("Phase 5 — skip when no test framework detected"). Never renumber fractionally.
- The Report phase runs LAST and is gated: emit it only after every non-skipped phase's done-when holds. A failed or unran phase appears in the report under "Not done" — the command never claims completion it did not verify.

## Dispatching Agents from Commands

Use the `Agent` tool. Reference agents by their EXACT name — the `.claude/agents/` filename without `.md`.

**Parallel dispatch** (independent agents — all Agent calls in one message):
```
Dispatch ALL triggered agents simultaneously:
- go-reviewer (if .go files changed)
- ts-reviewer (if .ts/.tsx files changed)
- security-scanner (always)
```

**Sequential dispatch** (later steps depend on earlier results — every branch spelled out):
```
1. Dispatch health-checker.
   - Passes → step 2.
   - Fails → report the failing checks and STOP (default for any unclear result: STOP).
2. Dispatch test-generator; run the generated tests.
   - Pass → step 3.
   - Fail → report the failures and STOP.
3. Dispatch reviewer agents (parallel).
```

## Auto-Detection Pattern

For multi-stack projects, detect the stack from project files:

```
Auto-detection:
  go.mod exists?          → Go project
  package.json + tsconfig → TypeScript project
  pyproject.toml          → Python project
  Cargo.toml              → Rust project
```

This lets commands work in any project without hardcoded paths. Multiple markers → treat as multi-stack: handle each detected stack, report each separately.

## Input Parsing

Parse `$ARGUMENTS` at its consumption step. List patterns in PRECEDENCE order — first match wins — and always end with an explicit else:

```markdown
## Step N — Parse Arguments

Arguments: $ARGUMENTS

Match in this order (first match wins):
1. Empty → default behavior.
2. Known keyword/flag (--fix, all, e2e, …) → that mode.
3. PR#NNN → fetch the PR diff.
4. Existing branch name (verify: `git rev-parse --verify <name>`) → use as base.
5. Else → state how the input was interpreted in the report; never silently ignore it.
```

Keyword-before-branch ordering resolves inputs that match both.

## Example: Minimal Command

```markdown
---
description: Run project linters
argument-hint: "[--fix]"
allowed-tools: Bash, Glob
---

# Lint

Auto-detect the project's linters and run them.

## Step 1 — Parse Arguments

Arguments: $ARGUMENTS

- Empty → report-only mode.
- Contains `--fix` → add auto-fix flags.
- Else → run report-only mode; note the ignored tokens in the report.

Done when: mode fixed.

## Step 2 — Detect and Run

1. `go.mod` exists → run `gofmt -l . && go vet ./...`
2. `tsconfig.json` exists → run `npx tsc --noEmit && npx eslint .`

Done when: every detected stack's linter ran and its real output was seen.

## Step 3 — Report

List files with issues. If clean: "All files pass linting." — a clean result is valid.

Done when: the report reflects the actual Step 2 output.
```

## Recap — non-negotiables

- `$ARGUMENTS` exactly once, at the parse step; every step ends with `Done when:`.
- Linear integer numbering; conditional phases in one skip table; final report only after every non-skipped step's done-when holds.
- Every fork lists all branches plus an explicit else; unclear result defaults to STOP-and-report.
- Destructive actions: record restore state before, always-run restore step after (see `benchmark.md`).
- Least-privilege `allowed-tools`; agents referenced by exact filename-derived name.
