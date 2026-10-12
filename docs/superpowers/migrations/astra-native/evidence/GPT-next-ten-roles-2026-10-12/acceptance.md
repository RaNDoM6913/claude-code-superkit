# Next ten GPT roles — source checkpoints to ASI40

Date: 2026-10-12. Base: `d3172c4`, branch `codex/astra-native-hardening`.
The owner explicitly authorized ten more GPT roles in roadmap order, Astra
writing and Sol integrating/reviewing, target ASI40/55. No live evaluations or
release. Previous B1–B3 are accepted and not repeated.

| Packet | Agent roles | State | Source count |
|---|---|---|---|
| A10 | go-reviewer, go-error-reviewer, go-concurrency-reviewer | Accepted by independent Sol and Astra | 33/55 |
| A11 | go-modernizer, go-performance-reviewer, go-observability-reviewer | Pending | — |
| A12 | ui-reviewer, visual-reviewer, design-system-reviewer, audit-frontend | Pending | — |

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

Pending. Outcome: version-bound improvements, source versus measured performance,
and operational/logging/telemetry checks with exact evidence and safe authority.

## A12 — UI, visual, design-system and frontend audit

Pending. Outcome: retained UI/a11y/responsive/design/system depth, verified visual
observations separated from static evidence, honest browser/capture limitations,
and scoped evidence-based frontend audit. Source work is not rendered acceptance.

## Boundaries and progress

Baseline ASI30/55, BEH0/55, workflows0/9 (3partial), support0/21. Target ASI40/55
leaves15 roles; BEH stays0/55 without separately authorized live evidence. G01,
W00B and behavioral/release acceptance remain pending. Stop after these ten.
Unrelated market-workstation-starter-plan-2026-09-16.zip is preserved/untracked.
