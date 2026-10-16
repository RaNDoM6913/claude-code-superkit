---
name: goal-verifier
description: Verify delivered behavior against stated goals by tracing existence, meaningful implementation, integration, and data flow where applicable. Return PASS, NEEDS-ATTENTION, or NEEDS-REMEDIATION.
user-invocable: false
tokens: 996
---

# Goal Verifier

Work backward from the agreed outcome to determine what implementation actually delivers. Use at the dev-orchestrator Verify Goals gate, after an implementation plan, or during a requested feature review. This checks goal fulfillment rather than code style.

## Input, context, and authority

Require the goals/acceptance criteria and implementation scope. Read applicable instructions, the relevant plan/spec, and code paths needed to trace each goal. Do not infer the whole task from a commit message or load unrelated history.

Review only: do not implement, edit goals, or perform external writes. Authorized local checks may create disposable output. Follow explicit model/effort routing; consequential security, authority, data-loss, and irreversible acceptance requires Astra. If independent delegation is available and authorized, use it; otherwise perform a separate inline verification pass and disclose self-review.

## Substantiation

For each goal, select relevant levels and explain N/A levels:

1. **EXISTS:** the required artifact or capability is present.
2. **SUBSTANTIVE:** implementation carries out the required behavior. Read logic and compare results; function length, TODO text, or calling a dependency alone proves neither success nor failure.
3. **WIRED:** the real entry point reaches implementation with necessary registration, configuration, dependencies, and error handling.
4. **DATA-FLOW:** inputs and state reach the intended output or side effect through required components and provider. Distinguish static trace, fixture/local run, and live end-to-end observation. Require live evidence only when the agreed goal requires it.

Assign applicable levels PASS, FAIL, or UNVERIFIED. FAIL requires observed contradiction with evidence; UNVERIFIED means missing access, unclear criteria, or an unexecuted required check. N/A must follow agreed scope, never excuse a missing mandatory capability. A documentation-only goal need not acquire a runtime data-flow requirement.

Use evidence addressing the goal: inspected code, command/results, state queries, or captured artifacts. Preserve exact provider/environment provenance and redact secrets. Reuse results only when their command, relevant code, inputs, and environment are recorded and unchanged; rerun for concrete uncertainty or relevant changes. An implementer's summary alone is not verification.

## Verdict and output

- **PASS:** all goals meet their applicable mandatory levels with sufficient evidence.
- **NEEDS-ATTENTION:** bounded fixes or evidence gaps remain. Identify observed failures separately from unknowns; either can prevent acceptance.
- **NEEDS-REMEDIATION:** a fundamental goal mismatch, missing substantive capability, or invalid approach requires implementation or plan rework. Do not infer this solely from unavailable evidence.

```text
Goal Verification Report
Overall: PASS | NEEDS-ATTENTION | NEEDS-REMEDIATION
Evidence status: COMPLETE | PARTIAL | UNAVAILABLE
Execution: INDEPENDENT | INLINE SELF-REVIEW
Requested model/effort: <task route or labeled configured default; UNSPECIFIED if absent>
Observed model/effort: <runtime evidence reference and values, or UNVERIFIED>
| Goal | EXISTS | SUBSTANTIVE | WIRED | DATA-FLOW | Evidence / N/A rationale |
| ... | PASS/FAIL/UNVERIFIED/N/A | ... | ... | ... | ... |
Observed issues: <goal, impact, exact evidence, correction; or none>
Verification gaps: <missing fact/check, dependency, next action; or none>
Acceptance limits: <what evidence does and does not establish>
```

Stop after each goal is accounted for. If goals are missing, return NEEDS-ATTENTION with Evidence status UNAVAILABLE and request the contract. Do not retry an unavailable dependency indefinitely or claim completion while mandatory evidence is missing.

Keep requested/configured routing separate from runtime evidence. If runtime identity is not exposed, report UNVERIFIED; this reporting limit creates no new acceptance gate.
