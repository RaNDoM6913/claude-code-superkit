# План #34 — GSD Innovations: plan-checker, goal-verifier, context-monitor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Внедрить 3 ключевые инновации из GSD (get-shit-done, 41K stars) — pre-execution plan validation, goal-backward verification, context usage monitoring. Добавить в superkit core + showcase + TGApp.

**Architecture:** 2 новых агента + 1 хук. Интегрируются в существующие `/dev` и `/review` команды.

**Tech Stack:** Markdown (agents), Bash/JS (hook), settings.json (wiring)

**Источник:** https://github.com/gsd-build/get-shit-done (MIT, Apache-2.0 agents)

---

## Зачем каждый компонент

### 1. plan-checker (agent)

**Проблема:** `/dev` Phase 2 создаёт план и сразу исполняет. Нет гейта "а план вообще полный?". Результат — переделки, пропущенные файлы, забытые миграции.

**Реальный пример из этой сессии:** План #32 содержал ошибку про PostGIS/Yandex Geocoder. Если бы plan-checker проверил "а где в коде используется геокодер?" — ошибка была бы поймана ДО написания плана.

**Решение:** Агент валидирует план по 8 измерениям перед исполнением. Блокирует плохие планы, возвращает на доработку.

### 2. goal-verifier (agent)

**Проблема:** Наши go-reviewer/ts-reviewer проверяют КОД (стиль, паттерны, безопасность). Никто не проверяет РЕЗУЛЬТАТ — реально ли фича работает. Стабы, хардкод, пустые ответы проходят code review.

**Реальный пример:** Endpoint может пройти go-reviewer (правильный error handling, DI, context propagation) но возвращать `[]` потому что query не тянет данные.

**Решение:** Агент проверяет результат по 4 уровням: exists → substantive → wired → data-flow. Дополняет (не заменяет) существующих ревьюеров.

### 3. context-monitor (hook)

**Проблема:** Контекст заполняется незаметно. Пользователь не видит сколько осталось. Когда контекст переполняется — Claude молча компрессирует, теряя ранний контекст. Результат — "забытые" решения, повторные вопросы, деградация качества.

**Реальный пример из этой сессии:** Пользователь спросил "сколько токенов осталось?" — а узнать невозможно. С хуком — видел бы индикатор на 75% и 90%.

**Решение:** PostToolUse хук показывает пороги 75% и 90% использования контекста.

---

## Task 1: Создать plan-checker agent

**Files:**
- Create: `packages/core/agents/plan-checker.md`
- Copy to: `packages/showcase/.claude/agents/plan-checker.md`

- [ ] **Step 1: Написать агент**

```markdown
---
name: plan-checker
description: Validates implementation plans before execution — checks requirement coverage, file paths, dependencies, scope, and feasibility
model: opus
allowed-tools: Read, Grep, Glob, Bash
---

# Plan Checker

Validates implementation plans BEFORE execution begins. Catches incomplete, incorrect, or infeasible plans early — when fixing is cheap.

## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` or `AGENTS.md` — project conventions, file structure, tech stack
2. `docs/architecture/` — existing architecture (verify plan references match reality)

**Use this context to:**
- Verify file paths in plan actually exist (or parent dirs exist for new files)
- Check that plan follows project conventions (naming, layers, patterns)
- Validate migration numbering against existing migrations

## When to Use

- **BEFORE Phase 3 (Implement) in /dev workflow** — mandatory gate
- After writing any implementation plan (superpowers writing-plans)
- When user asks to validate a plan
- Dispatched automatically by /dev orchestrator

## Validation Dimensions (8 checks)

### 1. Requirement Coverage (CRITICAL)
- Every stated goal has at least 1 task addressing it
- No requirements mentioned in description but missing from tasks
- Run: compare plan goals vs task list

### 2. File Path Accuracy (CRITICAL)
- Every file path in plan → verify parent directory exists:
  ```bash
  # For each "Create: path/to/file.go" in plan
  ls -d "$(dirname "path/to/file.go")" 2>/dev/null
  ```
- Every "Modify: path/to/file.go" → verify file actually exists:
  ```bash
  test -f "path/to/file.go" && echo "EXISTS" || echo "MISSING"
  ```
- Flag: plans referencing files that don't exist with "Modify"
- Flag: plans creating files in directories that don't exist

### 3. Dependency Order (HIGH)
- Tasks that create migrations should come before tasks that use new tables
- Tasks that create interfaces should come before tasks implementing them
- Tasks that modify API should come before tasks that consume the API
- Flag: circular dependencies, missing prerequisites

### 4. Scope Sanity (HIGH)
- Count total tasks — more than 15 in one plan? Suggest splitting
- Count files touched — more than 20? Suggest phasing
- Estimate complexity — each task should be 1-3 files, not 10+
- Flag: tasks that are too vague ("update frontend" — which files?)

### 5. Convention Compliance (MEDIUM)
- Migration naming: matches `000NNN_description.{up,down}.sql` pattern?
- Go files: match project layer conventions? (handler in transport, service in services, repo in repo)
- TypeScript: follows project component patterns?
- Commit messages: conventional format?

### 6. Documentation Completeness (MEDIUM)
- If API changed → plan includes doc update task?
- If migration added → plan includes CLAUDE.md counter update?
- If file structure changed → plan includes tree update?
- Apply 3-layer documentation enforcement rule

### 7. Test Coverage (MEDIUM)
- New endpoints → plan includes test tasks?
- Business logic changes → plan includes service tests?
- Bug fixes → plan includes regression test?
- Flag: plans with zero test tasks for non-trivial changes

### 8. Factual Accuracy (CRITICAL)
- Claims about existing code → verify by reading actual files
- "Currently X does Y" statements → grep to confirm
- Number claims (endpoint count, migration count) → verify
- **This is the most important check** — catches assumptions that become bugs

## Process

1. Read the plan file completely
2. Run each dimension check
3. For dimension 8 (factual accuracy): actually read referenced files and verify claims
4. Produce verdict

## Output Format

```markdown
## Plan Validation Report

### Verdict: PASS / REVISE / BLOCK

### Dimension Results
| # | Dimension | Status | Issues |
|---|-----------|--------|--------|
| 1 | Requirement Coverage | ✅ PASS | — |
| 2 | File Path Accuracy | ❌ FAIL | 2 files referenced don't exist |
| 3 | Dependency Order | ✅ PASS | — |
| 4 | Scope Sanity | ⚠️ WARN | 18 tasks, consider splitting |
| 5 | Convention Compliance | ✅ PASS | — |
| 6 | Documentation | ⚠️ WARN | Missing doc update for API change |
| 7 | Test Coverage | ✅ PASS | — |
| 8 | Factual Accuracy | ❌ FAIL | PostGIS claim incorrect |

### Issues Found

#### ❌ BLOCKING (must fix before execution)
1. [File Path] `backend/internal/services/geo/postgis.go` — plan says "Modify" but file doesn't exist
2. [Factual] Plan states "Yandex Geocoder used for feed distance" — INCORRECT, feed uses SQL formula in feed_repo.go:212

#### ⚠️ WARNING (should fix)
3. [Scope] 18 tasks in one plan — consider splitting into 2 phases
4. [Docs] API endpoint added but no doc update task

### Recommendation
REVISE — fix 2 blocking issues, then re-validate.
```

### Verdict Rules
- **PASS** — 0 blocking issues, ≤3 warnings → proceed to execution
- **REVISE** — 1+ blocking issues OR 4+ warnings → fix and re-check
- **BLOCK** — 3+ blocking issues → plan needs major rework
```

- [ ] **Step 2: Copy to showcase**
- [ ] **Step 3: Create Codex skill** (`packages/codex/skills/plan-checker/SKILL.md`)
- [ ] **Step 4: Commit**

---

## Task 2: Интегрировать plan-checker в /dev команду

**Files:**
- Modify: `packages/core/commands/dev.md` (добавить гейт между Phase 2 и Phase 3)
- Modify: `packages/showcase/.claude/commands/dev.md`

- [ ] **Step 1: Добавить Phase 2.5 в /dev**

После Phase 2 (Plan) и перед Phase 3 (Implement), вставить:

```markdown
## Phase 2.5 — Validate Plan

Dispatch **plan-checker** agent with the plan from Phase 2:

\```
Validate this implementation plan before execution.
Plan: [full plan text from Phase 2]
Project root: [working directory]
\```

**If PASS** → proceed to Phase 3.
**If REVISE** → fix blocking issues in the plan, re-run plan-checker. Max 2 iterations.
**If BLOCK** → stop and present issues to user for manual review.
```

- [ ] **Step 2: Copy to showcase dev.md**
- [ ] **Step 3: Commit**

---

## Task 3: Создать goal-verifier agent

**Files:**
- Create: `packages/core/agents/goal-verifier.md`
- Copy to: `packages/showcase/.claude/agents/goal-verifier.md`

- [ ] **Step 1: Написать агент**

```markdown
---
name: goal-verifier
description: Goal-backward verification — validates implementation results match stated goals using 4-level substantiation
model: opus
allowed-tools: Read, Grep, Glob, Bash
---

# Goal Verifier

Validates that implementation RESULTS match stated GOALS. Works backward from goals to code — not forward from tasks to checkmarks.

Complements code reviewers (go-reviewer, ts-reviewer) which check code quality. Goal verifier checks: **does it actually work?**

## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` or `AGENTS.md` — project conventions
2. The implementation plan/spec that was executed
3. `git log --oneline -10` — recent commits to understand what was built

## When to Use

- **After Phase 5 (Test) in /dev workflow** — before review
- After completing an implementation plan
- When user asks "does this actually work?"
- As part of `/review` pipeline for feature branches

## 4-Level Substantiation

For each stated goal/requirement, verify through 4 levels:

### Level 1: EXISTS
Does the artifact exist?
```bash
# Check file exists
test -f "path/to/handler.go" && echo "EXISTS" || echo "MISSING"

# Check function exists
grep -n "func HandleCreateUser" backend/internal/transport/http/handlers/
```

### Level 2: SUBSTANTIVE
Is it real implementation, not a stub?
```bash
# Check function has real logic (not just TODO/panic/empty)
grep -A 20 "func HandleCreateUser" handler.go | grep -E "TODO|panic|NotImplemented|pass"

# Check handler actually calls service
grep -A 30 "func HandleCreateUser" handler.go | grep "service\."

# Check component renders real content (not placeholder)
grep -A 10 "function FeedCard" FeedCard.tsx | grep -E "placeholder|lorem|TODO|fake"
```

### Level 3: WIRED
Is it properly connected to the system?
```bash
# Check route is registered
grep "HandleCreateUser\|/users" routes.go

# Check service is injected into handler constructor
grep "NewUserHandler" app/apiapp/

# Check component is imported and used
grep "FeedCard" App.tsx MainAppScreen.tsx

# Check migration is in sequence
ls backend/migrations/ | tail -5
```

### Level 4: DATA-FLOW
Does real data flow through? (not hardcoded)
```bash
# Check handler reads from request
grep -A 30 "func HandleCreateUser" handler.go | grep -E "r\.Body|json\.Decode|chi\.URLParam"

# Check service calls repo
grep -A 20 "func.*CreateUser" service.go | grep "repo\.\|s\.repo"

# Check repo executes real SQL
grep -A 20 "func.*CreateUser" repo.go | grep -E "INSERT|SELECT|pool\.|QueryRow"

# Check frontend calls real API
grep -A 10 "useQuery\|useMutation\|requestJSON" api/users.ts | grep -v "mock\|fake\|hardcoded"
```

## Process

1. Read the implementation plan/spec — extract all stated goals
2. For each goal, trace through 4 levels
3. Flag anything that fails at any level
4. Produce verification report

## Output Format

```markdown
## Goal Verification Report

### Overall: ✅ VERIFIED / ⚠️ PARTIAL / ❌ FAILED

### Goal-by-Goal Results

#### Goal 1: "Users can create profiles"
| Level | Status | Evidence |
|-------|--------|----------|
| EXISTS | ✅ | `profile_handler.go` exists, `CreateProfile` function found |
| SUBSTANTIVE | ✅ | Handler has 45 lines of real logic, calls service |
| WIRED | ✅ | Route registered: `POST /v1/profile/core` in routes.go:87 |
| DATA-FLOW | ✅ | Handler → service.Create → repo.Insert → SQL INSERT INTO profiles |

#### Goal 2: "Feed shows nearby users"
| Level | Status | Evidence |
|-------|--------|----------|
| EXISTS | ✅ | `feed_handler.go`, `feed_repo.go` exist |
| SUBSTANTIVE | ✅ | Real SQL with distance calculation |
| WIRED | ✅ | Route: `GET /v1/feed` in routes.go:92 |
| DATA-FLOW | ⚠️ | SQL uses `p.last_lat/lon` but 3 test profiles have NULL coordinates → feed returns empty for them |

### Summary
- 5/6 goals fully verified (all 4 levels)
- 1 goal partial (data-flow issue: NULL coordinates in test data)
- 0 goals failed

### Recommended Actions
1. Seed test profiles with coordinates for end-to-end testing
```

### Verdict Rules
- **VERIFIED** — all goals pass all 4 levels
- **PARTIAL** — some goals pass ≤3 levels, no critical failures
- **FAILED** — any goal fails at Level 1 (EXISTS) or Level 2 (SUBSTANTIVE)
```

- [ ] **Step 2: Copy to showcase**
- [ ] **Step 3: Create Codex skill**
- [ ] **Step 4: Commit**

---

## Task 4: Интегрировать goal-verifier в /dev и /review

**Files:**
- Modify: `packages/core/commands/dev.md` (добавить после Phase 5)
- Modify: `packages/core/commands/review.md` (добавить как optional reviewer)

- [ ] **Step 1: Добавить Phase 5.5 в /dev**

После Phase 5 (Test) и перед Phase 6 (Review):

```markdown
## Phase 5.5 — Verify Goals

Dispatch **goal-verifier** agent:

\```
Verify that the implementation matches the original goals.
Goals: [from Phase 2 plan]
Changed files: [from Phase 3 implementation]
\```

**If VERIFIED** → proceed to Phase 6 (Review).
**If PARTIAL** → fix data-flow issues, re-verify.
**If FAILED** → return to Phase 3 (Implement) — critical artifacts missing.
```

- [ ] **Step 2: Добавить в /review dispatch table**

В `review.md` Step 2, добавить:
```
| Any code files changed | **goal-verifier** (if implementation plan available) |
```

- [ ] **Step 3: Copy both commands to showcase**
- [ ] **Step 4: Commit**

---

## Task 5: Создать context-monitor hook

**Files:**
- Create: `packages/core/hooks/context-monitor.sh`
- Copy to: `packages/showcase/.claude/scripts/hooks/context-monitor.sh`
- Modify: `packages/core/settings.json` (add to PostToolUse)
- Modify: `packages/showcase/.claude/settings.json`

- [ ] **Step 1: Написать хук**

```bash
#!/bin/bash
# context-monitor.sh — monitors context window usage, warns at 75% and 90%
# Triggers on: PostToolUse (every tool call)
# Profile: fast, standard, strict (always active — context awareness is universal)

# Claude Code exposes context usage via environment variables
# CLAUDE_CONTEXT_TOKENS_USED and CLAUDE_CONTEXT_TOKENS_MAX
# If not available, we check the session transcript size as proxy

TOKENS_USED="${CLAUDE_CONTEXT_TOKENS_USED:-0}"
TOKENS_MAX="${CLAUDE_CONTEXT_TOKENS_MAX:-1000000}"

if [ "$TOKENS_USED" -eq 0 ]; then
  # Env vars not available — skip silently
  exit 0
fi

PERCENT=$(( TOKENS_USED * 100 / TOKENS_MAX ))

if [ "$PERCENT" -ge 90 ]; then
  echo ""
  echo "🔴 CONTEXT 90% — рекомендуется /compact или новая сессия"
  echo "   Использовано: ~${TOKENS_USED} / ${TOKENS_MAX} токенов"
  echo "   Качество ответов может деградировать. Сохраните важный контекст."
  echo ""
elif [ "$PERCENT" -ge 75 ]; then
  echo ""
  echo "🟡 CONTEXT 75% — контекстное окно заполняется"
  echo "   Использовано: ~${TOKENS_USED} / ${TOKENS_MAX} токенов"
  echo "   Планируйте завершение текущей задачи или /compact."
  echo ""
fi

exit 0
```

**Комментарии:**
- Пороги: **75%** (info — планируй завершение) и **90%** (warning — compact или новая сессия)
- Работает на ВСЕХ профилях (fast/standard/strict) — context awareness важна всегда
- Использует `CLAUDE_CONTEXT_TOKENS_USED` / `CLAUDE_CONTEXT_TOKENS_MAX` env vars
- Если env vars недоступны — молча пропускает (не ломает workflow)
- Сообщения на русском — согласовано с языком общения проекта

**ВАЖНО:** На момент написания плана неизвестно, предоставляет ли Claude Code эти env vars субагентам/хукам. Если нет — хук будет no-op до появления API. Альтернативный подход: считать размер `.claude/session-context.md` как прокси.

- [ ] **Step 2: Сделать executable**
```bash
chmod +x packages/core/hooks/context-monitor.sh
```

- [ ] **Step 3: Добавить в settings.json**

В PostToolUse hooks array (оба: core + showcase):
```json
{
  "type": "command",
  "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/context-monitor.sh"
}
```

- [ ] **Step 4: Copy to showcase**
- [ ] **Step 5: Commit**

---

## Task 6: Добавить всё в TGApp

**Files:**
- Copy: `plan-checker.md` → `.claude/agents/plan-checker.md`
- Copy: `goal-verifier.md` → `.claude/agents/goal-verifier.md`
- Copy: `context-monitor.sh` → `.claude/scripts/hooks/context-monitor.sh`
- Modify: `.claude/settings.json` (add context-monitor hook)
- Modify: `.claude/commands/dev.md` (add Phase 2.5 + 5.5)
- Modify: `.claude/commands/review.md` (add goal-verifier)
- Modify: `CLAUDE.md` (update agent count 27→29, hook count 13→14)

- [ ] **Step 1: Copy agents**
- [ ] **Step 2: Copy hook + chmod**
- [ ] **Step 3: Update settings.json**
- [ ] **Step 4: Update dev.md and review.md commands**
- [ ] **Step 5: Update CLAUDE.md** — agents 27→29, hooks 13→14
- [ ] **Step 6: Commit + push TGApp**

---

## Task 7: Обновить superkit docs и counts

**Files:**
- Modify: `README.md` — agent count, hook count, What's Inside table
- Modify: `CHANGELOG.md` — добавить записи
- Modify: `packages/codex/INSTALL.md` — новые skills
- Modify: `VERSION` — bump если нужно

- [ ] **Step 1: README** — Core Agents 20→22, hooks 9→10 core, badge 27→29
- [ ] **Step 2: CHANGELOG** — добавить plan-checker, goal-verifier, context-monitor
- [ ] **Step 3: Codex INSTALL** — 24→26 agent skills, total 36→38
- [ ] **Step 4: Commit + push superkit**

---

## Порядок выполнения

```
Task 1 (plan-checker agent)     ─┐
Task 3 (goal-verifier agent)     ├── параллельно (независимые файлы)
Task 5 (context-monitor hook)   ─┘
         │
Task 2 (integrate plan-checker в /dev)    ─┐
Task 4 (integrate goal-verifier в /dev+review) ├── после агентов готовы
         │                                     ─┘
Task 6 (sync to TGApp)          ← после superkit готов
         │
Task 7 (update docs + counts)   ← финал
```

## Итоговые числа после плана

| Компонент | До | После |
|-----------|-----|-------|
| Core agents | 20 | **22** (+plan-checker, +goal-verifier) |
| Total agents (showcase) | 27 | **29** |
| Core hooks | 9 | **10** (+context-monitor) |
| Codex skills | 36 | **38** |

## Оценка

| Task | Усилия | Приоритет |
|------|--------|-----------|
| 1. plan-checker agent | 3-4 часа | **HIGH** |
| 2. integrate в /dev | 1 час | **HIGH** |
| 3. goal-verifier agent | 3-4 часа | **HIGH** |
| 4. integrate в /dev+review | 1 час | **HIGH** |
| 5. context-monitor hook | 1-2 часа | **HIGH** |
| 6. sync to TGApp | 1 час | **HIGH** |
| 7. update docs | 1 час | **MANDATORY** |
| **Total** | **~12 часов** | |
