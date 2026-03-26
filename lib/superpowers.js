import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { info, warn, commandExists } from './utils.js';
import { confirm } from './prompts.js';

const CACHE_DIR = join(homedir(), '.claude', 'plugins', 'cache', 'claude-plugins-official', 'superpowers');
const REGISTRY_PATH = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');

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
  const tmpDir = join(tmpdir(), `superkit-sp-${Date.now()}`);

  try {
    execSync(`git clone --depth 1 https://github.com/obra/superpowers.git "${tmpDir}/superpowers"`, {
      stdio: 'pipe'
    });

    let version = 'latest';
    const manifestPath = join(tmpDir, 'superpowers', '.claude-plugin', 'plugin.json');
    if (existsSync(manifestPath)) {
      try {
        version = JSON.parse(readFileSync(manifestPath, 'utf8')).version || 'latest';
      } catch { /* use 'latest' */ }
    }

    const sha = execSync('git rev-parse HEAD', {
      cwd: join(tmpDir, 'superpowers'),
      stdio: 'pipe'
    }).toString().trim();

    const destDir = join(CACHE_DIR, version);
    mkdirSync(destDir, { recursive: true });
    cpSync(join(tmpDir, 'superpowers'), destDir, { recursive: true });

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
