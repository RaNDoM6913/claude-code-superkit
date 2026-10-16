# W00B-7 checkpoint: score observations from verified, run-bound bytes

This block adds a verification observation loader and an evidence-backed scorer
entry point, and extends record identity to individual attempts. The user asked
for a larger block of about 20 minutes; model evaluations and the generic runner
remain excluded.

## Current API and trusted inputs

| API | Responsibility |
|---|---|
| `captureEvidence(root, artifactPath, recordPath, identity)` | Capture a new version 3 record without replacing an existing snapshot |
| `verifyEvidence(root, recordPath, expectedIdentity)` | Validate record identity and artifact integrity only |
| `loadVerificationEvidence(root, recordPath, expectedIdentity)` | Validate and parse the same verified bytes into immutable command observations |
| `scoreVerifiedCase(spec, execution, source)` | Bind `spec.id` to the expected case and feed only loaded command/evidence observations to the partial scorer |

Identity now requires `{runId, caseId, command}`. The trusted collector generates
a fresh run ID for every attempt, before starting verification. Exact run ID,
case ID, argv order, and argument boundaries must agree between expectation,
record, and verification payload. Version 1/2 records and missing run IDs fail
closed. Reusing a run ID defeats attempt separation; generating and protecting
the expected identity remains the collector's responsibility.

`source` supplies `evidenceRoot`, `recordPath`, `expectedIdentity`, and independently
checked `scopePass`. Caller-supplied `commands` or `evidencePass` do not replace
loaded values. A mismatched `spec.id` fails with `case-mismatch`. The lower-level
`scoreCase` remains a pure scoring primitive for already-established observations;
it is not an evidence loader or an authentication boundary.

## Verification artifact format

The artifact is UTF-8 JSON with its own `version: 1` and these required fields:

```js
{
  version: 1,
  runId: 'fresh-collector-attempt-id',
  caseId: 'repair-null',
  command: ['node', '--test', 'test/lookup.test.js'],
  exitCode: 0,
  signal: null,
  error: null,
  stdout: 'verification output',
  stderr: '',
  truncated: false
}
```

The payload version is distinct from record version 3. A normal completion has
an unsigned 32-bit integer exit code and null signal/error. An interrupted or
unavailable command has null exit code and a nonempty signal string and/or
`error: {code: nonemptyString}`. Contradictory combinations are invalid. Both
streams must be strings, and the truncation field must be an explicit boolean.

Valid failure evidence remains evidence: exit 7, signal termination, spawn
failure, or timeout yield `evidencePass: true` and a failed command gate. Truncated
output yields `incomplete-evidence` even if the saved process exit is zero.
Malformed/incomplete payloads fail with `invalid-payload`; valid but different
payload identity yields `payload-identity-mismatch`.

Loaded observations contain the command argv, exit code, signal, error code,
stdout, and stderr. They and their nested arrays/objects are frozen. All load
failures return an empty command list and `evidencePass: false`, never partial
success observations. Extra payload success claims are ignored. Scope acceptance
is neither inferred from evidence nor copied from worker output.

## Snapshot and resource boundaries

One internal read returns the record and verified artifact byte buffer. Parsing
uses that buffer; it never reopens the artifact path after checking its hash.
UTF-8 decoding is fatal on invalid byte sequences. Existing bounds remain:
2 MiB per artifact, 64 KiB per record, descriptor cleanup, static traversal and
symlink rejection, and capture-once `wx` writes.

The trusted collector directory remains outside the worker tree. These checks
do not authenticate the collector, defend a hostile concurrently modified root,
or establish source/instruction hashes and actual model identity. The read-time
snapshot has explicit semantics: later file changes do not alter already loaded
observations, and a fresh load detects a changed hash.

## Observed verification

- Run-ID red: 7 of 20 evidence tests failed before implementation; the old code
  accepted evidence from another attempt. After record version 3, 59 combined
  existing evidence/behavioral tests passed.
- Loader red: the new observation test file failed because its new export did
  not exist. Implementing loader/scorer integration gave 37/37 observation tests.
- The combined suite now passes 103/103. It includes six actual verification
  processes: exit 0, exit 7, SIGTERM, a bounded 1-second timeout, ENOENT, and an
  ENOBUFS/truncated-output case, plus both original lookup fixture processes.
- A deterministic test forwards real file reads and replaces the artifact after
  its EOF. The on-disk replacement says exit 0; the loaded verified snapshot still
  says exit 7. The temporary read interposition is restored in `finally`.
- Seven mutations were caught: omit run binding, omit hash verification, forge
  exit 0, ignore truncation, omit payload identity, reopen the artifact after hash
  checking, and fabricate successful observations in the scorer. Every selected
  test exited 1 with an assertion failure; source was restored in `finally`.

Independent Sol review: ACCEPT, no actionable findings in the scoped runtime,
loader, scorer, or tests. Reviewer reproduced 103/103 focused tests and checked
same-buffer parsing, identity migration, failure semantics, and API compatibility.

Final `npm test`: exit 0, 160/160 passed. Inventory check exited 0 with empty
missing/stale/errors; `git diff --check` passed and baseline-only diff was empty.
The full suite output is preserved as [verification JSON](verified-observations-suite.json)
and a capture-once [version 3 record](verified-observations-suite.record.json).
The saved artifact was loaded through `loadVerificationEvidence` with the
collector's original expectation and yielded verified exit 0.

Expected identity for that stored final verification (recorded here independently
of the payload): run ID `39acc3d6-1d19-494f-91f3-c546048f668b`, case ID
`w00b7-repository-suite`, command argv `['npm', 'test']`. This is deterministic
repository test evidence, not a model baseline or live model evaluation.

## Remaining work

W00B remains in progress. Full output schemas, source/instruction provenance,
runtime-observed model/effort identity, findings/recovery dimensions, comparable
model baselines, generic runner, and remaining scenarios are pending. This block
does not perform model evaluations or authorize a merge/release.

Next bounded block: bind the run's evidence to the source/instruction snapshot
being evaluated, with a real stale-source test. Reuse the existing immutable hash
and identity mechanisms; keep the scope explicit and defer the generic runner and
model calls. [Previous checkpoint](evidence-identity.md).
