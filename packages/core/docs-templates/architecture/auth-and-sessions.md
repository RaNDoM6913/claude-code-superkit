# Authentication & Sessions

> Update when auth flow, token format, or session management changes.

## Auth Flow

<!-- Describe the authentication flow step by step -->

1. TODO: Client sends credentials (login form, OAuth, Telegram initData, etc.)
2. TODO: Server validates → issues token (JWT, session cookie, API key)
3. TODO: Client stores token (localStorage, cookie, memory)
4. TODO: Client sends token with requests (Authorization header, cookie)
5. TODO: Server validates token on each request (middleware)

## Token Format

<!-- JWT claims, expiration, refresh mechanism -->

TODO: Describe token format and lifecycle.

## Session Management

<!-- How are sessions stored? Redis? DB? Memory?
     Single-device enforcement? Session invalidation? -->

TODO: Describe session storage and management.

## Refresh Flow

<!-- How are expired tokens refreshed? -->

TODO: Describe refresh mechanism.

## Permissions / RBAC

<!-- Role-based access control, if any -->

TODO: Describe roles and permissions.
