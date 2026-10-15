import { lstatSync, readlinkSync, linkSync, symlinkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, renameSync, unlinkSync, openSync, closeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { info, warn, commandExists } from './utils.js';

const MANIFEST = '.codex/.superkit-manifest.json';
const BACKUPS = '.codex/.superkit-backups';
const LOCK = '.codex/.superkit-install.lock';
const HOOK_ASSETS = ['hooks/superkit.mjs', 'superkit-hooks.json'];
const skillName = /^[a-z0-9][a-z0-9-]*$/;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function stat(path) {
  try { return lstatSync(path); } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// Do not follow even dangling links, nor write through a linked ancestor.
// The caller owns the project directory; concurrent external edits are unsupported.
function checkPath(root, relative, directory = false) {
  const parts = relative.split('/');
  for (let i = 0; i < parts.length; i++) {
    const path = join(root, ...parts.slice(0, i + 1));
    const entry = stat(path);
    if (!entry) continue;
    if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${path}`);
    const needDirectory = i < parts.length - 1 || directory;
    if (needDirectory ? !entry.isDirectory() : !entry.isFile()) {
      throw new Error(`Expected ${needDirectory ? 'directory' : 'regular file'}: ${path}`);
    }
  }
}

function readHashes(path, manifest) {
  let record;
  try {
    record = JSON.parse(readFileSync(path, 'utf8'));
    if (!record || (manifest && record.schemaVersion !== 1) ||
        (!manifest && (record.version !== '1.5.2' || !/^[a-f0-9]{40}$/.test(record.sourceCommit))) ||
        !record.skills || typeof record.skills !== 'object' || Array.isArray(record.skills) ||
        Object.entries(record.skills).some(([name, hash]) => !skillName.test(name) || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) ||
        (manifest && record.assets !== undefined && (!record.assets || typeof record.assets !== 'object' || Array.isArray(record.assets) ||
          Object.entries(record.assets).some(([name, hash]) => !HOOK_ASSETS.includes(name) || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))))) {
      throw new Error('unsupported schema or invalid skill hashes');
    }
  } catch (err) {
    throw new Error(`Invalid Codex ${manifest ? 'manifest' : 'baseline'} at ${path}: ${err.message}`);
  }
  return record;
}

function loadPackage(packagesDir) {
  const root = join(packagesDir, 'codex');
  const templates = [
    ['AGENTS.md', 'AGENTS.md', 'Created AGENTS.md template'],
    ['config.toml', '.codex/config.toml', 'Copied shipped Codex config template → .codex/config.toml'],
    ['rules/default.rules', '.codex/rules/default.rules', 'Created .codex/rules/default.rules (approval policy DSL)']
  ].map(([source, destination, message]) => {
    checkPath(root, source);
    return { destination, message, bytes: readFileSync(join(root, source)) };
  });
  checkPath(root, 'skills', true);
  const skills = [];
  for (const name of readdirSync(join(root, 'skills')).sort()) {
    if (!skillName.test(name)) throw new Error(`Invalid packaged Codex skill name: ${name}`);
    const source = `skills/${name}/SKILL.md`;
    checkPath(root, source);
    const bytes = readFileSync(join(root, source));
    skills.push({ name, destination: `.codex/${source}`, bytes, hash: digest(bytes) });
  }
  if (!skills.length) throw new Error('Codex package contains no skills');
  checkPath(root, 'legacy-baseline.json');
  const baseline = readHashes(join(root, 'legacy-baseline.json'), false).skills;
  const assets = HOOK_ASSETS.map(name => {
    const source = name === 'superkit-hooks.json' ? 'hooks.json' : name;
    checkPath(root, source);
    const bytes = readFileSync(join(root, source));
    if (source === 'hooks.json') {
      const definition = JSON.parse(bytes.toString('utf8'));
      if (!definition?.hooks || typeof definition.hooks !== 'object' || Array.isArray(definition.hooks) ||
          Object.values(definition.hooks).some(groups => !Array.isArray(groups) || groups.some(group =>
            !group || (group.matcher !== undefined && typeof group.matcher !== 'string') ||
            !Array.isArray(group.hooks) || !group.hooks.length || group.hooks.some(handler =>
              !handler || handler.type !== 'command' || typeof handler.command !== 'string' || !handler.command.trim() ||
              (handler.timeout !== undefined && (!Number.isFinite(handler.timeout) || handler.timeout <= 0)))))) {
        throw new Error('Invalid packaged hooks.json: expected command hook groups');
      }
    }
    return { name, destination: `.codex/${name}`, bytes, hash: digest(bytes) };
  });
  return { skills, templates, baseline, assets };
}

function writeAtomic(root, relative, bytes) {
  checkPath(root, relative);
  const path = join(root, relative);
  const previous = stat(path);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, bytes, { flag: 'wx', mode: previous ? previous.mode & 0o777 : 0o644 });
    if (previous) {
      renameSync(temporary, path);
    } else {
      // Atomic publication without replacing a destination that appeared meanwhile.
      linkSync(temporary, path);
    }
  } finally {
    if (stat(temporary)) unlinkSync(temporary);
  }
}

// Intentionally independent of Claude's fresh/merge/overwrite selection.
// Extra legacy arguments are ignored, preserving the former call signature.
export function installCodex(projectDir, packagesDir) {
  const { skills, templates, baseline, assets } = loadPackage(packagesDir);
  const hadCodex = Boolean(stat(join(projectDir, '.codex')));
  for (const relative of [MANIFEST, LOCK, '.codex/hooks.json', ...skills.map(s => s.destination), ...assets.map(a => a.destination), ...templates.map(t => t.destination)]) {
    checkPath(projectDir, relative);
  }
  checkPath(projectDir, BACKUPS, true);
  checkPath(projectDir, '.agents/skills', true);
  const manifestFile = join(projectDir, MANIFEST);
  const hadManifest = Boolean(stat(manifestFile));
  // Validate before creating even the lock or target directory.
  const previousState = hadManifest ? readHashes(manifestFile, true) : { skills: baseline };
  const previous = previousState.skills;
  const configPath = join(projectDir, '.codex/config.toml');
  // Unknown configuration may already contain inline hooks. Never silently add
  // a second active source beside it; supply a separate merge template instead.
  const canCreateHookConfig = !stat(configPath) || readFileSync(configPath).equals(templates.find(t => t.destination === '.codex/config.toml').bytes);
  if (stat(join(projectDir, LOCK))) throw new Error(`Codex install lock exists: ${join(projectDir, LOCK)}. Check for another installer before removing a stale lock.`);
  mkdirSync(join(projectDir, '.codex'), { recursive: true });
  const lock = openSync(join(projectDir, LOCK), 'wx');
  closeSync(lock);
  try {
    if (!commandExists('codex')) {
      warn('Codex CLI not found. Install: npm install -g @openai/codex');
      warn('Continuing with file setup anyway...');
    }
    const managed = { ...(hadManifest ? previous : {}) };
    const additions = [];
    const updates = [];
    let unchanged = 0;
    let conflicts = 0;
    let recognizedLegacy = false;
    for (const skill of skills) {
      const destination = join(projectDir, skill.destination);
      if (!stat(destination)) {
        additions.push(skill);
        managed[skill.name] = skill.hash;
        continue;
      }
      const oldBytes = readFileSync(destination);
      const oldHash = digest(oldBytes);
      if (!hadManifest && oldHash === previous[skill.name]) recognizedLegacy = true;
      if (oldHash === skill.hash) {
        unchanged++;
        managed[skill.name] = skill.hash;
      } else if (oldHash === previous[skill.name]) {
        updates.push({ ...skill, oldBytes });
        managed[skill.name] = skill.hash;
      } else {
        conflicts++;
        warn(`CONFLICT preserved ${skill.destination} — custom or unrecognized content; compare with packages/codex/skills/${skill.name}/SKILL.md`);
      }
    }
    const managedAssets = { ...(previousState.assets || {}) };
    const assetAdditions = [];
    const assetUpdates = [];
    let assetConflicts = 0;
    for (const asset of assets) {
      const destination = join(projectDir, asset.destination);
      if (!stat(destination)) {
        assetAdditions.push(asset);
        managedAssets[asset.name] = asset.hash;
        continue;
      }
      const oldBytes = readFileSync(destination);
      const oldHash = digest(oldBytes);
      if (oldHash === asset.hash) {
        managedAssets[asset.name] = asset.hash;
      } else if (oldHash === previousState.assets?.[asset.name]) {
        assetUpdates.push({ ...asset, oldBytes });
        managedAssets[asset.name] = asset.hash;
      } else {
        assetConflicts++;
        warn(`CONFLICT preserved ${asset.destination} — review custom hook assets before trusting or merging hooks`);
      }
    }
    const replacements = [...updates, ...assetUpdates];
    const mode = !hadCodex ? 'fresh' : hadManifest || recognizedLegacy ? 'upgrade' : 'merge';
    info(`Codex mode: ${mode} (independent of .claude)`);

    // Finish all backups before the first replacement. Never reuse/delete an old backup.
    if (replacements.length) {
      mkdirSync(join(projectDir, BACKUPS), { recursive: true });
      const backup = mkdtempSync(join(projectDir, BACKUPS, `${new Date().toISOString().replace(/[:.]/g, '-')}-`));
      for (const skill of replacements) {
        const relative = skill.destination.slice('.codex/'.length);
        mkdirSync(dirname(join(backup, relative)), { recursive: true });
        writeFileSync(join(backup, relative), skill.oldBytes, { flag: 'wx' });
      }
      if (hadManifest) writeFileSync(join(backup, '.superkit-manifest.json'), readFileSync(manifestFile), { flag: 'wx' });
      info(`Codex backup: ${backup}`);
    }
    for (const skill of [...additions, ...assetAdditions, ...replacements]) writeAtomic(projectDir, skill.destination, skill.bytes);
    for (const template of templates) {
      if (stat(join(projectDir, template.destination))) {
        warn(`${template.destination} already exists — skipped to preserve consumer configuration/instructions`);
      } else {
        writeAtomic(projectDir, template.destination, template.bytes);
        info(template.message);
      }
    }
    const hookConfig = '.codex/hooks.json';
    if (!stat(join(projectDir, hookConfig)) && canCreateHookConfig && !assetConflicts) {
      writeAtomic(projectDir, hookConfig, assets.find(a => a.name === 'superkit-hooks.json').bytes);
      info('Created .codex/hooks.json — hooks are configured, not trusted');
    } else {
      warn('Hook definitions preserved/not auto-merged; compare .codex/superkit-hooks.json with your active hooks.json or inline [hooks] configuration');
    }
    info('Review installed hook scripts and use /hooks to review/trust definitions in a trusted project. Installer does not grant hook trust.');
    mkdirSync(join(projectDir, '.agents/skills'), { recursive: true });
    for (const skill of skills) {
      const link = join(projectDir, '.agents/skills', skill.name);
      const target = `../../.codex/skills/${skill.name}`;
      const existing = stat(link);
      if (!existing) {
        symlinkSync(target, link, 'dir');
      } else if (!existing.isSymbolicLink() || readlinkSync(link) !== target) {
        warn(`DISCOVERY CONFLICT preserved .agents/skills/${skill.name} — installed Superkit skill is at ${skill.destination}; choose your active skill manually`);
      }
    }
    const manifestBytes = JSON.stringify({ schemaVersion: 1, skills: managed, assets: managedAssets }, null, 2) + '\n';
    if (!hadManifest || readFileSync(manifestFile, 'utf8') !== manifestBytes) writeAtomic(projectDir, MANIFEST, manifestBytes);
    info(`Codex skills: ${additions.length} added, ${updates.length} updated, ${unchanged} unchanged, ${conflicts} conflicts preserved`);
    info(`Codex hook assets: ${assetAdditions.length} added, ${assetUpdates.length} updated, ${assetConflicts} conflicts preserved`);
    if (conflicts) warn('Review preserved conflicts manually; new upstream skill content was not applied to those files.');
    return additions.length + updates.length;
  } finally {
    unlinkSync(join(projectDir, LOCK));
  }
}
