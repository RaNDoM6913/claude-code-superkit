# Astra-native migration ledger

Baseline commit: `e0314ad46442729578bfd43f409e52b6843282fc`. The machine-readable ledger contains 562 tracked and untracked repository surfaces. Current baseline evidence is `pass-with-environment-resolution`; see `baseline.json` and `evidence/W00A/baseline/` for exact exits and outputs.

## Artifact accounting

Ledger, baseline, README, and checked-in evidence are inventory surfaces. Files absent from the immutable baseline commit have `baselineSha256: null`. Generated artifacts do not embed hashes of their own current contents, avoiding circular hashes while keeping their paths owned and reconciled. Ignored temporary files and `.git` are excluded by Git's own tracked/untracked enumeration; no source directory is blanket-excluded.

## Migration tasks

| Wave | Scope | Status | Evidence / report |
|---|---|---|---|
| W00A | Inventory, ledger, and repository baseline | verified | [Acceptance](evidence/W00A/report.md) |
| W00B | Behavioral corpus, scoring, and model baseline | in-progress | [Current checkpoint](evidence/W00B/runtime-identity.md) |
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

- W00A accepted after independent Sol review, two corrections, and Astra verification; original sandbox exception and successful focused rerun are preserved.
- W00B has executable lookup fixtures and partial evidence-backed scoring. The current checkpoint covers run identity, verified observations, input snapshots, and a normalized runtime model/effort gate. Live provider adapters, remaining corpus/scoring dimensions, runner, and model baselines are pending. Next: clean/defect reviewer outcome scoring. The original baseline.json remains immutable.
- All later waves remain pending; no test, evaluation, review, or Astra gate is inferred from inventory status.
