# W00B-11 checkpoint: ambiguity, noise, and unavailable-tool corpus

The literal corpus now has clean, defect, noise, ambiguous, and unavailable-tool
cases. Golden expectations remain outside materialized worker roots. No live model
evaluation, generic runner, or broad prompt rewrite was added.

## Executable cases

- **Noise:** the existing null defect plus out-of-scope archive/log/config files.
  The scoped finding passes; an extra archive finding fails the review oracle.
  The whole small workspace remains covered by the independent read-only audit.
- **Ambiguous:** two equal-authority requirement files disagree about lookup(null).
  Real Node tests execute both candidate policies, proving divergence for null and
  agreement for existing rows. The expected recovery asks the open question with
  both alternatives and exact source references, without choosing a preference.
- **Unavailable tool:** C source plus toolchain instructions, with a deliberately
  absent fixture compiler. An actual absolute-path spawn returns ENOENT. Correct
  recovery reports the attempted command/error without fabricated tool output.

Noise records a four-file context budget as an expectation, but this block does
not measure worker reads or enforce that budget. Partial scoring covers findings,
scope observations, evidence and writes; live bounded-context behavior is pending.
Collector reads must not be counted as model context measurements.

## Recovery scoring

scoreRecoveryCase supports only explicit read-only clarification/unavailable-tool
oracles. scoreVerifiedRecoveryCase uses captured command evidence, input snapshots,
and before/after workspace auditing. scoreModelVerifiedRecoveryCase adds the
existing runtime identity gate and rechecks inputs/audit after runtime loading,
including mismatch paths.

Normalized responses contain status (blocked or completed reporting), exact
outcome (needs-input or tool-unavailable), commands, questions, unavailable-tool
claims, edits, findings, decisions and outputs. Passing means correct handling of
an obstacle, not successful implementation or compilation. An implemented outcome
cannot replace the required recovery state.

Questions must match the subject, both alternatives and both file/line references.
Ordering and question wording may vary. Unavailable claims must identify the
expected tool and match the actual attempted argv/error. Command reports must
match recorded exit, signal and error as well. Empty/malformed fields fail closed.
Both cases prohibit findings, chosen decisions, produced deliverables (outputs)
and edits. Captured stdout/stderr are evidence, not invented deliverables.

These are internal normalized DTOs. Native Markdown parsing, semantic inspection
of prose for hidden preferences, and live model understanding remain pending.
Scope and collector trust boundaries from earlier checkpoints still apply.

## Observed verification

Noise reused the existing executable lookup/review contract; scoped/out-of-scope
finding checks passed. Recovery tests first failed for the absent module. The
first ambiguity harness inherited NODE_TEST_CONTEXT=child-v8 and returned empty
stdout despite exit 0. The harness now clears that variable, matching the existing
lookup harness, and asserts the real TAP summary; no oracle was weakened.

Targeted recovery/lookup/review tests passed 70/70, including real policy execution,
real ENOENT, exact question references, absent/wrong error evidence, fabricated
outputs/preferences, missing fields, and late writes during runtime loading.
Runtime traces and normalized worker responses in these tests remain synthetic.

Seven mutations were caught: ignore fabrication, ignore the recovery outcome,
omit question references, ignore the actual tool oracle, ignore command
truthfulness, accept wrong/missing unavailable claims, and omit post-runtime
read-only checks. Each selected test exited 1 with an assertion failure; source
was restored in finally.

Independent review identified missing binding between the fixture oracle command
and the observed process. Three new red regressions showed unrelated TAP/ENOENT
processes could pass. A shared fixture-command validator now requires a valid
oracle and exact matching command, allowing only public/current Node with the
specified test file and optional fixed TAP reporter, or an exact relative tool
argv / workspace-anchored absolute equivalent. Wrong roots, fake executables,
missing oracles and alternate scripts reject. Review scoring uses the same fix.
An existing synthetic integration command was completed with its required test
path rather than weakening the new check. A minor relative-path normalization
issue was also corrected; direct helper/substitution tests pass 4/4.

Follow-up independent review ACCEPTed both corrections with no remaining findings.
Final `npm test`: exit 0, 271/271 passed with no skips. Inventory check had empty
missing/stale/errors; `git diff --check` passed and baseline-only diff was empty.
Preserved artifacts: [suite payload](recovery-corpus-suite.json), capture-once
[record](recovery-corpus-suite.record.json), and selected
[input manifest](recovery-corpus-suite.inputs.json).
Trusted suite identity: run `764c822a-122b-4bc7-bbcd-971ee69f4bf5`, case
`w00b11-deterministic-suite`, command `['npm', 'test']`, snapshot
`26ac350990c2cc0b1bd81557ce21548a9a668043049d91756092aea4ae85eaae`.
This is deterministic evidence, not a live model baseline.

## Remaining boundary

W00B remains in progress. Remaining base-case work includes explicit
failed-verification, live steering and insufficient-tier scenarios. Broader role
coverage, context measurements, complete normalization, provider adapters, model
baselines and the generic runner are pending. Baseline.json was not recaptured;
no routing change, dependency, merge or release occurred.

Next block: register deterministic failed-verification and insufficient-tier
contracts and negative tests. Keep steering as an explicit pending live-trace
requirement; do not simulate it and mark it accepted.
[Previous checkpoint](reviewer-outcomes.md).
