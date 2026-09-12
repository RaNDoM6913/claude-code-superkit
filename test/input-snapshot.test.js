import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureEvidence, captureInputSnapshot, verifyInputSnapshot } from '../tools/lib/verification-evidence.mjs';
import { scoreVerifiedCase } from '../tools/lib/behavioral-eval.mjs';

const abcHash = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const selection = { sources: ['src/lookup.js'], instructions: ['TASK.md'] };

function workspace(t) {
  const evidenceRoot = mkdtempSync(join(tmpdir(), 'astra-inputs-'));
  t.after(() => rmSync(evidenceRoot, { recursive: true, force: true }));
  const root = join(evidenceRoot, 'workspace');
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src/lookup.js'), 'abc');
  writeFileSync(join(root, 'TASK.md'), 'abc');
  return { root, evidenceRoot };
}

test('input snapshot binds selected source and instruction paths to actual bytes', (t) => {
  const { root, evidenceRoot } = workspace(t);
  const snapshot = captureInputSnapshot(root, evidenceRoot, 'inputs.json', selection);
  const expected = {
    version: 1,
    files: [
      { kind: 'source', path: 'src/lookup.js', sha256: abcHash },
      { kind: 'instruction', path: 'TASK.md', sha256: abcHash },
    ],
  };
  assert.deepEqual(JSON.parse(readFileSync(join(evidenceRoot, 'inputs.json'), 'utf8')), expected);
  assert.equal(snapshot.sha256, createHash('sha256').update(JSON.stringify(expected, null, 2) + '\n').digest('hex'));
  assert.deepEqual(verifyInputSnapshot(root, evidenceRoot, 'inputs.json', snapshot.sha256), { pass: true, reason: null });
  assert.throws(() => snapshot.files.push({}), TypeError);
  assert.throws(() => { snapshot.files[0].sha256 = 'changed'; }, TypeError);
});

for (const path of ['src/lookup.js', 'TASK.md']) {
  test(`changed ${path} invalidates the input snapshot`, (t) => {
    const { root, evidenceRoot } = workspace(t);
    const snapshot = captureInputSnapshot(root, evidenceRoot, 'inputs.json', selection);
    writeFileSync(join(root, path), 'changed');
    assert.deepEqual(verifyInputSnapshot(root, evidenceRoot, 'inputs.json', snapshot.sha256), { pass: false, reason: 'input-mismatch' });
  });
  test(`missing ${path} cannot satisfy the input snapshot`, (t) => {
    const { root, evidenceRoot } = workspace(t);
    const snapshot = captureInputSnapshot(root, evidenceRoot, 'inputs.json', selection);
    rmSync(join(root, path));
    assert.deepEqual(verifyInputSnapshot(root, evidenceRoot, 'inputs.json', snapshot.sha256), { pass: false, reason: 'missing-file' });
  });
}

test('input snapshots cannot be recaptured over their original expectations', (t) => {
  const { root, evidenceRoot } = workspace(t);
  captureInputSnapshot(root, evidenceRoot, 'inputs.json', selection);
  const original = readFileSync(join(evidenceRoot, 'inputs.json'));
  writeFileSync(join(root, 'src/lookup.js'), 'changed');
  assert.throws(() => captureInputSnapshot(root, evidenceRoot, 'inputs.json', selection), { code: 'EEXIST' });
  assert.deepEqual(readFileSync(join(evidenceRoot, 'inputs.json')), original);
});

test('selection order and checkout location do not change the canonical snapshot', (t) => {
  const first = workspace(t);
  const second = workspace(t);
  for (const { root } of [first, second]) writeFileSync(join(root, 'src/extra.js'), 'extra');
  const a = captureInputSnapshot(first.root, first.evidenceRoot, 'inputs.json', {
    sources: ['src/extra.js', 'src/lookup.js'], instructions: ['TASK.md'],
  });
  const b = captureInputSnapshot(second.root, second.evidenceRoot, 'inputs.json', {
    sources: ['src/lookup.js', 'src/extra.js'], instructions: ['TASK.md'],
  });
  assert.equal(a.sha256, b.sha256);
});

test('changing a file role changes snapshot identity even when bytes match', (t) => {
  const { root, evidenceRoot } = workspace(t);
  const a = captureInputSnapshot(root, evidenceRoot, 'a.json', selection);
  const b = captureInputSnapshot(root, evidenceRoot, 'b.json', { sources: ['TASK.md'], instructions: ['src/lookup.js'] });
  assert.notEqual(a.sha256, b.sha256);
});

test('both explicit input groups must be nonempty, dense, distinct, and bounded', (t) => {
  const { root, evidenceRoot } = workspace(t);
  for (const invalid of [undefined, null, {}, { sources: [], instructions: ['TASK.md'] },
    { sources: ['src/lookup.js'], instructions: [] }, { sources: 'src/lookup.js', instructions: ['TASK.md'] },
    { sources: Array(1), instructions: ['TASK.md'] }, { sources: ['TASK.md'], instructions: ['TASK.md'] },
    { sources: ['src/lookup.js', 'src/lookup.js'], instructions: ['TASK.md'] },
    { sources: Array.from({ length: 128 }, (_, i) => `file-${i}`), instructions: ['TASK.md'] }]) {
    assert.throws(() => captureInputSnapshot(root, evidenceRoot, 'inputs.json', invalid), /invalid-selection/);
    assert.equal(existsSync(join(evidenceRoot, 'inputs.json')), false);
  }
});

test('tampering with the snapshot file does not redefine expected input hashes', (t) => {
  const { root, evidenceRoot } = workspace(t);
  const snapshot = captureInputSnapshot(root, evidenceRoot, 'inputs.json', selection);
  const changed = JSON.parse(readFileSync(join(evidenceRoot, 'inputs.json'), 'utf8'));
  changed.files[0].sha256 = 'a'.repeat(64);
  writeFileSync(join(evidenceRoot, 'inputs.json'), JSON.stringify(changed));
  assert.deepEqual(verifyInputSnapshot(root, evidenceRoot, 'inputs.json', snapshot.sha256), { pass: false, reason: 'snapshot-mismatch' });
  assert.deepEqual(verifyInputSnapshot(root, evidenceRoot, 'inputs.json', undefined), { pass: false, reason: 'invalid-snapshot-hash' });
});

test('a hash-matching malformed or incomplete snapshot is rejected', (t) => {
  const { root, evidenceRoot } = workspace(t);
  const file = { kind: 'source', path: 'src/lookup.js', sha256: abcHash };
  for (const text of ['{', 'null', '{}', JSON.stringify({ version: 1, files: [] }),
    JSON.stringify({ version: 2, files: [file] }), JSON.stringify({ version: 1, files: [file] }),
    JSON.stringify({ version: 1, files: [file, { ...file, kind: 'instruction' }] })]) {
    writeFileSync(join(evidenceRoot, 'inputs.json'), text);
    const sha = createHash('sha256').update(text).digest('hex');
    assert.deepEqual(verifyInputSnapshot(root, evidenceRoot, 'inputs.json', sha), { pass: false, reason: 'invalid-snapshot' });
  }
});

test('source and instruction snapshots reject path escapes and symlinks', (t) => {
  const { root, evidenceRoot } = workspace(t);
  writeFileSync(join(evidenceRoot, 'outside.js'), 'abc');
  symlinkSync(join(evidenceRoot, 'outside.js'), join(root, 'linked.js'));
  for (const source of ['../outside.js', join(evidenceRoot, 'outside.js'), 'linked.js']) {
    assert.throws(() => captureInputSnapshot(root, evidenceRoot, 'inputs.json', {
      sources: [source], instructions: ['TASK.md'],
    }), /unsafe-path/);
  }
  const snapshot = captureInputSnapshot(root, evidenceRoot, 'inputs.json', selection);
  rmSync(join(root, 'TASK.md'));
  symlinkSync(join(evidenceRoot, 'outside.js'), join(root, 'TASK.md'));
  assert.deepEqual(verifyInputSnapshot(root, evidenceRoot, 'inputs.json', snapshot.sha256), { pass: false, reason: 'unsafe-path' });
});

test('input capture and verification enforce per-file and aggregate byte limits', (t) => {
  const { root, evidenceRoot } = workspace(t);
  const sources = [];
  for (let i = 0; i < 4; i++) {
    const path = `src/large-${i}.js`;
    sources.push(path);
    writeFileSync(join(root, path), Buffer.alloc(2 * 1024 * 1024));
  }
  writeFileSync(join(root, 'TASK.md'), '');
  const snapshot = captureInputSnapshot(root, evidenceRoot, 'inputs.json', { sources, instructions: ['TASK.md'] });
  assert.equal(verifyInputSnapshot(root, evidenceRoot, 'inputs.json', snapshot.sha256).pass, true);
  writeFileSync(join(root, 'TASK.md'), 'x');
  assert.throws(() => captureInputSnapshot(root, evidenceRoot, 'too-large.json', { sources, instructions: ['TASK.md'] }), /too-large/);
  assert.deepEqual(verifyInputSnapshot(root, evidenceRoot, 'inputs.json', snapshot.sha256), { pass: false, reason: 'too-large' });
  writeFileSync(join(root, 'src/lookup.js'), Buffer.alloc(2 * 1024 * 1024 + 1));
  assert.throws(() => captureInputSnapshot(root, evidenceRoot, 'oversized.json', selection), /too-large/);
});

for (const changedPath of ['src/lookup.js', 'TASK.md']) {
  test(`real passing verification is invalid after ${changedPath} changes`, (t) => {
    const { root, evidenceRoot } = workspace(t);
    writeFileSync(join(root, 'src/lookup.js'), 'process.stdout.write("verified");\n');
    writeFileSync(join(root, 'TASK.md'), 'Run node src/lookup.js and require success.\n');
    const snapshot = captureInputSnapshot(root, evidenceRoot, 'inputs.json', selection);
    const expectedIdentity = {
      snapshotSha256: snapshot.sha256, runId: randomUUID(), caseId: 'real-input-check',
      command: [process.execPath, 'src/lookup.js'],
    };
    const child = spawnSync(expectedIdentity.command[0], expectedIdentity.command.slice(1), {
      cwd: root, encoding: 'utf8', timeout: 10_000, maxBuffer: 128 * 1024,
    });
    assert.ifError(child.error);
    assert.equal(child.status, 0);
    assert.equal(child.stdout, 'verified');
    writeFileSync(join(evidenceRoot, 'result.json'), JSON.stringify({
      version: 2, ...expectedIdentity, exitCode: child.status, signal: child.signal,
      error: null, stdout: child.stdout, stderr: child.stderr, truncated: false,
    }));
    captureEvidence(evidenceRoot, 'result.json', 'record.json', expectedIdentity);
    const spec = { id: expectedIdentity.caseId, kind: 'implementation', expected: { commandsPass: true } };
    const execution = { response: { status: 'complete' }, exitCode: 0 };
    const source = { workspaceRoot: root, evidenceRoot, snapshotPath: 'inputs.json', recordPath: 'record.json', expectedIdentity, scopePass: true };
    assert.equal(scoreVerifiedCase(spec, execution, source).pass, true);
    writeFileSync(join(root, changedPath), changedPath.endsWith('.js')
      ? 'throw new Error("introduced after verification");\n' : 'Different acceptance instructions.\n');
    const score = scoreVerifiedCase(spec, execution, source);
    assert.equal(score.pass, false);
    assert.equal(score.checks.inputs, 0);
    assert.equal(score.inputReason, 'input-mismatch');
    if (changedPath.endsWith('.js')) {
      const rerun = spawnSync(expectedIdentity.command[0], expectedIdentity.command.slice(1), {
        cwd: root, encoding: 'utf8', timeout: 10_000, maxBuffer: 128 * 1024,
      });
      assert.ifError(rerun.error);
      assert.equal(rerun.status, 1);
      assert.match(rerun.stderr, /introduced after verification/);
    }
  });
}
