# W00B-1 checkpoint: executable lookup fixtures

Scope: two literal review cases, a shared public node:test regression oracle,
and a deterministic parent test. No model evaluation, generic runner/scorer,
routing change, prompt rewrite, baseline recapture, merge, or release.

## Observed red/green

Command: `node --test test/behavioral-eval.test.js`.

1. Red: both source definitions initially used
   `export function lookup(row) { return row.id; }`.
   The parent exited 1: clean failed, defect passed. The clean child exited 1
   instead of expected 0; `missing row returns null` failed with
   `TypeError: Cannot read properties of null (reading 'id')` at
   `src/lookup.js:1:42`. The existing-row test passed.
2. Green: added `if (row === null) return null;` only to clean.
   The parent exited 0, 2/2 passed. Clean child: exit 0, 2 passed, 0 failed.
   Defect child: exit 1, 1 passed, 1 failed, same null TypeError at the source line.

Each child executes the same public regression test in its own temporary tree.
The parent verifies exits, pass/fail counts, and the defect's test/error/location;
it does not accept an arbitrary process failure as a reproduced defect.
Golden review findings and command expectations remain outside those trees.

## Acceptance and remaining work

Independent Sol review: ACCEPT, no actionable findings in the three executable
fixture/test files; reviewer independently reproduced the focused 2/2 pass.

Final verification: `npm test` exited 0, 59/59 passed;
`node tools/superkit-inventory.mjs check` exited 0 with empty missing/stale/errors;
`git diff --check` passed. `git diff --exit-code --
docs/superpowers/migrations/astra-native/baseline.json` exited 0.

W00B remains in progress. These are deterministic fixture checks, not behavioral
evaluations of Sol, Astra, or any other model. All model baselines and live
acceptance gates remain pending. The immutable W00A baseline is unchanged.

Next small slice: add the `failed-verification` scoring test from Task 2 and the
minimal scorer rule rejecting self-reported success when observed verification
fails. Do not start model runs or implement the remaining corpus in one session.
