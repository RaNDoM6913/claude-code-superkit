import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nativeSkills = [
  'architect',
  'plan-checker',
  'evaluator',
  'goal-verifier',
  'critic',
  'reality-checker',
  'dev-orchestrator',
  'review-orchestrator',
  'minimal-change-engineer',
  'codebase-onboarding-engineer',
  'scaffold-endpoint',
  'ai-slop-cleaner',
];

function tempRepository(t) {
  const repository = mkdtempSync(join(tmpdir(), 'superkit-native-preservation-'));
  t.after(() => rmSync(repository, { recursive: true, force: true }));

  mkdirSync(join(repository, 'tools'), { recursive: true });
  mkdirSync(join(repository, 'packages/core/agents'), { recursive: true });
  mkdirSync(join(repository, 'packages/codex/skills'), { recursive: true });
  copyFileSync(
    join(root, 'tools/convert-agents-to-codex-skills.sh'),
    join(repository, 'tools/convert-agents-to-codex-skills.sh'),
  );
  copyFileSync(
    join(root, 'packages/codex/native-skills.txt'),
    join(repository, 'packages/codex/native-skills.txt'),
  );

  return repository;
}

function writeAgent(repository, name, body) {
  writeFileSync(
    join(repository, `packages/core/agents/${name}.md`),
    `---\nname: ${name}\ndescription: Claude Code agent ${name}\nmodel: opus\nallowed-tools: Read\n---\n${body}\n`,
  );
}

function runConverter(repository) {
  return spawnSync('bash', ['tools/convert-agents-to-codex-skills.sh'], {
    cwd: repository,
    encoding: 'utf8',
  });
}

test('converter preserves every declared native skill byte-for-byte and still converts other agents', (t) => {
  const repository = tempRepository(t);
  const nativeContents = new Map();

  for (const [index, name] of nativeSkills.entries()) {
    const content = Buffer.from(`native-${name}-${index}\n\u0000binary-safe\n`, 'utf8');
    nativeContents.set(name, content);
    mkdirSync(join(repository, `packages/codex/skills/${name}`), { recursive: true });
    writeFileSync(join(repository, `packages/codex/skills/${name}/SKILL.md`), content);
    writeAgent(repository, name, `claude-source-${name}`);
  }

  writeAgent(repository, 'ordinary-reviewer', 'Use the `Read` tool.');

  const result = runConverter(repository);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

  for (const [name, expected] of nativeContents) {
    assert.deepEqual(
      readFileSync(join(repository, `packages/codex/skills/${name}/SKILL.md`)),
      expected,
      `${name} must remain owned by its native Codex source`,
    );
  }

  const converted = readFileSync(
    join(repository, 'packages/codex/skills/ordinary-reviewer/SKILL.md'),
    'utf8',
  );
  assert.match(converted, /^name: ordinary-reviewer$/m);
  assert.match(converted, /Use the `file reads` tool\./);
  assert.doesNotMatch(converted, /model: opus|allowed-tools:/);
});

test('converter fails before conversion when a declared native skill is missing', (t) => {
  const repository = tempRepository(t);

  for (const name of nativeSkills) {
    writeAgent(repository, name, `claude-source-${name}`);
    if (name === 'critic') continue;
    mkdirSync(join(repository, `packages/codex/skills/${name}`), { recursive: true });
    writeFileSync(
      join(repository, `packages/codex/skills/${name}/SKILL.md`),
      `native-${name}\n`,
    );
  }
  writeAgent(repository, 'ordinary-reviewer', 'ordinary source');

  const result = runConverter(repository);

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /declared native Codex skill.*critic.*missing/i);
  assert.throws(() => {
    readFileSync(
      join(repository, 'packages/codex/skills/ordinary-reviewer/SKILL.md'),
      'utf8',
    );
  }, /ENOENT/);
});
