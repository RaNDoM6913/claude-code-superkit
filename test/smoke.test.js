import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('smoke test: --defaults install', () => {
  let testDir;
  const cliPath = join(__dirname, '..', 'bin', 'cli.js');

  before(() => {
    testDir = mkdtempSync(join(tmpdir(), 'superkit-smoke-'));
    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "init"', { cwd: testDir, stdio: 'pipe' });
  });

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('installs with --defaults without errors', () => {
    const result = execSync(`node "${cliPath}" --defaults --no-superpowers`, {
      cwd: testDir,
      stdio: 'pipe',
      env: { ...process.env, HOME: tmpdir() }
    });
    const output = result.toString();
    assert.ok(output.includes('Installation complete!'), 'Should show completion message');
  });

  it('creates .claude/ directory', () => {
    assert.ok(existsSync(join(testDir, '.claude')));
  });

  it('creates agents', () => {
    assert.ok(existsSync(join(testDir, '.claude', 'agents')));
  });

  it('creates valid settings.json', () => {
    const settingsPath = join(testDir, '.claude', 'settings.json');
    assert.ok(existsSync(settingsPath));
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    assert.ok(settings.hooks);
    assert.ok(settings.enabledPlugins);
  });

  it('creates CLAUDE.md', () => {
    assert.ok(existsSync(join(testDir, 'CLAUDE.md')));
  });

  it('creates hooks directory', () => {
    const hooksDir = join(testDir, '.claude', 'scripts', 'hooks');
    assert.ok(existsSync(hooksDir));
  });

  it('creates .superkit-meta', () => {
    assert.ok(existsSync(join(testDir, '.claude', '.superkit-meta')));
  });
});
