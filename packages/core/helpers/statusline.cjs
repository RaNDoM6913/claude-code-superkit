#!/usr/bin/env node
// statusline.cjs — Claude Code status bar for superkit
// Shows: profile, stacks, git branch, migration count, hooks, context hints
//        + effort level + context budget (when Claude Code 2.1.x provides them)
// Pure Node.js, no external dependencies, 2s timeout on all execSync calls

'use strict';

const { execSync } = require('child_process');
const { existsSync, readFileSync, readdirSync, openSync, fstatSync, readSync, closeSync } = require('fs');
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
  // Live payload effort takes precedence — the CLI sends the real per-turn
  // effort here, so a stale CLAUDE_EFFORT env var must not mask it.
  // Payload shape: { effort: "xhigh" } or { effort: { level: "xhigh" } }
  if (payload != null) {
    const e = payload.effort;
    if (typeof e === 'string' && e) return e;
    if (e != null && typeof e === 'object' && e.level != null) return String(e.level);
  }
  // Fall back to the env var (available in hook runs / older CLIs).
  return process.env.CLAUDE_EFFORT || '';
}

// ── Transcript-based context fallback (older CLIs w/o native context_window) ──
// Reads only the trailing bytes of the JSONL transcript (last ~256KB — respects
// the 2s render budget on huge transcripts), then scans BACKWARDS for the latest
// line carrying a usage record and sums its input-token fields. Fully fail-open:
// any error (missing/unreadable file, all-bad JSON) → null. Never throws.
function readLatestContextTokens(transcriptPath) {
  try {
    if (typeof transcriptPath !== 'string' || !transcriptPath) return null;
    const fd = openSync(transcriptPath, 'r');
    try {
      const size = fstatSync(fd).size;
      const readLen = Math.min(size, 262144);           // last ~256KB only
      const buf = Buffer.alloc(readLen);
      readSync(fd, buf, 0, readLen, size - readLen);
      const lines = buf.toString('utf8').split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {     // newest → oldest
        const line = lines[i].trim();
        if (!line) continue;
        let obj;
        try { obj = JSON.parse(line); } catch { continue; }  // skip bad/truncated line
        const usage = (obj && obj.message && obj.message.usage) || (obj && obj.usage);
        if (usage && typeof usage === 'object'
            && ('input_tokens' in usage || 'cache_read_input_tokens' in usage
                || 'cache_creation_input_tokens' in usage)) {
          return (usage.input_tokens || 0)
            + (usage.cache_read_input_tokens || 0)
            + (usage.cache_creation_input_tokens || 0);
        }
      }
      return null;
    } finally { closeSync(fd); }
  } catch { return null; }
}

// Resolve the context window size for the transcript fallback path.
// Precedence: env override → model '[1m]' marker → >200k heuristic → 200k default.
function resolveContextWindowTokens(usedTokens, modelString) {
  const env = process.env.CLAUDE_CONTEXT_TOKENS_MAX;
  if (typeof env === 'string' && env.trim()) {
    const n = parseInt(env, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (typeof modelString === 'string' && /\[1m\]/i.test(modelString)) return 1000000;
  if (typeof usedTokens === 'number' && usedTokens > 200000) return 1000000;
  return 200000;
}

// ── Parse context budget from payload ─────────────────
// Claude Code 2.1.x: context_window = CURRENT usage (not cumulative).
// Older CLIs: no native field → derive usage from the transcript instead.
function getContextBudget(payload) {
  if (payload == null) return '';
  // Native path (Claude Code 2.1.x provides current-token semantics) — unchanged.
  const used = payload.context_window ?? payload.context_tokens_used ?? null;
  if (used != null) {
    if (typeof used !== 'number') return '';
    const max = payload.context_window_max ?? payload.context_tokens_max
      ?? (typeof process.env.CLAUDE_CONTEXT_TOKENS_MAX === 'string'
          ? parseInt(process.env.CLAUDE_CONTEXT_TOKENS_MAX, 10) || null
          : null)
      ?? 1000000;  // default: Opus 4.8 1M
    const pct = Math.round((used / max) * 100);
    return `ctx:${pct}%`;
  }
  // Fallback path: both native fields absent → measure from the transcript.
  if (typeof payload.transcript_path === 'string' && payload.transcript_path) {
    const fallbackUsed = readLatestContextTokens(payload.transcript_path);
    if (fallbackUsed == null) return '';
    // Model string: the '[1m]' marker rides on model.id (e.g. claude-opus-4-8[1m]);
    // combine id + display_name so either field can carry it.
    const m = payload.model;
    const modelString = typeof m === 'string'
      ? m
      : (m && typeof m === 'object' ? `${m.id || ''} ${m.display_name || ''}` : '');
    const max = resolveContextWindowTokens(fallbackUsed, modelString);
    const pct = Math.round((fallbackUsed / max) * 100);
    return `ctx:${pct}%`;
  }
  return '';
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
