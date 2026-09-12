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
in `scoreCase` using a separate repair specification. Its `pass` covers command
verification only, never full acceptance. No model is invoked or evaluated.
Remaining scoring dimensions, runner interfaces, other scenarios and roles,
and live behavioral acceptance remain pending in W00B.
