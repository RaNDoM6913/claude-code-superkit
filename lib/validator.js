import { existsSync, readFileSync, readdirSync, chmodSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { info, warn } from './utils.js';

export function validate(claudeDir, projectDir) {
  let ok = true;

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

  if (existsSync(join(projectDir, 'CLAUDE.md'))) {
    info('Validation: CLAUDE.md is present');
  } else {
    warn('Validation: CLAUDE.md is missing');
    ok = false;
  }

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
