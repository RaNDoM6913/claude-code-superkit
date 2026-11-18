import { existsSync, readdirSync, mkdirSync, copyFileSync, readFileSync, statSync, realpathSync } from 'node:fs';
import { join, dirname, extname, basename } from 'node:path';
import { execSync, execFileSync } from 'node:child_process';

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

export function countFiles(dir, ext) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter(f => extname(f) === ext).length;
}

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

export function copyFile(src, dst, mode) {
  if (mode === 'merge' && existsSync(dst)) return false;
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  return true;
}

export function copyDir(srcDir, dstDir, mode, ext, exclude = []) {
  if (!existsSync(srcDir)) return 0;
  mkdirSync(dstDir, { recursive: true });
  let count = 0;
  for (const file of readdirSync(srcDir)) {
    const srcPath = join(srcDir, file);
    if (!statSync(srcPath).isFile()) continue;
    if (ext && extname(file) !== ext) continue;
    if (exclude.includes(file)) continue;
    if (copyFile(srcPath, join(dstDir, file), mode)) count++;
  }
  return count;
}

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

// ── Package names (stacks / extras) ─────────────────────
// Stack and extra names end up in paths and in .claude/.superkit-meta, which the
// SessionStart updater reads, so only plain names of packages that exist pass.
export const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
export const SELF_CONTAINED_PACKAGES = ['frontend-3d', 'frontend-ui'];

function subdirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(name => statSync(join(dir, name)).isDirectory());
}

export function knownStacks(packagesDir) {
  const names = new Set();
  for (const root of ['stack-agents', 'stack-hooks', 'stack-rules']) {
    for (const name of subdirs(join(packagesDir, root))) names.add(name);
  }
  for (const name of SELF_CONTAINED_PACKAGES) {
    if (existsSync(join(packagesDir, name))) names.add(name);
  }
  return [...names].filter(name => NAME_PATTERN.test(name)).sort();
}

// Extras the installer can install: a flat extras/<name>.md agent or a bundled
// extras/<name>/agent.md.
export function knownExtras(packagesDir) {
  const dir = join(packagesDir, 'extras');
  if (!existsSync(dir)) return [];
  const names = new Set();
  for (const entry of readdirSync(dir)) {
    if (entry.endsWith('.md') && statSync(join(dir, entry)).isFile()) names.add(entry.slice(0, -3));
    else if (existsSync(join(dir, entry, 'agent.md'))) names.add(entry);
  }
  return [...names].filter(name => NAME_PATTERN.test(name)).sort();
}

// → null when every name is valid, else a one-line error message.
export function invalidNamesError(kind, names, known) {
  for (const name of names) {
    if (typeof name !== 'string' || !NAME_PATTERN.test(name)) {
      return `Invalid ${kind} name ${JSON.stringify(String(name))} — names must match ${NAME_PATTERN.source}. Valid ${kind}s: ${known.join(', ')}`;
    }
    if (!known.includes(name)) {
      return `Unknown ${kind} "${name}". Valid ${kind}s: ${known.join(', ')}`;
    }
  }
  return null;
}

// releasedBlobs(rootDir, relPaths, maxTags) → Buffer[] of each relPath's content
// at the newest `maxTags` v* tags of the superkit clone at rootDir — the same
// "released pristine" notion superkit-update.sh uses. Best-effort: returns []
// when rootDir is not itself a git work-tree root (e.g. an npm/npx copy that
// happens to sit inside another repository) or on any git error.
export function releasedBlobs(rootDir, relPaths, maxTags = 5) {
  const git = args => execFileSync('git', ['-C', rootDir, ...args], { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024 });
  try {
    const top = git(['rev-parse', '--show-toplevel']).toString().trim();
    if (realpathSync(top) !== realpathSync(rootDir)) return [];
    const tags = git(['tag', '--list', 'v*', '--sort=-v:refname']).toString().split('\n').filter(Boolean).slice(0, maxTags);
    const blobs = [];
    for (const tag of tags) {
      for (const rel of relPaths) {
        try { blobs.push(git(['show', `${tag}:${rel}`])); } catch { /* path absent at this tag */ }
      }
    }
    return blobs;
  } catch {
    return [];
  }
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

export function getVersion() {
  const pkgPath = join(dirname(import.meta.url.replace('file://', '')), '..', 'package.json');
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
  } catch {
    return 'unknown';
  }
}
