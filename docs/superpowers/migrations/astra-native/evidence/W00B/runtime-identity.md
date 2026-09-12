# W00B-9 checkpoint: runtime identity evidence contract

This block adds comparison of model/effort observations from a separately captured
collector trace. It does not implement a live provider adapter, run a model
evaluation, or prove that any real model/tier has passed behavioral acceptance.
All positive runtime identity examples in tests are explicitly synthetic
`fixture-model-a` / `fixture-model-b` values.

## Two scoring entry points

- `scoreVerifiedCase` remains the deterministic verification entry point. It
  checks selected inputs and verification artifacts but makes no model identity
  claim. The existing real Node process fixtures continue using it.
- `scoreModelVerifiedCase` additionally requires `runtimeRecordPath` and an
  independently supplied `expectedRuntime: {model, effort}`. It adds a mandatory
  `checks.runtime` gate, `runtimeReason`, and immutable `observedRuntime`
  diagnostics. Its partial coverage explicitly includes runtime identity.

The model entry point loads runtime evidence from the same protected evidence
root and binds it to the same run, case, selected-input digest, and verification
command identity. Command identity here identifies the verification case; it is
not a claim that Node's verification command itself executed a model.

The expected pair must come from already approved caller routing/registry policy,
not from the worker response or the trace being checked. This comparator does not
implement a registry, choose models, normalize aliases, or establish eligibility.
It compares complete strings exactly, including model suffixes and effort case.

## Internal normalized trace format

`loadRuntimeEvidence(root, recordPath, expectedIdentity, expectedRuntime)` reads
the artifact through the existing identity/SHA-256 verifier and parses those same
verified bytes. This is an internal collector format, not an asserted Codex or
provider-native event schema:

```js
{
  version: 1,
  kind: 'runtime-identity',
  snapshotSha256, runId, caseId, command,
  truncated: false,
  events: [
    { type: 'request.configuration', requested: { model, effort } },
    {
      type: 'runtime.identity', source: 'runtime', runId,
      observed: { model: 'fixture-model-a', effort: 'high' }
    }
  ]
}
```

Only `runtime.identity` events with `source: runtime`, a matching event run ID,
and both observed strings can establish identity. Requested/configuration fields,
worker response fields, nested JSON in worker text, and incomplete observations
cannot substitute for them. Other non-runtime event types are ignored; unknown
`runtime.*` types fail closed rather than being guessed at or silently skipped.

Duplicate identical observations are allowed. Different observed pairs in the
same attempt yield `conflicting-runtime-identity`; neither first/last-wins nor a
mean score hides the conflict. `runtime.unavailable` with runtime source, matching
run ID, and nonempty code blocks acceptance even when a matching identity was
observed elsewhere in the trace. Recovery across attempts requires a fresh run;
adaptive multi-model acceptance is not implemented here.

An empty/no-identity trace is `runtime-unobserved`. Missing/incomplete data,
untrusted event origins, wrong run IDs, unavailable runtime, conflicting values,
and mismatched model or effort fail the gate. Truncation always yields
`incomplete-runtime-evidence`, including when the retained prefix has a matching
identity. The trace is capped at 256 events and retains the existing 2 MiB artifact
and 64 KiB record bounds.

## Trust and acceptance boundaries

The source marker is a declaration by the trusted collector, not cryptographic
authentication. A real adapter may emit it only from actual runtime observations;
it must leave missing model/effort unobserved rather than copy request settings.
The adapter, native raw-trace semantics, and independent live provenance remain
pending. A forged file from a compromised trusted collector is outside this
validator's guarantees. Hashes alone cannot prove where model labels came from.

The model scorer never uses caller `runtimePass`/`observedRuntime` overlays or
worker labels to replace loaded observations. Matching runtime identity cannot
override failed command, scope, evidence, output, execution, or input checks.
Previously passing selected inputs are checked again after every runtime loading attempt, including mismatch/failure paths, so an intervening edit
cannot leave an earlier input acceptance standing. Snapshot limitations from
[W00B-8](input-snapshots.md), including selection completeness and edit/restore
limitations, still apply.

## Observed validation

- Initial red: the runtime test file failed because the new loader export was
  absent. The first implementation passed 28/28 runtime contract tests.
- A separate red proved that unknown `runtime.*` events were being skipped after
  a valid observation. The closed runtime namespace then made that test green.
- Before review correction, runtime tests totaled 34 and the combined focused suite passed 158/158. It tests
  missing/mismatch/request-only/worker-only labels, incomplete data, alias/case
  differences, event origin/run, unavailable/conflicting identities, truncation,
  replay/tampering, and separation from verification output.
- Real file-edit tests replace the runtime artifact at EOF and preserve the
  originally verified mismatching model; another edits TASK.md during runtime
  loading and verifies the final input gate rejects the score. The temporary read
  interposition forwards real reads and is restored in `finally`.
- Eleven mutations were caught: omit model or effort comparison, accept request
  origin, borrow requested fields, ignore conflicts/unavailability/event run,
  accept a truncated prefix, reopen the trace after hashing, omit the runtime
  acceptance gate, and omit the final input recheck. Each selected test exited 1
  with an assertion failure; mutations were restored in `finally`.

Independent Sol review found one diagnostic gap: input rechecking was skipped
when runtime comparison failed. A new regression test reproduced `checks.inputs`
incorrectly remaining 1 after a TASK.md edit at runtime-trace EOF, while runtime
also mismatched. The final recheck now runs whenever the earlier input check
passed, regardless of runtime outcome. Both targeted input-edit tests passed;
follow-up review ACCEPTed the correction with no remaining findings. Runtime
tests now total 35.

Final `npm test`: exit 0, 216/216 passed, including the review regression.
Inventory check exited 0 with empty missing/stale/errors; `git diff --check`
passed and the baseline-only diff was empty. The final deterministic suite is
preserved as [verification JSON](runtime-identity-suite.json), a capture-once
[record](runtime-identity-suite.record.json), and the selected
[input manifest](runtime-identity-suite.inputs.json). It was loaded and accepted
through `scoreVerifiedCase` with exit 0 and a valid selected-input snapshot.
No runtime identity was manufactured for the npm process.

Trusted final suite expectation: run ID `46454294-4c63-430a-bd40-c6c0a12b3fcf`,
case ID `w00b9-deterministic-suite`, command argv `['npm', 'test']`, snapshot
SHA-256 `4b5271fced30deba6f6a168109ad5c697e638bd3ec321607c6072f5dbb30168a`.
The manifest covers ten selected W00B runtime/test sources plus the binding
specification, not every npm dependency or environment input.

## Continuation

W00B remains in progress. Live provider adapters and model baselines, full response
schema, remaining findings/recovery scoring and corpus coverage, registry/tier
eligibility, and the general runner remain pending. No routing/prompt changes,
dependencies, model evaluations, baseline recapture, merge, or release occurred.

Next coherent block: reviewer outcome scoring for the clean and genuine-defect
cases, including false positives, omitted defects, and exact evidence location.
Keep reviewer read-only authority distinct from implementation repair acceptance;
no live evaluations or generic runner rollout yet.
