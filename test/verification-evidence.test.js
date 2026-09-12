import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureEvidence, verifyEvidence } from '../tools/lib/verification-evidence.mjs';
import { scoreCase } from '../tools/lib/behavioral-eval.mjs';

const identity = { runId: 'run-a', caseId: 'clean', command: ['node', '--test', 'test/lookup.test.js'] };

function directory(t) {
  const root = mkdtempSync(join(tmpdir(), 'astra-evidence-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

for (const [label, expected] of [
  ['another run', { ...identity, runId: 'run-b' }],
  ['another case', { ...identity, caseId: 'defect' }],
  ['another executable', { ...identity, command: ['other-node', '--test', 'test/lookup.test.js'] }],
  ['another test file', { ...identity, command: ['node', '--test', 'test/unrelated.test.js'] }],
  ['missing argument', { ...identity, command: ['node', '--test'] }],
  ['reordered arguments', { ...identity, command: ['node', 'test/lookup.test.js', '--test'] }],
]) {
  test(`intact evidence cannot be replayed for ${label}`, (t) => {
    const root = directory(t);
    writeFileSync(join(root, 'output.txt'), 'abc');
    captureEvidence(root, 'output.txt', 'record.json', identity);
    assert.deepEqual(verifyEvidence(root, 'record.json', identity), { pass: true, reason: null });
    const replay = verifyEvidence(root, 'record.json', expected);
    assert.deepEqual(replay, { pass: false, reason: 'identity-mismatch' });
    const scored = scoreCase({ kind: 'implementation', expected: { commandsPass: true } }, {
      response: { status: 'complete' }, exitCode: 0,
    }, { commands: [{ exitCode: 0 }], scopePass: true, evidencePass: replay.pass });
    assert.equal(scored.pass, false);
    assert.equal(scored.checks.evidence, 0);
  });
}

test('command identity preserves argument boundaries instead of joining strings', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'output.txt'), 'abc');
  captureEvidence(root, 'output.txt', 'record.json', { runId: 'args-run', caseId: 'args', command: ['node', 'a b', ''] });
  assert.deepEqual(verifyEvidence(root, 'record.json', { runId: 'args-run', caseId: 'args', command: ['node', 'a b', ''] }), { pass: true, reason: null });
  assert.deepEqual(verifyEvidence(root, 'record.json', { runId: 'args-run', caseId: 'args', command: ['node', 'a', 'b', ''] }), { pass: false, reason: 'identity-mismatch' });
});

test('identity is mandatory and must be valid on capture and verification', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'output.txt'), 'abc');
  for (const invalid of [undefined, null, {}, { ...identity, runId: undefined }, { ...identity, runId: '' }, { ...identity, runId: ' ' }, { ...identity, runId: 1 }, { ...identity, runId: '\0' }, { runId: 'run-a', caseId: ' ', command: ['node'] },
    { runId: 'run-a', caseId: 'clean', command: [] }, { runId: 'run-a', caseId: 'clean', command: 'node --test' },
    { runId: 'run-a', caseId: 'clean', command: [''] }, { runId: 'run-a', caseId: 'clean', command: ['node', 1] },
    { runId: 'run-a', caseId: 'clean', command: ['node', '\0'] }, { runId: 'run-a', caseId: 'clean', command: Array(1) }]) {
    assert.throws(() => captureEvidence(root, 'output.txt', 'record.json', invalid), /invalid-identity/);
    assert.equal(existsSync(join(root, 'record.json')), false);
    assert.deepEqual(verifyEvidence(root, 'record.json', invalid), { pass: false, reason: 'invalid-identity' });
  }
});

test('legacy or missing record identity cannot satisfy an expected identity', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'output.txt'), 'abc');
  const record = captureEvidence(root, 'output.txt', 'record.json', identity);
  for (const invalid of [{ ...record, version: 1 }, { ...record, version: 2 }, { ...record, runId: undefined }, { ...record, caseId: undefined },
    { ...record, command: [] }, { ...record, command: 'node --test' }]) {
    writeFileSync(join(root, 'record.json'), JSON.stringify(invalid));
    assert.deepEqual(verifyEvidence(root, 'record.json', identity), { pass: false, reason: 'invalid-record' });
  }
});

test('captured command identity is a frozen copy of caller input', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'output.txt'), 'abc');
  const input = { runId: 'run-a', caseId: 'clean', command: ['node', '--test'] };
  const record = captureEvidence(root, 'output.txt', 'record.json', input);
  input.command.push('different.test.js');
  input.caseId = 'defect';
  assert.deepEqual(record.command, ['node', '--test']);
  assert.throws(() => record.command.push('changed'), TypeError);
  assert.deepEqual(verifyEvidence(root, 'record.json', { runId: 'run-a', caseId: 'clean', command: ['node', '--test'] }), { pass: true, reason: null });
});

test('capture rejects a record exceeding the verifier limit before creating it', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'output.txt'), 'abc');
  assert.throws(() => captureEvidence(root, 'output.txt', 'record.json', {
    runId: 'run-a', caseId: 'clean', command: ['node', 'x'.repeat(64 * 1024)],
  }), /too-large/);
  assert.equal(existsSync(join(root, 'record.json')), false);
});

test('captured evidence uses the known SHA-256 of the actual artifact bytes', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'output.txt'), 'abc');
  const record = captureEvidence(root, 'output.txt', 'record.json', identity);
  assert.deepEqual(record, {
    version: 3, ...identity, artifactPath: 'output.txt',
    sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  });
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'record.json'), 'utf8')), record);
  assert.deepEqual(verifyEvidence(root, 'record.json', identity), { pass: true, reason: null });
});

test('capture refuses to replace a record after the artifact changes', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'output.txt'), 'first run');
  captureEvidence(root, 'output.txt', 'record.json', identity);
  const original = readFileSync(join(root, 'record.json'), 'utf8');
  writeFileSync(join(root, 'output.txt'), 'second run');
  assert.throws(() => captureEvidence(root, 'output.txt', 'record.json', identity), { code: 'EEXIST' });
  assert.equal(readFileSync(join(root, 'record.json'), 'utf8'), original);
  assert.deepEqual(verifyEvidence(root, 'record.json', identity), { pass: false, reason: 'hash-mismatch' });
});

test('stale artifact evidence rejects otherwise successful implementation scoring', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'output.txt'), 'verified output');
  captureEvidence(root, 'output.txt', 'record.json', identity);
  const spec = { kind: 'implementation', expected: { commandsPass: true } };
  const execution = { response: { status: 'complete' }, exitCode: 0 };
  const observation = { commands: [{ exitCode: 0 }], scopePass: true };
  assert.equal(scoreCase(spec, execution, { ...observation, evidencePass: verifyEvidence(root, 'record.json', identity).pass }).pass, true);
  writeFileSync(join(root, 'output.txt'), 'changed output');
  const result = scoreCase(spec, execution, { ...observation, evidencePass: verifyEvidence(root, 'record.json', identity).pass });
  assert.equal(result.pass, false);
  assert.equal(result.checks.evidence, 0);
});

test('missing artifact and missing record fail closed', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'output.txt'), 'abc');
  captureEvidence(root, 'output.txt', 'record.json', identity);
  rmSync(join(root, 'output.txt'));
  assert.deepEqual(verifyEvidence(root, 'record.json', identity), { pass: false, reason: 'missing-file' });
  assert.deepEqual(verifyEvidence(root, 'absent.json', identity), { pass: false, reason: 'missing-file' });
});

test('malformed records cannot be accepted as evidence', (t) => {
  const root = directory(t);
  for (const text of ['{', 'null', '[]', '{}', '{"version":2}', '{"version":1,"artifactPath":"a","sha256":"invalid"}']) {
    writeFileSync(join(root, 'record.json'), text);
    assert.deepEqual(verifyEvidence(root, 'record.json', identity), { pass: false, reason: 'invalid-record' });
  }
});

test('artifact paths cannot escape the evidence directory', (t) => {
  const root = directory(t);
  const outside = directory(t);
  writeFileSync(join(outside, 'output.txt'), 'abc');
  for (const artifactPath of ['../output.txt', join(outside, 'output.txt'), 'a/../output.txt', 'a\\output.txt']) {
    writeFileSync(join(root, 'record.json'), JSON.stringify({
      version: 3, ...identity, artifactPath,
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    }));
    assert.deepEqual(verifyEvidence(root, 'record.json', identity), { pass: false, reason: 'unsafe-path' });
  }
});

test('symlinked artifacts and parent directories cannot supply evidence', (t) => {
  const root = directory(t);
  const outside = directory(t);
  writeFileSync(join(outside, 'output.txt'), 'abc');
  symlinkSync(join(outside, 'output.txt'), join(root, 'linked.txt'));
  symlinkSync(outside, join(root, 'linked-directory'));
  for (const artifactPath of ['linked.txt', 'linked-directory/output.txt']) {
    writeFileSync(join(root, 'record.json'), JSON.stringify({
      version: 3, ...identity, artifactPath,
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    }));
    assert.deepEqual(verifyEvidence(root, 'record.json', identity), { pass: false, reason: 'unsafe-path' });
  }
});

test('oversized evidence and directory artifacts are rejected', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'large.txt'), Buffer.alloc(2 * 1024 * 1024 + 1));
  assert.throws(() => captureEvidence(root, 'large.txt', 'record.json', identity), /too-large/);
  const record = { version: 3, ...identity, artifactPath: 'large.txt', sha256: '0'.repeat(64) };
  writeFileSync(join(root, 'record.json'), JSON.stringify(record));
  assert.deepEqual(verifyEvidence(root, 'record.json', identity), { pass: false, reason: 'too-large' });
  writeFileSync(join(root, 'record.json'), Buffer.alloc(64 * 1024 + 1));
  assert.deepEqual(verifyEvidence(root, 'record.json', identity), { pass: false, reason: 'too-large' });
  mkdirSync(join(root, 'directory'));
  assert.throws(() => captureEvidence(root, 'directory', 'directory.json', identity), /not-file/);
  assert.throws(() => captureEvidence(root, 'missing/file.txt', 'record.json', identity), { code: 'ENOENT' });
});

test('record reads and writes cannot follow links or traverse outside the root', (t) => {
  const root = directory(t);
  const outside = directory(t);
  writeFileSync(join(root, 'output.txt'), 'abc');
  writeFileSync(join(outside, 'record.json'), 'untouched');
  symlinkSync(join(outside, 'record.json'), join(root, 'linked.json'));
  symlinkSync(outside, join(root, 'linked-directory'));
  assert.deepEqual(verifyEvidence(root, 'linked.json', identity), { pass: false, reason: 'unsafe-path' });
  assert.throws(() => captureEvidence(root, 'output.txt', 'linked.json', identity), { code: 'EEXIST' });
  assert.throws(() => captureEvidence(root, 'output.txt', 'linked-directory/new.json', identity), /unsafe-path/);
  assert.throws(() => captureEvidence(root, 'output.txt', '../new.json', identity), /unsafe-path/);
  assert.equal(readFileSync(join(outside, 'record.json'), 'utf8'), 'untouched');
});
