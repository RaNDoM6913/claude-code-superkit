# W00B-6 checkpoint: bind evidence to case and command

Evidence capture and verification now require caller-supplied identity:

```js
const expected = { caseId: 'clean', command: ['node', '--test', 'test/lookup.test.js'] };
captureEvidence(root, 'output.txt', 'record.json', expected);
verifyEvidence(root, 'record.json', expected);
```

The expected identity comes from trusted task configuration, outside the worker
workspace. It must not be copied from the record being verified or worker claims.
Actual lookup tests define it before spawning the process and use its argv to
execute the verification command. The artifact and record remain in a separate
collector-owned directory.

## Contract changes

- New records use version 2 and contain `caseId`, `command`, `artifactPath`,
  and `sha256`. Capture copies/freezes the command array and still uses `wx`.
- Verification compares case IDs exactly, then argv length and each string
  argument in order. It returns `identity-mismatch` for any mismatch, even if
  the artifact hash is intact. No joining, shell parsing, or normalization occurs.
- Missing/invalid expected identity returns `invalid-identity`; capture throws
  before writing a record. Command must be a nonempty dense string array with a
  nonempty executable. Empty subsequent arguments are valid and remain distinct.
  Case ID must be a nonblank string; NUL characters are rejected.
- Version 1 and records missing valid identity return `invalid-record`; they
  cannot be silently upgraded into evidence for a newly supplied case.
- Existing SHA/path/file/read-limit checks remain. Serialized capture records
  exceeding the verifier's 64 KiB limit are rejected before creation.

The helpers are internal to this unfinished migration. All executable callers
were updated; historical W00B-5 documentation describes the previous version.
No immutable baseline or previous evidence artifact was rewritten.

## Observed red/green and regression checks

Before implementation, `node --test test/verification-evidence.test.js` exited 1:
5 passed, 14 failed. The old implementation accepted intact evidence for another
case, executable, test file, missing argument, and reordered arguments. New shape,
identity validation, and snapshot assertions also failed as expected.

After implementation, the combined evidence/behavioral suite passed 58/58:
19 evidence tests plus 39 behavioral checks. Replay cases use a real saved file,
first verify it under the original identity, then verify it under another expected
identity and feed that rejection into the partial scorer.

Mutation checks removed case comparison, removed command comparison, and replaced
argv comparison with joined text. All three failed the relevant identity assertion
with exit 1. The command-boundary test distinguishes `['node', 'a b', '']` from
`['node', 'a', 'b', '']`. Source was restored in `finally` after the checks.

Independent Sol review: ACCEPT, no actionable findings; reviewer confirmed all
JavaScript callers use the new API and reproduced 58/58 focused tests.

Final `npm test`: exit 0, 115/115 passed. Inventory check: exit 0 with empty
missing/stale/errors. `git diff --check` passed; baseline-only diff remained empty.

## Remaining boundary and next block

Matching case, command, and bytes does not authenticate the collector or prevent
replay between separate runs of the same case/command. Run identity, source and
instruction hashes, raw-trace provenance, and full model acceptance remain pending.
W00B stays in progress; no model calls, runner CLI, dependency, prompt/routing
change, merge, or release was introduced.

Next coherent block: load verification observations from the validated JSON
artifact, including exit code, instead of accepting unrelated caller-provided
command results. Reject malformed/incomplete artifact payloads and ensure parsing
uses the exact bytes whose hash was verified. Keep run identity and model runs
explicitly pending. Continue 5–10-minute blocks with review/verification/commit
and checkpoint at the end. [Previous checkpoint](evidence-integrity.md).
