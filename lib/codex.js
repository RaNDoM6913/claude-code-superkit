import { existsSync, mkdirSync } from 'node:fs';
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
  const configSrc = join(packagesDir, 'codex', 'config.toml');
  const configDst = join(projectDir, '.codex', 'config.toml');
  if (!existsSync(configSrc)) {
    warn(`Codex config.toml missing at ${configSrc} — skipped (package may be incomplete)`);
  } else if (existsSync(configDst)) {
    warn('.codex/config.toml already exists — skipped to preserve consumer configuration');
  } else {
    copyFile(configSrc, configDst, 'fresh');
    info('Copied shipped Codex config template → .codex/config.toml');
  }

  const rulesSrc = join(packagesDir, 'codex', 'rules', 'default.rules');
  if (existsSync(rulesSrc)) {
    const rulesDir = join(projectDir, '.codex', 'rules');
    mkdirSync(rulesDir, { recursive: true });
    const rulesDst = join(rulesDir, 'default.rules');
    if (existsSync(rulesDst)) {
      warn('.codex/rules/default.rules already exists — skipped to preserve consumer approval rules');
    } else {
      copyFile(rulesSrc, rulesDst, 'fresh');
      info('Created .codex/rules/default.rules (approval policy DSL)');
    }
  }

  return skillCount;
}
