# GPT plan-checker case and oracle — 2026-10-14

Baseline: `dbca0bd`, `codex/astra-native-hardening`. Owner explicitly authorized
the next GPT-only case/oracle packet with complete Astra implementation, then
release preparation. All case, scorer and test semantics were authored by Astra.
Sol performed independent read-only review; coordinator owns integration/docs/Git.
Requested routes: `gpt-6-astra/high` author, `gpt-5.6-sol/high` reviewer, per the
working agreement. No provider-native model identity is claimed from authorship.

## Delivered contract

- `test/fixtures/astra-native/plan-checker-case.json`: an explicit mandatory
  owner decision between equal-authority null-input policies, visible outcome,
  plan, acceptance criteria, sources and output contract. No precedence or review
  authority permits the worker to choose. Candidate tests demonstrate both
  behaviors without settling final implementation/acceptance. Golden decision
  and expected answers remain outside the materialized worker tree.
- `tools/lib/plan-checker-eval.mjs`: bounded strict JSON normalization and native
  BLOCK/PARTIAL scoring against the trusted case, exact alternatives/references,
  coverage/action claims, actual verification argv/result, scope and read-only
  state. Canonical full input/packet digest and existing snapshot/evidence/tree
  primitives bind the result. Duplicate JSON members are rejected before parsing,
  including nested/escaped-equivalent keys; string data remains valid.
- `test/plan-checker-eval.test.js`: eleven meaningful tests, including successful
  candidate checks with a blocked mandatory decision, precedence/local-correction
  controls, unsupported PASS/fabricated resolution/omissions, invalid output,
  substituted evidence, actual writes, stale packets and duplicate claims.

Canonical case request is `gpt-5.6-sol/high` with INDEPENDENT assessment. This is
declared future task routing, not proof that any model executed the case. A valid
INLINE SELF-REVIEW control is separately materialized and captured. Requested
and observed runtime stay distinct: observed is UNVERIFIED in this source packet.
Self-attestation is rejected; `g01ModelQualified` remains false even when the
targeted deterministic case passes.

## Review and correction

Sol's initial coherent review identified three concrete defects: stale visible
packet could be accepted against changed expected execution/routing; fixture
conflated author and prospective executor; JSON.parse discarded duplicate keys.
Astra corrected all three in one cycle. The verified path now compares the full
canonical case.files plus serialized TASK packet to the trusted snapshot digest
before using existing file/evidence/tree checks. No existing primitive changed.
Sol's affected-fix review returned **APPROVE**, no remaining material findings.
Astra final semantic decision: **ACCEPT at deterministic SOURCE level**.

## Verification

- Initial behavioral RED: **2 passed / 7 failed**, including a correct blocked
  report returning false and missing decision classification. This was an
  unimplemented contract skeleton, not a missing-module import failure.
- Correction RED: **9 passed / 2 failed**; stale packet and duplicate verdict
  incorrectly returned true, demonstrating both reviewed defects.
- Final focused command `node --test test/plan-checker-eval.test.js
  test/recovery-eval.test.js test/verification-evidence.test.js`: **46/46 PASS**,
  including **11/11** new tests, no failures/skips/todo.
- Coordinator refreshed stable `npm test`: **287/287 PASS**, zero failures,
  cancelled, skipped or todo. The earlier 285-test run predates corrections.
- Whitespace checks include all three new untracked files, which ordinary
  unstaged git diff would omit. Final mandatory counts/remote/version/phase/scope/
  diff checks passed; shipped counts and version1.5.2 remain unchanged. Coordinator
  accepts the integrated SOURCE result for the authorized feature checkpoint.

Full logs: `/tmp/astra-plan-checker-red.log`,
`/tmp/astra-plan-checker-review-red.log`,
`/tmp/astra-plan-checker-review-green.log`, and
`/tmp/superkit-plan-checker-case-2026-10-14/npm-test-final.log`.

## Limits and next step

This is a role-specific deterministic SOURCE oracle, not a JSONL/CLI collector,
natural-language judge, live role run or runtime attestation adapter. No shared
primitive, old case corpus, accepted role prompt, Claude asset, runtime/config,
manifest, dependency or release version was changed. Consumer installation and
complete G01/critical-seven delegation/escalation acceptance remain separate.

Next bounded packet: collector for this admitted case, reusing existing immutable
verification/input/tree evidence and separately binding exact model invocation
argv/stdin/output. Native identity must fail closed for G01 qualification when
unestablished; requested flags cannot become observed identity. Concrete live
scope/budget remains ungranted. One case cannot close all seven critical roles.

Agent ASI55/55, BEH0/55, workflows0/9 (three partial callers), fullsupport0/21 and
K01 SOURCE4/4 remain unchanged. G01/W00B/full K01/support, I01/D01 and release
acceptance remain open. This packet required one substantive correction cycle;
the approximate small-batch cadence did not waive mandatory defect closure.
