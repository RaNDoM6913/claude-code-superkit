# W00B-5 checkpoint: evidence artifact integrity

Added `captureEvidence(root, artifactPath, recordPath)` and
`verifyEvidence(root, recordPath)` in `tools/lib/verification-evidence.mjs`.
The collector-owned root is outside the eventual worker workspace. All paths
inside it use relative slash-separated components.

Capture reads the artifact bytes and writes a new JSON record containing
`version: 1`, `artifactPath`, and lowercase SHA-256. The write uses `wx` and never
replaces an existing record, including when the artifact has changed. Capture
returns a frozen record; a failed capture throws rather than reporting success.
The disk file is not tamper-proof: its owner remains responsible for protecting
the trusted record. This API's immutability means refusal to replace a snapshot.

Verification reads the record and artifact again. It returns `{pass, reason}`:
matching bytes pass; changed bytes produce `hash-mismatch`. Missing files,
malformed records, unsafe paths, non-files, oversized inputs, and read errors
fail closed. The verifier does not regenerate or update the expected hash.

Static traversal/absolute paths and symlinks in artifact or record paths are
rejected. Reads use file descriptors with a regular-file check and bounded
buffers: 2 MiB per artifact and 64 KiB per record. This is not a sandbox against
hostile concurrent filesystem changes, nor the eventual runner's aggregate
output limit. No generic schema framework or runner was introduced.

## Fixture integration and limits

The two real lookup fixture processes now save their exit code/stdout/stderr
into a JSON artifact in a separate temporary evidence directory. After capture,
the verifier's result supplies `observation.evidencePass` to the existing partial
scorer. Clean still succeeds; defect still fails command verification even when
its failure evidence has intact bytes. Temporary worker and evidence directories
are both removed by test cleanup.

Hash agreement proves integrity relative to a trusted record. It does not prove
authorship, command authenticity, or binding to a particular case/run. The
collector must establish those facts independently. The existing scorer remains
partial; no full model or implementation acceptance is inferred.

## Observed verification

- Initial `node --test test/verification-evidence.test.js` exited 1 because the
  new module did not exist. The first implemented evidence suite passed 8/8.
- Added record read/write path protection coverage and real fixture integration:
  `node --test test/verification-evidence.test.js test/behavioral-eval.test.js`
  passed 48/48 (9 evidence tests and 39 existing behavioral checks).
- The positive hash test uses the independent known SHA-256 for bytes `abc`.
  Stale-file scoring checks the same real artifact before and after changing it.
- Mutation replacing hash comparison with unconditional success: caught with
  exit 1 and `true !== false` in the stale-artifact scoring test.
- Mutation changing capture from `wx` to `w`: caught with exit 1 and
  `Missing expected exception` in the overwrite-protection test.
  Both mutations were restored in `finally` before final verification.

Independent Sol review: ACCEPT, no actionable findings in integrity verification,
resource limits, capture semantics, or fixture integration; reviewer reproduced
48/48 focused tests.

Final `npm test`: exit 0, 105/105 passed. Inventory check: exit 0 with empty
missing/stale/errors. `git diff --check` passed; baseline-only diff remained empty.

## Next bounded block

Bind the evidence snapshot to its expected verification case and command identity,
with negative tests for replaying another case/command's otherwise intact file.
Keep the expected identity outside worker control; retain current integrity checks.
Do not build the generic runner or launch model evaluations in that block.

W00B remains in progress. [W00B-4](output-execution.md) documents the existing
partial scorer. W00A baseline is immutable and unchanged; no routing/prompt
changes, dependencies, merge, or release were introduced. Continue coherent
5–10-minute blocks, with one review/verification/commit/checkpoint per block.
