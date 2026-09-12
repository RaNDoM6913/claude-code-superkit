import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs, { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureEvidence, loadVerificationEvidence } from '../tools/lib/verification-evidence.mjs';
import { scoreVerifiedCase } from '../tools/lib/behavioral-eval.mjs';

const identity = { runId: 'attempt-a', caseId: 'repair-null', command: ['node', '--test', 'test/lookup.test.js'] };
const spec = { id: identity.caseId, kind: 'implementation', expected: { commandsPass: true } };
const execution = { response: { status: 'complete' }, exitCode: 0 };
const payload = {
  version: 1, ...identity, exitCode: 0, signal: null, error: null,
  stdout: 'verified stdout', stderr: '', truncated: false,
};

function evidence(t, bytes, capturedIdentity = identity) {
  const root = mkdtempSync(join(tmpdir(), 'astra-observation-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'verification.json'), bytes);
  captureEvidence(root, 'verification.json', 'record.json', capturedIdentity);
  return root;
}

function score(root, overrides = {}) {
  return scoreVerifiedCase(spec, execution, {
    evidenceRoot: root, recordPath: 'record.json', expectedIdentity: identity, scopePass: true, ...overrides,
  });
}

test('loader derives command observations and raw output from verified artifact bytes', (t) => {
  const root = evidence(t, JSON.stringify(payload));
  assert.deepEqual(loadVerificationEvidence(root, 'record.json', identity), {
    pass: true, reason: null,
    observation: {
      evidencePass: true,
      commands: [{ command: identity.command, exitCode: 0, signal: null, error: null, stdout: payload.stdout, stderr: '' }],
    },
  });
  const result = score(root);
  assert.equal(result.pass, true);
  assert.equal(result.evidenceReason, null);
});

test('verified failing exit cannot be overridden by caller or payload success claims', (t) => {
  const root = evidence(t, JSON.stringify({
    ...payload, exitCode: 7, commands: [{ exitCode: 0 }], evidencePass: true, scopePass: true,
  }));
  const loaded = loadVerificationEvidence(root, 'record.json', identity);
  assert.equal(loaded.pass, true);
  assert.equal(loaded.observation.commands[0].exitCode, 7);
  const result = score(root, { commands: [{ exitCode: 0 }], evidencePass: true });
  assert.equal(result.pass, false);
  assert.equal(result.checks.commands, 0);
  assert.equal(result.checks.evidence, 1);
});

for (const [label, changes] of [
  ['missing stdout', { stdout: undefined }], ['non-string stdout', { stdout: {} }],
  ['missing stderr', { stderr: undefined }], ['missing exit', { exitCode: undefined }],
  ['string exit', { exitCode: '0' }], ['fractional exit', { exitCode: 0.5 }],
  ['negative exit', { exitCode: -1 }], ['oversized exit', { exitCode: 2 ** 32 }],
  ['missing signal', { signal: undefined }], ['invalid signal', { signal: '' }],
  ['missing error', { error: undefined }], ['invalid error', { error: true }],
  ['empty error code', { error: { code: '' } }],
  ['success plus signal', { signal: 'SIGTERM' }],
  ['success plus process error', { error: { code: 'ENOENT' } }],
  ['unfinished process', { exitCode: null }], ['missing truncation state', { truncated: undefined }],
  ['invalid truncation state', { truncated: 'false' }], ['unknown payload version', { version: 2 }],
]) {
  test(`${label} is invalid even under a matching artifact hash`, (t) => {
    const root = evidence(t, JSON.stringify({ ...payload, ...changes }));
    const result = loadVerificationEvidence(root, 'record.json', identity);
    assert.deepEqual(result, { pass: false, reason: 'invalid-payload', observation: { commands: [], evidencePass: false } });
    assert.equal(score(root).pass, false);
  });
}

for (const [label, raw] of [['malformed JSON', '{'], ['null JSON', 'null'], ['array JSON', '[]'], ['invalid UTF-8', Buffer.from([0xff])]]) {
  test(`${label} cannot produce trusted observations`, (t) => {
    const root = evidence(t, raw);
    assert.equal(loadVerificationEvidence(root, 'record.json', identity).reason, 'invalid-payload');
    assert.equal(score(root).pass, false);
  });
}

for (const [label, changes] of [
  ['run', { runId: 'attempt-b' }], ['case', { caseId: 'other-case' }],
  ['command', { command: ['node', 'other.js'] }],
]) {
  test(`payload ${label} cannot be relabeled by a matching record identity`, (t) => {
    const root = evidence(t, JSON.stringify({ ...payload, ...changes }));
    assert.equal(loadVerificationEvidence(root, 'record.json', identity).reason, 'payload-identity-mismatch');
    assert.equal(score(root).pass, false);
  });
}

test('truncated output stays incomplete even if the recorded command exited zero', (t) => {
  const root = evidence(t, JSON.stringify({ ...payload, truncated: true }));
  assert.equal(loadVerificationEvidence(root, 'record.json', identity).reason, 'incomplete-evidence');
  assert.equal(score(root).checks.evidence, 0);
});

for (const [label, changes] of [
  ['signal termination', { exitCode: null, signal: 'SIGTERM' }],
  ['spawn failure', { exitCode: null, error: { code: 'ENOENT' } }],
  ['timeout', { exitCode: null, signal: 'SIGTERM', error: { code: 'ETIMEDOUT' } }],
]) {
  test(`${label} supplies valid failure evidence, not a passing command`, (t) => {
    const root = evidence(t, JSON.stringify({ ...payload, ...changes }));
    const result = score(root);
    assert.equal(result.pass, false);
    assert.equal(result.checks.evidence, 1);
    assert.equal(result.checks.commands, 0);
  });
}

test('changed or missing evidence cannot be replaced by caller-supplied success flags', (t) => {
  const root = evidence(t, JSON.stringify(payload));
  writeFileSync(join(root, 'verification.json'), JSON.stringify({ ...payload, exitCode: 7 }));
  const result = score(root, { commands: [{ exitCode: 0 }], evidencePass: true });
  assert.equal(result.pass, false);
  assert.equal(result.evidenceReason, 'hash-mismatch');
  rmSync(join(root, 'verification.json'));
  assert.equal(score(root).evidenceReason, 'missing-file');
});

test('editing a failed command artifact into success cannot change acceptance', (t) => {
  const root = evidence(t, JSON.stringify({ ...payload, exitCode: 7 }));
  assert.equal(score(root).checks.commands, 0);
  writeFileSync(join(root, 'verification.json'), JSON.stringify(payload));
  const result = score(root);
  assert.equal(result.pass, false);
  assert.equal(result.evidenceReason, 'hash-mismatch');
});

test('scoring binds the expected evidence case to the requested implementation case', (t) => {
  const root = evidence(t, JSON.stringify(payload));
  const result = scoreVerifiedCase({ ...spec, id: 'another-case' }, execution, {
    evidenceRoot: root, recordPath: 'record.json', expectedIdentity: identity, scopePass: true,
  });
  assert.equal(result.pass, false);
  assert.equal(result.evidenceReason, 'case-mismatch');
});

test('trusted evidence does not manufacture scope acceptance', (t) => {
  const root = evidence(t, JSON.stringify({ ...payload, scopePass: true }));
  assert.equal(score(root, { scopePass: undefined }).pass, false);
  assert.equal(score(root, { scopePass: false }).checks.scope, 0);
});

test('loaded command observations cannot be edited into a passing result', (t) => {
  const root = evidence(t, JSON.stringify({ ...payload, exitCode: 7 }));
  const result = loadVerificationEvidence(root, 'record.json', identity);
  assert.throws(() => { result.observation.commands[0].exitCode = 0; }, TypeError);
  assert.throws(() => { result.observation.evidencePass = false; }, TypeError);
  assert.throws(() => result.observation.commands.push({ exitCode: 0 }), TypeError);
  assert.throws(() => result.observation.commands[0].command.push('changed'), TypeError);
});

test('loader parses the verified snapshot when the file changes at the end of its read', (t) => {
  const root = evidence(t, JSON.stringify({ ...payload, exitCode: 7 }));
  const artifactPath = join(root, 'verification.json');
  const artifactStat = statSync(artifactPath);
  const realRead = fs.readSync;
  let replaced = false;
  // Keep reads real; schedule a real file change precisely after artifact EOF.
  fs.readSync = (fd, ...args) => {
    const count = realRead(fd, ...args);
    const current = fs.fstatSync(fd);
    if (!replaced && count === 0 && current.dev === artifactStat.dev && current.ino === artifactStat.ino) {
      replaced = true;
      writeFileSync(artifactPath, JSON.stringify(payload));
    }
    return count;
  };
  syncBuiltinESMExports();
  try {
    const result = loadVerificationEvidence(root, 'record.json', identity);
    assert.equal(replaced, true);
    assert.equal(JSON.parse(readFileSync(artifactPath, 'utf8')).exitCode, 0);
    assert.equal(result.pass, true);
    assert.equal(result.observation.commands[0].exitCode, 7);
  } finally {
    fs.readSync = realRead;
    syncBuiltinESMExports();
  }
});

for (const scenario of [
  { name: 'passing verification', script: 'console.log("passed");', exit: 0, commandPass: 1 },
  { name: 'failed verification', script: 'console.error("failed"); process.exit(7);', exit: 7, commandPass: 0 },
  { name: 'terminated verification', script: 'process.kill(process.pid, "SIGTERM");', exit: null, signal: 'SIGTERM', commandPass: 0 },
  { name: 'verification timeout', script: 'setInterval(() => {}, 1000);', exit: null, signal: 'SIGTERM', error: 'ETIMEDOUT', timeout: 1000, commandPass: 0 },
  { name: 'unavailable verifier', missing: true, exit: null, error: 'ENOENT', commandPass: 0 },
  { name: 'truncated verification output', script: 'process.stdout.write("x".repeat(1024 * 1024)); setInterval(() => {}, 1000);', error: 'ENOBUFS', truncated: true, commandPass: 0 },
]) {
  test(`real verification pipeline: ${scenario.name}`, (t) => {
    const empty = mkdtempSync(join(tmpdir(), 'astra-verifier-'));
    t.after(() => rmSync(empty, { recursive: true, force: true }));
    const expected = {
      runId: randomUUID(), caseId: spec.id,
      command: scenario.missing ? [join(empty, 'missing-executable')] : [process.execPath, '-e', scenario.script],
    };
    const child = spawnSync(expected.command[0], expected.command.slice(1), {
      encoding: 'utf8', timeout: scenario.timeout ?? 10_000, maxBuffer: scenario.truncated ? 4096 : 128 * 1024,
    });
    if ('exit' in scenario) assert.equal(child.status, scenario.exit);
    if (scenario.signal) assert.equal(child.signal, scenario.signal);
    assert.equal(child.error?.code, scenario.error);
    const artifact = {
      version: 1, ...expected, exitCode: child.status, signal: child.signal,
      error: child.error ? { code: child.error.code } : null,
      stdout: child.stdout ?? '', stderr: child.stderr ?? '', truncated: child.error?.code === 'ENOBUFS',
    };
    const root = evidence(t, JSON.stringify(artifact), expected);
    const result = scoreVerifiedCase(spec, execution, {
      evidenceRoot: root, recordPath: 'record.json', expectedIdentity: expected, scopePass: true,
    });
    assert.equal(result.pass, scenario.commandPass === 1);
    assert.equal(result.checks.commands, scenario.commandPass);
    assert.equal(result.checks.evidence, scenario.truncated ? 0 : 1);
    assert.equal(result.evidenceReason, scenario.truncated ? 'incomplete-evidence' : null);
  });
}
