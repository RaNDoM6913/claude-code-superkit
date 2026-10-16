# Next ten GPT roles — bounded source checkpoints

Date: 2026-10-11. Initial base: `a791e4c`, branch `codex/astra-native-hardening`.
The owner requested another ten roles HERE in Codex. The prepared seven-role
OrchKit prompt was not executed and contributes zero accepted roles.

| Packet | Agent roles | State | Source count |
|---|---|---|---|
| B1 | dependency-checker, security-scanner, audit-infra | Accepted by independent Sol and Astra | 23/55 |
| B2 | audit-backend, database-reviewer, migration-reviewer | Accepted by independent Sol and Astra | 26/55 |
| B3 | pre-deploy-validator, ts-reviewer, py-reviewer, rs-reviewer | Accepted by independent Sol and Astra | 30/55 |

All role sources are `packages/codex/skills/<name>/SKILL.md`. Astra authors every
prompt and semantic correction; Sol handles integration and independent review.
The coordinator owns evidence, factual documentation, counters, and Git. Routes:
`gpt-6-astra/high`, integration `gpt-5.6-sol/medium`, review `gpt-5.6-sol/high`.
These authoring routes are not protected runtime identity from a behavioral run.

Acceptance requires retained specialization, exact scope, inspected evidence,
honest unknown/coverage states, bounded authority, compatible caller gates,
native preservation, relevant tests, independent review and Astra acceptance.
Source progress does not pass G01, close W00B, qualify live behavior, or authorize
release. No live model evaluations, Claude component migration, new infrastructure,
runtime configuration, merge, or release are part of this request.

## B1 — dependencies, security and infrastructure

Goals: distinguish outdated dependencies, advisory data and regex candidates from
confirmed impact; preserve actual security/infrastructure checks without universal
assumptions or automatic remediation. Reviews remain scoped and read-only.

The existing audit-orchestrator can skip unavailable agents and aggregate findings
without mandatory-coverage evidence. Astra owns only the necessary authority,
applicability, unknown-state and aggregation correction; selection is unchanged.
This is a third partial workflow caller, not a completed workflow or new agent.

Native protection expands 22→26 entries: three agents plus audit-orchestrator.
Existing actual-manifest tests failed before each registration, then passed both
byte-preservation/normal-conversion and missing-native preflight cases. The live
converter was not run against repository assets.

Integrated verification: `npm test` passed275/275, exit0, no failures or skips;
log `/tmp/superkit-wave30-2026-10-11/b1-npm-test.log`. Preservation passed2/2;
count/version/remote About and diff checks passed. Four metadata/normalized-stock
checks passed (temporary copies omit only established unsupported metadata keys).
Independent `sol_wave30_review_b1` review covered the complete changed scope and
accepted it with no material findings. It confirmed retained18/12 domain families,
evidence-to-impact classification, redaction/authority, native findings and
mandatory unknowns in the caller, and all26 protected entries. Astra inspected
the actual final suite summary and review/evidence record and explicitly accepted
source/static/integration. No semantic correction followed the reviewed diff.

## B2 — backend and data

Astra authored all three sources: twelve backend domains; ten PostgreSQL review
domains including plans/indexes, transactions and authority; ten migration domains
covering drift, data transformations, locks, partial failure, backfills and recovery.
Findings require inspected paths and contracts; missing evidence stays separate.
Database/runner/version/workload and actual recovery policy replace universal
index/type/down/idempotency rules. Diagnostics have explicit scope, authority and
redaction requirements; no migrations or live database operations were performed.

Existing audit/dev/review consumers retain native findings, coverage and mandatory
unknowns; no caller rewrite was necessary. SQL-only migration dispatch remains a
known caller scope limit, with relevant-context/PARTIAL handling in the role.
C03 migration execution/scaffolding workflows remain separately pending.
Native protection expands 26→29 entries, including these three agents. Existing
preservation checks passed 2/2 before and after registration; no converter ran
against repository assets. Integrated `npm test`: exit0, 275/275, zero failures or
skips; log `/tmp/superkit-wave30-2026-10-11/b2-npm-test.log`. Count/version/remote
About and whitespace checks passed. Original metadata and normalized stock checks
passed 3/3 each. Independent `sol_b2_review` reviewed the complete changed scope
and actual callers: APPROVE, no material findings. `astra_b2` verified unchanged
source hashes and actual integrated evidence and explicitly accepted B2
source/static/integration. No semantic correction followed review. ASI is now
26/55; BEH remains 0/55. Local author/integration/review reports are
`/tmp/superkit-wave30-2026-10-11/b2-{astra,integration,review}.md`.

## B3 — delivery and language reviewers

Astra authored all four sources. Pre-deploy retains nine domains and READY/NOT
READY, with actual configured commands, per-component evidence and mandatory
UNVERIFIED/SKIPPED gates; validation does not authorize deployment. TypeScript
retains type/runtime, async, React, state/library, framework and UI expertise.
Python retains typing, async/cancellation, resources, transactions and actual
FastAPI/Pydantic/Django/Flask/SQLAlchemy contracts. Rust retains ownership, panic
containment, async/concurrency, toolchain/features, unsafe invariants and FFI.
External-symbol VERIFIED/ASSUMED contracts remain, with source-first inspection
and explicit import/build execution authority. No caller rewrite was needed.

Native protection expands 29→33 entries (30 roles + 3 partial callers). Existing
mirror-invariants passed 79/79, log `/tmp/superkit-b3-astra-mirror.log`; no mirror
assertion or Claude source was changed. Integrated `npm test` exited0 with
275/275 passing, zero failures/skips; log
`/tmp/superkit-wave30-2026-10-11/b3-npm-test.log`. Count/version/remote About,
16-phase consistency, stale-reference and whitespace checks passed. Integration
native preservation passed 2/2; original metadata and normalized stock validation
passed 4/4 each. Independent `sol_b3_review` reviewed the complete old/new scope
and actual callers: APPROVE, no findings or open questions. `astra_b3` recomputed
all four source hashes, inspected the integrated evidence and explicitly accepted
B3 source/static/integration. No semantic correction followed review. Local
reports: `/tmp/superkit-wave30-2026-10-11/b3-{astra,integration,review}.md`.

## Boundaries and progress

Starting acceptance: source 20/55, behavioral 0/55, workflows 0/9 (two partial),
support 0/21. All ten B1–B3 roles are now source/static/integration accepted: 30/55, 25 roles remaining;
behavioral counts change only with separately authorized evidence. The catalog
remains 55 agent roles, 9 workflows, 21 support skills. Stop after these ten.
B1 checkpoint: `4ed2449`; B2: `8a70646`; B3 commit/push is the final coordinator action.
The authorized ten-role request is complete at source acceptance; no later packet
is started. Preserve the unrelated ZIP and all existing baseline/evidence. Follow the
500,000-context-token clean-session handoff agreement during this request.
