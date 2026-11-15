# Codex / Claude role comparison — G7–G9

Date: 2026-11-15. Current checkpoint: G7 — ACCEPTED — independent PASS; Astra source accepted.

## Scope and acceptance

The owner requested the 13 newly rewritten Claude roles without waiting for the
remaining nine. G1–G6 source acceptance remains unchanged at Codex base
`5bf6f477999355e3e4c07bb88f9508b3d43c759e`. The new read-only Claude snapshot is
`2cf6f27f02d9a56a49c0bbb47fed8c349ad7634b`.

Work stays on `codex/astra-native-hardening` in the existing checkout. Preserve
owner WIP, immutable baseline/evidence and all Claude sources. Only the existing
native role files assigned below may change, with shared documentation updates.
The requested GAN planner's Codex source is
`packages/gan/skills/gan-planner/SKILL.md`; this one native file is in scope,
while Claude GAN agents, native generator/evaluator, rubrics and other GAN
files remain protected. No new skills or registration changes are needed:
83 ordinary Codex skills, three optional GAN skills, 66 native registry entries.

Astra owns bounded semantic authoring and accepts exact frozen source hashes;
Sol performs local fact checks and independent source review. The coordinator
integrates and verifies each group before an explicit-path signed commit.
Requested routes Astra/high and Sol/ultra are not independent runtime identity
or model-quality proof. Parallel work uses the two available worker slots.

For each role: read the pinned Claude source, native counterpart and relevant
caller/support contracts; record at most ten TAKE/KEEP/REJECT decisions before
editing. KEEP sufficient native sources byte-identical. Transfer only concrete
defect classes, corrected tool/library assertions, evidence honesty and scoped
execution safety. Retain native verdicts, confidence, coverage and ownership.
New technical assertions require local version/help/source/probe evidence or
explicit UNVERIFIED-safe wording. No installations, servers, migrations,
generators or live-model evaluation are implied by this source comparison.

Required per-commit checks: npm test; node --test test/codex*.test.js; counts,
version, phase/stale-reference, GitHub About and whitespace checks; exact token
metadata for changed files, justified size growth, caller compatibility and
independent complete source review. Source/structural/local tests do not prove
rendered UI, interaction, real transport, production behavior or model quality.

Fresh preservation snapshot: 414 existing files, including owner WIP and all
previous evidence, with the single assigned native GAN planner target excluded.
It was extended with 71 unassigned native skills verified against the base
commit, for 485 protected files before G7 commit.
Local records use `/private/tmp/superkit-g<N>-20261115-*`. This document is the
current concise checkpoint/acceptance record; old research ledgers are not
updated or promoted. Context helper observed 266,937 completed-request/response
tokens at `2026-11-15T15:35:11.625Z`; no compaction was reported.

## Group ledger

| Group | Scope | State |
|---|---|---|
| G7 | core UI/visual plus six frontend UI roles | ACCEPTED — independent PASS; Astra source accepted |
| G8 | presentation, R3F scene, UI design, frontend performance | Not started |
| G9 | optional native GAN planner | Not started |

<!-- G7-start -->
## G7 — ACCEPTED — independent PASS; Astra source accepted

Author decisions and exact source acceptance: `/private/tmp/superkit-g7-20261115-decisions.json`; author report: `/private/tmp/superkit-g7-20261115-astra.md`. Independent review: `/private/tmp/superkit-g7-20261115-review.md`.

### ui-reviewer — CHANGED

Add bounded localization/content checks to existing generic UI review.

| Decision | Candidate | Reason |
|---|---|---|
| TAKE | Content and i18n inspection | Native covers long translations and RTL but lacks explicit visible/accessibility-string localization, sentence-fragment and locale-format checks; these can miss actual supported-locale regressions. |
| KEEP | Native source/rendered/exercised split and authority | Already separates source facts from live behavior and preserves task-scoped collection, wrappers, coverage and native verdict. |
| REJECT | Hardwired contrast one-liner and WCAG fallback | No tool is necessary for this semantic transfer; native already requires applicable measured criteria and unresolved pairs stay questions. |
| REJECT | Claude agent collision, probability bands and default HEAD fallback | Codex names are distinct; native caller owns scope and uncertainty is qualitative, so these would change contracts. |

### visual-reviewer — CHANGED

Make token-map and comparable component/variant-state inspection explicit without changing eight checks or scoring.

| Decision | Candidate | Reason |
|---|---|---|
| TAKE | Token map before drift judgment | Native names token inspection but does not explicitly bind each compared scale/alias to its definition or qualify sibling fallback as observed consistency. |
| TAKE | Component and variant/state comparison | Pinned source adds useful duplicate-component evidence; add bounded contract-fit comparison without automatic replacement or universal reuse mandate. |
| KEEP | Eight native check rows, provenance and approved-rubric scoring | Existing callers retain their shape; unknown evidence never disappears from a required denominator. |
| REJECT | New eight categories and universal 100-point formula | Would replace native fields and confer unsupported precision; arbitrary drift or duplicate hit is not automatically a defect. |
| REJECT | Caller-only image availability and Claude tool restrictions | Keep actual task authority and sanitized evidence discovery, without assuming tools or wider private access. |

### frontend-ui-reviewer — KEEP

Existing native umbrella already covers useful routing, scoped coverage and report consolidation.

| Decision | Candidate | Reason |
|---|---|---|
| KEEP | Exact native aliases and authorized delegation branch | Already distinguishes recommendations, completed reports and honest inline fallback; no Agent-tool assumption. |
| KEEP | Coverage and evidence-gated specialist consolidation | Already checks decisive citations and conflicts, preserves unresolved questions and native narrative/table formats. |
| REJECT | Three-reflex CRITICAL and file-count dispatch | These create taste-based blockers or scope expansion without demonstrated impact. |
| REJECT | Claude output template, numeric confidence and mandatory local agent-path probe | Native shape/qualitative confidence/catalog routing remain binding; Claude filesystem does not establish Codex availability. |

### frontend-ui-typography-reviewer — KEEP

Existing native six-domain typography guidance already includes all transferable depth.

| Decision | Candidate | Reason |
|---|---|---|
| KEEP | Loaded/used faces, loader overrides, glyphs, ligatures and fallback | Native already traces declarations, support, consumers, loading metrics and OpenType; no omitted ligature check. |
| KEEP | Warranted font-selection procedure and self-contained references | impeccable-craft calls this procedure; rights, scripts, delivery and unverified rendering already preserved. |
| REJECT | Universal 1.25 scale, reflex family bans and hard font-display defaults | Native correctly ties severity to reader impact or real requirement; aesthetic defaults are not defects. |
| REJECT | fc-query flags/exit claims and tool-free render assumptions | No new font tool is needed; native requires verified decisive font facts and unknown runtime behavior stays unknown. |

### frontend-ui-color-reviewer — KEEP

Native already exceeds transferable contrast, theme and token safeguards.

| Decision | Candidate | Reason |
|---|---|---|
| KEEP | Resolved pairs, per-theme consumers, measured fixes and applicable standards | Native requires sufficient conversion/compositing inputs and bounds proposed fixes across affected states. |
| KEEP | APCA versus WCAG and color-only cues | Existing text distinguishes metrics and applicability without uncomputed ratios or conformance claims. |
| REJECT | Unprovided conversion one-liner, fixture math and mandatory node | Pinned prose describes algorithms but supplies no complete one-liner; importing it would imply unverified capability. |
| REJECT | HSL/palette bans, theme stereotypes and reflex severity | Native retains product constraints and concrete impact instead of taste and false universal thresholds. |

### frontend-ui-motion-reviewer — KEEP

Native already covers transferable lifecycle, interruption, reduced-motion and reporting fixes.

| Decision | Candidate | Reason |
|---|---|---|
| KEEP | Four-question framework and Before/After/Why table | impeccable-craft and umbrella remain compatible; table already includes severity/confidence and exact evidence. |
| KEEP | Per-element durations, library evidence and preference wiring | Existing ranges are explicit contextual examples; current code paths and actual library semantics control findings. |
| KEEP | Interrupted callbacks and hidden exit content | Native already traces never-fired completions, cleanup and focus/hit-test state, including disabled/reduced animation. |
| REJECT | Mandatory keyboard-motion ban, global 300ms cap, property/curve severities | These are unsupported defaults; native distinguishes user impact, versioned semantics and measured performance. |
| REJECT | Timer-only fallback example | A timer can be a design choice, but a blanket proposal does not prove correct cancellation ownership or reduced-motion behavior. |

### frontend-ui-interaction-reviewer — KEEP

Native already preserves complete control-to-recovery paths and standalone output.

| Decision | Candidate | Reason |
|---|---|---|
| KEEP | Wrapper-first checks, naming, modality and shared focus behavior | Existing native source demands real implementation/context before missing-behavior findings. |
| KEEP | Form failures, rollback, privacy-sensitive copy and bounded proposals | Existing sections already address failed/duplicate mutation, input retention, allowed actions and truthful outcome feedback. |
| REJECT | Universal target/ring/scroll compensation and motion recipes | Applicability and actual component behavior are required; native standards-aware evidence is stronger. |
| REJECT | Default ring, spinner, floating-label and wording bans | These can be valid product choices; finding needs established consequence or binding requirement, not a keyword. |

### frontend-ui-design-critic — KEEP

Native narrative already supports grounded direction, strengths, ranked change and exact counts.

| Decision | Candidate | Reason |
|---|---|---|
| KEEP | Cited narrative, explicit interpretation and one bounded prescription | Native headings and inline severity/confidence evidence preserve holistic output and umbrella attribution. |
| KEEP | Technical uncertainty routing and inspected references | Native already requires technical evidence and keeps unresolved suspicions as questions; no invented comparison. |
| REJECT | Three-reflex CRITICAL, fixed hierarchy ratio and AI-template classification | These conflict with native impact-based severity and cannot establish quality or authorship. |
| REJECT | Mandatory issue-count ranking and copied bans | Highest-impact change preserves the actual brief and observed strengths; raw counts are not a defensible priority rule. |

### Caller/support compatibility

- dev-orchestrator Phase 12: ui-reviewer/design-system-reviewer mapping and CRITICAL/WARNING + HIGH/MEDIUM triage preserved.
- frontend-ui-reviewer exact aliases, motion table and narrative critic aggregation preserved.
- impeccable-craft type-selection procedure, four-question motion framework and five native specialist names preserved.
- packages/codex/AGENTS.md role scopes and activation criteria unchanged.

### Local factual support

- No new CLI flag, external library behavior, numeric threshold or exit-code claim is introduced.
- Pinned Claude comparison source is 2cf6f27f02d9a56a49c0bbb47fed8c349ad7634b.

### UNVERIFIED / NOT RUN

- No live-model, rendered, interaction or tool-runtime qualification is claimed.

### Integrated verification

Base `5bf6f477999355e3e4c07bb88f9508b3d43c759e`; result **PASS**.

| Role | Disposition | Body chars | Growth | tokens | SHA256 |
|---|---|---:|---:|---:|---|
| ui-reviewer | CHANGED | 13672 → 14239 | 4.15% | 3560 | `0c5bd176d85689cb4daf2f1ecc44c6ad31b58cc86c8d109f35bb2c93ba243e32` |
| visual-reviewer | CHANGED | 11693 → 12495 | 6.86% | 3124 | `e93cfa33b1bbb0931202be1dbc1089a3f561d3810294b112393a009a1acfb40c` |
| frontend-ui-reviewer | KEEP | 9449 → 9449 | 0.0% | 2362 | `e143f63a327c935984afff298a85a394248581f9d0c5426c4878a80844026fbc` |
| frontend-ui-typography-reviewer | KEEP | 9297 → 9297 | 0.0% | 2324 | `b1c8b7780db2a0066d407c05caf0790702f99d939653c6ac42f49c09e22c808a` |
| frontend-ui-color-reviewer | KEEP | 10099 → 10099 | 0.0% | 2525 | `39ebbf650cb52c11a3903eca68b2df021da8c8aab039f218907e1b6078fedbce` |
| frontend-ui-motion-reviewer | KEEP | 11575 → 11575 | 0.0% | 2894 | `1d6d3fc8b3d11d23e2616f605a73a57cd4aa832222cf3a852a7dfd90a82acef6` |
| frontend-ui-interaction-reviewer | KEEP | 13867 → 13867 | 0.0% | 3467 | `9074f9d7ebf379fa0a86bb20bccb84ebb4df07c3db28507f0946d74629d9ca67` |
| frontend-ui-design-critic | KEEP | 11950 → 11950 | 0.0% | 2988 | `4bd6bac639980e4ac09c8aa01f43b7d69e068d0bb4e062560918c40fd9478154` |

| Check | Exit | Result / log |
|---|---:|---|
| npm-test | 0 | ℹ tests 133; ℹ pass 133; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0 |
| codex-tests | 0 | ℹ tests 112; ℹ pass 112; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0 |
| counts | 0 | /private/tmp/superkit-g7-20261115-counts.log |
| whitespace | 0 | /private/tmp/superkit-g7-20261115-whitespace.log |
| github-about | 0 | /private/tmp/superkit-g7-20261115-github-about.log |

Protected snapshot: 414 files unchanged. Phase/stale checks: PASS; source catalog83, optional GAN3, version1.5.3. Exact commands/log hashes: `/private/tmp/superkit-g7-20261115-verification.json`. Codex tests are a subset of the full suite, not additional unique tests.

Acceptance state: ACCEPTED — independent PASS; Astra source accepted. Git commit identity and final checkout return are observed after execution.
<!-- G7-end -->

## Stopping boundary

Finish these three groups and return the folder to `claude/opus-5-5-agents`.
No release, tag, push, package publication, merge or worktree/branch cleanup.
Preserve root AGENTS.md, docs/npm, docs/research and the owner's ZIP outside
commits. The nine still-unrewritten Claude roles remain outside this task:
ai-slop-cleaner, behavioral-nudge-engine, codebase-onboarding-engineer,
minimal-change-engineer, tree-generator, bot-reviewer, design-system-reviewer,
gan-generator and gan-evaluator.
