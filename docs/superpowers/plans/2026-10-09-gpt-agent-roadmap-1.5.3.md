# Codex-only Superkit delivery plan — 1.5.3 candidate

**Status:** Active scope from the owner's 2026-10-15 direction. Standalone installation/update implemented; compatibility and final release candidate remain open.
**Outcome:** A standalone, automated Codex-only install and distributable artifact in this repository, with preserved user customizations and accurate documentation.
**Routing:** Astra owns all useful prompt refinement and semantic decisions; Sol provides technical integration/review. Claude prompt work is separate.
**Agreement:** [Contributor working agreement](../../WORKING_AGREEMENT.md).

## Accepted source and scope

- Reuse the 55 Astra-authored role sources and K01's four accepted support sources. Do not repeat accepted authoring merely to fill a queue.
- Source/static/integration acceptance is recorded in the [role evidence](../migrations/astra-native/evidence/GPT-final-five-roles-2026-10-14/acceptance.md) and [K01 evidence](../migrations/astra-native/evidence/GPT-K01-guides-G01-path-2026-10-14.md). These records do not establish empirical model quality.
- Review the nine workflow and 21 support skills for applicable shipped compatibility. Fix concrete gaps; compatible sources need no rewrite. Optional GAN remains separately opt-in.
- Preserve native prompt ownership, immutable baseline/evidence, user files, shared safety invariants and existing Claude installation behavior. No broad Claude rewrite.
- Universal BEH55, W00B, G01/G02, provider attestation, cheaper-model eligibility and collector queues are outside this product scope. They are neither release prerequisites nor claimed complete. Historical BEH0/55 is not a product completion percentage.
- The [archived research roadmap](2026-10-09-gpt-agent-roadmap-1.5.3-ARCHIVED-research.md), [old design](../specs/2026-09-12-astra-native-superkit-design.md) and old hardening plan are historical references, not execution queues.

## 1. Standalone install and safe updates

- [x] Add an explicit Codex-only automated install route and document its artifact/CLI contract. The existing `--codex` route is additive Claude + Codex; manual copying is not this deliverable.
- [x] Determine fresh/merge/upgrade from `.codex` independently of `.claude`; define backup, conflict reporting and update behavior for existing Codex installations.
- [x] Preserve customized skills, config, rules and unrelated user files; exercise existing native ownership/converter protection and filesystem safety boundaries. Resolve the known consumer-skill overwrite risk.
- [x] Verify fresh installation into a clean target, merge into a customized target and upgrade from the supported previous release in isolated directories. Inspect the actual installed files and packaged artifact.

Installation evidence: [2026-10-15 installation packet](../migrations/astra-native/evidence/GPT-codex-installation-2026-10-15.md). The selector is `--codex-only`; the existing package artifact includes both harnesses, but this route installs only Codex assets. Discovery uses `.agents/skills` links to retained `.codex/skills` storage.

## 2. Shipped workflow and support compatibility

- [ ] Check applicable workflow/support invocation, tool names, routing, outputs and references against actual Codex capabilities and installed paths; Astra fixes only confirmed semantic gaps.
- [ ] Verify current supported Codex hook/rule mechanisms before claiming support or parity. Map applicable behavior through supported mechanisms and document limitations; do not build a runtime emulation framework.
- [ ] Keep truthful evidence, authority checks, failure handling and escalation in shipped prompts. Missing verification remains explicit; destructive actions and external writes retain their authorization boundaries.
- [ ] Confirm that the documented Codex-only workflow can use its installed roles/support without requiring a Claude installation. Scope any runtime smoke to the actual tools exercised; model evaluations require separate authorization.

## 3. Focused verification and acceptance

- [x] Add or adapt focused tests for Codex-only fresh/merge/upgrade, preservation/backup/conflicts and an end-to-end install/use path, including the existing additive route where affected.
- [x] Run the stable integrated result through `npm test`, `npm run test:smoke`, core hook tests and all three frontend-ui hook test scripts; run other applicable wired hook suites when affected.
- [x] Complete the existing integrity rule, `bash bin/superkit-counts-verify.sh --check-remote`, version/count/phase consistency and `git diff --check`. An unavailable mandatory check is a reported blocker, never an assumed pass.
- [x] Obtain one independent Sol review of the coherent product changes; Astra accepts semantic/critical decisions and the final result. Re-review only materially changed risk.
- [x] Record one compact acceptance report with actual install/test evidence, limitations and Git state. Deterministic tests do not establish model quality or production behavior.

## 4. Documentation and release candidate

- [ ] Align README, contributor docs, Codex install/usage guides, affected catalogs and changelog with the actual delivered interface, counts and supported capabilities; distinguish Astra source authorship from historical Claude work.
- [ ] Inspect all changes since the previous release, package contents and the existing distribution workflow. Do not silently include unfinished Claude work or research dependencies.
- [ ] Verify current release/tag availability before selecting 1.5.3; synchronize version files and candidate release notes only with the accepted final scope. Do not skip a version if it is already taken.
- [ ] Present the concrete candidate commit, artifact, verification and remaining limitations. Merge, tag, release publication and any new distribution channel require the owner's separate approval.

## Completion and continuation

Product readiness means the standalone install, safe update behavior, applicable compatibility, required checks and candidate documentation above are accepted. It does not require finishing the archived research program.

Continue from the next unchecked product item only within current task authorization. The installation milestone does not close the later compatibility/release scope. Keep work on `codex/astra-native-hardening`, preserve unrelated changes, and never force-push or bypass hooks. Follow the 500,000-token context/handoff policy in the working agreement. Report accepted capabilities, mandatory remaining work, evidence limits and Git state without an invented percentage.
