import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { extname, posix, resolve, sep } from 'node:path';

import { measureTokens } from '../../bin/measure-tokens.js';

export const KINDS = new Set([
  'agent', 'command', 'skill', 'rule', 'hook', 'reference', 'package',
  'test', 'tool', 'doc', 'config', 'asset',
]);

export const OWNERS = new Set([
  'claude', 'codex-native', 'shared-generated', 'example', 'repo-internal',
  'historical',
]);

export const STATUSES = new Set([
  'pending', 'in-progress', 'verified', 'preserved', 'deferred', 'retired',
]);

export const WAVES = new Set([
  'W00A', 'W00B', 'W01', 'W02A', 'W02B', 'W03A', 'W03B', 'W04A', 'W04B',
  'W04C', 'W05A', 'W05B', 'W05C', 'W05D', 'W05E', 'W05F', 'W06A', 'W06B',
  'W06C', 'W06D', 'W06E', 'W06F', 'W06G', 'W06H', 'W07A', 'W07B', 'W07C',
  'W08A', 'W08B', 'W09', 'W10A', 'W10B', 'historical/preserved',
]);

const PROMPT_KINDS = new Set(['agent', 'command', 'skill', 'rule']);

function gitPaths(root, args) {
  const output = execFileSync('git', args, { cwd: root, encoding: 'buffer' });
  return output.toString('utf8').split('\0').filter(Boolean);
}

export function classifySurface(path) {
  const name = posix.basename(path);
  const extension = extname(name).toLowerCase();

  if ((/\/(agents?|\.claude\/agents)\//.test(`/${path}`) || path.startsWith('packages/stack-agents/')) && extension === '.md' && !path.includes('/references/')) return 'agent';
  if (/^packages\/extras\/(?:[^/]+-reviewer\.md|red-blue-auditor\/agent\.md)$/.test(path)) return 'agent';
  if (/\/commands\//.test(`/${path}`) && extension === '.md') return 'command';
  if (/\/references?\//.test(`/${path}`)) return 'reference';
  if (name === 'SKILL.md' || /\/skills\//.test(`/${path}`)) return 'skill';
  if (/\/(?:rules|stack-rules)\//.test(`/${path}`) || extension === '.rules') return 'rule';
  if (/\/(?:hooks?|stack-hooks)\//.test(`/${path}`)) {
    if (path.includes('/tests/')) return 'test';
    return extension === '.md' ? 'doc' : 'hook';
  }
  if (path.startsWith('test/') || /(?:^|\/)tests?\//.test(path) || /(?:^|_)test\.[^.]+$/.test(name)) return 'test';
  if (path.startsWith('tools/') || path.startsWith('bin/') || path.startsWith('lib/') || path === 'setup.sh') return 'tool';
  if (name === 'package.json' || name === 'package-lock.json' || name === 'INTERNAL-FILES') return 'package';
  if (['.json', '.toml', '.yaml', '.yml', '.npmignore', '.gitignore'].includes(extension) || name.startsWith('.')) return 'config';
  if (extension === '.md' || extension === '.txt') return 'doc';
  return 'asset';
}

export function collectSurfaces(root) {
  const tracked = gitPaths(root, ['ls-files', '-z']);
  const untracked = gitPaths(root, ['ls-files', '--others', '--exclude-standard', '-z']);
  const trackedSet = new Set(tracked);
  const rootAbsolute = resolve(root);
  const rootReal = realpathSync(rootAbsolute);
  const paths = [...new Set([...tracked, ...untracked])].sort();

  return paths.flatMap((path) => {
    const absolutePath = resolve(rootAbsolute, path);
    if (absolutePath !== rootAbsolute && !absolutePath.startsWith(`${rootAbsolute}${sep}`)) {
      throw new Error(`git returned a path outside repository root: ${path}`);
    }
    let stat;
    try {
      stat = lstatSync(absolutePath);
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
    const bytes = stat.isSymbolicLink()
      ? Buffer.from(readlinkSync(absolutePath), 'utf8')
      : (() => {
          const realPath = realpathSync(absolutePath);
          if (realPath !== rootReal && !realPath.startsWith(`${rootReal}${sep}`)) {
            throw new Error(`git path resolves outside repository root: ${path}`);
          }
          return readFileSync(realPath);
        })();
    const kind = classifySurface(path);
    return [{
      path,
      kind,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      tokensApprox: stat.isFile() && (PROMPT_KINDS.has(kind) || /(?:^|\/)(?:AGENTS|CLAUDE)\.md$/.test(path)) && /\.(?:md|rules)$/.test(path)
        ? measureTokens(absolutePath)
        : null,
      tracked: trackedSet.has(path),
    }];
  });
}

function validDeferral(deferral) {
  return deferral
    && typeof deferral.reason === 'string' && deferral.reason.trim()
    && typeof deferral.owner === 'string' && deferral.owner.trim()
    && typeof deferral.followUp === 'string' && deferral.followUp.trim()
    && typeof deferral.approvedBy === 'string' && deferral.approvedBy.trim()
    && deferral.nonCritical === true;
}

export function reconcileLedger(surfaces, ledger) {
  const rows = Array.isArray(ledger?.surfaces) ? ledger.surfaces : [];
  const actual = new Map(surfaces.map((surface) => [surface.path, surface]));
  const counts = new Map();
  for (const row of rows) counts.set(row.path, (counts.get(row.path) ?? 0) + 1);

  const known = new Set(rows.map((row) => row.path));
  const missing = [...actual.keys()].filter((path) => !known.has(path)).sort();
  const stale = rows
    .filter((row) => !actual.has(row.path) && row.status !== 'retired')
    .map((row) => row.path)
    .sort();
  const errors = [];

  for (const [path, count] of counts) {
    if (count > 1) errors.push(`duplicate ledger path: ${path}`);
  }

  for (const row of rows) {
    const label = row.path || '<missing path>';
    if (!KINDS.has(row.kind)) errors.push(`${label}: invalid kind ${String(row.kind)}`);
    if (!OWNERS.has(row.owner)) errors.push(`${label}: invalid or ambiguous owner ${String(row.owner)}`);
    if (!WAVES.has(row.wave)) errors.push(`${label}: invalid wave ${String(row.wave)}`);
    if (!STATUSES.has(row.status)) errors.push(`${label}: invalid status ${String(row.status)}`);
    if (!Array.isArray(row.mirrors)) errors.push(`${label}: mirrors must be an array`);
    if (!Array.isArray(row.evidence)) errors.push(`${label}: evidence must be an array`);
    if (typeof row.rationale !== 'string' || !row.rationale.trim()) errors.push(`${label}: missing rationale`);
    if (row.wave !== 'historical/preserved' && ['preserved', 'verified'].includes(row.status) && (!Array.isArray(row.evidence) || row.evidence.length === 0)) {
      errors.push(`${label}: ${row.status} row requires evidence`);
    }
    if (row.status === 'deferred' && !validDeferral(row.deferral)) {
      errors.push(`${label}: deferred row requires reason, owner, followUp, approvedBy, and nonCritical=true`);
    }
    if (row.status === 'retired' && !(typeof row.replacement === 'string' && row.replacement.trim())) {
      errors.push(`${label}: retired row requires a replacement`);
    }
    for (const mirror of Array.isArray(row.mirrors) ? row.mirrors : []) {
      if (!actual.has(mirror)) errors.push(`${label}: mirror does not exist: ${mirror}`);
    }
    for (const evidence of Array.isArray(row.evidence) ? row.evidence : []) {
      if (!actual.has(evidence)) errors.push(`${label}: evidence does not exist: ${evidence}`);
    }
    const surface = actual.get(row.path);
    if (surface && surface.kind !== row.kind) {
      errors.push(`${label}: ledger kind ${row.kind} does not match inventory kind ${surface.kind}`);
    }
  }

  return { missing, stale, errors: errors.sort() };
}
