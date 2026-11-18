import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildSettings, mergeSettings, writeSettings } from '../lib/settings-builder.js';

const PACKAGES = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages');
const CORE_SETTINGS = join(PACKAGES, 'core', 'settings.json');

describe('buildSettings', () => {
  // Mirrors packages/core/settings.json: the Bash group comes FIRST in
  // PostToolUse, the Edit|Write group later.
  const baseSettings = {
    permissions: { allow: ['Bash'], deny: [] },
    hooks: {
      PostToolUse: [
        {
          matcher: 'Bash',
          hooks: [
            { type: 'command', command: '"$CLAUDE_PROJECT_DIR"/.claude/scripts/hooks/audit-trail.sh' }
          ]
        },
        {
          matcher: 'Edit|Write',
          hooks: [
            { type: 'command', command: '"$CLAUDE_PROJECT_DIR"/.claude/scripts/hooks/console-log-warning.sh' }
          ]
        }
      ]
    },
    enabledPlugins: {
      'superpowers@claude-plugins-official': true
    }
  };
  const group = (settings, matcher) => settings.hooks.PostToolUse.find(g => g.matcher === matcher);

  it('returns base settings with no stacks or plugins', () => {
    const result = buildSettings(baseSettings, [], []);
    assert.deepEqual(result.enabledPlugins, baseSettings.enabledPlugins);
    assert.deepEqual(result.hooks, baseSettings.hooks);
  });

  it('adds stack hooks to the Edit|Write group, not the first (Bash) group', () => {
    const stackHooks = ['format-on-edit.sh', 'go-vet-on-edit.sh'];
    const result = buildSettings(baseSettings, stackHooks, []);
    assert.equal(group(result, 'Bash').hooks.length, 1, 'Bash group untouched');
    const edit = group(result, 'Edit|Write').hooks;
    assert.equal(edit.length, 3);
    assert.ok(edit[1].command.includes('format-on-edit.sh'));
    assert.ok(edit[2].command.includes('go-vet-on-edit.sh'));
  });

  it('finds the Edit/Write group by matcher whatever its spelling or position', () => {
    const base = JSON.parse(JSON.stringify(baseSettings));
    base.hooks.PostToolUse[1].matcher = 'Write|MultiEdit|Edit';
    const result = buildSettings(base, ['typecheck-on-edit.sh'], []);
    assert.equal(result.hooks.PostToolUse.length, 2);
    assert.ok(group(result, 'Write|MultiEdit|Edit').hooks.some(h => h.command.includes('typecheck-on-edit.sh')));
  });

  it('appends an Edit|Write group when none exists', () => {
    const base = JSON.parse(JSON.stringify(baseSettings));
    base.hooks.PostToolUse = [base.hooks.PostToolUse[0]];
    const result = buildSettings(base, ['ruff-on-edit.sh'], []);
    assert.equal(result.hooks.PostToolUse.length, 2);
    assert.deepEqual(group(result, 'Edit|Write').hooks.map(h => h.command), ['"$CLAUDE_PROJECT_DIR"/.claude/scripts/hooks/ruff-on-edit.sh']);
    assert.equal(group(result, 'Bash').hooks.length, 1);
  });

  it('real packages/core/settings.json: stack hooks land in Edit|Write, never in Bash', () => {
    const real = JSON.parse(readFileSync(CORE_SETTINGS, 'utf8'));
    assert.equal(real.hooks.PostToolUse[0].matcher, 'Bash', 'precondition: Bash is the first PostToolUse group');
    const result = buildSettings(real, ['go-format-on-edit.sh', 'typecheck-on-edit.sh'], []);
    const bash = JSON.stringify(group(result, 'Bash'));
    assert.ok(!bash.includes('go-format-on-edit.sh') && !bash.includes('typecheck-on-edit.sh'));
    const edit = JSON.stringify(group(result, 'Edit|Write'));
    assert.ok(edit.includes('go-format-on-edit.sh') && edit.includes('typecheck-on-edit.sh'));
  });

  it('adds optional plugins', () => {
    const result = buildSettings(baseSettings, [], ['playwright', 'code-simplifier']);
    assert.equal(result.enabledPlugins['playwright@claude-plugins-official'], true);
    assert.equal(result.enabledPlugins['code-simplifier@claude-plugins-official'], true);
  });

  it('does not mutate original object', () => {
    const before = JSON.stringify(baseSettings);
    buildSettings(baseSettings, ['test.sh'], ['playwright']);
    assert.equal(JSON.stringify(baseSettings), before);
  });

  it('dedupes hook files that appear multiple times', () => {
    const result = buildSettings(baseSettings, ['format-on-edit.sh', 'format-on-edit.sh'], []);
    const formatHooks = group(result, 'Edit|Write').hooks
      .filter(h => h.command.includes('format-on-edit.sh'));
    assert.equal(formatHooks.length, 1);
  });

  it('does not re-add a hook already present in the base settings', () => {
    const result = buildSettings(baseSettings, ['console-log-warning.sh'], []);
    const warningHooks = group(result, 'Edit|Write').hooks
      .filter(h => h.command.includes('console-log-warning.sh'));
    assert.equal(warningHooks.length, 1);
  });
});

describe('buildSettings: hook profile (B04)', () => {
  const base = JSON.parse(readFileSync(CORE_SETTINGS, 'utf8'));

  it('pins the chosen profile in env.CLAUDE_HOOK_PROFILE', () => {
    for (const profile of ['fast', 'standard', 'strict']) {
      assert.equal(buildSettings(base, [], [], { profile }).env.CLAUDE_HOOK_PROFILE, profile);
    }
  });

  it('adds no env block when no profile is given', () => {
    assert.equal(buildSettings(base, [], []).env, undefined);
  });
});

describe('mergeSettings (B01 merge contract)', () => {
  const generated = buildSettings(JSON.parse(readFileSync(CORE_SETTINGS, 'utf8')), ['typecheck-on-edit.sh'], ['playwright'], { profile: 'fast' });
  const userSettings = () => ({
    customSentinel: { nested: [1, 2, 3] },
    permissions: { allow: ['Bash(npm test)'], deny: ['Bash(demo)'] },
    env: { FOO: 'bar' },
    enabledPlugins: { 'github@claude-plugins-official': false, 'mine@market': true },
    statusLine: { type: 'command', command: 'echo mine' },
    hooks: {
      PreToolUse: [{
        matcher: 'Bash',
        hooks: [
          { type: 'command', command: 'echo user-hook' },
          // same superkit hook, written without quotes/with ${} — must dedupe
          { type: 'command', command: '${CLAUDE_PROJECT_DIR}/.claude/scripts/hooks/block-dangerous-git.sh' }
        ]
      }],
      Notification: [{ matcher: '', hooks: [{ type: 'command', command: 'notify-send hi' }] }]
    }
  });

  it('keeps every user key and value', () => {
    const user = userSettings();
    const { settings } = mergeSettings(user, generated);
    assert.deepEqual(settings.customSentinel, user.customSentinel);
    assert.deepEqual(settings.permissions, user.permissions, 'permissions must not be broadened or rewritten');
    assert.equal(settings.env.FOO, 'bar');
    assert.deepEqual(settings.statusLine, user.statusLine);
    assert.deepEqual(settings.hooks.Notification, user.hooks.Notification);
    assert.equal(settings.hooks.PreToolUse[0].hooks[0].command, 'echo user-hook');
  });

  it('never flips an existing plugin value; adds missing plugins', () => {
    const { settings } = mergeSettings(userSettings(), generated);
    assert.equal(settings.enabledPlugins['github@claude-plugins-official'], false);
    assert.equal(settings.enabledPlugins['mine@market'], true);
    assert.equal(settings.enabledPlugins['superpowers@claude-plugins-official'], true);
    assert.equal(settings.enabledPlugins['playwright@claude-plugins-official'], true);
  });

  it('adds missing superkit hooks, deduped by matcher + command', () => {
    const { settings, report } = mergeSettings(userSettings(), generated);
    const bash = settings.hooks.PreToolUse.filter(g => g.matcher === 'Bash');
    assert.equal(bash.length, 1, 'superkit entries join the existing Bash group');
    const gitGuards = bash[0].hooks.filter(h => /block-dangerous-git\.sh/.test(h.command));
    assert.equal(gitGuards.length, 1, 'an equivalent existing command is not added twice');
    assert.ok(bash[0].hooks.some(h => /loop-guard\.sh/.test(h.command)));
    assert.ok(settings.hooks.PreToolUse.some(g => g.matcher === 'Edit|Write|MultiEdit'));
    assert.ok(settings.hooks.SessionStart, 'missing events are added');
    assert.ok(JSON.stringify(settings.hooks.PostToolUse).includes('typecheck-on-edit.sh'));
    assert.ok(report.hooksAdded > 0);
  });

  it('is idempotent: a second merge changes nothing', () => {
    const once = mergeSettings(userSettings(), generated).settings;
    const twice = mergeSettings(once, generated);
    assert.deepEqual(twice.settings, once);
    assert.equal(twice.report.hooksAdded, 0);
  });

  it('adds env.CLAUDE_HOOK_PROFILE only when the user has not set it', () => {
    assert.equal(mergeSettings(userSettings(), generated).settings.env.CLAUDE_HOOK_PROFILE, 'fast');
    const user = userSettings();
    user.env.CLAUDE_HOOK_PROFILE = 'strict';
    assert.equal(mergeSettings(user, generated).settings.env.CLAUDE_HOOK_PROFILE, 'strict');
  });

  it('does not stack a second prompt hook on an event+matcher that already has one', () => {
    const user = userSettings();
    user.hooks.Stop = [{ hooks: [{ type: 'prompt', prompt: 'my own stop gate' }] }];
    const { settings, report } = mergeSettings(user, generated);
    assert.equal(settings.hooks.Stop.length, 1);
    assert.equal(settings.hooks.Stop[0].hooks.length, 1);
    assert.match(report.notes.join('\n'), /Stop.*prompt hook/);
  });

  it('puts stack hooks into the user\'s Edit|Write group and notes stale Bash-group entries', () => {
    const user = {
      hooks: {
        PostToolUse: [
          { matcher: 'Bash', hooks: [
            { type: 'command', command: '"$CLAUDE_PROJECT_DIR"/.claude/scripts/hooks/audit-trail.sh' },
            { type: 'command', command: '"$CLAUDE_PROJECT_DIR"/.claude/scripts/hooks/typecheck-on-edit.sh' }
          ] },
          { matcher: 'Write|Edit', hooks: [{ type: 'command', command: 'echo mine' }] }
        ]
      }
    };
    const { settings, report } = mergeSettings(user, generated, { stackHookFiles: ['typecheck-on-edit.sh', 'go-vet-on-edit.sh'] });
    const post = settings.hooks.PostToolUse;
    const bash = post.find(g => g.matcher === 'Bash');
    assert.equal(bash.hooks.length >= 2, true);
    assert.ok(bash.hooks.some(h => h.command.includes('typecheck-on-edit.sh')), 'stale entry left in place');
    assert.equal(post.filter(g => ['Edit|Write', 'Write|Edit'].includes(g.matcher)).length, 1, 'order-insensitive matcher: no duplicate group');
    const edit = post.find(g => g.matcher === 'Write|Edit');
    assert.equal(edit.hooks[0].command, 'echo mine');
    assert.ok(edit.hooks.some(h => h.command.includes('typecheck-on-edit.sh')));
    assert.match(report.notes.join('\n'), /older superkit install .*can be removed — PostToolUse "Bash" group: typecheck-on-edit\.sh/);
  });

  it('notes superkit deny rules it did not add', () => {
    const { report } = mergeSettings(userSettings(), generated);
    assert.match(report.notes.join('\n'), /kept your permissions unchanged; \d+ superkit default deny rule/);
  });
});

describe('writeSettings modes (B01 + B04)', () => {
  let tmp;
  before(() => { tmp = mkdtempSync(join(tmpdir(), 'superkit-settings-')); });
  after(() => rmSync(tmp, { recursive: true, force: true }));

  const write = (dir, mode, profile = 'standard') =>
    writeSettings(CORE_SETTINGS, join(dir, 'settings.json'), PACKAGES, [], [], { mode, profile });
  const backups = dir => readdirSync(dir).filter(f => f.startsWith('settings.json.bak-'));

  it('fresh: builds from defaults and pins the profile', () => {
    const dir = mkdtempSync(join(tmp, 'fresh-'));
    const r = write(dir, 'fresh', 'strict');
    assert.equal(r.action, 'written');
    assert.equal(r.profile, 'strict');
    assert.equal(JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8')).env.CLAUDE_HOOK_PROFILE, 'strict');
  });

  it('merge: keeps user data and writes a timestamped backup of the original bytes', () => {
    const dir = mkdtempSync(join(tmp, 'merge-'));
    const original = JSON.stringify({ customSentinel: true, permissions: { deny: ['Bash(demo)'] } }, null, 4) + '\n';
    writeFileSync(join(dir, 'settings.json'), original);
    const r = write(dir, 'merge', 'fast');
    assert.equal(r.action, 'merged');
    const merged = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'));
    assert.equal(merged.customSentinel, true);
    assert.deepEqual(merged.permissions, { deny: ['Bash(demo)'] });
    assert.equal(merged.env.CLAUDE_HOOK_PROFILE, 'fast');
    assert.ok(merged.hooks.PreToolUse);
    const baks = backups(dir);
    assert.equal(baks.length, 1);
    assert.match(baks[0], /^settings\.json\.bak-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/);
    assert.equal(readFileSync(join(dir, baks[0]), 'utf8'), original);
    assert.equal(r.backupPath, join(dir, baks[0]));
  });

  it('merge: a re-run with nothing to add leaves the file and makes no backup', () => {
    const dir = mkdtempSync(join(tmp, 'rerun-'));
    writeFileSync(join(dir, 'settings.json'), '{"customSentinel": 1}\n');
    write(dir, 'merge');
    const after1 = readFileSync(join(dir, 'settings.json'), 'utf8');
    const r = write(dir, 'merge');
    assert.equal(r.action, 'unchanged');
    assert.equal(readFileSync(join(dir, 'settings.json'), 'utf8'), after1);
    assert.equal(backups(dir).length, 1);
  });

  it('merge: invalid JSON is left untouched with no backup', () => {
    for (const body of ['{ "broken": ', '[1, 2]', 'null']) {
      const dir = mkdtempSync(join(tmp, 'invalid-'));
      writeFileSync(join(dir, 'settings.json'), body);
      const r = write(dir, 'merge');
      assert.equal(r.action, 'invalid', body);
      assert.equal(readFileSync(join(dir, 'settings.json'), 'utf8'), body);
      assert.equal(backups(dir).length, 0);
    }
  });

  it('merge without an existing file behaves like fresh', () => {
    const dir = mkdtempSync(join(tmp, 'nofile-'));
    assert.equal(write(dir, 'merge', 'fast').action, 'written');
    assert.equal(backups(dir).length, 0);
  });
});
