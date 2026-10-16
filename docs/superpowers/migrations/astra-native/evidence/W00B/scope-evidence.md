# W00B-3 checkpoint: scope/evidence boolean gates

The partial implementation scorer now requires `observation.scopePass === true`
and `observation.evidencePass === true` as well as successful observed commands.
False, absent, null, string, numeric, and object values cannot substitute for
boolean true. Positive flags inside the worker's self-report cannot override
negative or missing observations.

Returned coverage is now `commands-scope-evidence-only`. This remains a partial
score, not full implementation or model acceptance. The caller is responsible
for independently checking scope and evidence and supplying those observations;
the scorer does not inspect artifacts or establish evidence provenance. Fixture
tests use controlled flags and real child command exits, not a model audit.

## Observed red/green

`node --test test/behavioral-eval.test.js` before implementation exited 1:
5 passed, 6 failed. Four separate tests proved that false and missing scope/evidence
were incorrectly accepted (`true !== false`); the non-boolean test also failed.
The positive case additionally detected the old coverage label.

After adding both strict boolean gates, the same command exited 0, 11/11 passed.
The earlier failed-command checks retain positive scope/evidence observations,
so the new gates cannot mask a regression in command verification. Both real
lookup fixtures still execute: clean child exits 0; defect child exits 1.

## Acceptance and remaining work

Independent Sol review: ACCEPT, no actionable issues in the scoped diff;
reviewer independently verified 11/11 focused tests.

Final `npm test`: exit 0, 68/68 passed. Inventory check: exit 0, no
missing/stale/error entries. `git diff --check` passed; baseline-only diff empty.

W00B remains in progress. No model runs, dependencies, CLI runner, routing/prompt
changes, baseline recapture, merge, or release.

Next small slice: missing/invalid worker output for implementation cases. Add
negative tests for an absent response and a response lacking valid completion
status, then the minimal output gate. Preserve explicit partial coverage; defer
full result schema, evidence provenance, runtime identity, and model baselines.
