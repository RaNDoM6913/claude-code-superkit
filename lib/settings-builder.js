import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { knownStacks } from './utils.js';

// Hooks read the profile from this variable (packages/core/hooks/lib/profile.sh).
export const PROFILE_ENV = 'CLAUDE_HOOK_PROFILE';
export const VALID_PROFILES = ['fast', 'standard', 'strict'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Matchers are '|'-separated tool alternatives ("Edit|Write", "Write|Edit|MultiEdit").
function matcherTokens(matcher) {
  return matcher === undefined || matcher === null ? [] : String(matcher).split('|').map(t => t.trim()).filter(Boolean);
}

export function coversEditAndWrite(matcher) {
  const tokens = matcherTokens(matcher);
  return tokens.includes('Edit') && tokens.includes('Write');
}

// Stack/package hooks are edit hooks: they read tool_input.file_path, which only
// Edit/Write calls carry. They are attached to the PostToolUse group whose matcher
// covers Edit AND Write, found by matcher (never by index: core's first group is
// the Bash one), or to a new "Edit|Write" group when there is none.
export const STACK_HOOK_MATCHER = 'Edit|Write';

function stackHookCommand(hookFile) {
  return `"$CLAUDE_PROJECT_DIR"/.claude/scripts/hooks/${hookFile}`;
}

function editWriteGroup(settings) {
  if (!isPlainObject(settings.hooks)) settings.hooks = {};
  if (!Array.isArray(settings.hooks.PostToolUse)) settings.hooks.PostToolUse = [];
  let group = settings.hooks.PostToolUse.find(g => isPlainObject(g) && coversEditAndWrite(g.matcher) && Array.isArray(g.hooks));
  if (!group) {
    group = { matcher: STACK_HOOK_MATCHER, hooks: [] };
    settings.hooks.PostToolUse.push(group);
  }
  return group;
}

export function buildSettings(baseSettings, stackHookFiles, optionalPlugins, options = {}) {
  const settings = clone(baseSettings);

  const uniqueHookFiles = [...new Set(stackHookFiles)];
  if (uniqueHookFiles.length > 0) {
    const group = editWriteGroup(settings);
    const existingCommands = new Set(group.hooks.map(h => (isPlainObject(h) && typeof h.command === 'string' ? normalizeCommand(h.command) : null)));
    for (const hookFile of uniqueHookFiles) {
      const command = stackHookCommand(hookFile);
      if (existingCommands.has(normalizeCommand(command))) continue;
      existingCommands.add(normalizeCommand(command));
      group.hooks.push({ type: 'command', command });
    }
  }

  for (const plugin of optionalPlugins) {
    settings.enabledPlugins[`${plugin}@claude-plugins-official`] = true;
  }

  // The chosen profile only takes effect when hooks see it in their environment;
  // Claude Code passes settings.json `env` to every session.
  if (options.profile) {
    settings.env = { ...(isPlainObject(settings.env) ? settings.env : {}), [PROFILE_ENV]: options.profile };
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

// ── Merge into an existing settings.json (installer "merge" mode) ─────────
// Contract — the user's file is the base; superkit only ADDS:
//   • every existing key/value is kept, including unknown keys;
//   • objects without special handling (env, enabledPlugins, …) gain only the
//     keys they lack — an existing value (e.g. a plugin set to false, or the
//     user's CLAUDE_HOOK_PROFILE) is never changed;
//   • hooks: a superkit hook is added only when no group with the same event and
//     matcher (alternatives compared order-insensitively) already runs it
//     (identity: normalized command, or prompt text); a superkit prompt hook is
//     also skipped when that event+matcher already has a prompt hook, so a
//     drifted/edited Stop prompt is never stacked twice. Stack/package hooks
//     therefore land in the user's Edit|Write group, like buildSettings;
//   • stack/package hook entries an older installer put in a PostToolUse group
//     that never fires on Edit/Write (the Bash group) are left in place and
//     reported as removable — user-visible config is never deleted silently;
//   • permissions: when present, kept exactly as the user wrote them — never
//     broadened by superkit's allow list nor rewritten by its deny list.
function matcherKey(group) {
  return matcherTokens(group.matcher).sort().join('|');
}

function firesOnEditOrWrite(matcher) {
  const tokens = matcherTokens(matcher);
  return tokens.length === 0 || tokens.includes('*') || tokens.includes('Edit') || tokens.includes('Write');
}

function staleStackHookNote(settings, stackHookFiles) {
  const post = isPlainObject(settings.hooks) && Array.isArray(settings.hooks.PostToolUse) ? settings.hooks.PostToolUse : [];
  const known = new Set(stackHookFiles);
  const stale = new Map();  // matcher → Set(hook file)
  for (const group of post) {
    if (!isPlainObject(group) || !Array.isArray(group.hooks) || firesOnEditOrWrite(group.matcher)) continue;
    for (const hook of group.hooks) {
      if (!isPlainObject(hook) || typeof hook.command !== 'string') continue;
      const m = normalizeCommand(hook.command).match(/\/\.claude\/scripts\/hooks\/([^/\s]+)$/);
      if (!m || !known.has(m[1])) continue;
      if (!stale.has(group.matcher)) stale.set(group.matcher, new Set());
      stale.get(group.matcher).add(m[1]);
    }
  }
  if (stale.size === 0) return null;
  const parts = [...stale].map(([matcher, files]) => `PostToolUse "${matcher}" group: ${[...files].join(', ')}`);
  return `stack hook entries from an older superkit install never fire outside an Edit|Write matcher and can be removed — ${parts.join('; ')}`;
}

function normalizeCommand(command) {
  return String(command)
    .replace(/\$\{(\w+)\}/g, '$$$1')
    .replace(/["']/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function hookType(hook) {
  return hook.type || 'command';
}

function sameHook(a, b) {
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  if (hookType(a) !== hookType(b)) return false;
  if (typeof b.command === 'string') return typeof a.command === 'string' && normalizeCommand(a.command) === normalizeCommand(b.command);
  if (typeof b.prompt === 'string') return a.prompt === b.prompt;
  return JSON.stringify(a) === JSON.stringify(b);
}

function mergeHooks(target, source, report) {
  for (const [event, groups] of Object.entries(source)) {
    if (!Array.isArray(groups)) continue;
    if (!(event in target)) {
      target[event] = clone(groups);
      for (const g of groups) report.hooksAdded += Array.isArray(g.hooks) ? g.hooks.length : 0;
      continue;
    }
    const existingGroups = target[event];
    if (!Array.isArray(existingGroups)) {
      report.notes.push(`hooks.${event} has an unexpected shape — superkit ${event} hooks were not merged`);
      continue;
    }
    for (const group of groups) {
      if (!isPlainObject(group) || !Array.isArray(group.hooks)) continue;
      const matcher = matcherKey(group);
      const sameMatcher = existingGroups.filter(g => isPlainObject(g) && matcherKey(g) === matcher && Array.isArray(g.hooks));
      const missing = [];
      for (const hook of group.hooks) {
        if (sameMatcher.some(g => g.hooks.some(h => sameHook(h, hook)))) continue;
        if (hookType(hook) === 'prompt' && sameMatcher.some(g => g.hooks.some(h => isPlainObject(h) && hookType(h) === 'prompt'))) {
          report.notes.push(`hooks.${event}${matcher ? ` (${matcher})` : ''}: kept your existing prompt hook; superkit's prompt hook was not added`);
          continue;
        }
        missing.push(clone(hook));
      }
      if (missing.length === 0) continue;
      if (sameMatcher.length > 0) {
        sameMatcher[0].hooks.push(...missing);
      } else {
        existingGroups.push({ ...clone(group), hooks: missing });
      }
      report.hooksAdded += missing.length;
    }
  }
}

function addMissingKeys(target, source, path, report) {
  for (const [key, value] of Object.entries(source)) {
    if (!(key in target)) {
      target[key] = clone(value);
      report.keysAdded.push(path ? `${path}.${key}` : key);
    } else if (isPlainObject(target[key]) && isPlainObject(value)) {
      addMissingKeys(target[key], value, path ? `${path}.${key}` : key, report);
    }
  }
}

export function mergeSettings(existing, generated, options = {}) {
  const settings = clone(existing);
  const report = { hooksAdded: 0, keysAdded: [], notes: [] };

  for (const [key, value] of Object.entries(generated)) {
    if (!(key in settings)) {
      settings[key] = clone(value);
      report.keysAdded.push(key);
      continue;
    }
    if (key === 'hooks') {
      if (isPlainObject(settings.hooks) && isPlainObject(value)) mergeHooks(settings.hooks, value, report);
      else report.notes.push('hooks has an unexpected shape — superkit hooks were not merged');
      continue;
    }
    if (key === 'permissions') {
      const ours = isPlainObject(value) && Array.isArray(value.deny) ? value.deny : [];
      const theirs = isPlainObject(settings.permissions) && Array.isArray(settings.permissions.deny) ? settings.permissions.deny : [];
      const absent = ours.filter(rule => !theirs.includes(rule));
      if (absent.length > 0) {
        report.notes.push(`kept your permissions unchanged; ${absent.length} superkit default deny rule(s) not added (see packages/core/settings.json)`);
      }
      continue;
    }
    if (isPlainObject(settings[key]) && isPlainObject(value)) {
      addMissingKeys(settings[key], value, key, report);
    }
    // Scalars/arrays the user already set (e.g. statusLine) are kept as-is.
  }

  const stale = staleStackHookNote(settings, options.stackHookFiles || []);
  if (stale) report.notes.push(stale);

  return { settings, report };
}

function enabledPluginNames(settings) {
  if (!isPlainObject(settings.enabledPlugins)) return [];
  return Object.keys(settings.enabledPlugins).filter(k => settings.enabledPlugins[k] === true);
}

function profileOf(settings) {
  return isPlainObject(settings.env) && typeof settings.env[PROFILE_ENV] === 'string' ? settings.env[PROFILE_ENV] : undefined;
}

// Timestamped, never-overwritten backup beside the original (same ISO-stamp
// convention as the Codex installer's .codex/.superkit-backups/<ts>-*/).
function writeBackup(destPath, raw) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (let i = 0; i < 100; i++) {
    const candidate = `${destPath}.bak-${stamp}${i ? `-${i}` : ''}`;
    try {
      writeFileSync(candidate, raw, { flag: 'wx' });
      return candidate;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
  throw new Error(`could not create a unique backup for ${basename(destPath)}`);
}

// writeSettings → { action, enabledPlugins, pluginCount, stackHookCount, profile,
//                   requestedProfile, backupPath?, hooksAdded?, keysAdded?, notes, error? }
//   action: 'written'   — fresh/overwrite (or merge with no existing file)
//           'merged'    — merge: existing file kept as base, superkit additions written, backup made
//           'unchanged' — merge: nothing to add, file not rewritten
//           'invalid'   — merge: existing file is not a JSON object; left untouched
export function writeSettings(baseSettingsPath, destPath, packagesDir, stacks, optionalPlugins, options = {}) {
  const { mode = 'fresh', profile } = options;
  const base = JSON.parse(readFileSync(baseSettingsPath, 'utf8'));
  const stackHooks = collectStackHooks(packagesDir, stacks);
  const generated = buildSettings(base, stackHooks, optionalPlugins, { profile });
  const common = { stackHookCount: stackHooks.length, requestedProfile: profile, notes: [] };

  if (mode !== 'merge' || !existsSync(destPath)) {
    writeFileSync(destPath, JSON.stringify(generated, null, 2) + '\n');
    return { ...common, action: 'written', enabledPlugins: enabledPluginNames(generated), pluginCount: enabledPluginNames(generated).length, profile: profileOf(generated) };
  }

  const raw = readFileSync(destPath, 'utf8');
  let existing;
  try {
    existing = JSON.parse(raw);
  } catch (err) {
    return { ...common, action: 'invalid', error: err.message, enabledPlugins: [], pluginCount: 0, profile: undefined };
  }
  if (!isPlainObject(existing)) {
    return { ...common, action: 'invalid', error: 'top-level value is not a JSON object', enabledPlugins: [], pluginCount: 0, profile: undefined };
  }

  const { settings, report } = mergeSettings(existing, generated, {
    stackHookFiles: collectStackHooks(packagesDir, knownStacks(packagesDir))
  });
  const result = {
    ...common,
    notes: report.notes,
    hooksAdded: report.hooksAdded,
    keysAdded: report.keysAdded,
    enabledPlugins: enabledPluginNames(settings),
    pluginCount: enabledPluginNames(settings).length,
    profile: profileOf(settings)
  };
  if (JSON.stringify(settings) === JSON.stringify(existing)) {
    return { ...result, action: 'unchanged' };
  }
  const backupPath = writeBackup(destPath, raw);
  writeFileSync(destPath, JSON.stringify(settings, null, 2) + '\n');
  return { ...result, action: 'merged', backupPath };
}
