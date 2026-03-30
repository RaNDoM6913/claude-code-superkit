# Go Deep Dive v1.3.7 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Massively expand Go stack coverage with 5 new agents, 4 hooks, 2 rules, 1 command, 19 reference docs + infrastructure improvements (operating modes, persona, cross-refs, EVALUATIONS.md) — release as v1.3.7.

**Architecture:** Two parallel tracks — Track 1 (infrastructure: operating modes, persona, cross-references, EVALUATIONS.md applied to existing agents) and Track 2 (new Go content: agents, hooks, rules, command, references). All new agents follow the standard Phase 0/1/2 pattern with persona + modes. Hooks follow the established PostToolUse pattern from go-vet-on-edit.sh.

**Tech Stack:** Bash (hooks), Markdown (agents/rules/commands/references), YAML frontmatter

**Spec:** `docs/superpowers/specs/2026-03-30-go-deep-dive-design.md`

---

## Task 1: Infrastructure — Operating Modes & Persona for Stack Reviewers

**Files:**
- Modify: `packages/stack-agents/go/go-reviewer.md`
- Modify: `packages/stack-agents/typescript/ts-reviewer.md`
- Modify: `packages/stack-agents/python/py-reviewer.md`
- Modify: `packages/stack-agents/rust/rs-reviewer.md`

- [ ] **Step 1: Add persona + modes to go-reviewer.md**

After the frontmatter `---` and before `# Go Code Reviewer`, insert:

```markdown
**Persona:** You are a Go reliability engineer. You treat every goroutine as a liability, every unwrapped error as a ticking bomb, and every interface with >3 methods as a design smell.

**Modes:**
- **Coding mode** — Sequential. Apply Go conventions while writing new code.
- **Review mode** — Sequential. Audit PR diffs for violations (default behavior).
- **Audit mode** — Up to 5 parallel sub-agents for full codebase scan.
```

Change the first line after `# Go Code Reviewer` from "You are a Go code reviewer..." to "Review code against idiomatic Go patterns and common best practices."

- [ ] **Step 2: Add persona + modes to ts-reviewer.md**

After frontmatter, insert:

```markdown
**Persona:** You are a TypeScript strictness advocate. Type safety and exhaustive handling prevent entire bug classes.

**Modes:**
- **Coding mode** — Sequential. Apply TypeScript/React conventions while writing.
- **Review mode** — Sequential. Audit PR diffs for violations (default behavior).
- **Audit mode** — Up to 5 parallel sub-agents for full codebase scan.
```

Change "You are a frontend code reviewer..." to "Review TypeScript/React code for type safety, hooks, state management, and conventions."

- [ ] **Step 3: Add persona + modes to py-reviewer.md**

After frontmatter, insert:

```markdown
**Persona:** You are a Python clarity engineer. Explicit is better than implicit.

**Modes:**
- **Coding mode** — Sequential. Apply Python conventions while writing.
- **Review mode** — Sequential. Audit PR diffs for violations (default behavior).
- **Audit mode** — Up to 5 parallel sub-agents for full codebase scan.
```

- [ ] **Step 4: Add persona + modes to rs-reviewer.md**

After frontmatter, insert:

```markdown
**Persona:** You are a Rust safety engineer. If it compiles, it should be correct.

**Modes:**
- **Coding mode** — Sequential. Apply Rust conventions while writing.
- **Review mode** — Sequential. Audit PR diffs for violations (default behavior).
- **Audit mode** — Up to 5 parallel sub-agents for full codebase scan.
```

- [ ] **Step 5: Commit**

```bash
git add packages/stack-agents/
git commit -m "feat(agents): add persona framing and operating modes to all stack reviewers"
```

---

## Task 2: Infrastructure — EVALUATIONS.md + Cross-References

**Files:**
- Create: `EVALUATIONS.md`

- [ ] **Step 1: Create EVALUATIONS.md**

```markdown
# Evaluations

Measuring agent effectiveness with adversarial assertions. Inspired by [cc-skills-golang](https://github.com/samber/cc-skills-golang) evaluation methodology (3,141 assertions, +44pp improvement).

## Methodology

- **Adversarial design:** Test unique agent value, not common knowledge. Frame tasks so the natural approach is wrong; the agent steers to correct.
- **Minimum assertions:** 10 per agent
- **Comparison:** With agent loaded vs without agent (baseline)
- **Grading:** LLM-as-judge or deterministic match

## Results

| Agent | Assertions | With Agent | Without | Delta | Uplift |
|-------|-----------|-----------|---------|-------|--------|
| go-reviewer | — | — | — | — | — |
| go-error-reviewer | — | — | — | — | — |
| go-concurrency-reviewer | — | — | — | — | — |
| go-performance-reviewer | — | — | — | — | — |
| go-modernizer | — | — | — | — | — |
| go-observability-reviewer | — | — | — | — | — |
| ts-reviewer | — | — | — | — | — |
| py-reviewer | — | — | — | — | — |
| rs-reviewer | — | — | — | — | — |
| security-scanner | — | — | — | — | — |
| database-reviewer | — | — | — | — | — |
| code-reviewer | — | — | — | — | — |

*To be filled as agents are tested. Dashes indicate pending evaluation.*

## Cross-Reference System

Agents reference each other using this format:

```
-> See go-error-reviewer for detailed error handling patterns
-> See security-scanner for injection and crypto checks
```

Each concept lives in ONE canonical agent. Others reference it.

### Canonical Ownership

| Concept | Canonical Agent | Referenced By |
|---------|----------------|---------------|
| Error handling (Go) | go-error-reviewer | go-reviewer, database-reviewer |
| Concurrency (Go) | go-concurrency-reviewer | go-reviewer, go-performance-reviewer |
| Performance (Go) | go-performance-reviewer | go-reviewer |
| Modernization (Go) | go-modernizer | go-reviewer |
| Observability (Go) | go-observability-reviewer | go-reviewer |
| SQL safety | database-reviewer | go-reviewer, security-scanner |
| Security | security-scanner | go-reviewer, all stack reviewers |
```

- [ ] **Step 2: Commit**

```bash
git add EVALUATIONS.md
git commit -m "feat: add EVALUATIONS.md framework for agent effectiveness measurement"
```

---

## Task 3: Expand go-reviewer Checklist (12 → 20 points)

**Files:**
- Modify: `packages/stack-agents/go/go-reviewer.md`

- [ ] **Step 1: Add 8 new checklist items + audit mode categories + cross-references**

After item 12 (`Package structure`) in the Review Checklist section, add:

```markdown
13. **Zero-value safety** — structs usable without explicit init? Exported types have sensible zero values?
14. **Append aliasing** — `append()` return value always assigned back? No reuse of backing array across goroutines?
15. **Defer in loops** — no `defer` inside `for` blocks? (accumulates until function exit — wrap in closure or extract)
16. **Float comparison** — no `==` on floats? Using epsilon-based comparison or `math.Big`?
17. **Typed nil interface trap** — no returning typed nil pointer as interface? (typed nil in interface ≠ nil)
18. **MixedCaps naming** — Go names use MixedCaps (not snake_case, not SCREAMING_CASE)? Acronyms capitalized (ID, URL, HTTP)?
19. **Interface size** — interfaces have ≤ 3 methods? Declared at consumer side, not provider?
20. **Functional options** — constructors with >3 optional params use functional options pattern? Not config structs with 15 fields?
```

After the Review Checklist section, add a new section:

```markdown
## Audit Mode — Parallel Sub-Agents

When dispatched in **audit mode** for full codebase scan, use up to 5 parallel sub-agents (via the Agent tool):

1. **Layer violations + DI** — scan all handler/service/repo imports for layer breaches
2. **Error handling + wrapping** — find swallowed errors, missing wrapping, log-and-return (-> See go-error-reviewer for deep audit)
3. **Naming + code style** — MixedCaps violations, stuttering, package naming
4. **Safety traps** — nil maps, append aliasing, defer in loops, float comparison, typed nil interface
5. **Interface design + struct patterns** — oversized interfaces, missing zero-value safety, functional options opportunities

## Cross-References

For deeper analysis in specific areas, dispatch specialized agents:
- -> See go-error-reviewer for exhaustive error handling audit (15-point checklist)
- -> See go-concurrency-reviewer for goroutine/channel/mutex/context audit
- -> See go-performance-reviewer for measurement-first performance review
- -> See go-modernizer for outdated pattern detection (Go 1.21-1.24+)
- -> See go-observability-reviewer for logging/metrics/tracing audit
- -> See security-scanner for Go security checks (injection, crypto, XSS)
- -> See database-reviewer for Go/pgx database patterns
```

- [ ] **Step 2: Commit**

```bash
git add packages/stack-agents/go/go-reviewer.md
git commit -m "feat(go-reviewer): expand checklist 12->20 points, add audit mode and cross-references"
```

---

## Task 4: Create go-error-reviewer Agent

**Files:**
- Create: `packages/stack-agents/go/go-error-reviewer.md`
- Create: `packages/codex/skills/go-error-reviewer/SKILL.md`

- [ ] **Step 1: Create the agent file**

Write `packages/stack-agents/go/go-error-reviewer.md` — full agent with:
- Frontmatter: name, description, model: opus, allowed-tools: Read, Grep, Glob, Bash, Agent
- Persona: "You are a Go reliability engineer. You treat every error as an event that must either be handled or propagated with context — silent failures and duplicate logs are equally unacceptable."
- Modes: Coding (sequential), Review (sequential), Audit (5 parallel sub-agents: swallowed errors, missing wrapping, log-and-return, panic/recover, structured logging)
- Phase 0: Load Project Context (CLAUDE.md, backend-layers.md)
- Phase 1: 15-point checklist from spec (section 2.2)
- Phase 2: Deep Analysis
- Output format: Severity × Confidence (same as go-reviewer)
- Cross-references: `-> See go-reviewer for general Go code review`, `-> See database-reviewer for sql.ErrNoRows patterns`
- Reference loading: "For detailed patterns, read `packages/stack-agents/go/references/error-creation.md`, `error-wrapping.md`, `error-inspection.md`"

- [ ] **Step 2: Create Codex skill mirror**

Copy the agent to `packages/codex/skills/go-error-reviewer/SKILL.md` with adjusted frontmatter:
- Add `user-invocable: false`
- Keep the rest identical

- [ ] **Step 3: Commit**

```bash
git add packages/stack-agents/go/go-error-reviewer.md packages/codex/skills/go-error-reviewer/
git commit -m "feat(go): add go-error-reviewer agent — 15-point error handling audit"
```

---

## Task 5: Create go-concurrency-reviewer Agent

**Files:**
- Create: `packages/stack-agents/go/go-concurrency-reviewer.md`
- Create: `packages/codex/skills/go-concurrency-reviewer/SKILL.md`

- [ ] **Step 1: Create the agent file**

Write `packages/stack-agents/go/go-concurrency-reviewer.md` — full agent with:
- Frontmatter: name, description, model: opus, allowed-tools: Read, Grep, Glob, Bash, Agent
- Persona: "You are a Go concurrency engineer. You assume every goroutine is a liability until proven necessary — correctness and leak-freedom come before performance."
- Modes: Coding, Review, Audit (5 sub-agents from spec section 2.3)
- Phase 0: Load Project Context
- Phase 1: 15-point checklist from spec (section 2.3)
- Decision table (Channel vs Mutex vs Atomic vs errgroup vs WaitGroup) — include in body
- Phase 2: Deep Analysis
- Output format: Severity × Confidence
- Cross-references and reference loading from spec

- [ ] **Step 2: Create Codex skill mirror**

Copy to `packages/codex/skills/go-concurrency-reviewer/SKILL.md` with `user-invocable: false`.

- [ ] **Step 3: Commit**

```bash
git add packages/stack-agents/go/go-concurrency-reviewer.md packages/codex/skills/go-concurrency-reviewer/
git commit -m "feat(go): add go-concurrency-reviewer agent — goroutine/channel/mutex audit"
```

---

## Task 6: Create go-performance-reviewer Agent

**Files:**
- Create: `packages/stack-agents/go/go-performance-reviewer.md`
- Create: `packages/codex/skills/go-performance-reviewer/SKILL.md`

- [ ] **Step 1: Create the agent file**

Write `packages/stack-agents/go/go-performance-reviewer.md` — full agent with:
- Frontmatter: name, description, model: opus, allowed-tools: Read, Grep, Glob, Bash, Agent
- Persona: "You are a Go performance engineer. You never optimize without profiling first. Intuition about bottlenecks is wrong ~80% of the time."
- Modes: Review, Audit (4 sub-agents from spec section 2.4)
- Phase 0: Load Project Context
- Phase 1: 12-point checklist from spec
- Bottleneck decision tree in body
- Phase 2: Deep Analysis
- Output format: Severity × Confidence

- [ ] **Step 2: Create Codex skill mirror**

- [ ] **Step 3: Commit**

```bash
git add packages/stack-agents/go/go-performance-reviewer.md packages/codex/skills/go-performance-reviewer/
git commit -m "feat(go): add go-performance-reviewer agent — measurement-first perf review"
```

---

## Task 7: Create go-modernizer Agent

**Files:**
- Create: `packages/stack-agents/go/go-modernizer.md`
- Create: `packages/codex/skills/go-modernizer/SKILL.md`

- [ ] **Step 1: Create the agent file**

Write `packages/stack-agents/go/go-modernizer.md` — full agent with:
- Frontmatter: name, description, model: opus, allowed-tools: Read, Grep, Glob, Bash
- Persona: "You are a Go modernization engineer. You help codebases adopt new language features safely — one pattern at a time, with tests proving equivalence."
- Modes: Review, Audit
- Phase 0: Load Project Context + detect Go version from go.mod
- Phase 1: 10-point checklist from spec (section 2.5) — each item includes Go version requirement
- Phase 2: Migration suggestions with before/after examples
- Output: table of outdated patterns found, Go version required, migration effort

- [ ] **Step 2: Create Codex skill mirror**

- [ ] **Step 3: Commit**

```bash
git add packages/stack-agents/go/go-modernizer.md packages/codex/skills/go-modernizer/
git commit -m "feat(go): add go-modernizer agent — detect outdated patterns, suggest Go 1.21-1.24+ idioms"
```

---

## Task 8: Create go-observability-reviewer Agent

**Files:**
- Create: `packages/stack-agents/go/go-observability-reviewer.md`
- Create: `packages/codex/skills/go-observability-reviewer/SKILL.md`

- [ ] **Step 1: Create the agent file**

Write `packages/stack-agents/go/go-observability-reviewer.md` — full agent with:
- Frontmatter: name, description, model: opus, allowed-tools: Read, Grep, Glob, Bash, Agent
- Persona: "You are a Go observability engineer. You ensure every production service emits the signals needed to diagnose issues without attaching a debugger."
- Modes: Review, Audit (5 sub-agents — one per signal: Logs, Metrics, Traces, Profiles, Health)
- Phase 0: Load Project Context
- Phase 1: 10-point checklist from spec (section 2.6)
- Phase 2: Five Signals gap analysis
- Output format: Severity × Confidence

- [ ] **Step 2: Create Codex skill mirror**

- [ ] **Step 3: Commit**

```bash
git add packages/stack-agents/go/go-observability-reviewer.md packages/codex/skills/go-observability-reviewer/
git commit -m "feat(go): add go-observability-reviewer agent — Five Signals audit"
```

---

## Task 9: Create 4 New Go Hooks

**Files:**
- Create: `packages/stack-hooks/go/go-error-check-on-edit.sh`
- Create: `packages/stack-hooks/go/go-context-check-on-edit.sh`
- Create: `packages/stack-hooks/go/go-safety-check-on-edit.sh`
- Create: `packages/stack-hooks/go/golangci-lint-on-edit.sh`

- [ ] **Step 1: Create go-error-check-on-edit.sh**

Follow the pattern from `go-vet-on-edit.sh` for structure. Profile: standard, strict.

```bash
#!/bin/bash
# go-error-check-on-edit.sh — PostToolUse hook for Edit/Write
# Detects common Go error handling anti-patterns in real-time.
# Profile: standard, strict

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then exit 0; fi
if [[ ! "$FILE_PATH" =~ \.go$ ]]; then exit 0; fi
if [ ! -f "$FILE_PATH" ]; then exit 0; fi

WARNINGS=""

# Check 1: Swallowed errors — _ = functionCall()
while IFS= read -r line; do
  LINENO_=$(echo "$line" | cut -d: -f1)
  WARNINGS="${WARNINGS}\n  warning: go-error-check: line ${LINENO_} — error discarded with _ ="
  WARNINGS="${WARNINGS}\n    Fix: handle or wrap: if err != nil { return fmt.Errorf(\"context: %w\", err) }"
done < <(grep -n '_ = [a-zA-Z]' "$FILE_PATH" 2>/dev/null | grep -v '_ = range\|_ = len\|_ = cap')

# Check 2: Return nil without wrapping — if err != nil { return nil }
while IFS= read -r line; do
  LINENO_=$(echo "$line" | cut -d: -f1)
  WARNINGS="${WARNINGS}\n  warning: go-error-check: line ${LINENO_} — error checked but nil returned without wrapping"
  WARNINGS="${WARNINGS}\n    Fix: return fmt.Errorf(\"context: %w\", err)"
done < <(grep -n 'if err != nil {' "$FILE_PATH" 2>/dev/null | while read -r match; do
  LN=$(echo "$match" | cut -d: -f1)
  NEXT=$(sed -n "$((LN+1))p" "$FILE_PATH" 2>/dev/null)
  if echo "$NEXT" | grep -q 'return nil$\|return nil, nil'; then
    echo "$match"
  fi
done)

# Check 3: Log-and-return — log.Print + return err on adjacent lines
while IFS= read -r line; do
  LN=$(echo "$line" | cut -d: -f1)
  NEXT=$(sed -n "$((LN+1))p" "$FILE_PATH" 2>/dev/null)
  if echo "$NEXT" | grep -q 'return.*err'; then
    WARNINGS="${WARNINGS}\n  warning: go-error-check: line ${LN} — log-and-return anti-pattern (log OR return, never both)"
  fi
done < <(grep -n 'log\.\(Print\|Error\|Warn\|Info\|Fatal\)' "$FILE_PATH" 2>/dev/null)

# Check 4: fmt.Sprintf inside fmt.Errorf
while IFS= read -r line; do
  LINENO_=$(echo "$line" | cut -d: -f1)
  WARNINGS="${WARNINGS}\n  warning: go-error-check: line ${LINENO_} — fmt.Sprintf inside fmt.Errorf (double formatting)"
  WARNINGS="${WARNINGS}\n    Fix: use fmt.Errorf(\"context %s: %w\", val, err) directly"
done < <(grep -n 'fmt\.Errorf.*fmt\.Sprintf' "$FILE_PATH" 2>/dev/null)

if [ -n "$WARNINGS" ]; then
  echo -e "\nGo error patterns detected:${WARNINGS}" >&2
  echo "" >&2
fi

exit 0
```

- [ ] **Step 2: Create go-context-check-on-edit.sh**

Profile: standard, strict.

```bash
#!/bin/bash
# go-context-check-on-edit.sh — PostToolUse hook for Edit/Write
# Warns on Go context.Context usage anti-patterns.
# Profile: standard, strict

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then exit 0; fi
if [[ ! "$FILE_PATH" =~ \.go$ ]]; then exit 0; fi
if [ ! -f "$FILE_PATH" ]; then exit 0; fi

WARNINGS=""

# Check 1: context.Background() outside main/init/test
FILENAME=$(basename "$FILE_PATH")
IS_TEST=false
if [[ "$FILENAME" =~ _test\.go$ ]]; then IS_TEST=true; fi

while IFS= read -r line; do
  LINENO_=$(echo "$line" | cut -d: -f1)
  # Check if inside func main or func init
  FUNC_LINE=$(head -n "$LINENO_" "$FILE_PATH" | grep -n 'func main\|func init\|func Test\|func Benchmark' | tail -1)
  if [ -z "$FUNC_LINE" ] && [ "$IS_TEST" = false ]; then
    WARNINGS="${WARNINGS}\n  warning: go-context-check: line ${LINENO_} — context.Background() outside main/init/test"
    WARNINGS="${WARNINGS}\n    Fix: accept ctx context.Context as parameter instead"
  fi
done < <(grep -n 'context\.Background()' "$FILE_PATH" 2>/dev/null)

# Check 2: context.TODO() in non-test files
if [ "$IS_TEST" = false ]; then
  while IFS= read -r line; do
    LINENO_=$(echo "$line" | cut -d: -f1)
    WARNINGS="${WARNINGS}\n  warning: go-context-check: line ${LINENO_} — context.TODO() in production code"
    WARNINGS="${WARNINGS}\n    Fix: replace with proper context propagation from caller"
  done < <(grep -n 'context\.TODO()' "$FILE_PATH" 2>/dev/null)
fi

if [ -n "$WARNINGS" ]; then
  echo -e "\nGo context patterns detected:${WARNINGS}" >&2
  echo "" >&2
fi

exit 0
```

- [ ] **Step 3: Create go-safety-check-on-edit.sh**

Profile: standard, strict.

```bash
#!/bin/bash
# go-safety-check-on-edit.sh — PostToolUse hook for Edit/Write
# Detects common Go safety traps: nil maps, defer in loops, append aliasing.
# Profile: standard, strict

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then exit 0; fi
if [[ ! "$FILE_PATH" =~ \.go$ ]]; then exit 0; fi
if [ ! -f "$FILE_PATH" ]; then exit 0; fi

WARNINGS=""

# Check 1: Uninitialized map — var m map[...] without make()
while IFS= read -r line; do
  LINENO_=$(echo "$line" | cut -d: -f1)
  # Check next 3 lines for make() or = map[
  NEXT_LINES=$(sed -n "$((LINENO_+1)),$((LINENO_+3))p" "$FILE_PATH" 2>/dev/null)
  if ! echo "$NEXT_LINES" | grep -q 'make(\|= map\['; then
    WARNINGS="${WARNINGS}\n  warning: go-safety: line ${LINENO_} — map declared without initialization (nil map panics on write)"
    WARNINGS="${WARNINGS}\n    Fix: use make(map[K]V) or literal map[K]V{}"
  fi
done < <(grep -n 'var [a-zA-Z_]* map\[' "$FILE_PATH" 2>/dev/null)

# Check 2: defer inside for loop
IN_FOR=false
FOR_LINE=0
while IFS='' read -r line; do
  LINENO_=$((LINENO_+1))
  if echo "$line" | grep -q '^\s*for '; then
    IN_FOR=true
    FOR_LINE=$LINENO_
  fi
  if [ "$IN_FOR" = true ] && echo "$line" | grep -q '^\s*defer '; then
    WARNINGS="${WARNINGS}\n  warning: go-safety: line ${LINENO_} — defer inside for loop (accumulates until function exit)"
    WARNINGS="${WARNINGS}\n    Fix: wrap in closure or extract to separate function"
    IN_FOR=false
  fi
  # Reset on closing brace at same indent
done < "$FILE_PATH" 2>/dev/null

if [ -n "$WARNINGS" ]; then
  echo -e "\nGo safety patterns detected:${WARNINGS}" >&2
  echo "" >&2
fi

exit 0
```

- [ ] **Step 4: Create golangci-lint-on-edit.sh**

Profile: strict only.

```bash
#!/bin/bash
# golangci-lint-on-edit.sh — PostToolUse hook for Edit/Write
# Runs golangci-lint on the package containing the edited .go file.
# Profile: strict only (too slow for standard, ~2-5s)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" != "strict" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then exit 0; fi
if [[ ! "$FILE_PATH" =~ \.go$ ]]; then exit 0; fi
if [ ! -f "$FILE_PATH" ]; then exit 0; fi

# Check golangci-lint is available
if ! command -v golangci-lint &>/dev/null; then
  exit 0
fi

# Find nearest go.mod
DIR=$(dirname "$FILE_PATH")
MODULE_ROOT=""
SEARCH_DIR="$DIR"
while [ "$SEARCH_DIR" != "/" ] && [ "$SEARCH_DIR" != "." ]; do
  if [ -f "$SEARCH_DIR/go.mod" ]; then
    MODULE_ROOT="$SEARCH_DIR"
    break
  fi
  SEARCH_DIR=$(dirname "$SEARCH_DIR")
done

if [ -z "$MODULE_ROOT" ]; then exit 0; fi

# Check if golangci config exists
HAS_CONFIG=false
for cfg in ".golangci.yml" ".golangci.yaml" ".golangci.toml" ".golangci.json"; do
  if [ -f "$MODULE_ROOT/$cfg" ]; then
    HAS_CONFIG=true
    break
  fi
done

cd "$MODULE_ROOT" 2>/dev/null || exit 0

REL_PKG="./${DIR#$MODULE_ROOT/}"

RESULT=$(golangci-lint run --fast "$REL_PKG" 2>&1 | head -10)
if [ -n "$RESULT" ]; then
  echo "golangci-lint issues:" >&2
  echo "$RESULT" >&2
  echo "" >&2
fi

exit 0
```

- [ ] **Step 5: Make all hooks executable**

```bash
chmod +x packages/stack-hooks/go/go-error-check-on-edit.sh
chmod +x packages/stack-hooks/go/go-context-check-on-edit.sh
chmod +x packages/stack-hooks/go/go-safety-check-on-edit.sh
chmod +x packages/stack-hooks/go/golangci-lint-on-edit.sh
```

- [ ] **Step 6: Commit**

```bash
git add packages/stack-hooks/go/
git commit -m "feat(hooks): add 4 Go hooks — error-check, context-check, safety-check, golangci-lint"
```

---

## Task 10: Create Go Rules

**Files:**
- Create: `packages/stack-rules/go/go-conventions.md`
- Create: `packages/stack-rules/go/go-safety.md`

- [ ] **Step 1: Create packages/stack-rules/go/ directory and go-conventions.md**

```markdown
---
alwaysApply: false
paths:
  - "**/*.go"
---

# Go Conventions

## Naming
- MixedCaps for all names (not snake_case, not SCREAMING_CASE). Acronyms fully capitalized: `HTTPClient`, `userID`, `parseURL`
- Package names: lowercase, single word, no underscores. Never `util`, `common`, `base`, `helpers`
- Interfaces: verb or -er suffix (`Reader`, `Validator`, `Closer`). Max 3 methods. Declare at consumer side
- Error variables: `ErrNotFound`, `ErrValidation` (Err prefix + PascalCase)
- Avoid stuttering: `http.Client` not `http.HTTPClient`, `user.New()` not `user.NewUser()`

## Patterns
- Constructors: `NewX(deps) *X`, validate inside, return error if validation can fail
- >3 optional params: use functional options pattern (`func WithTimeout(d time.Duration) Option`)
- Enums: `iota` with `Unknown = 0` as zero value. Always include `String()` method
- Early returns (guard clauses), not deep nesting. Happy path at lowest indentation
- Accept interfaces, return structs. Keep interfaces small

## Error Handling
- Always wrap: `fmt.Errorf("MethodName: %w", err)` — lowercase, no punctuation
- Log OR return, never both. Handlers log; services/repos return
- Sentinel errors (`var ErrNotFound = errors.New(...)`) for expected domain conditions
- `errors.Is()` / `errors.As()` for inspection, never `==` or type assertion
- Domain errors map to HTTP status in handlers only — services return domain errors

## Context
- `ctx context.Context` always first parameter, always named `ctx`
- Never store context in structs — pass explicitly
- `context.Background()` only in main, init, tests
- `defer cancel()` immediately after `context.WithCancel` / `WithTimeout` / `WithDeadline`
```

- [ ] **Step 2: Create go-safety.md**

```markdown
---
alwaysApply: false
paths:
  - "**/*.go"
---

# Go Safety Guardrails

## Nil Traps
- Always `make()` maps before write — nil map panics: `m := make(map[K]V)`
- Typed nil pointer in interface is NOT nil — `var p *MyType; var i MyInterface = p; i != nil` is TRUE
- Check pointer receivers for nil in public methods of exported types

## Concurrency
- Every goroutine needs a shutdown mechanism: `ctx.Done()`, done channel, or explicit signal
- Only senders close channels — closing a closed channel panics
- Include `ctx.Done()` case in every `select` statement
- No `time.After` in loops — creates new timer (and leak) per iteration. Use `time.NewTimer` + `Reset()`

## Memory
- Append can alias backing array — always use return value: `s = append(s, x)`, never `append(s, x)` alone
- `defer` in loops accumulates all defers until function exit — wrap body in closure or extract to function
- Sub-slice of large slice retains entire backing array in memory — copy if keeping small piece of large data

## Numeric
- `int64` -> `int32` truncates silently — use explicit conversion with bounds check
- Float `==` comparison unreliable — use epsilon: `math.Abs(a-b) < epsilon`
- Integer overflow wraps silently — check bounds before arithmetic on user input
```

- [ ] **Step 3: Commit**

```bash
git add packages/stack-rules/go/
git commit -m "feat(rules): add go-conventions and go-safety rules for .go files"
```

---

## Task 11: Create /benchmark Command

**Files:**
- Create: `packages/core/commands/benchmark.md`
- Create: `packages/codex/skills/benchmark/SKILL.md`

- [ ] **Step 1: Create benchmark.md**

```markdown
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
2. `git stash` (if dirty)
3. `git checkout <ref>`
4. Run same benchmarks, save to `/tmp/bench-old.txt`
5. `git checkout -` (return to original branch)
6. `git stash pop` (if stashed)
7. Run: `benchstat /tmp/bench-old.txt /tmp/bench-new.txt`
8. If `benchstat` not available: `go install golang.org/x/perf/cmd/benchstat@latest`

## Step 5: Report

### Single Run:
```
## Benchmark Results — ./pkg/cache/...

| Benchmark | ns/op | B/op | allocs/op |
|-----------|-------|------|-----------|
| BenchmarkGet-8 | 234 | 48 | 1 |
| BenchmarkSet-8 | 567 | 128 | 3 |

Ran 6 iterations per benchmark for statistical significance.
```

### Comparison:
```
## Benchmark Comparison — current vs main

[benchstat output with p-values]

Summary:
- X benchmarks faster, Y slower, Z unchanged (at p < 0.05)
```
```

- [ ] **Step 2: Create Codex skill mirror**

Copy to `packages/codex/skills/benchmark/SKILL.md` with `user-invocable: true`.

- [ ] **Step 3: Commit**

```bash
git add packages/core/commands/benchmark.md packages/codex/skills/benchmark/
git commit -m "feat(commands): add /benchmark command for Go benchmarks with benchstat"
```

---

## Task 12: Enhance 6 Existing Core Agents — Go Sections

**Files:**
- Modify: `packages/core/agents/security-scanner.md`
- Modify: `packages/core/agents/database-reviewer.md`
- Modify: `packages/core/agents/test-generator.md`
- Modify: `packages/core/agents/dependency-checker.md`
- Modify: `packages/core/agents/debug-observer.md`
- Modify: `packages/core/agents/architect.md`

- [ ] **Step 1: Enhance security-scanner.md**

Add a new section `## Go-Specific Security Checks` after the existing Phase 1 checklist:

```markdown
## Go-Specific Security Checks

When reviewing Go code, additionally check:

- **CHECK-GO-1:** `fmt.Sprintf` in SQL — use parameterized queries (`$1`, `?`)
- **CHECK-GO-2:** `crypto/md5` or `crypto/sha1` for password hashing — use `bcrypt` or `argon2`
- **CHECK-GO-3:** `exec.Command` / `os.Exec` with user-controlled input — command injection risk
- **CHECK-GO-4:** `text/template` with user input — use `html/template` for web output (XSS)
- **CHECK-GO-5:** `net/http` server without `ReadTimeout`/`WriteTimeout` — slowloris vulnerability
- **CHECK-GO-6:** `http.ListenAndServe` without TLS in production — use `ListenAndServeTLS`

Severity scoring: use DREAD model (Damage, Reproducibility, Exploitability, Affected users, Discoverability) for Go-specific findings.
```

- [ ] **Step 2: Enhance database-reviewer.md**

Add a new section `## Go/pgx Database Patterns` after anti-patterns:

```markdown
## Go/pgx Database Patterns

When reviewing Go database code (pgx, database/sql):

- Use `*Context` methods always: `QueryContext`, `ExecContext`, `QueryRowContext` — never `Query`, `Exec`, `QueryRow`
- `defer rows.Close()` immediately after `QueryContext` — before any error check on rows
- `sql.ErrNoRows` / `pgx.ErrNoRows` via `errors.Is(err, sql.ErrNoRows)` — never direct `==`
- Connection pool tuning: `SetMaxOpenConns()`, `SetMaxIdleConns()`, `SetConnMaxLifetime()` must be configured
- Transaction isolation: use `sql.TxOptions{Isolation: sql.LevelSerializable}` for critical sections
- No `SELECT *` — always explicit column list (schema changes break `SELECT *` silently)
- Batch operations: use `pgx.Batch` or `COPY` for bulk inserts, not loop of single inserts
```

- [ ] **Step 3: Enhance test-generator.md**

Add to the Go section of language patterns:

```markdown
### Go Testing Patterns (expanded)

- **Table-driven tests:** Every test function uses `tests := []struct{ name string; ... }` + `for _, tt := range tests { t.Run(tt.name, func(t *testing.T) { ... }) }`
- **t.Parallel():** Add to independent subtests for faster execution
- **Fuzzing:** For parsing/validation functions, add `func FuzzX(f *testing.F) { f.Add(seed); f.Fuzz(func(t *testing.T, input []byte) { ... }) }`
- **goleak:** Add `func TestMain(m *testing.M) { goleak.VerifyTestMain(m) }` to detect goroutine leaks
- **Build tags:** Separate integration tests with `//go:build integration` — run with `go test -tags=integration`
- **synctest (Go 1.24+):** Use `testing/synctest` for deterministic concurrent test execution
- **httptest:** Use `httptest.NewServer` for handler tests, `httptest.NewRecorder` for unit tests
```

- [ ] **Step 4: Enhance dependency-checker.md**

Add to the Go detection section:

```markdown
### Go Dependency Patterns (expanded)

- **govulncheck** (preferred over `go mod audit`): `govulncheck ./...` — checks actual call graph, not just module list
- **tools.go pattern:** Dev dependencies in `//go:build tools` file: `import (_ "github.com/golangci/golangci-lint/cmd/golangci-lint")`
- **go.sum commitment:** Verify `go.sum` is committed — blocks supply chain substitution
- **Semantic import versioning:** v2+ modules must use `/v2` in import path — flag if `go.mod` has `module path/v2` but imports don't match
- **Dependabot/Renovate:** Check `.github/dependabot.yml` or `renovate.json` exists with `gomod` ecosystem configured
```

- [ ] **Step 5: Enhance debug-observer.md**

Add a new section `## Go-Specific Debugging` after Phase 7:

```markdown
## Go-Specific Debugging

When debugging Go services:

- **pprof:** Check if `/debug/pprof/` is exposed. Collect: `go tool pprof http://localhost:6060/debug/pprof/goroutine`
- **Delve:** Attach to running process: `dlv attach <pid>` or `dlv debug ./cmd/server`
- **GODEBUG:** Set `GODEBUG=gctrace=1` for GC diagnostics, `GODEBUG=schedtrace=1000` for scheduler
- **Goroutine dump:** Send `SIGQUIT` to Go process for full goroutine stack dump: `kill -QUIT <pid>`
- **Race detector:** Reproduce with `go test -race ./...` — detects data races at runtime
- **Flaky tests:** Run with `-count=100` to reproduce: `go test -count=100 -run TestFlaky ./pkg/...`
```

- [ ] **Step 6: Enhance architect.md**

Add to the architecture principles or project structure section:

```markdown
## Go Project Layout

When designing Go project structure:

- **cmd/** — Entry points. One `main.go` per binary: `cmd/server/main.go`, `cmd/worker/main.go`
- **internal/** — Private packages. Cannot be imported by other modules. Use for business logic
- **pkg/** — Public packages (optional). Only if genuinely reusable outside this project
- **Service layout:** `cmd/` -> `internal/app/` (wire) -> `internal/service/` -> `internal/repository/`
- **Library layout:** Root package is the API. `internal/` for implementation details
- **CLI layout:** `cmd/mytool/main.go` -> `internal/cli/` (Cobra commands) -> `internal/` (business logic)
- **Module path:** Match GitHub path: `module github.com/org/repo`
- **Makefile essentials:** `build`, `test`, `lint`, `run`, `migrate-up`, `migrate-down` targets
```

- [ ] **Step 7: Commit**

```bash
git add packages/core/agents/security-scanner.md packages/core/agents/database-reviewer.md \
  packages/core/agents/test-generator.md packages/core/agents/dependency-checker.md \
  packages/core/agents/debug-observer.md packages/core/agents/architect.md
git commit -m "feat(agents): enhance 6 core agents with Go-specific sections"
```

---

## Task 13: Create 19 Reference Documents

**Files:**
- Create: `packages/stack-agents/go/references/` (19 .md files)

- [ ] **Step 1: Create reference directory and all 19 files**

Create `packages/stack-agents/go/references/` with these files. Each file: 500-1,500 tokens of detailed patterns, decision tables, code examples. Content sourced from cc-skills-golang knowledge (rewritten in our style, not copied).

Files to create:
1. `naming-conventions.md` — MixedCaps rules, package naming, interface naming, error var naming, acronym rules, stuttering avoidance, receiver naming
2. `code-style.md` — formatting (gofmt), line length, variable declarations, control flow, function design (<50 lines), early returns
3. `design-patterns.md` — 20 Go best practices: functional options, constructors, enums (iota), builder, dependency injection, factory, singleton (sync.Once), composition over inheritance
4. `data-structures.md` — slices (append semantics, capacity, copy), maps (initialization, iteration order, concurrent access), arrays vs slices, generics usage, pointer types decision
5. `structs-interfaces.md` — interface design (small, consumer-side), composition via embedding, type assertions and switches, noCopy pattern, method sets
6. `error-creation.md` — sentinel errors (`var ErrNotFound = errors.New`), custom error types, `errors.Join()`, error message format (lowercase, no punctuation), wrapping vs creating
7. `error-wrapping.md` — `fmt.Errorf("%w")`, wrapping depth guidelines, when to wrap vs when to create new, context in error messages, chain inspection
8. `error-inspection.md` — `errors.Is()`, `errors.As()`, `errors.Unwrap()`, sentinel matching, type matching, multi-error inspection
9. `goroutine-lifecycle.md` — spawn patterns, shutdown mechanisms (ctx, done channel, signal), leak prevention, goleak integration, worker pool pattern
10. `channel-patterns.md` — fan-out/fan-in, pipeline, signaling (done channel), ownership (only sender closes), directed types, buffered vs unbuffered decision
11. `sync-primitives.md` — `sync.Mutex` / `sync.RWMutex`, `sync.Map` (when to use), `sync.Pool`, `sync.Once`, `sync.WaitGroup`, `atomic` operations, `errgroup`
12. `context-propagation.md` — creation (Background, TODO, WithCancel, WithTimeout, WithDeadline, WithValue), cancellation flow, timeout patterns, value keys (typed, unexported)
13. `performance-profiling.md` — pprof (CPU, memory, goroutine, block, mutex profiles), benchstat workflow, escape analysis, alloc_objects, GC tuning (GOGC, GOMEMLIMIT), caching decision tree
14. `database-patterns.md` — pgx patterns, connection pool tuning, transaction handling, batch operations, prepared statements, migration patterns, `sql.ErrNoRows` handling
15. `testing-patterns.md` — table-driven tests, subtests, t.Parallel, fuzzing, goleak, synctest, httptest, build tags, testcontainers, golden files
16. `observability-pipeline.md` — slog handler chain (sampling -> formatting -> routing -> sinks), Prometheus patterns (histograms, labels, registration), OpenTelemetry spans, pprof endpoints
17. `security-checklist.md` — injection prevention, crypto best practices (bcrypt/argon2, crypto/rand), web security (CORS, CSP, HSTS), auth patterns, input validation, file upload safety
18. `modernize-guide.md` — Go version feature matrix (1.18 generics, 1.20 errors.Join, 1.21 slog/slices/maps, 1.22 range-over-int/loop-var, 1.24 synctest), migration recipes
19. `samber-libraries.md` — Overview of samber/lo (functional), samber/oops (structured errors), samber/do (DI), samber/slog (handler pipeline), samber/hot (caching), samber/mo (monads), samber/ro (reactive), adoption criteria for each

Each file follows this structure:
```markdown
# [Topic]

> Reference document for [agent-name]. Loaded on demand via Read tool.

## [Core Content]

[Detailed patterns, code examples, decision tables]

## When to Use

[Clear criteria for when this reference applies]
```

- [ ] **Step 2: Commit**

```bash
git add packages/stack-agents/go/references/
git commit -m "feat(go): add 19 reference documents for on-demand deep knowledge loading"
```

---

## Task 14: Enhance security-patterns.sh Hook — Go Section

**Files:**
- Modify: `packages/core/hooks/security-patterns.sh`

- [ ] **Step 1: Expand Go patterns section**

In the Go patterns case block (`*.go)`), add after the existing `fmt.Sprintf` check:

```bash
  # Weak hash for passwords
  if grep -qn 'crypto/md5\|crypto/sha1' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: weak hash (md5/sha1) — use bcrypt or argon2 for passwords"
  fi
  # Command injection
  if grep -qn 'exec\.Command.*\+\|exec\.CommandContext.*\+' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: exec.Command with concatenation — potential command injection"
  fi
  # text/template with user input (XSS)
  if grep -qn '"text/template"' "$FILE_PATH" 2>/dev/null; then
    if grep -q 'http\.\|Handler\|handler\|router\|chi\.\|gin\.\|echo\.' "$FILE_PATH" 2>/dev/null; then
      WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: text/template in HTTP context — use html/template for XSS safety"
    fi
  fi
  # HTTP server without timeouts
  if grep -qn 'http\.ListenAndServe\b' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  [SECURITY] $FILE_PATH: http.ListenAndServe without explicit timeouts — slowloris risk. Use http.Server{ReadTimeout, WriteTimeout}"
  fi
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/hooks/security-patterns.sh
git commit -m "feat(hooks): expand security-patterns.sh with Go-specific checks"
```

---

## Task 15: README Ecosystem Section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Ecosystem & Companions section**

Add after the existing content (before any footer/license section):

```markdown
## Ecosystem & Companions

For deep language-specific skills that complement Superkit's orchestration:

| Plugin | Focus | Skills | Install |
|--------|-------|--------|---------|
| [cc-skills-golang](https://github.com/samber/cc-skills-golang) | Production-grade Go patterns | 40 skills | `npx skills add https://github.com/samber/cc-skills-golang --skill '*'` |

Superkit provides **workflow orchestration** (hooks, commands, /dev pipeline). Companion plugins provide **deep domain knowledge**. They work together — Superkit dispatches agents that leverage companion skills for language-specific guidance.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Ecosystem & Companions section recommending cc-skills-golang"
```

---

## Task 16: Documentation Updates — Tier 1

**Files:**
- Modify: `CLAUDE.md` — counts table, structure section
- Modify: `README.md` — "What's Inside" table, badges, "What's New"
- Modify: `CHANGELOG.md`
- Modify: `packages/codex/AGENTS.md`
- Modify: `packages/codex/INSTALL.md`
- Modify: `docs/INSTALL-CLAUDE-CODE.md`

- [ ] **Step 1: Update CLAUDE.md**

Update the counts table:
```
| Component | Core | Stack | Extras | Showcase | Codex |
|-----------|------|-------|--------|----------|-------|
| Agents | 27 | 9 | 3 | 28 | — |
| Skills | 4 | — | 1 | 11 | 50 |
| Commands | 14 | — | — | 16 | 8 |
| Hooks | 14 (+2 internal) | 9 | — | 14 | — |
| Rules | 7 (+1 internal) | 2 | — | 6 | — |
```

Update structure section: add `packages/stack-rules/go/` and `packages/stack-agents/go/references/`.

- [ ] **Step 2: Update README.md**

Update "What's Inside" table with new counts. Add "What's New in v1.3.7" section with Go Deep Dive highlights.

- [ ] **Step 3: Update CHANGELOG.md**

Add full entry under `## [1.3.7]` with all changes organized by category (New Go Agents, New Go Hooks, New Go Rules, New Commands, Enhanced Agents, Infrastructure, Reference Docs, Ecosystem).

- [ ] **Step 4: Update packages/codex/AGENTS.md**

Add 6 new skills to Available Skills lists: go-error-reviewer, go-concurrency-reviewer, go-performance-reviewer, go-modernizer, go-observability-reviewer, benchmark.

- [ ] **Step 5: Update packages/codex/INSTALL.md**

Update skill count from 44 to 50. Update feature comparison table.

- [ ] **Step 6: Update docs/INSTALL-CLAUDE-CODE.md**

Update hook counts, agent counts, rule counts.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md README.md CHANGELOG.md packages/codex/AGENTS.md packages/codex/INSTALL.md docs/INSTALL-CLAUDE-CODE.md
git commit -m "docs: update all documentation for v1.3.7 — counts, CHANGELOG, guides"
```

---

## Task 17: Documentation Updates — Tier 2

**Files:**
- Modify: `docs/guide/*.md` (any chapters with stale counts)
- Modify: `setup.sh` (summary output counts)

- [ ] **Step 1: Grep for stale counts**

```bash
grep -rn "4 stack" docs/ README.md CLAUDE.md packages/codex/ --include="*.md"
grep -rn "5 stack-hooks\|5 stack hooks" docs/ README.md CLAUDE.md packages/codex/ --include="*.md"
grep -rn "44 skills\|44 codex" docs/ README.md CLAUDE.md packages/codex/ --include="*.md"
grep -rn "13 commands" docs/ README.md CLAUDE.md packages/codex/ --include="*.md"
```

- [ ] **Step 2: Fix all stale references found**

Update each file with correct counts:
- Stack agents: 4 -> 9
- Stack hooks: 5 -> 9
- Stack rules: 0 -> 2
- Codex skills: 44 -> 50
- Commands: 13 -> 14

- [ ] **Step 3: Update setup.sh summary output**

Find the summary echo lines in setup.sh and update Go stack counts.

- [ ] **Step 4: Update GitHub repo description**

```bash
gh repo edit --description "Production-tested agents (36), commands (14), hooks (25), skills (54), and rules (11) for Claude Code and Codex CLI. All agents on Opus."
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: fix stale counts across all documentation for v1.3.7"
```

---

## Task 18: Release v1.3.7

**Files:**
- Modify: `VERSION`
- Modify: `package.json`

- [ ] **Step 1: Bump VERSION**

```bash
echo "1.3.7" > VERSION
```

- [ ] **Step 2: Bump package.json**

Update `"version": "1.3.6"` to `"version": "1.3.7"` in package.json.

- [ ] **Step 3: Run superkit-integrity verification**

```bash
bash packages/core/hooks/superkit-counts-verify.sh
```

Verify: exit code 0, no mismatches. If mismatches found — fix before proceeding.

- [ ] **Step 4: Run full CLAUDE.md checklist**

Manually verify:
- [ ] Agent count in README matches `ls packages/core/agents/*.md | wc -l` + stack + extras
- [ ] Codex skill count matches `find packages/codex/skills -name "SKILL.md" | wc -l`
- [ ] Hook count matches actual
- [ ] Rule count matches actual
- [ ] VERSION matches package.json
- [ ] GitHub description counts match actual

- [ ] **Step 5: Final commit**

```bash
git add VERSION package.json
git commit -m "release: v1.3.7 — Go Deep Dive"
```

- [ ] **Step 6: Push and create release**

```bash
git push origin main
```

```bash
gh release create v1.3.7 --title "v1.3.7 — Go Deep Dive" --notes "$(cat <<'EOF'
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
- **go-reviewer** — expanded 12→20 point checklist, operating modes, persona
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
- EVALUATIONS.md framework for measuring agent effectiveness
- 19 Go reference documents for on-demand deep knowledge loading

## Ecosystem
- Recommended [cc-skills-golang](https://github.com/samber/cc-skills-golang) as companion

---

**Counts:** 36 agents (+5) | 14 commands (+1) | 25 hooks (+4) | 54 skills (+6) | 11 rules (+2) | 19 reference docs (new)
EOF
)"
```

---

## Parallelization Map

Tasks that can run in parallel (no dependencies between them):

```
Parallel Group A (infrastructure):
  Task 1 (stack reviewer modes)
  Task 2 (EVALUATIONS.md)

Parallel Group B (new Go agents — all independent):
  Task 4 (go-error-reviewer)
  Task 5 (go-concurrency-reviewer)
  Task 6 (go-performance-reviewer)
  Task 7 (go-modernizer)
  Task 8 (go-observability-reviewer)

Parallel Group C (hooks + rules + command — all independent):
  Task 9 (4 new hooks)
  Task 10 (2 new rules)
  Task 11 (/benchmark command)

Parallel Group D (enhancements — all independent):
  Task 12 (enhance 6 core agents)
  Task 13 (19 reference docs)
  Task 14 (security-patterns.sh hook)
  Task 15 (README ecosystem)

Sequential (must wait for all above):
  Task 3 (go-reviewer expansion — after Task 1 for modes, before Task 16 for counts)
  Task 16 (Tier 1 docs — after all content created)
  Task 17 (Tier 2 docs — after Task 16)
  Task 18 (release — last)
```

**Recommended execution order:**
1. Groups A + B + C + D in parallel (Tasks 1-2, 4-15)
2. Task 3 (go-reviewer expansion)
3. Task 16 (Tier 1 docs)
4. Task 17 (Tier 2 docs)
5. Task 18 (release)
