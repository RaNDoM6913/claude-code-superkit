---
name: security-scanner
description: Scan codebase for security vulnerabilities (OWASP top-10 + dating-app specific)
model: sonnet
allowed-tools: Bash, Read, Grep, Glob
---

# Security Scanner — TGApp

Scan the TGApp codebase for common security vulnerabilities, including dating-app-specific privacy and Telegram platform checks.

## Review Process

### Phase 1: Checklist (quick scan)
Run through the Checks below (sections 1-47). Report violations immediately without extended analysis.

### Phase 2: Deep Analysis (think step by step)
After the checklist, analyze:
1. What is the intent of this change?
2. What are the possible failure modes?
3. Are there edge cases the checklist didn't cover?
4. Does this change affect other components?

Show your reasoning before stating findings in Phase 2.

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
- Swipe/like endpoints (anti-spam)
- Message endpoints (if present)

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
```

---

## Dating App — Privacy & PII Checks

### 10. Photo URL Security (Critical)
- Verify user photos are served via **presigned S3 URLs**, not direct object keys.
- Grep for S3 bucket URLs or object keys in API responses — raw `s3://` or MinIO paths must never reach the client.
- Check `backend/internal/services/media/` and photo-serving handlers for presign logic.
- Check `backend/internal/transport/http/handlers/` — responses with photo URLs must call presign before returning.

### 11. Phone Number Isolation (Critical)
- Verify phone numbers are stored in the **`user_private` table**, NOT in `profiles` or `users`.
- Grep for `phone` columns in migration files — only `user_private` should have phone storage.
- Check that no API response (feed, matches, likes, candidate) leaks phone numbers to other users.
- Read `backend/internal/repo/postgres/user_private_repo.go` to confirm separation.

### 12. Location Privacy (High)
- Verify exact coordinates (`lat`, `lon`) are **never exposed** to other users in feed/match/like responses.
- Check feed handler and candidate DTOs — only `city` (string) or `distance_km` (rounded) should be visible.
- Verify `privacy_show_distance` flag is enforced: when disabled, distance must be omitted from responses.
- Check `backend/internal/services/feed/` SQL queries respect `privacy_show_distance`.

### 13. Privacy Flags Enforcement (High)
- Verify `privacy_show_in_search` flag is enforced in feed queries — users with `show_in_search=false` must be excluded from feed results.
- Read feed service SQL to confirm WHERE clause includes privacy check.
- Verify `privacy_show_distance` is checked before including distance in candidate responses.
- Check `backend/internal/repo/postgres/` feed-related repos for these filters.

---

## Telegram Platform Security

### 14. initData Validation (Critical)
- Read `backend/internal/services/auth/service.go` — verify Telegram `initData` is validated via **HMAC-SHA256** using the bot token hash.
- Check the validation follows Telegram's official algorithm: `HMAC_SHA256(HMAC_SHA256(bot_token, "WebAppData"), data_check_string)`.
- Verify `auth_date` freshness check (initData should expire after a reasonable window, e.g., 5 minutes).
- Check that `hash` field is compared in constant time to prevent timing attacks.

### 15. Bot Token Exposure (Critical)
- Grep for bot token patterns (`[0-9]+:[A-Za-z0-9_-]{35}`) in:
  - `frontend/src/` — must NOT be present
  - `adminpanel/frontend/src/` — must NOT be present
  - Go source files (outside config/env loading) — should only reference `os.Getenv` or config struct
- Check that bot tokens are not logged: grep for token-like values in `zap.String` / `log.Printf` / `fmt.Printf` calls.
- Verify `.env.example` files do not contain real token values.

### 16. Bot Callback Data Validation (High)
- Read moderator and support bot handlers (`tgbots/bot_moderator/`, `tgbots/bot_support/`).
- Check callback data parsing: verify length limits, format validation, and bounds checking.
- Callback data must be parsed defensively — malformed data should be rejected, not panic.
- Verify no SQL injection through callback data parameters (user IDs, case IDs).

### 17. Webhook HTTPS Enforcement (Medium)
- Check bot webhook configuration — URLs must use `https://` only.
- Grep for webhook URL construction in bot setup code.
- Verify no `http://` webhook URLs exist outside of local development config.

---

## Dating App — Anti-Abuse Checks

### 18. Block System Enforcement (High)
- Verify blocked users are excluded from feed queries — read feed SQL for block-list filter.
- Check that blocked users cannot send likes/superlikes to the blocker.
- Verify `/v1/matches` and `/v1/likes` responses exclude blocked users.
- Read `backend/internal/repo/postgres/` blocked-related repos and feed repos.

### 19. Moderation Gate (High)
- Verify unapproved profiles (`moderation_status != APPROVED`) do not appear in other users' feeds.
- Check that draft content (from `profile_drafts`, `draft_media`) is never served to non-owner users.
- Verify `PENDING_UPDATE` profiles continue showing the last approved snapshot to other users, not the pending changes.

### 20. Rate Limiting — Swipes & Likes (Medium)
- Check that swipe/like endpoints have rate limiting configured.
- Verify daily swipe/like caps exist (anti-bot protection).
- Check for duplicate swipe prevention (same user swiped twice on same candidate).

### 21. Duplicate Account Detection (Medium)
- Check for device fingerprinting or `X-Device-Id` tracking.
- Verify single-device enforcement in auth (login kills previous sessions).
- Check if phone number uniqueness is enforced (`user_private.phone` UNIQUE constraint, migration 000040).
- Read `backend/internal/services/antiabuse/` if it exists for additional checks.

---

## Photo Upload Security

### 22. Photo Metadata Stripping (Critical)
- Verify ALL photo upload paths strip EXIF/metadata BEFORE S3 upload (both `original_file` and `display_file`).
- Best practice: re-encode image (decode→raw pixels→re-encode JPEG) — neutralizes steganography, EXIF injection, APNG tricks.
- Check `backend/internal/services/media/` for stripping/re-encoding logic.
- Admin endpoints serving photos to moderators must also strip EXIF (prevent moderator GPS leak).

### 23. Animated Image Rejection (Medium)
- Upload handler rejects or flattens animated formats: APNG (`acTL` chunk), animated WebP (`ANIM` chunk), GIF >1 frame.
- These bypass moderation (first frame clean, later frames NSFW).

### 24. Post-Approval Photo Swap Guard (Critical)
- Photo changes after `APPROVED` status trigger `PENDING_UPDATE`, not direct write to live profile.
- Direct writes to `media` table only via snapshot publish function.
- No API endpoint bypasses draft→snapshot→moderation flow.

---

## Fake Profile Detection

### 25. Registration Velocity (High)
- Rate limit on `POST /auth/telegram` per Telegram user ID AND per `X-Device-Id`.
- Flag >3 registrations from same device in 24h.

### 26. Photo Uniqueness — Perceptual Hash (High)
- Uploaded photos compared via perceptual hash (pHash/dHash). Look for `goimagehash` or similar.
- Hash stored in media table; query: `BIT_COUNT(phash_value # $1) < 5`.

### 27. Behavioral Anomaly Flags (Medium)
- Profile completion <30s, 100+ swipes in 10 min, identical bio text across accounts, all swipes "like" in first 50 → bot behavior.

---

## Location Security

### 28. Location Consistency / GPS Spoofing (Medium)
- Backend validates plausibility: speed check >900 km/h → spoofed. Max 1 location update per 5 min.
- If implausible: log and flag, don't reveal detection.

### 29. Travel Mode Entitlement Check (Medium)
- `POST /v1/travel` checks `entitlements.IsPlusActive()`. Feed query ignores travel if PLUS expired.

---

## Payment Security (Telegram Stars)

### 30. Payment Idempotency (Critical)
- `telegram_payment_charge_id` stored with UNIQUE constraint. Duplicate returns success without granting credits.
- Pattern: `INSERT ON CONFLICT (charge_id) DO NOTHING RETURNING id`.

### 31. Refund Webhook Handling (Critical)
- Bot handles `refunded_payment` update type (Bot API 7.0+).
- Credits reversed on refund; if already consumed → manual review flag.

### 32. Concurrent Purchase Protection (High)
- `SELECT ... FOR UPDATE` or `pg_advisory_xact_lock(user_id)` before granting credits. Prevents double-crediting.

---

## CSAM Prevention

### 33. Age Verification Enforcement (Critical)
- Birthdate validation rejects <18 (server-side from `birthdate`, not client-supplied age).
- Birthdate immutable after initial submission (or re-triggers moderation).

### 34. Hash Matching Readiness (High)
- pHash stored for every upload. Infrastructure ready for future NCMEC/PhotoDNA integration.

### 35. Moderation Queue Priority (Critical)
- New profiles not shown to ANY user before moderation approval.
- Photos served via presigned URLs with TTL, not public bucket.

---

## Privacy & PII

### 36. PII in Public Responses (Critical)
- Scan DTOs: `phone`, `email`, `telegram_id`, `lat`, `lon` must NOT appear in feed/likes/matches/candidate responses.
- `/v1/me` can include own PII; other-user endpoints must not.

### 37. Signed Photo URLs (High)
- Presigned S3 URLs with TTL (1-24h). No permanent public URLs. No guessable user_id in URL path.

### 38. Account Enumeration Prevention (High)
- Error responses don't reveal account existence. Same response for "phone already registered" and "phone saved".
- Constant-time comparison in auth (`crypto/subtle.ConstantTimeCompare`).

---

## Harassment Prevention

### 39. Swipe Rate Limiting (High)
- Max swipes/day (100 free, 500 PLUS). Max likes/day. Min cooldown between swipes (500ms).
- Server-side enforcement, stored in Redis.

### 40. Report Abuse Prevention (Medium)
- Max N reports per user per 24h. Self-report prevention. Duplicate report prevention.

### 41. Unmatch-Rematch Prevention (Medium)
- After unmatch: cannot re-like for 30 days. Enforced in feed query.

---

## OWASP API Security Top 10

### 42. Object-Level Authorization / IDOR (Critical)
- Every handler reading resource by URL ID verifies it belongs to authenticated user (JWT subject).
- Exception: admin endpoints with separate auth.

### 43. Resource Consumption Limits (Medium)
- Feed pagination max page size. Photo upload daily limit. No unbounded `SELECT *` without `LIMIT`.

### 44. SSRF Prevention (High)
- Geocoder proxy: no raw user input as URL. Response parsed, only lat/lon/title returned.
- Block RFC 1918 addresses in outbound requests.

### 45. Production Hardening (High)
- No `/debug/pprof` or `/debug/vars` routes. No stack traces in error responses. CORS not `*` in production.

### 46. Deprecated Endpoint Scan (Medium)
- Scan `routes.go` for commented-out or dead endpoints still registered.

### 47. External API Validation (Medium)
- initData signature validation. Photo URL domain validation. Geocoder lat/lon range checks (-90..90, -180..180).

---

## Output Format

For each finding, rate:

### Severity
- **CRITICAL** — Data loss, security vulnerability, or crash. Example: SQL injection, auth bypass, PII leakage, exposed secrets.
- **WARNING** — Incorrect behavior under specific conditions, security degradation. Example: missing rate limit, weak validation, non-constant-time comparison.
- **SUGGESTION** — Hardening opportunity. Won't break if ignored. Example: additional audit logging, stricter CSP headers.

### Confidence
- **HIGH (90%+)** — I can see the concrete vulnerability in the code. I would bet money on this.
- **MEDIUM (60-90%)** — Looks wrong based on patterns, but I might be missing context.
- **LOW (<60%)** — A hunch. Flagging for human review.

### Format:
```
[SEVERITY/CONFIDENCE] [CHECK-NNN] file:line — description
  Evidence: <what I see>
  Fix: <suggested change>
```

### Risk Summary:
**X critical, Y high, Z medium, W low**

IMPORTANT: Do NOT inflate severity to seem thorough. A scan with 0 CRITICAL
findings and 2 SUGGESTIONS is perfectly valid. If the code is secure, say so.
