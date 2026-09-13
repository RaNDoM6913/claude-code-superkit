import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs, { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { captureEvidence, captureInputSnapshot, captureReviewWorkspace, loadVerificationEvidence } from '../tools/lib/verification-evidence.mjs';
import { scoreRecoveryCase, scoreVerifiedRecoveryCase, scoreModelVerifiedRecoveryCase } from '../tools/lib/recovery-eval.mjs';
import { matchesFixtureCommand, validFixtureCommand } from '../tools/lib/fixture-command.mjs';

const cases = JSON.parse(readFileSync(new URL('./fixtures/astra-native/cases.json', import.meta.url), 'utf8'));
const scenarios = cases.filter((item) => ['clarification', 'unavailable-tool'].includes(item.kind));

test('portable oracle matching accepts exact relative and anchored forms without widening scope', () => {
  const tool = ['./toolchain/fixture-compiler', '--version'];
  assert.equal(matchesFixtureCommand(tool, tool), true);
  assert.equal(matchesFixtureCommand(tool, ['/tmp/one/toolchain/fixture-compiler', '--version'], '/tmp/one'), true);
  assert.equal(matchesFixtureCommand(tool, ['/tmp/two/toolchain/fixture-compiler', '--version'], '/tmp/one'), false);
  assert.equal(matchesFixtureCommand(['node', '--test', 'test/policies.test.js'], [process.execPath, '--test', '--test-reporter=tap', 'test/policies.test.js']), true);
  assert.equal(matchesFixtureCommand(['node', '--test', 'test/policies.test.js'], ['/tmp/fake-node', '--test', 'test/policies.test.js']), false);
  assert.equal(validFixtureCommand(['./toolchain/../compiler']), false);
  assert.equal(validFixtureCommand(undefined), false);
});

function setup(t, scenario) {
  const evidenceRoot = mkdtempSync(join(tmpdir(), 'astra-recovery-'));
  t.after(() => rmSync(evidenceRoot, { recursive: true, force: true }));
  const workspaceRoot = join(evidenceRoot, 'workspace');
  mkdirSync(workspaceRoot);
  for (const file of scenario.files) {
    const path = join(workspaceRoot, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.content);
  }
  writeFileSync(join(workspaceRoot, 'TASK.md'), scenario.packet.task);
  const inputs = captureInputSnapshot(workspaceRoot, evidenceRoot, 'inputs.json', {
    sources: scenario.files.filter((file) => !file.path.endsWith('.md')).map((file) => file.path),
    instructions: [...scenario.files.filter((file) => file.path.endsWith('.md')).map((file) => file.path), 'TASK.md'],
  });
  const command = scenario.kind === 'clarification'
    ? [process.execPath, '--test', '--test-reporter=tap', 'test/policies.test.js']
    : [resolve(workspaceRoot, scenario.deterministicChecks.command[0]), ...scenario.deterministicChecks.command.slice(1)];
  const expectedIdentity = { snapshotSha256: inputs.sha256, runId: randomUUID(), caseId: scenario.id, command };
  const before = captureReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', expectedIdentity);
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  const result = spawnSync(command[0], command.slice(1), { cwd: workspaceRoot, env, encoding: 'utf8', timeout: 10_000, maxBuffer: 128 * 1024 });
  assert.equal(result.status, scenario.deterministicChecks.exitCode);
  if (scenario.kind === 'unavailable-tool') assert.equal(result.error?.code, 'ENOENT');
  else {
    assert.ifError(result.error);
    assert.match(result.stdout, /^# pass 2$/m, result.stdout);
  }
  writeFileSync(join(evidenceRoot, 'verification.json'), JSON.stringify({
    version: 2, ...expectedIdentity, exitCode: result.status, signal: result.signal,
    error: result.error ? { code: result.error.code } : null,
    stdout: result.stdout ?? '', stderr: result.stderr ?? '', truncated: false,
  }));
  captureEvidence(evidenceRoot, 'verification.json', 'record.json', expectedIdentity);
  return { workspaceRoot, evidenceRoot, expectedIdentity, snapshotPath: 'inputs.json', recordPath: 'record.json',
    reviewSnapshotPath: 'before.json', reviewSnapshotSha256: before.sha256, scopePass: true };
}

function execution(scenario, source) {
  const unavailable = scenario.kind === 'unavailable-tool';
  return { exitCode: 0, response: {
    status: 'blocked', outcome: unavailable ? 'tool-unavailable' : 'needs-input', edits: [], findings: [], decisions: [], outputs: [],
    commands: [{ command: source.expectedIdentity.command, exitCode: unavailable ? null : 0, signal: null, error: unavailable ? { code: 'ENOENT' } : null }],
    questions: unavailable ? [] : [{ subject: 'lookup(null)', alternatives: ['return-null', 'throw-missing-row'],
      references: [{ path: 'requirements/null.md', line: 1 }, { path: 'requirements/error.md', line: 1 }], question: 'Which null-input policy has authority?' }],
    unavailable: unavailable ? [{ tool: 'fixture-compiler', errorCode: 'ENOENT', command: source.expectedIdentity.command }] : [],
  } };
}

for (const scenario of scenarios) {
  test(`real ${scenario.id} oracle accepts the normalized safe recovery outcome`, (t) => {
    const source = setup(t, scenario);
    const run = execution(scenario, source);
    const score = scoreVerifiedRecoveryCase(scenario, run, source);
    assert.equal(score.pass, true, JSON.stringify(score));
    assert.equal(score.checks.readOnly, 1);
    // Completion of reporting does not mean implementation or compilation succeeded.
    run.response.status = 'complete';
    assert.equal(scoreVerifiedRecoveryCase(scenario, run, source).pass, true);
  });

  test(`${scenario.id} cannot fabricate decisions, findings or outputs`, (t) => {
    const source = setup(t, scenario);
    for (const field of ['decisions', 'findings', 'outputs']) {
      const run = execution(scenario, source);
      run.response[field] = ['invented result'];
      const score = scoreVerifiedRecoveryCase(scenario, run, source);
      assert.equal(score.pass, false);
      assert.equal(score.checks.noFabrication, 0);
    }
    const run = execution(scenario, source);
    run.response.outcome = 'implemented';
    assert.equal(scoreVerifiedRecoveryCase(scenario, run, source).checks.outcome, 0);
  });

  test(`${scenario.id} still requires intact evidence and read-only workspace`, (t) => {
    const source = setup(t, scenario);
    writeFileSync(join(source.workspaceRoot, 'invented-result.txt'), 'not allowed');
    const score = scoreVerifiedRecoveryCase(scenario, execution(scenario, source), { ...source, edits: [], readOnlyPass: true });
    assert.equal(score.pass, false);
    assert.equal(score.checks.readOnly, 0);
    rmSync(join(source.evidenceRoot, 'verification.json'));
    assert.equal(scoreVerifiedRecoveryCase(scenario, execution(scenario, source), source).checks.evidence, 0);
  });
}

test('ambiguous question requires both alternatives and exact source references', (t) => {
  const scenario = scenarios.find((item) => item.id === 'ambiguous');
  const source = setup(t, scenario);
  for (const change of [
    (q) => { q.references.pop(); },
    (q) => { q.references[0].line = 2; },
    (q) => { q.alternatives = ['return-null']; },
    (q) => { q.subject = 'unrelated'; },
    (q) => { q.question = ''; },
  ]) {
    const run = execution(scenario, source);
    change(run.response.questions[0]);
    assert.equal(scoreVerifiedRecoveryCase(scenario, run, source).pass, false);
  }
  const reversed = execution(scenario, source);
  reversed.response.questions[0].references.reverse();
  reversed.response.questions[0].alternatives.reverse();
  reversed.response.questions[0].question = 'Should missing rows return null or raise MissingRowError?';
  assert.equal(scoreVerifiedRecoveryCase(scenario, reversed, source).pass, true);
});

test('unavailable tool requires the actual attempted command and error, not an assertion', (t) => {
  const scenario = scenarios.find((item) => item.id === 'unavailable-tool');
  const source = setup(t, scenario);
  for (const change of [
    (r) => { r.unavailable = []; },
    (r) => { r.unavailable[0].errorCode = 'EACCES'; },
    (r) => { r.unavailable[0].command = ['different-compiler']; },
    (r) => { r.commands[0].exitCode = 0; r.commands[0].error = null; },
  ]) {
    const run = execution(scenario, source);
    change(run.response);
    assert.equal(scoreVerifiedRecoveryCase(scenario, run, source).pass, false);
  }
  const loaded = loadVerificationEvidence(source.evidenceRoot, source.recordPath, source.expectedIdentity);
  const fakeSuccess = { ...loaded.observation, edits: [], scopePass: true, commands: [{ command: source.expectedIdentity.command, exitCode: 0, signal: null, error: null }] };
  assert.equal(scoreRecoveryCase(scenario, execution(scenario, source), fakeSuccess).checks.oracle, 0);
});

test('missing structured output does not become an empty successful recovery', (t) => {
  const scenario = scenarios[0];
  const source = setup(t, scenario);
  for (const field of ['questions', 'unavailable', 'commands', 'edits', 'outputs', 'decisions', 'findings']) {
    const run = execution(scenario, source);
    delete run.response[field];
    assert.equal(scoreVerifiedRecoveryCase(scenario, run, source).pass, false);
  }
});

test('model recovery additionally requires a separate runtime trace', (t) => {
  const scenario = scenarios[0];
  const source = setup(t, scenario);
  const modelSource = { ...source, expectedRuntime: { model: 'fixture-model-a', effort: 'high' }, runtimeRecordPath: 'runtime.record.json' };
  assert.equal(scoreModelVerifiedRecoveryCase(scenario, execution(scenario, source), modelSource).pass, false);
  // Synthetic collector trace only; this does not evaluate a model.
  writeFileSync(join(source.evidenceRoot, 'runtime.json'), JSON.stringify({
    version: 1, kind: 'runtime-identity', ...source.expectedIdentity, truncated: false,
    events: [{ type: 'runtime.identity', source: 'runtime', runId: source.expectedIdentity.runId, observed: modelSource.expectedRuntime }],
  }));
  captureEvidence(source.evidenceRoot, 'runtime.json', 'runtime.record.json', source.expectedIdentity);
  assert.equal(scoreModelVerifiedRecoveryCase(scenario, execution(scenario, source), modelSource).pass, true);
});

test('runtime mismatch cannot hide a late workspace write during recovery', (t) => {
  const scenario = scenarios[0];
  const source = setup(t, scenario);
  const expectedRuntime = { model: 'fixture-model-a', effort: 'high' };
  writeFileSync(join(source.evidenceRoot, 'runtime.json'), JSON.stringify({
    version: 1, kind: 'runtime-identity', ...source.expectedIdentity, truncated: false,
    events: [{ type: 'runtime.identity', source: 'runtime', runId: source.expectedIdentity.runId, observed: { ...expectedRuntime, model: 'fixture-model-b' } }],
  }));
  captureEvidence(source.evidenceRoot, 'runtime.json', 'runtime.record.json', source.expectedIdentity);
  const artifact = statSync(join(source.evidenceRoot, 'runtime.json'));
  const realRead = fs.readSync;
  let changed = false;
  fs.readSync = (fd, ...args) => {
    const count = realRead(fd, ...args);
    const current = fs.fstatSync(fd);
    if (!changed && count === 0 && current.dev === artifact.dev && current.ino === artifact.ino) {
      changed = true;
      writeFileSync(join(source.workspaceRoot, 'late-choice.txt'), 'invented preference');
    }
    return count;
  };
  syncBuiltinESMExports();
  try {
    const score = scoreModelVerifiedRecoveryCase(scenario, execution(scenario, source), { ...source, expectedRuntime, runtimeRecordPath: 'runtime.record.json' });
    assert.equal(changed, true);
    assert.equal(score.pass, false);
    assert.equal(score.checks.runtime, 0);
    assert.equal(score.checks.readOnly, 0);
    assert.equal(score.auditReason, 'workspace-changed');
  } finally {
    fs.readSync = realRead;
    syncBuiltinESMExports();
  }
});

for (const scenario of scenarios) {
  test(`${scenario.id} rejects an unrelated process with matching output or error`, (t) => {
    const source = setup(t, scenario);
    const loaded = loadVerificationEvidence(source.evidenceRoot, source.recordPath, source.expectedIdentity);
    const fake = scenario.kind === 'clarification' ? [process.execPath, 'fake.js'] : ['/definitely/not/fixture-compiler', '--version'];
    const run = execution(scenario, source);
    run.response.commands[0].command = fake;
    if (run.response.unavailable.length) run.response.unavailable[0].command = fake;
    const observation = { ...loaded.observation, workspaceRoot: source.workspaceRoot, scopePass: true, edits: [],
      commands: [{ ...loaded.observation.commands[0], command: fake }] };
    assert.equal(scoreRecoveryCase(scenario, run, observation).pass, false);
    assert.throws(() => scoreRecoveryCase({ ...scenario, deterministicChecks: { ...scenario.deterministicChecks, command: undefined } }, run, observation), /unsupported recovery case/);
  });
}
