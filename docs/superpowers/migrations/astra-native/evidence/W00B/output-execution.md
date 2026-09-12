# W00B-4 checkpoint: output and execution validation

This block extends the partial implementation scorer with worker output and
process completion checks, plus explicit 0/1 diagnostics for all five supported
gates. It does not implement the full behavioral scoring schema or a model runner.

## Current contract

`scoreCase(caseSpec, execution, observation)` still supports only implementation
cases with `expected.commandsPass: true`. Unsupported cases throw.

| Check | Pass condition |
|---|---|
| commands | Nonempty observed command array, each exit code is numeric 0 |
| scope | Independently supplied `observation.scopePass === true` |
| evidence | Independently supplied `observation.evidencePass === true` |
| output | Parsed response object, not an array, with `status: complete` |
| execution | Numeric `execution.exitCode === 0`, no signal or process error |

The optional `signal` and `error` fields may be absent or null. Any other value
rejects execution. Successful process completion alone does not establish output
validity; a complete response cannot override a failed process or observation.

The result contains `checks` with a 0/1 value for every supported gate, `pass`
requiring all five, and `coverage: commands-scope-evidence-output-execution-only`.
All diagnostics are evaluated, so one failure does not hide another.

Input `execution.response` must already be parsed. Raw text, including valid JSON
text, is rejected as an invalid response type. Parsing and preservation of raw
output belong to the caller; there is no production JSON loader in this block.
The tests parse real child stdout and represent missing/malformed output as an
absent response. Full output fields, artifact/provenance checks, runtime-observed
model identity, recovery, findings, and model acceptance remain pending.

## Observed verification

- Initial red: `node --test test/behavioral-eval.test.js` exited 1, with 10 passed
  and 27 failed. The old scorer accepted absent/invalid output and failed execution;
  the new diagnostic/coverage assertions also failed as expected.
- First green: 37/37 passed after implementing the gates and diagnostics.
- Added real SIGTERM and ENOENT process checks: focused suite passed 39/39.
- Six actual process scenarios cover a complete response with exit 0, the same
  response with exit 7, empty stdout, malformed JSON, signal termination, and a
  missing executable. Existing clean/defect lookup fixture processes also run.
  These are local Node/process tests, not model/provider evaluations.
- Mutation checks forced each gate (commands, scope, evidence, output, execution)
  to 1 in turn, then changed all-gates aggregation to any-gate aggregation.
  Every mutation produced exit 1 with `true !== false` in the relevant test.
  Source was restored in `finally`; the focused suite then passed 39/39.

Independent Sol review: ACCEPT after one documentation clarification explicitly
named deferred coverage in the source comment. Reviewer found no behavior or
process-test defects; no API expansion was needed.

Final `npm test`: exit 0, 96/96 passed. Inventory check: exit 0 with no missing,
stale, or error entries. `git diff --check` passed; the baseline-only diff was
empty. W00A evidence and its immutable baseline were not regenerated.

## Continuation boundary

W00B remains in progress. The immutable W00A baseline is unchanged. No dependency,
runner CLI, prompt/routing change, model evaluation, merge, or release was added.

The user now prefers coherent blocks lasting roughly 5–10 minutes, with one
review, final verification, commit/push, and checkpoint per block, rather than
stopping after each tiny predicate. Conserve limits and avoid artificial waiting.

Next bounded block: verification-evidence provenance for the existing fixture
commands. Define a small immutable evidence record and verify its referenced
artifact hash, with matching, missing, and stale artifact cases. Keep the loader
and tests narrow; defer the generic runner, broad schema framework, and models.
