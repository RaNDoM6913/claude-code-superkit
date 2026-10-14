---
name: writing-commands
description: Use when creating or revising a Codex user-invocable workflow skill, including its inputs, phases, delegation, verification, or completion contract.
user-invocable: false
tokens: 2280
---

# Writing Codex User-Invocable Skills

A command-like Codex workflow is a skill in
`.codex/skills/<skill-name>/SKILL.md` with `user-invocable: true`, rather than a
Claude slash-command file. Author one defined outcome with explicit inputs,
authority, verification, and a stopping condition. Reuse an accepted workflow
when revising it; preserve useful domain phases and mandatory project gates.

## Skill File Format

```yaml
---
name: workflow-name
description: Use when the user requests the specific outcome this workflow serves.
user-invocable: true
---
```

Put input interpretation and workflow phases in the body. Use a contextual trigger
in `description`; do not add Claude-only per-agent model or tool allow-list
metadata. Superkit sources also declare `tokens`, computed with
`Math.round(body.length / 4)` excluding frontmatter. This source-size estimate is
not a runtime token budget, progress measure, or permission to truncate required
work. Project configuration supplies model/effort defaults; honor applicable
session/project routing and supported scoped dispatch overrides. Consumer examples
must not impose this repository's contributor model assignments.

## Inputs and Scope

Define the outcome, target, mode, constraints, accepted plan, and acceptance checks
before taking consequential action. Read applicable `AGENTS.md` and inspect the
relevant project evidence. Treat input examples as supported forms with an
explicit interpretation, not a license to guess:

- **Empty target:** use an established default only if the skill defines it and
  it fits the request. Otherwise resolve the missing target.
- **Mode keyword:** choose a documented mode; unknown text is not silently a mode.
- **Branch/ref:** resolve it in the intended repository and state the comparison
  semantics (for example merge-base versus direct base/head diff). A branch can
  mean a target or a base; clarify when the request leaves a material ambiguity.
- **PR reference:** resolve repository and PR identity with available authorized
  tooling. A bare number is not inherently a PR. Reading PR context does not
  authorize comments, branch changes, merges, or publication.
- **Other text:** retain the user's requirements; do not interpolate raw input
  into shell commands. Use structured tool arguments or proper shell quoting,
  validate refs/paths and option boundaries, and avoid exposing secrets in output.

Proceed with supported independent work while resolving a blocker. Report the
specific missing input or capability; do not substitute another repository, diff,
mode, or mutating action to make the workflow appear complete.

## The Orchestrator Pattern

Choose phases that serve the requested result. A typical implementation workflow
may use the following; a read-only review or test run does not acquire edit
authority from this example.

```text
Understand -> establish requested result, scope, authority, and project facts
Plan       -> reuse the accepted plan; track material multi-step work if useful
Execute    -> perform only the authorized operations, preserving unrelated user work
Verify     -> run relevant checks and required acceptance gates; inspect results
Review     -> obtain the required review with its native verdict and coverage
Document   -> update affected docs when part of the authorized deliverable
Report     -> state result, evidence, remaining work, and the stopping condition
```

Tests belong with verification; select behavior and failure-path checks relevant
to the change and risk. Do not add tests that merely mirror prose or constants.
An implementation skill must complete required integration and error paths within
scope. A review/plan skill stops at its assessment unless implementation is also
authorized. Branch creation, commits, pushes, messages, and releases each follow
the task's actual authority; none is an automatic final phase of every workflow.

Use tools exposed by the runtime: `rg`/`rg --files` for search, `exec_command` for
shell checks, `apply_patch` for authorized manual edits, and `update_plan` when a
tracked plan is useful and available. Missing tools require a stated limitation
or an available authorized equivalent, not invented execution. Inspect existing
commands and their effects before running them; tests/builds can contact services,
write data, or require credentials. Preserve existing user edits and distinguish
generated check output from deliverable changes.

## Dispatching Subagents

Use `spawn_agent` only when delegation is authorized and available. Give workers
bounded, disjoint ownership or suitable isolation, and use clean task context
where supported. Keep shared interfaces and final acceptance with the coordinator.
Apply explicit scoped model/effort routing; otherwise use the configured default.
Do not describe requested routing as observed runtime identity without evidence.

A reviewer brief should preserve the actual role contract, for example:

```text
Review only the assigned TypeScript changes.
Outcome and scope: <intent, repository, exact base/head or diff, assigned files>
Contracts and evidence: <relevant project rules, callers, recorded checks/results>
Boundaries: <read-only review, exclusions, other reviewers' ownership>
Return: <native verdict, supported findings or no findings, coverage, checks,
         open questions, and unmet mandatory conditions>
```

Use the available wait/collection mechanism, such as `wait_agent`, to obtain every
result required for acceptance; continue independent work meanwhile. Inspect and
integrate the results rather than treating dispatch as review completion. If a
required worker fails, is unavailable, or cannot cover its scope, report the gap.
Inline self-review is not independent review and cannot replace a mandatory
independent gate. Re-review changed assumptions or unresolved issues when needed;
do not repeat unchanged passes without a concrete reason.

## Stack and Check Discovery

Stack markers are clues, not complete toolchain or command evidence:

```text
go.mod                         -> inspect Go version, module/workspace, test rules
package.json + tsconfig.json    -> inspect scripts, workspace, lockfile, TS config
pyproject.toml/requirements.txt -> inspect Python environment and test configuration
Cargo.toml                     -> inspect Rust workspace, features, toolchain
```

Prefer project commands from `AGENTS.md`, scripts, `Makefile`, or CI. Resolve the
working directory, package manager, prerequisites, relevant flags, and target scope.
A repository can contain several stacks; report which are applicable or uncovered.
Do not install dependencies or change configuration merely because detection is
incomplete. Carry genuine setup blockers into the result under existing authority.

## Example: Test-Runner Body

Use the user-invocable format above with a trigger such as “Use when the user asks
to run the project's tests or verify a selected test target.” The body can be:

```markdown
# Test Runner

1. Establish repository, requested test target, and applicable AGENTS.md guidance.
   Preserve user files; this workflow runs tests and reports, without automatic fixes.
2. Discover the canonical command, working directory, and prerequisites from project
   scripts/configuration or CI. Stack markers guide discovery. For example, go.mod
   suggests inspecting Go test configuration; it does not prove go test ./... covers
   required build tags, workspace modules, or integration setup.
3. Check command effects against the authorized scope. If safe execution depends on
   missing setup, access, or clarification, name that blocker and continue only the
   independent supported checks. Do not fabricate a passing fallback.
4. Run the selected command with an available execution tool and inspect its exit
   status and output. An empty selection, skipped tests, timeout, unavailable runner,
   or failing setup is not a passing requested suite, even if a wrapper exits zero.
5. Report exact command/directory/target, result, relevant failure lines without
   secrets, skipped or unrun scope, and remaining required verification. Stop here;
   repairs require implementation authority.
```

## Completion Contract

Conclude against the requested result and mandatory acceptance criteria. Report
what changed or was inspected, actual verification commands and outcomes, coverage
limits, and the next concrete action for unresolved work. An unrun, failed, or
unavailable required gate leaves the deliverable INCOMPLETE even when edits are
finished; distinguish implementation status from acceptance status. Optional
unknowns need not block an otherwise satisfied contract.

A build, static check, source review, or skill metadata check establishes only that
evidence level. Do not call it runtime, deployment, or live model acceptance. If
real output/context limits prevent completion, save a coherent checkpoint with
changes, remaining work, and verification state; resume only after checking for
intervening edits. A phase count, token count, dispatched worker, or created branch
is not proof of the user's outcome.
