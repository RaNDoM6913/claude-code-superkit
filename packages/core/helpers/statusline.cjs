#!/usr/bin/env node
// statusline.cjs — Claude Code status bar for superkit
// Shows: profile, stacks, git branch, migration count, hooks, context hints
// Pure Node.js, no external dependencies, 2s timeout on all execSync calls

'use strict';

const { execSync } = require('child_process');
const { existsSync, readFileSync, readdirSync } = require('fs');
const { join } = require('path');

const TIMEOUT = 2000;
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function exec(cmd) {
  try {
    return execSync(cmd, { cwd: projectDir, timeout: TIMEOUT, encoding: 'utf8' }).trim();
  } catch { return ''; }
}

function getProfile() {
  return process.env.CLAUDE_HOOK_PROFILE || 'standard';
}

const STACK_SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', '.next', '.turbo',
  'vendor', 'target', 'bin', '__pycache__', '.venv', 'venv',
  'coverage', 'tmp', 'temp',
]);

function detectStacksIn(dir) {
  const found = [];
  const markers = {
    'go.mod': 'Go',
    'Cargo.toml': 'Rust',
    'pyproject.toml': 'Py',
    'requirements.txt': 'Py',
  };
  for (const [file, label] of Object.entries(markers)) {
    if (existsSync(join(dir, file))) found.push(label);
  }
  // TypeScript: need both package.json and tsconfig
  if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'tsconfig.json'))) {
    found.push('TS');
  } else if (existsSync(join(dir, 'package.json'))) {
    found.push('JS');
  }
  return found;
}

function getStacks() {
  const stacks = detectStacksIn(projectDir);
  // Monorepo fallback: if root didn't yield a clear stack set, scan 1-level subdirs
  if (stacks.length < 2) {
    try {
      for (const entry of readdirSync(projectDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue;
        if (STACK_SKIP_DIRS.has(entry.name)) continue;
        stacks.push(...detectStacksIn(join(projectDir, entry.name)));
      }
    } catch { /* skip */ }
  }
  return [...new Set(stacks)].sort();
}

function getGitInfo() {
  const combined = exec('git branch --show-current 2>/dev/null && echo "---SEP---" && git diff --shortstat 2>/dev/null && echo "---SEP---" && git diff --cached --shortstat 2>/dev/null');
  if (!combined) return { branch: '', dirty: false, staged: false };

  const parts = combined.split('---SEP---').map(s => s.trim());
  return {
    branch: parts[0] || '',
    dirty: !!parts[1],
    staged: !!parts[2],
  };
}

function getMigrationCount() {
  const migDirs = ['migrations', 'db/migrations', 'db/migrate', 'prisma/migrations'];
  for (const dir of migDirs) {
    const full = join(projectDir, dir);
    if (!existsSync(full)) continue;
    try {
      const entries = readdirSync(full).filter(f => !f.startsWith('.'));
      if (entries.length > 0) return entries.length;
    } catch { /* skip */ }
  }
  return 0;
}

function getHookCount() {
  const hooksDir = join(projectDir, '.claude', 'scripts', 'hooks');
  if (!existsSync(hooksDir)) return 0;
  try {
    return readdirSync(hooksDir).filter(f => f.endsWith('.sh')).length;
  } catch { return 0; }
}

function getAgentCount() {
  const agentsDir = join(projectDir, '.claude', 'agents');
  if (!existsSync(agentsDir)) return 0;
  try {
    return readdirSync(agentsDir).filter(f => f.endsWith('.md')).length;
  } catch { return 0; }
}

function getContextHint() {
  const stateFile = join(projectDir, '.claude', '.task-state.json');
  if (!existsSync(stateFile)) return '';
  try {
    const state = JSON.parse(readFileSync(stateFile, 'utf8'));
    if (state.currentTask) return state.currentTask;
  } catch { /* skip */ }
  return '';
}

function getSuperkit() {
  const metaFile = join(projectDir, '.claude', '.superkit-meta');
  if (!existsSync(metaFile)) return '';
  try {
    const content = readFileSync(metaFile, 'utf8');
    const match = content.match(/SUPERKIT_VERSION="([^"]+)"/);
    return match ? match[1] : '';
  } catch { return ''; }
}

// ── Build status line ──────────────────────────────────
const profile = getProfile();
const stacks = getStacks();
const git = getGitInfo();
const migrations = getMigrationCount();
const hookCount = getHookCount();
const agentCount = getAgentCount();
const task = getContextHint();
const skVersion = getSuperkit();

const parts = [];

// Profile indicator
const profileIcon = { fast: 'F', standard: 'S', strict: 'X' }[profile] || 'S';
parts.push(`[${profileIcon}]`);

// Git branch + status
if (git.branch) {
  let branchStr = git.branch;
  if (git.staged) branchStr += '+';
  if (git.dirty) branchStr += '*';
  parts.push(branchStr);
}

// Stacks
if (stacks.length > 0) {
  parts.push(stacks.join('/'));
}

// Counts
const counts = [];
if (agentCount > 0) counts.push(`${agentCount}ag`);
if (hookCount > 0) counts.push(`${hookCount}hk`);
if (migrations > 0) counts.push(`${migrations}mig`);
if (counts.length > 0) parts.push(counts.join(' '));

// Superkit version
if (skVersion) parts.push(`sk${skVersion}`);

// Active task (truncate to 30 chars)
if (task) {
  const short = task.length > 30 ? task.slice(0, 27) + '...' : task;
  parts.push(short);
}

process.stdout.write(parts.join(' | '));
