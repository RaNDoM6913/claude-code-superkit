import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs, { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureEvidence, captureInputSnapshot, captureReviewWorkspace } from '../tools/lib/verification-evidence.mjs';
import { scoreModelVerifiedReviewCase, scoreVerifiedReviewCase } from '../tools/lib/review-eval.mjs';

const clean = JSON.parse(readFileSync(new URL('./fixtures/astra-native/cases.json', import.meta.url), 'utf8')).find((item) => item.id === 'clean');

function setup(t) {
  const evidenceRoot = mkdtempSync(join(tmpdir(), 'astra-review-score-'));
  t.after(() => rmSync(evidenceRoot, { recursive: true, force: true }));
  const workspaceRoot = join(evidenceRoot, 'workspace');
  mkdirSync(workspaceRoot);
  writeFileSync(join(workspaceRoot, 'source.js'), 'source');
  writeFileSync(join(workspaceRoot, 'TASK.md'), 'review without edits');
  const inputs = captureInputSnapshot(workspaceRoot, evidenceRoot, 'inputs.json', { sources: ['source.js'], instructions: ['TASK.md'] });
  const expectedIdentity = { snapshotSha256: inputs.sha256, runId: 'review-attempt', caseId: clean.id, command: ['node', '--test'] };
  const before = captureReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', expectedIdentity);
  writeFileSync(join(evidenceRoot, 'verification.json'), JSON.stringify({
    version: 2, ...expectedIdentity, exitCode: 0, signal: null, error: null, truncated: false,
    stdout: 'ok 1 - missing row returns null\n# pass 2\n# fail 0\n', stderr: '',
  }));
  captureEvidence(evidenceRoot, 'verification.json', 'record.json', expectedIdentity);
  return { workspaceRoot, evidenceRoot, expectedIdentity, snapshotPath: 'inputs.json', recordPath: 'record.json',
    reviewSnapshotPath: 'before.json', reviewSnapshotSha256: before.sha256, scopePass: true };
}

const response = (source) => ({ exitCode: 0, response: {
  status: 'complete', findings: [], edits: [], commands: [{ command: source.expectedIdentity.command, exitCode: 0 }],
} });

test('unselected file creation fails independent read-only audit despite empty edit claims', (t) => {
  const source = setup(t);
  assert.equal(scoreVerifiedReviewCase(clean, response(source), source).pass, true);
  writeFileSync(join(source.workspaceRoot, 'unrelated-note.txt'), 'written by reviewer');
  const score = scoreVerifiedReviewCase(clean, response(source), { ...source, edits: [], readOnlyPass: true });
  assert.equal(score.pass, false);
  assert.equal(score.checks.inputs, 1);
  assert.equal(score.checks.evidence, 1);
  assert.equal(score.checks.readOnly, 0);
  assert.equal(score.auditReason, 'workspace-changed');
});

test('missing review baseline cannot be replaced with a no-edits claim', (t) => {
  const source = setup(t);
  const score = scoreVerifiedReviewCase(clean, response(source), { ...source, reviewSnapshotPath: undefined, edits: [] });
  assert.equal(score.pass, false);
  assert.equal(score.checks.readOnly, 0);
});

test('review model entry point requires independent runtime identity', (t) => {
  const source = setup(t);
  const target = { model: 'fixture-model-a', effort: 'high' };
  const modelSource = { ...source, expectedRuntime: target, runtimeRecordPath: 'runtime.record.json' };
  assert.equal(scoreModelVerifiedReviewCase(clean, response(source), modelSource).pass, false);
  // Synthetic internal collector trace, not an actual model invocation.
  writeFileSync(join(source.evidenceRoot, 'runtime.json'), JSON.stringify({
    version: 1, kind: 'runtime-identity', ...source.expectedIdentity, truncated: false,
    events: [{ type: 'runtime.identity', source: 'runtime', runId: source.expectedIdentity.runId, observed: target }],
  }));
  captureEvidence(source.evidenceRoot, 'runtime.json', 'runtime.record.json', source.expectedIdentity);
  assert.equal(scoreModelVerifiedReviewCase(clean, response(source), modelSource).pass, true);
  assert.equal(scoreModelVerifiedReviewCase(clean, response(source), { ...modelSource, expectedRuntime: { ...target, effort: 'low' } }).pass, false);
});

test('review evidence cannot be reused for a different case', (t) => {
  const source = setup(t);
  const score = scoreVerifiedReviewCase({ ...clean, id: 'other-case' }, response(source), source);
  assert.equal(score.pass, false);
  assert.equal(score.evidenceReason, 'case-mismatch');
});

for (const model of ['fixture-model-a', 'fixture-model-b']) {
  test(`read-only audit runs after runtime evidence even for ${model}`, (t) => {
    const source = setup(t);
    const expectedRuntime = { model: 'fixture-model-a', effort: 'high' };
    writeFileSync(join(source.evidenceRoot, 'runtime.json'), JSON.stringify({
      version: 1, kind: 'runtime-identity', ...source.expectedIdentity, truncated: false,
      events: [{ type: 'runtime.identity', source: 'runtime', runId: source.expectedIdentity.runId, observed: { model, effort: 'high' } }],
    }));
    captureEvidence(source.evidenceRoot, 'runtime.json', 'runtime.record.json', source.expectedIdentity);
    const artifactStat = statSync(join(source.evidenceRoot, 'runtime.json'));
    const realRead = fs.readSync;
    let changed = false;
    fs.readSync = (fd, ...args) => {
      const count = realRead(fd, ...args);
      const current = fs.fstatSync(fd);
      if (!changed && count === 0 && current.dev === artifactStat.dev && current.ino === artifactStat.ino) {
        changed = true;
        writeFileSync(join(source.workspaceRoot, 'late-note.txt'), 'unselected write');
      }
      return count;
    };
    syncBuiltinESMExports();
    try {
      const score = scoreModelVerifiedReviewCase(clean, response(source), { ...source, expectedRuntime, runtimeRecordPath: 'runtime.record.json' });
      assert.equal(changed, true);
      assert.equal(score.pass, false);
      assert.equal(score.checks.inputs, 1);
      assert.equal(score.checks.readOnly, 0);
      assert.equal(score.checks.runtime, model === 'fixture-model-a' ? 1 : 0);
      assert.equal(score.auditReason, 'workspace-changed');
    } finally {
      fs.readSync = realRead;
      syncBuiltinESMExports();
    }
  });
}
