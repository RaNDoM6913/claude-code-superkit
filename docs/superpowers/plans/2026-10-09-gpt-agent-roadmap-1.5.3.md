# Codex-only Superkit delivery plan — 1.5.3

**Status:** v1.5.3 published on GitHub and npm on 2026-10-16 after explicit owner authorization; both downloaded artifacts and a fresh-cache registry install are verified. Release delivery is complete. See the [release delivery record](../../releases/1.5.3.md).
**Outcome:** A standalone, automated Codex-only install and distributable artifact in this repository, with preserved user customizations and accurate documentation.
**Routing:** The coordinator owns scope, integration and acceptance. Under the owner's latest 2026-10-15 direction, delegate useful independent work to GPT-6.1 Sol; this supersedes the earlier contributor Astra/Sol split for continuation. Preserve accepted Astra-authored sources and shipped consumer model defaults. Claude prompt work remains separate.
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

- [x] Check applicable workflow/support invocation, tool names, routing, outputs and references against actual Codex capabilities and installed paths; Astra fixes only confirmed semantic gaps.
- [x] Verify current supported Codex hook/rule mechanisms before claiming support or parity. Map applicable behavior through supported mechanisms and document limitations; do not build a runtime emulation framework.
- [x] Keep truthful evidence, authority checks, failure handling and escalation in shipped prompts. Missing verification remains explicit; destructive actions and external writes retain their authorization boundaries.
- [x] Confirm that the documented Codex-only workflow can use its installed roles/support without requiring a Claude installation. Scope any runtime smoke to the actual tools exercised; model evaluations require separate authorization.

Compatibility evidence: [2026-10-15 workflow/hooks packet](../migrations/astra-native/evidence/GPT-codex-workflows-hooks-2026-10-15.md). Nine workflows and all 21 support skills inspected; 13 necessary source corrections, 17 support sources unchanged. Two native command handlers are installed with preserved user configuration. Checks cover source/package discovery, native rule parsing and direct installed handlers; native lifecycle firing was subsequently observed in the separately trusted disposable fixture below; other projects still require their own project/hook trust. This scoped acceptance does not claim live workflow/model quality or full Claude hook parity.

Native activation and candidate evidence: [2026-10-15 reviewed local candidate](../migrations/astra-native/evidence/GPT-codex-native-activation-candidate-2026-10-15.md). PreToolUse denial and Stop continuation/completion were observed in actual Codex; one partial timed-out probe is preserved alongside the successful bounded successor. This does not qualify other runtimes or model behavior.

## 3. Focused verification and acceptance

- [x] Add or adapt focused tests for Codex-only fresh/merge/upgrade, preservation/backup/conflicts and an end-to-end install/use path, including the existing additive route where affected.
- [x] Run the stable integrated result through `npm test`, `npm run test:smoke`, core hook tests and all three frontend-ui hook test scripts; run other applicable wired hook suites when affected.
- [x] Complete the existing integrity rule, `bash bin/superkit-counts-verify.sh --check-remote`, version/count/phase consistency and `git diff --check`. An unavailable mandatory check is a reported blocker, never an assumed pass.
- [x] Obtain one independent Sol review of the coherent product changes; Astra accepts semantic/critical decisions and the final result. Re-review only materially changed risk.
- [x] Record one compact acceptance report with actual install/test evidence, limitations and Git state. Deterministic tests do not establish model quality or production behavior.

## 4. Documentation and release candidate

- [x] Align README, contributor docs, Codex install/usage guides, affected catalogs and changelog with the actual delivered interface, counts and supported capabilities; distinguish Astra source authorship from historical Claude work.
- [x] Inspect all changes since the previous release, package contents and the existing distribution workflow. Do not silently include unfinished Claude work or research dependencies.
- [x] Check current release/tag availability: v1.5.3 was not observed on 2026-10-15; recheck at any future release decision. No version selected.
- [x] Owner-authorized release: selected 1.5.3, synchronized versions/notes/docs, corrected GitHub About, merged PR #1 and published the annotated tag plus verified GitHub release assets.
- [x] Complete npm registry delivery: version `1.5.3` and the `latest` tag verified; the registry tarball matches the GitHub artifact byte-for-byte, and a fresh-cache registry install reports `1.5.3`, 82 skills and no `.claude`.
- [x] Present the concrete candidate commit, artifact, verification and remaining limitations. Merge, tag, release publication and any new distribution channel require the owner's separate approval.

## Completion and continuation

Product readiness means the standalone install, safe update behavior, applicable compatibility, required checks and candidate documentation above are accepted. It does not require finishing the archived research program.

The authorized 1.5.3 delivery is complete. Continue only with a new concrete owner request; do not reopen historical research or repeat accepted gates as an automatic queue. Keep work on `codex/astra-native-hardening`, preserve unrelated changes, and never force-push or bypass hooks. Follow the 500,000-token context/handoff policy in the working agreement. Report accepted capabilities, mandatory remaining work, evidence limits and Git state without an invented percentage.
