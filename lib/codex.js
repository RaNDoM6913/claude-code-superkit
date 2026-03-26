import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { info, warn, copyFile, copySkills, commandExists } from './utils.js';

export function installCodex(projectDir, packagesDir, mode) {
  if (!commandExists('codex')) {
    warn('Codex CLI not found. Install: npm install -g @openai/codex');
    warn('Continuing with file setup anyway...');
  }

  const codexSkillsSrc = join(packagesDir, 'codex', 'skills');
  const codexSkillsDst = join(projectDir, '.codex', 'skills');
  const skillCount = copySkills(codexSkillsSrc, codexSkillsDst, mode);
  info(`Copied ${skillCount} Codex skills → .codex/skills/`);

  const agentsSrc = join(packagesDir, 'codex', 'AGENTS.md');
  const agentsDst = join(projectDir, 'AGENTS.md');
  if (!existsSync(agentsDst)) {
    copyFile(agentsSrc, agentsDst, 'fresh');
    info('Created AGENTS.md template');
  } else {
    warn('AGENTS.md already exists — skipped');
  }

  mkdirSync(join(projectDir, '.codex'), { recursive: true });
  copyFileSync(
    join(packagesDir, 'codex', 'config.toml'),
    join(projectDir, '.codex', 'config.toml')
  );
  info('Created .codex/config.toml (gpt-5.4, extra_high reasoning)');

  return skillCount;
}
