import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function collectSkillFiles(dir = join(root, 'packages', 'codex', 'skills')) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      const skillPath = join(fullPath, 'SKILL.md');
      if (existsSync(skillPath)) files.push(skillPath);
    }
  }
  return files;
}

describe('Codex package assets', () => {
  it('uses current Codex model and reasoning effort names', () => {
    const config = read('packages/codex/config.toml');

    assert.match(config, /^model = "gpt-5\.5"$/m);
    assert.match(config, /^model_reasoning_effort = "xhigh"$/m);
    assert.doesNotMatch(config, /extra_high|gpt-5\.4/);
  });

  it('does not advertise legacy Codex model or reasoning names in active Codex docs', () => {
    const docs = [
      read('packages/codex/AGENTS.md'),
      read('packages/codex/INSTALL.md'),
      read('README.md'),
      read('lib/codex.js'),
      read('lib/installer.js')
    ].join('\n');

    assert.doesNotMatch(docs, /extra_high|gpt-5\.4/);
  });

  it('keeps the Codex skill authoring guide Codex-native', () => {
    const writingAgents = read('packages/codex/skills/writing-agents/SKILL.md');
    const writingCommands = read('packages/codex/skills/writing-commands/SKILL.md');
    const combined = `${writingAgents}\n${writingCommands}`;

    assert.match(combined, /spawn_agent/);
    assert.match(combined, /exec_command/);
    assert.doesNotMatch(combined, /allowed-tools:|model: opus|Agent tool|Claude Code Agents/);
  });

  it('normalizes future Claude agent conversions for Codex', () => {
    const converter = read('tools/convert-agents-to-codex-skills.sh');

    assert.match(converter, /normalize_body_for_codex/);
    assert.match(converter, /spawn_agent/);
    assert.match(converter, /apply_patch/);
    assert.match(converter, /update_plan/);
  });

  it('does not leave unambiguous Claude-only markers in Codex skills', () => {
    const offenders = [];
    const banned = [
      /allowed-tools:/,
      /model: opus/,
      /TodoWrite/,
      /Agent tool/,
      /Co-Authored-By: Claude <noreply@anthropic\.com>/
    ];

    for (const file of collectSkillFiles()) {
      const content = readFileSync(file, 'utf8');
      for (const pattern of banned) {
        if (pattern.test(content)) {
          offenders.push(`${file.replace(`${root}/`, '')}: ${pattern}`);
        }
      }
    }

    assert.deepEqual(offenders, []);
  });

  it('requires explicit user-invocable metadata on every Codex skill', () => {
    const offenders = [];

    for (const file of collectSkillFiles()) {
      const content = readFileSync(file, 'utf8');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/);
      if (!frontmatter || !/^user-invocable: (true|false)$/m.test(frontmatter[1])) {
        offenders.push(file.replace(`${root}/`, ''));
      }
    }

    assert.deepEqual(offenders, []);
  });

  it('prefers AGENTS.md whenever Codex skills ask for project context', () => {
    const offenders = [];

    for (const file of collectSkillFiles()) {
      const content = readFileSync(file, 'utf8');
      if (/CLAUDE\.md/.test(content) && !/AGENTS\.md/.test(content)) {
        offenders.push(file.replace(`${root}/`, ''));
      }
    }

    assert.deepEqual(offenders, []);
  });

  it('does not point Codex documentation review at Claude-only storage paths', () => {
    const docsReviewer = read('packages/codex/skills/docs-reviewer/SKILL.md');

    assert.doesNotMatch(docsReviewer, /\.claude\/agents|\.claude\/commands/);
    assert.match(docsReviewer, /\.codex\/skills/);
  });

  it('uses Codex workflow names instead of legacy slash-command pipeline names', () => {
    const offenders = [];
    const banned = [
      /\/dev workflow/,
      /\/dev orchestrator/,
      /`\/review`/,
      /\/review pipeline/,
      /\/docs-init/,
      /CLAUDE\.md`? or `?AGENTS\.md/
    ];

    for (const file of collectSkillFiles()) {
      const content = readFileSync(file, 'utf8');
      for (const pattern of banned) {
        if (pattern.test(content)) {
          offenders.push(`${file.replace(`${root}/`, '')}: ${pattern}`);
        }
      }
    }

    assert.deepEqual(offenders, []);
  });
});
