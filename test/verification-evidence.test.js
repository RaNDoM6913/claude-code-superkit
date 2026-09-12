import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureEvidence, verifyEvidence } from '../tools/lib/verification-evidence.mjs';
import { scoreCase } from '../tools/lib/behavioral-eval.mjs';

function directory(t) {
  const root = mkdtempSync(join(tmpdir(), 'astra-evidence-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('captured evidence uses the known SHA-256 of the actual artifact bytes', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'output.txt'), 'abc');
  const record = captureEvidence(root, 'output.txt', 'record.json');
  assert.deepEqual(record, {
    version: 1, artifactPath: 'output.txt',
    sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  });
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'record.json'), 'utf8')), record);
  assert.deepEqual(verifyEvidence(root, 'record.json'), { pass: true, reason: null });
});

test('capture refuses to replace a record after the artifact changes', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'output.txt'), 'first run');
  captureEvidence(root, 'output.txt', 'record.json');
  const original = readFileSync(join(root, 'record.json'), 'utf8');
  writeFileSync(join(root, 'output.txt'), 'second run');
  assert.throws(() => captureEvidence(root, 'output.txt', 'record.json'), { code: 'EEXIST' });
  assert.equal(readFileSync(join(root, 'record.json'), 'utf8'), original);
  assert.deepEqual(verifyEvidence(root, 'record.json'), { pass: false, reason: 'hash-mismatch' });
});

test('stale artifact evidence rejects otherwise successful implementation scoring', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'output.txt'), 'verified output');
  captureEvidence(root, 'output.txt', 'record.json');
  const spec = { kind: 'implementation', expected: { commandsPass: true } };
  const execution = { response: { status: 'complete' }, exitCode: 0 };
  const observation = { commands: [{ exitCode: 0 }], scopePass: true };
  assert.equal(scoreCase(spec, execution, { ...observation, evidencePass: verifyEvidence(root, 'record.json').pass }).pass, true);
  writeFileSync(join(root, 'output.txt'), 'changed output');
  const result = scoreCase(spec, execution, { ...observation, evidencePass: verifyEvidence(root, 'record.json').pass });
  assert.equal(result.pass, false);
  assert.equal(result.checks.evidence, 0);
});

test('missing artifact and missing record fail closed', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'output.txt'), 'abc');
  captureEvidence(root, 'output.txt', 'record.json');
  rmSync(join(root, 'output.txt'));
  assert.deepEqual(verifyEvidence(root, 'record.json'), { pass: false, reason: 'missing-file' });
  assert.deepEqual(verifyEvidence(root, 'absent.json'), { pass: false, reason: 'missing-file' });
});

test('malformed records cannot be accepted as evidence', (t) => {
  const root = directory(t);
  for (const text of ['{', 'null', '[]', '{}', '{"version":2}', '{"version":1,"artifactPath":"a","sha256":"invalid"}']) {
    writeFileSync(join(root, 'record.json'), text);
    assert.deepEqual(verifyEvidence(root, 'record.json'), { pass: false, reason: 'invalid-record' });
  }
});

test('artifact paths cannot escape the evidence directory', (t) => {
  const root = directory(t);
  const outside = directory(t);
  writeFileSync(join(outside, 'output.txt'), 'abc');
  for (const artifactPath of ['../output.txt', join(outside, 'output.txt'), 'a/../output.txt', 'a\\output.txt']) {
    writeFileSync(join(root, 'record.json'), JSON.stringify({
      version: 1, artifactPath,
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    }));
    assert.deepEqual(verifyEvidence(root, 'record.json'), { pass: false, reason: 'unsafe-path' });
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
      version: 1, artifactPath,
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    }));
    assert.deepEqual(verifyEvidence(root, 'record.json'), { pass: false, reason: 'unsafe-path' });
  }
});

test('oversized evidence and directory artifacts are rejected', (t) => {
  const root = directory(t);
  writeFileSync(join(root, 'large.txt'), Buffer.alloc(2 * 1024 * 1024 + 1));
  assert.throws(() => captureEvidence(root, 'large.txt', 'record.json'), /too-large/);
  const record = { version: 1, artifactPath: 'large.txt', sha256: '0'.repeat(64) };
  writeFileSync(join(root, 'record.json'), JSON.stringify(record));
  assert.deepEqual(verifyEvidence(root, 'record.json'), { pass: false, reason: 'too-large' });
  writeFileSync(join(root, 'record.json'), Buffer.alloc(64 * 1024 + 1));
  assert.deepEqual(verifyEvidence(root, 'record.json'), { pass: false, reason: 'too-large' });
  mkdirSync(join(root, 'directory'));
  assert.throws(() => captureEvidence(root, 'directory', 'directory.json'), /not-file/);
  assert.throws(() => captureEvidence(root, 'missing/file.txt', 'record.json'), { code: 'ENOENT' });
});

test('record reads and writes cannot follow links or traverse outside the root', (t) => {
  const root = directory(t);
  const outside = directory(t);
  writeFileSync(join(root, 'output.txt'), 'abc');
  writeFileSync(join(outside, 'record.json'), 'untouched');
  symlinkSync(join(outside, 'record.json'), join(root, 'linked.json'));
  symlinkSync(outside, join(root, 'linked-directory'));
  assert.deepEqual(verifyEvidence(root, 'linked.json'), { pass: false, reason: 'unsafe-path' });
  assert.throws(() => captureEvidence(root, 'output.txt', 'linked.json'), { code: 'EEXIST' });
  assert.throws(() => captureEvidence(root, 'output.txt', 'linked-directory/new.json'), /unsafe-path/);
  assert.throws(() => captureEvidence(root, 'output.txt', '../new.json'), /unsafe-path/);
  assert.equal(readFileSync(join(outside, 'record.json'), 'utf8'), 'untouched');
});
