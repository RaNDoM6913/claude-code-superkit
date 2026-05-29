# Functionality Rubric

Used by `gan-evaluator` for non-UI features (API endpoints, services, background jobs). Binary criteria.

## Implementation

| # | Criterion | Pass if |
|---|-----------|---------|
| 1.1 | Feature endpoint / function exists | Code present in expected file |
| 1.2 | Input validation | Bad input rejected with specific error (400 + message), not silently coerced |
| 1.3 | Auth check | Protected operations verify caller — not just trust input |
| 1.4 | Error handling | Errors logged AND surfaced — never silently swallowed (see silent-failure-hunter) |
| 1.5 | Idempotency | Repeated requests with same input → same result (no double-charge, double-create) |

## Tests

| # | Criterion | Pass if |
|---|-----------|---------|
| 2.1 | Happy path test | At least one test covers the success case |
| 2.2 | Error path tests | Bad input, auth failure, downstream failure each tested |
| 2.3 | Edge case tests | Empty input, max-length, special characters, race conditions |
| 2.4 | No skipped tests | `test.skip` / `xit` / `xdescribe` count = 0 in changed files |

## Observability

| # | Criterion | Pass if |
|---|-----------|---------|
| 3.1 | Structured logs | Events logged with key fields (user_id, request_id, outcome) |
| 3.2 | Metrics emitted | Counter / histogram for the feature |
| 3.3 | Errors traceable | Stack traces preserved; original error wrapped, not converted to string |

## Data integrity

| # | Criterion | Pass if |
|---|-----------|---------|
| 4.1 | Transactions where needed | Multi-step writes are atomic |
| 4.2 | No partial state | Failure leaves system in pre-action state, not half-done |
| 4.3 | Migration safe | If schema change: forward + rollback both tested |

## Critical failures (auto-fail)

- Silent error swallowing (see silent-failure-hunter Category A or B)
- No auth check on protected operation
- Race condition in concurrent flow
- Migration without rollback
- Test was disabled to make CI pass

## Scoring

Total criteria: 15

| Score | Verdict |
|-------|---------|
| 15 / 15 | PASS |
| 13-14 | NEEDS-ATTENTION |
| 10-12 | NEEDS-REMEDIATION |
| ≤ 9 | BLOCKED |
