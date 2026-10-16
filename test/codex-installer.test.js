import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readlinkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { createHash } from 'node:crypto';
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
  mkdirSync(join(codexDir, 'hooks'), { recursive: true });
  writeFileSync(join(codexDir, 'hooks/superkit.mjs'), '// Original hook\n');
  writeFileSync(join(codexDir, 'hooks.json'), JSON.stringify({ hooks: { Stop: [] } }));
  mkdirSync(join(codexDir, 'skills', 'reviewer'), { recursive: true });
  writeFileSync(join(codexDir, 'skills', 'reviewer', 'SKILL.md'), '# Original reviewer\n');
  writeFileSync(join(codexDir, 'legacy-baseline.json'), JSON.stringify({ version: '1.5.2', sourceCommit: 'cbb0565f4d4868fe77f4bd7e8fdd46dada3e52ab', skills: {} }));
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

const skillPath = '.codex/skills/reviewer/SKILL.md';
const manifestPath = '.codex/.superkit-manifest.json';
function put(root, path, content) {
  mkdirSync(join(root, path, '..'), { recursive: true });
  writeFileSync(join(root, path), content);
}
function hash(text) { return createHash('sha256').update(text).digest('hex'); }
function installQuiet(dir, pkg, legacyMode) { return captureLogs(() => installCodex(dir, pkg, legacyMode)); }

describe('independent Codex updates', () => {
  it('refreshes only pristine skills, backs up old bytes, and is idempotent', t => {
    const dir = temporaryDirectory(t, 'codex-update-');
    const pkg = codexPackage(t);
    installQuiet(dir, pkg, 'fresh');
    put(pkg, 'codex/skills/reviewer/SKILL.md', '# Updated reviewer\n');
    const messages = installQuiet(dir, pkg, 'merge');
    assert.equal(readFileSync(join(dir, skillPath), 'utf8'), '# Updated reviewer\n');
    const backupRoot = join(dir, '.codex/.superkit-backups');
    const backups = readdirSync(backupRoot);
    assert.equal(backups.length, 1);
    assert.equal(readFileSync(join(backupRoot, backups[0], 'skills/reviewer/SKILL.md'), 'utf8'), '# Original reviewer\n');
    assert.ok(existsSync(join(backupRoot, backups[0], '.superkit-manifest.json')));
    assert.ok(messages.some(line => /upgrade/.test(line)));
    installQuiet(dir, pkg, 'overwrite');
    assert.deepEqual(readdirSync(backupRoot), backups);
  });

  it('preserves edits across multiple updates, reports conflicts, and adds new skills', t => {
    const dir = temporaryDirectory(t, 'codex-conflict-');
    const pkg = codexPackage(t);
    installQuiet(dir, pkg);
    put(dir, skillPath, '# Consumer edits\n');
    put(dir, '.codex/skills/reviewer/notes.md', 'consumer support file');
    put(pkg, 'codex/skills/reviewer/SKILL.md', '# Updated reviewer\n');
    put(pkg, 'codex/skills/new-role/SKILL.md', '# New role\n');
    for (const mode of ['fresh', 'overwrite']) {
      const messages = installQuiet(dir, pkg, mode);
      assert.equal(readFileSync(join(dir, skillPath), 'utf8'), '# Consumer edits\n');
      assert.ok(messages.some(line => /CONFLICT.*reviewer/.test(line)));
    }
    assert.equal(readFileSync(join(dir, '.codex/skills/new-role/SKILL.md'), 'utf8'), '# New role\n');
    assert.equal(readFileSync(join(dir, '.codex/skills/reviewer/notes.md'), 'utf8'), 'consumer support file');
    assert.ok(!existsSync(join(dir, '.codex/.superkit-backups')));
  });

  it('merges unknown legacy content without claiming its bytes as managed', t => {
    const dir = temporaryDirectory(t, 'codex-merge-');
    const pkg = codexPackage(t);
    put(dir, skillPath, '# Unknown legacy reviewer\n');
    installQuiet(dir, pkg, 'fresh');
    put(pkg, 'codex/skills/reviewer/SKILL.md', '# New release\n');
    installQuiet(dir, pkg);
    assert.equal(readFileSync(join(dir, skillPath), 'utf8'), '# Unknown legacy reviewer\n');
    const state = JSON.parse(readFileSync(join(dir, manifestPath), 'utf8'));
    assert.equal(state.skills.reviewer, undefined);
  });

  it('upgrades a known pre-manifest release but preserves a customized role', t => {
    const dir = temporaryDirectory(t, 'codex-legacy-');
    const pkg = codexPackage(t);
    put(dir, skillPath, '# Previous release\n');
    put(dir, '.codex/skills/customized/SKILL.md', '# Consumer edits\n');
    put(pkg, 'codex/skills/customized/SKILL.md', '# New stock\n');
    put(pkg, 'codex/legacy-baseline.json', JSON.stringify({
      version: '1.5.2', sourceCommit: 'cbb0565f4d4868fe77f4bd7e8fdd46dada3e52ab', skills: { reviewer: hash('# Previous release\n'), customized: hash('# Previous stock\n') }
    }));
    installQuiet(dir, pkg);
    assert.equal(readFileSync(join(dir, skillPath), 'utf8'), '# Original reviewer\n');
    assert.equal(readFileSync(join(dir, '.codex/skills/customized/SKILL.md'), 'utf8'), '# Consumer edits\n');
    const backups = readdirSync(join(dir, '.codex/.superkit-backups'));
    assert.equal(readFileSync(join(dir, '.codex/.superkit-backups', backups[0], 'skills/reviewer/SKILL.md'), 'utf8'), '# Previous release\n');
  });

  it('keeps locally retained roles when the package removes them', t => {
    const dir = temporaryDirectory(t, 'codex-retired-');
    const pkg = codexPackage(t);
    installQuiet(dir, pkg);
    rmSync(join(pkg, 'codex/skills/reviewer'), { recursive: true });
    put(pkg, 'codex/skills/replacement/SKILL.md', '# Replacement\n');
    installQuiet(dir, pkg);
    assert.equal(readFileSync(join(dir, skillPath), 'utf8'), '# Original reviewer\n');
  });

  for (const path of ['.codex', '.codex/skills', '.codex/skills/reviewer', '.codex/skills/reviewer/SKILL.md', '.codex/config.toml', '.codex/rules', 'AGENTS.md', manifestPath, '.codex/.superkit-backups', '.codex/hooks', '.codex/hooks/superkit.mjs', '.codex/hooks.json', '.codex/superkit-hooks.json']) {
    it(`refuses a symlink at ${path} before writing install assets`, t => {
      const dir = temporaryDirectory(t, 'codex-link-');
      const outside = temporaryDirectory(t, 'codex-outside-');
      const pkg = codexPackage(t);
      put(outside, 'sentinel', 'outside');
      mkdirSync(join(dir, path, '..'), { recursive: true });
      symlinkSync(outside, join(dir, path));
      assert.throws(() => installQuiet(dir, pkg), /symlink|symbolic link/i);
      assert.equal(readFileSync(join(outside, 'sentinel'), 'utf8'), 'outside');
      assert.deepEqual(readdirSync(outside), ['sentinel']);
      assert.ok(!existsSync(join(dir, '.codex/skills/reviewer/SKILL.md')) || path === '.codex/skills/reviewer/SKILL.md');
    });
  }

  it('refuses corrupt state and unsafe entries before updating any skill', t => {
    const dir = temporaryDirectory(t, 'codex-bad-state-');
    const pkg = codexPackage(t);
    installQuiet(dir, pkg);
    put(pkg, 'codex/skills/reviewer/SKILL.md', '# New bytes\n');
    for (const content of ['{', JSON.stringify({ schemaVersion: 1, skills: { '../escape': hash('bad') } }), JSON.stringify({ schemaVersion: 99, skills: {} })]) {
      put(dir, manifestPath, content);
      assert.throws(() => installQuiet(dir, pkg), /manifest/i);
      assert.equal(readFileSync(join(dir, skillPath), 'utf8'), '# Original reviewer\n');
    }
  });

  it('fails for an incomplete package before creating target files', t => {
    const dir = temporaryDirectory(t, 'codex-bad-package-');
    const pkg = codexPackage(t);
    rmSync(join(pkg, 'codex/config.toml'));
    assert.throws(() => installQuiet(dir, pkg), /config.toml/);
    assert.deepEqual(readdirSync(dir), []);
  });

  it('does not run over an existing install lock', t => {
    const dir = temporaryDirectory(t, 'codex-lock-');
    const pkg = codexPackage(t);
    put(dir, '.codex/.superkit-install.lock', 'another installer');
    assert.throws(() => installQuiet(dir, pkg), /lock|another install/i);
    assert.equal(readFileSync(join(dir, '.codex/.superkit-install.lock'), 'utf8'), 'another installer');
    assert.ok(!existsSync(join(dir, skillPath)));
  });
});

describe('Codex skill discovery links', () => {
  it('exposes installed skills through .agents and keeps the same link through updates', t => {
    const dir = temporaryDirectory(t, 'codex-discovery-');
    const pkg = codexPackage(t);
    installQuiet(dir, pkg);
    const link = join(dir, '.agents/skills/reviewer');
    assert.equal(readlinkSync(link), '../../.codex/skills/reviewer');
    assert.equal(readFileSync(join(link, 'SKILL.md'), 'utf8'), '# Original reviewer\n');
    put(pkg, 'codex/skills/reviewer/SKILL.md', '# New discoverable reviewer\n');
    installQuiet(dir, pkg);
    assert.equal(readFileSync(join(link, 'SKILL.md'), 'utf8'), '# New discoverable reviewer\n');
  });

  it('preserves existing discovery directories and external links, reporting collisions', t => {
    const dir = temporaryDirectory(t, 'codex-discovery-owned-');
    const pkg = codexPackage(t);
    put(dir, '.agents/skills/reviewer/SKILL.md', '# My discoverable reviewer\n');
    const messages = installQuiet(dir, pkg);
    assert.equal(readFileSync(join(dir, '.agents/skills/reviewer/SKILL.md'), 'utf8'), '# My discoverable reviewer\n');
    assert.ok(messages.some(line => /DISCOVERY CONFLICT.*reviewer/.test(line)));
    rmSync(join(dir, '.agents/skills/reviewer'), { recursive: true });
    const outside = temporaryDirectory(t, 'codex-discovery-external-');
    put(outside, 'SKILL.md', '# External role\n');
    symlinkSync(outside, join(dir, '.agents/skills/reviewer'));
    installQuiet(dir, pkg);
    assert.equal(readlinkSync(join(dir, '.agents/skills/reviewer')), outside);
    assert.equal(readFileSync(join(outside, 'SKILL.md'), 'utf8'), '# External role\n');
  });

  for (const ancestor of ['.agents', '.agents/skills']) {
    it(`refuses linked discovery ancestor ${ancestor} before writes`, t => {
      const dir = temporaryDirectory(t, 'codex-discovery-parent-');
      const pkg = codexPackage(t);
      const outside = temporaryDirectory(t, 'codex-discovery-parent-external-');
      mkdirSync(join(dir, ancestor, '..'), { recursive: true });
      symlinkSync(outside, join(dir, ancestor));
      assert.throws(() => installQuiet(dir, pkg), /symbolic link/);
      assert.ok(!existsSync(join(dir, '.codex')));
      assert.deepEqual(readdirSync(outside), []);
    });
  }
});

describe('interrupted writes and incomplete release baselines', () => {
  for (const relative of [skillPath, 'AGENTS.md', '.codex/config.toml', '.codex/rules/default.rules', manifestPath]) {
    it(`does not publish a partial new ${relative} after a write failure`, t => {
      const dir = temporaryDirectory(t, 'codex-interrupted-');
      const pkg = codexPackage(t);
      const destination = join(dir, relative);
      const originalWrite = fs.default.writeFileSync;
      // Fault injection after real partial disk output, isolated to one install call.
      // Builtin bindings are restored before assertions and the real recovery run.
      fs.default.writeFileSync = (path, bytes, options) => {
        if (String(path).startsWith(destination)) {
          originalWrite(path, Buffer.from(bytes).subarray(0, 5), options);
          const error = new Error('simulated disk full');
          error.code = 'ENOSPC';
          throw error;
        }
        return originalWrite(path, bytes, options);
      };
      syncBuiltinESMExports();
      try {
        assert.throws(() => installQuiet(dir, pkg), /simulated disk full/);
      } finally {
        fs.default.writeFileSync = originalWrite;
        syncBuiltinESMExports();
      }
      assert.ok(!existsSync(destination), 'Incomplete bytes must never become the canonical file');
      assert.ok(!existsSync(join(dir, '.codex/.superkit-install.lock')));
      installQuiet(dir, pkg);
      assert.equal(readFileSync(join(dir, skillPath), 'utf8'), '# Original reviewer\n');
      assert.doesNotThrow(() => JSON.parse(readFileSync(join(dir, manifestPath), 'utf8')));
    });
  }

  it('rejects a missing or malformed legacy baseline before any target writes', t => {
    const dir = temporaryDirectory(t, 'codex-missing-baseline-');
    const pkg = codexPackage(t);
    const baseline = join(pkg, 'codex/legacy-baseline.json');
    rmSync(baseline);
    assert.throws(() => installQuiet(dir, pkg), /baseline/);
    assert.deepEqual(readdirSync(dir), []);
    for (const record of [{ skills: {} }, { version: '1.5.2', sourceCommit: '../unknown', skills: {} }]) {
      writeFileSync(baseline, JSON.stringify(record));
      assert.throws(() => installQuiet(dir, pkg), /baseline/);
      assert.deepEqual(readdirSync(dir), []);
    }
  });
});

describe('native Codex hook installation and preservation', () => {
  it('creates hook assets/config on fresh install without granting trust', t => {
    const dir = temporaryDirectory(t, 'codex-hooks-install-');
    const pkg = codexPackage(t);
    const messages = installQuiet(dir, pkg);
    assert.equal(readFileSync(join(dir, '.codex/hooks/superkit.mjs'), 'utf8'), '// Original hook\n');
    assert.deepEqual(JSON.parse(readFileSync(join(dir, '.codex/hooks.json'), 'utf8')), { hooks: { Stop: [] } });
    assert.ok(existsSync(join(dir, '.codex/superkit-hooks.json')));
    assert.ok(messages.some(line => /\/hooks.*trust|trust.*\/hooks/.test(line)));
    assert.deepEqual(readdirSync(join(dir, '.codex')).sort(), ['.superkit-manifest.json', 'config.toml', 'hooks', 'hooks.json', 'rules', 'skills', 'superkit-hooks.json'].sort());
  });

  it('preserves consumer hooks and inline config and supplies a separate merge template', t => {
    const dir = temporaryDirectory(t, 'codex-hooks-custom-');
    const pkg = codexPackage(t);
    const config = 'model="mine"\n[[hooks.Stop]]\n';
    const hooks = '{"hooks":{"SessionStart":[]}}\n';
    put(dir, '.codex/config.toml', config);
    put(dir, '.codex/hooks.json', hooks);
    for (let i = 0; i < 2; i++) installQuiet(dir, pkg);
    assert.equal(readFileSync(join(dir, '.codex/config.toml'), 'utf8'), config);
    assert.equal(readFileSync(join(dir, '.codex/hooks.json'), 'utf8'), hooks);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, '.codex/superkit-hooks.json'), 'utf8')), { hooks: { Stop: [] } });
    rmSync(join(dir, '.codex/hooks.json'));
    installQuiet(dir, pkg);
    assert.ok(!existsSync(join(dir, '.codex/hooks.json')), 'Do not auto-add another source next to unknown inline hooks');
  });

  it('updates pristine hook assets with backup while preserving the active hook definition', t => {
    const dir = temporaryDirectory(t, 'codex-hooks-update-');
    const pkg = codexPackage(t);
    installQuiet(dir, pkg);
    const hookConfig = readFileSync(join(dir, '.codex/hooks.json'), 'utf8');
    put(pkg, 'codex/hooks/superkit.mjs', '// New hook\n');
    put(pkg, 'codex/hooks.json', '{"hooks":{"PreToolUse":[]}}');
    installQuiet(dir, pkg);
    assert.equal(readFileSync(join(dir, '.codex/hooks/superkit.mjs'), 'utf8'), '// New hook\n');
    assert.equal(readFileSync(join(dir, '.codex/hooks.json'), 'utf8'), hookConfig);
    const backups = readdirSync(join(dir, '.codex/.superkit-backups'));
    assert.equal(readFileSync(join(dir, '.codex/.superkit-backups', backups[0], 'hooks/superkit.mjs'), 'utf8'), '// Original hook\n');
    assert.deepEqual(JSON.parse(readFileSync(join(dir, '.codex/superkit-hooks.json'), 'utf8')), { hooks: { PreToolUse: [] } });
  });

  it('preserves unknown/edited hook assets and does not newly activate them', t => {
    const dir = temporaryDirectory(t, 'codex-hooks-conflict-');
    const pkg = codexPackage(t);
    put(dir, '.codex/hooks/superkit.mjs', '// My hook\n');
    const messages = installQuiet(dir, pkg);
    assert.equal(readFileSync(join(dir, '.codex/hooks/superkit.mjs'), 'utf8'), '// My hook\n');
    assert.ok(!existsSync(join(dir, '.codex/hooks.json')));
    assert.ok(messages.some(line => /CONFLICT.*hooks\/superkit.mjs/.test(line)));
    installQuiet(dir, pkg);
    assert.equal(readFileSync(join(dir, '.codex/hooks/superkit.mjs'), 'utf8'), '// My hook\n');
  });

  it('upgrades a skills-only schema-1 manifest and rejects unsafe asset keys', t => {
    const dir = temporaryDirectory(t, 'codex-hooks-schema-');
    const pkg = codexPackage(t);
    put(dir, manifestPath, JSON.stringify({ schemaVersion: 1, skills: {} }));
    installQuiet(dir, pkg);
    const state = JSON.parse(readFileSync(join(dir, manifestPath), 'utf8'));
    assert.equal(state.assets['hooks/superkit.mjs'], hash('// Original hook\n'));
    state.assets['../escape'] = hash('bad');
    put(dir, manifestPath, JSON.stringify(state));
    assert.throws(() => installQuiet(dir, pkg), /manifest/);
  });

  it('rejects missing hook package assets before target writes', t => {
    const dir = temporaryDirectory(t, 'codex-hooks-missing-');
    const pkg = codexPackage(t);
    rmSync(join(pkg, 'codex/hooks/superkit.mjs'));
    assert.throws(() => installQuiet(dir, pkg), /superkit.mjs/);
    assert.deepEqual(readdirSync(dir), []);
  });

  it('rejects malformed packaged command hooks before target writes', t => {
    const dir = temporaryDirectory(t, 'codex-hooks-invalid-');
    const pkg = codexPackage(t);
    for (const definition of [
      { hooks: { Stop: 'invalid' } },
      { hooks: { Stop: [{ hooks: [{ type: 'command', command: '' }] }] } },
      { hooks: { Stop: [{ hooks: [{ type: 'prompt', prompt: 'not a command hook' }] }] } }
    ]) {
      put(pkg, 'codex/hooks.json', JSON.stringify(definition));
      assert.throws(() => installQuiet(dir, pkg), /Invalid packaged hooks.json/);
      assert.deepEqual(readdirSync(dir), []);
    }
  });
});
