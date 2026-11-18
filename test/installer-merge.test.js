// Installer regressions from the 2026-11-18 Claude cross-check:
//   B01 — merge must keep the user's settings.json (deep merge + backup)
//   B02 — exactly one package-owned ui-reviewer.md, chosen before copying;
//         merge never downgrades a pristine umbrella to core
//   B04 — the chosen hook profile must reach hooks via settings.json env
//   plus: stack hooks are wired to the Edit|Write group (not the Bash group),
//         and --stacks / --extras names are validated before anything is written
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { releasedBlobs } from '../lib/utils.js';
import { decideUiReviewerMerge } from '../lib/installer.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'bin', 'cli.js');
const CORE_UI = join(ROOT, 'packages', 'core', 'agents', 'ui-reviewer.md');
const UMBRELLA_UI = join(ROOT, 'packages', 'frontend-ui', 'agents', 'ui-reviewer.md');

const WORK = mkdtempSync(join(tmpdir(), 'superkit-merge-'));
after(() => rmSync(WORK, { recursive: true, force: true }));

// A git project; `claude` = contents of a pre-existing .claude/ (null → none).
function project(name, claude = null) {
  const dir = join(WORK, name);
  mkdirSync(dir, { recursive: true });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  if (claude) {
    for (const [rel, body] of Object.entries(claude)) {
      const p = join(dir, '.claude', rel);
      mkdirSync(dirname(p), { recursive: true });
      if (body !== undefined) writeFileSync(p, body);
    }
  }
  return dir;
}

function cliEnv(shellProfile) {
  const env = { ...process.env, HOME: join(WORK, 'home') };
  delete env.CLAUDE_HOOK_PROFILE;
  if (shellProfile) env.CLAUDE_HOOK_PROFILE = shellProfile;
  return env;
}

function install(dir, args = [], shellProfile) {
  return execFileSync('node', [CLI, '--defaults', '--no-superpowers', '--no-docs', ...args], { cwd: dir, env: cliEnv(shellProfile), encoding: 'utf8' });
}

function installStatus(dir, args) {
  return spawnSync('node', [CLI, '--defaults', '--no-superpowers', '--no-docs', ...args], { cwd: dir, env: cliEnv(), encoding: 'utf8' });
}

const read = (dir, rel) => readFileSync(join(dir, '.claude', rel), 'utf8');
const settingsOf = dir => JSON.parse(read(dir, 'settings.json'));
const backupsOf = dir => readdirSync(join(dir, '.claude')).filter(f => f.startsWith('settings.json.bak-'));

describe('B01: merge keeps an existing settings.json', () => {
  const userFile = JSON.stringify({
    customSentinel: { keep: true },
    permissions: { allow: ['Bash(npm test)'], deny: ['Bash(demo)'] },
    env: { FOO: 'bar' },
    enabledPlugins: { 'github@claude-plugins-official': false },
    statusLine: { type: 'command', command: 'echo mine' },
    hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo user-hook' }] }] }
  }, null, 2) + '\n';

  it('preserves user keys, adds superkit wiring, writes a timestamped backup', () => {
    const dir = project('b01', { 'settings.json': userFile });
    const out = install(dir);
    const s = settingsOf(dir);
    assert.deepEqual(s.customSentinel, { keep: true });
    assert.deepEqual(s.permissions, { allow: ['Bash(npm test)'], deny: ['Bash(demo)'] });
    assert.equal(s.env.FOO, 'bar');
    assert.equal(s.enabledPlugins['github@claude-plugins-official'], false, 'a user false is never flipped');
    assert.equal(s.enabledPlugins['superpowers@claude-plugins-official'], true);
    assert.deepEqual(s.statusLine, { type: 'command', command: 'echo mine' });
    const bash = s.hooks.PreToolUse.find(g => g.matcher === 'Bash');
    assert.equal(bash.hooks[0].command, 'echo user-hook');
    assert.ok(bash.hooks.some(h => h.command.includes('block-dangerous-git.sh')));
    assert.ok(s.hooks.SessionStart && s.hooks.Stop);
    const baks = backupsOf(dir);
    assert.equal(baks.length, 1);
    assert.equal(read(dir, baks[0]), userFile, 'backup holds the original bytes');
    assert.match(out, /Merged superkit wiring into existing settings\.json/);
    assert.match(out, /backed up → \.claude\/settings\.json\.bak-/);
  });

  it('a second merge run leaves settings.json unchanged and adds no backup', () => {
    const dir = join(WORK, 'b01');
    const before = read(dir, 'settings.json');
    const out = install(dir);
    assert.equal(read(dir, 'settings.json'), before);
    assert.equal(backupsOf(dir).length, 1);
    assert.match(out, /already contains the superkit wiring — left unchanged/);
  });

  it('invalid existing JSON is not overwritten and is reported', () => {
    const dir = project('b01-invalid', { 'settings.json': '{ "broken": ' });
    const out = install(dir, ['--profile=fast']);
    assert.equal(read(dir, 'settings.json'), '{ "broken": ');
    assert.equal(backupsOf(dir).length, 0);
    assert.match(out, /not valid JSON .* left untouched/);
    assert.match(out, /Profile: {2}fast requested — NOT applied/);
  });

  it('fresh install still builds settings.json from package defaults', () => {
    const dir = project('b01-fresh');
    install(dir);
    const s = settingsOf(dir);
    assert.ok(s.permissions.deny.length > 0);
    assert.equal(s.enabledPlugins['github@claude-plugins-official'], true);
    assert.equal(backupsOf(dir).length, 0);
  });
});

describe('B02: one package-owned ui-reviewer.md', () => {
  const core = readFileSync(CORE_UI, 'utf8');
  const umbrella = readFileSync(UMBRELLA_UI, 'utf8');

  it('merge into an empty .claude/ with frontend-ui installs the umbrella', () => {
    const dir = project('b02-empty', { 'agents/.keep': '' });
    install(dir, ['--stacks=frontend-ui']);
    assert.equal(read(dir, 'agents/ui-reviewer.md'), umbrella);
  });

  it('fresh install: frontend-ui → umbrella, otherwise core', () => {
    const withUi = project('b02-fresh-ui');
    install(withUi, ['--stacks=frontend-ui']);
    assert.equal(read(withUi, 'agents/ui-reviewer.md'), umbrella);
    const without = project('b02-fresh-core');
    install(without);
    assert.equal(read(without, 'agents/ui-reviewer.md'), core);
  });

  it('merge upgrades a pristine core copy to the selected umbrella', () => {
    const dir = project('b02-pristine', { 'agents/ui-reviewer.md': core });
    const out = install(dir, ['--stacks=frontend-ui']);
    assert.equal(read(dir, 'agents/ui-reviewer.md'), umbrella);
    assert.match(out, /Upgraded pristine core \.claude\/agents\/ui-reviewer\.md to the frontend-ui umbrella variant/);
  });

  it('merge never downgrades a pristine umbrella when Frontend UI is not selected', () => {
    const dir = project('b02-keep-umbrella', { 'agents/ui-reviewer.md': umbrella });
    const out = install(dir);
    assert.equal(read(dir, 'agents/ui-reviewer.md'), umbrella);
    assert.match(out, /Kept the frontend-ui umbrella \.claude\/agents\/ui-reviewer\.md — Frontend UI was not selected on this run/);
  });

  it('merge keeps a customised copy and prints a conflict warning', () => {
    const custom = '# my own ui reviewer\n';
    const dir = project('b02-custom', { 'agents/ui-reviewer.md': custom });
    const out = install(dir, ['--stacks=frontend-ui']);
    assert.equal(read(dir, 'agents/ui-reviewer.md'), custom);
    assert.match(out, /ui-reviewer conflict: \.claude\/agents\/ui-reviewer\.md is locally customised — kept it unchanged/);
    assert.match(out, /frontend-ui umbrella variant was NOT installed/);
  });
});

describe('decideUiReviewerMerge (merge-mode ui-reviewer policy)', () => {
  const buf = text => Buffer.from(text);
  const pristineOf = map => key => map[key] === true;

  it('identical to the selected variant → current', () => {
    assert.equal(decideUiReviewerMerge(buf('U'), 'umbrella', buf('U'), pristineOf({})), 'current');
  });
  it('older pristine copy of the selected variant → refresh', () => {
    assert.equal(decideUiReviewerMerge(buf('U1'), 'umbrella', buf('U2'), pristineOf({ umbrella: true })), 'refresh');
    assert.equal(decideUiReviewerMerge(buf('C1'), 'core', buf('C2'), pristineOf({ core: true })), 'refresh');
  });
  it('pristine core while the umbrella is selected → upgrade', () => {
    assert.equal(decideUiReviewerMerge(buf('C'), 'umbrella', buf('U'), pristineOf({ core: true })), 'upgrade');
  });
  it('pristine umbrella while core is selected → keep-umbrella (no downgrade)', () => {
    assert.equal(decideUiReviewerMerge(buf('U'), 'core', buf('C'), pristineOf({ umbrella: true })), 'keep-umbrella');
  });
  it('customised → conflict', () => {
    assert.equal(decideUiReviewerMerge(buf('mine'), 'umbrella', buf('U'), pristineOf({})), 'conflict');
    assert.equal(decideUiReviewerMerge(buf('mine'), 'core', buf('C'), pristineOf({})), 'conflict');
  });
});

describe('stack hooks are wired to the Edit|Write group', () => {
  const groupOf = (s, pred) => s.hooks.PostToolUse.find(g => pred(g.matcher));
  const isEditWrite = m => m.split('|').includes('Edit') && m.split('|').includes('Write');

  it('fresh --stacks=go,ts: go/ts hooks in Edit|Write, none in Bash', () => {
    const dir = project('hooks-fresh');
    install(dir, ['--stacks=go,ts']);
    const s = settingsOf(dir);
    const edit = JSON.stringify(groupOf(s, isEditWrite));
    const bash = JSON.stringify(groupOf(s, m => m === 'Bash'));
    for (const hook of ['go-format-on-edit.sh', 'go-vet-on-edit.sh', 'typecheck-on-edit.sh']) {
      assert.ok(edit.includes(hook), `${hook} missing from Edit|Write`);
      assert.ok(!bash.includes(hook), `${hook} wired to Bash`);
    }
  });

  it('merge re-run fixes the wiring, leaves stale Bash entries and notes them', () => {
    const stale = {
      hooks: {
        PostToolUse: [
          { matcher: 'Bash', hooks: [
            { type: 'command', command: '"$CLAUDE_PROJECT_DIR"/.claude/scripts/hooks/audit-trail.sh' },
            { type: 'command', command: '"$CLAUDE_PROJECT_DIR"/.claude/scripts/hooks/typecheck-on-edit.sh' }
          ] },
          { matcher: 'Edit|Write', hooks: [{ type: 'command', command: '"$CLAUDE_PROJECT_DIR"/.claude/scripts/hooks/audit-trail.sh' }] }
        ]
      }
    };
    const dir = project('hooks-merge', { 'settings.json': JSON.stringify(stale, null, 2) + '\n' });
    const out = install(dir, ['--stacks=ts']);
    const s = settingsOf(dir);
    assert.ok(JSON.stringify(groupOf(s, isEditWrite)).includes('typecheck-on-edit.sh'));
    assert.ok(JSON.stringify(groupOf(s, m => m === 'Bash')).includes('typecheck-on-edit.sh'), 'stale entry not deleted');
    assert.match(out, /can be removed — PostToolUse "Bash" group: typecheck-on-edit\.sh/);
  });
});

describe('--stacks / --extras names are validated before anything is written', () => {
  for (const [label, args, pattern] of [
    ['command substitution in --stacks', ['--stacks=go,$(touch PWNED)'], /Invalid stack name "\$\(touch pwned\)"/],
    ['path traversal in --extras', ['--extras=../core/agents'], /Invalid extra name "\.\.\/core\/agents"/],
    ['unknown stack', ['--stacks=cobol'], /Unknown stack "cobol"\. Valid stacks: .*frontend-ui.*typescript/],
    ['unknown extra', ['--extras=skillsmp-search'], /Unknown extra "skillsmp-search"\. Valid extras: bot-reviewer, design-system-reviewer, red-blue-auditor/]
  ]) {
    it(`rejects ${label}`, () => {
      const dir = project(`names-${label.replace(/\W+/g, '-')}`);
      const r = installStatus(dir, args);
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stderr, pattern);
      assert.equal(existsSync(join(dir, '.claude')), false, 'nothing installed');
      assert.equal(existsSync(join(dir, 'PWNED')), false);
    });
  }

  it('an existing .claude/ is left untouched when a name is rejected', () => {
    const dir = project('names-existing', { 'settings.json': '{"mine": true}\n' });
    const r = installStatus(dir, ['--stacks=../evil']);
    assert.equal(r.status, 1);
    assert.equal(read(dir, 'settings.json'), '{"mine": true}\n');
    assert.deepEqual(readdirSync(join(dir, '.claude')), ['settings.json']);
  });
});

describe('B04: the chosen profile reaches hooks via settings.json env', () => {
  it('fresh --profile=fast pins env.CLAUDE_HOOK_PROFILE and reports it truthfully', () => {
    const dir = project('b04-fast');
    const out = install(dir, ['--profile=fast']);
    assert.equal(settingsOf(dir).env.CLAUDE_HOOK_PROFILE, 'fast');
    assert.match(out, /Built settings\.json with fast profile \(env\.CLAUDE_HOOK_PROFILE\)/);
    assert.match(read(dir, '.superkit-meta'), /SUPERKIT_PROFILE="fast"/);
  });

  it('merge keeps a user-set profile and notes the difference', () => {
    const dir = project('b04-keep', { 'settings.json': '{"env": {"CLAUDE_HOOK_PROFILE": "strict"}}\n' });
    const out = install(dir, ['--profile=fast']);
    assert.equal(settingsOf(dir).env.CLAUDE_HOOK_PROFILE, 'strict');
    assert.match(out, /Kept your env\.CLAUDE_HOOK_PROFILE=strict in settings\.json \(requested: fast\)/);
    assert.match(out, /Profile: {2}strict/);
    assert.match(read(dir, '.superkit-meta'), /SUPERKIT_PROFILE="strict"/);
  });

  it('merge adds the profile when the user has none', () => {
    const dir = project('b04-add', { 'settings.json': '{"env": {"FOO": "1"}}\n' });
    install(dir, ['--profile=strict']);
    assert.deepEqual(settingsOf(dir).env, { FOO: '1', CLAUDE_HOOK_PROFILE: 'strict' });
  });

  it('without --profile, a valid profile exported in the shell is the default', () => {
    const dir = project('b04-shell');
    install(dir, [], 'strict');
    assert.equal(settingsOf(dir).env.CLAUDE_HOOK_PROFILE, 'strict');
  });

  it('warns when the pinned profile differs from the shell export', () => {
    const dir = project('b04-shell-differs');
    const out = install(dir, ['--profile=fast'], 'strict');
    assert.match(out, /Your shell exports CLAUDE_HOOK_PROFILE=strict, but Claude Code applies settings\.json env over the shell: sessions here use fast/);
  });
});

describe('releasedBlobs (pristine lookup for ui-reviewer)', () => {
  const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=test', '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], { cwd, stdio: 'pipe' });
  const repo = join(WORK, 'kit');
  const rel = 'packages/core/agents/ui-reviewer.md';
  mkdirSync(join(repo, 'packages', 'core', 'agents'), { recursive: true });
  git(repo, 'init', '-q');
  for (const [tag, body] of [['v0.0.1', 'A'], ['v0.0.2', 'B']]) {
    writeFileSync(join(repo, rel), body);
    git(repo, 'add', '-A');
    git(repo, 'commit', '-qm', tag);
    git(repo, 'tag', tag);
  }

  it('returns the file content at recent v* tags', () => {
    const blobs = releasedBlobs(repo, [rel]).map(b => b.toString());
    assert.deepEqual(blobs.sort(), ['A', 'B']);
  });

  it('returns [] for a directory that is not the work-tree root, or not a repo', () => {
    assert.deepEqual(releasedBlobs(join(repo, 'packages'), [rel]), []);
    const plain = join(WORK, 'plain');
    mkdirSync(plain, { recursive: true });
    assert.equal(existsSync(join(plain, '.git')), false);
    assert.deepEqual(releasedBlobs(plain, [rel]), []);
  });
});
