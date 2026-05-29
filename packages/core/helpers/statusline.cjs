#!/usr/bin/env node
// statusline.cjs — Claude Code status bar for superkit
// Shows: profile, stacks, git branch, migration count, hooks, context hints
//        + effort level + context budget (when Claude Code 2.1.x provides them)
// Pure Node.js, no external dependencies, 2s timeout on all execSync calls

'use strict';

const { execSync } = require('child_process');
const { existsSync, readFileSync, readdirSync } = require('fs');
const { join } = require('path');

// ── Read optional JSON payload from stdin (non-blocking, 50ms window) ─────────
// Claude Code 2.1.x may pass a richer status payload via stdin.
// Older CLIs pass nothing — we must never block or throw on empty/TTY stdin.
function readStdinPayload() {
  try {
    if (process.stdin.isTTY) return null;       // interactive terminal — skip
    const buf = [];
    // Read synchronously with a hard limit: if no data in fd, readSync throws
    const fd = process.stdin.fd;
    const chunk = Buffer.alloc(4096);
    let total = Buffer.alloc(0);
    let n;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        n = require('fs').readSync(fd, chunk, 0, chunk.length, null);
      } catch { break; }
      if (n === 0) break;
      total = Buffer.concat([total, chunk.slice(0, n)]);
      if (total.length > 65536) break;  // guard against runaway
    }
    const text = total.toString('utf8').trim();
    if (!text) return null;
    return JSON.parse(text);
  } catch { return null; }
}

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

// ── Parse effort level from payload ───────────────────
// Claude Code 2.1.x may send { effort: "xhigh" } or { effort: { level: "xhigh" } }
// or the env var CLAUDE_EFFORT (for hook contexts). Absent → return ''.
function getEffortLevel(payload) {
  // Env var takes precedence (always available in hook runs)
  const envEffort = process.env.CLAUDE_EFFORT;
  if (envEffort) return envEffort;
  if (payload == null) return '';
  // Payload shape: { effort: "xhigh" } or { effort: { level: "xhigh" } }
  const e = payload.effort;
  if (e == null) return '';
  if (typeof e === 'string') return e;
  if (typeof e === 'object' && e.level != null) return String(e.level);
  return '';
}

// ── Parse context budget from payload ─────────────────
// Claude Code 2.1.x: context_window = CURRENT usage (not cumulative).
// Older CLIs: absent → render nothing.
function getContextBudget(payload) {
  if (payload == null) return '';
  // Look for context_window (current tokens used) and optionally context_window_max
  const used = payload.context_window ?? payload.context_tokens_used ?? null;
  if (used == null || typeof used !== 'number') return '';
  const max = payload.context_window_max ?? payload.context_tokens_max
    ?? (typeof process.env.CLAUDE_CONTEXT_TOKENS_MAX === 'string'
        ? parseInt(process.env.CLAUDE_CONTEXT_TOKENS_MAX, 10) || null
        : null)
    ?? 1000000;  // default: Opus 4.8 1M
  const pct = Math.round((used / max) * 100);
  return `ctx:${pct}%`;
}

// ── Build status line ──────────────────────────────────
const stdinPayload = readStdinPayload();

const profile = getProfile();
const stacks = getStacks();
const git = getGitInfo();
const migrations = getMigrationCount();
const hookCount = getHookCount();
const agentCount = getAgentCount();
const task = getContextHint();
const skVersion = getSuperkit();
const effortLevel = getEffortLevel(stdinPayload);
const contextBudget = getContextBudget(stdinPayload);

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

// Effort level (Opus 4.8 + Claude Code 2.1.x) — absent on older CLIs
if (effortLevel) parts.push(`⚙${effortLevel}`);

// Context budget (Claude Code 2.1.x current-token semantics) — absent on older CLIs
if (contextBudget) parts.push(contextBudget);

// Active task (truncate to 30 chars)
if (task) {
  const short = task.length > 30 ? task.slice(0, 27) + '...' : task;
  parts.push(short);
}

process.stdout.write(parts.join(' | '));
