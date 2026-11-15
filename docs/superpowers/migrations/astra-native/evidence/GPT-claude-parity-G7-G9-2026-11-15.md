# Codex / Claude role comparison — G7–G9

Date: 2026-11-15. Current checkpoint: G9 — ACCEPTED — independent PASS; Astra source accepted.

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
| G8 | presentation, R3F scene, UI design, frontend performance | ACCEPTED — independent PASS; Astra source accepted |
| G9 | optional native GAN planner | ACCEPTED — independent PASS; Astra source accepted |

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

<!-- G8-start -->
## G8 — ACCEPTED — independent PASS; Astra source accepted

Author decisions and exact source acceptance: `/private/tmp/superkit-g8-20261115-decisions.json`; author report: `/private/tmp/superkit-g8-20261115-astra.md`. Independent review: `/private/tmp/superkit-g8-20261115-review.md`.

### presentation-reviewer — CHANGED

Add explicit callback-driven layer/state restoration across reverse scroll, jumps and rebuilt timelines.

| Decision | Candidate | Reason |
|---|---|---|
| TAKE | Direction-aware callback state | Native covers reverse/large jumps generally, but does not explicitly trace one-way callbacks writing discrete state; pinned source identifies a concrete stale-layer failure. |
| KEEP | 16 native domains and installed-version lifecycle checks | Dependency updates, async ownership, cleanup, normalized extent and refresh are already explicit; no repeat expansion needed. |
| REJECT | Hardwired GSAP defaults, seven-area replacement and rule-premise severity | Version-specific facts are inspection leads; native rows, impact severity and task authority remain binding. |
| REJECT | Opacity/pointer compound claim | Pointer-event suppression does not establish keyboard exclusion; native already treats those independently. |

### r3f-scene-reviewer — CHANGED

Explicitly correlate asset extension requirements/decoders and actual texture assignment path.

| Decision | Candidate | Reason |
|---|---|---|
| TAKE | Required versus optional asset extensions and loader path | Native generic loader/decoder guidance can miss required extension/configuration mismatch and fallback branches; trace selected metadata to actual decoder and failure owner. |
| TAKE | Declarative versus imperative texture assignment | Pinned source exposes materially different handling in a specific version; require inspection of both routes rather than universal tagging claims. |
| KEEP | 15 checks, GPU/source distinction, shared ownership and errors | Native protects all existing caller fields and handles disposal/caching/load boundaries without default recipes. |
| REJECT | Binary rg as complete asset parser, fixed CDN/default claims and automatic severity | These can misstate asset coverage, version behavior or impact; absent metadata/source remains UNKNOWN. |

### ui-design-reviewer — CHANGED

Add bounded paired DOM/canvas review mapped to existing16 rows.

| Decision | Candidate | Reason |
|---|---|---|
| TAKE | Input ownership and equivalent task state | Native generic interaction checks do not explicitly connect overlay/portal hit-testing to canvas control state and keyboard alternatives. |
| TAKE | Informative versus decorative canvas and real alternatives | An accessible label alone may not carry required task information; inspect information and supported actions with the scene unavailable. |
| TAKE | Motion and load-failure paths preserve essential DOM | Native states cover general loading/motion but not scene gates across WebGL failure, context loss and canvas-specific motion. |
| KEEP | Existing scope and16-check/report contract | Do not replace broad assigned UI design scope with a strict 3D-only rejection or7-row output. |
| REJECT | Universal null fallback, viewport-unit or contrast defaults | Actual content/criteria/state determine defects; no new mandatory tool or fallback standard. |

### frontend-perf-reviewer — CHANGED

Make competing eager imports, failed deferred loads and self-invalidating effects explicit.

| Decision | Candidate | Reason |
|---|---|---|
| TAKE | Static reachability alongside dynamic import | Native warns dynamic import alone is insufficient but lacks explicit second eager path; inspect actual entry reachability without claiming emitted chunks. |
| TAKE | Deferred chunk rejection and recovery ownership | Trace lazy/framework loading boundary, error path and usable recovery; no blanket React-root-unmount or severity claim. |
| TAKE | Effect writes into its own dependencies | Native general effect/render-loop coverage benefits from an explicit self-invalidating update trigger with guards/convergence checked. |
| KEEP | 12 domains, static/lab/field separation and workload evidence | No new metrics, budgets, caller labels or authority. |
| REJECT | Fixed Vite/React consequences and measured-bundle routing replacement | Actual installed versions and bound build evidence control conclusions; preserve native broader measurement assignment. |

### Caller/support compatibility

- Preserve presentation16, R3F15 per-file, UI-design16 and perf12 checks with native report and progression semantics.
- Native AGENTS catalog and actual authorized assigned scopes remain valid.
- r3f-scroll-driven-3d and threejs-color-management contain recipes, not authority to override inspected project versions or review findings; no support file edits.

### Local factual support

- Exact cached source facts supplied by independent reviewer at /private/tmp/superkit-g7-g9-20261115-facts/source; proposed wording is version-conditional.
- Native report/stop sections are byte-identical to G7 HEAD, and domain row counts remain16/15/16/12.
- New guidance requires actual installed-version inspection; it adds no hardcoded version/default/CLI/exit claim.
- Durable exact-version anchors below were read from pre-existing local cache archives, with package/package.json identity and archive SHA-512 verified. They were not installed or executed for this task. Downstream project versions remain to be resolved.
- GSAP 3.14.2 src/gsap-core.js:1530,2659: Timeline.call and delayedCall callback paths; reverse/jump behavior still depends on suppression, boundaries and the application state owner.
- R3F 8.18.0 dist/events-776716bd.esm.js:750–757: conditional JSX texture assignment branch. This is not a universal texture/default guarantee; compare the actual imperative/declarative path.
- Drei 9.122.0 core/Gltf.js:8–27 and web/Html.js:123–159,164–191,230–247: configured loaders, portal/event/occlusion branches; no browser/accessibility behavior was exercised.
- Three-stdlib 2.36.1 loaders/GLTFLoader.js:186–196,724–740,831–850,998–1006: extension and decoder handling. Application asset requirements and fallback remain independently verified inputs.
- Vite 6.4.1 dist/node/chunks/dep-D4NMHUTW.js:7883–7894: mixed static/dynamic import condition. Source reachability does not establish emitted placement or measured transfer bytes.
- React 18.3.1 cjs/react.development.js:1354–1408 and React DOM 18.3.1 cjs/react-dom.development.js:18724–18735,27329–27339: lazy rejection and distinct update/error paths. Effective framework/ancestor boundaries determine the application consequence.
- gsap@3.14.2 archive integrity: sha512-P8/mMxVLU7o4+55+1TCnQrPmgjPKnwkzkXOK1asnR9Jg2lna4tEY5qBJjMmAaOBDDZWtlRjBXjLa0w53G/uBLA==
- @react-three/fiber@8.18.0 archive integrity: sha512-FYZZqD0UUHUswKz3LQl2Z7H24AhD14XGTsIRw3SJaXUxyfVMi+1yiZGmqTcPt/CkPpdU7rrxqcyQ1zJE5DjvIQ==
- @react-three/drei@9.122.0 archive integrity: sha512-SEO/F/rBCTjlLez7WAlpys+iGe9hty4rNgjZvgkQeXFSiwqD4Hbk/wNHMAbdd8vprO2Aj81mihv4dF5bC7D0CA==
- three-stdlib@2.36.1 archive integrity: sha512-XyGQrFmNQ5O/IoKm556ftwKsBg11TIb301MB5dWNicziQBEs2g3gtOYIf7pFiLa0zI2gUwhtCjv9fmjnxKZ1Cg==
- vite@6.4.1 archive integrity: sha512-+Oxm7q9hDoLMyJOYfUYBuHQo+dkAloi33apOPP56pzj+vsdJDzr+j1NISE5pyaAuKL4A3UD34qd0lx5+kfKp2g==
- react@18.3.1 archive integrity: sha512-wS+hAgJShR0KhEvPJArfuPVN1+Hz1t0Y6n5jLrGQbkb4urgPE/0Rve+1kMB1v/oWgHgm4WIcV+i7F2pTVj+2iQ==
- react-dom@18.3.1 archive integrity: sha512-5m4nQKp+rZRb09LNH59GM4BxTh9251/ylbKIbpe7TpGxfJ+9kv6BLkLBXIjjspbgbnIBNqlI23tRnTWT0snUIw==

### UNVERIFIED / NOT RUN

- No new browser/GPU/live-model/profiler evidence or project installation is claimed.

### Integrated verification

Base `b51db2b7292cbd064fb884623285acf0f173290f`; result **PASS**.

| Role | Disposition | Body chars | Growth | tokens | SHA256 |
|---|---|---:|---:|---:|---|
| presentation-reviewer | CHANGED | 13274 → 13624 | 2.64% | 3406 | `a274b7c94aa366cb223ded7eb56c3fe62cac8c2c5c1fd7f580b034206c12b8fd` |
| r3f-scene-reviewer | CHANGED | 14706 → 15465 | 5.16% | 3866 | `8100ec6e09ae362a99d4dd0c9606de90e7405887825775ab9d6c3d4228da96db` |
| ui-design-reviewer | CHANGED | 11915 → 13872 | 16.42% | 3468 | `197499e7e778e5fbf4bef2a91238d34900538c5c7446a49acd73ad51c9f72349` |
| frontend-perf-reviewer | CHANGED | 14745 → 15783 | 7.04% | 3946 | `cc1777b027db67dfde2b62fdb9d9c8429308cfbae6153d955bafb8fa7e09bbd9` |

| Check | Exit | Result / log |
|---|---:|---|
| npm-test | 0 | ℹ tests 133; ℹ pass 133; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0 |
| codex-tests | 0 | ℹ tests 112; ℹ pass 112; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0 |
| counts | 0 | /private/tmp/superkit-g8-20261115-counts.log |
| whitespace | 0 | /private/tmp/superkit-g8-20261115-whitespace.log |
| github-about | 0 | /private/tmp/superkit-g8-20261115-github-about.log |

Protected snapshot: 493 files unchanged. Phase/stale checks: PASS; source catalog83, optional GAN3, version1.5.3. Exact commands/log hashes: `/private/tmp/superkit-g8-20261115-verification.json`. Codex tests are a subset of the full suite, not additional unique tests.

Acceptance state: ACCEPTED — independent PASS; Astra source accepted. Git commit identity and final checkout return are observed after execution.
<!-- G8-end -->

<!-- G9-start -->
## G9 — ACCEPTED — independent PASS; Astra source accepted

Author decisions and exact source acceptance: `/private/tmp/superkit-g9-20261115-decisions.json`; author report: `/private/tmp/superkit-g9-20261115-astra.md`. Independent review: `/private/tmp/superkit-g9-20261115-review.md`.

### gan-planner — CHANGED

Add explicit acceptance traceability and revision lifecycle while preserving optional native GAN contracts.

| Decision | Candidate | Reason |
|---|---|---|
| TAKE | Bidirectional requirements and evidence mapping | Native provides A/S fields but no explicit check that every requirement has an oracle and every scenario/criterion traces back; closes untested requirements and invented acceptance. |
| TAKE | Cited project facts versus identified assumptions | Native asks inspected facts generally; make actual source locations, requirement sources and assumption IDs explicit to prevent invented helpers/routes/numbers. |
| TAKE | Stable revision and retirement lifecycle | Native identifies plan revision and budget but lacks explicit supersedes/reason, stable retired IDs and unchanged-input identity; preserve accepted failures and prevent a new revision from laundering criteria. |
| KEEP | Existing four slots, rubric binding and READY/BLOCKED meaning | Native already preserves transient persistence N/A, real backend integration for stateful paths, unknown rubric rows and mandatory input gates. |
| KEEP | Caller authority, optional harness and loop ceiling | Generator/evaluator already bind plan revision and immutable criteria and carry attempt counters; no automatic loop or extra permission. |
| REJECT | Hardwired backend or always-persist template, both-rubrics fallback and remembered counts | These weaken native applicability and exact approved rubric contract; real current row counts are not universal. |
| REJECT | npx command, mandatory milliseconds and anti-slop keyword bans | Tool behavior is unverified without project configuration and wait bounds do not measure performance; style or keywords alone are not failures. |

### Caller/support compatibility

- Native generator consumes unchanged Plan ID/revision/binding, selected rubric and A/S IDs.
- Native evaluator verifies all scenarios and requirement-derived oracles and returns evidenced plan defects; it cannot rewrite contract.
- Both callers preserve attempts across agents, renamed tests and replanning; planner lifecycle must not reset counters.
- All emitted handoff headings and four scenario headings preserved; field placeholders now expose provenance, retired-ID history outside active criteria and carried counters.
- READY/BLOCKED and final dispatch/stop/release limits unchanged.
- Initial S1-S4 headings are illustrative; replacement journeys retain slot role with new unused IDs, preventing retired-ID reuse.

### Local factual support

- Pinned Claude source: 2cf6f27f02d9a56a49c0bbb47fed8c349ad7634b:packages/gan/agents/gan-planner.md.
- Read both native GAN callers and current two bundled rubrics. No tool/API/exit claim is planned.
- packages/gan/rubrics/ui-quality.md has 21 unique numbered rubric rows (independently inspected); unchanged SHA256 3e22fea761e85a2580c10fcee723585db1e84d1f1cf25f8b52ea5a3a0543d1e5
- packages/gan/rubrics/functionality.md has 15 unique numbered rubric rows (independently inspected); unchanged SHA256 34739c3d2d0d0f3d161b6bd64c7bd74f240529355e9b25057b8894e0d4ac7fa6
- Unchanged native caller packages/gan/skills/gan-generator/SKILL.md SHA256 4418e118e5e761d57a439746561e4c598060e6063db3f1f9e0c10a8c2dbc41e5: existing Plan ID/revision/binding, active criterion/scenario IDs and loop budgets are the preserved handoff contract, not observed model execution.
- Unchanged native caller packages/gan/skills/gan-evaluator/SKILL.md SHA256 4b85ab529800630901f70dc730e4a586dc20a961d41289316157f000550dd51b: existing Plan ID/revision/binding, active criterion/scenario IDs and loop budgets are the preserved handoff contract, not observed model execution.

### UNVERIFIED / NOT RUN

- No generated application, GAN scenario execution, browser session or live-model evaluation.

### Integrated verification

Base `af7f7a9ca4cfac2457521dbf16775a73e5ce3ee1`; result **PASS**.

| Role | Disposition | Body chars | Growth | tokens | SHA256 |
|---|---|---:|---:|---:|---|
| gan-planner | CHANGED | 9982 → 12430 | 24.52% | 3108 | `7e9a2ad76819563fdaab2386dedb78b4d53403a81c81ccc8b03cc7603680e7ca` |

| Check | Exit | Result / log |
|---|---:|---|
| npm-test | 0 | ℹ tests 133; ℹ pass 133; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0 |
| codex-tests | 0 | ℹ tests 112; ℹ pass 112; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0 |
| counts | 0 | /private/tmp/superkit-g9-20261115-counts.log |
| whitespace | 0 | /private/tmp/superkit-g9-20261115-whitespace.log |
| github-about | 0 | /private/tmp/superkit-g9-20261115-github-about.log |

Protected snapshot: 497 files unchanged. Phase/stale checks: PASS; source catalog83, optional GAN3, version1.5.3. Exact commands/log hashes: `/private/tmp/superkit-g9-20261115-verification.json`. Codex tests are a subset of the full suite, not additional unique tests.

Acceptance state: ACCEPTED — independent PASS; Astra source accepted. Git commit identity and final checkout return are observed after execution.
<!-- G9-end -->

## Completed source scope

All 13 assigned roles were compared against the pinned Claude snapshot and
actual native caller/support contracts: seven source files changed and six
frontend UI roles remained byte-identical. Independent review is COMPLETE for
all three groups; no unresolved source finding remains. Each frozen group
passed the full 133-test suite and separate 112-test Codex subset, plus the
required counts/version/phase/About/whitespace checks.

Verification limits remain explicit: exact-version local cache source evidence
is not consumer runtime or rendered behavior. Browser interactions, GAN scenario
execution and model-quality evaluation were not run. The first G7 reviewer
metadata calculation stripped outer whitespace; it was corrected to the
repository's exact body-boundary formula, with no source edit or product test
failure. Final exact token metadata passed. G8 report/stop sections and native
domain counts remain unchanged. G9 retains the planner headings, four scenario
slots, one rubric and the existing generator/evaluator/authority contracts.

At this source-acceptance checkpoint G7 and G8 are signed and committed; G9's
commit and the final branch return are the remaining coordinator actions.
Their exact Git identities and observed result are reported after execution.
No remote metadata update, source push, release or merge is part of this task.

## Stopping boundary

Finish these three groups and return the folder to `claude/opus-5-5-agents`.
No release, tag, push, package publication, merge or worktree/branch cleanup.
Preserve root AGENTS.md, docs/npm, docs/research and the owner's ZIP outside
commits. The nine still-unrewritten Claude roles remain outside this task:
ai-slop-cleaner, behavioral-nudge-engine, codebase-onboarding-engineer,
minimal-change-engineer, tree-generator, bot-reviewer, design-system-reviewer,
gan-generator and gan-evaluator.
