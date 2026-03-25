# Enhanced Claude Code System v2 — Design Spec

## Overview

Системная реорганизация Claude Code setup: hooks (7), agents (10), rules (5), hook profiles (3). Цель — максимальное качество кода при минимальном замедлении workflow.

## Hooks (7)

### 1. block-dangerous-git (PreToolUse → Bash)
Блокирует: `--no-verify`, `--force`, `reset --hard`, `push.*main`, `branch -D`.
Скрипт: `.claude/scripts/hooks/block-dangerous-git.sh`

### 2. typecheck-on-edit (PostToolUse → Edit/Write)
Запускает `npx tsc --noEmit` после edit `.ts/.tsx` файлов в `frontend/` или `adminpanel/frontend/`.
Скрипт: `.claude/scripts/hooks/typecheck-on-edit.sh`
Profile: standard, strict

### 3. go-vet-on-edit (PostToolUse → Edit/Write)
Запускает `go vet ./...` после edit `.go` файлов в `backend/`.
Скрипт: `.claude/scripts/hooks/go-vet-on-edit.sh`
Profile: strict only

### 4. console-log-warning (PostToolUse → Edit/Write)
Предупреждает если в `.ts/.tsx` добавлен `console.log`.
Скрипт: `.claude/scripts/hooks/console-log-warning.sh`
Profile: fast, standard, strict

### 5. format-on-edit (PostToolUse → Edit/Write)
Запускает `gofmt -w` для Go файлов после edit.
Скрипт: `.claude/scripts/hooks/format-on-edit.sh`
Profile: standard, strict

### 6. pre-compact-save (PreCompact)
Сохраняет текущий контекст в `~/.config/tgapp/claude-code/last-context.md`.
Скрипт: `.claude/scripts/hooks/pre-compact-save.sh`
Profile: fast, standard, strict

### 7. session-context-restore (SessionStart)
Подгружает последний контекст из `~/.config/tgapp/claude-code/last-context.md`.
Скрипт: `.claude/scripts/hooks/session-context-restore.sh`
Profile: fast, standard, strict

## Hook Profiles

Env var: `CLAUDE_HOOK_PROFILE` (default: `standard`)

| Hook | fast | standard | strict |
|------|------|----------|--------|
| block-dangerous-git | yes | yes | yes |
| console-log-warning | yes | yes | yes |
| pre-compact-save | yes | yes | yes |
| session-context-restore | yes | yes | yes |
| typecheck-on-edit | no | yes | yes |
| format-on-edit | no | yes | yes |
| go-vet-on-edit | no | no | yes |

## Agents (10)

Все в `.claude/agents/`. Markdown файлы с project-specific knowledge.

### Quality Gates
1. **go-reviewer** — Go code review: pgx repos, chi handlers, errors.Is(), Attach*() DI, error wrapping, interface-based repos, context.Context first param
2. **ts-reviewer** — TS/React review: TanStack Query patterns, Zustand store, requestJSON<T>(), ONYX components, motion/react v12 (NOT framer-motion)
3. **migration-reviewer** — SQL migration review: 000NNN naming, down-миграция обязательна, индексы, constraints, rollback safety, pgx compatibility
4. **onyx-ui-reviewer** — ONYX Liquid Glass UI review: #060609 bg, #6A5CFF violet, glass components, z-index layers, iOS 26 glassmorphism, safe area, animations

### Discovery & Content
5. **events-discovery** — Поиск событий/мест через Yandex Places MCP + web search. Категории: рестораны для свиданий, бары, мероприятия, выставки, концерты. Фильтр по городу.
6. **content-curator** — Курирование контента: промо-уведомления, сезонные события, "лучшие места для свидания в [город]"

### DevOps & Safety
7. **pre-deploy-validator** — Pre-deploy checklist: typecheck (frontend + admin), go vet, lint (Go + TS), тесты (Go), миграции (up/down consistency), OpenAPI spec sync, bundle size check
8. **security-scanner** — Security audit: SQL injection (pgx queries), XSS (React dangerouslySetInnerHTML), secrets in code (.env, API keys), CORS config, auth bypass, OWASP top-10

### Productivity
9. **api-contract-sync** — OpenAPI spec vs handlers sync: undocumented endpoints, DTO mismatches, missing error codes, response schema drift
10. **test-generator** — Go test generation: table-driven tests, handler tests with httptest, service tests with mock repos, pgx mock patterns

## Rules (5)

Все в `.claude/rules/`. Markdown с frontmatter `alwaysApply: true`.

1. **coding-style.md** — Go: gofmt, error wrapping fmt.Errorf("context: %w", err), interface DI, Ready() nil-safety. TS: strict mode, Zod validation, type-first.
2. **security.md** — Parameterized SQL (pgx), no string concat in queries, no dangerouslySetInnerHTML, no secrets in code, validate at boundaries.
3. **testing.md** — Go: table-driven, httptest for handlers, mock interfaces. When tests required: new endpoints, bug fixes, business logic changes.
4. **git-workflow.md** — Conventional commits (feat/fix/docs/refactor/chore), no --no-verify, no force push to main, Co-Authored-By trailer, PR format.
5. **search-first.md** — Before writing new utility code: check codebase for existing patterns, check npm/go modules for packages, check MCP tools.

## File Structure

```
.claude/
  settings.json              # Updated: hooks config
  agents/                    # NEW
    go-reviewer.md
    ts-reviewer.md
    migration-reviewer.md
    onyx-ui-reviewer.md
    events-discovery.md
    content-curator.md
    pre-deploy-validator.md
    security-scanner.md
    api-contract-sync.md
    test-generator.md
  rules/                     # NEW
    coding-style.md
    security.md
    testing.md
    git-workflow.md
    search-first.md
  scripts/
    hooks/                   # NEW
      block-dangerous-git.sh
      typecheck-on-edit.sh
      go-vet-on-edit.sh
      console-log-warning.sh
      format-on-edit.sh
      pre-compact-save.sh
      session-context-restore.sh
    start.sh                 # Existing
    stop.sh                  # Existing
    stop-docker.sh           # Existing
```
