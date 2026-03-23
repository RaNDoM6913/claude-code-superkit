---
name: project-architecture
description: TGApp project architecture reference — modules, layers, data flow, and key files
user-invocable: false
---

# TGApp Architecture Reference

## Current Scale
- Backend services: !`ls -d backend/internal/services/*/ 2>/dev/null | wc -l | tr -d ' '`
- Migrations: !`ls backend/migrations/*.up.sql 2>/dev/null | wc -l | tr -d ' '`
- Frontend components: !`find frontend/src -name '*.tsx' 2>/dev/null | wc -l | tr -d ' '`
- Admin pages: !`find adminpanel/frontend/src/pages -name '*.tsx' 2>/dev/null | wc -l | tr -d ' '`

## System Overview

```
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│  User App   │  │  Admin Panel │  │  Telegram     │
│  (React)    │  │  (React+TS)  │  │  Bots (Go)   │
└──────┬──────┘  └──────┬───────┘  └──────┬────────┘
       │                │                  │
       │         ┌──────┴───────┐          │
       │         │ Login Backend│          │
       │         │  (Go :8082)  │          │
       │         └──────┬───────┘          │
       │                │                  │
       ▼                ▼                  ▼
┌──────────────────────────────────────────────────┐
│              Backend API (Go :8080)               │
│  /v1/* (user)        /admin/* (admin panel)       │
│                      /admin/bot/* (bots)          │
├──────────────────────────────────────────────────┤
│  Transport Layer (chi handlers + middleware)       │
├──────────────────────────────────────────────────┤
│  Service Layer (business logic, 30+ services)     │
├──────────────────────────────────────────────────┤
│  Repository Layer (pgx + redis)                   │
└─────────┬──────────────┬──────────────┬──────────┘
          ▼              ▼              ▼
     PostgreSQL 16   Redis 7       MinIO (S3)
```

## Backend Module Map

### Services (`backend/internal/services/`)
| Service | Domain | Key File |
|---------|--------|----------|
| `authsvc` | User auth (JWT, sessions) | `services/auth/` |
| `adminaclsvc` | Admin access control (roles, permissions) | `services/adminacl/` |
| `adminsettingssvc` | Config Center (draft/validate/apply) | `services/adminsettings/` |
| `usersvc` | User profiles, search, ban | `services/user/` |
| `feedsvc` | Feed generation, swipes | `services/feed/` |
| `matchsvc` | Matching logic | `services/match/` |
| `mediasvc` | Photo upload/moderation | `services/media/` |
| `moderationsvc` | Content moderation | `services/moderation/` |
| `supportsvc` | Support tickets | `services/support/` |
| `analyticssvc` | Engagement/monetization metrics | `services/analytics/` |
| `adssvc` | Ad campaigns, revenue | `services/ads/` |
| `paymentsvc` | Payment processing | `services/payment/` |
| `eventsvc` | Event tracking | `services/events/` |

### Repositories (`backend/internal/repo/`)
- **postgres/** — 34+ repos for all persistent data
- **redis/** — sessions, rate limiting, risk data, anti-abuse cache

### Transport (`backend/internal/transport/http/`)
- **handlers/** — HTTP handlers (one file per domain)
- **middleware/** — auth, CORS, logging, rate limiting
- **errors/** — `APIError` struct, `Write()` helper
- **dto/** — request/response DTOs (if separated from handlers)

## Admin Frontend Module Map

### Pages (`adminpanel/frontend/src/pages/`)
| Page | Features |
|------|----------|
| LoginPage | Telegram auth → 2FA → Password |
| OverviewPage | KPI cards, growth/revenue trends, CSV export |
| UsersPage | User search, bulk ban, profiles, activity |
| ModerationPage | Unified inbox, support threads, case actions |
| EngagementPage | Match rate, retention, session duration |
| MonetizationPage | GMV, subscriptions, purchases, heatmaps |
| AdsPage | Campaign CRUD, revenue analytics |
| SystemPage | VPS health, services, bots |
| SystemPageV2 | Multi-server SLO, incident correlation |
| RolesAccessPage | Role CRUD, permission management |
| SettingsPage | Config Center (Payments, Security, Notifications) |

### API Layer (`adminpanel/frontend/src/lib/`)
Each API domain has 3 files:
- `{domain}ApiLive.ts` — real HTTP calls with `fetch`
- `{domain}ApiMock.ts` — deterministic mock data
- `{domain}ApiClient.ts` — factory with mode resolution and fallback

## Data Flow Examples

### Admin Login Flow
```
Browser → LoginPage → Telegram Widget → Login Backend (:8082)
  → Validate Telegram init_data
  → If first login: TOTP setup (QR + recovery codes) → Set password
  → If returning: Verify TOTP → Verify password
  → Issue JWT (sub=admin_user_id, sid=session_id)
  → Frontend stores token → Bearer auth to Backend (:8080)
  → Backend validates JWT, checks sid in admin_sessions
```

### Admin API Request Flow
```
Frontend → fetch(url, {Authorization: Bearer <jwt>})
  → AdminWebAuthMiddleware: validate JWT + check session
  → RequireAdminRoleOrPermission: check RBAC
  → Handler: parse request, call service
  → Service: business logic, call repos
  → Repo: SQL query via pgx
  → Response: service returns domain model → handler maps to DTO → JSON
```

## Key Configuration Files

| File | Purpose |
|------|---------|
| `backend/configs/config.yaml` | Backend configuration |
| `backend/.env.example` | Backend env vars reference |
| `adminpanel/frontend/.env.local` | Frontend env vars |
| `adminpanel/backend/login/.env.example` | Login backend env vars |
| `backend/docker/docker-compose.yml` | Docker infra |
