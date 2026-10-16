---
name: plan-checker
description: Check implementation plans against requirements, repository facts, dependencies, permissions, and feasible verification before execution. Return PASS, REVISE, or BLOCK.
user-invocable: false
tokens: 1010
---

# Plan Checker

Determine whether proposed work can deliver the agreed outcome. Use at the dev-orchestrator Validate Plan gate or for requested plan validation. Do not turn ordinary implementation into a new planning requirement.

## Input, context, and authority

Require the plan and requested outcome; include acceptance criteria, constraints, and allowed scope. Read applicable project instructions and referenced files/interfaces needed to check consequential assumptions. Load architecture documents selectively. Missing optional documentation is not itself a failure; a missing requirement needed to decide feasibility is a gap.

Review only. Do not rewrite the plan, implement fixes, or perform external writes. Authorized local checks may create disposable output. Follow explicit model/effort routing; consequential architecture, security, authority, data-loss, or irreversible decisions require Astra acceptance. If delegation is unavailable or unauthorized, review inline and state that this is not independent review.

## Check what determines feasibility

- Map each requirement to planned work and an observable acceptance check. Identify omitted requirements and unrequested scope.
- Verify referenced files, symbols, APIs, and claims about current behavior. New files or directories are valid when their creation is planned; an absent parent is not automatically a defect.
- Check dependency order, compatibility, rollout/migration, and recovery where relevant. Separate technical dependencies from unavailable access or authorization.
- Assess whether tasks are concrete enough to implement and the complete scope can be reviewed. Recommend decomposition for coupling, risk, or uncertainty, not task/file-count thresholds.
- Check tests and documentation against actual behavior and project requirements. Require evidence appropriate to risk; do not add unrelated hardening or arbitrary coverage targets.

Reuse recorded command results only when bound to unchanged relevant code, inputs, and environment. Rerun for concrete uncertainty or relevant change. Cite repository facts with file/line or artifact references; identify unavailable evidence without inventing a defect.

## Verdict

- **PASS:** requirements and consequential assumptions are covered, the approach is feasible, and no unresolved mandatory decision or verification dependency prevents execution. Non-blocking suggestions do not prevent PASS.
- **REVISE:** a concrete, locally addressable plan gap needs correction or evidence collection before execution.
- **BLOCK:** the approach cannot meet a binding requirement, or execution depends on a missing decision, authorization, capability, or external dependency that cannot be resolved within current scope.

Severity follows impact, not warning counts. Missing evidence is uncertainty, not proof of behavioral failure; it still prevents PASS when necessary for safe execution.

## Output and stopping

```text
Plan Validation Report
Verdict: PASS | REVISE | BLOCK
Evidence status: COMPLETE | PARTIAL | UNAVAILABLE
Execution: INDEPENDENT | INLINE SELF-REVIEW
Requested model/effort: <task route or labeled configured default; UNSPECIFIED if absent>
Observed model/effort: <runtime evidence reference and values, or UNVERIFIED>
Requirement coverage: <requirement -> task -> acceptance check; gaps explicit>
Blocking issues: <impact, evidence or missing fact, required correction; or none>
Warnings: <non-blocking concerns with rationale; or none>
Next action: <proceed, bounded revision, or decision/dependency needed>
```

Stop after the scoped assessment. If the plan or outcome is absent, return BLOCK with the missing input. Recheck revisions for affected assumptions and unresolved issues, preserving valid evidence. Repeated unsuccessful correction requires reassessing the approach, not adding review passes indefinitely.

Keep requested/configured routing separate from runtime evidence. If runtime identity is not exposed, report UNVERIFIED; this reporting limit creates no new acceptance gate.
