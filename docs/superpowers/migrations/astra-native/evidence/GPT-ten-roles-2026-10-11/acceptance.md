# Ten GPT roles — bounded source checkpoints, 2026-10-11

Initial base: `0702b22`; branch: `codex/astra-native-hardening`.
The owner requested ten additional agents after the accepted 10/55 source
checkpoint. Work is divided into 4 + 3 + 3 roles, with separate source acceptance
for each packet. No live evaluation, G01 closure, later behavioral promotion,
Claude component migration, new evaluation infrastructure, merge, or release is
authorized by these source changes. Version 1.5.3 remains a future release gate.

## Packet ledger

| Packet | Owned role prompts | Source acceptance | Cumulative source count |
|---|---|---|---:|
| P1 — review | code-reviewer, silent-failure-hunter, docs-reviewer, comment-rot-analyzer | Accepted by independent Sol review and Astra | 14/55 |
| P2 — API and diagnosis | api-contract-sync, tree-generator, debug-observer | Pending | — |
| P3 — tests and health | test-generator, e2e-test-generator, health-checker | Pending | — |

Each primary source is `packages/codex/skills/<name>/SKILL.md`.
Necessary caller edits preserve verdict compatibility without counting as another
completed role or a complete workflow migration. The native ownership manifest
and its real converter-preservation regression cover each accepted source.

## Authorship and acceptance protocol

Astra authors all ten prompts and any required caller semantics. Sol owns
mechanical integration and independent read-only review. Semantic corrections
return to Astra; the coordinator verifies actual changes/results and owns Git,
factual documentation, progress counters, and this compact evidence record.
Requested routes are `gpt-6-astra/high` for authoring/acceptance,
`gpt-5.6-sol/medium` for integration, and `gpt-5.6-sol/high` for independent review.
These authoring dispatches are not protected runtime-identity evidence from a
behavioral evaluation.

Acceptance requires bounded authority and context, evidence-backed findings,
honest missing-tool/coverage states, retained specialist knowledge, correct caller
gates, native preservation, and relevant repository checks. A clean review is
valid; no finding quota or style preference substitutes for a concrete defect.

## P1 — review

Goals: actual changed behavior and error paths determine findings; documentation
and comments are checked against inspected sources; incomplete mandatory review
or documentation evidence cannot silently pass. Preserve language-specific error
knowledge, severity/confidence contracts, and documented deliberate fallback.

Technical integration: manifest expands from 12 to 16 protected entries. The
existing test initially failed on an unprotected code-reviewer file, then passed
both byte-preservation/normal-conversion and missing-native preflight cases after
the manifest update. The live converter was not run against repository prompts.

Caller issue identified independently: dev-orchestrator Phase 14 accepted merely
the absence of MISSING and could miss unverified or other mandatory documentation
defects. Astra owns the narrow correction and related Phase 12 coverage handling;
no new reviewer routing is introduced.

Verification: first full suite returned 274/275 because docs-reviewer had lost the
Codex installation-map example required by an existing compatibility test. Astra
restored the accurate `.codex/skills/<name>/SKILL.md`, AGENTS, and config mapping
without changing the test. The final full suite passed 275/275, no failures or
skips; focused assets passed 9/9 and native preservation 2/2. Counts including
remote About and whitespace checks passed. Five edited skill files passed
frontmatter/token checks and stock validation on temporary copies omitting only
repository-established unsupported metadata keys; originals retain them.

Full local outputs: `/tmp/superkit-ten-roles-2026-10-11/p1-npm-test.log` (initial
failure) and `p1-npm-test-final.log` (final result). These validate repository
artifacts, not target-model behavior.

`sol_oct11_review_p1` independently covered all packet-one changes, found no
actionable issues, and accepted the source/static/integration checkpoint. It
confirmed preserved specialist depth, the retained documentation issue labels and
evidence-state distinction, the Phase12/14 gate correction, and all 16 protected
entries. Astra inspected the final suite summary and the independent review and
explicitly accepted source/static/integration. G01 and behavioral acceptance stay
pending. No semantic correction followed the accepted stable diff.

## P2 — API and diagnosis

Planned contract checks: complete scoped API comparisons instead of random
sampling; truthful tree depth/exclusions and authorized destinations; safe,
bounded, read-only diagnostic observations with private data redacted and no
invented root cause.

Verification, review dispositions, and Astra acceptance: pending.

## P3 — tests and health

Planned contract checks: tests of real behavior rather than mirrored assertions;
mocked UI tests distinguished from backend-integrated observations; actual command
exit/results preserved; unavailable checks and unexecuted integration tests do not
make the project healthy.

Verification, review dispositions, and Astra acceptance: pending.

## Remaining gates

Behavioral acceptance stays 0/55 until separately authorized target-model work
actually satisfies its gate. Workflow completion is 0/9 with two partial callers;
support completion is 0/21. G01, W00B, full migration acceptance, and release remain
pending. The package catalog remains 55 agent roles, 9 workflows, and 21 support
skills; source-count progress is not an overall completion percentage.

Stop after these ten source roles. Any unavailable mandatory dependency is a
bounded blocker, not permission to add an infrastructure queue or another role.
