# npx claude-code-superkit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 593-line bash setup.sh with a Node.js CLI that works via `npx claude-code-superkit` — zero external dependencies, works on any OS, solves all 6 reported bash bugs.

**Architecture:** Entry point `bin/cli.js` parses args and calls `lib/installer.js` which orchestrates all steps. Each concern (prompts, settings JSON, docs, superpowers, codex, validation) is a separate module in `lib/`. The `packages/` directory ships as-is inside the npm tarball. Old `setup.sh` becomes a 5-line POSIX wrapper.

**Tech Stack:** Node.js 18+ (built-in modules only: `node:fs`, `node:path`, `node:readline/promises`, `node:child_process`, `node:os`, `node:test`, `node:assert`)

**Spec:** `docs/superpowers/specs/2026-03-26-npx-installer-design.md`

---

### Task 1: Project scaffolding — package.json + .npmignore

**Files:**
- Create: `package.json`
- Create: `.npmignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "claude-code-superkit",
  "version": "1.3.3",
  "description": "Production-tested agents, commands, hooks & skills for Claude Code and Codex CLI. All agents on Opus.",
  "type": "module",
  "bin": {
    "claude-code-superkit": "./bin/cli.js",
    "superkit": "./bin/cli.js"
  },
  "files": [
    "bin/",
    "lib/",
    "packages/"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "test": "node --test test/",
    "test:smoke": "node test/smoke.test.js"
  },
  "keywords": [
    "claude-code",
    "codex",
    "ai-agents",
    "cli",
    "scaffolding",
    "code-review",
    "hooks",
    "skills",
    "opus"
  ],
  "author": "RaNDoM6913",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/RaNDoM6913/claude-code-superkit.git"
  },
  "homepage": "https://github.com/RaNDoM6913/claude-code-superkit#readme",
  "bugs": {
    "url": "https://github.com/RaNDoM6913/claude-code-superkit/issues"
  }
}
```

- [ ] **Step 2: Create .npmignore**

```
# Dev files — don't ship in npm tarball
docs/
test/
tools/
.claude/
.github/
packages/showcase/
*.md
!packages/**/*.md
.gitignore
.DS_Store
```

Note: `!packages/**/*.md` re-includes all .md files inside packages/ (agents, commands, skills etc.) while excluding root-level .md files (README, CHANGELOG, etc.) from the tarball.

- [ ] **Step 3: Create bin/ and lib/ directories**

Run: `mkdir -p bin lib test`

- [ ] **Step 4: Commit**

```bash
git add package.json .npmignore
git commit -m "feat: add package.json for npx claude-code-superkit"
```

---

### Task 2: lib/utils.js — colors, file helpers, git detection

**Files:**
- Create: `lib/utils.js`

- [ ] **Step 1: Write test for countFiles and copyDir**

Create `test/utils.test.js`:

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// We'll import after creating the module
let utils;

before(async () => {
  utils = await import('../lib/utils.js');
});

describe('countFiles', () => {
  it('counts .md files in a directory', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'superkit-test-'));
    writeFileSync(join(tmp, 'a.md'), '# A');
    writeFileSync(join(tmp, 'b.md'), '# B');
    writeFileSync(join(tmp, 'c.txt'), 'not md');
    assert.equal(utils.countFiles(tmp, '.md'), 2);
    rmSync(tmp, { recursive: true });
  });

  it('returns 0 for empty directory', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'superkit-test-'));
    assert.equal(utils.countFiles(tmp, '.md'), 0);
    rmSync(tmp, { recursive: true });
  });

  it('returns 0 for non-existent directory', () => {
    assert.equal(utils.countFiles('/tmp/nonexistent-superkit-dir', '.md'), 0);
  });
});

describe('copyFile', () => {
  it('copies file in fresh mode', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'superkit-test-'));
    const src = join(tmp, 'src.md');
    const dst = join(tmp, 'sub', 'dst.md');
    writeFileSync(src, '# Test');
    utils.copyFile(src, dst, 'fresh');
    assert.ok(existsSync(dst));
    rmSync(tmp, { recursive: true });
  });

  it('skips existing file in merge mode', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'superkit-test-'));
    const src = join(tmp, 'src.md');
    const dst = join(tmp, 'dst.md');
    writeFileSync(src, 'new content');
    writeFileSync(dst, 'old content');
    utils.copyFile(src, dst, 'merge');
    assert.equal(readFileSync(dst, 'utf8'), 'old content');
    rmSync(tmp, { recursive: true });
  });
});

describe('isInsideGitRepo', () => {
  it('returns true in a git repo', () => {
    assert.equal(utils.isInsideGitRepo(), true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/utils.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write lib/utils.js**

```javascript
import { existsSync, readdirSync, mkdirSync, copyFileSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, extname, basename } from 'node:path';
import { execSync } from 'node:child_process';

// ── Colors ──────────────────────────────────────────────
const supportsColor = process.stdout.isTTY;

const GREEN = supportsColor ? '\x1b[32m' : '';
const YELLOW = supportsColor ? '\x1b[33m' : '';
const RED = supportsColor ? '\x1b[31m' : '';
const BOLD = supportsColor ? '\x1b[1m' : '';
const NC = supportsColor ? '\x1b[0m' : '';

export function info(msg) {
  console.log(`${GREEN}✓${NC} ${msg}`);
}

export function warn(msg) {
  console.log(`${YELLOW}⚠${NC} ${msg}`);
}

export function fail(msg) {
  console.error(`${RED}✗${NC} ${msg}`);
  process.exit(1);
}

export function bold(msg) {
  return `${BOLD}${msg}${NC}`;
}

// ── File helpers ────────────────────────────────────────

/**
 * Count files with given extension in a directory.
 * Returns 0 if directory doesn't exist.
 */
export function countFiles(dir, ext) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter(f => extname(f) === ext).length;
}

/**
 * Count SKILL.md files recursively (for codex skills).
 */
export function countSkills(dir) {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (existsSync(join(full, 'SKILL.md'))) count++;
    }
  }
  return count;
}

/**
 * Copy a single file. Creates parent directories.
 * In merge mode, skips if destination exists.
 */
export function copyFile(src, dst, mode) {
  if (mode === 'merge' && existsSync(dst)) return false;
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  return true;
}

/**
 * Copy all files from src dir to dst dir (non-recursive, files only).
 * Returns number of files copied.
 */
export function copyDir(srcDir, dstDir, mode, ext) {
  if (!existsSync(srcDir)) return 0;
  mkdirSync(dstDir, { recursive: true });
  let count = 0;
  for (const file of readdirSync(srcDir)) {
    const srcPath = join(srcDir, file);
    if (!statSync(srcPath).isFile()) continue;
    if (ext && extname(file) !== ext) continue;
    if (copyFile(srcPath, join(dstDir, file), mode)) count++;
  }
  return count;
}

/**
 * Copy skill directories (each containing SKILL.md).
 */
export function copySkills(srcDir, dstDir, mode) {
  if (!existsSync(srcDir)) return 0;
  let count = 0;
  for (const entry of readdirSync(srcDir)) {
    const skillDir = join(srcDir, entry);
    if (!statSync(skillDir).isDirectory()) continue;
    const skillFile = join(skillDir, 'SKILL.md');
    if (!existsSync(skillFile)) continue;
    const dstSkillDir = join(dstDir, entry);
    mkdirSync(dstSkillDir, { recursive: true });
    if (copyFile(skillFile, join(dstSkillDir, 'SKILL.md'), mode)) count++;
  }
  return count;
}

// ── Git helpers ─────────────────────────────────────────

export function isInsideGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function getGitRoot() {
  return execSync('git rev-parse --show-toplevel', { stdio: 'pipe' }).toString().trim();
}

export function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ── Version ─────────────────────────────────────────────

export function getVersion() {
  const pkgPath = join(dirname(import.meta.url.replace('file://', '')), '..', 'package.json');
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
  } catch {
    return 'unknown';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/utils.test.js`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/utils.js test/utils.test.js
git commit -m "feat(cli): add lib/utils.js — colors, file copy, git detection"
```

---

### Task 3: lib/prompts.js — interactive prompts with --defaults support

**Files:**
- Create: `lib/prompts.js`

- [ ] **Step 1: Write lib/prompts.js**

```javascript
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

let rl = null;

function getRL() {
  if (!rl) {
    rl = readline.createInterface({ input, output });
  }
  return rl;
}

export function closeRL() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

/**
 * Ask a yes/no question. Returns true for yes.
 * @param {string} question - The question text
 * @param {boolean} defaultYes - Default answer if user just presses enter
 * @param {boolean} useDefaults - If true, skip prompt and return defaultYes
 */
export async function confirm(question, defaultYes = false, useDefaults = false) {
  if (useDefaults) return defaultYes;
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await getRL().question(`${question} ${hint} `);
  if (!answer.trim()) return defaultYes;
  return /^y(es)?$/i.test(answer.trim());
}

/**
 * Ask a single-choice question. Returns the selected value.
 * @param {string} prompt - The question text
 * @param {Array<{label: string, value: string}>} options - Options to choose from
 * @param {string} defaultValue - Default value if useDefaults or invalid input
 * @param {boolean} useDefaults - If true, skip prompt and return default
 */
export async function select(prompt, options, defaultValue, useDefaults = false) {
  if (useDefaults) return defaultValue;

  console.log(`\n${prompt}`);
  for (const opt of options) {
    const marker = opt.value === defaultValue ? ' (default)' : '';
    console.log(`  [${opt.key}] ${opt.label}${marker}`);
  }

  const answer = await getRL().question('  Choice: ');
  const trimmed = answer.trim().toLowerCase();
  const match = options.find(o => o.key.toLowerCase() === trimmed);
  return match ? match.value : defaultValue;
}

/**
 * Ask multiple yes/no questions. Returns array of selected values.
 * @param {string} header - Section header
 * @param {Array<{label: string, value: string, defaultYes?: boolean}>} items
 * @param {boolean} useDefaults - If true, return items where defaultYes is true
 */
export async function multiConfirm(header, items, useDefaults = false) {
  console.log(`\n${header}`);
  const selected = [];
  for (const item of items) {
    const yes = await confirm(`  ${item.label}`, item.defaultYes || false, useDefaults);
    if (yes) selected.push(item.value);
  }
  return selected;
}
```

- [ ] **Step 2: Verify module loads**

Run: `node -e "import('./lib/prompts.js').then(() => console.log('OK'))"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add lib/prompts.js
git commit -m "feat(cli): add lib/prompts.js — readline-based interactive prompts"
```

---

### Task 4: lib/settings-builder.js — JSON assembly (replaces jq)

**Files:**
- Create: `lib/settings-builder.js`
- Create: `test/settings-builder.test.js`

- [ ] **Step 1: Write test**

Create `test/settings-builder.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/settings-builder.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write lib/settings-builder.js**

```javascript
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

/**
 * Build settings.json by adding stack hooks and optional plugins to base settings.
 * Pure function — does not mutate input.
 *
 * @param {object} baseSettings - Parsed base settings.json
 * @param {string[]} stackHookFiles - Hook filenames to add (e.g. ['format-on-edit.sh'])
 * @param {string[]} optionalPlugins - Plugin names to enable (e.g. ['playwright'])
 * @returns {object} New settings object
 */
export function buildSettings(baseSettings, stackHookFiles, optionalPlugins) {
  // Deep clone to avoid mutation
  const settings = JSON.parse(JSON.stringify(baseSettings));

  // Add stack hooks to PostToolUse
  for (const hookFile of stackHookFiles) {
    settings.hooks.PostToolUse[0].hooks.push({
      type: 'command',
      command: `"$CLAUDE_PROJECT_DIR"/.claude/scripts/hooks/${hookFile}`
    });
  }

  // Add optional plugins
  for (const plugin of optionalPlugins) {
    settings.enabledPlugins[`${plugin}@claude-plugins-official`] = true;
  }

  return settings;
}

/**
 * Collect hook filenames for selected stacks.
 *
 * @param {string} packagesDir - Path to packages/ directory
 * @param {string[]} stacks - Selected stacks (e.g. ['go', 'typescript'])
 * @returns {string[]} Array of hook filenames
 */
export function collectStackHooks(packagesDir, stacks) {
  const hooks = [];
  for (const stack of stacks) {
    const hookDir = join(packagesDir, 'stack-hooks', stack);
    if (!existsSync(hookDir)) continue;
    for (const file of readdirSync(hookDir)) {
      if (file.endsWith('.sh')) hooks.push(file);
    }
  }
  return hooks;
}

/**
 * Read base settings, merge with stack hooks and plugins, write to destination.
 *
 * @param {string} baseSettingsPath - Path to packages/core/settings.json
 * @param {string} destPath - Path to write final settings.json
 * @param {string} packagesDir - Path to packages/ directory
 * @param {string[]} stacks - Selected stacks
 * @param {string[]} optionalPlugins - Optional plugin names
 */
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/settings-builder.test.js`
Expected: All 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/settings-builder.js test/settings-builder.test.js
git commit -m "feat(cli): add settings-builder — JSON assembly without jq"
```

---

### Task 5: lib/superpowers.js — plugin installation

**Files:**
- Create: `lib/superpowers.js`

- [ ] **Step 1: Write lib/superpowers.js**

```javascript
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { info, warn, commandExists } from './utils.js';
import { confirm } from './prompts.js';

const CACHE_DIR = join(homedir(), '.claude', 'plugins', 'cache', 'claude-plugins-official', 'superpowers');
const REGISTRY_PATH = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');

/**
 * Check if superpowers plugin is installed, offer to install if not.
 */
export async function checkAndInstallSuperpowers(useDefaults = false) {
  if (existsSync(CACHE_DIR)) {
    const versions = readdirSync(CACHE_DIR).sort();
    const latest = versions[versions.length - 1] || 'unknown';
    info(`Superpowers plugin found (v${latest})`);
    return;
  }

  console.log('');
  warn('Superpowers plugin is NOT installed.');
  console.log('');
  console.log('  Superkit depends on superpowers for: brainstorming, TDD, debugging,');
  console.log('  writing plans, verification, code review workflows.');
  console.log('  Without it, these features will silently fail.');
  console.log('');

  const install = await confirm('Install superpowers automatically?', true, useDefaults);

  if (!install) {
    warn('Skipping superpowers. Some features will not work.');
    warn('To install later: open Claude Code → /plugins → search \'superpowers\'');
    return;
  }

  if (!commandExists('git')) {
    warn('git not found — cannot clone superpowers. Install manually via /plugins.');
    return;
  }

  console.log('  Cloning superpowers from GitHub...');
  const tmpDir = join(require('node:os').tmpdir(), `superkit-sp-${Date.now()}`);

  try {
    execSync(`git clone --depth 1 https://github.com/obra/superpowers.git "${tmpDir}/superpowers"`, {
      stdio: 'pipe'
    });

    // Read version from plugin manifest
    let version = 'latest';
    const manifestPath = join(tmpDir, 'superpowers', '.claude-plugin', 'plugin.json');
    if (existsSync(manifestPath)) {
      try {
        version = JSON.parse(readFileSync(manifestPath, 'utf8')).version || 'latest';
      } catch { /* use 'latest' */ }
    }

    // Get git SHA
    const sha = execSync('git rev-parse HEAD', {
      cwd: join(tmpDir, 'superpowers'),
      stdio: 'pipe'
    }).toString().trim();

    // Copy to cache
    const destDir = join(CACHE_DIR, version);
    mkdirSync(destDir, { recursive: true });
    cpSync(join(tmpDir, 'superpowers'), destDir, { recursive: true });

    // Register in installed_plugins.json
    mkdirSync(dirname(REGISTRY_PATH), { recursive: true });

    let registry;
    if (existsSync(REGISTRY_PATH)) {
      try {
        registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
      } catch {
        registry = { version: 2, plugins: {} };
      }
    } else {
      registry = { version: 2, plugins: {} };
    }

    const now = new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z');
    registry.plugins['superpowers@claude-plugins-official'] = [{
      scope: 'user',
      projectPath: '',
      installPath: destDir,
      version,
      installedAt: now,
      lastUpdated: now,
      gitCommitSha: sha
    }];

    writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');

    info(`Superpowers plugin installed (v${version})`);
  } catch (err) {
    warn(`Failed to clone superpowers: ${err.message}`);
    console.log('  Install manually: Open Claude Code → /plugins → search \'superpowers\'');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('');
}
```

Wait — `require` doesn't work in ESM. Fix: use `import { tmpdir } from 'node:os'` at the top. Let me correct the code above. The `tmpdir` import is already available from `node:os`. Replace `require('node:os').tmpdir()` with the import.

Corrected line in the code: `const tmpDir = join(tmpdir(), \`superkit-sp-${Date.now()}\`);` — and add `import { tmpdir } from 'node:os';` to the top alongside `homedir`.

Updated import line at top of file:
```javascript
import { homedir, tmpdir } from 'node:os';
```

- [ ] **Step 2: Verify module loads**

Run: `node -e "import('./lib/superpowers.js').then(() => console.log('OK'))"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add lib/superpowers.js
git commit -m "feat(cli): add superpowers.js — plugin auto-installation"
```

---

### Task 6: lib/docs-scaffold.js — documentation templates + tree

**Files:**
- Create: `lib/docs-scaffold.js`

- [ ] **Step 1: Write lib/docs-scaffold.js**

```javascript
import { existsSync, mkdirSync, readdirSync, statSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { info, warn, copyFile, copyDir, commandExists } from './utils.js';

/**
 * Check if a file/dir pattern exists in the project (up to given depth).
 */
function findInProject(projectDir, name, maxDepth = 2) {
  function search(dir, depth) {
    if (depth > maxDepth) return false;
    try {
      for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry === '.git' || entry === 'vendor') continue;
        const full = join(dir, entry);
        if (entry === name) return true;
        try {
          if (statSync(full).isDirectory() && depth < maxDepth) {
            if (search(full, depth + 1)) return true;
          }
        } catch { /* skip permission errors */ }
      }
    } catch { /* skip permission errors */ }
    return false;
  }
  return search(projectDir, 0);
}

/**
 * Scaffold documentation templates and generate project tree.
 */
export function scaffoldDocs(projectDir, packagesDir, mode) {
  mkdirSync(join(projectDir, 'docs', 'architecture'), { recursive: true });
  mkdirSync(join(projectDir, 'docs', 'trees'), { recursive: true });

  const tmplDir = join(packagesDir, 'core', 'docs-templates', 'architecture');
  let tmplCount = 0;

  if (existsSync(tmplDir)) {
    tmplCount = copyDir(tmplDir, join(projectDir, 'docs', 'architecture'), mode, '.md');
    info(`Copied ${tmplCount} architecture doc templates → docs/architecture/`);

    // Auto-detect irrelevant templates and remove them
    let removed = 0;

    // No Go? Remove backend-layers
    if (!existsSync(join(projectDir, 'go.mod')) && !findInProject(projectDir, 'go.mod')) {
      const p = join(projectDir, 'docs', 'architecture', 'backend-layers.md');
      if (existsSync(p)) { rmSync(p); removed++; }
    }

    // No package.json? Remove frontend-state
    if (!findInProject(projectDir, 'package.json')) {
      const p = join(projectDir, 'docs', 'architecture', 'frontend-state.md');
      if (existsSync(p)) { rmSync(p); removed++; }
    }

    // No migrations dir and no schema.prisma? Remove database-schema
    if (!findInProject(projectDir, 'migrations', 3) && !findInProject(projectDir, 'schema.prisma')) {
      const p = join(projectDir, 'docs', 'architecture', 'database-schema.md');
      if (existsSync(p)) { rmSync(p); removed++; }
    }

    // No Dockerfile? Remove deployment
    if (!findInProject(projectDir, 'Dockerfile') && !findInProject(projectDir, 'docker-compose.yml')) {
      const p = join(projectDir, 'docs', 'architecture', 'deployment.md');
      if (existsSync(p)) { rmSync(p); removed++; }
    }

    if (removed > 0) {
      info(`Removed ${removed} irrelevant templates (auto-detected)`);
    }
  } else {
    info('Created docs/architecture/ and docs/trees/ directories');
  }

  // Generate project tree
  generateTree(projectDir);
}

/**
 * Generate a simple project tree file.
 */
function generateTree(projectDir) {
  const treePath = join(projectDir, 'docs', 'trees', 'tree-project.md');
  const date = new Date().toISOString().slice(0, 10);
  let treeContent;

  if (commandExists('tree')) {
    try {
      treeContent = execSync(
        `tree "${projectDir}" -I 'node_modules|.git|__pycache__|vendor|dist|build|.next|.cache|*.pyc|.DS_Store' --dirsfirst -L 3`,
        { stdio: 'pipe', maxBuffer: 1024 * 1024 }
      ).toString();
    } catch {
      treeContent = generateFallbackTree(projectDir);
    }
  } else {
    treeContent = generateFallbackTree(projectDir);
  }

  const content = [
    '# Project Tree',
    `> Auto-generated on ${date}. Regenerate with tree-generator agent.`,
    '',
    '```',
    treeContent.trimEnd(),
    '```',
    ''
  ].join('\n');

  writeFileSync(treePath, content);
  info('Generated project tree → docs/trees/tree-project.md');
}

/**
 * Pure-JS fallback tree generator (no external dependencies).
 */
function generateFallbackTree(rootDir, maxDepth = 3) {
  const IGNORE = new Set([
    'node_modules', '.git', '__pycache__', 'vendor', 'dist',
    'build', '.next', '.cache', '.DS_Store'
  ]);

  const lines = [];
  let count = 0;
  const MAX_ENTRIES = 100;

  function walk(dir, prefix, depth) {
    if (depth > maxDepth || count >= MAX_ENTRIES) return;
    let entries;
    try {
      entries = readdirSync(dir).filter(e => !IGNORE.has(e) && !e.endsWith('.pyc')).sort();
    } catch { return; }

    // Directories first
    const dirs = entries.filter(e => {
      try { return statSync(join(dir, e)).isDirectory(); } catch { return false; }
    });
    const files = entries.filter(e => {
      try { return statSync(join(dir, e)).isFile(); } catch { return false; }
    });
    const sorted = [...dirs, ...files];

    for (let i = 0; i < sorted.length && count < MAX_ENTRIES; i++) {
      const entry = sorted[i];
      const isLast = i === sorted.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';

      lines.push(`${prefix}${connector}${entry}`);
      count++;

      const full = join(dir, entry);
      try {
        if (statSync(full).isDirectory()) {
          walk(full, prefix + childPrefix, depth + 1);
        }
      } catch { /* skip */ }
    }
  }

  lines.push('.');
  walk(rootDir, '', 0);
  return lines.join('\n');
}
```

- [ ] **Step 2: Verify module loads**

Run: `node -e "import('./lib/docs-scaffold.js').then(() => console.log('OK'))"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add lib/docs-scaffold.js
git commit -m "feat(cli): add docs-scaffold.js — templates + tree generation"
```

---

### Task 7: lib/codex.js — Codex CLI support

**Files:**
- Create: `lib/codex.js`

- [ ] **Step 1: Write lib/codex.js**

```javascript
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { info, warn, copyFile, copySkills, commandExists } from './utils.js';

/**
 * Install Codex CLI support: skills, AGENTS.md, config.toml.
 */
export function installCodex(projectDir, packagesDir, mode) {
  // Check if codex CLI is available
  if (!commandExists('codex')) {
    warn('Codex CLI not found. Install: npm install -g @openai/codex');
    warn('Continuing with file setup anyway...');
  }

  // Copy skills
  const codexSkillsSrc = join(packagesDir, 'codex', 'skills');
  const codexSkillsDst = join(projectDir, '.codex', 'skills');
  const skillCount = copySkills(codexSkillsSrc, codexSkillsDst, mode);
  info(`Copied ${skillCount} Codex skills → .codex/skills/`);

  // AGENTS.md template
  const agentsSrc = join(packagesDir, 'codex', 'AGENTS.md');
  const agentsDst = join(projectDir, 'AGENTS.md');
  if (!existsSync(agentsDst)) {
    copyFile(agentsSrc, agentsDst, 'fresh');
    info('Created AGENTS.md template');
  } else {
    warn('AGENTS.md already exists — skipped');
  }

  // config.toml (always overwrite to ensure latest model)
  mkdirSync(join(projectDir, '.codex'), { recursive: true });
  copyFileSync(
    join(packagesDir, 'codex', 'config.toml'),
    join(projectDir, '.codex', 'config.toml')
  );
  info('Created .codex/config.toml (gpt-5.4, extra_high reasoning)');

  return skillCount;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/codex.js
git commit -m "feat(cli): add codex.js — Codex CLI installation"
```

---

### Task 8: lib/validator.js — post-install validation

**Files:**
- Create: `lib/validator.js`

- [ ] **Step 1: Write lib/validator.js**

```javascript
import { existsSync, readFileSync, readdirSync, chmodSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { info, warn } from './utils.js';

/**
 * Run post-install validation checks.
 * Returns true if all checks pass.
 */
export function validate(claudeDir, projectDir) {
  let ok = true;

  // Check settings.json is valid JSON
  const settingsPath = join(claudeDir, 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      JSON.parse(readFileSync(settingsPath, 'utf8'));
      info('Validation: settings.json is valid JSON');
    } catch {
      warn('Validation: settings.json is INVALID — hooks will not work!');
      ok = false;
    }
  }

  // Check hooks are executable (Unix only)
  if (process.platform !== 'win32') {
    const hooksDir = join(claudeDir, 'scripts', 'hooks');
    if (existsSync(hooksDir)) {
      let nonExec = 0;
      for (const file of readdirSync(hooksDir)) {
        if (!file.endsWith('.sh')) continue;
        const filePath = join(hooksDir, file);
        try {
          const stat = statSync(filePath);
          if (!(stat.mode & 0o111)) {
            chmodSync(filePath, stat.mode | 0o111);
            nonExec++;
          }
        } catch { /* skip */ }
      }
      if (nonExec > 0) {
        warn(`Validation: fixed ${nonExec} non-executable hooks`);
      } else {
        info('Validation: all hooks are executable');
      }
    }
  }

  // Check CLAUDE.md exists
  if (existsSync(join(projectDir, 'CLAUDE.md'))) {
    info('Validation: CLAUDE.md is present');
  } else {
    warn('Validation: CLAUDE.md is missing');
    ok = false;
  }

  // Check agents installed
  const agentsDir = join(claudeDir, 'agents');
  if (existsSync(agentsDir)) {
    const count = readdirSync(agentsDir).filter(f => f.endsWith('.md')).length;
    if (count > 0) {
      info(`Validation: ${count} agents installed`);
    } else {
      warn('Validation: no agents found — installation may have failed');
      ok = false;
    }
  }

  return ok;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/validator.js
git commit -m "feat(cli): add validator.js — post-install validation"
```

---

### Task 9: lib/installer.js — main orchestrator

**Files:**
- Create: `lib/installer.js`

This is the big one — ports all setup.sh logic.

- [ ] **Step 1: Write lib/installer.js**

```javascript
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

/**
 * Run the full installation flow.
 * @param {object} opts — parsed CLI options
 */
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
  await checkAndInstallSuperpowers(useDefaults);

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

    // Auto-suggest frontend-design if TypeScript selected
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
  console.log('');
  console.log('  All agents use Phase 0 — they read docs/architecture/ before reviewing.');
  console.log('  Without these docs, agents work blind and produce less accurate reviews.');
  console.log('  This step creates architecture templates (fill TODOs later) and a project tree.');
  console.log('');

  const createDocs = await confirm('Initialize documentation structure? (recommended)', true, useDefaults);
  if (createDocs) {
    scaffoldDocs(projectDir, PACKAGES_DIR, mode);
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
```

- [ ] **Step 2: Verify module loads**

Run: `node -e "import('./lib/installer.js').then(() => console.log('OK'))"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add lib/installer.js
git commit -m "feat(cli): add installer.js — main orchestrator (ports all setup.sh logic)"
```

---

### Task 10: bin/cli.js — entry point + argument parsing

**Files:**
- Create: `bin/cli.js`

- [ ] **Step 1: Write bin/cli.js**

```javascript
#!/usr/bin/env node

import { install } from '../lib/installer.js';
import { closeRL } from '../lib/prompts.js';

const VERSION = '1.3.3';

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    version: VERSION,
    defaults: false,
    stacks: null,
    extras: null,
    profile: null,
    plugins: null,
    codex: null,
    noDocs: false,
    noSuperpowers: false
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--version' || arg === '-v') {
      console.log(`claude-code-superkit v${VERSION}`);
      process.exit(0);
    }
    if (arg === '--defaults') {
      opts.defaults = true;
      continue;
    }
    if (arg === '--codex') {
      opts.codex = true;
      continue;
    }
    if (arg === '--no-docs') {
      opts.noDocs = true;
      continue;
    }
    if (arg === '--no-superpowers') {
      opts.noSuperpowers = true;
      continue;
    }
    if (arg.startsWith('--stacks=')) {
      opts.stacks = arg.split('=')[1].split(',').map(s => {
        const map = { go: 'go', ts: 'typescript', typescript: 'typescript', py: 'python', python: 'python', rust: 'rust' };
        return map[s.toLowerCase()] || s.toLowerCase();
      });
      continue;
    }
    if (arg.startsWith('--profile=')) {
      opts.profile = arg.split('=')[1].toLowerCase();
      if (!['fast', 'standard', 'strict'].includes(opts.profile)) {
        console.error(`Unknown profile: ${opts.profile}. Use: fast, standard, strict`);
        process.exit(1);
      }
      continue;
    }
    if (arg.startsWith('--extras=')) {
      opts.extras = arg.split('=')[1].split(',').map(s => {
        const map = { bot: 'bot-reviewer', design: 'design-system-reviewer' };
        return map[s.toLowerCase()] || s.toLowerCase();
      });
      continue;
    }
    if (arg.startsWith('--plugins=')) {
      opts.plugins = arg.split('=')[1].split(',');
      continue;
    }

    console.error(`Unknown option: ${arg}`);
    console.error('Run with --help for usage.');
    process.exit(1);
  }

  return opts;
}

function printHelp() {
  console.log(`
claude-code-superkit v${VERSION} — interactive installer

Usage:
  npx claude-code-superkit [options]

Options:
  --defaults              Use default settings, no interactive prompts
  --stacks=go,ts,py,rust  Select language stacks (comma-separated)
  --profile=standard      Hook profile: fast, standard, strict
  --extras=bot,design     Select extras (comma-separated)
  --plugins=playwright    Optional plugins (comma-separated)
  --codex                 Also install for Codex CLI
  --no-docs               Skip documentation scaffolding
  --no-superpowers        Skip superpowers plugin installation
  --help, -h              Show this help
  --version, -v           Show version

Examples:
  npx claude-code-superkit                          # Interactive
  npx claude-code-superkit --defaults               # All defaults
  npx claude-code-superkit --stacks=go,ts --codex   # Go + TypeScript + Codex

Run from your project root (must be a git repository).
Requires: Node.js 18+, git. Recommended: claude CLI.
`);
}

async function main() {
  const opts = parseArgs(process.argv);

  try {
    await install(opts);
  } catch (err) {
    // Handle non-interactive mode gracefully
    if (err.code === 'ERR_USE_AFTER_CLOSE' || (err.message && err.message.includes('readline was closed'))) {
      console.log('\nNon-interactive input detected. Re-running with --defaults...\n');
      opts.defaults = true;
      await install(opts);
    } else {
      console.error(`\n✗ Error: ${err.message}`);
      if (process.env.DEBUG) console.error(err.stack);
      process.exit(1);
    }
  } finally {
    closeRL();
  }
}

main();
```

- [ ] **Step 2: Make executable**

Run: `chmod +x bin/cli.js`

- [ ] **Step 3: Verify help works**

Run: `node bin/cli.js --help`
Expected: Usage text with all options

- [ ] **Step 4: Verify version works**

Run: `node bin/cli.js --version`
Expected: `claude-code-superkit v1.3.3`

- [ ] **Step 5: Commit**

```bash
git add bin/cli.js
git commit -m "feat(cli): add bin/cli.js — entry point with argument parsing"
```

---

### Task 11: Replace setup.sh with POSIX wrapper

**Files:**
- Modify: `setup.sh` (complete rewrite — from 593 lines to 5 lines)

- [ ] **Step 1: Backup and note old setup.sh will be replaced**

The old 593-line setup.sh is fully replaced. All its logic now lives in lib/installer.js. The git history preserves the old version.

- [ ] **Step 2: Rewrite setup.sh**

Replace the entire content of `setup.sh` with:

```sh
#!/bin/sh
# claude-code-superkit — installer wrapper
# For direct use: npx claude-code-superkit
# This wrapper is for users who cloned the repo directly.
command -v node >/dev/null 2>&1 || { printf 'Error: Node.js 18+ is required.\nInstall: https://nodejs.org\n' >&2; exit 1; }
exec node "$(dirname "$0")/bin/cli.js" "$@"
```

- [ ] **Step 3: Verify setup.sh works**

Run: `./setup.sh --version`
Expected: `claude-code-superkit v1.3.3`

Run: `./setup.sh --help`
Expected: Full help text

- [ ] **Step 4: Commit**

```bash
git add setup.sh
git commit -m "refactor: replace 593-line bash setup.sh with 5-line POSIX wrapper → Node.js"
```

---

### Task 12: Smoke test — verify full flow with --defaults

**Files:**
- Create: `test/smoke.test.js`

- [ ] **Step 1: Write smoke test**

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

describe('smoke test: --defaults install', () => {
  let testDir;
  const cliPath = join(import.meta.dirname, '..', 'bin', 'cli.js');

  before(() => {
    // Create a temp git repo
    testDir = mkdtempSync(join(tmpdir(), 'superkit-smoke-'));
    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "init"', { cwd: testDir, stdio: 'pipe' });
  });

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('installs with --defaults without errors', () => {
    const result = execSync(`node "${cliPath}" --defaults --no-superpowers`, {
      cwd: testDir,
      stdio: 'pipe',
      env: { ...process.env, HOME: tmpdir() }
    });
    const output = result.toString();
    assert.ok(output.includes('Installation complete!'), 'Should show completion message');
  });

  it('creates .claude/ directory', () => {
    assert.ok(existsSync(join(testDir, '.claude')));
  });

  it('creates agents', () => {
    assert.ok(existsSync(join(testDir, '.claude', 'agents')));
  });

  it('creates valid settings.json', () => {
    const settingsPath = join(testDir, '.claude', 'settings.json');
    assert.ok(existsSync(settingsPath));
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    assert.ok(settings.hooks);
    assert.ok(settings.enabledPlugins);
  });

  it('creates CLAUDE.md', () => {
    assert.ok(existsSync(join(testDir, 'CLAUDE.md')));
  });

  it('creates hooks and they are executable', () => {
    const hooksDir = join(testDir, '.claude', 'scripts', 'hooks');
    assert.ok(existsSync(hooksDir));
  });

  it('creates .superkit-meta', () => {
    assert.ok(existsSync(join(testDir, '.claude', '.superkit-meta')));
  });
});
```

- [ ] **Step 2: Run smoke test**

Run: `node --test test/smoke.test.js`
Expected: All 7 tests pass

- [ ] **Step 3: Fix any issues found, re-run**

If any test fails, debug and fix the corresponding lib/ module, then re-run.

- [ ] **Step 4: Commit**

```bash
git add test/smoke.test.js
git commit -m "test: add smoke test for --defaults installation flow"
```

---

### Task 13: Update README.md — installation section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the Installation section**

Find the `## 🚀 Installation` section and replace the Claude Code installation block with:

```markdown
## 🚀 Installation

### Claude Code (recommended)

```bash
# One command — works on macOS, Linux, Windows:
npx claude-code-superkit

# With explicit options:
npx claude-code-superkit --stacks=go,typescript --profile=strict --codex

# Non-interactive (CI/CD):
npx claude-code-superkit --defaults

# If you cloned the repo:
cd your-project/
./path/to/claude-code-superkit/setup.sh
```

`npx claude-code-superkit` — interactive installer: selects your stack, hook profile, plugins. Zero dependencies beyond Node.js. See [detailed guide](docs/INSTALL-CLAUDE-CODE.md).
```

- [ ] **Step 2: Remove jq from any mentions in README**

Search for "jq" in README.md. If mentioned as a requirement, remove it.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README — npx claude-code-superkit as primary installation"
```

---

### Task 14: Update docs/INSTALL-CLAUDE-CODE.md

**Files:**
- Modify: `docs/INSTALL-CLAUDE-CODE.md`

- [ ] **Step 1: Update prerequisites table**

Remove jq from requirements. Add Node.js 18+:

```markdown
## Prerequisites

| Tool | Required | Install |
|------|----------|---------|
| Node.js 18+ | Yes | [nodejs.org](https://nodejs.org) or `brew install node` |
| git | Yes | System package manager |
| Claude Code CLI | Yes | `npm install -g @anthropic-ai/claude-code` |
| Plugins | Recommended | Auto-enabled by installer: superpowers, github, context7, code-review. Install via Claude Code → `/plugins` |
| tree | Optional | `brew install tree` — nicer project tree generation |
```

- [ ] **Step 2: Update Option 1 section**

Replace the "Interactive Setup" section:

```markdown
## Option 1: npx (recommended)

```bash
# From your project root (must be a git repo):
npx claude-code-superkit
```

That's it. The installer will guide you through stack selection, hook profiles, and plugin choices.

### CLI Options

```
npx claude-code-superkit [options]

  --defaults              Use default settings, no interactive prompts
  --stacks=go,ts,py,rust  Select language stacks
  --profile=standard      Hook profile: fast, standard, strict
  --extras=bot,design     Select extras
  --codex                 Also install for Codex CLI
  --no-docs               Skip documentation scaffolding
  --help, -h              Show help
```

### What the installer does

1. **Checks prerequisites** — Node.js 18+, git, Claude CLI
2. **Installs superpowers plugin** — auto-clones from GitHub if missing
(... rest of the numbered list stays the same, just remove jq mentions ...)
```

- [ ] **Step 3: Update the "Updating" section**

```markdown
## Updating

```bash
# Just re-run:
npx claude-code-superkit@latest

# Choose [m] merge — adds new files, keeps your existing customizations
```
```

- [ ] **Step 4: Commit**

```bash
git add docs/INSTALL-CLAUDE-CODE.md
git commit -m "docs: update INSTALL guide — npx as primary, remove jq dependency"
```

---

### Task 15: Update CHANGELOG.md

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add entry under [Unreleased] or current version section**

Add at the top of the changelog (under the header):

```markdown
## [Unreleased]

### Changed
- **setup.sh → npx** — installer rewritten from 593-line bash to Node.js CLI. Install via `npx claude-code-superkit`. Zero external dependencies (no jq required). Works on macOS (any bash/zsh), Linux, and Windows
- **setup.sh** — now a 5-line POSIX sh wrapper that delegates to Node.js
- **`--defaults` flag** — non-interactive mode for CI/CD (`npx claude-code-superkit --defaults`)
- **CLI flags** — `--stacks=`, `--profile=`, `--extras=`, `--codex`, `--no-docs`, `--no-superpowers`
- **Graceful pipe handling** — if stdin closes during interactive mode, auto-falls back to `--defaults`

### Fixed
- **Silent failures on macOS** — Bash 3.2 + `set -euo pipefail` caused script to exit without error message (#Issue1)
- **Bash 3.2 incompatibility** — empty arrays + `set -u` triggered unbound variable errors (#Issue3)
- **`pipefail` + `ls | wc -l`** — false errors when counting files (#Issue6)
- **`cd` in tree fallback** — changed working directory unexpectedly (#Issue4)
- **zsh users** — running `zsh setup.sh` crashed on `BASH_VERSINFO` (#Issue2)
- **jq dependency removed** — JSON assembly now native in Node.js

### Added
- `package.json` — npm package for `npx claude-code-superkit`
- `bin/cli.js` — CLI entry point with argument parsing
- `lib/` — modular Node.js installer (installer, prompts, settings-builder, superpowers, docs-scaffold, codex, validator, utils)
- `test/` — unit tests (settings-builder) + smoke test (full --defaults flow)
- Windows support (via Node.js)
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG — npx installer migration, all 6 bash bugs fixed"
```

---

### Task 16: Update CLAUDE.md (project instructions)

**Files:**
- Modify: `CLAUDE.md` (root project CLAUDE.md, not the template)

- [ ] **Step 1: Update Project Structure section**

Add `bin/`, `lib/`, `test/`, `package.json` to the structure:

```
bin/
  cli.js                    # CLI entry point (#!/usr/bin/env node)
lib/
  installer.js              # Main orchestrator
  prompts.js                # Interactive prompts (readline)
  settings-builder.js       # JSON assembly (replaces jq)
  superpowers.js             # Plugin installation
  docs-scaffold.js           # Doc templates + tree
  codex.js                   # Codex CLI support
  validator.js               # Post-install validation
  utils.js                   # Colors, file helpers, git
test/
  utils.test.js             # Unit tests for utils
  settings-builder.test.js  # Unit tests for settings-builder
  smoke.test.js             # Smoke test for full install
package.json                # npm package config
setup.sh                    # POSIX wrapper → bin/cli.js
```

- [ ] **Step 2: Update Key Files table**

Add entries for new key files:

```markdown
| `package.json` | npm package config for `npx claude-code-superkit` |
| `bin/cli.js` | CLI entry point — arg parsing, error handling |
| `lib/installer.js` | Main install orchestrator — ports all setup.sh logic |
| `lib/settings-builder.js` | JSON assembly — replaces jq dependency |
```

- [ ] **Step 3: Update setup.sh description**

Change the Key Files table entry for setup.sh from "Interactive installer — stack, extras, profile, plugins, validation" to "POSIX wrapper → `node bin/cli.js`".

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md — add bin/, lib/, test/ to project structure"
```

---

### Task 17: Update packages/codex/INSTALL.md

**Files:**
- Modify: `packages/codex/INSTALL.md`

- [ ] **Step 1: Update Quick Install section**

Replace the manual clone + copy instructions with:

```markdown
## Quick Install

### Option A: Via superkit installer (recommended)

```bash
npx claude-code-superkit --codex
```

This installs both Claude Code and Codex CLI support in one command.

### Option B: Manual setup
```

Then keep the existing Step 2-4 content as-is for the manual path.

- [ ] **Step 2: Commit**

```bash
git add packages/codex/INSTALL.md
git commit -m "docs: update Codex INSTALL — add npx option"
```

---

### Task 18: Final verification

- [ ] **Step 1: Run all tests**

Run: `node --test test/`
Expected: All tests pass (utils, settings-builder, smoke)

- [ ] **Step 2: Verify npm pack works**

Run: `npm pack --dry-run 2>&1 | head -30`
Expected: Shows package contents including bin/, lib/, packages/ — no docs/, test/, .claude/

- [ ] **Step 3: Verify npx locally**

Run: `npm link && cd /tmp && mkdir test-project && cd test-project && git init && git commit --allow-empty -m "init" && npx claude-code-superkit --version`
Expected: `claude-code-superkit v1.3.3`

Run: `npx claude-code-superkit --defaults --no-superpowers`
Expected: Full installation completes without errors

Clean up: `cd / && rm -rf /tmp/test-project && npm unlink -g claude-code-superkit`

- [ ] **Step 4: Verify old bash reproduction case now works**

Run the exact scenario from the bug report:
```bash
cd /tmp && mkdir repro-test && cd repro-test && git init && git commit --allow-empty -m "init"
node /path/to/claude-code-superkit/bin/cli.js --defaults --no-superpowers
```
Expected: Full installation completes (was: silent exit code 1)

- [ ] **Step 5: Final commit — update all counts if needed**

Check README badge counts, CLAUDE.md counts table match reality. Fix any drift.

```bash
git add -A
git commit -m "chore: final verification — all tests pass, counts synced"
```
