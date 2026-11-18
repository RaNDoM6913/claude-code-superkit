import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync, readFileSync, chmodSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { info, warn, fail, bold, copyFile, copyDir, copySkills, countFiles, countSkills, isInsideGitRepo, getGitRoot, commandExists, releasedBlobs, knownStacks, knownExtras, invalidNamesError, SELF_CONTAINED_PACKAGES } from './utils.js';
import { confirm, select, multiConfirm, closeRL } from './prompts.js';
import { writeSettings, PROFILE_ENV, VALID_PROFILES } from './settings-builder.js';
import { checkAndInstallSuperpowers } from './superpowers.js';
import { scaffoldDocs } from './docs-scaffold.js';
import { installCodex } from './codex.js';
import { validate } from './validator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = join(__dirname, '..', 'packages');

// ── Internal-file manifest (single source of truth) ──────────────────────
// packages/core/INTERNAL-FILES lists repo-only files that must NEVER ship into
// a consumer's .claude/. We derive the per-category skip lists from it so this
// installer, superkit-counts-verify.sh, and superkit-update.sh can never drift.
// Returns { hooks: [...basenames], rules: [...basenames] } keyed by each entry's
// dirname. FALLBACK: if the manifest is missing/unreadable/empty we return the
// previous hard-coded values — a broken installer is worse than a stale list.
// The literals below live ONLY inside this clearly-marked fallback.
function readInternalManifest() {
  const FALLBACK = { hooks: ['superkit-counts-verify.sh', 'verify-hooks.sh'], rules: ['superkit-integrity.md'] }; // FALLBACK — sole hard-coded copy
  try {
    const raw = readFileSync(join(PACKAGES_DIR, 'core', 'INTERNAL-FILES'), 'utf8');
    const hooks = [];
    const rules = [];
    for (const line of raw.split('\n')) {
      const entry = line.trim();
      if (!entry || entry.startsWith('#')) continue;
      const dir = dirname(entry);
      const base = basename(entry);
      if (dir === 'hooks') hooks.push(base);
      else if (dir === 'rules') rules.push(base);
    }
    if (hooks.length === 0 && rules.length === 0) return FALLBACK; // FALLBACK — empty/garbled manifest
    return { hooks, rules };
  } catch {
    return FALLBACK; // FALLBACK — manifest missing/unreadable
  }
}

// ── Stack / extra name validation ────────────────────────────────────────
// Names reach file paths and .claude/.superkit-meta, so only plain names of
// packages that exist are accepted (see NAME_PATTERN in utils.js).
export function selectionError({ stacks = [], extras = [] }) {
  return invalidNamesError('stack', stacks, knownStacks(PACKAGES_DIR))
    || invalidNamesError('extra', extras, knownExtras(PACKAGES_DIR));
}

// ── ui-reviewer: exactly one package-owned variant ───────────────────────
// core/agents/ui-reviewer.md and frontend-ui/agents/ui-reviewer.md install to
// the same .claude/agents/ui-reviewer.md. The variant is chosen BEFORE copying
// (frontend-ui selected → the umbrella), so copy order never decides it. In
// merge mode an existing file changes only when it is a pristine superkit copy
// (byte-identical to a variant's current file or to its blob at a recent
// released tag) AND the change is an upgrade or a refresh:
//   • pristine older copy of the selected variant → refreshed;
//   • pristine core while the umbrella is selected → upgraded to the umbrella;
//   • pristine umbrella while core is selected → KEPT (never downgraded just
//     because Frontend UI was not selected on this run);
//   • anything else (customised) → kept and reported as a conflict.
// superkit-update.sh applies the same policy.
const UI_REVIEWER = 'ui-reviewer.md';
const UI_VARIANTS = {
  core: { key: 'core', label: 'core', rel: 'packages/core/agents/ui-reviewer.md', src: join(PACKAGES_DIR, 'core', 'agents', UI_REVIEWER) },
  umbrella: { key: 'umbrella', label: 'frontend-ui umbrella', rel: 'packages/frontend-ui/agents/ui-reviewer.md', src: join(PACKAGES_DIR, 'frontend-ui', 'agents', UI_REVIEWER) }
};

function selectUiReviewer(stacks) {
  if (stacks.includes('frontend-ui') && existsSync(UI_VARIANTS.umbrella.src)) return UI_VARIANTS.umbrella;
  return existsSync(UI_VARIANTS.core.src) ? UI_VARIANTS.core : null;
}

// Pure merge-mode decision (exported for tests).
//   current  — Buffer of the existing file
//   selected — 'core' | 'umbrella'
//   isPristine(variantKey) → boolean: current equals that variant's current
//                            file or one of its released-tag blobs
// → 'current' | 'refresh' | 'upgrade' | 'keep-umbrella' | 'conflict'
export function decideUiReviewerMerge(current, selected, selectedBytes, isPristine) {
  if (current.equals(selectedBytes)) return 'current';
  if (isPristine(selected)) return 'refresh';
  if (selected === 'umbrella' && isPristine('core')) return 'upgrade';
  if (selected === 'core' && isPristine('umbrella')) return 'keep-umbrella';
  return 'conflict';
}

// → 'created' | 'refresh' | 'upgrade' | 'current' | 'keep-umbrella' | 'conflict' | 'none'
function installUiReviewer(selected, dst, mode) {
  if (!selected) return 'none';
  if (mode !== 'merge' || !existsSync(dst)) {
    copyFile(selected.src, dst, 'fresh');
    return 'created';
  }
  const current = readFileSync(dst);
  const released = {};
  const isPristine = key => {
    const v = UI_VARIANTS[key];
    if (existsSync(v.src) && current.equals(readFileSync(v.src))) return true;
    if (!(key in released)) released[key] = releasedBlobs(join(PACKAGES_DIR, '..'), [v.rel]);
    return released[key].some(blob => current.equals(blob));
  };
  const decision = decideUiReviewerMerge(current, selected.key, readFileSync(selected.src), isPristine);
  if (decision === 'refresh' || decision === 'upgrade') copyFile(selected.src, dst, 'fresh');
  return decision;
}

export async function install(opts) {
  const version = opts.version;
  const useDefaults = opts.defaults;

  console.log('');
  console.log(`🚀 claude-code-superkit v${version}`);
  console.log('');

  // Validate flag-supplied names before anything touches the filesystem.
  const flagError = selectionError({ stacks: opts.stacks || [], extras: opts.extras || [] });
  if (flagError) fail(flagError);

  // ── Prerequisites ────────────────────────────────────────
  if (!commandExists('git')) {
    fail('git is required but not found. Install git first.');
  }

  if (!isInsideGitRepo()) {
    fail('Not inside a git repository. Run from your project root: cd /path/to/your-project && git init');
  }

  const projectDir = getGitRoot();
  if (opts.codexOnly) {
    installCodex(projectDir, PACKAGES_DIR);
    info('Codex installation complete!');
    console.log('  Start Codex in your project and review AGENTS.md and .codex/config.toml.');
    console.log('  Re-run this command to update pristine Superkit skills; review any preserved conflicts.');
    closeRL();
    return;
  }

  if (!commandExists('claude')) {
    warn('Claude Code CLI not found. Install: npm install -g @anthropic-ai/claude-code');
    warn('Superkit requires Claude Code to function. Continuing setup anyway...');
  }

  const claudeDir = join(projectDir, '.claude');

  // ── Superpowers ──────────────────────────────────────────
  if (!opts.noSuperpowers) {
    await checkAndInstallSuperpowers(useDefaults);
  }

  // ── Handle existing .claude/ ─────────────────────────────
  let mode;
  if (existsSync(claudeDir)) {
    if (useDefaults) {
      mode = 'merge';
    } else {
      console.log('');
      warn('Existing .claude/ directory found.');
      mode = await select('', [
        { key: 'm', label: 'Merge — add new files, skip existing', value: 'merge' },
        { key: 'o', label: 'Overwrite — backup to .claude.bak/ and replace', value: 'overwrite' },
        { key: 'a', label: 'Abort', value: 'abort' }
      ], 'merge', false);
    }

    if (mode === 'abort') {
      console.log('Aborted.');
      closeRL();
      return;
    }

    if (mode === 'overwrite') {
      const bakDir = claudeDir + '.bak';
      if (existsSync(bakDir)) rmSync(bakDir, { recursive: true });
      renameSync(claudeDir, bakDir);
      info('Backed up to .claude.bak/');
    }
  } else {
    mode = 'fresh';
  }

  // ── [1/4] Stack Selection ────────────────────────────────
  let stacks;
  if (opts.stacks) {
    stacks = opts.stacks;
  } else {
    stacks = await multiConfirm('[1/4] Select your stacks:', [
      { label: 'Go?         [y/N]', value: 'go' },
      { label: 'TypeScript?  [y/N]', value: 'typescript' },
      { label: 'Python?      [y/N]', value: 'python' },
      { label: 'Rust?        [y/N]', value: 'rust' },
      { label: 'Frontend 3D? [y/N]', value: 'frontend-3d' },
      { label: 'Frontend UI? [y/N]', value: 'frontend-ui' }
    ], useDefaults);
  }

  // ── [2/4] Extras Selection ───────────────────────────────
  let extras;
  if (opts.extras) {
    extras = opts.extras;
  } else {
    extras = await multiConfirm('[2/4] Select extras:', [
      { label: 'Bot reviewer (Telegram/Discord/Slack)?  [y/N]', value: 'bot-reviewer' },
      { label: 'Design system reviewer?                  [y/N]', value: 'design-system-reviewer' }
    ], useDefaults);
  }

  // ── [3/4] Profile Selection ──────────────────────────────
  // The choice is pinned in settings.json env.CLAUDE_HOOK_PROFILE, which Claude
  // Code applies over the shell. Default to a valid value the user already
  // exports (older docs said to set it in the shell), else standard.
  const shellProfile = VALID_PROFILES.includes(process.env[PROFILE_ENV]) ? process.env[PROFILE_ENV] : undefined;
  let profile;
  if (opts.profile) {
    profile = opts.profile;
  } else {
    profile = await select('[3/4] Select hook profile:', [
      { key: 'f', label: 'fast     — minimal checks, maximum speed', value: 'fast' },
      { key: 's', label: 'standard — balanced', value: 'standard' },
      { key: 'x', label: 'strict   — everything including vet/check on each edit', value: 'strict' }
    ], shellProfile || 'standard', useDefaults);
  }

  // ── [4/4] Plugin Selection ───────────────────────────────
  console.log('');
  console.log('[4/4] Claude Code plugins:');
  console.log('');
  console.log('  Base plugins (always enabled):');
  console.log('    ✓ superpowers  — TDD, brainstorming, debugging, verification');
  console.log('    ✓ github       — PR comments, issue tracking (/review --comment)');
  console.log('    ✓ context7     — library documentation lookup');
  console.log('    ✓ code-review  — enhanced code review workflows');
  console.log('');
  console.log('  Optional plugins:');

  let optionalPlugins;
  if (opts.plugins) {
    optionalPlugins = opts.plugins;
  } else {
    const pluginItems = [
      { label: 'code-simplifier (code cleanup/refactoring)?    [y/N]', value: 'code-simplifier' },
      { label: 'playwright (browser automation, e2e tests)?    [y/N]', value: 'playwright' }
    ];

    if (stacks.includes('typescript')) {
      pluginItems.push({
        label: 'frontend-design (UI/design assistance)?       [Y/n]',
        value: 'frontend-design',
        defaultYes: true
      });
    } else {
      pluginItems.push({
        label: 'frontend-design (UI/design assistance)?       [y/N]',
        value: 'frontend-design'
      });
    }

    optionalPlugins = await multiConfirm('', pluginItems, useDefaults);
  }

  // ── Install ──────────────────────────────────────────────
  console.log('');
  console.log('Installing...');

  // Core agents (ui-reviewer.md is installed separately — see UI_VARIANTS)
  const uiSelected = selectUiReviewer(stacks);
  let agentCount = copyDir(
    join(PACKAGES_DIR, 'core', 'agents'),
    join(claudeDir, 'agents'),
    mode, '.md', [UI_REVIEWER]
  );
  let stackAgentCount = 0;
  const uiDst = join(claudeDir, 'agents', UI_REVIEWER);
  const uiResult = installUiReviewer(uiSelected, uiDst, mode);
  if (uiResult === 'created' || uiResult === 'refresh' || uiResult === 'upgrade') {
    if (uiSelected === UI_VARIANTS.core) agentCount++;
    else stackAgentCount++;
  }
  info(`Copied ${agentCount} agents → .claude/agents/`);
  if (uiResult === 'refresh') {
    info(`Refreshed pristine superkit .claude/agents/${UI_REVIEWER} to the current ${uiSelected.label} variant`);
  } else if (uiResult === 'upgrade') {
    info(`Upgraded pristine core .claude/agents/${UI_REVIEWER} to the frontend-ui umbrella variant`);
  } else if (uiResult === 'keep-umbrella') {
    info(`Kept the frontend-ui umbrella .claude/agents/${UI_REVIEWER} — Frontend UI was not selected on this run, and merge never downgrades it to core`);
  } else if (uiResult === 'conflict') {
    warn(`ui-reviewer conflict: .claude/agents/${UI_REVIEWER} is locally customised — kept it unchanged.`);
    warn(`  The selected ${uiSelected.label} variant was NOT installed; compare it with ${uiSelected.rel} in the superkit source and merge by hand.`);
  }

  // Core commands
  const cmdCount = copyDir(
    join(PACKAGES_DIR, 'core', 'commands'),
    join(claudeDir, 'commands'),
    mode, '.md'
  );
  info(`Copied ${cmdCount} commands → .claude/commands/`);

  // Core hooks + rules: exclude superkit-internal files (repo-only tooling that
  // never ships). Both skip lists derive from the packages/core/INTERNAL-FILES
  // manifest so this installer stays in sync with the other two consumers.
  const { hooks: SUPERKIT_INTERNAL_HOOKS, rules: SUPERKIT_INTERNAL_RULES } = readInternalManifest();
  const hooksDir = join(claudeDir, 'scripts', 'hooks');
  mkdirSync(hooksDir, { recursive: true });
  let hookCount = 0;
  const coreHooksDir = join(PACKAGES_DIR, 'core', 'hooks');
  if (existsSync(coreHooksDir)) {
    for (const file of readdirSync(coreHooksDir)) {
      if (!file.endsWith('.sh') && !file.endsWith('.py')) continue;
      if (SUPERKIT_INTERNAL_HOOKS.includes(file)) continue;
      if (copyFile(join(coreHooksDir, file), join(hooksDir, file), mode)) hookCount++;
    }
  }

  // Shared hook library (profile.sh — unified profile + disable helper)
  const coreHookLibDir = join(coreHooksDir, 'lib');
  if (existsSync(coreHookLibDir)) {
    const destLibDir = join(hooksDir, 'lib');
    mkdirSync(destLibDir, { recursive: true });
    for (const file of readdirSync(coreHookLibDir)) {
      if (!file.endsWith('.sh')) continue;
      copyFile(join(coreHookLibDir, file), join(destLibDir, file), mode);
    }
  }

  // Core rules (exclude superkit-internal rules that reference packages/core/;
  // SUPERKIT_INTERNAL_RULES was derived from the manifest above)
  const coreRuleCount = copyDir(join(PACKAGES_DIR, 'core', 'rules'), join(claudeDir, 'rules'), mode, '.md', SUPERKIT_INTERNAL_RULES);

  // Core skills
  const coreSkillCount = copySkills(join(PACKAGES_DIR, 'core', 'skills'), join(claudeDir, 'skills'), mode);

  // Stack agents
  for (const stack of stacks) {
    const stackAgentDir = join(PACKAGES_DIR, 'stack-agents', stack);
    if (existsSync(stackAgentDir)) {
      stackAgentCount += copyDir(stackAgentDir, join(claudeDir, 'agents'), mode, '.md');
      // Copy references/ subdirectory if present (on-demand knowledge docs for agents)
      const refsDir = join(stackAgentDir, 'references');
      if (existsSync(refsDir)) {
        const destRefsDir = join(claudeDir, 'agents', 'references');
        mkdirSync(destRefsDir, { recursive: true });
        let refCount = 0;
        for (const refFile of readdirSync(refsDir)) {
          if (!refFile.endsWith('.md')) continue;
          if (copyFile(join(refsDir, refFile), join(destRefsDir, refFile), mode)) refCount++;
        }
        if (refCount > 0) info(`  Copied ${refCount} reference docs → .claude/agents/references/`);
      }
    }
  }

  // Stack hooks
  let stackHookCount = 0;
  for (const stack of stacks) {
    const stackHookDir = join(PACKAGES_DIR, 'stack-hooks', stack);
    if (existsSync(stackHookDir)) {
      for (const file of readdirSync(stackHookDir)) {
        if (!file.endsWith('.sh')) continue;
        if (copyFile(join(stackHookDir, file), join(hooksDir, file), mode)) stackHookCount++;
      }
    }
  }

  // Note: totalHooks computed after self-contained packages to include all hooks

  // Stack rules
  let stackRuleCount = 0;
  for (const stack of stacks) {
    const stackRuleDir = join(PACKAGES_DIR, 'stack-rules', stack);
    if (existsSync(stackRuleDir)) {
      stackRuleCount += copyDir(stackRuleDir, join(claudeDir, 'rules'), mode, '.md');
    }
  }
  if (stackRuleCount > 0) info(`Copied ${stackRuleCount} stack rules → .claude/rules/`);

  // Self-contained packages (frontend-3d / frontend-ui have agents, hooks, skills, rules, commands in one dir)
  let packageSkillCount = 0;
  let packageCmdCount = 0;
  for (const stack of stacks) {
    if (!SELF_CONTAINED_PACKAGES.includes(stack)) continue;
    const pkgDir = join(PACKAGES_DIR, stack);
    if (!existsSync(pkgDir)) continue;

    // Package agents (ui-reviewer.md was already chosen and installed above)
    const pkgAgentDir = join(pkgDir, 'agents');
    if (existsSync(pkgAgentDir)) {
      stackAgentCount += copyDir(pkgAgentDir, join(claudeDir, 'agents'), mode, '.md', [UI_REVIEWER]);
    }

    // Package hooks
    const pkgHookDir = join(pkgDir, 'hooks');
    if (existsSync(pkgHookDir)) {
      for (const file of readdirSync(pkgHookDir)) {
        if (!file.endsWith('.sh')) continue;
        if (copyFile(join(pkgHookDir, file), join(hooksDir, file), mode)) stackHookCount++;
      }
    }

    // Package skills
    const pkgSkillDir = join(pkgDir, 'skills');
    if (existsSync(pkgSkillDir)) {
      packageSkillCount += copySkills(pkgSkillDir, join(claudeDir, 'skills'), mode);
    }

    // Package rules
    const pkgRuleDir = join(pkgDir, 'rules');
    if (existsSync(pkgRuleDir)) {
      stackRuleCount += copyDir(pkgRuleDir, join(claudeDir, 'rules'), mode, '.md');
    }

    // Package commands
    const pkgCmdDir = join(pkgDir, 'commands');
    if (existsSync(pkgCmdDir)) {
      packageCmdCount += copyDir(pkgCmdDir, join(claudeDir, 'commands'), mode, '.md');
    }
  }
  if (packageSkillCount > 0) info(`Copied ${packageSkillCount} package skills → .claude/skills/`);
  if (packageCmdCount > 0) info(`Copied ${packageCmdCount} package commands → .claude/commands/`);

  // Hook count summary (after all sources: core + stack + self-contained)
  const totalHooks = hookCount + stackHookCount;
  info(`Copied ${totalHooks} hooks → .claude/scripts/hooks/ (${hookCount} core + ${stackHookCount} stack)`);

  // Extras — a flat packages/extras/<name>.md agent, or a bundled
  // packages/extras/<name>/agent.md whose helper script (scan.sh) and its
  // patterns/ go to .claude/scripts/<name>/ (red-blue-auditor's Phase 3 globs
  // **/red-blue-auditor/scan.sh and reads patterns/ beside it).
  let extraCount = 0;
  for (const extra of extras) {
    const extraFile = join(PACKAGES_DIR, 'extras', `${extra}.md`);
    const bundleDir = join(PACKAGES_DIR, 'extras', extra);
    const bundleAgent = join(bundleDir, 'agent.md');
    if (existsSync(extraFile)) {
      if (copyFile(extraFile, join(claudeDir, 'agents', `${extra}.md`), mode)) extraCount++;
    } else if (existsSync(bundleAgent)) {
      if (copyFile(bundleAgent, join(claudeDir, 'agents', `${extra}.md`), mode)) extraCount++;
      const scriptsDst = join(claudeDir, 'scripts', extra);
      const scanSrc = join(bundleDir, 'scan.sh');
      if (existsSync(scanSrc)) {
        copyFile(scanSrc, join(scriptsDst, 'scan.sh'), mode);
        if (process.platform !== 'win32') {
          try { chmodSync(join(scriptsDst, 'scan.sh'), 0o755); } catch { /* skip */ }
        }
      }
      copyDir(join(bundleDir, 'patterns'), join(scriptsDst, 'patterns'), mode, '.txt');
      if (existsSync(scanSrc)) info(`Copied ${extra} scan.sh + patterns/ → .claude/scripts/${extra}/`);
    } else {
      warn(`Unknown extra "${extra}" — nothing copied`);
    }
  }
  if (extraCount > 0) info(`Copied ${extraCount} extras → .claude/agents/`);
  if (stackAgentCount > 0) info(`Copied ${stackAgentCount} stack agents → .claude/agents/`);

  // Make hooks executable (Unix only)
  if (process.platform !== 'win32' && existsSync(hooksDir)) {
    for (const file of readdirSync(hooksDir)) {
      if (!file.endsWith('.sh') && !file.endsWith('.py')) continue;
      try {
        chmodSync(join(hooksDir, file), 0o755);
      } catch { /* skip */ }
    }
    // Shared library helpers under .claude/scripts/hooks/lib/
    const libDir = join(hooksDir, 'lib');
    if (existsSync(libDir)) {
      for (const file of readdirSync(libDir)) {
        if (!file.endsWith('.sh')) continue;
        try {
          chmodSync(join(libDir, file), 0o755);
        } catch { /* skip */ }
      }
    }
  }

  // Statusline helper
  const statuslineSrc = join(PACKAGES_DIR, 'core', 'helpers', 'statusline.cjs');
  const scriptsDir = join(claudeDir, 'scripts');
  mkdirSync(scriptsDir, { recursive: true });
  if (existsSync(statuslineSrc)) {
    copyFile(statuslineSrc, join(scriptsDir, 'statusline.cjs'), mode);
    info('Copied statusline → .claude/scripts/statusline.cjs');
  }

  // ── Build settings.json ──────────────────────────────────
  // fresh/overwrite: built from package defaults. merge: the existing file is
  // the base — superkit only adds missing hooks/plugins/keys, keeps every user
  // value, and backs the old file up first (lib/settings-builder.js).
  const settingsResult = writeSettings(
    join(PACKAGES_DIR, 'core', 'settings.json'),
    join(claudeDir, 'settings.json'),
    PACKAGES_DIR,
    stacks,
    optionalPlugins,
    { mode, profile }
  );
  const pluginsAdded = (settingsResult.keysAdded || []).filter(k => k === 'enabledPlugins' || k.startsWith('enabledPlugins.')).length;
  switch (settingsResult.action) {
    case 'written':
      info(`Built settings.json with ${profile} profile (env.${PROFILE_ENV}) + ${settingsResult.pluginCount} plugins`);
      break;
    case 'merged':
      info(`Merged superkit wiring into existing settings.json — your keys kept; added ${settingsResult.hooksAdded} hook(s), ${pluginsAdded} plugin entr${pluginsAdded === 1 ? 'y' : 'ies'}`);
      info(`  Previous file backed up → ${relative(projectDir, settingsResult.backupPath)}`);
      break;
    case 'unchanged':
      info('settings.json already contains the superkit wiring — left unchanged');
      break;
    case 'invalid':
      warn(`Existing .claude/settings.json is not valid JSON (${settingsResult.error}) — left untouched.`);
      warn('  Superkit hooks, plugins and the hook profile were NOT applied. Fix the file and re-run, or merge packages/core/settings.json by hand.');
      break;
  }
  for (const note of settingsResult.notes) warn(`  settings.json: ${note}`);

  const effectiveProfile = settingsResult.profile;
  if (settingsResult.action === 'merged' || settingsResult.action === 'unchanged') {
    if (effectiveProfile === profile) {
      info(`Hook profile: ${profile} (env.${PROFILE_ENV} in settings.json)`);
    } else if (effectiveProfile === undefined) {
      warn(`settings.json "env" has an unexpected shape — env.${PROFILE_ENV} was not set; hooks fall back to their default (standard).`);
    } else {
      warn(`Kept your env.${PROFILE_ENV}=${effectiveProfile} in settings.json (requested: ${profile}). Edit .claude/settings.json to change it.`);
    }
  }
  if (shellProfile && effectiveProfile && shellProfile !== effectiveProfile) {
    warn(`Your shell exports ${PROFILE_ENV}=${shellProfile}, but Claude Code applies settings.json env over the shell: sessions here use ${effectiveProfile}.`);
    warn(`  For a personal override, set env.${PROFILE_ENV} in .claude/settings.local.json.`);
  }

  // ── CLAUDE.md template ──────────────────────────────────
  const claudeMdDst = join(projectDir, 'CLAUDE.md');
  if (!existsSync(claudeMdDst) || mode !== 'merge') {
    copyFile(join(PACKAGES_DIR, 'core', 'CLAUDE.md'), claudeMdDst, 'fresh');
    info('Created CLAUDE.md template');
  } else {
    warn('CLAUDE.md already exists — skipped (merge mode)');
  }

  // ── ADR template (unconditional, idempotent) ─────────────
  // dev.md Phase 2 and superkit-init.md reference docs-templates/adr-template.md
  // at the PROJECT root. Install it always — even when the docs scaffold below is
  // declined — so the nudge never dangles. NEVER overwrite an existing copy:
  // it's a doc template consumers legitimately edit.
  const adrSrc = join(PACKAGES_DIR, 'core', 'docs-templates', 'adr-template.md');
  const adrDst = join(projectDir, 'docs-templates', 'adr-template.md');
  if (existsSync(adrSrc) && !existsSync(adrDst)) {
    copyFile(adrSrc, adrDst, 'fresh');
    info('Copied ADR template → docs-templates/adr-template.md');
  }

  // ── Documentation scaffolding ────────────────────────────
  if (!opts.noDocs) {
    console.log('');
    console.log('  All agents use Phase 0 — they read docs/architecture/ before reviewing.');
    console.log('  Without these docs, agents work blind and produce less accurate reviews.');
    console.log('  This step creates architecture templates (fill TODOs later) and a project tree.');
    console.log('');

    const createDocs = await confirm('Initialize documentation structure? (recommended)', true, useDefaults);
    if (createDocs) {
      scaffoldDocs(projectDir, PACKAGES_DIR, mode);
    }
  }

  // ── Codex CLI ────────────────────────────────────────────
  let codexInstalled = false;
  let codexSkillCount = 0;
  console.log('');
  const installCodexFlag = opts.codex ?? await confirm('Also install for Codex CLI?', false, useDefaults);
  if (installCodexFlag) {
    codexSkillCount = installCodex(projectDir, PACKAGES_DIR);
    codexInstalled = true;
  }

  // ── Validation ───────────────────────────────────────────
  console.log('');
  const validationOk = validate(claudeDir, projectDir);
  console.log('');
  if (validationOk) {
    info('All validation checks passed');
  } else {
    warn('Some validation checks failed — review warnings above');
  }

  // ── Save superkit meta ───────────────────────────────────
  // The updater reads this file; never write a name that failed validation
  // (interactive selections are fixed lists, flags were checked at start).
  const metaError = selectionError({ stacks, extras });
  if (metaError) throw new Error(`refusing to write .claude/.superkit-meta: ${metaError}`);
  const metaPath = join(claudeDir, '.superkit-meta');
  const scriptDir = join(__dirname, '..');
  const metaContent = [
    `SUPERKIT_SOURCE="${scriptDir}"`,
    `SUPERKIT_VERSION="${version}"`,
    `SUPERKIT_STACKS="${stacks.join(' ')}"`,
    `SUPERKIT_EXTRAS="${extras.join(' ')}"`,
    `SUPERKIT_PROFILE="${VALID_PROFILES.includes(effectiveProfile) ? effectiveProfile : profile}"`,
    `SUPERKIT_INSTALLED="${new Date().toISOString()}"`,
    ''
  ].join('\n');
  writeFileSync(metaPath, metaContent);
  info('Saved superkit source path for auto-updates → .claude/.superkit-meta');

  // ── Summary ──────────────────────────────────────────────
  const totalAgents = agentCount + stackAgentCount + extraCount;
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  info('Installation complete!');
  console.log('');
  console.log('  Claude Code:');
  console.log(`    Agents:   ${totalAgents} (${agentCount} core + ${stackAgentCount} stack + ${extraCount} extras)`);
  console.log(`    Commands: ${cmdCount + packageCmdCount}`);
  console.log(`    Hooks:    ${totalHooks} + Stop prompt`);
  console.log(`    Rules:    ${coreRuleCount + stackRuleCount}`);
  console.log(`    Skills:   ${coreSkillCount + packageSkillCount}`);
  console.log(`    Plugins:  ${settingsResult.pluginCount}`);
  if (effectiveProfile) {
    console.log(`    Profile:  ${effectiveProfile} (settings.json env.${PROFILE_ENV})`);
  } else {
    console.log(`    Profile:  ${profile} requested — NOT applied (see the settings.json warnings above)`);
  }

  if (codexInstalled) {
    console.log('');
    console.log('  Codex CLI:');
    console.log(`    Skills:   ${codexSkillCount} (copied to .codex/skills/)`);
    console.log('    Template defaults: gpt-6.2-astra/high; subagent gpt-6.1-sol/medium');
    console.log('    Config:   .codex/config.toml');
    console.log('    Docs:     AGENTS.md');
  }

  console.log('');
  console.log('  Next steps:');
  console.log('    1. Run: claude');
  console.log('    2. Run: /superkit-init  ← intelligent project setup (auto-fills docs!)');
  console.log('    3. Install plugins: /plugins → install missing');
  console.log('    4. Try: /review or /audit');
  console.log('');
  console.log('  💡 /superkit-init scans your code and generates FILLED docs —');
  console.log('     no more manual TODO filling! Use --non-interactive for quick setup.');
  console.log('');
  if (settingsResult.enabledPlugins.length > 0) {
    console.log('  ⚠ Plugins are ENABLED in settings.json but may need to be');
    console.log('    installed first. Open Claude Code → /plugins → install:');
    const allPlugins = settingsResult.enabledPlugins.map(p => p.replace(/@claude-plugins-official$/, ''));
    console.log(`    ${allPlugins.join(', ')}`);
    console.log('');
  }

  closeRL();
}
