# SocialApp — Social Discovery Platform

> **HARD RULE — Documentation-on-change**: после ЛЮБОГО изменения кода, затрагивающего логику, поведение, API или архитектуру, Claude ОБЯЗАН обновить все связанные docs (`docs/architecture/`, `CLAUDE.md`, `docs/trees/`, README) **в том же ответе**, что и код. НЕ ждать отдельного запроса. См. полный чеклист в секции [Mandatory Documentation Updates](#mandatory-documentation-updates).

Монорепо: social приложение для Telegram с админ-панелью, модерацией и аналитикой.

## Tech Stack

| Компонент | Стек |
|-----------|------|
| **Backend API** | Go 1.23, chi/v5, pgx/v5 (PostgreSQL 16), go-redis/v9, minio-go, zap |
| **Admin Frontend** | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 3.4, Radix UI, Recharts |
| **Admin Login** | Go, JWT + TOTP (AES-GCM), bcrypt, Telegram Widget auth |
| **User Frontend** | React 18.3, TypeScript 5.9, Vite 6.4 (SWC), Tailwind 4.1, motion/react v12 (LazyMotion), TanStack Query, Zustand, thumbhash, web-vitals, Lucide |
| **Bots** | Go, go-telegram-bot-api/v5 |
| **Infra** | Docker Compose: PostgreSQL 16, Redis 7, MinIO |

## Project Structure

> Full trees: `docs/trees/tree-monorepo.md`, `tree-backend.md`, `tree-frontend.md`, `tree-adminpanel.md`

```
backend/                    # Go API server (:8080)
  cmd/api/                  # Entry point
  internal/
    app/apiapp/             # App wiring, routes, middleware
    config/                 # Config loader (YAML + env)
    domain/                 # Domain models, enums, rules, texts
    services/               # Business logic (30+ services)
    repo/postgres/          # PostgreSQL repositories (41 repos)
    repo/redis/             # Redis repos (sessions, rate limiting)
    transport/http/         # Handlers, DTOs, errors, middleware
    infra/                  # Logger, S3, DB pool
    jobs/                   # Background jobs
  migrations/               # SQL migrations (000001..000048)
  docs/openapi.yaml         # OpenAPI 3.0.3 spec
adminpanel/
  frontend/                 # React admin dashboard (:5173)
  backend/login/            # Admin login service (:8082)
frontend/                   # User-facing mini app
  src/
    app/App.tsx             # Onboarding shell (~770 LOC), lazy loads MainAppScreen
    app/MainAppScreen.tsx   # Post-onboarding (~2900 LOC, lazy, ~20KB gzip)
    app/shared-styles.ts    # COLORS + cn utility
    app/flow/               # Onboarding state machine
    stores/navigation.ts    # Zustand navigation store
    pages/onboarding/       # 9 registration screens
    pages/main/             # Feed, Likes, Profile, MatchDetail, Events, Notifications, Settings
    api/                    # API clients (TanStack Query, IndexedDB persist)
    hooks/                  # useScreenTracking, useSafeAreaInset, useTabSwipeGesture, useSwipeBackGesture, useBoostStatus
    types/                  # domain.ts, moderation.ts
tgbots/
  bot_moderator/            # Internal moderation bot
  bot_support/              # User support bot
```

## Backend Architecture

**Layers**: Transport (handlers) → Services → Repositories

- **Handlers**: constructor-injected services, `(w, r)` signature, chi URL params, `httperrors.Write()`
- **Services**: domain errors (`ErrNotFound`, `ErrValidation`), interface-based repos, `context.Context` first param, `Attach*()` for optional deps
- **Repos**: raw SQL via pgx (no ORM), `Ready()` nil-safety, `fmt.Errorf("context: %w", err)` wrapping
- **Auth**: JWT + Redis sessions, single-device enforcement (`X-Device-Id`, `DEVICE_CONFLICT` → app close)
- **Authz**: `ADMIN_AUTHZ_MODE=dual|permission_only`, RequireAdminRoleOrPermission middleware
- **Errors**: `errors.Is()` pattern matching in handlers → HTTP status codes
- **Moderation**: snapshot-backed workflow — draft-first writes (`profile_drafts`, `draft_media`), immutable snapshots (`moderation_snapshots`), states: `PENDING`, `APPROVED`, `REJECTED`, `PENDING_UPDATE`, `REJECTED_UPDATE`. **Field-level moderation** (migration 000048): per-field approve/reject via `field_decisions` JSONB + `changed_fields` TEXT[]
- **Photo storage**: two-tier — display (processed crop) + original (raw upload); moderation overlay; `cleanupRawOriginalRetention()` auto-cleanup

## User Frontend Architecture

- **Дизайн**: custom glass design system — dark bg, violet accent, iOS 26 glassmorphism
- **Навигация**: state-based (`currentScreen`), без React Router. Zustand store + `useOnboardingFlow` hook
- **Code splitting**: App.tsx (onboarding shell) → lazy `MainAppScreen.tsx` (preloaded at step 5)
- **Онбординг**: 9 шагов (Start → Privacy → Location → Photos → PersonalData → Questionnaire → Preferences → Verification → ModerationWait → MainApp)
- **Экраны**: Feed (свайпы), Likes (лайки/матчи), Profile (подписки), MatchDetail, Events, Notifications (inbox), Settings (7 подэкранов)
- **Data**: TanStack Query + IndexedDB persistence (staleTime=30s, gcTime=24h). Все экраны на live API
- **UX**: ThumbHash image placeholders, haptic feedback, tab swipe (edge-only on Feed), photo crop modal, dual-file upload, multi-account isolation (`user-guard.ts`), ErrorBoundary
- **Analytics**: batched event collector (`analytics.ts`) + `useScreenTracking` + web-vitals (LCP/CLS/INP/TTFB)
- **Telegram SDK**: fullscreen + portrait lock, BackButton, `window.__SOCIALAPP_RUNTIME_CONFIG__`
- **Dev toggle**: `VITE_DEV_START_SCREEN=main_app` + `npm run dev:main`

### Ключевые типы (types/domain.ts)

- `UserGoal` = `"friendship" | "dates" | "casual" | "longterm" | "relationship" | "chat" | "networking"`
- `UserProfile` = `{ name, photos[], age?, goal?, bio?, city?, birthday?, height?, eyes?, occupation?, verified? }`
- `MatchCard` = `{ id, name, age, photos[], bio, city, occupation, ...optional }`
- `ModerationStatusDto` = `{ status: "PENDING"|"APPROVED"|"REJECTED"|"PENDING_UPDATE"|"REJECTED_UPDATE", eta_bucket, reason_text?, has_pending_item }`

## Admin Frontend Architecture

- **Live-only mode**: все страницы на live API (mock-слои удалены). SystemV2 сохраняет mock (test/future page)
- **Routing**: state-based (`activePage`), `ProtectedRoute` + `pagePermissions`
- **Types**: `Admin{Feature}{Action}Request/Response`, type unions для enums
- **HTTP client**: generic `requestJSON<T>()` с `ApiRequestError` class

## Backend User-Facing API

> Full reference (67 endpoints): `docs/architecture/backend-api-reference.md`

Key onboarding endpoints: `POST /auth/telegram` (initData → JWT), `GET /v1/me`, `POST /v1/location`, `POST /v1/media/upload` (dual-file, max 32 MiB), `POST /v1/profile/core`, `POST /v1/preferences`, `GET /v1/moderation/status`, `POST /v1/profile/phone` (E.164, mandatory).

Other: `GET/POST /v1/notifications/*`, `GET/POST /v1/travel`, `POST /v1/geocode`, `POST /v1/events`.

Validation: `profile/core` — `birthdate=YYYY-MM-DD`, `age>=18`, `gender in {male,female}`, `goals[]` (7 values), optional `looking_for`, `details{}`. `preferences` — `radius_km 1..100`, `age_min/age_max 18..60`.

### Ключевые backend файлы

- Handlers: `backend/internal/transport/http/handlers/{auth,profile,location,media,moderation,me,phone}_handler.go`
- Services: `backend/internal/services/{profiles,auth,geo,media}/service.go`
- Repos: `backend/internal/repo/postgres/{profile,user_private}_repo.go`
- Routes/MW: `backend/internal/app/apiapp/{routes,middleware}.go`

## Key Commands

```bash
# Backend
cd backend && make run-api        # API server
cd backend && make test           # Go tests
cd backend && make fmt && make lint  # Format + lint
cd backend && make migrate-up     # Apply migrations (golang-migrate)
cd backend && make migrate-down   # Rollback

# Admin Frontend
cd adminpanel/frontend && npm run dev      # Dev (:5173)
cd adminpanel/frontend && npm run build    # Build
cd adminpanel/frontend && npm run test:e2e # Playwright

# User Frontend
cd frontend && npm run dev         # Dev (onboarding)
cd frontend && npm run dev:main    # Dev (skip to MainApp)
cd frontend && npm run build       # Build
cd frontend && npm run verify      # typecheck + lint + build

# Infra
cd backend && docker compose -f docker/docker-compose.yml up -d
bash .codex/skills/run-admin/scripts/run_admin.sh   # Full stack
bash .codex/skills/stop-admin/scripts/stop_admin.sh  # Stop all
```

## Migrations

Format: `backend/migrations/000NNN_description.{up,down}.sql`
Commands: `make migrate-up` / `make migrate-down` (via `backend/scripts/migrate.sh`, golang-migrate)
Current: `000001..000048` (key: 000025_user_settings, 000026_entitlements, 000027_soft_delete, 000028-029_notifications, 000030_travel, 000034_thumbhash, 000035-037_analytics, 000038-040_privacy+blocked+phone, 000041_moderation_snapshots, 000042-043_photo_originals+overlay, 000044_tg_name, 000045_profile_details, 000046_media_originals, 000047_comments, 000048_field_moderation)

## Conventions

- Go: `gofmt`, errors wrap с контекстом, interface-based DI
- **Go run запрещён в скриптах**: всегда `go build -o bin/name ./cmd/name && bin/name`
- TypeScript: strict mode, Zod validation, type-first API contracts
- Commits: conventional commits (`feat/fix/docs/refactor/chore`)
- API: REST JSON, Bearer JWT auth для admin
- Env: `.env` / `.env.example` в каждом сервисе, `VITE_*` для frontend

## Claude Code Hooks & Agents

### Hooks (11)
| Hook | Event | Profile | Description |
|------|-------|---------|-------------|
| block-dangerous-git | PreToolUse(Bash) | fast,standard,strict | Blocks --no-verify, --force, reset --hard, branch -D |
| typecheck-on-edit | PostToolUse(Edit/Write) | standard,strict | tsc --noEmit with SHA256 hash-cache after .ts/.tsx edits |
| go-vet-on-edit | PostToolUse(Edit/Write) | strict only | go vet after .go edits |
| console-log-warning | PostToolUse(Edit/Write) | fast,standard,strict | Warns on console.log in .ts/.tsx |
| format-on-edit | PostToolUse(Edit/Write) | standard,strict | gofmt -w after .go edits |
| migration-safety | PostToolUse(Edit/Write) | standard,strict | Validates SQL migration naming, matching down.sql, non-empty content |
| bundle-import-check | PostToolUse(Edit/Write) | standard,strict | Warns when new imports reference packages not in package.json |
| user-prompt-context | UserPromptSubmit | standard,strict | Auto-injects git context into every prompt |
| stop-verification | Stop | standard,strict | Auto-verifies compile + docs before session end |
| pre-compact-save | PreCompact | fast,standard,strict | Saves context before compaction |
| session-context-restore | SessionStart | fast,standard,strict | Restores context on new session |

Profile: `CLAUDE_HOOK_PROFILE=fast|standard|strict` (default: standard)

### Agents (21)

| Agent | Category | Model | Status | Описание |
|-------|----------|-------|--------|----------|
| go-reviewer | Quality | sonnet | **active** | Go code review: layers, DI, error handling, SQL safety |
| ts-reviewer | Quality | sonnet | **active** | TypeScript/React review: motion/react, TanStack Query, design system |
| migration-reviewer | Quality | sonnet | **active** | SQL migration review: naming, rollback, constraints |
| onyx-ui-reviewer | Quality | sonnet | **active** | UI review: glass design system, glass components, z-index |
| bot-reviewer | Quality | sonnet | **active** | 22 checks: callbacks, state machines, goroutine safety, rate limits |
| pre-deploy-validator | DevOps | sonnet | **active** | 9-point pre-deploy checklist + security scan |
| security-scanner | DevOps | sonnet | **active** | 47 security checks: OWASP + social app + Telegram + photo |
| test-generator | Productivity | opus | **active** | Go table-driven tests + edge cases |
| playwright-test-generator | Productivity | opus | **active** | Playwright e2e tests для admin |
| api-contract-sync | Productivity | sonnet | **active** | OpenAPI spec ↔ routes.go sync |
| health-checker | Productivity | sonnet | **active** | 9-point project health dashboard (ex-/health command) |
| docs-checker | Productivity | sonnet | **active** | Docs freshness check vs recent code changes (ex-/docs-check command) |
| scaffold-endpoint | Productivity | sonnet | **active** | Scaffold admin endpoint by project patterns (ex-/new-endpoint command) |
| debug-observer | Observability | sonnet | **active** | Debug: logs + DB + Redis + traces |
| dependency-checker | DevOps | sonnet | **active** | npm/Go dependency audit |
| audit-frontend | Audit | sonnet | **active** | 15 checks: hardcoded values, mock data, query keys, TypeScript |
| audit-backend | Audit | sonnet | **active** | 15 checks: SQL safety, error handling, PII leaks, auth gaps |
| audit-bots | Audit | sonnet | **active** | 12 checks: goroutine safety, rate limits, callback data |
| audit-security | Audit | sonnet | **active** | 12 checks: secrets, CORS, photo URLs, phone isolation |
| events-discovery | Discovery | sonnet | **experimental** | Yandex Places MCP |
| content-curator | Discovery | sonnet | **experimental** | Promo content, seasonal events |

### Rules (3)
`.claude/rules/`: coding-style (incl. testing + search-first), security, git-workflow

## Mandatory Agent Usage

> **HARD RULE**: Claude ОБЯЗАН использовать агентов (Agent tool) для задач, которые этого требуют.

### Когда ОБЯЗАТЕЛЬНО
1. **Исследование кодовой базы** — понять существующий код, найти зависимости, трассировать data flow
2. **Параллельные задачи** — 2+ независимых задач → несколько агентов в одном сообщении
3. **Многофайловые изменения** — 5+ файлов в одном компоненте
4. **Код-ревью** — после крупной фичи (`go-reviewer`/`ts-reviewer`)
5. **Планирование** — перед сложной фичей (Plan агент)
6. **Отладка** — глубокий анализ execution flow

### Когда НЕ нужны
- Простые правки в 1-3 файлах, точечный поиск, коммиты/пуши

### Масштаб → инструмент
- **1-3 файла** → Read, Edit, Grep
- **3-10 файлов** → 1 агент
- **10+ файлов** → несколько агентов
- **Full-stack** → Plan → implementation agents

## Active Plans

> Full archive of all 31 completed plans: [`docs/active-plans-archive.md`](docs/active-plans-archive.md)

Recent completed (last 5):
- **Multi-account isolation** — DONE (2026-03-19). `user-guard.ts` detects TG account switch, purges storage
- **Moderator bot lookup redesign** — DONE (2026-03-20). Russian UI, emoji sections, album media, expanded fields
- **Field-level moderation** — DONE (2026-03-23). Per-field approve/reject (name, bio, photo_0..2), migration 000048, bot toggle UX, admin API decide-field/approve-all/reject-all
- **Table comments** — DONE (2026-03-19). Migration 000047 adds COMMENT ON TABLE/COLUMN for all tables
- **Media raw originals (live table)** — DONE (2026-03-19). Migration 000046, S3 cleanup on delete

Active:
- **claude-code-superkit** — IN PROGRESS. Open-source extraction of .claude/ setup. Spec: `docs/superpowers/specs/2026-03-23-claude-code-superkit-design.md`. Plans: `docs/superpowers/plans/2026-03-23-superkit-*.md` (3 plans). GitHub: https://github.com/your-username/claude-code-superkit

## Known Constraints

1. Ads campaign API — contract-only, in-memory storage. Ads analytics live из `ad_revenue_facts`
2. System dashboard — overview metrics query real DB; alerts live (4 types); notifications stub (empty list)
3. User frontend: все экраны на live API; mock-данные сохранены как fallback
4. Модерация: draft-first → snapshot → модерация. Post-approval edits → `PENDING_UPDATE`. Публичный профиль = последний approved snapshot
5. Admin panel — **fully live-only**. SystemV2 и Roles/Access сохраняют mock (test/future). 13 analytics endpoints live через SQL views + прямые запросы

## Architecture Reference

Перед изменением любого компонента — прочитай соответствующий файл. Это контракты и инварианты, которые НЕЛЬЗЯ ломать.

### Backend
| Файл | Описание |
|------|----------|
| `docs/architecture/backend-layers.md` | Layers, DI, error handling, middleware, adding endpoints |
| `docs/architecture/backend-api-reference.md` | All 67 user-facing endpoints — method, path, auth, req/res, errors |
| `docs/architecture/database-schema.md` | Tables, constraints, indexes, SQL views, migrations 000001..000048 |
| `docs/architecture/auth-and-sessions.md` | JWT lifecycle, refresh, single-device, Redis sessions |
| `docs/architecture/moderation-pipeline.md` | draft→snapshot→PENDING→APPROVED/REJECTED, field-level moderation |
| `docs/architecture/photo-pipeline.md` | Upload→crop→S3→thumbhash→overlay→delete, two-tier storage |
| `docs/architecture/entitlements-and-store.md` | Credits, PLUS, Telegram Stars checkout |
| `docs/architecture/notification-system.md` | 6 types, dual delivery (in-app + bot) |
| `docs/architecture/feed-and-antiabuse.md` | Feed algorithm, anti-abuse (7 levels), swipe flow |

### Боты
| Файл | Описание |
|------|----------|
| `docs/architecture/bot-moderator.md` | State machine, inline UX, diff cards, approve/reject, field-level |
| `docs/architecture/bot-support.md` | Message routing, attachments, admin panel integration |

### Frontend
| Файл | Описание |
|------|----------|
| `docs/architecture/frontend-onboarding-flow.md` | 9 steps, validation, API, draft system, fast-path |
| `docs/architecture/frontend-state-contracts.md` | Screen tree, z-index, animations, Zustand, TanStack Query, cache |

### Деревья проекта
| Файл | Описание |
|------|----------|
| `docs/trees/tree-monorepo.md` | Полное дерево монорепо |
| `docs/trees/tree-backend.md` | Дерево backend (Go) |
| `docs/trees/tree-frontend.md` | Дерево user frontend (React) |
| `docs/trees/tree-adminpanel.md` | Дерево админ-панели |

## Docs Map

- `README_FULL.md` — полный обзор
- `README_SHORT.md` — быстрый старт
- `MEMORY.md` — ключевые решения
- `backend/README.md` — backend docs
- `backend/docs/openapi.yaml` — OpenAPI 3.0.3 spec
- `adminpanel/frontend/README.md` — admin frontend docs
- `adminpanel/backend/login/README.md` — login backend docs
- `docs/admin-live-cutover-runbook.md` — deployment checklist

## Mandatory Documentation Updates

**ОБЯЗАТЕЛЬНО** после **любых** изменений логики/API/архитектуры — обновить документацию **в том же ответе**, что и код. Касается и багфиксов, UX-правок, bot behavior — если логика описана в `docs/architecture/`, она должна быть обновлена.

### Чеклист:

1. **Architecture docs** (`docs/architecture/`) — обновить затронутые файлы (backend-layers, api-reference, database-schema, auth-and-sessions, moderation-pipeline, photo-pipeline, entitlements, notifications, feed, bot-moderator, bot-support, frontend-onboarding, frontend-state-contracts)
2. **CLAUDE.md** — обновить Active Plans, Project Structure, Known Constraints, счётчик миграций
3. **README файлы** — обновить все затронутые: README_FULL.md, README_SHORT.md, backend/README.md, frontend/README.md, adminpanel/frontend/README.md
4. **Project trees** (`docs/trees/`) — обновить при ЛЮБЫХ изменениях файловой структуры
5. **MEMORY.md** — добавить запись в Recent Completed
6. **OpenAPI spec** (`backend/docs/openapi.yaml`) — при изменениях API endpoints

### Правило: код без обновлённых docs = незавершённая задача. Делать В ТОМ ЖЕ ответе, что и код.
