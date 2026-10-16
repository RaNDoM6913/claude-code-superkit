# W00B-8 checkpoint: bind verification evidence to selected inputs

This block binds a verification attempt to the content of explicitly selected
source and instruction files. It extends the W00B-7 loader/scorer without adding
a general runner, model evaluations, or a repository-wide dependency scanner.

## Snapshot contract

```js
const snapshot = captureInputSnapshot(workspaceRoot, evidenceRoot, 'inputs.json', {
  sources: ['package.json', 'src/lookup.js', 'test/lookup.test.js'],
  instructions: ['TASK.md']
});
const expectedIdentity = {
  snapshotSha256: snapshot.sha256,
  runId: freshAttemptId,
  caseId: 'clean',
  command: [nodeExecutable, '--test', 'test/lookup.test.js']
};
```

The trusted caller supplies both nonempty path lists. They must be dense and
distinct, with no duplicate path within or between groups. Capture reads each
file and stores `{version: 1, files: [{kind, path, sha256}, ...]}`. Source entries
precede instruction entries; paths within each group use deterministic string
ordering. Absolute checkout location and the caller's selection order do not
affect the snapshot digest. File role and relative path do affect it, even when
content bytes are identical.

Capture writes the manifest with `wx`, then returns its digest and frozen file
entries. It cannot replace an existing expectation. `verifyInputSnapshot` first
checks the manifest bytes against the separately trusted digest, then verifies
the selected current files. Editing the manifest cannot redefine a run's expected
inputs. The caller stores the manifest outside the worker root and must keep its
expected digest outside worker control.

Bounds: at most 128 selected files, at most 2 MiB per file, at most 8 MiB total
input bytes, and at most 64 KiB of manifest JSON. The same bounded descriptor
reads and static symlink/path-escape checks used for evidence are reused here.
Both capture and verification enforce the limits.

## Evidence and scorer integration

Record version 4 and verification payload version 2 require `snapshotSha256` as
part of identity, alongside run ID, case ID, and exact command argv. Earlier
versions or missing snapshot identity are rejected rather than upgraded. Previous
committed evidence files remain unchanged and describe their historical format.

`scoreVerifiedCase` additionally requires `workspaceRoot` and `snapshotPath`.
It verifies the current inputs before loading evidence. When evidence loads
successfully, it verifies inputs again before returning acceptance. A concrete
edit during evidence loading therefore cannot leave the earlier input check
standing. Overall pass requires both the existing partial score and valid inputs.

The result adds `checks.inputs`, `inputReason`, and the explicit coverage label
`inputs-commands-scope-evidence-output-execution-only`. An input failure before
loading gives `evidenceReason: input-snapshot-invalid`; an edit detected after
loading can retain valid evidence diagnostics while the input gate rejects the
result. Caller flags such as `inputsPass: true` do not replace verification.

The actual clean/defect lookup fixtures materialize public `TASK.md` instructions
from their task packet. Before spawning Node, the collector captures the package,
source, public regression test, and task instructions in a separate evidence
directory. Scoring then uses the same snapshot identity and current workspace.

## Scope and trust limits

This verifies selected file contents at check time. It does not discover missing
dependencies, newly added unselected files, inherited instructions, environment
state, file permissions, runtime/model identity, or all inputs that might affect
a command. Selection completeness remains a trusted caller responsibility. Scope
acceptance remains separately supplied; a valid snapshot does not manufacture it.

The collector is trusted, and its evidence root must be protected from the worker.
This is not filesystem monitoring, an authorship guarantee, or a hostile concurrent
filesystem sandbox. An edit that is restored between checks is not detected;
future execution isolation/trace validation must address that stronger requirement.
The final suite snapshot covers the selected W00B implementation/tests and design
specification, not the full npm dependency graph or every repository surface.

## Observed red/green and validation

- New snapshot API tests first failed because the exports were absent. After
  implementation, 13/13 snapshot tests passed, including known file hashes,
  canonical ordering, role binding, overwrite refusal, missing/changed inputs,
  malformed/tampered manifests, static escapes, and byte/count limits.
- Five scorer red tests showed the old entry point accepted changed source,
  changed instructions, missing snapshot configuration, a replacement manifest,
  and an instruction edit made during artifact loading (`true !== false`).
- One existing record-size negative fixture initially omitted the new required
  digest. Its input was corrected, preserving the size-limit assertion; runtime
  validation was not weakened.
- The restored combined suite passes 124/124. Two additional real Node scenarios
  execute successfully, then reject their old evidence after source or instruction
  changes. The source-change scenario also reruns Node and observes exit 1 from
  the newly introduced defect.
- Eight mutations were caught: skip the trusted manifest digest, skip a current
  file hash, omit instruction files, omit snapshot identity, overwrite a snapshot,
  omit the aggregate byte cap, omit the post-load recheck, and ignore the input
  acceptance gate. Every selected test exited 1 with an assertion failure.
  Mutations were restored in `finally` before subsequent verification.

Independent Sol review: ACCEPT after correcting one stale fixture-layout comment.
No functional findings remained; reviewer reproduced 124/124 focused tests and
verified the active caller migration to record v4/payload v2.

Final `npm test`: exit 0, 181/181 passed. Inventory check exited 0 with empty
missing/stale/errors; `git diff --check` passed and baseline-only diff was empty.
The final run preserved its [selected input manifest](input-snapshots-suite.inputs.json),
[verification payload](input-snapshots-suite.json), and capture-once
[evidence record](input-snapshots-suite.record.json). Loading and scoring those
artifacts produced exit 0 and `checks.inputs: 1` on the current selected files.

Trusted final-run expectation: run ID `9c492e5c-ecd7-4ce8-94f9-5dd768f65209`,
case ID `w00b8-selected-input-suite`, command argv `['npm', 'test']`, snapshot
SHA-256 `78607ed18509494a58af1427312297e49951a29f4ff1e709ea1b1591c6ed128f`.
The manifest records nine selected source/test inputs plus the binding design
specification. This is deterministic test evidence, not a model evaluation.

## Continuation

W00B remains in progress. Full instruction-delivery provenance, runtime-observed
model/effort identity, findings/recovery scoring, comparable model baselines, and
the remaining corpus/runner are pending. No model calls, routing/prompt rewrites,
dependencies, baseline recapture, merge, or release were introduced.

Next coherent block: define and test the runtime-observed model/effort evidence
gate, with missing identity, mismatched identity, and forged requested-label cases.
Keep runtime observation provenance distinct from requested configuration and do
not launch model evaluations or infer tier eligibility yet.
[Previous checkpoint](verified-observations.md).
