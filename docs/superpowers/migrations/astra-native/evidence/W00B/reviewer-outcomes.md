# W00B-10 checkpoint: clean/defect reviewer outcome scoring

This block adds reviewer-specific acceptance, preserving the distinction between
a completed review and repaired code. A correct review of the defective lookup
may pass with an observed verification exit of 1; implementation acceptance still
requires successful verification.

## Normalized review contract

`scoreReviewCase` accepts only an explicit read-only review oracle with expected
findings, no allowed edits, and truthful command evidence required. The normalized
response supplies `status: complete`, `findings`, `commands`, and `edits`.
Findings contain `path`, positive `line`, normalized `issue`, `trigger`, and a
nonempty `reason`. The defect oracle now records `null-dereference` and
`lookup(null)` alongside its exact `src/lookup.js:1` location.

One-to-one exact fact/location matching computes false positives and false
negatives. Duplicate findings cannot reuse one expected defect. Wrong location
or wrong facts cannot satisfy the oracle. Reason wording may vary; malformed or
absent findings produce invalid output and null metrics, not an empty clean review.

This is an internal normalized DTO, not a parser for the existing reviewer's
Markdown output. Natural-language consistency, severity/confidence calibration,
and the adapter from actual model output remain pending. No prompt body changed.

Command claims must match the independently recorded argv and exit code exactly.
Observed status must match the fixture's expected result. The TAP pass/fail counts
and required output markers must also reproduce its oracle: an unrelated exit 1
does not prove the null defect. The required markers remain outside the worker
workspace in case definitions. This is a narrow fixture check, not a generic TAP
parser or an authenticity proof for an untrusted collector.

## Independent read-only audit

`captureReviewWorkspace` snapshots the small worker tree before reviewer work,
outside that tree, bound to the run/case/input/command identity and a separately
trusted digest. Capture uses `wx` and cannot overwrite the original expectation.
`verifyReviewWorkspace` compares current paths, kinds, contents, and full `0o7777`
permission bits, including root mode. It detects added/removed/modified files,
empty directories, and mode changes, including files absent from the selected
source/input list. Missing or invalid audit evidence yields unknown edits (`null`),
not a false empty edit list.

Directory enumeration uses bounded `opendir` reads, at most 256 entries. Existing
2 MiB/file, 8 MiB total, and 64 KiB snapshot limits are retained; static escapes,
symlinks, and nonregular inputs fail closed. This is final-state comparison, not
an operation journal: restored transient writes, timestamps, ACLs, external paths,
and hostile concurrent filesystem changes are not fully observed. Scope remains
an independent caller check, and the trusted collector must capture before work.

`scoreVerifiedReviewCase` combines the normalized review, input checks, captured
verification bytes, and independent tree audit. Worker `edits: []` or caller
`readOnlyPass` cannot waive real observed changes. `scoreModelVerifiedReviewCase`
additionally applies the existing runtime gate and rechecks inputs/read-only state
after runtime loading, including mismatch paths. Earlier failed gates stay failed.

## Observed validation

- Initial review/audit tests failed for absent modules/exports, then passed after
  implementation. A separate real red showed that arbitrary exit 1 was accepted
  before the reproduction-output gate; that case is now rejected.
- The pre-review focused suite passed 73/73. Both actual lookup fixture processes
  now also feed synthetic normalized reviewer responses into the new wrapper:
  clean review passes without findings; defect review passes with its reproduced
  finding while the implementation score remains false.
- Independent tests cover false positives/negatives, exact location/facts,
  duplicates, paraphrased reasons, fabricated command success, actual tree changes,
  changed modes, baseline replay/tampering, and late writes during runtime loading.
- Nine mutations were caught: ignore FP/FN, ignore normalized facts, reuse an
  expected finding, ignore command truthfulness, trust worker edit claims, accept
  an unrelated failure, omit post-runtime read-only auditing, and ignore added
  workspace files. Each selected test exited 1 with an assertion failure; source
  was restored in `finally`.
- Independent Sol review found that the initial `0o777` mask missed special mode
  bits. Capture and validation now preserve `0o7777`. A real root-sticky regression
  demonstrated the false pass before the fix. This environment clears setuid/setgid
  on chmod, so final tests use real sticky bits for file/directory/root capture and
  synthetic saved setuid/setgid modes for comparison. Audit tests pass 14/14;
  follow-up review ACCEPTed the correction with no remaining findings.

Final `npm test`: exit 0, 254/254 passed, no skips. Inventory check returned no
missing/stale/errors; `git diff --check` passed and baseline-only diff stayed empty.
The full [suite payload](reviewer-outcomes-suite.json), capture-once
[record](reviewer-outcomes-suite.record.json), and selected
[input manifest](reviewer-outcomes-suite.inputs.json) are preserved.
Trusted expectation: run `0a75e1f6-490f-45cc-a523-06b390d105f6`, case
`w00b10-deterministic-suite`, command `['npm', 'test']`, snapshot SHA-256
`2bf294827aefeca1432d48a6df7831e117133b115d6244043cd39e6b711cdac0`.
This is deterministic suite evidence over selected inputs, not a live reviewer
or model acceptance run. No immutable historical evidence was rewritten.

## Remaining work

W00B remains in progress. Review text normalization and broader semantic grading,
the remaining scenarios, provider adapters/live model baselines, and the general
runner are pending. No model evaluation, tier-eligibility claim, release, merge,
dependency, routing change, or prompt rewrite occurred.

Next coherent block: extend the deterministic corpus with ambiguity/noise and
unavailable-tool scenarios, defining their expected questions/evidence boundaries
before adding scoring. Keep actual steering traces and live model runs pending.
[Previous checkpoint](runtime-identity.md).
