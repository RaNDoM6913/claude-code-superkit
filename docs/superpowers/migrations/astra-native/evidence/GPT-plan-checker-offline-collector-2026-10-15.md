# GPT plan-checker offline collector v1 — 2026-10-15

Baseline: `38ec15a`, `codex/astra-native-hardening`. Owner requested the next
GPT-only collector packet, complete Astra implementation, then release
preparation. Astra owned all collector/fixture/test semantics; Sol independently
reviewed, coordinator owns records/integration/Git. Requested routes were
`gpt-6-astra/high` author and `gpt-5.6-sol/high` review. Authorship routing does not
establish provider-observed runtime identity.

## Delivered scope and API

- `tools/lib/plan-checker-collector.mjs`: `collectPlanCheckerCase`,
  `verifyPlanCheckerCollection`, `parsePlanCheckerJsonl`.
- `test/plan-checker-collector.test.js`: thirteen deterministic collector tests.
- `test/fixtures/astra-native/plan-checker-worker.mjs`: the one pinned,
  SHA-checked repository fixture with bounded allowlisted modes.

V1 accepts `transport: {kind: 'offline-fixture', mode}`. Caller argv/programs,
unknown fields/modes and native execution are rejected before attempt creation.
The planned Codex command is explicitly `executed=false` metadata, not a launcher.
No live evaluation or native/model/API execution occurred through this collector.

Each attempt has fresh run/case IDs bound to the admitted base case. Only visible
case files and the matching canonical TASK packet are materialized; private
expected answers stay outside the worker tree. Authorized candidate-command
metadata is added before input capture. Invocation argv/stdin are separately
bound from the existing deterministic-verification `identity.command`.

Raw stdout JSONL, stderr, selected final text, process result/limits, input/tree
snapshots and verification records are exclusively created and hash-bound to an
externally retained binding. The verifier enforces exact schemas/artifact sets
and semantic cross-links among run/case/snapshot, invocation, canonical stdin,
full selected inputs, stdout/final, process, tree and verification metadata.
Integrity verification remains separate from successful process/parse/audit.
Valid failed attempts remain inspectable; no retry or overwrite is performed.

The candidate oracle runs independently in a newly regenerated trusted tree,
not worker-modified tests. The collector uses existing case/oracle and evidence
primitives unchanged. Tree/input checks are point-in-time observations, not OS
isolation or proof that no temporary write/read occurred. Exclusive creation and
external hashes do not provide WORM or hostile same-user protection.

## Protocol and qualification boundaries

Installed CLI help was rechecked read-only: `codex-cli 0.162.0-alpha.17.2`.
The official OpenAI [skill eval guide](https://developers.openai.com/blog/eval-skills)
describes JSONL command events, final responses and turn-completion usage. This
collector accepts a bounded supported subset, rejecting malformed UTF-8/JSON,
duplicate decoded keys, ambiguous/failed/incomplete lifecycle or terminal output.

Native command strings cannot attest exact worker argv or read scope. Requested
model/effort and unauthenticated runtime events cannot establish observed identity.
These dimensions remain UNVERIFIED; strict `roleScore.pass` and
`g01ModelQualified` remain false, `observedRuntime` is null. Independent report/
oracle consistency is labeled separately and does not prove the worker executed
the command. No real role prompt or provider behavior was exercised by the fixture.

## Review and verified correction

Sol identified three material defects in the first implementation:

1. A detached descendant could keep pipes open after timeout, delaying settlement.
2. The offline label permitted an arbitrary caller-selected `.mjs` executable.
3. Rehashed but internally contradictory artifact metadata could verify.

Astra corrected all three in one cycle. Deadline/output/stdin failures now settle
once independently of eventual close, destroy owned streams and attempt original
process-group cleanup. Detached-descendant termination remains UNVERIFIED. The
fixed fixture selector and strict semantic integrity verifier close the other
findings. Sol affected-fix review: **APPROVE**, no remaining material findings.
Astra final decision: **ACCEPT at bounded SOURCE level**.

- Initial behavioral RED: **0/8** passed, actual assertion/guard failures.
- Correction RED: **0/3** passed; detached-pipe latency2665ms, arbitrary module
  launch and rehashed empty-artifact acceptance reproduced the defects.
- Corrected focused command `node --test test/plan-checker-collector.test.js
  test/plan-checker-eval.test.js test/verification-evidence.test.js`: **45/45**,
  including **13 collector tests**.
- Coordinator refreshed stable `npm test`: **300/300**, zero failures, skipped,
  cancelled or todo. The earlier296-test run predates corrections.
- Coordinator mandatory integrity/counts/remote/version/phase/scope checks passed;
  fixture SHA matches its pin, existing sources remain unchanged and version is
  still1.5.2. New-file whitespace is included in the staged gate before commit.

Logs: `/tmp/astra-plan-collector-red.log`,
`/tmp/astra-plan-collector-review-red.log`,
`/tmp/astra-plan-collector-review-focused-green.log`,
`/tmp/superkit-plan-collector-2026-10-15/npm-test-final.log`.

## Remaining work

Native launch is **unsupported in v1**. A subsequent producer/qualification packet
must bind the actual role prompt, invocation/stdin/raw output, execution scope and
observed runtime, with exact authorized live scope/budget. Existing help/docs do
not establish native identity capture; that capability is unestablished, not
proven impossible. Do not fabricate identity or infer worker causality from the
independent oracle. One case cannot close the seven-role/end-to-end G01 gate.

Agent ASI55/55, BEH0/55, workflows0/9 (three partial callers), fullsupport0/21 and
K01 SOURCE4/4 remain unchanged. No role/Claude asset, shared primitive, existing
case/oracle, runtime/config, dependency, manifest, installer or version changed.
Full G01/W00B/K01/support, I01/D01 and release acceptance remain open.
