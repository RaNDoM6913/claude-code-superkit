# Enhanced Claude Code System v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Claude Code development harness with hooks (7), agents (10), rules (5), and hook profiles — maximizing code quality without slowing iteration speed.

**Architecture:** Shell-based hooks in `.claude/scripts/hooks/` configured via `settings.json`. Agents as markdown prompt files in `.claude/agents/`. Rules as markdown files in `.claude/rules/` with `alwaysApply: true` frontmatter. Hook profiles via `CLAUDE_HOOK_PROFILE` env var (fast/standard/strict).

**Tech Stack:** Bash hooks, jq for JSON parsing, Claude Code settings.json hooks API

**Spec:** `docs/superpowers/specs/2026-03-21-enhanced-claude-code-system-design.md`

---

## File Map

### New directories
- `.claude/agents/` — 10 agent markdown files
- `.claude/rules/` — 5 rule markdown files
- `.claude/scripts/hooks/` — 7 hook shell scripts

### Modified files
- `.claude/settings.json` — add hooks configuration

---

## Task 1: Hook Infrastructure — block-dangerous-git

**Files:**
- Create: `.claude/scripts/hooks/block-dangerous-git.sh`
- Modify: `.claude/settings.json`

- [ ] **Step 1: Create the hook script**

```bash
#!/bin/bash
# block-dangerous-git.sh — PreToolUse hook for Bash
# Blocks dangerous git commands: --no-verify, --force, reset --hard, push to main, branch -D

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Block --no-verify (skips pre-commit hooks)
if echo "$COMMAND" | grep -qE '\-\-no-verify'; then
  echo "BLOCKED: --no-verify is not allowed. Fix the underlying issue instead." >&2
  exit 2
fi

# Block force push
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*\-\-force|git\s+push\s+.*\-f\b'; then
  echo "BLOCKED: Force push is not allowed. Use --force-with-lease if absolutely necessary." >&2
  exit 2
fi

# Block direct push to main/master
if echo "$COMMAND" | grep -qE 'git\s+push\s+\S+\s+(main|master)\b'; then
  echo "BLOCKED: Direct push to main/master is not allowed. Use a PR." >&2
  exit 2
fi

# Block reset --hard
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  echo "BLOCKED: git reset --hard can destroy work. Use git stash or git reset --soft instead." >&2
  exit 2
fi

# Block branch -D (force delete)
if echo "$COMMAND" | grep -qE 'git\s+branch\s+-D'; then
  echo "BLOCKED: git branch -D force-deletes. Use -d for safe delete." >&2
  exit 2
fi

exit 0
```

- [ ] **Step 2: Make executable**

Run: `chmod +x .claude/scripts/hooks/block-dangerous-git.sh`

- [ ] **Step 3: Test the script manually**

Run: `echo '{"tool_input":{"command":"git push --force origin main"}}' | .claude/scripts/hooks/block-dangerous-git.sh; echo "exit: $?"`
Expected: stderr "BLOCKED: Force push is not allowed..." and exit code 2

Run: `echo '{"tool_input":{"command":"git add -A"}}' | .claude/scripts/hooks/block-dangerous-git.sh; echo "exit: $?"`
Expected: exit code 0

- [ ] **Step 4: Commit** (do NOT modify settings.json yet — all hook wiring deferred to Task 13)

```bash
git add .claude/scripts/hooks/block-dangerous-git.sh
git commit -m "feat(claude): add block-dangerous-git hook script

Blocks --no-verify, --force, reset --hard, push to main, branch -D.
Exit code 2 blocks the action with stderr message."
```

---

## Task 2: Hook — typecheck-on-edit

**Files:**
- Create: `.claude/scripts/hooks/typecheck-on-edit.sh`
- Modify: `.claude/settings.json`

- [ ] **Step 1: Create the hook script**

```bash
#!/bin/bash
# typecheck-on-edit.sh — PostToolUse hook for Edit/Write
# Runs tsc --noEmit after .ts/.tsx edits in frontend/ or adminpanel/frontend/
# Profile: standard, strict (skip on fast)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check TypeScript files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Determine which frontend
if [[ "$FILE_PATH" == *"frontend/src/"* && "$FILE_PATH" != *"adminpanel/"* ]]; then
  cd "$PROJECT_DIR/frontend" 2>/dev/null || exit 0
  RESULT=$(npx tsc --noEmit 2>&1)
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "TypeScript errors in frontend:" >&2
    echo "$RESULT" | head -20 >&2
    # Don't block (exit 0), just warn
  fi
elif [[ "$FILE_PATH" == *"adminpanel/frontend/src/"* ]]; then
  cd "${CLAUDE_PROJECT_DIR:-$(pwd)}/adminpanel/frontend" 2>/dev/null || exit 0
  RESULT=$(npx tsc --noEmit 2>&1)
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "TypeScript errors in adminpanel/frontend:" >&2
    echo "$RESULT" | head -20 >&2
  fi
fi

exit 0
```

- [ ] **Step 2: Make executable and test**

Run: `chmod +x .claude/scripts/hooks/typecheck-on-edit.sh`
Run: `echo '{"tool_input":{"file_path":"/Users/ivankudzin/cursor/tgapp/frontend/src/app/App.tsx"},"cwd":"/Users/ivankudzin/cursor/tgapp"}' | .claude/scripts/hooks/typecheck-on-edit.sh; echo "exit: $?"`
Expected: tsc runs, exit 0 (warnings on stderr if type errors exist)

- [ ] **Step 3: Commit** (do NOT modify settings.json yet — all hook wiring deferred to Task 13)

```bash
git add .claude/scripts/hooks/typecheck-on-edit.sh
git commit -m "feat(claude): add typecheck-on-edit hook script

Runs tsc --noEmit after .ts/.tsx file edits. Warns on stderr, does not block.
Respects CLAUDE_HOOK_PROFILE (skipped on fast)."
```

---

## Task 3: Hook — go-vet-on-edit

**Files:**
- Create: `.claude/scripts/hooks/go-vet-on-edit.sh`
- Modify: `.claude/settings.json`

- [ ] **Step 1: Create the hook script**

```bash
#!/bin/bash
# go-vet-on-edit.sh — PostToolUse hook for Edit/Write
# Runs go vet after .go file edits in backend/
# Profile: strict only

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" != "strict" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.go$ ]]; then
  exit 0
fi

if [[ ! "$FILE_PATH" == *"backend/"* ]]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}/backend" 2>/dev/null || exit 0

# Get the package path from the file
PKG_DIR=$(dirname "$FILE_PATH")
REL_PKG="./${PKG_DIR#*backend/}"

RESULT=$(go vet "$REL_PKG" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "go vet issues:" >&2
  echo "$RESULT" | head -15 >&2
fi

exit 0
```

- [ ] **Step 2: Make executable and test**

Run: `chmod +x .claude/scripts/hooks/go-vet-on-edit.sh`

Test strict profile (should run go vet):
```bash
CLAUDE_HOOK_PROFILE=strict echo '{"tool_input":{"file_path":"/Users/ivankudzin/cursor/tgapp/backend/internal/services/auth/service.go"},"cwd":"/Users/ivankudzin/cursor/tgapp"}' | .claude/scripts/hooks/go-vet-on-edit.sh 2>&1; echo "exit: $?"
```
Expected: exit 0 (with possible go vet output on stderr)

Test standard profile (should skip):
```bash
CLAUDE_HOOK_PROFILE=standard echo '{"tool_input":{"file_path":"test.go"},"cwd":"/tmp"}' | .claude/scripts/hooks/go-vet-on-edit.sh 2>&1; echo "exit: $?"
```
Expected: exit 0, no output

- [ ] **Step 3: Commit** (do NOT modify settings.json yet — all hook wiring deferred to Task 13)

```bash
git add .claude/scripts/hooks/go-vet-on-edit.sh
git commit -m "feat(claude): add go-vet-on-edit hook script

Runs go vet on edited Go package. Strict profile only."
```

---

## Task 4: Hook — console-log-warning

**Files:**
- Create: `.claude/scripts/hooks/console-log-warning.sh`

- [ ] **Step 1: Create the hook script**

```bash
#!/bin/bash
# console-log-warning.sh — PostToolUse hook for Edit/Write
# Warns if console.log is added to .ts/.tsx files
# Profile: fast, standard, strict (always on)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

# Check if the new content contains console.log
if echo "$NEW_STRING" | grep -qE 'console\.(log|debug|info)'; then
  echo "WARNING: console.log detected in $FILE_PATH — remember to remove before commit" >&2
fi

exit 0
```

- [ ] **Step 2: Make executable**

Run: `chmod +x .claude/scripts/hooks/console-log-warning.sh`

- [ ] **Step 3: Test the script**

```bash
echo '{"tool_input":{"file_path":"test.tsx","new_string":"console.log(x)"}}' | .claude/scripts/hooks/console-log-warning.sh 2>&1; echo "exit: $?"
```
Expected: stderr "WARNING: console.log detected in test.tsx", exit 0

```bash
echo '{"tool_input":{"file_path":"test.tsx","new_string":"const x = 1"}}' | .claude/scripts/hooks/console-log-warning.sh 2>&1; echo "exit: $?"
```
Expected: no output, exit 0

- [ ] **Step 4: Commit** (do NOT modify settings.json yet — all hook wiring deferred to Task 13)

```bash
git add .claude/scripts/hooks/console-log-warning.sh
git commit -m "feat(claude): add console-log-warning hook script

Warns on stderr when console.log/debug/info added to .ts/.tsx files."
```

---

## Task 5: Hook — format-on-edit

**Files:**
- Create: `.claude/scripts/hooks/format-on-edit.sh`

- [ ] **Step 1: Create the hook script**

```bash
#!/bin/bash
# format-on-edit.sh — PostToolUse hook for Edit/Write
# Runs gofmt -w on edited Go files
# Profile: standard, strict

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.go$ ]]; then
  exit 0
fi

if [ -f "$FILE_PATH" ]; then
  gofmt -w "$FILE_PATH" 2>/dev/null
fi

exit 0
```

- [ ] **Step 2: Make executable and test**

Run: `chmod +x .claude/scripts/hooks/format-on-edit.sh`

Test with a Go file:
```bash
echo '{"tool_input":{"file_path":"/Users/ivankudzin/cursor/tgapp/backend/internal/services/auth/service.go"}}' | .claude/scripts/hooks/format-on-edit.sh 2>&1; echo "exit: $?"
```
Expected: exit 0, gofmt runs silently

Test with non-Go file (should skip):
```bash
echo '{"tool_input":{"file_path":"test.tsx"}}' | .claude/scripts/hooks/format-on-edit.sh 2>&1; echo "exit: $?"
```
Expected: exit 0, no output

- [ ] **Step 3: Commit** (do NOT modify settings.json yet — all hook wiring deferred to Task 13)

```bash
git add .claude/scripts/hooks/format-on-edit.sh
git commit -m "feat(claude): add format-on-edit hook script

Runs gofmt -w on Go files after edit. Skipped on fast profile."
```

---

## Task 6: Hook — pre-compact-save

**Files:**
- Create: `.claude/scripts/hooks/pre-compact-save.sh`
- Modify: `.claude/settings.json`

- [ ] **Step 1: Create the hook script**

```bash
#!/bin/bash
# pre-compact-save.sh — PreCompact hook
# Saves current context summary before compaction
# Profile: always on

CONTEXT_DIR="$HOME/.config/tgapp/claude-code"
mkdir -p "$CONTEXT_DIR"

CONTEXT_FILE="$CONTEXT_DIR/last-context.md"

cat > "$CONTEXT_FILE" << CTXEOF
# Claude Code — Last Context (auto-saved before compaction)
**Saved at:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Working directory:** $(pwd)

## Git State
$(git branch --show-current 2>/dev/null || echo "not a git repo")
$(git log --oneline -5 2>/dev/null || echo "no commits")

## Modified Files
$(git diff --name-only 2>/dev/null || echo "none")

## Staged Files
$(git diff --cached --name-only 2>/dev/null || echo "none")
CTXEOF

echo "Context saved to $CONTEXT_FILE" >&2
exit 0
```

- [ ] **Step 2: Make executable**

Run: `chmod +x .claude/scripts/hooks/pre-compact-save.sh`

- [ ] **Step 3: Test the script**

```bash
cd /Users/ivankudzin/cursor/tgapp && bash .claude/scripts/hooks/pre-compact-save.sh 2>&1 && cat ~/.config/tgapp/claude-code/last-context.md | head -8
```
Expected: "Context saved..." on stderr, then file contents showing date, branch, recent commits.

- [ ] **Step 4: Commit** (do NOT modify settings.json yet — all hook wiring deferred to Task 13)

```bash
git add .claude/scripts/hooks/pre-compact-save.sh
git commit -m "feat(claude): add pre-compact-save hook script

Saves git state + modified/staged files to ~/.config/tgapp/claude-code/last-context.md before compaction."
```

---

## Task 7: Hook — session-context-restore

**Files:**
- Create: `.claude/scripts/hooks/session-context-restore.sh`
- Modify: `.claude/settings.json`

- [ ] **Step 1: Create the hook script**

```bash
#!/bin/bash
# session-context-restore.sh — SessionStart hook
# Restores last saved context at session start
# Output to stdout is injected into Claude's context

CONTEXT_FILE="$HOME/.config/tgapp/claude-code/last-context.md"

if [ -f "$CONTEXT_FILE" ]; then
  # Only show if saved within last 24 hours
  if [ "$(uname)" = "Darwin" ]; then
    FILE_AGE=$(( $(date +%s) - $(stat -f %m "$CONTEXT_FILE") ))
  else
    FILE_AGE=$(( $(date +%s) - $(stat -c %Y "$CONTEXT_FILE") ))
  fi

  if [ "$FILE_AGE" -lt 86400 ]; then
    echo "<previous-session-context>"
    cat "$CONTEXT_FILE"
    echo "</previous-session-context>"
  fi
fi

exit 0
```

- [ ] **Step 2: Make executable**

Run: `chmod +x .claude/scripts/hooks/session-context-restore.sh`

- [ ] **Step 3: Test the script** (requires pre-compact-save to have been run first)

```bash
bash .claude/scripts/hooks/session-context-restore.sh
```
Expected: stdout shows `<previous-session-context>` block with last saved context (if file exists and is <24h old). If no file, no output.

- [ ] **Step 4: Commit** (do NOT modify settings.json yet — all hook wiring deferred to Task 13)

```bash
git add .claude/scripts/hooks/session-context-restore.sh
git commit -m "feat(claude): add session-context-restore hook script

Injects previous session context (git state, modified files) into new sessions. Only shows context saved within last 24h."
```

---

## Task 8: Agents — Quality Gates (4 agents)

**Files:**
- Create: `.claude/agents/go-reviewer.md`
- Create: `.claude/agents/ts-reviewer.md`
- Create: `.claude/agents/migration-reviewer.md`
- Create: `.claude/agents/onyx-ui-reviewer.md`

- [ ] **Step 1: Create go-reviewer agent**

```markdown
---
name: go-reviewer
description: Review Go code against TGApp backend patterns and conventions
model: sonnet
allowed-tools: Read, Grep, Glob, Bash
---

# Go Code Reviewer — TGApp

You are a Go code reviewer with deep knowledge of the TGApp backend architecture.

## Architecture Rules

**Layers** (NEVER violate):
- Transport (handlers) → Services → Repositories
- Handlers MUST NOT import repo packages directly
- Services MUST NOT import transport packages
- Repos MUST NOT import service packages

**Handler patterns**:
- Constructor: `func NewXxxHandler(svc XxxServiceInterface) *XxxHandler`
- Signature: `func (h *XxxHandler) MethodName(w http.ResponseWriter, r *http.Request)`
- URL params: `chi.URLParam(r, "id")`
- Errors: `httperrors.Write(w, err)` — maps domain errors to HTTP status
- Auth: admin endpoints behind `AdminWebAuthMiddleware` + `RequireAdminRoleOrPermission`

**Service patterns**:
- Constructor DI: `func NewService(repo RepoInterface, ...) *Service`
- Optional deps: `func (s *Service) AttachNotifier(n NotifierInterface)`
- First param: `ctx context.Context`
- Domain errors: `ErrNotFound`, `ErrValidation`, `ErrConflict`, `ErrForbidden`
- NO raw SQL — delegate to repos

**Repository patterns**:
- Raw SQL via pgx (no ORM)
- `Ready()` method for nil-safety: `func (r *XxxRepo) Ready() bool { return r != nil && r.pool != nil }`
- Error wrapping: `fmt.Errorf("XxxRepo.MethodName: %w", err)`
- `pgx.ErrNoRows` → return domain `ErrNotFound`
- Parameterized queries only — NEVER `fmt.Sprintf` with user input in SQL

**Error handling**:
- Services: return domain errors
- Handlers: `errors.Is(err, services.ErrNotFound)` → `http.StatusNotFound`
- Repos: `fmt.Errorf("context: %w", err)` wrapping

## Review Checklist

For each file in the diff:

1. **Layer violations** — handler importing repo? service importing transport?
2. **Error handling** — errors wrapped with context? `errors.Is()` in handlers?
3. **SQL safety** — parameterized queries? no string concat?
4. **Context propagation** — `ctx` as first param?
5. **Nil safety** — `Ready()` check in repos?
6. **Auth** — admin endpoints protected?
7. **Naming** — Go conventions (MixedCaps, no underscores)?
8. **Tests** — new logic has test coverage?

## Output Format

```
## Go Review: [file or component]

### 🔴 Blocking
- file:line — description

### 🟡 Important
- file:line — description

### 🟢 Nit
- file:line — description
```
```

- [ ] **Step 2: Create ts-reviewer agent**

```markdown
---
name: ts-reviewer
description: Review TypeScript/React code against TGApp frontend patterns
model: sonnet
allowed-tools: Read, Grep, Glob, Bash
---

# TypeScript/React Reviewer — TGApp

You are a frontend code reviewer with deep knowledge of the TGApp user frontend (ONYX) and admin panel.

## User Frontend (ONYX) Patterns

**Stack**: React 18.3, TypeScript 5.9, Vite 6.4, Tailwind 4.1, motion/react v12 (NOT framer-motion!), Lucide icons
**Design**: ONYX Liquid Glass — `#060609` bg, `#6A5CFF` violet accent, iOS 26 glassmorphism

**State management**:
- Navigation: Zustand store (`src/stores/navigation.ts`)
- Data fetching: TanStack Query (`@tanstack/react-query`) with staleTime=30s, gcTime=24h
- Persistence: idb-keyval + `@tanstack/react-query-persist-client`
- NO prop drilling for navigation state — use Zustand store

**API layer** (`src/api/`):
- One file per domain: `feed.ts`, `likes.ts`, `profile.ts`, etc.
- Generic `requestJSON<T>()` via `http.ts`
- Query keys: centralized in `query-keys.ts`
- Auth: `getAuthHeaders()` from `auth.ts`

**Animation**: motion/react v12 LazyMotion — use `m.div` not `motion.div`
**Haptics**: `hapticImpact()` / `hapticNotification()` from `haptics.ts`
**Images**: ThumbHash placeholders, `ThumbHashImage` component

**Common mistakes to catch**:
- Using `framer-motion` imports (MUST use `motion/react`)
- Using `motion.div` instead of `m.div` (breaks LazyMotion tree-shaking)
- Missing `key` props in lists
- Direct `localStorage` access without going through Zustand/TanStack
- Hardcoded colors instead of COLORS constants from `shared-styles.ts`
- Missing safe area handling (use `useSafeAreaInset` hook)

## Admin Frontend Patterns

**Stack**: React 19, TypeScript 5.9, Vite 7, Tailwind 3.4, Radix UI, Recharts
**Mode**: Live-only (mock layers removed)
**API**: `requestJSON<T>()` via generic HTTP client

## Review Checklist

1. **Import correctness** — motion/react not framer-motion? Correct Lucide imports?
2. **Type safety** — strict types? No `any`? Zod validation at boundaries?
3. **TanStack Query** — correct query keys? staleTime appropriate? Mutations invalidate correctly?
4. **ONYX design** — correct colors? Glass components? z-index within spec?
5. **Performance** — unnecessary re-renders? Missing useMemo/useCallback? Large inline objects?
6. **Accessibility** — semantic HTML? aria labels? keyboard navigation?
7. **Telegram SDK** — safe area handled? BackButton wired? Haptics on interactions?

## Output Format

```
## TS/React Review: [file or component]

### 🔴 Blocking
- file:line — description

### 🟡 Important
- file:line — description

### 🟢 Nit
- file:line — description
```
```

- [ ] **Step 3: Create migration-reviewer agent**

```markdown
---
name: migration-reviewer
description: Review SQL migrations for safety, naming, and rollback
model: sonnet
allowed-tools: Read, Grep, Glob, Bash
---

# SQL Migration Reviewer — TGApp

You review SQL migrations for the TGApp PostgreSQL 16 database.

## Conventions

**Naming**: `backend/migrations/000NNN_description.{up,down}.sql`
- Current range: 000001..000046
- New migration: next available number (check `ls backend/migrations/ | tail -2`)
- Description: lowercase, underscores, descriptive

**Rules**:
1. Every `.up.sql` MUST have a matching `.down.sql`
2. Down migration MUST be the exact reverse of up
3. All DDL changes must be idempotent where possible (`IF NOT EXISTS`, `IF EXISTS`)
4. New tables MUST have `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
5. Foreign keys MUST have `ON DELETE` clause (CASCADE, SET NULL, or RESTRICT — explicit)
6. Indexes on frequently queried columns (user_id, created_at, status)
7. JSONB columns should have a comment explaining the schema
8. No `DROP TABLE` without confirmation — use soft delete or archive pattern
9. Column renames: add new → migrate data → drop old (across multiple migrations)

**pgx compatibility**:
- Use `$1, $2` placeholders (not `?`)
- TIMESTAMPTZ not TIMESTAMP (always timezone-aware)
- TEXT not VARCHAR (PostgreSQL best practice)
- BIGSERIAL for IDs, UUID where distributed

## Review Checklist

1. **Naming** — correct 000NNN format? Descriptive name?
2. **Down migration** — exists? Exact reverse?
3. **Indexes** — needed indexes present? No redundant indexes?
4. **Constraints** — FK with ON DELETE? NOT NULL where appropriate?
5. **Data safety** — destructive changes (DROP, ALTER TYPE) have data migration?
6. **Performance** — large table ALTERs use concurrent index? Lock considerations?
7. **Idempotency** — IF NOT EXISTS / IF EXISTS used?

## Output Format

```
## Migration Review: 000NNN_description

### Safety
- [PASS/FAIL] Down migration present and correct
- [PASS/FAIL] No data loss risk

### Quality
- [PASS/WARN] Index coverage
- [PASS/WARN] Constraint completeness
- [PASS/WARN] Naming conventions
```
```

- [ ] **Step 4: Create onyx-ui-reviewer agent**

```markdown
---
name: onyx-ui-reviewer
description: Review UI components against ONYX Liquid Glass design system
model: sonnet
allowed-tools: Read, Grep, Glob, Bash
---

# ONYX UI Reviewer — TGApp

You review frontend UI for compliance with the ONYX Liquid Glass design system.

## ONYX Design System

**Palette**:
- Background: `#060609` (obsidian-black)
- Violet accent: `#6A5CFF`
- Violet dim: `#6A5CFF` at 50-60% opacity
- Text primary: `#FFFFFF`
- Text secondary: `rgba(255,255,255,0.6)`
- Text tertiary: `rgba(255,255,255,0.35)`
- Glass border: `rgba(255,255,255,0.08)`
- Glass bg: `rgba(255,255,255,0.04)` to `rgba(255,255,255,0.08)`
- Success: `#34D399`
- Error: `#F87171`

**Glass components**:
- `.glass` — `backdrop-filter: blur(20px)`, border `rgba(255,255,255,0.08)`
- `.glass-prominent` — stronger blur, slightly more opaque
- Rounded corners: `rounded-2xl` (16px) for cards, `rounded-xl` (12px) for buttons

**Typography**:
- Font: system default (SF Pro on iOS)
- Headings: font-semibold or font-bold, text-white
- Body: font-normal, text-white/60
- Small: text-xs or text-sm, text-white/35

**Z-index layers** (from `frontend-state-contracts.md`):
- Base content: 0
- Tab bar: 50
- Bottom sheet: 100
- Modal/overlay: 200
- Toast: 300
- System (safe area): 400

**Animations** (motion/react v12):
- iOS push/pop: cubic-bezier(0.32,0.72,0,1), enter 0.42s, exit 0.32s
- Use `m.div` with LazyMotion, NOT `motion.div`
- `AnimatePresence mode="wait"` for screen transitions

**Layout**:
- Fullscreen: `min-h-screen` with safe area padding
- Bottom padding: `pb-4` (16px) on screens without bottom bar
- Safe area: `useSafeAreaInset()` hook, CSS vars `--tg-safe-area-inset-*`

## Review Checklist

1. **Colors** — using COLORS constants, not hardcoded hex? Correct opacity levels?
2. **Glass** — proper backdrop-filter? Correct border opacity?
3. **Typography** — consistent weight/opacity hierarchy?
4. **Z-index** — within spec layers? No arbitrary z-index values?
5. **Animations** — motion/react v12? m.div not motion.div? Correct easing?
6. **Layout** — safe area handled? Correct bottom padding?
7. **Dark mode** — everything assumes dark bg #060609? No light-mode artifacts?
8. **Responsive** — works on 320px-428px width range?

## Output Format

```
## ONYX UI Review: [component]

### 🔴 Design Violations
- file:line — description

### 🟡 Inconsistencies
- file:line — description

### 🟢 Suggestions
- description
```
```

- [ ] **Step 5: Commit all 4 agents**

```bash
git add .claude/agents/go-reviewer.md .claude/agents/ts-reviewer.md .claude/agents/migration-reviewer.md .claude/agents/onyx-ui-reviewer.md
git commit -m "feat(claude): add quality gate agents (go/ts/migration/onyx-ui reviewers)

4 specialized review agents with project-specific knowledge:
- go-reviewer: backend layers, pgx, chi, error handling
- ts-reviewer: TanStack Query, Zustand, motion/react, ONYX design
- migration-reviewer: SQL safety, naming, rollback, pgx compat
- onyx-ui-reviewer: Liquid Glass palette, z-index, animations"
```

---

## Task 9: Agents — Discovery & Content (2 agents)

**Files:**
- Create: `.claude/agents/events-discovery.md`
- Create: `.claude/agents/content-curator.md`

- [ ] **Step 1: Create events-discovery agent**

```markdown
---
name: events-discovery
description: Find events, venues, and date spots using Yandex Places MCP and web search
model: sonnet
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch, mcp__*
---

# Events Discovery Agent — TGApp

You find events, venues, and date-friendly places for the TGApp "Events" tab.

## Context

TGApp is a dating mini app for Telegram. The "Events" tab (currently placeholder at `frontend/src/pages/main/events.tsx`) will show curated places and events where users can meet in real life.

## Data Sources

1. **Yandex Places MCP** — use `mcp__yandex-places__*` tools for venue search by category and location
2. **Web Search** — search for upcoming events, concerts, exhibitions in target cities
3. **WebFetch** — fetch event details from discovered URLs

## Categories (priority order)

### For Dates
- Restaurants (romantic, quiet atmosphere)
- Coffee shops (casual first dates)
- Bars & wine bars (evening dates)
- Rooftop venues

### For Activities
- Exhibitions & museums
- Concerts & live music
- Theater & cinema
- Master classes & workshops
- Outdoor activities (parks, waterfronts)

### For Groups
- Food markets & festivals
- Speed dating events
- Social clubs & meetups

## Search Strategy

1. Accept city name (or coordinates) as input
2. Search Yandex Places for each priority category
3. Web search for "[city] events this week/month" + dating-relevant keywords
4. For each result, extract: name, address, category, rating, price range, description, photo URL, event dates (if applicable)

## Output Format

```json
{
  "city": "Минск",
  "date_generated": "2026-03-21",
  "venues": [
    {
      "name": "...",
      "category": "restaurant|bar|cafe|exhibition|concert|...",
      "address": "...",
      "rating": 4.5,
      "price_range": "$$",
      "description": "Short description why it's good for a date",
      "coordinates": { "lat": 0, "lon": 0 },
      "source": "yandex_places|web"
    }
  ],
  "events": [
    {
      "name": "...",
      "category": "...",
      "venue": "...",
      "date_start": "2026-03-22",
      "date_end": "2026-03-22",
      "description": "...",
      "url": "...",
      "source": "web"
    }
  ]
}
```

## Guidelines

- Focus on quality over quantity — 10-15 best venues, 5-10 upcoming events
- Prioritize places with good reviews (4.0+ rating)
- Include price range indicator ($, $$, $$$)
- Write descriptions in Russian
- Always verify venues still exist (not permanently closed)
```

- [ ] **Step 2: Create content-curator agent**

```markdown
---
name: content-curator
description: Curate promotional content, seasonal events, and dating recommendations
model: sonnet
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch
---

# Content Curator Agent — TGApp

You create and curate content for TGApp — promotional notifications, seasonal recommendations, and dating tips.

## Content Types

### 1. Promo Notifications
Short push-style messages for the notification system (max 150 chars).
Types: seasonal greetings, feature announcements, engagement nudges.

Backend: `POST /admin/v1/notifications/broadcast` (title + body + type=promo)
Reference: `backend/internal/domain/texts/texts.go` for existing notification templates

### 2. Seasonal Event Collections
Curated lists for the Events tab, themed around seasons/holidays:
- Valentine's Day, 8 March, New Year
- Summer outdoor activities
- Autumn cozy venues
- Winter entertainment

### 3. Dating Tips & Recommendations
Short articles/cards for in-app content:
- "5 лучших мест для первого свидания в [город]"
- "Как выбрать ресторан для свидания"
- "Необычные идеи для свидания зимой"

## Guidelines

- All content in Russian
- Tone: friendly, modern, not formal — match ONYX brand voice
- No clickbait or manipulative language
- Include specific venue/event names when possible
- Respect cultural context (Belarus/Russia target markets)

## Output Format

Structured JSON per content type, ready for API consumption.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/events-discovery.md .claude/agents/content-curator.md
git commit -m "feat(claude): add discovery & content agents

- events-discovery: Yandex Places MCP + web search for venues and events
- content-curator: promo notifications, seasonal content, dating recommendations"
```

---

## Task 10: Agents — DevOps & Safety (2 agents)

**Files:**
- Create: `.claude/agents/pre-deploy-validator.md`
- Create: `.claude/agents/security-scanner.md`

- [ ] **Step 1: Create pre-deploy-validator agent**

```markdown
---
name: pre-deploy-validator
description: Run full pre-deployment validation checklist
model: sonnet
allowed-tools: Bash, Read, Grep, Glob
---

# Pre-Deploy Validator — TGApp

Run comprehensive checks before deploying to production.

## Checklist

### 1. TypeScript Compilation
```bash
cd frontend && npx tsc --noEmit
cd adminpanel/frontend && npx tsc --noEmit
```
FAIL if any errors.

### 2. Go Vet
```bash
cd backend && go vet ./...
```
FAIL if any issues.

### 3. Linting
```bash
cd backend && make lint
cd frontend && npm run lint
cd adminpanel/frontend && npm run lint
```
FAIL if lint errors (warnings OK).

### 4. Go Tests
```bash
cd backend && make test
```
FAIL if any test fails.

### 5. Frontend Build
```bash
cd frontend && npm run build
cd adminpanel/frontend && npm run build
```
FAIL if build fails. WARN if bundle size > 200KB gzip (frontend) or > 500KB gzip (admin).

### 6. Migration Consistency
- Check that every `.up.sql` has a matching `.down.sql`
- Check migration numbering is sequential (no gaps, no duplicates)

### 7. OpenAPI Spec Sync
- Grep all route registrations in `backend/internal/app/apiapp/routes.go`
- Cross-reference against `backend/docs/openapi.yaml`
- WARN for undocumented endpoints

### 8. No Debug Artifacts
- Grep `console.log` in frontend source
- Grep `fmt.Print` in backend source (excluding tests)
- WARN for each occurrence

### 9. Environment Config
- Check `.env.project.example` has all referenced `VITE_*` vars
- Check no hardcoded `localhost` in production paths

## Output Format

```
## Pre-Deploy Validation Report
Date: YYYY-MM-DD

| Check | Status | Details |
|-------|--------|---------|
| TypeScript | PASS/FAIL | ... |
| Go Vet | PASS/FAIL | ... |
| ... | ... | ... |

### Blockers (must fix)
1. ...

### Warnings (should fix)
1. ...

**Verdict: READY / NOT READY for deploy**
```
```

- [ ] **Step 2: Create security-scanner agent**

```markdown
---
name: security-scanner
description: Scan codebase for security vulnerabilities (OWASP top-10)
model: sonnet
allowed-tools: Bash, Read, Grep, Glob
---

# Security Scanner — TGApp

Scan the TGApp codebase for common security vulnerabilities.

## Checks

### 1. SQL Injection (Critical)
Grep `fmt.Sprintf.*SELECT|fmt.Sprintf.*INSERT|fmt.Sprintf.*UPDATE|fmt.Sprintf.*DELETE` in `backend/internal/repo/`.
pgx parameterized queries use `$1, $2` — any string interpolation in SQL is a vulnerability.
Also check for raw string concat: `" + variable + "` in SQL strings.

### 2. XSS (Critical)
Grep `dangerouslySetInnerHTML` in `frontend/src/` and `adminpanel/frontend/src/`.
Each usage must be audited — input must be sanitized (DOMPurify or equivalent).

### 3. Secrets in Code (Critical)
Grep for patterns:
- API keys: `[A-Za-z0-9]{32,}` in string literals (filter out hashes/UUIDs)
- Passwords: `password\s*[:=]\s*["'][^"']+["']` (not in .env.example)
- Private keys: `-----BEGIN.*PRIVATE KEY-----`
- Telegram bot tokens: `[0-9]+:[A-Za-z0-9_-]{35}`

### 4. Auth Bypass (High)
- Check all `/v1/` routes in `routes.go` have auth middleware
- Known public: `/healthz`, `/auth/telegram`, `/auth/refresh`, `/v1/config`, `/media/object/*`
- Any other unprotected endpoint is a finding

### 5. CORS Misconfiguration (High)
Read CORS middleware config. Check:
- Not `Access-Control-Allow-Origin: *` in production
- Credentials mode consistent with origin policy

### 6. Rate Limiting (Medium)
Check rate limiting is configured for:
- Auth endpoints (login, refresh)
- Upload endpoints (media)
- Search/discovery endpoints

### 7. Input Validation (Medium)
Spot-check 3-5 handlers for:
- Request body size limits
- String length validation (bio, name, etc.)
- Numeric range validation (age, coordinates)

### 8. Sensitive Data Exposure (Medium)
Check API responses don't leak:
- Password hashes
- Internal IDs that should be opaque
- Other users' private data (phone, email)

### 9. Dependency Vulnerabilities (Low)
```bash
cd frontend && npm audit --production 2>/dev/null | tail -5
cd adminpanel/frontend && npm audit --production 2>/dev/null | tail -5
cd backend && go list -m -json all 2>/dev/null | head -50
```

## Output Format

```
## Security Scan Report
Date: YYYY-MM-DD

### 🔴 Critical
- [SQL-001] file:line — description

### 🟠 High
- [AUTH-001] file:line — description

### 🟡 Medium
- [RATE-001] file:line — description

### 🟢 Low / Informational
- [DEP-001] description

**Risk Summary: X critical, Y high, Z medium, W low**
```
```

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/pre-deploy-validator.md .claude/agents/security-scanner.md
git commit -m "feat(claude): add devops & safety agents

- pre-deploy-validator: 9-point deployment checklist
- security-scanner: OWASP top-10 vulnerability scanning"
```

---

## Task 11: Agents — Productivity (2 agents)

**Files:**
- Create: `.claude/agents/api-contract-sync.md`
- Create: `.claude/agents/test-generator.md`

- [ ] **Step 1: Create api-contract-sync agent**

```markdown
---
name: api-contract-sync
description: Verify OpenAPI spec matches actual handler implementations
model: sonnet
allowed-tools: Read, Grep, Glob, Bash
---

# API Contract Sync — TGApp

Verify that `backend/docs/openapi.yaml` matches actual route registrations and handler implementations.

## Process

### 1. Extract Registered Routes
Read `backend/internal/app/apiapp/routes.go` and extract all route registrations:
- Method (GET/POST/PUT/PATCH/DELETE)
- Path pattern
- Handler function
- Middleware chain

### 2. Extract OpenAPI Paths
Parse `backend/docs/openapi.yaml` and extract all documented paths with methods.

### 3. Cross-Reference

**Missing from OpenAPI** (routes exist but undocumented):
- List each route with method, path, handler name
- Severity: WARN (internal/admin), FAIL (public /v1/ endpoints)

**Missing from routes** (documented but not implemented):
- List each OpenAPI path
- Severity: FAIL (indicates stale docs)

### 4. DTO Consistency (spot-check)
For 5 random endpoints, compare:
- Go request struct JSON tags vs OpenAPI request schema properties
- Go response struct JSON tags vs OpenAPI response schema properties
- FAIL for mismatches

### 5. Error Codes
For endpoints with documented error responses (4xx), verify handler actually returns those codes.

## Output Format

```
## API Contract Sync Report

### Undocumented Routes (in code, not in OpenAPI)
| Method | Path | Handler | Severity |
|--------|------|---------|----------|
| ... | ... | ... | WARN/FAIL |

### Stale Documentation (in OpenAPI, not in code)
| Method | Path | Severity |
|--------|------|----------|
| ... | ... | FAIL |

### DTO Mismatches
| Endpoint | Field | Go Tag | OpenAPI | Severity |
|----------|-------|--------|---------|----------|
| ... | ... | ... | ... | FAIL |

**Sync Status: IN_SYNC / DRIFT (X issues)**
```
```

- [ ] **Step 2: Create test-generator agent**

```markdown
---
name: test-generator
description: Generate Go table-driven tests following TGApp patterns
model: opus
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Test Generator — TGApp

Generate Go tests following TGApp conventions and patterns.

## Test Patterns

### Handler Tests
```go
func TestXxxHandler_MethodName(t *testing.T) {
    tests := []struct {
        name       string
        method     string
        path       string
        body       string
        wantStatus int
        wantBody   string
    }{
        {
            name:       "success",
            method:     http.MethodPost,
            path:       "/v1/resource",
            body:       `{"field": "value"}`,
            wantStatus: http.StatusOK,
        },
        {
            name:       "invalid body",
            method:     http.MethodPost,
            path:       "/v1/resource",
            body:       `{invalid}`,
            wantStatus: http.StatusBadRequest,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
            req.Header.Set("Content-Type", "application/json")
            rec := httptest.NewRecorder()

            handler := NewXxxHandler(mockService)
            handler.MethodName(rec, req)

            if rec.Code != tt.wantStatus {
                t.Errorf("status = %d, want %d", rec.Code, tt.wantStatus)
            }
        })
    }
}
```

### Service Tests
```go
func TestService_MethodName(t *testing.T) {
    tests := []struct {
        name    string
        input   InputType
        setup   func(*MockRepo)
        want    OutputType
        wantErr error
    }{
        // ... table cases
    }
    // ...
}
```

## Instructions

When asked to generate tests:
1. Read the target file to understand the function signatures
2. Read existing tests in the same package for style consistency
3. Generate table-driven tests covering: happy path, validation errors, not found, conflict
4. Use `httptest` for handler tests
5. Mock interfaces, not concrete types
6. Test file: `xxx_test.go` in the same package
```

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/api-contract-sync.md .claude/agents/test-generator.md
git commit -m "feat(claude): add productivity agents

- api-contract-sync: OpenAPI spec vs handler implementation sync checker
- test-generator: Go table-driven test generation following project patterns"
```

---

## Task 12: Rules (5 files)

**Files:**
- Create: `.claude/rules/coding-style.md`
- Create: `.claude/rules/security.md`
- Create: `.claude/rules/testing.md`
- Create: `.claude/rules/git-workflow.md`
- Create: `.claude/rules/search-first.md`

- [ ] **Step 1: Create coding-style rule**

```markdown
---
alwaysApply: true
---

# Coding Style — TGApp

## Go
- Format: `gofmt` (enforced by format-on-edit hook)
- Error wrapping: `fmt.Errorf("ContextName.MethodName: %w", err)`
- Interface-based DI: constructors accept interfaces, not concrete types
- `Ready()` nil-safety on all repos
- `context.Context` as first parameter in service/repo methods
- No global state — everything injected via constructors

## TypeScript
- Strict mode always
- Zod validation at API boundaries
- Type-first: define types before implementation
- motion/react v12 — use `m.div`, never `motion.div`
- TanStack Query for all server state
- Zustand for client-only state (navigation, UI)

## Shared
- No magic numbers — use named constants
- No commented-out code — delete it (git has history)
- Prefer early returns over deep nesting
- Maximum function length: ~50 lines (split if larger)
```

- [ ] **Step 2: Create security rule**

```markdown
---
alwaysApply: true
---

# Security — TGApp

- **SQL**: Always parameterized queries (`$1, $2`). NEVER `fmt.Sprintf` with user input in SQL.
- **XSS**: No `dangerouslySetInnerHTML`. If absolutely needed, sanitize with DOMPurify.
- **Secrets**: No hardcoded tokens, passwords, or API keys in source code. Use env vars.
- **Auth**: All `/v1/` endpoints require auth middleware. Document exceptions explicitly.
- **Input validation**: Validate at system boundaries (handlers). Trust internal code.
- **File uploads**: Validate MIME type and size server-side. Max 32 MiB.
- **CORS**: Explicit origin allowlist, no wildcards in production.
```

- [ ] **Step 3: Create testing rule**

```markdown
---
alwaysApply: true
---

# Testing — TGApp

## When Tests Are Required
- New API endpoints (handler + service)
- Bug fixes (regression test proving the fix)
- Business logic changes in services
- Complex SQL queries

## When Tests Are Optional
- Pure UI components (covered by visual review)
- Configuration changes
- Documentation updates

## Go Test Patterns
- Table-driven tests with `t.Run(tt.name, ...)`
- `httptest.NewRequest` + `httptest.NewRecorder` for handlers
- Mock interfaces, not concrete types
- Test file: same package, `_test.go` suffix

## Frontend Tests
- Playwright e2e for critical user flows
- Run: `cd adminpanel/frontend && npm run test:e2e`
```

- [ ] **Step 4: Create git-workflow rule**

```markdown
---
alwaysApply: true
---

# Git Workflow — TGApp

- **Commits**: conventional format `type(scope): description`
  - Types: feat, fix, docs, refactor, chore, test, perf
  - Scope: backend, frontend, admin, bot, claude
- **No --no-verify**: Fix pre-commit hook issues, don't skip them
- **No force push to main**: Use PRs
- **No git reset --hard**: Use stash or soft reset
- **Branch naming**: `feature/description`, `fix/description`, `chore/description`
```

- [ ] **Step 5: Create search-first rule**

```markdown
---
alwaysApply: true
---

# Search First — TGApp

Before writing new utility code, check in this order:

1. **Codebase** — does a similar function/pattern already exist? Grep for it.
2. **Packages** — is there a well-maintained npm/Go module? Check before reimplementing.
3. **MCP tools** — can an MCP server handle this? (Yandex Places, Playwright, Context7)
4. **Skills** — does a project skill cover this? Check `.claude/skills/`.

Only build custom when nothing suitable exists. Thin wrappers over packages are preferred over reimplementation.
```

- [ ] **Step 6: Commit all rules**

```bash
git add .claude/rules/
git commit -m "feat(claude): add modular rules (coding-style, security, testing, git-workflow, search-first)

5 always-applied rules extracted from CLAUDE.md conventions. Modular .md files with alwaysApply frontmatter."
```

---

## Task 13: Final settings.json Assembly

**Files:**
- Modify: `.claude/settings.json`

- [ ] **Step 1: Write the complete settings.json with all hooks**

The final `.claude/settings.json` should contain all hooks properly structured:

```json
{
  "permissions": {
    "allow": [
      "Bash",
      "Read",
      "Edit",
      "Write",
      "Glob",
      "Grep",
      "WebFetch",
      "WebSearch",
      "NotebookEdit",
      "Task",
      "TodoWrite"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/block-dangerous-git.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/typecheck-on-edit.sh"
          },
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/console-log-warning.sh"
          },
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/format-on-edit.sh"
          },
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/go-vet-on-edit.sh"
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/pre-compact-save.sh"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/session-context-restore.sh"
          }
        ]
      }
    ]
  },
  "enabledPlugins": {
    "code-simplifier@claude-plugins-official": true,
    "frontend-design@claude-plugins-official": true,
    "github@claude-plugins-official": true,
    "superpowers@claude-plugins-official": true,
    "code-review@claude-plugins-official": true,
    "context7@claude-plugins-official": true,
    "playwright@claude-plugins-official": true
  }
}
```

- [ ] **Step 2: Verify hooks load**

Run `/hooks` slash command inside Claude Code session (not bash) to see all configured hooks. Alternatively, validate JSON syntax:
```bash
python3 -c "import json; json.load(open('.claude/settings.json')); print('JSON valid')"
```

- [ ] **Step 3: Test each hook manually**

Test block-dangerous-git:
```bash
echo '{"tool_input":{"command":"git commit --no-verify -m test"}}' | .claude/scripts/hooks/block-dangerous-git.sh 2>&1; echo "exit: $?"
```

Test console-log-warning:
```bash
echo '{"tool_input":{"file_path":"test.tsx","new_string":"console.log(x)"}}' | .claude/scripts/hooks/console-log-warning.sh 2>&1; echo "exit: $?"
```

- [ ] **Step 4: Final commit**

```bash
git add .claude/settings.json
git commit -m "feat(claude): complete hooks configuration in settings.json

7 hooks: block-dangerous-git (PreToolUse), typecheck-on-edit + console-log-warning + format-on-edit + go-vet-on-edit (PostToolUse), pre-compact-save (PreCompact), session-context-restore (SessionStart).
Hook profiles via CLAUDE_HOOK_PROFILE env var (fast/standard/strict)."
```

---

## Task 14: Documentation Update

**Files:**
- Modify: `CLAUDE.md` — add Claude Code System section
- Modify: memory `MEMORY.md` — add entry

- [ ] **Step 1: Add Claude Code System section to CLAUDE.md**

Add after the "Conventions" section:

```markdown
## Claude Code Hooks & Agents

### Hooks (7)
| Hook | Event | Profile | Description |
|------|-------|---------|-------------|
| block-dangerous-git | PreToolUse(Bash) | fast,standard,strict | Blocks --no-verify, --force, reset --hard, push main |
| typecheck-on-edit | PostToolUse(Edit/Write) | standard,strict | tsc --noEmit after .ts/.tsx edits |
| go-vet-on-edit | PostToolUse(Edit/Write) | strict only | go vet after .go edits |
| console-log-warning | PostToolUse(Edit/Write) | fast,standard,strict | Warns on console.log in .ts/.tsx |
| format-on-edit | PostToolUse(Edit/Write) | standard,strict | gofmt -w after .go edits |
| pre-compact-save | PreCompact | fast,standard,strict | Saves context before compaction |
| session-context-restore | SessionStart | fast,standard,strict | Restores context on new session |

Profile: `CLAUDE_HOOK_PROFILE=fast|standard|strict` (default: standard)

### Agents (10)
Quality: go-reviewer, ts-reviewer, migration-reviewer, onyx-ui-reviewer
Discovery: events-discovery, content-curator
DevOps: pre-deploy-validator, security-scanner
Productivity: api-contract-sync, test-generator

### Rules (5)
`.claude/rules/`: coding-style, security, testing, git-workflow, search-first
```

- [ ] **Step 2: Update MEMORY.md**

Add to MEMORY.md under "## Claude Code Setup" section:
```markdown
- **Enhanced Claude Code System v2 (2026-03-21)** — [enhanced-claude-system.md](enhanced-claude-system.md) — 7 hooks, 10 agents, 5 rules, hook profiles
```

Create memory file `enhanced-claude-system.md` with:
```markdown
---
name: Enhanced Claude Code System v2
description: Hooks (7), agents (10), rules (5), hook profiles for quality gates and workflow automation
type: project
---

Enhanced Claude Code system deployed 2026-03-21.

**Hooks** (`.claude/scripts/hooks/`): block-dangerous-git, typecheck-on-edit, go-vet-on-edit, console-log-warning, format-on-edit, pre-compact-save, session-context-restore.
**Profiles**: CLAUDE_HOOK_PROFILE=fast|standard|strict (default: standard).
**Agents** (`.claude/agents/`): go-reviewer, ts-reviewer, migration-reviewer, onyx-ui-reviewer, events-discovery, content-curator, pre-deploy-validator, security-scanner, api-contract-sync, test-generator.
**Rules** (`.claude/rules/`): coding-style, security, testing, git-workflow, search-first.

**Why:** Quality gates via deterministic hooks (100% fire rate vs ~80% for prompt instructions). Specialized agents with project-specific knowledge. Modular rules separated from CLAUDE.md.

**How to apply:** Hooks run automatically. Agents invoked via Agent tool with matching subagent_type or by reading the agent file. Rules loaded automatically via alwaysApply frontmatter.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add Claude Code hooks, agents, and rules documentation to CLAUDE.md"
```
