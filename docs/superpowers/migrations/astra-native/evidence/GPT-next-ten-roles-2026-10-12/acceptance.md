# Next ten GPT roles — source checkpoints to ASI40

Date: 2026-10-12. Base: `d3172c4`, branch `codex/astra-native-hardening`.
The owner explicitly authorized ten more GPT roles in roadmap order, Astra
writing and Sol integrating/reviewing, target ASI40/55. No live evaluations or
release. Previous B1–B3 are accepted and not repeated.

| Packet | Agent roles | State | Source count |
|---|---|---|---|
| A10 | go-reviewer, go-error-reviewer, go-concurrency-reviewer | Accepted by independent Sol and Astra | 33/55 |
| A11 | go-modernizer, go-performance-reviewer, go-observability-reviewer | Accepted by independent Sol and Astra | 36/55 |
| A12 | ui-reviewer, visual-reviewer, design-system-reviewer, audit-frontend | Accepted by independent Sol and Astra | 40/55 |

Source path: `packages/codex/skills/<name>/SKILL.md`. Astra/high authors and
accepts every changed semantic rule; Sol/medium integrates and Sol/high performs
one independent coherent review per stable packet. Coordinator owns shared
contracts, factual docs, evidence/counters and Git. Preserve domain depth,
applicable Go references and actual caller contracts. Register native protection;
run existing risk-relevant checks and one full stable npm suite per packet.
No tests merely matching prose, unnecessary caller/routing rewrites, Claude
rewrite, runtime configuration, new eval infrastructure, merge or release.
Stable verified checkpoint commit/push on the existing branch is authorized.

## A10 — Go correctness, errors and concurrency

Accepted source/static/integration. Outcome: evidence-backed Go review preserving version/module-aware
contracts, error paths, context/cancellation, goroutine/channel/lock lifecycles,
and caller output compatibility. No speculative rule violations or unsafe checks.

Observed integration constraint: Codex installation copies `packages/codex/skills`
and does not install `packages/stack-agents/go/references`. Existing reference
paths therefore refer to a source-kit checkout, not a guaranteed consumer file.
The selected bounded correction makes role instructions self-contained and labels
those references optional/source-only, checking real availability and applicable
version before relying on their examples. Shared Claude reference files and the
installer remain outside this packet; their contents are not accepted wholesale.
Independent Sol review and final Astra acceptance confirmed no mandatory
knowledge dependency is hidden by this fallback.

Astra retained general Go architecture/API/SQL/resources/value semantics, all five
error audit areas and fifteen original error domains, and the concurrency audit's
five areas and fifteen concerns. Added explicit typed-nil/As, joined-error trees,
partial success, versioned timers/loops/WaitGroup and module-bound errgroup logic.
Official Go/API references were checked during authoring. No caller rewrite or
new routing was needed; shared reference sources remain unchanged.

Stable integrated `npm test`: exit0, 275/275 passing, no failures/skips; log
`/tmp/superkit-wave40-2026-10-12/a10-npm-test.log`. Count/version/remote About and
whitespace/phase/stale-reference checks passed. Native registration expands33→36
entries. Native preservation2/2, mirror invariants79/79, metadata/hash/tokens3/3
and normalized stock validation3/3 passed. Independent `sol_a10_review` reviewed
the complete old/new sources and contracts: ALLOWED with no findings or blocking
questions. `astra_a10` rechecked frozen hashes and actual integrated evidence and
accepted source/static/integration. No semantic edit followed review.

Existing dev/review workflows dispatch the general Go reviewer; the error and
concurrency specialists require explicit caller assignment. No automatic specialist
routing is claimed. Local author/integration/review reports are
`/tmp/superkit-wave40-2026-10-12/a10-{astra,integration,review}.md`. ASI33/55,
BEH0/55 after this packet.

## A11 — Go modernization, performance and observability

Accepted source/static/integration. Modernizer
preserves migration tables, before/after, effort/risk and ordering with exact
version and behavior checks. Performance retains benchmarks/profiles, allocations,
GC, CPU/contention, I/O/pools and cache semantics, separating source proofs from
measured effects. Observability retains five-signal coverage plus export pipelines,
lifecycle, privacy/cardinality and operational requirements; unavailable delivery
is not marked working. All three are self-contained with optional verified Go
reference context and read-only authority; no live profiling, probing or updates.

Stable integrated npm test exited0:275/275, zero failures/skips; log
`/tmp/superkit-wave40-2026-10-12/a11-npm-test.log`. Counts/version/remote About and
whitespace/phase/stale-reference checks passed. Native registration expands36→39
entries. Preservation2/2 and metadata/hash/tokens plus normalized stock3/3 each
passed. Stock validation's first temporary harness attempt failed; the corrected
fail-fast run passed and no repository source was affected. Mirror invariants were
not rerun because their pinned roles were unchanged and no related risk emerged.

Separate `sol_a11_review` covered the full old/new packet: ALLOWED with no findings
or blocking questions. `astra_a11` read that separate review and actual integrated
suite, recomputed unchanged source hashes and explicitly accepted final integrated
source. No semantic change followed review. Explicit specialist-assignment and
optional-reference limitations remain; no caller/installer rewrite was needed.
Reports: `/tmp/superkit-wave40-2026-10-12/a11-{astra,integration,review}.md`.
ASI36/55, BEH0/55 after this packet.

## A12 — UI, visual, design-system and frontend audit

Accepted source/static/integration. Two Astra authors
own UI/design-system and visual/frontend respectively. UI and design-system retain
semantics, keyboard/focus, forms/state/recovery, responsive layout/layers, real
token/theme/component API contracts, motion and media. Discovery has an honest
no-token-system branch without manufacturing noncompliance. Visual preserves eight
review domains and screenshot comparison/provenance, with numerical Total Score
only against an approved rubric; otherwise NOT SCORED or UNKNOWN for missing
required evidence. No caller consumes the old arbitrary90/70 bands. Frontend audit
retains twelve numbered domains, data/cache/type/resource/configuration depth and
native audit statuses, findings, coverage and progression.

SOURCE/RENDERED/EXERCISED evidence remains distinct throughout. A screenshot does
not establish keyboard/assistive-technology behavior; source-only work does not
establish rendered acceptance. Existing task authority, safe data collection and
read-only review boundaries remain explicit. No caller rewrite was necessary.
No UI/browser or live model evaluation was performed.

Native registration expands39→43 entries (40roles+3partial callers). The final
integrated npm run after registration exited0:275/275, zero failures/skips; log
`/tmp/superkit-wave40-2026-10-12/a12-npm-test.log`. The earlier source-only run is
separately labeled pre-registration and does not supply final integration evidence.
Count/version/remote About, phase/stale-reference and whitespace checks passed.
Preservation2/2, metadata/hash/tokens4/4 and normalized stock4/4 passed; manifest
and test list contain43 identical unique entries. Separate `sol_a12_review` read
the complete old/new scope: ALLOWED, no findings or blocking questions.
`astra_a12_ui` inspected both author packets, all four final sources, separate
review, actual post-registration suite and current hashes, then explicitly
accepted the coherent four-role source/static/integration result. No semantic
change followed review. Reports: `a12-ui-astra.md`, `a12-visual-astra.md`,
`a12-integration.md`, `a12-review.md` in `/tmp/superkit-wave40-2026-10-12/`.

Existing automation limits remain: visual-reviewer has no direct audit/dev/review
dispatch; standalone review maps design-system-reviewer only from TSX despite its
later Vue/Svelte filter and omits CSS-only triggering; ui-reviewer is dev-mapped,
not standalone-review-mapped. These are disclosed workflow limitations, not new
routing or full workflow acceptance. ASI40/55, BEH0/55 after A12.

## Boundaries and progress

Baseline ASI30/55, BEH0/55, workflows0/9 (3partial), support0/21. All ten A10–A12
roles are accepted at source/static/integration: ASI40/55,15 roles remaining;
BEH stays0/55. Workflows/support counts are unchanged. A10 checkpoint4822f5e,
A11 checkpoint5f5e318; A12 commit/push is the final coordinator action. G01,
W00B and behavioral/release acceptance remain pending. The requested ten-role
source outcome is complete; stop after the final checkpoint, no next packet.
Unrelated market-workstation-starter-plan-2026-09-16.zip is preserved/untracked.
