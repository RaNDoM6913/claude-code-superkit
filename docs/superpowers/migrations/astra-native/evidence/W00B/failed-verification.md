# W00B-2 checkpoint: failed-verification gate

`scoreCase(caseSpec, execution, observation)` now implements only the command
verification gate for implementation cases requiring `commandsPass: true`.
All observed commands must have numeric exit code 0 and the command list must
be nonempty. Failed, absent, or incomplete command evidence cannot pass;
self-reported completion and the worker's own exit code cannot override it.
Unsupported case kinds are rejected explicitly.

The returned `pass` is local to `coverage: command-verification-only`. It is
not overall case, implementation, or model acceptance. Scope, evidence
provenance, output validity, routing, and remaining scoring dimensions are not
implemented. The caller must supply independently obtained observations.

## Observed red/green

- Initial `node --test test/behavioral-eval.test.js`: exit 1, four new tests
  failed with `ERR_MODULE_NOT_FOUND`; the two existing fixtures passed.
- After implementation: exit 0, 6/6 passed. Tests cover failed verification
  despite claimed success, successful observed commands, absent/incomplete
  evidence, unsupported review cases, and real clean/defect child process exits.
- Mutation check: temporarily replaced the command-based predicate with
  `execution?.response?.status === 'complete'`. Running
  `node --test --test-name-pattern='self-reported success' test/behavioral-eval.test.js`
  exited 1 with `true !== false`. The original source was restored in `finally`.

## Acceptance and remaining work

Independent Sol review: ACCEPT, no actionable issues in the scoped scorer and
test changes; focused verification independently passed 6/6.

Final verification after mutation restoration: `npm test` exited 0, 63/63 passed.
`node tools/superkit-inventory.mjs check` exited 0 with empty missing/stale/errors.
`git diff --check` passed; the baseline-only diff was empty.

No dependencies, runner CLI, routing/prompt changes, model evaluations, merge,
or release. W00B remains in progress; immutable W00A baseline unchanged.

Next small slice: add the scope/evidence boolean gates and their negative tests
to this partial implementation scorer. Continue to label coverage explicitly;
do not claim full model acceptance or expand into runner/model baseline work.
