import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSettings } from '../lib/settings-builder.js';

describe('buildSettings', () => {
  const baseSettings = {
    permissions: { allow: ['Bash'], deny: [] },
    hooks: {
      PostToolUse: [
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

  it('returns base settings with no stacks or plugins', () => {
    const result = buildSettings(baseSettings, [], []);
    assert.deepEqual(result.enabledPlugins, baseSettings.enabledPlugins);
    assert.equal(result.hooks.PostToolUse[0].hooks.length, 1);
  });

  it('adds stack hooks to PostToolUse', () => {
    const stackHooks = ['format-on-edit.sh', 'go-vet-on-edit.sh'];
    const result = buildSettings(baseSettings, stackHooks, []);
    assert.equal(result.hooks.PostToolUse[0].hooks.length, 3);
    assert.ok(result.hooks.PostToolUse[0].hooks[1].command.includes('format-on-edit.sh'));
    assert.ok(result.hooks.PostToolUse[0].hooks[2].command.includes('go-vet-on-edit.sh'));
  });

  it('adds optional plugins', () => {
    const result = buildSettings(baseSettings, [], ['playwright', 'code-simplifier']);
    assert.equal(result.enabledPlugins['playwright@claude-plugins-official'], true);
    assert.equal(result.enabledPlugins['code-simplifier@claude-plugins-official'], true);
  });

  it('does not mutate original object', () => {
    const originalLength = baseSettings.hooks.PostToolUse[0].hooks.length;
    buildSettings(baseSettings, ['test.sh'], ['playwright']);
    assert.equal(baseSettings.hooks.PostToolUse[0].hooks.length, originalLength);
  });
});
