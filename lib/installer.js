import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync, readFileSync, chmodSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { info, warn, fail, bold, copyFile, copyDir, copySkills, countFiles, countSkills, isInsideGitRepo, getGitRoot, commandExists } from './utils.js';
import { confirm, select, multiConfirm, closeRL } from './prompts.js';
import { writeSettings } from './settings-builder.js';
import { checkAndInstallSuperpowers } from './superpowers.js';
import { scaffoldDocs } from './docs-scaffold.js';
import { installCodex } from './codex.js';
import { validate } from './validator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = join(__dirname, '..', 'packages');

export async function install(opts) {
  const version = opts.version;
  const useDefaults = opts.defaults;

  console.log('');
  console.log(`🚀 claude-code-superkit v${version}`);
  console.log('');

  // ── Prerequisites ────────────────────────────────────────
  if (!commandExists('git')) {
    fail('git is required but not found. Install git first.');
  }

  if (!commandExists('claude')) {
    warn('Claude Code CLI not found. Install: npm install -g @anthropic-ai/claude-code');
    warn('Superkit requires Claude Code to function. Continuing setup anyway...');
  }

  if (!isInsideGitRepo()) {
    fail('Not inside a git repository. Run from your project root: cd /path/to/your-project && git init');
  }

  const projectDir = getGitRoot();
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
      { label: 'Rust?        [y/N]', value: 'rust' }
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
  let profile;
  if (opts.profile) {
    profile = opts.profile;
  } else {
    profile = await select('[3/4] Select hook profile:', [
      { key: 'f', label: 'fast     — minimal checks, maximum speed', value: 'fast' },
      { key: 's', label: 'standard — balanced (default)', value: 'standard' },
      { key: 'x', label: 'strict   — everything including vet/check on each edit', value: 'strict' }
    ], 'standard', useDefaults);
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

  // Core agents
  const agentCount = copyDir(
    join(PACKAGES_DIR, 'core', 'agents'),
    join(claudeDir, 'agents'),
    mode, '.md'
  );
  info(`Copied ${agentCount} agents → .claude/agents/`);

  // Core commands
  const cmdCount = copyDir(
    join(PACKAGES_DIR, 'core', 'commands'),
    join(claudeDir, 'commands'),
    mode, '.md'
  );
  info(`Copied ${cmdCount} commands → .claude/commands/`);

  // Core hooks
  const hooksDir = join(claudeDir, 'scripts', 'hooks');
  mkdirSync(hooksDir, { recursive: true });
  let hookCount = 0;
  const coreHooksDir = join(PACKAGES_DIR, 'core', 'hooks');
  if (existsSync(coreHooksDir)) {
    for (const file of readdirSync(coreHooksDir)) {
      if (!file.endsWith('.sh')) continue;
      if (copyFile(join(coreHooksDir, file), join(hooksDir, file), mode)) hookCount++;
    }
  }

  // Core rules
  copyDir(join(PACKAGES_DIR, 'core', 'rules'), join(claudeDir, 'rules'), mode, '.md');

  // Core skills
  copySkills(join(PACKAGES_DIR, 'core', 'skills'), join(claudeDir, 'skills'), mode);

  // Stack agents
  let stackAgentCount = 0;
  for (const stack of stacks) {
    const stackAgentDir = join(PACKAGES_DIR, 'stack-agents', stack);
    if (existsSync(stackAgentDir)) {
      stackAgentCount += copyDir(stackAgentDir, join(claudeDir, 'agents'), mode, '.md');
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

  const totalHooks = hookCount + stackHookCount;
  info(`Copied ${totalHooks} hooks → .claude/scripts/hooks/ (${hookCount} core + ${stackHookCount} stack)`);

  // Extras
  let extraCount = 0;
  for (const extra of extras) {
    const extraFile = join(PACKAGES_DIR, 'extras', `${extra}.md`);
    if (existsSync(extraFile)) {
      if (copyFile(extraFile, join(claudeDir, 'agents', `${extra}.md`), mode)) extraCount++;
    }
  }
  if (extraCount > 0) info(`Copied ${extraCount} extras → .claude/agents/`);
  if (stackAgentCount > 0) info(`Copied ${stackAgentCount} stack agents → .claude/agents/`);

  // Make hooks executable (Unix only)
  if (process.platform !== 'win32' && existsSync(hooksDir)) {
    for (const file of readdirSync(hooksDir)) {
      if (!file.endsWith('.sh')) continue;
      try {
        chmodSync(join(hooksDir, file), 0o755);
      } catch { /* skip */ }
    }
  }

  // ── Build settings.json ──────────────────────────────────
  const settingsResult = writeSettings(
    join(PACKAGES_DIR, 'core', 'settings.json'),
    join(claudeDir, 'settings.json'),
    PACKAGES_DIR,
    stacks,
    optionalPlugins
  );
  info(`Built settings.json with ${profile} profile hooks + ${settingsResult.pluginCount} plugins`);

  // ── CLAUDE.md template ──────────────────────────────────
  const claudeMdDst = join(projectDir, 'CLAUDE.md');
  if (!existsSync(claudeMdDst) || mode !== 'merge') {
    copyFile(join(PACKAGES_DIR, 'core', 'CLAUDE.md'), claudeMdDst, 'fresh');
    info('Created CLAUDE.md template');
  } else {
    warn('CLAUDE.md already exists — skipped (merge mode)');
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
    codexSkillCount = installCodex(projectDir, PACKAGES_DIR, mode);
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
  const metaPath = join(claudeDir, '.superkit-meta');
  const scriptDir = join(__dirname, '..');
  const metaContent = [
    `SUPERKIT_SOURCE="${scriptDir}"`,
    `SUPERKIT_VERSION="${version}"`,
    `SUPERKIT_STACKS="${stacks.join(' ')}"`,
    `SUPERKIT_EXTRAS="${extras.join(' ')}"`,
    `SUPERKIT_PROFILE="${profile}"`,
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
  console.log(`    Commands: ${cmdCount}`);
  console.log(`    Hooks:    ${totalHooks} + Stop prompt`);
  console.log('    Rules:    6');
  console.log('    Skills:   4');
  console.log(`    Plugins:  ${settingsResult.pluginCount}`);
  console.log(`    Profile:  ${profile}`);

  if (codexInstalled) {
    console.log('');
    console.log('  Codex CLI:');
    console.log(`    Skills:   ${codexSkillCount} (copied to .codex/skills/)`);
    console.log('    Model:    gpt-5.4 (extra_high reasoning)');
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
  console.log('  ⚠ Plugins are ENABLED in settings.json but may need to be');
  console.log('    installed first. Open Claude Code → /plugins → install:');

  const allPlugins = ['superpowers', 'github', 'context7', 'code-review', ...optionalPlugins];
  console.log(`    ${allPlugins.join(', ')}`);
  console.log('');

  closeRL();
}
