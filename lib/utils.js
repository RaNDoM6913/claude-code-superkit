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

export function getVersion() {
  const pkgPath = join(dirname(import.meta.url.replace('file://', '')), '..', 'package.json');
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
  } catch {
    return 'unknown';
  }
}
