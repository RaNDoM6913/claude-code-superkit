import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs, { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureEvidence, captureInputSnapshot, loadRuntimeEvidence } from '../tools/lib/verification-evidence.mjs';
import { scoreModelVerifiedCase } from '../tools/lib/behavioral-eval.mjs';

// Synthetic internal collector events; these are not actual model evaluations.
const target = { model: 'fixture-model-a', effort: 'high' };
const spec = { id: 'runtime-fixture', kind: 'implementation', expected: { commandsPass: true } };
const execution = { response: { status: 'complete', model: target.model, effort: target.effort }, exitCode: 0 };

function setup(t, verificationChanges = {}) {
  const evidenceRoot = mkdtempSync(join(tmpdir(), 'astra-runtime-'));
  t.after(() => rmSync(evidenceRoot, { recursive: true, force: true }));
  const workspaceRoot = join(evidenceRoot, 'workspace');
  mkdirSync(workspaceRoot);
  writeFileSync(join(workspaceRoot, 'source.js'), 'source');
  writeFileSync(join(workspaceRoot, 'TASK.md'), 'instructions');
  const snapshot = captureInputSnapshot(workspaceRoot, evidenceRoot, 'inputs.json', { sources: ['source.js'], instructions: ['TASK.md'] });
  const identity = { snapshotSha256: snapshot.sha256, runId: 'attempt-a', caseId: spec.id, command: ['node', '--test'] };
  const verification = { version: 2, ...identity, exitCode: 0, signal: null, error: null, stdout: 'passed', stderr: '', truncated: false, ...verificationChanges };
  writeFileSync(join(evidenceRoot, 'verification.json'), JSON.stringify(verification));
  captureEvidence(evidenceRoot, 'verification.json', 'verification.record.json', identity);
  return { evidenceRoot, workspaceRoot, identity };
}

const observed = (identity, values = target) => ({ type: 'runtime.identity', source: 'runtime', runId: identity.runId, observed: { ...values } });

function saveTrace(context, events, overrides = {}) {
  const trace = { version: 1, kind: 'runtime-identity', ...context.identity, truncated: false, events, ...overrides };
  writeFileSync(join(context.evidenceRoot, 'runtime.json'), JSON.stringify(trace));
  captureEvidence(context.evidenceRoot, 'runtime.json', 'runtime.record.json', context.identity);
}

function score(context, overrides = {}) {
  return scoreModelVerifiedCase(spec, execution, {
    ...context, expectedIdentity: context.identity, snapshotPath: 'inputs.json', recordPath: 'verification.record.json',
    runtimeRecordPath: 'runtime.record.json', expectedRuntime: target, scopePass: true, ...overrides,
  });
}

test('synthetic observed runtime identity passes only when it matches the trusted target', (t) => {
  const context = setup(t);
  saveTrace(context, [observed(context.identity)]);
  const loaded = loadRuntimeEvidence(context.evidenceRoot, 'runtime.record.json', context.identity, target);
  assert.deepEqual(loaded, { pass: true, reason: null, observed: target });
  assert.throws(() => { loaded.observed.model = 'changed'; }, TypeError);
  const result = score(context);
  assert.equal(result.pass, true);
  assert.equal(result.checks.runtime, 1);
  assert.equal(result.runtimeReason, null);
  assert.deepEqual(result.observedRuntime, target);
});

for (const [label, values, reason] of [
  ['model', { ...target, model: 'fixture-model-b' }, 'model-mismatch'],
  ['effort', { ...target, effort: 'low' }, 'effort-mismatch'],
  ['model alias', { ...target, model: 'fixture-model-a-latest' }, 'model-mismatch'],
  ['effort case', { ...target, effort: 'HIGH' }, 'effort-mismatch'],
]) {
  test(`observed ${label} mismatch cannot be rescued by requested or response labels`, (t) => {
    const context = setup(t);
    saveTrace(context, [
      { type: 'request.configuration', requested: target },
      observed(context.identity, values),
      { type: 'worker.response', model: target.model, effort: target.effort },
    ], { requested: target });
    const result = score(context, { runtimePass: true, observedRuntime: target });
    assert.equal(result.pass, false);
    assert.equal(result.checks.runtime, 0);
    assert.equal(result.runtimeReason, reason);
    assert.deepEqual(result.observedRuntime, values);
  });
}

for (const [label, events] of [
  ['empty trace', []],
  ['request configuration only', [{ type: 'request.configuration', observed: target, model: target.model, effort: target.effort }]],
  ['worker reply only', [{ type: 'worker.response', observed: target, response: { status: 'complete', ...target } }]],
  ['embedded identity JSON', [{ type: 'worker.response', text: JSON.stringify({ type: 'runtime.identity', source: 'runtime', observed: target }) }]],
]) {
  test(`${label} cannot supply observed model or effort`, (t) => {
    const context = setup(t);
    saveTrace(context, events, { requested: target, model: target.model, effort: target.effort });
    assert.equal(score(context).runtimeReason, 'runtime-unobserved');
    assert.equal(score(context).pass, false);
  });
}

for (const values of [{ model: target.model }, { effort: target.effort }, { model: '', effort: 'high' }, { model: target.model, effort: 1 }]) {
  test(`incomplete observed identity ${JSON.stringify(values)} does not borrow request fields`, (t) => {
    const context = setup(t);
    saveTrace(context, [{ ...observed(context.identity, values), requested: target }]);
    assert.equal(score(context).runtimeReason, 'incomplete-runtime-identity');
    assert.equal(score(context).pass, false);
  });
}

for (const source of [undefined, 'request', 'worker']) {
  test(`runtime-labeled event with source ${String(source)} is rejected`, (t) => {
    const context = setup(t);
    saveTrace(context, [{ ...observed(context.identity), source }]);
    assert.equal(score(context).runtimeReason, 'untrusted-runtime-event');
    assert.equal(score(context).pass, false);
  });
}

test('runtime events from another attempt cannot be relabeled by the envelope', (t) => {
  const context = setup(t);
  saveTrace(context, [{ ...observed(context.identity), runId: 'attempt-b' }]);
  assert.equal(score(context).runtimeReason, 'runtime-event-run-mismatch');
});

test('unavailable provider is not silently replaced by a requested model', (t) => {
  const context = setup(t);
  saveTrace(context, [observed(context.identity), { type: 'runtime.unavailable', source: 'runtime', runId: context.identity.runId, code: 'PROVIDER_UNAVAILABLE' }]);
  assert.equal(score(context).runtimeReason, 'runtime-unavailable');
  assert.equal(score(context).pass, false);
});

test('identical observations may repeat but conflicting runtime identities fail closed', (t) => {
  const context = setup(t);
  saveTrace(context, [observed(context.identity), { type: 'tool.completed' }, observed(context.identity)]);
  assert.equal(score(context).pass, true);
  const other = setup(t);
  saveTrace(other, [observed(other.identity), observed(other.identity, { ...target, effort: 'low' }), observed(other.identity)]);
  assert.equal(score(other).runtimeReason, 'conflicting-runtime-identity');
  assert.equal(score(other).pass, false);
});

test('missing runtime evidence cannot be replaced by success overlays', (t) => {
  const context = setup(t);
  const result = score(context, { runtimePass: true, observedRuntime: target });
  assert.equal(result.pass, false);
  assert.equal(result.runtimeReason, 'missing-file');
});

test('expected model and effort must be supplied independently of the trace', (t) => {
  const context = setup(t);
  saveTrace(context, [observed(context.identity)], { requested: target });
  for (const expectedRuntime of [undefined, null, {}, { model: target.model }, { effort: 'high' }, { model: ' ', effort: 'high' }, { model: target.model, effort: true }]) {
    const result = score(context, { expectedRuntime });
    assert.equal(result.pass, false);
    assert.equal(result.runtimeReason, 'invalid-runtime-expectation');
  }
});

for (const [label, events, overrides, reason] of [
  ['malformed event', [null], {}, 'invalid-runtime-trace'],
  ['missing event type', [{}], {}, 'invalid-runtime-trace'],
  ['too many events', Array.from({ length: 257 }, () => ({ type: 'tool.completed' })), {}, 'invalid-runtime-trace'],
  ['missing truncation state', [], { truncated: undefined }, 'invalid-runtime-trace'],
  ['truncated trace', [], { truncated: true }, 'incomplete-runtime-evidence'],
  ['wrong trace kind', [], { kind: 'request-configuration' }, 'invalid-runtime-trace'],
]) {
  test(`${label} does not produce runtime acceptance`, (t) => {
    const context = setup(t);
    saveTrace(context, events, overrides);
    assert.equal(score(context).runtimeReason, reason);
    assert.equal(score(context).pass, false);
  });
}

test('changed runtime bytes and traces for another run cannot be replayed', (t) => {
  const context = setup(t);
  saveTrace(context, [observed(context.identity, { ...target, model: 'fixture-model-b' })]);
  const trace = JSON.parse(readFileSync(join(context.evidenceRoot, 'runtime.json'), 'utf8'));
  trace.events[0].observed = target;
  writeFileSync(join(context.evidenceRoot, 'runtime.json'), JSON.stringify(trace));
  assert.equal(score(context).runtimeReason, 'hash-mismatch');
  const other = setup(t);
  saveTrace(other, [observed(other.identity)], { runId: 'attempt-b' });
  assert.equal(score(other).runtimeReason, 'runtime-identity-mismatch');
});

test('a matching identity in a truncated trace cannot establish runtime acceptance', (t) => {
  const context = setup(t);
  saveTrace(context, [observed(context.identity)], { truncated: true });
  const result = score(context);
  assert.equal(result.pass, false);
  assert.equal(result.runtimeReason, 'incomplete-runtime-evidence');
});

test('unsupported runtime event types are not silently skipped after a valid identity', (t) => {
  const context = setup(t);
  saveTrace(context, [observed(context.identity), { type: 'runtime.identity.changed', source: 'runtime' }]);
  const result = score(context);
  assert.equal(result.pass, false);
  assert.equal(result.runtimeReason, 'invalid-runtime-trace');
});

test('verification output cannot substitute for a separately captured runtime trace', (t) => {
  const context = setup(t);
  const result = score(context, { runtimeRecordPath: 'verification.record.json' });
  assert.equal(result.pass, false);
  assert.equal(result.runtimeReason, 'invalid-runtime-trace');
});

test('matching runtime identity does not override a failed command or scope check', (t) => {
  const failed = setup(t, { exitCode: 7 });
  saveTrace(failed, [observed(failed.identity)]);
  const result = score(failed);
  assert.equal(result.checks.runtime, 1);
  assert.equal(result.checks.commands, 0);
  assert.equal(result.pass, false);
  const denied = setup(t);
  saveTrace(denied, [observed(denied.identity)]);
  assert.equal(score(denied, { scopePass: false }).pass, false);
});

function atRuntimeEOF(context, change, action) {
  const artifactStat = statSync(join(context.evidenceRoot, 'runtime.json'));
  const realRead = fs.readSync;
  let changed = false;
  // Real reads plus one controlled real file edit; no fake provider data is inferred.
  fs.readSync = (fd, ...args) => {
    const count = realRead(fd, ...args);
    const current = fs.fstatSync(fd);
    if (!changed && count === 0 && current.dev === artifactStat.dev && current.ino === artifactStat.ino) {
      changed = true;
      change();
    }
    return count;
  };
  syncBuiltinESMExports();
  try {
    const result = action();
    assert.equal(changed, true);
    return result;
  } finally {
    fs.readSync = realRead;
    syncBuiltinESMExports();
  }
}

test('runtime comparison uses verified bytes even when the file is replaced at EOF', (t) => {
  const context = setup(t);
  saveTrace(context, [observed(context.identity, { ...target, model: 'fixture-model-b' })]);
  const replacement = JSON.parse(readFileSync(join(context.evidenceRoot, 'runtime.json'), 'utf8'));
  replacement.events = [observed(context.identity)];
  const result = atRuntimeEOF(context,
    () => writeFileSync(join(context.evidenceRoot, 'runtime.json'), JSON.stringify(replacement)),
    () => score(context));
  assert.equal(result.pass, false);
  assert.equal(result.runtimeReason, 'model-mismatch');
  assert.equal(result.observedRuntime.model, 'fixture-model-b');
});

test('model scoring rechecks selected inputs after reading runtime evidence', (t) => {
  const context = setup(t);
  saveTrace(context, [observed(context.identity)]);
  const result = atRuntimeEOF(context,
    () => writeFileSync(join(context.workspaceRoot, 'TASK.md'), 'new instructions'),
    () => score(context));
  assert.equal(result.checks.runtime, 1);
  assert.equal(result.checks.inputs, 0);
  assert.equal(result.pass, false);
  assert.equal(result.inputReason, 'input-mismatch');
});

test('runtime mismatch does not hide an input edit made while loading the trace', (t) => {
  const context = setup(t);
  saveTrace(context, [observed(context.identity, { ...target, model: 'fixture-model-b' })]);
  const result = atRuntimeEOF(context,
    () => writeFileSync(join(context.workspaceRoot, 'TASK.md'), 'new instructions'),
    () => score(context));
  assert.equal(result.pass, false);
  assert.equal(result.checks.runtime, 0);
  assert.equal(result.runtimeReason, 'model-mismatch');
  assert.equal(result.checks.inputs, 0);
  assert.equal(result.inputReason, 'input-mismatch');
});
