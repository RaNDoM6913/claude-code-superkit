# Astra-Native Superkit Hardening — Design Spec

**Date:** 2026-09-12  
**Status:** Proposed for user review  
**Branch:** `codex/astra-native-hardening`

## 1. Purpose

Evolve the GPT/Codex side of claude-code-superkit around GPT-6 Astra without
changing the product's original purpose: Superkit remains a quality-first
instruction and verification system that lets a strong execution model behave
reliably on real software work.

The original development pattern was:

```text
Claude Fable 5 designs and hardens the instructions
                    ↓
Claude Opus executes those instructions reliably
```

The GPT-native continuation is:

```text
GPT-6 Astra designs, calibrates, orchestrates, and resolves hard cases
                    ↓
GPT-5.6 Sol performs the majority of production execution
                    ↓
GPT-6 Astra accepts critical results and improves failed contracts
```

GPT-5.6 Terra and GPT-5.6 Luna may handle bounded mechanical work only after
that work has explicit contracts and verification. Cost optimization never
overrides correctness, security, or the completion of the user's stated goal.

## 2. Product Invariants

These invariants are not negotiable during the migration.

1. **Quality-first remains the product identity.** Model routing reduces waste;
   it does not introduce blanket downgrades.
2. **A stronger model hardens the instructions for the executor.** Astra's
   reasoning must be captured in reusable contracts, decision tables, failure
   modes, and tests rather than spent repeatedly on mechanical edits.
3. **No role is assigned by price alone.** The cheapest model that passes the
   role's evaluation contract may execute that role.
4. **High-risk work retains a strong-model gate.** Security, architecture,
   destructive operations, ambiguous migrations, release readiness, and
   unresolved cross-agent contradictions escalate to Astra.
5. **Evidence before completion.** Agents may not claim success without fresh
   tool output or an explicit statement of what could not be verified.
6. **The user's goal remains the primary acceptance criterion.** Passing tests
   is necessary where relevant but cannot substitute for goal verification.
7. **No silent capability loss.** A cheaper model is adopted only after it
   passes representative behavioral evaluations against the established
   baseline.
8. **Claude support remains intact.** GPT-native work must not degrade the
   existing Claude Code/Opus path. Shared invariants stay synchronized, while
   model-specific instructions may intentionally differ.
9. **Incremental migration must be recoverable.** Every wave is independently
   testable, committed, pushed, and revertible.
10. **No release from a mixed unverified state.** The next release is prepared
    only after the complete migration and kit-wide audit pass.

## 3. Why the GPT Layer Must Be Native

The current Codex package still fixes `gpt-5.5` with `xhigh` reasoning and says
that Codex has no subagent runtime, even though multi-agent support is enabled.
Many Codex skills are mechanically converted mirrors of Claude agents. This is
useful for parity, but it cannot express GPT-specific model routing, isolated
subagent context, reasoning effort, escalation, or modern Codex tool behavior.

The migration will therefore preserve shared behavioral contracts while
allowing GPT-native orchestration and tool instructions. Claude markdown is not
blindly copied into Codex, and Codex-specific improvements are not blindly
copied back into Claude.

## 4. Chosen Architecture

### 4.1 Astra as the control plane

Astra owns work where an error would propagate across many agents or invalidate
the migration:

- system architecture and model-routing policy;
- prompt archetypes and shared contracts;
- failure-mode analysis;
- ambiguous design and security decisions;
- cross-wave consistency review;
- escalation after repeated executor failure;
- final kit-wide and release-readiness audit.

Astra should not perform routine inventory, repetitive prompt conversion,
formatting, or boilerplate documentation.

### 4.2 Sol as the primary execution plane

Sol is the default implementation and prompt-rewrite model for:

- editing agents, skills, commands, and code;
- ordinary implementation and bug fixes;
- substantive documentation;
- independent code and prompt review;
- behavioral evaluation of non-critical roles;
- applying fixes from a precise Astra design brief.

Sol is the target compatibility model for the majority of shipped GPT-native
instructions. If a role cannot be made reliable on Sol without excessive
prompt size or retry loops, the role is explicitly assigned to Astra.

### 4.3 Terra and Luna as bounded utility planes

Terra may be used for structured inventory, comparison, documentation syncing,
and other work with a precise schema and deterministic validation. Luna may be
used only for simple classification, formatting, file lists, and similarly
mechanical tasks.

Neither model is automatically eligible for architecture, security findings,
production code changes, or final acceptance. Eligibility must be demonstrated
per role or task archetype.

### 4.4 Explicit routing, not accidental inheritance

Every dispatched agent must receive an explicit model and reasoning effort.
The configuration also provides a Sol fallback for any dispatch that omits a
model accidentally. Full conversation history is not copied into a worker
unless the worker genuinely needs it; workers receive a scoped task packet.

Initial routing target:

| Work class | Default model | Effort | Escalation |
|---|---|---:|---|
| System design and prompt architecture | GPT-6 Astra | high | xhigh for unresolved risk |
| Routine orchestration | GPT-6 Astra | medium | high on conflict |
| Prompt/code implementation | GPT-5.6 Sol | medium | high, then Astra |
| Independent substantive review | GPT-5.6 Sol | high | Astra for critical/ambiguous findings |
| Security and release acceptance | GPT-6 Astra | high | xhigh when evidence conflicts |
| Structured inventory and doc synchronization | GPT-5.6 Terra | low/medium | Sol on ambiguity |
| Formatting and deterministic clerical work | GPT-5.6 Luna | low | Terra or Sol on ambiguity |

This table is an initial policy to validate, not an assumption that every task
must use the cheapest listed model.

## 5. The Astra-Grade Instruction Contract

Every migrated agent, skill, command, or orchestrator must define the following
where applicable:

1. **Purpose:** one clear responsibility.
2. **Trigger:** when it runs and when it must not run.
3. **Scope:** files, diff, subsystem, or evidence boundary.
4. **Inputs:** the exact task packet and project context required.
5. **Authority:** read-only, edit, external write, or approval-gated actions.
6. **Decision logic:** explicit defaults and tables for ambiguous cases.
7. **Failure modes:** the predictable ways a weaker executor drifts.
8. **Evidence gate:** what must be observed before a finding or claim is valid.
9. **Tool protocol:** tool order, fallbacks, and prohibited shortcuts.
10. **Context budget:** what to load, what not to load, and when to compact.
11. **Output contract:** stable fields, enums, and actionable results.
12. **Verification gate:** commands or checks required before completion.
13. **Escalation:** when to retry, reuse the worker, ask the user, or invoke
    Astra.
14. **Stop conditions:** maximum iterations and honest incomplete outcomes.
15. **Recap:** short reinforcement of non-negotiable instructions.

Not every file needs fifteen headings. The contract describes required
semantics; small roles should express them compactly.

## 6. Migration Pipeline for Each Wave

Each wave contains a small, related set of components and follows the same
pipeline:

1. **Baseline:** record current prompts, behavior, tests, token sizes, and known
   contradictions.
2. **Astra brief:** define role boundaries, failure modes, routing, and binary
   acceptance criteria.
3. **Sol rewrite:** implement the brief across the wave.
4. **Independent attack:** a separate Sol context looks for ambiguity,
   capability loss, false claims, conflicts, and unnecessary token cost.
5. **Behavioral evaluation:** run representative fixtures with the intended
   executor model.
6. **Correction:** improve the instruction before escalating the executor model.
7. **Astra gate:** review critical roles, unresolved disagreements, and the
   wave-level consistency report.
8. **Repository verification:** run relevant unit, smoke, hook, mirror, count,
   and documentation checks.
9. **Atomic commit and push:** commit only the verified wave; record remaining
   work in the master checklist.

An agent report is evidence to inspect, not proof by itself. The coordinator
must verify filesystem changes and test output before accepting a wave.

## 7. Work Phases

### Phase 0 — Inventory and measurable baseline

- enumerate every agent, command, skill, rule, hook, package, mirror, and test;
- build a source-to-mirror ownership map;
- identify obsolete model names, tool names, and Codex capability claims;
- record token sizes and the largest repeated instruction blocks;
- run the existing full test and integrity suites;
- define representative behavioral fixtures and scoring;
- create the master migration ledger with one row per surface.

Exit gate: the repository has a complete inventory, baseline test result, and no
unowned migration surface.

### Phase 1 — GPT-native runtime and orchestration foundation

- set Astra as the top-level Codex model;
- set Sol as the safe default subagent model;
- specify explicit per-dispatch model and effort;
- remove obsolete statements that Codex has no subagents;
- define scoped task packets and clean-context defaults;
- define concurrency, retry, escalation, and budget policies;
- update the installer messages and tests that assert old model names.

Exit gate: a small end-to-end orchestration fixture proves Astra can delegate a
bounded task to Sol, receive a structured result, verify it, and escalate.

### Phase 2 — Authoring standards and source ownership

- harden `writing-agents` and `writing-commands` for GPT-native output;
- define shared contract fragments and model-specific overlays;
- replace blind conversion assumptions with explicit ownership rules;
- add static validation for frontmatter, tools, models, and required contracts;
- add drift detection between shared Claude and Codex invariants.

Exit gate: a new or migrated agent can be produced reproducibly without manual
copy drift.

### Phase 3 — Critical reasoning core

Migrate first:

1. `architect`
2. `plan-checker`
3. `critic`
4. `evaluator`
5. `goal-verifier`
6. `reality-checker`
7. `minimal-change-engineer`

These agents define the quality gates used by later waves, so later migration
must not begin until this core passes behavioral evaluation on Sol and the
critical decisions pass Astra review.

### Phase 4 — Orchestrators

- `dev-orchestrator`;
- `review-orchestrator`;
- `audit-orchestrator`;
- test and lint runners;
- GAN planner, generator, and evaluator loops.

Required additions include routing tables, task-packet schemas, context limits,
maximum correction loops, result deduplication, worker reuse, and Astra
escalation conditions.

### Phase 5 — Core production agents

Migrate in independently reviewable clusters of approximately four to seven
related roles:

1. implementation and scaffolding;
2. code quality and AI-slop cleanup;
3. code review and silent-failure detection;
4. security and dependency analysis;
5. database, migrations, and API contracts;
6. testing and end-to-end testing;
7. documentation, onboarding, and tree generation;
8. health, infrastructure, audit, and pre-deploy validation.

The exact membership of each cluster is finalized from the Phase 0 inventory.

### Phase 6 — Stack and frontend specialists

- Go reviewers and knowledge references;
- TypeScript, Python, and Rust reviewers;
- frontend-ui umbrella and specialists;
- frontend-3d agents and skills;
- optional domain skills.

Specialists retain domain depth. Token reduction is permitted only after
duplicated general policy moves to a reliable shared contract.

### Phase 7 — Hooks and rules

Hooks remain deterministic programs; they are not assigned an LLM model. Their
interface to GPT is hardened:

- concise actionable failures;
- stable machine-readable reason codes where useful;
- correct blocking versus advisory semantics;
- bounded output size;
- no repeated context dumps;
- clear remediation and exit codes;
- tests for false blocks and malformed inputs.

Rules are checked for conflicting instructions, excessive always-loaded text,
obsolete model assumptions, and overlap with skills or `AGENTS.md`.

### Phase 8 — Remaining packages and synchronization

- GAN package;
- extras;
- showcase;
- installer and updater;
- conversion and synchronization tooling;
- Codex installation package;
- counts, manifests, examples, and generated mirrors.

Exit gate: no known old-model claim, orphaned mirror, or undocumented source of
truth remains.

### Phase 9 — Kit-wide verification

- validate all frontmatter and model identifiers;
- validate tool names and availability assumptions;
- run Claude/Codex shared-invariant checks;
- run installer unit and smoke tests;
- run the full hook suite;
- run `npm test` and integrity/count checks;
- execute the behavioral evaluation corpus on the assigned models;
- compare quality and cost proxies against the baseline;
- run an Astra kit-wide adversarial audit;
- verify every row of the migration ledger is closed or explicitly deferred.

Exit gate: all mandatory checks pass, no critical finding remains, and every
model downgrade is supported by evaluation evidence.

### Phase 10 — Documentation and release

- update README positioning, badges, counts, and model descriptions;
- update Codex `AGENTS.md`, installation guide, and configuration examples;
- update architecture and authoring guides;
- add model-routing and migration documentation;
- update `CHANGELOG.md` continuously and finalize its release section;
- verify `VERSION` and `package.json` match;
- update GitHub About after count or positioning changes;
- perform final release audit;
- merge the migration branch and publish the next sequential release only on
  the user's explicit release instruction.

Documentation needed to keep an intermediate commit truthful is updated in that
same wave. Marketing-level repositioning and final release notes are completed
after the full migration.

## 8. Evaluation Strategy

### 8.1 Static contract checks

- valid frontmatter and unique names;
- valid current model identifiers;
- no unavailable or legacy tool instructions;
- consistent severity, confidence, verdict, and completion enums;
- no contradictory edit/read-only authority;
- no obsolete claim that Codex cannot dispatch subagents;
- accurate token metadata;
- shared invariants synchronized across Claude and Codex.

### 8.2 Behavioral fixtures

Fixtures cover at least:

- a clean case with zero findings;
- a genuine defect with exact evidence;
- an ambiguous case that must become an open question or escalation;
- a task with irrelevant repository noise;
- a tool or dependency unavailable at runtime;
- a verification command that fails;
- a user steering correction during execution;
- a task where the cheapest eligible model is insufficient.

### 8.3 Acceptance dimensions

Each role is scored on:

- goal completion;
- instruction and scope adherence;
- evidence quality;
- false-positive and false-negative behavior;
- tool correctness;
- recovery from failure;
- output-contract validity;
- number of retries and escalations;
- prompt, input-context, and output-token size.

Sol adoption requires all binary invariants to pass and no critical regression
from the baseline. Terra or Luna adoption additionally requires deterministic
validation of the produced artifact. A failed evaluation first triggers prompt
improvement; model escalation is the fallback, not the first repair.

## 9. Git and Delivery Strategy

All migration work stays on:

```text
codex/astra-native-hardening
```

Rules:

- one independently meaningful commit per verified wave;
- push after each stable checkpoint;
- no force push and no bypassing hooks;
- keep a continuously updated migration ledger;
- do not mix unrelated cleanup into migration commits;
- preserve user changes and investigate any unexpected dirty file;
- merge only after Phase 9 passes;
- publish a release only when the user explicitly asks.

Expected commit progression:

```text
docs(codex): define astra-native hardening architecture
test(codex): capture migration baseline and prompt contracts
feat(codex): add tiered model routing
refactor(codex): harden critical reasoning agents
refactor(codex): harden orchestrators
refactor(codex): harden <wave-name> agents
test(codex): complete cross-model behavioral evaluations
docs(codex): document astra-native orchestration
release: prepare vNext
```

## 10. Explicit Non-Goals

- Replacing the Claude Code/Opus implementation during the GPT-first phase.
- Assigning every agent to Astra.
- Downgrading every executor to the cheapest available model.
- Rewriting all files in one unreviewable batch.
- Treating lower API price as proof of lower subscription-limit consumption.
- Counting prose polish as behavioral improvement without evaluations.
- Publishing a release before the user asks.

## 11. Completion Definition

The migration is complete only when:

- every in-scope repository surface appears in the migration ledger;
- every migrated GPT role has an explicit model, effort, contract, and
  escalation policy;
- Sol successfully executes the majority of production roles under behavioral
  evaluation;
- cheaper models are limited to roles they have demonstrably passed;
- critical decisions retain Astra acceptance;
- all repository, installer, hook, mirror, and behavioral checks pass;
- Claude support has no detected regression;
- documentation reflects the final system;
- the user approves the completed migration and explicitly requests release.

The intended result is not merely “Superkit uses Astra.” The result is a
Superkit whose reusable instructions preserve Astra-level reasoning discipline
while spending Astra tokens only where that added capability changes the
outcome.
