# Functionality Rubric

Used by `gan-evaluator` for non-UI features (API endpoints, services, background jobs). Every criterion is binary (pass / fail); some rows carry an explicit `N/A if` condition.

**How N is computed:** applicable criteria N = 15 table rows − N/A rows + extra criteria from the plan's `## Rubric` section. `gan-planner` states N in the plan; without a planner handoff, `gan-evaluator` applies the `N/A if` conditions itself. Score X = criteria passed.

## 1. Implementation

| # | Criterion | Pass if |
|---|-----------|---------|
| 1.1 | Feature endpoint / function exists | Code present in expected file |
| 1.2 | Input validation | Bad input rejected with specific error (400 + message), not silently coerced |
| 1.3 | Auth check | Protected operations verify caller — not just trust input |
| 1.4 | Error handling | Errors logged AND surfaced — never silently swallowed (see silent-failure-hunter) |
| 1.5 | Idempotency | Repeated requests with same input → same result (no double-charge, double-create) |

## 2. Tests

| # | Criterion | Pass if |
|---|-----------|---------|
| 2.1 | Happy path test | At least one test covers the success case |
| 2.2 | Error path tests | Bad input, auth failure, downstream failure each tested |
| 2.3 | Edge case tests | Empty input, max-length, special characters, race conditions |
| 2.4 | No skipped tests | `test.skip` / `xit` / `xdescribe` count = 0 in changed files |

## 3. Observability

| # | Criterion | Pass if |
|---|-----------|---------|
| 3.1 | Structured logs | Events logged with key fields (user_id, request_id, outcome) |
| 3.2 | Metrics emitted | Counter / histogram for the feature. N/A if the project has no metrics stack wired (no metrics library in imports/config — e.g., prom-client, OpenTelemetry metrics, statsd) |
| 3.3 | Errors traceable | Stack traces preserved; original error wrapped, not converted to string |

## 4. Data integrity

| # | Criterion | Pass if |
|---|-----------|---------|
| 4.1 | Transactions where needed | Multi-step writes are atomic |
| 4.2 | No partial state | Failure leaves system in pre-action state, not half-done |
| 4.3 | Migration safe | Forward + rollback both tested. N/A if the feature changes no schema |

## Scoring

Total criteria: 15 (5 implementation + 4 tests + 3 observability + 3 data integrity). Applicable N = 15 − N/A rows + extra criteria from the plan's `## Rubric` section.

Apply the first matching row, top to bottom:

| Condition | Verdict |
|-----------|---------|
| X = N and zero critical failures | PASS — ship it |
| X ≥ 0.8 × N and zero critical failures | NEEDS-ATTENTION — fix the gaps in place, re-evaluate |
| X < 0.8 × N | NEEDS-REMEDIATION — significant gaps; recommend returning to gan-planner in the report |

With all 15 criteria applicable: PASS = 15, NEEDS-ATTENTION = 12–14, NEEDS-REMEDIATION ≤ 11.

BLOCKED is never a score outcome. `gan-evaluator` reports BLOCKED separately, only when the evaluation itself could not run.

## Critical failures (override any score)

- Silent error swallowing (see silent-failure-hunter Category A or B)
- No auth check on protected operation
- Race condition in concurrent flow
- Migration without rollback
- Test was disabled to make CI pass

Any critical failure forces the verdict to NEEDS-REMEDIATION — never PASS, never NEEDS-ATTENTION, regardless of X / N.
