import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoreReviewCase } from '../tools/lib/review-eval.mjs';

const cases = JSON.parse(readFileSync(new URL('./fixtures/astra-native/cases.json', import.meta.url), 'utf8'));
const clean = cases.find((item) => item.id === 'clean');
const defect = cases.find((item) => item.id === 'defect');
const command = ['node', '--test', 'test/lookup.test.js'];
const finding = {
  path: 'src/lookup.js', line: 1, issue: 'null-dereference', trigger: 'lookup(null)',
  reason: 'Reading row.id throws for the missing-row input; add the null guard.',
};

function execution(findings = [], exitCode = 0, edits = []) {
  return { exitCode: 0, response: { status: 'complete', findings, commands: [{ command, exitCode }], edits } };
}
const observed = (exitCode, edits = []) => ({
  commands: [{ command, exitCode, signal: null, error: null, stdout: exitCode === 0
    ? 'ok 1 - missing row returns null\n# pass 2\n# fail 0\n'
    : "not ok 1 - missing row returns null\nname: 'TypeError'\nsrc/lookup.js:1:42\n# pass 1\n# fail 1\n", stderr: '' }], evidencePass: true, scopePass: true, edits,
});

test('clean review accepts zero findings without manufacturing work', () => {
  const score = scoreReviewCase(clean, execution(), observed(0));
  assert.equal(score.pass, true);
  assert.deepEqual(score.metrics, { falsePositives: 0, falseNegatives: 0 });
});

test('a reproduced defect may complete review while its regression test fails', () => {
  const score = scoreReviewCase(defect, execution([finding], 1), observed(1));
  assert.equal(score.pass, true);
  assert.equal(score.checks.commands, 1);
  assert.equal(score.checks.truthfulCommands, 1);
  assert.deepEqual(score.metrics, { falsePositives: 0, falseNegatives: 0 });
});

test('a finding on clean code is a false positive', () => {
  const score = scoreReviewCase(clean, execution([finding]), observed(0));
  assert.equal(score.pass, false);
  assert.deepEqual(score.metrics, { falsePositives: 1, falseNegatives: 0 });
});

test('omitting the genuine defect is a false negative', () => {
  const score = scoreReviewCase(defect, execution([], 1), observed(1));
  assert.equal(score.pass, false);
  assert.deepEqual(score.metrics, { falsePositives: 0, falseNegatives: 1 });
});

for (const changes of [{ path: 'src/unrelated.js' }, { line: 2 }, { path: './src/lookup.js' }]) {
  test(`wrong location ${JSON.stringify(changes)} cannot satisfy the defect oracle`, () => {
    const score = scoreReviewCase(defect, execution([{ ...finding, ...changes }], 1), observed(1));
    assert.equal(score.pass, false);
    assert.equal(score.checks.locations, 0);
    assert.deepEqual(score.metrics, { falsePositives: 1, falseNegatives: 1 });
  });
}

test('correct location with the wrong normalized defect fact is not accepted', () => {
  for (const changes of [{ issue: 'unrelated-bug' }, { trigger: 'lookup({id:42})' }]) {
    const score = scoreReviewCase(defect, execution([{ ...finding, ...changes }], 1), observed(1));
    assert.equal(score.pass, false);
    assert.deepEqual(score.metrics, { falsePositives: 1, falseNegatives: 1 });
  }
});

test('duplicate findings cannot match the same expected defect twice', () => {
  const score = scoreReviewCase(defect, execution([finding, { ...finding }], 1), observed(1));
  assert.equal(score.pass, false);
  assert.deepEqual(score.metrics, { falsePositives: 1, falseNegatives: 0 });
});

test('finding wording can vary while the normalized facts remain the same', () => {
  assert.equal(scoreReviewCase(defect, execution([{ ...finding, reason: 'Null input reaches the id property access.' }], 1), observed(1)).pass, true);
});

test('review cannot claim a passing command when evidence reproduces failure', () => {
  const score = scoreReviewCase(defect, execution([finding], 0), observed(1));
  assert.equal(score.pass, false);
  assert.equal(score.checks.commands, 1);
  assert.equal(score.checks.truthfulCommands, 0);
});

test('command truthfulness preserves exact argv and command count', () => {
  for (const commands of [[], [{ command: ['node', 'different.js'], exitCode: 0 }],
    [{ command, exitCode: 0 }, { command, exitCode: 0 }]]) {
    const run = execution();
    run.response.commands = commands;
    const score = scoreReviewCase(clean, run, observed(0));
    assert.equal(score.pass, false);
    assert.equal(score.checks.truthfulCommands, 0);
  }
});

test('an unexpected verification outcome cannot establish the review case', () => {
  assert.equal(scoreReviewCase(defect, execution([finding], 0), observed(0)).checks.commands, 0);
  assert.equal(scoreReviewCase(clean, execution([], 1), observed(1)).checks.commands, 0);
});

test('exit 1 from another failure does not reproduce the expected null defect', () => {
  const observation = observed(1);
  observation.commands[0].stdout = 'not ok 1 - missing dependency\n# pass 1\n# fail 1\n';
  const score = scoreReviewCase(defect, execution([finding], 1), observation);
  assert.equal(score.pass, false);
  assert.equal(score.checks.reproduction, 0);
});

test('reported or independently observed edits violate read-only authority', () => {
  for (const [reported, actual] of [[['src/lookup.js'], []], [[], [{ path: 'notes.txt', change: 'added' }]]]) {
    const score = scoreReviewCase(clean, execution([], 0, reported), observed(0, actual));
    assert.equal(score.pass, false);
    assert.equal(score.checks.readOnly, 0);
  }
  assert.equal(scoreReviewCase(clean, execution(), observed(0, null)).checks.readOnly, 0);
});

test('malformed findings are not treated as an empty clean review', () => {
  for (const findings of [undefined, null, 'none', [{}], [{ ...finding, line: 0 }],
    [{ ...finding, reason: '' }], [{ ...finding, issue: undefined }], Array(1)]) {
    const run = execution();
    run.response.findings = findings;
    const score = scoreReviewCase(clean, run, observed(0));
    assert.equal(score.pass, false);
    assert.equal(score.checks.output, 0);
    assert.deepEqual(score.metrics, { falsePositives: null, falseNegatives: null });
  }
});

test('scope, evidence and execution remain independent required gates', () => {
  assert.equal(scoreReviewCase(clean, execution(), { ...observed(0), scopePass: false }).pass, false);
  assert.equal(scoreReviewCase(clean, execution(), { ...observed(0), evidencePass: false }).pass, false);
  assert.equal(scoreReviewCase(clean, { ...execution(), exitCode: 1 }, observed(0)).pass, false);
  assert.equal(scoreReviewCase(clean, undefined, undefined).pass, false);
});

test('review authority and oracle expectations must be explicit', () => {
  for (const invalid of [{ ...clean, kind: 'implementation' }, { ...clean, packet: { authority: 'edit' } },
    { ...clean, expected: { ...clean.expected, findings: undefined } }]) {
    assert.throws(() => scoreReviewCase(invalid, execution(), observed(0)), /unsupported review case/);
  }
});
