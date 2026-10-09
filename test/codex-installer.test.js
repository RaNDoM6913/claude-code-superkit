import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installCodex } from '../lib/codex.js';

function temporaryDirectory(t, prefix) {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function codexPackage(t) {
  const packagesDir = temporaryDirectory(t, 'superkit-codex-package-');
  const codexDir = join(packagesDir, 'codex');
  mkdirSync(join(codexDir, 'rules'), { recursive: true });
  writeFileSync(join(codexDir, 'AGENTS.md'), '# Packaged instructions\n');
  writeFileSync(join(codexDir, 'config.toml'), 'model = "gpt-6-astra"\n');
  writeFileSync(join(codexDir, 'rules', 'default.rules'), 'prefix_rule(pattern=["git"], decision="prompt")\n');
  return packagesDir;
}

function captureLogs(run) {
  const messages = [];
  const originalLog = console.log;
  console.log = (...values) => messages.push(values.join(' '));
  try {
    run();
  } finally {
    console.log = originalLog;
  }
  return messages;
}

describe('Codex installer', () => {
  it('copies the packaged config on a clean install and reports the created file', (t) => {
    const projectDir = temporaryDirectory(t, 'superkit-codex-project-');
    const packagesDir = codexPackage(t);

    const messages = captureLogs(() => installCodex(projectDir, packagesDir, 'fresh'));

    assert.equal(
      readFileSync(join(projectDir, '.codex', 'config.toml'), 'utf8'),
      'model = "gpt-6-astra"\n'
    );
    assert.equal(
      readFileSync(join(projectDir, '.codex', 'rules', 'default.rules'), 'utf8'),
      'prefix_rule(pattern=["git"], decision="prompt")\n'
    );
    assert.ok(messages.some((message) => message.includes('Copied shipped Codex config template → .codex/config.toml')));
    assert.ok(messages.some((message) => message.includes('Created .codex/rules/default.rules')));
  });

  it('preserves an existing consumer config even when the Claude install is fresh', (t) => {
    const projectDir = temporaryDirectory(t, 'superkit-codex-project-');
    const packagesDir = codexPackage(t);
    const configPath = join(projectDir, '.codex', 'config.toml');
    const rulesPath = join(projectDir, '.codex', 'rules', 'default.rules');
    mkdirSync(join(projectDir, '.codex', 'rules'), { recursive: true });
    writeFileSync(configPath, 'model = "consumer-custom-model"\n');
    writeFileSync(rulesPath, 'prefix_rule(pattern=["consumer-command"], decision="prompt")\n');

    const messages = captureLogs(() => installCodex(projectDir, packagesDir, 'fresh'));

    assert.equal(readFileSync(configPath, 'utf8'), 'model = "consumer-custom-model"\n');
    assert.equal(
      readFileSync(rulesPath, 'utf8'),
      'prefix_rule(pattern=["consumer-command"], decision="prompt")\n'
    );
    assert.ok(messages.some((message) => message.includes('.codex/config.toml already exists')));
    assert.ok(messages.some((message) => message.includes('.codex/rules/default.rules already exists')));
    assert.ok(!messages.some((message) => message.includes('Copied shipped Codex config template → .codex/config.toml')));
    assert.ok(!messages.some((message) => message.includes('Created .codex/rules/default.rules')));
  });
});
