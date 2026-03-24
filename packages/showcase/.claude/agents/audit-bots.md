---
name: audit-bots
description: Audit Telegram bot code for goroutine safety, rate limits, callback integrity, and production readiness
model: opus
allowed-tools: Bash, Read, Grep, Glob
---

# Bot Audit — SocialApp

Audit `tgbots/bot_moderator/` and `tgbots/bot_support/` for production safety and convention compliance.

## Checks

### 1. Goroutine Leak Risk
Grep `go func` in `tgbots/`. For each:
- Check context.WithTimeout or ctx.Done() select exists inside the goroutine.
FAIL if goroutine spawned without context cancellation.

### 2. Unclosed Update Channel
If `GetUpdatesChan` is used → check `StopReceivingUpdates()` in defer or shutdown hook.
If `ListenForWebhook` → check HTTP server has `Shutdown(ctx)`.
WARN if graceful shutdown is missing.

### 3. Callback Data Length
Grep all `NewInlineKeyboardButtonData` calls. Estimate callback_data length:
- String literal >50 chars → WARN (close to 64-byte TG limit)
- `fmt.Sprintf` with UUID concat → FAIL (likely exceeds 64 bytes)

### 4. Stale Keyboard Cleanup
Find callback handlers. Check each:
- Calls `AnswerCallbackQuery` (or `answerCallback()`) — FAIL if missing
- Edits/removes keyboard after processing — WARN if keyboard left stale

### 5. Rate Limiting
Grep for loops sending messages: `for.*bot\.Send|for.*tg\.Send`.
WARN if no `rate.Limiter` or `time.Sleep` in the loop.
Check for 429/RetryAfter handling anywhere in bot code.

### 6. Direct DB Writes (Moderator Bot)
In `tgbots/bot_moderator/`, grep for direct SQL (`pool.Exec|pool.Query|pool.QueryRow`).
FAIL if approve/reject actions write directly to DB (should use `adminhttp` API client).

### 7. Error Handling Specificity
Grep `bot.Send|bot.Request|tg.Send` calls. Check if errors are type-asserted to `*tgbotapi.Error`.
WARN if errors handled generically without checking Telegram error codes (403/429/400).

### 8. Magic Numbers
Grep numeric literals in bot code (excluding 0, 1, common ports).
WARN for unexplained magic numbers. Should use named constants.

### 9. Bot Testability
Check if bot handlers accept interfaces (e.g., `BotSender`) rather than `*tgbotapi.BotAPI`.
Check if `_test.go` files exist for bot handlers.
WARN if no test files exist.

### 10. Mutex Balance
Grep `\.Lock()` and `\.Unlock()` in bot code. Count must match.
Verify Unlock is always in `defer` (or guaranteed path).
FAIL for Lock/Unlock imbalance.

### 11. SendText Without Markdown
Grep `ParseMode.*Markdown|ParseMode.*HTML` in bot code.
WARN — project convention is plain text (special chars break Markdown parsing).
Exception: explicit escaped content is OK.

### 12. console/fmt Debug Output
Grep `fmt\.Print|log\.Print` in `tgbots/` (.go, excluding `_test.go`).
WARN — should use `slog.Logger`.

## Output Format

```
[PASS/WARN/FAIL] #N description — details (file:line if applicable)
```

End with summary: `X PASS, Y WARN, Z FAIL` and action items list for FAILs.
