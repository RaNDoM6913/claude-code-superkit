# Astra-native migration ledger

Baseline commit: `e0314ad46442729578bfd43f409e52b6843282fc`. The machine-readable ledger contains 579 tracked and untracked repository surfaces. Current baseline evidence is `pass-with-environment-resolution`; see `baseline.json` and `evidence/W00A/baseline/` for exact exits and outputs.

## Current GPT roadmap to 1.5.3

The [2026-10-09 roadmap](../../../superpowers/plans/2026-10-09-gpt-agent-roadmap-1.5.3.md)
is the current owner-requested plan and progress tracker. Its primary scope is
55 GPT agent roles (52 in `packages/codex`, plus 3 optional GAN roles); 9 workflows
and 21 supporting skills are tracked separately for compatibility. Ten roles
have authoring/static/integration acceptance, and zero have recorded target-model
behavioral acceptance. Two workflow callers have partial compatibility changes,
which are not counted as completed workflow migrations. These counts do not mark
the original migration gates below complete. Version 1.5.3 is the planned release
after the scoped work, mandatory acceptance, and documentation updates.

The latest [four-role delivery checkpoint](evidence/GPT-role-implementation/acceptance.md)
adds minimal-change-engineer, codebase-onboarding-engineer, scaffold-endpoint, and
ai-slop-cleaner at the source/static/integration level. G01 remains pending;
source progress does not qualify later behavioral waves or release readiness.

## Artifact accounting

Ledger, baseline, README, and checked-in evidence are inventory surfaces. Files absent from the immutable baseline commit have `baselineSha256: null`. Generated artifacts do not embed hashes of their own current contents, avoiding circular hashes while keeping their paths owned and reconciled. Ignored temporary files and `.git` are excluded by Git's own tracked/untracked enumeration; no source directory is blanket-excluded.

## Migration tasks

| Wave | Scope | Status | Evidence / report |
|---|---|---|---|
| W00A | Inventory, ledger, and repository baseline | verified | [Acceptance](evidence/W00A/report.md) |
| W00B | Behavioral corpus, scoring, and model baseline | in-progress | [Current checkpoint](evidence/W00B/recovery-corpus.md) |
| W01 | Astra/Sol runtime and proven fallback | pending | — |
| W02A | Ownership, authoring, and safe synchronization | pending | — |
| W02B | Token accounting and contract delivery | pending | — |
| W03A | Critical decisions: architect / plan-checker / critic | pending | — |
| W03B | Goal acceptance: evaluator / goal-verifier / reality-checker / minimal-change-engineer | pending | — |
| W04A | Dev orchestrator and bounded correction loop | pending | — |
| W04B | Review / audit / test / lint coordination | pending | — |
| W04C | GAN planner / generator / evaluator | pending | — |
| W05A | Implementation, debugging, and cleanup | pending | — |
| W05B | Code review, silent failures, security, and dependencies | pending | — |
| W05C | Database, migrations, and API contracts | pending | — |
| W05D | Unit/E2E tests and health evidence | pending | — |
| W05E | Documentation, onboarding, and architecture map | pending | — |
| W05F | Infrastructure, audit, and delivery helpers | pending | — |
| W06A | Go reviewers and domain depth | pending | — |
| W06B | Go utility skills and reference delivery | pending | — |
| W06C | TypeScript / Python / Rust reviewers | pending | — |
| W06D | Frontend UI umbrella and specialists | pending | — |
| W06E | Shared UI and 3D reviewers | pending | — |
| W06F | 3D / animation skills | pending | — |
| W06G | Optional domain skills | pending | — |
| W06H | Bot and design-system reviewers | pending | — |
| W07A | Core hook contracts | pending | — |
| W07B | Stack and frontend hooks | pending | — |
| W07C | Rules, authority, and always-loaded context | pending | — |
| W08A | Extras, showcase, and unmatched surfaces | pending | — |
| W08B | Installation, updater, GAN opt-in, and package closure | pending | — |
| W09 | Kit-wide verification and Astra adversarial audit | pending | — |
| W10A | Final documentation and migration handoff | pending | — |
| W10B | Conditional merge and next release | pending | — |

## Open items

- The owner resumed direct GPT-layer work on 2026-10-09. The first package updates six decision/acceptance roles with Astra-authored prompts, bounded Sol technical integration, and an independent Sol review. See [the role-core checkpoint](evidence/GPT-role-core/acceptance.md). This is a source/integration checkpoint, not completion of the pending migration waves above.

- W00A accepted after independent Sol review, two corrections, and Astra verification; original sandbox exception and successful focused rerun are preserved.
- W00B has executable lookup fixtures and partial evidence-backed scoring. The current checkpoint covers run identity, verified observations, input snapshots, and a normalized runtime model/effort gate. Live provider adapters, remaining corpus/scoring dimensions, runner, and model baselines are pending. Clean/defect reviewer scoring and a bounded read-only tree audit are implemented. Ambiguity/noise/unavailable-tool cases and partial recovery scoring are implemented. The remaining failed-verification/insufficient-tier contracts and live steering are deferred; this queue is not automatically resumed. The original baseline.json remains immutable.
- All later waves remain pending; no test, evaluation, review, or Astra gate is inferred from inventory status.
