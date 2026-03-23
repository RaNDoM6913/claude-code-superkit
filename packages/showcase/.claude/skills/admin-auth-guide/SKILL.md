---
name: admin-auth-guide
description: Admin authentication and authorization system reference — login flow, JWT, TOTP, sessions, RBAC
user-invocable: false
---

# Admin Auth & Authorization Guide

## Authentication Flow

### Step 1: Telegram Login
- User clicks "Login with Telegram" widget
- Frontend sends Telegram `init_data` to Login Backend (:8082)
- Login Backend validates hash signature against bot token
- Extracts `tg_id` from init_data

### Step 2: First-Time Setup
If admin user has no TOTP configured:
1. Generate TOTP secret (encrypted with AES-GCM, key from `LOGIN_TOTP_SECRET_KEY`)
2. Return QR code + recovery codes to frontend
3. User scans QR in authenticator app
4. User confirms with TOTP code
5. User sets initial password (bcrypt hashed)

### Step 3: Returning Login
1. Verify TOTP code (6-digit)
2. Verify password (bcrypt)
3. Issue JWT token

### Step 4: JWT Token
Claims:
```json
{
  "sub": "admin_user_uuid",
  "sid": "session_uuid",
  "role": "admin|superadmin|...",
  "exp": "...",
  "iat": "..."
}
```
- Signed with `LOGIN_JWT_SECRET` (must match `ADMIN_WEB_JWT_SECRET` in backend)
- Frontend stores in memory/localStorage

### Step 5: Session Management
- Server-side session in `admin_sessions` table
- Session has idle timeout (`ADMIN_WEB_SESSION_IDLE_TIMEOUT`, default 30m)
- Session has max lifetime (`LOGIN_SESSION_MAX_LIFETIME`, default 12h)
- Each API request refreshes idle timeout
- Session deleted on logout

## Backend Auth Middleware

### AdminWebAuthMiddleware
Location: `backend/internal/transport/http/middleware/`

1. Extract `Authorization: Bearer <token>` header
2. Validate JWT signature and expiration
3. Extract `sid` claim
4. Check session exists in `admin_sessions` table
5. Check session not expired (idle + max lifetime)
6. Refresh idle timeout
7. Set identity in request context

### RequireAdminRoleOrPermission
Location: `backend/internal/app/apiapp/routes.go`

Two modes (`ADMIN_AUTHZ_MODE`):
- **dual**: check legacy role allowlist OR permission-based access
- **permission_only**: only check permissions (target mode)

Permissions are granular: `view_metrics`, `export_data`, `manage_users`, `moderate_content`, `manage_access`, `manage_settings`, etc.

## Key Files

| File | Purpose |
|------|---------|
| `adminpanel/backend/login/` | Login backend service |
| `backend/internal/services/adminacl/` | Admin ACL service |
| `backend/internal/repo/postgres/admin_session_repo.go` | Session repository |
| `backend/internal/transport/http/middleware/` | Auth middleware |
| `adminpanel/frontend/src/admin/` | Frontend auth layer |
| `adminpanel/frontend/src/lib/adminAuthApi.ts` | Auth API client |
| `adminpanel/frontend/src/pages/LoginPage.tsx` | Login UI |

## Environment Variables

```bash
# Login Backend
LOGIN_JWT_SECRET=<shared-with-backend>
LOGIN_TOTP_SECRET_KEY=<base64-32-byte-AES-key>
LOGIN_TELEGRAM_BOT_TOKEN=<telegram-bot-token>
LOGIN_SESSION_IDLE_TIMEOUT=30m
LOGIN_SESSION_MAX_LIFETIME=12h
LOGIN_DEV_MODE=true  # enables debug init_data login

# Backend
ADMIN_WEB_JWT_SECRET=<must-match-LOGIN_JWT_SECRET>
ADMIN_WEB_SESSION_IDLE_TIMEOUT=30m
ADMIN_AUTHZ_MODE=dual  # or permission_only
```
