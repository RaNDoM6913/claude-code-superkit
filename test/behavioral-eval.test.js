import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const fixtures = new URL('./fixtures/astra-native/', import.meta.url);
const cases = JSON.parse(readFileSync(new URL('cases.json', fixtures), 'utf8'));

const repairSpec = { id: 'repair-null', kind: 'implementation', expected: { commandsPass: true } };
const claimedSuccess = { response: { status: 'complete' }, exitCode: 0 };

test('self-reported success cannot override failed verification', async () => {
  const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
  const observation = { commands: [{ exitCode: 0 }, { exitCode: 1 }], scopePass: true, evidencePass: true };
  assert.equal(scoreCase(repairSpec, claimedSuccess, observation).pass, false);
});

test('positive observations pass only the commands, scope, and evidence gates', async () => {
  const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
  assert.deepEqual(scoreCase(repairSpec, claimedSuccess, {
    commands: [{ exitCode: 0 }], scopePass: true, evidencePass: true,
  }), {
    pass: true, coverage: 'commands-scope-evidence-only',
  });
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
for (const fixture of cases) {
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

    // Only source and the public regression test enter the eventual worker root.
    // Case metadata, packets, and golden expectations stay in this parent process.
    const { NODE_TEST_CONTEXT, ...env } = process.env;
    const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'test/lookup.test.js'], {
      cwd: root, env, encoding: 'utf8', timeout: 10_000, maxBuffer: 128 * 1024,
    });
    const output = result.stdout + result.stderr;
    assert.ifError(result.error);
    assert.equal(result.signal, null, output);
    assert.equal(result.status, fixture.deterministicChecks.exitCode, output);
    assert.match(output, new RegExp(`^# pass ${fixture.deterministicChecks.passed}$`, 'm'));
    assert.match(output, new RegExp(`^# fail ${fixture.deterministicChecks.failed}$`, 'm'));
    if (fixture.id === 'defect') {
      assert.match(output, /not ok 1 - missing row returns null/);
      assert.match(output, /name: 'TypeError'/);
      assert.match(output, /src\/lookup\.js:1:\d+/);
    }
    const { scoreCase } = await import('../tools/lib/behavioral-eval.mjs');
    // These flags are controlled test inputs, not an automated scope/provenance audit.
    assert.equal(scoreCase(repairSpec, claimedSuccess, {
      commands: [{ exitCode: result.status }], scopePass: true, evidencePass: true,
    }).pass, fixture.id === 'clean');
    t.diagnostic(`${fixture.id}: child exit ${result.status}; ${fixture.deterministicChecks.passed} passed, ${fixture.deterministicChecks.failed} failed`);
  });
}
