import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { captureEvidence, captureInputSnapshot, captureReviewWorkspace } from '../tools/lib/verification-evidence.mjs';

const fixtures = new URL('./fixtures/astra-native/', import.meta.url);
const cases = JSON.parse(readFileSync(new URL('cases.json', fixtures), 'utf8'));

const repairSpec = { id: 'repair-null', kind: 'implementation', expected: { commandsPass: true } };
const claimedSuccess = { response: { status: 'complete' }, exitCode: 0 };
const positiveObservation = { commands: [{ exitCode: 0 }], scopePass: true, evidencePass: true };

test('self-reported success cannot override failed verification', async () => {
  const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
  const observation = { commands: [{ exitCode: 0 }, { exitCode: 1 }], scopePass: true, evidencePass: true };
  assert.equal(scoreCase(repairSpec, claimedSuccess, observation).pass, false);
});

test('positive execution and observations pass only the implemented gates', async () => {
  const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
  assert.deepEqual(scoreCase(repairSpec, claimedSuccess, {
    commands: [{ exitCode: 0 }], scopePass: true, evidencePass: true,
  }), {
    pass: true,
    coverage: 'commands-scope-evidence-output-execution-only',
    checks: { commands: 1, scope: 1, evidence: 1, output: 1, execution: 1 },
  });
});

for (const [label, response] of [
  ['absent', undefined], ['null', null], ['empty object', {}],
  ['array', []], ['boolean', true], ['number', 1],
  ['malformed JSON text', '{'], ['unparsed JSON text', '{"status":"complete"}'],
  ['missing status', { message: 'done' }], ['incomplete', { status: 'incomplete' }],
  ['blocked', { status: 'blocked' }], ['unknown status', { status: 'success' }],
  ['non-string status', { status: true }],
]) {
  test(`${label} worker response cannot pass output validation`, async () => {
    const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
    const result = scoreCase(repairSpec, { response, exitCode: 0 }, positiveObservation);
    assert.equal(result.pass, false);
    assert.equal(result.checks.output, 0);
    assert.equal(result.checks.execution, 1);
  });
}

for (const [label, execution] of [
  ['absent execution', undefined], ['null execution', null],
  ['missing exit', { response: { status: 'complete' } }],
  ['null exit', { ...claimedSuccess, exitCode: null }],
  ['failed exit', { ...claimedSuccess, exitCode: 7 }],
  ['string exit', { ...claimedSuccess, exitCode: '0' }],
  ['signal termination', { ...claimedSuccess, signal: 'SIGTERM' }],
  ['process error', { ...claimedSuccess, error: { code: 'ENOENT' } }],
]) {
  test(`${label} cannot pass execution validation`, async () => {
    const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
    const result = scoreCase(repairSpec, execution, positiveObservation);
    assert.equal(result.pass, false);
    assert.equal(result.checks.execution, 0);
  });
}

test('score exposes every observed failure without stopping at the first gate', async () => {
  const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
  assert.deepEqual(scoreCase(repairSpec, undefined, undefined), {
    pass: false,
    coverage: 'commands-scope-evidence-output-execution-only',
    checks: { commands: 0, scope: 0, evidence: 0, output: 0, execution: 0 },
  });
});

for (const { label, stdout, exitCode, outputPass, pass } of [
  { label: 'complete output and successful exit', stdout: '{"status":"complete"}', exitCode: 0, outputPass: 1, pass: true },
  { label: 'complete output followed by failed exit', stdout: '{"status":"complete"}', exitCode: 7, outputPass: 1, pass: false },
  { label: 'successful exit without output', stdout: '', exitCode: 0, outputPass: 0, pass: false },
  { label: 'successful exit with malformed output', stdout: '{', exitCode: 0, outputPass: 0, pass: false },
]) {
  test(`real worker process: ${label}`, async () => {
    const child = spawnSync(process.execPath, ['-e',
      'process.stdout.write(process.argv[1]); process.exit(Number(process.argv[2]));', stdout, String(exitCode),
    ], { encoding: 'utf8', timeout: 10_000, maxBuffer: 128 * 1024 });
    assert.ifError(child.error);
    assert.equal(child.signal, null);
    assert.equal(child.status, exitCode);
    assert.equal(child.stdout, stdout);
    let response;
    if (outputPass) response = JSON.parse(child.stdout);
    else assert.throws(() => JSON.parse(child.stdout), SyntaxError);
    const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
    const result = scoreCase(repairSpec, {
      response, exitCode: child.status, signal: child.signal, error: child.error,
    }, positiveObservation);
    assert.equal(result.pass, pass);
    assert.equal(result.checks.output, outputPass);
    assert.equal(result.checks.execution, exitCode === 0 ? 1 : 0);
  });
}

test('real process signal termination rejects a previously complete response', async () => {
  const child = spawnSync(process.execPath, ['-e', 'process.kill(process.pid, "SIGTERM");'], {
    encoding: 'utf8', timeout: 10_000, maxBuffer: 128 * 1024,
  });
  assert.ifError(child.error);
  assert.equal(child.status, null);
  assert.equal(child.signal, 'SIGTERM');
  const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
  const result = scoreCase(repairSpec, {
    response: { status: 'complete' }, exitCode: child.status, signal: child.signal,
  }, positiveObservation);
  assert.equal(result.pass, false);
  assert.equal(result.checks.output, 1);
  assert.equal(result.checks.execution, 0);
});

test('real spawn failure cannot pass using a previously complete response', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'astra-missing-worker-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const child = spawnSync(join(root, 'missing-executable'), [], {
    encoding: 'utf8', timeout: 10_000, maxBuffer: 128 * 1024,
  });
  assert.equal(child.error?.code, 'ENOENT');
  assert.equal(child.status, null);
  const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
  const result = scoreCase(repairSpec, {
    response: { status: 'complete' }, exitCode: child.status, signal: child.signal, error: child.error,
  }, positiveObservation);
  assert.equal(result.pass, false);
  assert.equal(result.checks.execution, 0);
});

for (const field of ['scopePass', 'evidencePass']) {
  for (const value of [false, undefined]) {
    test(`${field} ${value === undefined ? 'absent' : 'false'} rejects claimed success`, async () => {
      const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
      const observation = { commands: [{ exitCode: 0 }], scopePass: true, evidencePass: true };
      if (value === undefined) delete observation[field];
      else observation[field] = value;
      const execution = { response: { status: 'complete', scopePass: true, evidencePass: true }, exitCode: 0 };
      assert.equal(scoreCase(repairSpec, execution, observation).pass, false);
    });
  }
}

test('scope and evidence require boolean true rather than truthy observations', async () => {
  const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
  for (const field of ['scopePass', 'evidencePass']) {
    for (const value of [null, 'true', 1, {}]) {
      const observation = { commands: [{ exitCode: 0 }], scopePass: true, evidencePass: true, [field]: value };
      assert.equal(scoreCase(repairSpec, claimedSuccess, observation).pass, false);
    }
  }
});

test('absent or incomplete command evidence cannot pass verification', async () => {
  const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
  for (const commands of [undefined, [], [{}], [{ exitCode: null }], [{ exitCode: '0' }]]) {
    assert.equal(scoreCase(repairSpec, claimedSuccess, {
      commands, scopePass: true, evidencePass: true,
    }).pass, false);
  }
});

test('the partial scorer does not grade review cases as implementation', async () => {
  const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
  assert.throws(() => scoreCase(cases[0], claimedSuccess, { commands: [{ exitCode: 0 }] }), /unsupported case/);
});

// Real child exits also exercise the partial scorer; no model runs are involved.
for (const fixture of cases.filter((item) => item.kind === 'review')) {
  test(`lookup fixture: ${fixture.id}`, async (t) => {
    const root = mkdtempSync(join(tmpdir(), 'astra-lookup-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    for (const file of fixture.files) {
      const destination = join(root, file.path);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, file.content);
    }
    mkdirSync(join(root, 'test'));
    copyFileSync(new URL('lookup.test.js', fixtures), join(root, 'test/lookup.test.js'));
    writeFileSync(join(root, 'TASK.md'), fixture.packet.task);
    const evidenceRoot = mkdtempSync(join(tmpdir(), 'astra-lookup-evidence-'));
    t.after(() => rmSync(evidenceRoot, { recursive: true, force: true }));
    const snapshot = captureInputSnapshot(root, evidenceRoot, 'inputs.json', {
      sources: ['package.json', 'src/lookup.js', 'test/lookup.test.js'], instructions: ['TASK.md'],
    });

    // The worker root contains package.json, lookup source, the public regression
    // test, and TASK.md instructions. Case metadata and golden expectations stay
    // in this parent process; the input manifest stays in the collector directory.
    const { NODE_TEST_CONTEXT, ...env } = process.env;
    const expectedIdentity = {
      snapshotSha256: snapshot.sha256,
      runId: randomUUID(),
      caseId: fixture.id,
      command: [process.execPath, '--test', '--test-reporter=tap', 'test/lookup.test.js'],
    };
    const reviewBefore = captureReviewWorkspace(root, evidenceRoot, 'review.before.json', expectedIdentity);
    const result = spawnSync(expectedIdentity.command[0], expectedIdentity.command.slice(1), {
      cwd: root, env, encoding: 'utf8', timeout: 10_000, maxBuffer: 128 * 1024,
    });
    const output = result.stdout + result.stderr;
    assert.ifError(result.error);
    assert.equal(result.signal, null, output);
    assert.equal(result.status, fixture.deterministicChecks.exitCode, output);
    assert.match(output, new RegExp(`^# pass ${fixture.deterministicChecks.passed}$`, 'm'));
    assert.match(output, new RegExp(`^# fail ${fixture.deterministicChecks.failed}$`, 'm'));
    if (fixture.deterministicChecks.exitCode === 1) {
      assert.match(output, /not ok 1 - missing row returns null/);
      assert.match(output, /name: 'TypeError'/);
      assert.match(output, /src\/lookup\.js:1:\d+/);
    }
    const { scoreVerifiedCase } = await import('../tools/lib/behavioral-eval.mjs');
    // Collector-owned evidence stays outside the worker tree. Scoring loads the
    // captured exit code; neither this caller nor worker claims replace it.
    writeFileSync(join(evidenceRoot, 'verification.json'), JSON.stringify({
      version: 2, ...expectedIdentity, exitCode: result.status,
      signal: result.signal, error: null, truncated: false,
      stdout: result.stdout, stderr: result.stderr,
    }));
    captureEvidence(evidenceRoot, 'verification.json', 'record.json', expectedIdentity);
    const scored = scoreVerifiedCase({ ...repairSpec, id: fixture.id }, claimedSuccess, {
      workspaceRoot: root, snapshotPath: 'inputs.json',
      evidenceRoot, recordPath: 'record.json', expectedIdentity, scopePass: true,
    });
    assert.equal(scored.evidenceReason, null);
    assert.equal(scored.checks.evidence, 1);
    assert.equal(scored.checks.inputs, 1);
    assert.equal(scored.pass, fixture.id === 'clean');
    // Synthetic normalized review output, scored against the real fixture process.
    const { scoreVerifiedReviewCase } = await import('../tools/lib/review-eval.mjs');
    const reviewed = scoreVerifiedReviewCase(fixture, {
      exitCode: 0,
      response: {
        status: 'complete', edits: [], commands: [{ command: expectedIdentity.command, exitCode: result.status }],
        findings: fixture.id === 'clean' ? [] : [{ path: 'src/lookup.js', line: 1, issue: 'null-dereference',
          trigger: 'lookup(null)', reason: 'Null reaches row.id without a guard.' }],
      },
    }, {
      workspaceRoot: root, snapshotPath: 'inputs.json', evidenceRoot, recordPath: 'record.json', expectedIdentity,
      reviewSnapshotPath: 'review.before.json', reviewSnapshotSha256: reviewBefore.sha256, scopePass: true,
    });
    assert.equal(reviewed.pass, true, JSON.stringify(reviewed));
    assert.equal(reviewed.checks.readOnly, 1);
    t.diagnostic(`${fixture.id}: child exit ${result.status}; ${fixture.deterministicChecks.passed} passed, ${fixture.deterministicChecks.failed} failed`);
  });
}
