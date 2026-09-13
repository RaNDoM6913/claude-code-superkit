import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureReviewWorkspace, verifyReviewWorkspace } from '../tools/lib/verification-evidence.mjs';

const identity = { snapshotSha256: 'a'.repeat(64), runId: 'review-a', caseId: 'clean', command: ['node', '--test'] };

function setup(t) {
  const evidenceRoot = mkdtempSync(join(tmpdir(), 'astra-review-tree-'));
  t.after(() => rmSync(evidenceRoot, { recursive: true, force: true }));
  const workspaceRoot = join(evidenceRoot, 'workspace');
  mkdirSync(workspaceRoot);
  writeFileSync(join(workspaceRoot, 'source.js'), 'original');
  return { workspaceRoot, evidenceRoot };
}

test('unchanged review workspace passes independent read-only verification', (t) => {
  const { workspaceRoot, evidenceRoot } = setup(t);
  const snapshot = captureReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', identity);
  assert.deepEqual(verifyReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', snapshot.sha256, identity), {
    pass: true, reason: null, edits: [],
  });
});

for (const [name, mutate, path, change] of [
  ['new unselected file', (root) => writeFileSync(join(root, 'notes.txt'), 'new'), 'notes.txt', 'added'],
  ['removed file', (root) => rmSync(join(root, 'source.js')), 'source.js', 'removed'],
  ['changed file', (root) => writeFileSync(join(root, 'source.js'), 'changed'), 'source.js', 'modified'],
  ['empty directory', (root) => mkdirSync(join(root, 'new-dir')), 'new-dir', 'added'],
  ['changed mode', (root) => chmodSync(join(root, 'source.js'), 0o755), 'source.js', 'modified'],
]) {
  test(`${name} violates read-only even outside selected input paths`, (t) => {
    const { workspaceRoot, evidenceRoot } = setup(t);
    chmodSync(join(workspaceRoot, 'source.js'), 0o644);
    const snapshot = captureReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', identity);
    mutate(workspaceRoot);
    assert.deepEqual(verifyReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', snapshot.sha256, identity), {
      pass: false, reason: 'workspace-changed', edits: [{ path, change }],
    });
  });
}

test('review baseline cannot be overwritten or replayed for another run', (t) => {
  const { workspaceRoot, evidenceRoot } = setup(t);
  const snapshot = captureReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', identity);
  const original = readFileSync(join(evidenceRoot, 'before.json'));
  assert.equal(verifyReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', snapshot.sha256, { ...identity, runId: 'review-b' }).reason, 'identity-mismatch');
  writeFileSync(join(workspaceRoot, 'source.js'), 'changed');
  assert.throws(() => captureReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', identity), { code: 'EEXIST' });
  assert.deepEqual(readFileSync(join(evidenceRoot, 'before.json')), original);
  assert.equal(verifyReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', snapshot.sha256, { ...identity, runId: 'review-b' }).reason, 'identity-mismatch');
});

test('missing or tampered baseline does not imply no edits', (t) => {
  const { workspaceRoot, evidenceRoot } = setup(t);
  const snapshot = captureReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', identity);
  writeFileSync(join(evidenceRoot, 'before.json'), '{}');
  assert.deepEqual(verifyReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', snapshot.sha256, identity), {
    pass: false, reason: 'review-snapshot-mismatch', edits: null,
  });
  assert.equal(verifyReviewWorkspace(workspaceRoot, evidenceRoot, 'missing.json', snapshot.sha256, identity).edits, null);
});

test('review workspace scanning does not follow symlinks', (t) => {
  const { workspaceRoot, evidenceRoot } = setup(t);
  const snapshot = captureReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', identity);
  symlinkSync(evidenceRoot, join(workspaceRoot, 'escape'));
  assert.deepEqual(verifyReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', snapshot.sha256, identity), {
    pass: false, reason: 'unsafe-path', edits: null,
  });
  assert.throws(() => captureReviewWorkspace(workspaceRoot, evidenceRoot, 'unsafe.json', identity), /unsafe-path/);
});

test('review workspace enumeration is bounded', (t) => {
  const { workspaceRoot, evidenceRoot } = setup(t);
  for (let i = 0; i < 256; i++) writeFileSync(join(workspaceRoot, `extra-${i}`), '');
  assert.throws(() => captureReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', identity), /too-large/);
});

for (const [name, path, mode] of [['file sticky', 'source.js', 0o1644], ['directory sticky', 'nested', 0o1755], ['root sticky', '.', 0o1700]]) {
  test(`${name} changes cannot be hidden from read-only verification`, (t) => {
    const { workspaceRoot, evidenceRoot } = setup(t);
    mkdirSync(join(workspaceRoot, 'nested'));
    chmodSync(workspaceRoot, 0o700);
    chmodSync(join(workspaceRoot, 'source.js'), 0o644);
    chmodSync(join(workspaceRoot, 'nested'), 0o755);
    const snapshot = captureReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', identity);
    chmodSync(join(workspaceRoot, path), mode);
    assert.equal(statSync(join(workspaceRoot, path)).mode & 0o7777, mode);
    const checked = verifyReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', snapshot.sha256, identity);
    assert.equal(checked.pass, false);
    assert.deepEqual(checked.edits, [{ path, change: 'modified' }]);
  });
}

test('saved setuid and setgid bits remain valid audit metadata and detect removal', (t) => {
  const { workspaceRoot, evidenceRoot } = setup(t);
  mkdirSync(join(workspaceRoot, 'nested'));
  chmodSync(join(workspaceRoot, 'source.js'), 0o644);
  chmodSync(join(workspaceRoot, 'nested'), 0o755);
  captureReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', identity);
  const original = JSON.parse(readFileSync(join(evidenceRoot, 'before.json'), 'utf8'));
  // Synthetic prior modes: this host clears setuid/setgid on chmod. Actual sticky
  // bit tests above exercise capture; these fixtures exercise all saved mode bits.
  for (const [path, mode] of [['source.js', 0o4644], ['nested', 0o2755]]) {
    const before = { ...original, entries: original.entries.map((entry) => entry.path === path ? { ...entry, mode } : entry) };
    const bytes = JSON.stringify(before);
    writeFileSync(join(evidenceRoot, 'synthetic-before.json'), bytes);
    const sha = createHash('sha256').update(bytes).digest('hex');
    assert.deepEqual(verifyReviewWorkspace(workspaceRoot, evidenceRoot, 'synthetic-before.json', sha, identity), {
      pass: false, reason: 'workspace-changed', edits: [{ path, change: 'modified' }],
    });
  }
});
