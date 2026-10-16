---
name: ai-slop-cleaner
description: Review or remove evidence-backed redundant code and commentary within an authorized scope while preserving behavior. Use for a focused cleanup after implementation or before review, not feature work or logic fixes.
user-invocable: false
tokens: 1221
---

# AI Slop Cleaner

Improve readability by removing demonstrated redundancy without changing behavior. “AI-generated” appearance is a search hint, not evidence that code is wrong or disposable. A clean result with no changes is valid. Use after implementation or before review; in `dev-orchestrator`, these are Phase 7 — Implement and Phase 12 — Review, not a substitute for its intervening acceptance gates.

## Scope and authority

Start with the request, target diff/paths, applicable project instructions, relevant style/lint configuration, and tests/contracts. Review requests are read-only; cleanup requests permit only authorized behavior-preserving edits. Inspect relevant callers, exports, generated-code markers, and framework use before deciding something is redundant. Preserve dirty work owned by others.

If the scope or evidence is ambiguous, ask the question that resolves it and leave the uncertain code unchanged. Do not sweep the repository, reformat unrelated code, rename public APIs, add features, change configuration, or make external writes because of this role. Report logic/security defects separately for bounded authorized follow-up.

## Assess candidates, not quotas

- **Comments:** remove prose that adds no information beyond nearby code when project conventions allow. Preserve rationale, warnings, meaningful TODOs, API documentation, licenses, directives, generated markers, compiler/linter controls, and tooling annotations. A comment describing “what” can still document a public contract.
- **Helpers and abstractions:** consider simplifying wrappers, factories, strategies, generic types, interfaces, or speculative flags only when their purpose and consumers are understood. One-use helpers may express a domain, testing, transaction, resource-lifetime, or side-effect boundary; one implementation can still justify an interface. Neither count is a deletion rule.
- **Compatibility and apparent dead code:** inspect public exports, indirect/reflection-based consumers, serialization, framework callbacks, and generated uses. Preserve required parameter positions, `_` placeholders, default arms, and re-exports unless evidence establishes removal is safe within scope. Type exhaustiveness does not prove external/runtime inputs cannot reach a branch.
- **Template residue:** identify unnecessary assertions, unreachable scaffolding, empty handlers, and incomplete TODOs, but distinguish redundancy from missing behavior. Changing a swallowed error into logging, propagation, retry, or failure handling changes behavior and is not cleanup; report it separately.
- **Style:** simplify needless locals, prefixes, boolean wrappers, or verbose names only when supported by local idiom and language semantics. Preserve return types, truthiness/coercion, evaluation order, side effects, resource cleanup, public signatures, and observable behavior. A shorter expression is not automatically equivalent.

For each candidate, explain what makes it redundant and what evidence supports equivalence. Keep uncertain candidates as observations rather than labeling them safe to delete. In edit mode, apply a coherent bounded set of justified changes; no category, finding, line-reduction, or renaming quotas.

## Verification and stopping

Inspect the final diff and use focused regression evidence for affected behavior plus applicable compiler/linter checks and mandatory project gates. Compilation/lint success alone does not prove semantic equivalence. Where equivalence is uncertain and no adequate check exists, retain the original code and state the gap.

Reuse checks only when their command, result, relevant code, inputs, and environment are recorded and unchanged. Rerun for relevant changes or concrete uncertainty, not after every cleanup category by ritual. Stop once the authorized scope is assessed and supported edits are verified, or report the specific blocker without broadening the task.

## Output

Return a compact cleanup report:

- Mode and examined scope; changed paths or “no justified cleanup.”
- Applied/proposed changes with locations, rationale, and equivalence evidence.
- Uncertain candidates left unchanged, reasons they may be intentional, and separate behavior-changing findings with impact/confidence.
- Check commands/results or applicable prior evidence; not-run checks, coverage gaps, and exact remaining action.
- Execution as independent worker or inline/self-review. Follow explicit model/effort routing; report requested or labeled configured model/effort separately from observed runtime model/effort with evidence. Use UNSPECIFIED for an absent request/default and UNVERIFIED for unavailable runtime evidence. The latter is a reporting limitation, not a new acceptance gate.

Do not claim behavior preservation beyond the inspected scope and supporting evidence, or present a proposed edit as already applied.
