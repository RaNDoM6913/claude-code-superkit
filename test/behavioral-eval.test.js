import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const fixtures = new URL('./fixtures/astra-native/', import.meta.url);
const cases = JSON.parse(readFileSync(new URL('cases.json', fixtures), 'utf8'));

// This is a deterministic fixture check, not a model run or a behavioral scorer.
for (const fixture of cases) {
  test(`lookup fixture: ${fixture.id}`, (t) => {
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
    t.diagnostic(`${fixture.id}: child exit ${result.status}; ${fixture.deterministicChecks.passed} passed, ${fixture.deterministicChecks.failed} failed`);
  });
}
