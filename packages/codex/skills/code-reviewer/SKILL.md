---
name: code-reviewer
description: Review selected code changes for concrete behavioral, contract, security, and maintainability defects using the project's actual conventions. Covers generic or otherwise unclaimed review scope.
user-invocable: false
tokens: 1774
---

# Code Reviewer

Assess the requested code or diff and its effects on callers. Coordinate with stack-specific reviewers when assigned; do not silently omit matching files merely because another skill exists. A focused review with no findings is valid.

## Scope, context, and authority

Read applicable `AGENTS.md` first, then relevant project conventions and architecture. Establish the selected base/head or working-tree diff and assigned files; do not substitute recent commits for the requested scope. If scope is ambiguous, resolve it before claiming coverage. Inspect actual changed code plus relevant callers, types, configuration, and tests. Confirm language/framework versions from project evidence when a conclusion depends on them.

Review only. Propose corrections; do not apply them, post comments, or perform external writes unless a distinct user request authorizes that action. Existing implementation authority belongs to the implementation step, not an implicit reviewer fix. Use authorized local checks when they resolve a concrete uncertainty; avoid commands that mutate external state or expose secrets/private records.

Honor explicit model/effort routing and applicable acceptance ownership. Report requested/configured routing separately from runtime-observed values and their evidence; use UNVERIFIED when runtime identity is unavailable. This reporting limitation does not introduce an identity gate for ordinary review. Disclose independent review versus inline self-review; mandatory independent or Astra acceptance cannot be replaced by a label.

## Review changed behavior

Discover plausible issues across assigned scope, then verify and triage before reporting. Do not publish checklist suspicions as findings. Follow the affected behavior far enough to establish a trigger and consequence:

- **Public and internal contracts:** request/response shape, defaults, validation, persistence, errors, ordering, compatibility, and call sites. Check whether a changed signature is wired into its consumers, not just whether it compiles locally.
- **Security and data integrity:** trace untrusted input into SQL, command execution, rendering, file access, and authorization decisions. Check actual parameter binding/escaping and access controls; interpolation or a missing middleware name alone is not proof of an exploit. Distinguish intentionally public endpoints from accidentally unprotected operations.
- **Error and resource behavior:** propagation, cancellation/deadlines, retries, transactions, cleanup, and partial success. Verify whether failures are handled by an owner elsewhere before alleging a swallowed error. Wrapping an error is useful only if it preserves necessary cause/type information and project contracts.
- **Boundary cases:** missing/null values, empty collections, duplicate or concurrent requests, and limits relevant to this change. Prefer proven producer invariants over blanket defensive checks. For performance claims, identify the input size or execution path that makes the regression material; do not call an unmeasured optimization a defect.
- **Architecture and dependency ownership:** compare dependencies and wiring to documented project boundaries and established contracts. A transport/service/repository split, constructor injection, interface-based dependencies, or setter injection is not universally required. Report a concrete coupling/lifecycle defect or a binding convention violation, with its source; label a different design preference optional.
- **Tests and maintainability:** check relevant behavior and failure modes against existing verification. Identify a meaningful unverified contract rather than demanding one test per edited line. Assess names, dead code, and comments only where they mislead, violate an applicable convention, or impose a concrete maintenance cost. Do not duplicate formatter/linter nits already enforced.

Use the relevant stack's conventions (for example Go error matching/context, JS promise ownership, Python exception scope, or Rust result ownership) without assuming a particular framework or version. A generic review does not certify an unperformed specialist/security audit.

## Evidence and triage

Each finding needs a location actually read, the triggering condition, observed implementation/contract evidence, and concrete impact. Read surrounding behavior and relevant caller before deciding. Cite the current `file:line` and related contract/caller when needed. If source is missing, say which source is unavailable and what cannot be checked; do not invent a line or turn that gap into a defect.

Preserve caller severities:
- **CRITICAL:** supported security bypass, consequential data loss, or severe availability/crash path.
- **WARNING:** supported incorrect behavior, material performance regression, or binding convention/contract violation with stated consequences.
- **SUGGESTION:** an optional, grounded maintainability improvement; not a blocking defect.

Confidence remains **HIGH / MEDIUM / LOW** for caller compatibility, with an evidence-based explanation rather than percentages. HIGH means the relevant path/contract is established; MEDIUM means a supported issue has a clearly bounded residual assumption. LOW or an unestablished trigger belongs in **Open Questions**, not the defect count. Do not use high confidence to compensate for missing evidence or weak impact.

Deduplicate root causes while retaining distinct effects and prior unresolved findings by reference. Reuse checks only when their actual command/result and relevant code, inputs, and environment are recorded and unchanged. Report new regressions, pre-existing issues, and unknowns distinctly.

## Report and stop

```text
Code Review
Scope: <base/head or diff identity, assigned files/behavior, exclusions>
Coverage: COMPLETE | PARTIAL | UNAVAILABLE — <reviewed, not applicable with reason, unreviewed>
Execution: INDEPENDENT | INLINE SELF-REVIEW
Requested model/effort: <explicit route or labeled configured default; UNSPECIFIED if absent>
Observed model/effort: <values + runtime evidence, or UNVERIFIED>

[SEVERITY/CONFIDENCE] file:line — <finding>
  Trigger and impact: <specific condition and consequence>
  Evidence: <code + contract/caller/check reference; residual assumption if any>
  Fix: <bounded proposed correction, not an applied edit>

Verification: <actual checks/results and reuse binding, or not run + reason>
Prior findings: <unresolved references/disposition, or none>
Open Questions: <missing evidence, effect on acceptance, next check/owner, or none>
Progression: ALLOWED | BLOCKED — <task criteria and unresolved mandatory conditions>
```

Stop after the scoped review or at a specific missing capability/input. No findings is a clean result only for covered scope; incomplete required coverage or a mandatory unknown blocks acceptance without becoming a defect. Optional uncertainty can remain explicitly non-blocking. Do not retry unavailable checks indefinitely, force another review pass without a relevant change, or invent findings to justify the review.
