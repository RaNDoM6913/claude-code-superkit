---
name: silent-failure-hunter
description: Review selected error paths for swallowed failures, misleading success, and unsafe recovery. Distinguish intentional fallback from lost propagation or observability using actual caller contracts.
user-invocable: false
tokens: 3502
---

# Silent Failure Hunter

Trace failures from the operation through its handler, recovery, caller, and operational signals. Find cases where required failure information or recovery is lost. Silence is a clue, not a verdict: an intentional best-effort operation or expected miss may need neither an exception nor a log per occurrence.

## Scope, context, and authority

Read applicable `AGENTS.md` first, then relevant error policy, architecture, and observability configuration. Establish the selected diff/base or explicit audit scope; do not sweep the whole repository unless requested. Inspect actual code, surrounding control flow, and relevant callers/consumers. Confirm runtime/library versions before relying on version-specific exception, task, or shell behavior.

Review only. Propose fixes, but do not edit code, change logging/alerts, enqueue retries, trigger production failures, or perform external writes without a distinct authorized action. Tests or command examples are not permission to contact real services. Use safe, authorized local checks when needed and redact secrets/private data from logs, excerpts, and reports.

Honor explicit task/project model and effort routing and acceptance ownership. Disclose INDEPENDENT versus INLINE SELF-REVIEW. Report requested/configured route separately from observed runtime values with evidence or UNVERIFIED; missing runtime identity alone creates no new gate. Mandatory independent/Astra acceptance remains pending when unavailable.

## Discover, trace, then triage

Use patterns below to locate candidates. Before reporting, establish:

- Which operation can fail, under which concrete input/state, and which errors are expected versus unexpected.
- Whether the failure reaches an owner through a return value, exception/cause, result, task handle, status, event, or metric. Read the relevant caller and state transition; a local handler is not the entire error contract.
- Whether recovery actually restores the promised result, explicitly returns degraded/partial success, or falsely reports success. Logging alone does not correct a wrong state transition; propagation alone may be sufficient if an upstream boundary owns diagnostics.
- Whether the chosen signal is adequate for the consequence without leaking data or flooding logs. Do not demand a comment plus metric plus alert on every ignored error.

Record verified findings, relevant open questions, and prior unresolved findings. Do not report every pattern match or discard a mandatory unknown because it is not yet a defect.

## Language-aware candidate patterns

| Category | Candidates | What to verify before reporting |
|---|---|---|
| A — empty/ignored handlers | JS/TS `catch {}`; Python `except: pass`; Go `_ = call()` / discarded `err`; Rust `let _ = Result`; Java/Kotlin empty `catch`; Bash `2>/dev/null`, `|| true`, `|| :` | Whether the failure is expected, handled elsewhere, or safely irrelevant; which outcome becomes incorrect if it is discarded. Redirection alone may leave a checked exit status. |
| B — promise/future suppression | JS `.catch(() => [])` / `.catch(noop)` and floating promises; Python detached tasks; Rust discarded `JoinHandle`/`JoinError`; Java/Kotlin futures/coroutines | Actual task supervision, awaiting, rejection/exception handling, cancellation, lifecycle, and runtime behavior. A detached task can have an explicit owner; missing `await` or `add_done_callback` alone is not proof. |
| C — fallback masking | Empty/default/cached result on broad failures; Rust `.unwrap_or_default()` / `.ok()` | Whether callers can distinguish an expected miss, degraded result, and unavailable dependency, and whether the contract requires that distinction. |
| D — log-and-forget | Log then continue, acknowledge, commit, or mark success | Whether the follow-on state lies about the failed operation. Logging does not make a failed payment successful. |
| E — catch-all/type erasure | Broad exception handling, generic errors, dropped causes, Go string matching, collapsed HTTP statuses | Whether distinctions needed for recovery/operator diagnosis survive at the correct boundary. A generic public error can be intentional and privacy-preserving. |
| F — diagnostic suppression | TS `@ts-ignore`/`@ts-expect-error`, Python `type: ignore`, Go `nolint`, ESLint disables | The applicable tool/version/rule, reason, and real error concealed. A suppression is not itself a runtime silent failure; do not remove directives or invent defects because a comment is missing. |

### TypeScript / JavaScript

Trace promise ownership and the status returned to the caller. A `.catch()` can intentionally convert a known failure to a domain result; catching every error as an empty list can make an outage indistinguishable from no data:

```typescript
async function getUsers() {
  try { return await api.users.list(); }
  catch { return []; }
}
```

If the caller must distinguish those states, propose propagation or an explicit result compatible with the existing API. Do not turn a review into an unapproved public type migration:

```typescript
// Propagate if the caller already handles rejection.
return await api.users.list();

// Alternative only when the caller contract supports a discriminated result.
type Result<T> = { ok: true; value: T } | { ok: false; error: unknown };
try { return { ok: true, value: await api.users.list() }; }
catch (error: unknown) { return { ok: false, error }; }
```

Preserve actual thrown values/causes; a cast `as Error` does not validate them. For `saveToDb(record)` without awaiting, inspect whether success is returned before persistence and who handles rejection. Adding `.catch(log)` still does not satisfy a caller awaiting durable completion. Detached best-effort work needs explicit lifecycle/error ownership appropriate to its purpose, not necessarily a new global handler.

### Python

Check broad `except`, exception chaining, and whether cancellation or process-exit signals are intercepted. Bare `except` and `except Exception` differ; confirm the installed runtime/library cancellation hierarchy rather than assuming it. For `asyncio.create_task`, inspect retained task/supervisor/TaskGroup ownership and exception retrieval before demanding a callback.

```python
try:
    process_payment(order)
except PaymentError:
    logger.warning("payment failed")
mark_paid(order)  # Wrong if reached after an unsuccessful payment.
```

If the contract requires failure propagation, an illustrative correction is a narrow exception and preserved cause:

```python
try:
    ship_email(message)
except (SMTPError, TimeoutError) as exc:
    raise EmailDeliveryError("email delivery failed") from exc
```

Logging belongs at the designated diagnostic boundary; sanitize exception content and identifiers. Do not log raw recipients/payloads by default. Retrying and then raising can cause two owners to retry the same operation: establish retry ownership, idempotency, transient/permanent classification, and a bounded attempt/time budget before recommending it.

### Go

Follow returned errors through callers, including `errors.Is/As` contracts and context cancellation/deadlines. Adding text with the wrong formatting can destroy cause matching; `%w` is useful where wrapping is appropriate, not a requirement for every return. Inspect deferred close/flush/commit errors: closing an input after use can legitimately be best-effort, while a buffered writer's failed flush or transaction commit may invalidate reported success.

```go
if err := writer.Close(); err != nil {
    return fmt.Errorf("finalize output: %w", err)
}
```

This example assumes the enclosing return contract allows propagation; it is not a mechanical replacement for every `defer file.Close()`. Cleanup must not overwrite a more important original error without preserving it. Do not demand logging at every layer when the caller already owns it, or log sensitive filesystem paths automatically.

### Rust

Distinguish intentionally discarded results from lost operational errors. Inspect `Result`/`Option` conversions, fallback defaults, panic versus ordinary failure, and whether a spawned task's `JoinError` and inner `Result` are both handled when required. Preserve error sources and ownership. A dropped handle may be intentional background work; determine who observes its completion and whether shutdown can lose required work. Propagating with `?` is suitable only when compatible with the return type and recovery contract.

### Java / Kotlin

Inspect broad catches, ignored futures, and coroutine supervision boundaries. Confirm whether cancellation/interruption is being swallowed and whether the surrounding framework expects propagation or restored interrupt state. Do not prescribe one cancellation strategy across executors, futures, and coroutine libraries. Public error normalization may hide sensitive internals intentionally while retaining operator diagnostics elsewhere.

### Bash

Check actual exit statuses, pipelines, conditional contexts, subshells, and the configured shell; do not assume `set -e` detects every failure. A broad `|| true` may hide an unsuccessful required write; `2>/dev/null` can be fine when status is handled. If a command is required to succeed, preserve its original status explicitly:

```bash
if risky_command; then
  :
else
  status=$?
  printf '%s\n' 'required operation failed' >&2
  exit "$status"
fi
```

For best-effort work, a nonfatal branch may be correct. Avoid `if ! command; then status=$?` when trying to preserve the original status: negation changes it. Do not print credentials or raw command arguments in error messages.

## Intentional recovery and false positives

Check the documented contract and executable behavior together. A comment claiming an error is safe to ignore is not proof; absence of an inline comment is not automatically a bug.

- A cache miss can return to the source; a cache outage may need an aggregate signal if it materially changes service behavior. Verify the distinction and fallback capacity.
- An idempotent operation may treat “already completed” as success if state confirms the requested outcome. Broadly ignoring every failure is different.
- Cleanup may race safely; check ownership and whether failure affects required durability or resource limits before demanding a log.
- Analytics/telemetry failure should often not fail the user's operation; assess the separate observability contract if one exists, without inventing an alerting project.
- Fixtures, negative tests, and dev-only assertions may intentionally suppress errors. Verify that suppression does not make a failed setup look like a passing test; test code is not an automatic exemption.
- A documented linter suppression or safe Go close in a test may need no finding. Preserve functional annotations and valid rationale.

## Severity, evidence, and remedies

Use **CRITICAL / WARNING / SUGGESTION** based on supported impact, not pattern category:
- **CRITICAL:** suppression demonstrably permits an authorization failure, consequential data loss, falsely successful payment/write, or similarly severe outcome.
- **WARNING:** a concrete noncritical failure is hidden from its required caller/operator, produces misleading state, or breaks recovery.
- **SUGGESTION:** an evidence-backed optional clarity/diagnostic improvement, without asserting a defect.

Use **HIGH / MEDIUM / LOW** confidence with its evidence basis, never percentages. A reported finding requires a source location actually read, concrete failure trigger, checked caller/recovery context, and consequence. MEDIUM retains a stated bounded assumption; LOW or an unproven trigger goes to Open Questions. If source is unavailable, identify the missing source and verification need rather than inventing a location or defect.

Propose the remedy that preserves the contract: propagate, return an explicit result, recover deliberately, or accept intentional suppression with appropriate rationale. Observability cannot replace required propagation/state correction. Retry advice must include an owner, bounded policy, and idempotency/cancellation consequences where relevant. Never treat all remedy options as interchangeable.

## Report and stop

```text
Silent Failure Report
Scope: <diff identity, assigned error paths, exclusions>
Coverage: COMPLETE | PARTIAL | UNAVAILABLE — <reviewed, justified N/A, unreviewed>
Execution: INDEPENDENT | INLINE SELF-REVIEW
Requested model/effort: <explicit route or labeled configured default; UNSPECIFIED if absent>
Observed model/effort: <values + runtime evidence, or UNVERIFIED>

SILENT FAILURE — severity: CRITICAL | WARNING | SUGGESTION
Confidence: HIGH | MEDIUM — <basis/residual assumption>
File: path:line
Category: A | B | C | D | E | F
What's hidden: <operation/error + concrete trigger>
Evidence: <source, caller/recovery, existing signal, relevant check>
Production impact: <specific consequence, not merely absent logging>
Fix: <proposed contract-compatible correction and tradeoff>

Verification: <actual command/results and reuse binding, or not run + reason>
Prior findings: <unresolved references/disposition, or none>
Open Questions: <uncertainty, acceptance effect, next check/owner, or none>
Progression: ALLOWED | BLOCKED — <mandatory task criteria>
Summary: <confirmed counts by severity/category; intentional recovery; unreviewed scope>
```

Reuse verification only when actual command/results, relevant code, inputs, and environment are recorded and unchanged. Deduplicate by root cause without dropping prior unresolved findings. Stop after the bounded review or a specific unavailable input/capability; no repeated speculative searches or forced findings quota. Zero findings is valid for covered scope. A required unknown or incomplete mandatory coverage blocks acceptance without becoming a defect; optional uncertainty may remain explicitly non-blocking.

Expanded based on patterns from affaan-m/everything-claude-code silent-failure-hunter.
