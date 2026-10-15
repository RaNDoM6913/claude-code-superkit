import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const cli = resolve('bin/cli.js');
function project(t) {
  const dir = mkdtempSync(join(tmpdir(), 'superkit-codex-cli-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', dir]);
  return dir;
}
function run(dir, args, env = process.env) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: dir, env, encoding: 'utf8', timeout: 30000 });
}
function success(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

describe('Codex-only CLI', () => {
  it('installs without prompts or Claude calls, including from a project subdirectory', t => {
    const dir = project(t);
    const probes = join(dir, 'probes');
    mkdirSync(probes);
    // Any accidental Claude invocation is observable; no real plugin calls allowed.
    writeFileSync(join(probes, 'claude'), '#!/bin/sh\nprintf called > "$PROBE_LOG"\nexit 99\n');
    chmodSync(join(probes, 'claude'), 0o755);
    mkdirSync(join(dir, 'src'));
    const result = run(join(dir, 'src'), ['--codex-only'], {
      ...process.env, PATH: `${probes}:${process.env.PATH}`, PROBE_LOG: join(dir, 'claude-called')
    });
    success(result);
    assert.ok(!existsSync(join(dir, 'claude-called')));
    assert.ok(!existsSync(join(dir, '.claude')));
    assert.ok(!existsSync(join(dir, 'CLAUDE.md')));
    assert.ok(!existsSync(join(dir, 'docs-templates')));
    assert.ok(existsSync(join(dir, '.codex', 'skills', 'code-reviewer', 'SKILL.md')));
    assert.ok(existsSync(join(dir, 'AGENTS.md')));
    assert.doesNotMatch(result.stdout, /requires Claude|Claude Code plugins|Run: claude/);
    assert.match(result.stdout, /Codex installation complete/);
    success(run(dir, ['--codex-only']));
  });

  it('leaves an existing Claude tree and user Codex files unchanged', t => {
    const dir = project(t);
    const files = {
      '.claude/settings.json': '{"consumer":true}\n', 'CLAUDE.md': '# My Claude\n',
      'AGENTS.md': '# My instructions\n', '.codex/config.toml': 'model="mine"\n',
      '.codex/rules/default.rules': '# My policy\n',
      '.codex/skills/code-reviewer/SKILL.md': '# My reviewer\n',
      '.codex/skills/custom/SKILL.md': '# My custom skill\n', '.codex/notes.txt': 'keep\n'
    };
    for (const [path, contents] of Object.entries(files)) {
      mkdirSync(resolve(dir, path, '..'), { recursive: true });
      writeFileSync(join(dir, path), contents);
    }
    for (let i = 0; i < 2; i++) success(run(dir, ['--codex-only', '--defaults']));
    for (const [path, contents] of Object.entries(files)) assert.equal(readFileSync(join(dir, path), 'utf8'), contents, path);
    assert.deepEqual(readdirSync(join(dir, '.claude')), ['settings.json']);
  });

  it('keeps --codex additive while preserving Codex custom skills on a fresh Claude install', t => {
    const dir = project(t);
    mkdirSync(join(dir, '.codex/skills/code-reviewer'), { recursive: true });
    writeFileSync(join(dir, '.codex/skills/code-reviewer/SKILL.md'), '# Custom reviewer\n');
    success(run(dir, ['--defaults', '--codex', '--no-superpowers', '--no-docs']));
    assert.ok(existsSync(join(dir, '.claude/settings.json')));
    assert.ok(existsSync(join(dir, '.codex/config.toml')));
    assert.equal(readFileSync(join(dir, '.codex/skills/code-reviewer/SKILL.md'), 'utf8'), '# Custom reviewer\n');
  });

  it('rejects conflicting selectors before writing files', t => {
    const dir = project(t);
    for (const flag of ['--codex', '--profile=fast', '--stacks=go', '--extras=bot', '--plugins=playwright']) {
      const result = run(dir, ['--codex-only', flag]);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /cannot be combined/);
      assert.ok(!existsSync(join(dir, '.codex')));
      assert.ok(!existsSync(join(dir, '.claude')));
    }
  });
});
