---
name: writing-agents
description: Use when creating or revising a Codex reviewer skill, including its review scope, evidence requirements, output contract, or delegation instructions.
user-invocable: false
tokens: 2078
---

# Writing Codex Reviewer Skills

Author a reviewer for a defined surface and decision. Preserve the role's useful
specialist checks and caller contract; derive findings from the inspected project
rather than a universal checklist. This guide concerns reviewer instructions, not
authorization to run that review or implement its proposed fixes.

## Skill File Format

Reviewer skills live in `.codex/skills/<skill-name>/SKILL.md`. Frontmatter:

```yaml
---
name: skill-name
description: Use when reviewing the specific surface or change this role covers.
user-invocable: false
---
```

Use a contextual trigger in `description`, not a workflow summary. Keep runtime
metadata Codex-native; do not add Claude-only per-agent model or tool allow-list
fields. Superkit sources also declare `tokens`, recomputed as
`Math.round(body.length / 4)` with frontmatter excluded. This is an approximate
source-size signal, not a task budget, context measurement, or completion gate.

The project-level `.codex/config.toml` supplies configured defaults. Follow
applicable session/project model and effort routing, including explicit scoped
dispatch overrides supported by the runtime. Do not hardcode this repository's
contributor model assignments into consumer skills. When routing evidence is
required, distinguish requested/configured values from runtime-observed values;
unavailable runtime identity is UNVERIFIED, not proof of a particular model and
not by itself a new review gate.

## Context, Tools, and Authority

Begin the authored review with the selected scope: files/behavior and base/head or
working-tree diff where relevant, purpose, applicable acceptance criteria, and
exclusions. Read applicable `AGENTS.md`, then relevant conventions, architecture,
source, callers, and tests. Missing optional docs are not defects; placeholders
are not project facts. Resolve consequential scope ambiguity before claiming
coverage. Inspect relevant dependencies without silently expanding the review.

Use tools actually exposed by the runtime:

- Search file names with `rg --files` and contents with `rg`.
- Run authorized local checks with `exec_command`; inspect commands for external
  effects, credentials, and writes before running them. Local checks can produce
  disposable output, but review authority does not authorize product edits.
- Use `apply_patch` for separately authorized implementation, not reviewer fixes.
- Use `update_plan` for work that benefits from a tracked multi-step plan when
  available; its absence does not prevent an otherwise feasible review.
- Use `spawn_agent` only when delegation is authorized and available. Follow the
  scoped route; provide a clean brief with intent, exact assigned files/diff,
  relevant contracts, evidence already collected, read-only boundary, and required
  output. Collect dependent results using the runtime's supported wait mechanism
  (for example `wait_agent`). Keep unrelated work moving while waiting.

Prefer an applicable stack specialist for its assigned surface. Track who covers
the remaining files and cross-stack boundaries; `code-reviewer` can cover generic
or unclaimed scope. A specialist's existence is not evidence its review ran.
When independent review is unavailable, label any inline self-review honestly;
an unmet mandatory independent gate remains pending.

## Two-Phase Review Process

### Phase 1: Discover Applicable Checks

Choose checks from the actual change, project contracts, versions, and failure
paths. Give each check an observable invariant and a way to inspect it: relevant
files, a search pattern, a caller trace, or an authorized command. A search hit is
candidate evidence, not a finding. Read surrounding behavior and ownership.
Include relevant failure and success paths. Order consequential checks first;
size and divide the checklist by coherent coverage and risk, not an item quota.

### Phase 2: Verify and Triage

For each candidate, establish intent, trigger, affected path, concrete consequence,
and applicable contract. Inspect relevant callers or compensating controls; check
whether the issue is introduced, pre-existing, or already covered by another
finding. Deduplicate root causes while retaining distinct effects. Reuse recorded
checks only when their commands/results and relevant code, inputs, and environment
are bound and unchanged. Missing tools, failed commands, or unrun checks are
verification limits, never passing evidence.

Publish only supported findings after this analysis. Missing evidence can block a
required conclusion without proving a defect. Keep unresolved hypotheses in open
questions with the next check needed. No findings is valid for the covered scope;
it does not certify omitted scope or unperformed runtime/security testing.

## Output Contract

Preserve the caller's native verdict and fields. A plan validator may return
PASS / REVISE / BLOCK; do not force all roles into defect severity or erase their
specialist evidence requirements. When the caller uses severity/confidence:

- **CRITICAL:** supported security bypass, consequential data loss, or severe
  availability/crash path.
- **WARNING:** supported incorrect behavior, material regression, or binding
  contract violation with a stated consequence.
- **SUGGESTION:** grounded optional improvement; not a blocking defect.
- **HIGH:** relevant path and contract established by evidence.
- **MEDIUM:** supported issue with a clearly bounded residual assumption.
- **LOW:** unresolved hypothesis; report as an open question, not a counted defect.

Explain confidence qualitatively; percentages and hunches do not establish a
finding. Severity follows impact, independently of confidence. A compatible
report shape for defect reviewers is:

```text
Scope: <selected diff/files/behavior and exclusions>
Coverage: COMPLETE | PARTIAL | UNAVAILABLE — <covered and missing scope>
Execution: INDEPENDENT | INLINE SELF-REVIEW
[SEVERITY/CONFIDENCE] file:line — <supported finding>
  Trigger and impact: <condition and consequence>
  Evidence: <inspected code/contract/check; residual assumption if any>
  Fix: <bounded proposal>
Verification: <actual commands/results, or not run and why>
Open questions: <unknowns, effect on acceptance, next check; or none>
Conclusion: <native verdict; unmet mandatory conditions explicit>
```

Use real inspected locations; do not fabricate line numbers. With no findings,
say so and retain coverage, verification, and open questions. Stop at the scoped
report; applying fixes or posting external comments requires separate authority.

## Example: Dockerfile Reviewer Body

The following illustrates domain checks within the format and report contract
above; adapt it to the actual deployment rather than copying blanket rules.

```markdown
# Dockerfile Reviewer

## Scope and Context
Review the selected Dockerfiles and relevant build/deployment configuration.
Read applicable AGENTS.md and the image's runtime/reproducibility requirements.
Review only; preserve existing files and propose bounded corrections.

## Phase 1: Discover
1. Trace the effective runtime user through the selected final stage, base image,
   and deployment overrides. Check required privileges and binding project policy;
   a missing USER line alone does not prove an unsafe root execution path.
2. Inspect FROM references and the project's update/pinning policy. Determine
   whether mutable references violate a required reproducibility contract;
   a version tag alone does not establish immutable image content.
3. Trace COPY/ADD and stage boundaries for leaked secrets or build-only artifacts.
   Multiple stages are one technique, not a universal requirement; intentional
   archive extraction can justify ADD.
4. When service readiness/liveness is in scope, inspect where it is owned and
   exercised, including base-image and orchestrator configuration. An absent
   Dockerfile HEALTHCHECK alone does not establish missing health monitoring.

## Phase 2: Verify and Report
Trace candidates to actual triggers and consequences before reporting. If base
image or runtime configuration cannot be inspected, state the unresolved claim
and its effect on coverage. Use the caller's report contract, including no-findings
results and unrun checks; source inspection does not prove deployed behavior.
```
