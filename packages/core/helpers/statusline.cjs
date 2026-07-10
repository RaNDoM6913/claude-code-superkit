#!/usr/bin/env node
// statusline.cjs — Claude Code status bar for superkit
// Shows: superkit version, git branch, model + effort (+ ⟁ULTRA badge),
//        context bar, and real 5h/weekly rate-limit bars. Every segment fail-open.
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

// ── Transcript tail scan (context fallback + ultracode marker) ────────────
// Reads only the trailing ~256KB of the JSONL transcript (respects the 2s
// render budget on huge transcripts), then scans BACKWARDS for the latest
// usage record, and — in the same pass — tracks the last `/effort` echo
// (`Set effort level to <value>`) so an ultracode session can show a badge.
// Caveat: a marker older than the trailing window is missed (badge silently
// off — fail-safe). Fully fail-open: any error → { used: null, ultra: false }.
function scanTranscriptTail(transcriptPath) {
  const empty = { used: null, ultra: false };
  try {
    if (typeof transcriptPath !== 'string' || !transcriptPath) return empty;
    const fd = openSync(transcriptPath, 'r');
    try {
      const size = fstatSync(fd).size;
      const readLen = Math.min(size, 262144);           // last ~256KB only
      const buf = Buffer.alloc(readLen);
      readSync(fd, buf, 0, readLen, size - readLen);
      const lines = buf.toString('utf8').split('\n');
      let used = null;
      let lastEffortCmd = null;
      for (const line of lines) {
        const m = line.match(/Set effort level to (\w+)/);
        if (m) lastEffortCmd = m[1];
      }
      for (let i = lines.length - 1; i >= 0; i--) {     // newest → oldest
        const line = lines[i].trim();
        if (!line || line[0] !== '{') continue;
        let obj;
        try { obj = JSON.parse(line); } catch { continue; }  // skip bad/truncated line
        const usage = (obj && obj.message && obj.message.usage) || (obj && obj.usage);
        if (usage && typeof usage === 'object'
            && ('input_tokens' in usage || 'cache_read_input_tokens' in usage
                || 'cache_creation_input_tokens' in usage)) {
          used = (usage.input_tokens || 0)
            + (usage.cache_read_input_tokens || 0)
            + (usage.cache_creation_input_tokens || 0);
          break;
        }
      }
      return { used, ultra: lastEffortCmd === 'ultracode' };
    } finally { closeSync(fd); }
  } catch { return empty; }
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

// ── Shared bar rendering (ctx + rate limits speak one visual language) ─────
function bar10(pct) {
  const filled = Math.max(0, Math.min(10, Math.round((pct / 100) * 10)));
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}
function heatColour(pct) {
  return pct >= 80 ? '\x1b[31m' : pct >= 50 ? '\x1b[33m' : '\x1b[32m';
}

function renderCtxPct(pct) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return `ctx ${heatColour(p)}${bar10(p)}\x1b[0m ${p}%`;
}
function renderCtx(used, max) {
  return renderCtxPct((used / max) * 100);
}

// ── Parse context budget from payload ─────────────────
// Claude Code 2.1.x sends context_window as an OBJECT:
//   { total_input_tokens, context_window_size, used_percentage, … }
// Older CLIs sent a bare token count there; the oldest sent nothing at all,
// in which case usage is measured from the transcript instead.
function getContextBudget(payload, scanned) {
  if (payload == null) return '';

  const cw = payload.context_window;

  if (cw && typeof cw === 'object') {
    // used_percentage is the number the CLI itself reports in /context — prefer
    // it, so the bar and /context can never disagree.
    if (typeof cw.used_percentage === 'number') return renderCtxPct(cw.used_percentage);
    if (typeof cw.total_input_tokens === 'number' && cw.context_window_size > 0) {
      return renderCtx(cw.total_input_tokens, cw.context_window_size);
    }
    // Object present but carries no usable numbers → fall through to the transcript.
  } else {
    const used = cw ?? payload.context_tokens_used ?? null;
    if (typeof used === 'number') {
      const max = payload.context_window_max ?? payload.context_tokens_max
        ?? (typeof process.env.CLAUDE_CONTEXT_TOKENS_MAX === 'string'
            ? parseInt(process.env.CLAUDE_CONTEXT_TOKENS_MAX, 10) || null
            : null)
        ?? 1000000;  // default: Opus 4.8 1M
      return renderCtx(used, max);
    }
  }

  // Fallback path: no usable native field → measured from the transcript.
  if (scanned && scanned.used != null) {
    // Model string: the '[1m]' marker rides on model.id (e.g. claude-opus-4-8[1m]);
    // combine id + display_name so either field can carry it.
    const m = payload.model;
    const modelString = typeof m === 'string'
      ? m
      : (m && typeof m === 'object' ? `${m.id || ''} ${m.display_name || ''}` : '');
    const max = resolveContextWindowTokens(scanned.used, modelString);
    return renderCtx(scanned.used, max);
  }
  return '';
}

// ── REAL 5h / weekly rate-limit bars ───────────────────────────────────────
// Claude Code pipes rate_limits.{five_hour,seven_day}.{used_percentage,
// resets_at} for Claude subscribers (same data as /usage). Absent (API-key
// billing, session start) → segments silently skipped.
function rateLimitSegments(payload) {
  const out = [];
  const rls = payload && payload.rate_limits;
  if (!rls || typeof rls !== 'object') return out;
  const seg = (label, rl) => {
    if (!rl || typeof rl !== 'object') return null;
    const pct = rl.used_percentage;
    if (typeof pct !== 'number' || !Number.isFinite(pct)) return null;
    const p = Math.max(0, Math.min(100, pct));
    // resets_at arrives as epoch seconds OR an ISO string depending on CLI build
    let resetSec = null;
    const r = rl.resets_at;
    if (typeof r === 'number' && r > 0) resetSec = r > 1e12 ? r / 1000 : r;
    else if (typeof r === 'string' && r) {
      const t = Date.parse(r);
      if (Number.isFinite(t)) resetSec = t / 1000;
    }
    let eta = '';
    if (resetSec) {
      let sLeft = Math.max(0, Math.round(resetSec - Date.now() / 1000));
      const d = Math.floor(sLeft / 86400);
      const h = Math.floor((sLeft % 86400) / 3600);
      const mm = Math.floor((sLeft % 3600) / 60);
      eta = d > 0 ? ` ${d}d${h}h` : h > 0 ? ` ${h}h${mm}m` : ` ${mm}m`;
    }
    return `${label} ${heatColour(p)}${bar10(p)}\x1b[0m ${Math.round(p)}%${eta}`;
  };
  const s5 = seg('5h', rls.five_hour);
  const sw = seg('W', rls.seven_day);
  if (s5) out.push(s5);
  if (sw) out.push(sw);
  return out;
}

// ── Build status line ──────────────────────────────────
const stdinPayload = readStdinPayload();

const git = getGitInfo();
const skVersion = getSuperkit();
const effortLevel = getEffortLevel(stdinPayload);
const tp = stdinPayload && typeof stdinPayload.transcript_path === 'string'
  ? stdinPayload.transcript_path : '';
const scanned = (tp && existsSync(tp)) ? scanTranscriptTail(tp) : { used: null, ultra: false };
const contextBudget = getContextBudget(stdinPayload, scanned);

const parts = [];

// Claude Code paints uncoloured statusline text muted gray → the git branch
// carries an explicit bright colour; CLAUDE_STATUSLINE_THEME=light flips it
// to black for light terminals.
const BRIGHT_FG = (process.env.CLAUDE_STATUSLINE_THEME || '').toLowerCase() === 'light' ? '\x1b[30m' : '\x1b[97m';

// Superkit version — bold magenta, leads the line.
if (skVersion) parts.push(`\x1b[1;35mv${skVersion}\x1b[0m`);

// Git branch + status (bright fg)
if (git.branch) {
  let branchStr = git.branch;
  if (git.staged) branchStr += '+';
  if (git.dirty) branchStr += '*';
  parts.push(`${BRIGHT_FG}${branchStr}\x1b[0m`);
}

// Model + effort (heat-graded) + ultracode badge.
// Model in cyan; effort BOLD, coloured by intensity (high=green, xhigh=yellow,
// max=red); ⟁ULTRA in bright magenta while the session's /effort is ultracode.
{
  const m = stdinPayload && stdinPayload.model;
  const modelName = m && typeof m === 'object' ? (m.display_name || m.id) : (typeof m === 'string' ? m : '');
  const effortColour = {
    low: '\x1b[1;94m', medium: '\x1b[1;96m', high: '\x1b[1;92m',
    xhigh: '\x1b[1;93m', max: '\x1b[1;91m',
  }[effortLevel] || '\x1b[1;96m';
  const effortStr = effortLevel ? `${effortColour}⚙${effortLevel}\x1b[0m` : '';
  const ultraStr = scanned.ultra ? '\x1b[1;95m⟁ULTRA\x1b[0m' : '';
  const segment = [modelName ? `\x1b[36m${modelName}\x1b[0m` : '', effortStr, ultraStr]
    .filter(Boolean).join(' ');
  if (segment) parts.push(segment);
}

// Context bar (native or transcript-derived) — absent on older CLIs w/o transcript
if (contextBudget) parts.push(contextBudget);

// Real 5h / weekly rate-limit bars (subscription sessions only)
for (const seg of rateLimitSegments(stdinPayload)) parts.push(seg);

process.stdout.write(parts.join(' | '));
