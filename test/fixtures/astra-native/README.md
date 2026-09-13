# Lookup fixtures (W00B-1)

Run both variants from the repository root:

```sh
node --test test/behavioral-eval.test.js
```

`cases.json` contains two literal source trees and the first review case
definitions. The focused test materializes each tree in a separate temporary
directory, copies the shared `lookup.test.js` into `test/lookup.test.js`, and
executes Node there. Both variants check null input and an existing row.
Temporary trees are removed after each run.

The healthy child must exit 0 (two tests pass). The defective child must exit 1
(the null test throws TypeError at `src/lookup.js:1`; the existing-row test passes).
The parent suite passes only when both outcomes match. The defect is intentional.

Only literal files and the public regression test enter the temporary workspace.
Golden findings, command expectations, and case metadata remain outside it in
`cases.json`. This is fixture layout separation, not a security sandbox. The
shared regression test is public task input; it is not a hidden grading key.

The `expected` review criteria are definitions for future model runs and are not
scored here. Child exits also exercise the partial implementation command gate
in `scoreCase` using a separate repair specification and a controlled scope flag.
Each fixture's exit/stdout/stderr artifact and SHA-256 record live in a separate
collector-owned temporary directory; `loadVerificationEvidence` derives command
results and the evidence flag from those exact verified bytes.
Changed/missing artifacts fail verification, and capture refuses to overwrite
an existing record. Version 4 records bind the artifact to a fresh parent-generated
run ID, case ID, exact command argv, and the digest of an input snapshot. The
collector captures selected source files and public `TASK.md` instructions before
running the command. Scoring checks their contents before and after loading evidence.
Changed selected inputs or a different expected snapshot reject old results.
Expected identity stays outside worker control, and run IDs must not be reused.
This does not authenticate the collector or discover unselected dependencies.
The scorer's `pass` covers selected input contents, commands, scope/evidence flags, parsed completion output,
and successful execution. The result includes per-gate 0/1 diagnostics and explicit
partial coverage; it never represents full acceptance or an independent artifact
audit. The fixtures use `scoreVerifiedCase`, whose command/evidence inputs cannot
be replaced by caller success claims. Separate local process tests exercise
invalid output, timeout, truncation, and failed execution.
No model is invoked or evaluated.
The separate `runtime-evidence.test.js` uses synthetic internal collector traces
to test the optional model-attempt entry point, `scoreModelVerifiedCase`.
Request/worker labels do not count as observed identity. These tests do not prove
live model routing or tier eligibility; provider adapters remain pending.
Remaining scoring dimensions, runner interfaces, other scenarios and roles,
and live behavioral acceptance remain pending in W00B.

The lookup cases also exercise normalized review scoring: no findings on clean,
one exact null-dereference finding on defect, truthful TAP reproduction, and no
workspace edits. A collector-owned before-review tree snapshot checks unselected
files and permissions too. The normalized responses are synthetic; no Markdown
review parser, semantic prose grader, or live model evaluation is implied.
