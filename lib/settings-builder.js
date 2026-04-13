import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function buildSettings(baseSettings, stackHookFiles, optionalPlugins) {
  const settings = JSON.parse(JSON.stringify(baseSettings));

  const existingCommands = new Set(
    settings.hooks.PostToolUse[0].hooks.map(h => h.command)
  );
  for (const hookFile of [...new Set(stackHookFiles)]) {
    const command = `"$CLAUDE_PROJECT_DIR"/.claude/scripts/hooks/${hookFile}`;
    if (existingCommands.has(command)) continue;
    existingCommands.add(command);
    settings.hooks.PostToolUse[0].hooks.push({ type: 'command', command });
  }

  for (const plugin of optionalPlugins) {
    settings.enabledPlugins[`${plugin}@claude-plugins-official`] = true;
  }

  return settings;
}

export function collectStackHooks(packagesDir, stacks) {
  const hooks = [];
  for (const stack of stacks) {
    // Standard pattern: packages/stack-hooks/{stack}/
    const standardDir = join(packagesDir, 'stack-hooks', stack);
    // Self-contained pattern: packages/{stack}/hooks/
    const packageDir = join(packagesDir, stack, 'hooks');

    for (const hookDir of [standardDir, packageDir]) {
      if (!existsSync(hookDir)) continue;
      for (const file of readdirSync(hookDir)) {
        if (file.endsWith('.sh')) hooks.push(file);
      }
    }
  }
  return hooks;
}

export function writeSettings(baseSettingsPath, destPath, packagesDir, stacks, optionalPlugins) {
  const base = JSON.parse(readFileSync(baseSettingsPath, 'utf8'));
  const stackHooks = collectStackHooks(packagesDir, stacks);
  const settings = buildSettings(base, stackHooks, optionalPlugins);
  writeFileSync(destPath, JSON.stringify(settings, null, 2) + '\n');
  return {
    pluginCount: Object.keys(settings.enabledPlugins).length,
    stackHookCount: stackHooks.length
  };
}
