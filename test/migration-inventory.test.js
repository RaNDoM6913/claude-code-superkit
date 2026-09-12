import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  classifySurface,
  collectSurfaces,
  reconcileLedger,
} from '../tools/lib/migration-inventory.mjs';
import {
  capture,
  loadSuiteEvidence,
  mirrorsForPath,
  ownershipForPath,
  scanStaleClaims,
} from '../tools/superkit-inventory.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function tempDirectory(t, prefix) {
  const path = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}

function tempRepository(t, prefix) {
  const path = tempDirectory(t, prefix);
  execFileSync('git', ['init', '-q'], { cwd: path });
  return path;
}

const REQUIRED_COMMANDS = [
  ['npm', 'test'],
  ['npm', 'run', 'test:smoke'],
  ['bash', 'packages/core/hooks/tests/run-all.sh'],
  ['bash', 'packages/frontend-ui/hooks/tests/ui-color-check_test.sh'],
  ['bash', 'packages/frontend-ui/hooks/tests/ui-animation-easing-check_test.sh'],
  ['bash', 'packages/frontend-ui/hooks/tests/ui-banned-fonts-check_test.sh'],
  ['bash', 'bin/superkit-counts-verify.sh'],
];

function suiteFixture(t, {
  failedCommand = null,
  rerunCommand = ['bash', 'packages/core/hooks/tests/dev-required-on-commit_test.sh'],
  rerunExitCode = 0,
  coreStdout = 'Summary: 14 suites passed, 1 failed\nFailed suites:\n  - dev-required-on-commit_test.sh\n',
  coreStderr = '<home>/.claude/state/dev-cycles-test-dev-required-<pid>.jsonl: Operation not permitted\n',
} = {}) {
  const fixtureRoot = tempDirectory(t, 'superkit-suite-evidence-');
  const evidenceRoot = join(fixtureRoot, 'docs/superpowers/migrations/astra-native/evidence/W00A/baseline');
  mkdirSync(evidenceRoot, { recursive: true });
  const summary = REQUIRED_COMMANDS.map((command, index) => {
    const slug = `command-${index}`;
    writeFileSync(join(evidenceRoot, `${slug}.stdout.txt`), command[1] === 'packages/core/hooks/tests/run-all.sh' ? coreStdout : 'PASS\n');
    writeFileSync(join(evidenceRoot, `${slug}.stderr.txt`), command[1] === 'packages/core/hooks/tests/run-all.sh' ? coreStderr : '');
    return { command, exitCode: JSON.stringify(command) === JSON.stringify(failedCommand) ? 1 : 0, stdoutPath: `${slug}.stdout.txt`, stderrPath: `${slug}.stderr.txt` };
  });
  writeFileSync(join(evidenceRoot, 'summary.json'), `${JSON.stringify(summary)}\n`);
  writeFileSync(join(evidenceRoot, 'rerun.stdout.txt'), 'Results: 18 passed, 0 failed\n');
  writeFileSync(join(evidenceRoot, 'rerun.stderr.txt'), '');
  writeFileSync(join(evidenceRoot, 'dev-required-elevated.json'), `${JSON.stringify({ command: rerunCommand, exitCode: rerunExitCode, stdoutPath: 'rerun.stdout.txt', stderrPath: 'rerun.stderr.txt' })}\n`);
  return { fixtureRoot, evidenceRoot };
}

test('an unowned nested surface fails inventory gate', () => {
  const surfaces = [{ path: 'packages/showcase/.claude/agents/a.md', kind: 'agent' }];
  assert.deepEqual(
    reconcileLedger(surfaces, { surfaces: [] }).missing,
    ['packages/showcase/.claude/agents/a.md'],
  );
});

test('deleted source is not silently forgotten', () => {
  const ledger = {
    surfaces: [{ path: 'packages/gan/skills/g/SKILL.md', status: 'pending' }],
  };
  assert.deepEqual(reconcileLedger([], ledger).stale, [
    'packages/gan/skills/g/SKILL.md',
  ]);
});

test('collectSurfaces includes tracked hidden files and untracked source files', (t) => {
  const root = tempRepository(t, 'superkit-inventory-');

  mkdirSync(join(root, 'packages/showcase/.claude/agents'), { recursive: true });
  mkdirSync(join(root, 'tools'), { recursive: true });
  writeFileSync(join(root, 'packages/showcase/.claude/agents/a.md'), '# Agent\n');
  writeFileSync(join(root, 'tools/new-tool.mjs'), 'export {};\n');
  execFileSync('git', ['add', 'packages/showcase/.claude/agents/a.md'], { cwd: root });

  assert.deepEqual(
    collectSurfaces(root).map(({ path, tracked }) => ({ path, tracked })),
    [
      { path: 'packages/showcase/.claude/agents/a.md', tracked: true },
      { path: 'tools/new-tool.mjs', tracked: false },
    ],
  );
});

test('reconcileLedger reports invalid ownership instead of guessing it closed', () => {
  const surfaces = [{ path: 'mystery/file.xyz', kind: 'asset' }];
  const ledger = {
    surfaces: [{
      path: 'mystery/file.xyz',
      kind: 'asset',
      owner: 'ambiguous',
      wave: 'W08A',
      status: 'pending',
      mirrors: [],
      rationale: '',
      deferral: null,
    }],
  };

  assert.match(reconcileLedger(surfaces, ledger).errors.join('\n'), /owner/);
});

test('retired and deferred rows require explicit disposition evidence', () => {
  const surfaces = [{ path: 'docs/a.md', kind: 'doc' }];
  const ledger = {
    surfaces: [
      {
        path: 'gone.md', kind: 'doc', owner: 'historical', wave: 'historical/preserved',
        status: 'retired', mirrors: [], rationale: 'Superseded', deferral: null,
      },
      {
        path: 'docs/a.md', kind: 'doc', owner: 'repo-internal', wave: 'W10A',
        status: 'deferred', mirrors: [], rationale: 'Later documentation pass',
        deferral: { reason: 'Waiting', owner: '', followUp: '', approvedBy: '', nonCritical: true },
      },
    ],
  };

  const errors = reconcileLedger(surfaces, ledger).errors.join('\n');
  assert.match(errors, /retired.*replacement/i);
  assert.match(errors, /deferred.*owner/i);
});

test('a mirror must exist in the current inventory even if another row names it', () => {
  const surfaces = [{ path: 'packages/codex/skills/a/SKILL.md', kind: 'skill' }];
  const ledger = {
    surfaces: [
      {
        path: 'packages/codex/skills/a/SKILL.md', kind: 'skill', owner: 'codex-native',
        wave: 'W05A', status: 'pending', mirrors: ['packages/core/agents/a.md'],
        rationale: 'Explicit native counterpart', deferral: null,
      },
      {
        path: 'packages/core/agents/a.md', kind: 'agent', owner: 'claude',
        wave: 'W05A', status: 'retired', mirrors: [], rationale: 'Removed',
        replacement: 'packages/codex/skills/a/SKILL.md', deferral: null,
      },
    ],
  };

  assert.match(reconcileLedger(surfaces, ledger).errors.join('\n'), /mirror does not exist/);
});

test('classification recognizes stack reviewers and stack hook programs', () => {
  assert.equal(classifySurface('packages/stack-agents/go/go-reviewer.md'), 'agent');
  assert.equal(classifySurface('packages/stack-hooks/go/go-format-on-edit.sh'), 'hook');
  assert.equal(classifySurface('packages/stack-rules/go/go-safety.md'), 'rule');
  assert.equal(classifySurface('packages/a/skills/b/references/guide.md'), 'reference');
});

test('collectSurfaces omits a tracked file deleted from the working tree for stale reconciliation', (t) => {
  const root = tempRepository(t, 'superkit-inventory-deleted-');
  writeFileSync(join(root, 'deleted.md'), '# Delete me\n');
  execFileSync('git', ['add', 'deleted.md'], { cwd: root });
  rmSync(join(root, 'deleted.md'));

  assert.deepEqual(collectSurfaces(root), []);
});

test('collectSurfaces hashes a symlink itself without reading its external target', (t) => {
  const root = tempRepository(t, 'superkit-inventory-link-');
  symlinkSync('/etc/passwd', join(root, 'external-link'));
  execFileSync('git', ['add', 'external-link'], { cwd: root });

  const [surface] = collectSurfaces(root);
  assert.equal(surface.sha256, createHash('sha256').update('/etc/passwd').digest('hex'));
});

test('collectSurfaces measures instruction files but not ordinary documentation', (t) => {
  const root = tempRepository(t, 'superkit-inventory-prompts-');
  writeFileSync(join(root, 'AGENTS.md'), 'Always verify evidence.\n');
  writeFileSync(join(root, 'README.md'), 'Human documentation.\n');
  execFileSync('git', ['add', 'AGENTS.md', 'README.md'], { cwd: root });

  const byPath = new Map(collectSurfaces(root).map((surface) => [surface.path, surface]));
  assert.equal(typeof byPath.get('AGENTS.md').tokensApprox, 'number');
  assert.equal(byPath.get('README.md').tokensApprox, null);
});

test('reconcileLedger rejects an invented migration wave', () => {
  const surfaces = [{ path: 'docs/a.md', kind: 'doc' }];
  const ledger = { surfaces: [{
    path: 'docs/a.md', kind: 'doc', owner: 'repo-internal', wave: 'later-ish',
    status: 'pending', mirrors: [], rationale: 'Unclear assignment', deferral: null,
  }] };

  assert.match(reconcileLedger(surfaces, ledger).errors.join('\n'), /invalid wave/);
});

test('nonhistorical preserved and verified rows require existing evidence surfaces', () => {
  const surfaces = [
    { path: 'packages/core/skills/project-scanner/SKILL.md', kind: 'skill' },
    { path: 'evidence/review.md', kind: 'doc' },
  ];
  const ledger = { surfaces: [
    { path: 'packages/core/skills/project-scanner/SKILL.md', kind: 'skill', owner: 'claude', wave: 'W08A', status: 'preserved', mirrors: [], rationale: 'Compatible', evidence: [], deferral: null },
    { path: 'evidence/review.md', kind: 'doc', owner: 'repo-internal', wave: 'W08A', status: 'verified', mirrors: [], rationale: 'Reviewed', evidence: ['evidence/missing.md'], deferral: null },
  ] };

  const errors = reconcileLedger(surfaces, ledger).errors.join('\n');
  assert.match(errors, /preserved.*evidence/i);
  assert.match(errors, /evidence does not exist/i);
});

test('capture refuses to overwrite initialized artifacts without mutating any file', (t) => {
  const output = tempDirectory(t, 'superkit-capture-refusal-');
  const originals = new Map([
    ['ledger.json', '{"surfaces":[{"status":"verified","evidence":["review.md"]}]}\n'],
    ['baseline.json', '{"immutable":true}\n'],
    ['README.md', '# Reviewed migration progress\n'],
  ]);
  for (const [name, content] of originals) writeFileSync(join(output, name), content);

  assert.throws(() => capture(root, output), /already initialized/i);
  for (const [name, content] of originals) assert.equal(readFileSync(join(output, name), 'utf8'), content);
});

test('baseline evidence is incomplete when the required summary is empty', (t) => {
  const { fixtureRoot, evidenceRoot } = suiteFixture(t);
  writeFileSync(join(evidenceRoot, 'summary.json'), '[]\n');
  assert.equal(loadSuiteEvidence(fixtureRoot).status, 'incomplete');
});

test('baseline evidence is incomplete when a referenced output file is missing', (t) => {
  const { fixtureRoot, evidenceRoot } = suiteFixture(t);
  rmSync(join(evidenceRoot, 'command-0.stdout.txt'));
  assert.equal(loadSuiteEvidence(fixtureRoot).status, 'incomplete');
});

test('baseline evidence fails when the core failure has no successful focused rerun', (t) => {
  const core = ['bash', 'packages/core/hooks/tests/run-all.sh'];
  const missing = suiteFixture(t, { failedCommand: core });
  rmSync(join(missing.evidenceRoot, 'dev-required-elevated.json'));
  assert.equal(loadSuiteEvidence(missing.fixtureRoot).status, 'fail');

  const nonzero = suiteFixture(t, { failedCommand: core, rerunExitCode: 1 });
  assert.equal(loadSuiteEvidence(nonzero.fixtureRoot).status, 'fail');

  const mismatched = suiteFixture(t, { failedCommand: core, rerunCommand: ['bash', 'some-other-test.sh'] });
  assert.equal(loadSuiteEvidence(mismatched.fixtureRoot).status, 'fail');
});

test('baseline evidence fails for an unrelated command failure even when a rerun exists', (t) => {
  const { fixtureRoot } = suiteFixture(t, { failedCommand: ['npm', 'test'] });
  assert.equal(loadSuiteEvidence(fixtureRoot).status, 'fail');
});

test('baseline evidence accepts only the exact documented environment resolution', (t) => {
  const { fixtureRoot } = suiteFixture(t, { failedCommand: ['bash', 'packages/core/hooks/tests/run-all.sh'] });
  assert.equal(loadSuiteEvidence(fixtureRoot).status, 'pass-with-environment-resolution');
});

test('baseline evidence rejects another suite in the final failed-suite footer', (t) => {
  const { fixtureRoot } = suiteFixture(t, {
    failedCommand: ['bash', 'packages/core/hooks/tests/run-all.sh'],
    coreStdout: '── Running dev-required-on-commit_test.sh\nSummary: 14 suites passed, 1 failed\nFailed suites:\n  - doc-check-on-commit_test.sh\n',
  });
  assert.equal(loadSuiteEvidence(fixtureRoot).status, 'fail');
});

test('baseline evidence rejects a core failure with no failed-suite footer', (t) => {
  const { fixtureRoot } = suiteFixture(t, {
    failedCommand: ['bash', 'packages/core/hooks/tests/run-all.sh'],
    coreStdout: '── Running dev-required-on-commit_test.sh\nSummary: 14 suites passed, 1 failed\n',
  });
  assert.equal(loadSuiteEvidence(fixtureRoot).status, 'fail');
});

test('baseline evidence rejects a permission denial outside the dev-required state fixture', (t) => {
  const { fixtureRoot } = suiteFixture(t, {
    failedCommand: ['bash', 'packages/core/hooks/tests/run-all.sh'],
    coreStderr: '<home>/.claude/state/unrelated.jsonl: Operation not permitted\n',
  });
  assert.equal(loadSuiteEvidence(fixtureRoot).status, 'fail');
});

test('approved responsibility paths have explicit first-touch waves', () => {
  const cases = [
    ['tools/lib/migration-inventory.mjs', 'W00A'],
    ['tools/superkit-inventory.mjs', 'W00A'],
    ['docs/superpowers/migrations/astra-native/ledger.json', 'W00A'],
    ['docs/superpowers/migrations/astra-native/baseline.json', 'W00A'],
    ['docs/superpowers/migrations/astra-native/README.md', 'W00A'],
    ['tools/lib/behavioral-eval.mjs', 'W00B'],
    ['tools/superkit-eval.mjs', 'W00B'],
    ['test/fixtures/astra-native/cases.json', 'W00B'],
    ['test/fixtures/astra-native/result.schema.json', 'W00B'],
    ['test/fixtures/astra-native/repos/case-a/file.js', 'W00B'],
    ['docs/superpowers/migrations/astra-native/evidence/W03A/report.md', 'W00B'],
    ['packages/codex/routing.json', 'W01'],
    ['packages/codex/config.toml', 'W01'],
    ['packages/codex/AGENTS.md', 'W01'],
    ['packages/codex/INSTALL.md', 'W01'],
    ['lib/codex.js', 'W01'],
    ['lib/installer.js', 'W01'],
    ['packages/contracts/ownership.json', 'W02A'],
    ['packages/contracts/shared.json', 'W02A'],
    ['tools/lib/prompt-contracts.mjs', 'W02A'],
    ['tools/superkit-contracts.mjs', 'W02A'],
    ['tools/sync-codex-contracts.mjs', 'W02A'],
    ['tools/convert-agents-to-codex-skills.sh', 'W02A'],
    ['packages/core/skills/writing-agents/SKILL.md', 'W02A'],
    ['packages/core/skills/writing-commands/SKILL.md', 'W02A'],
    ['packages/codex/skills/writing-agents/SKILL.md', 'W02A'],
    ['packages/codex/skills/writing-commands/SKILL.md', 'W02A'],
    ['packages/core/skills/writing-hooks/SKILL.md', 'W07A'],
    ['bin/measure-tokens.js', 'W02B'],
    ['bin/inject-tokens.js', 'W02B'],
    ['lib/codex-assets.js', 'W02B'],
    ['packages/codex/skills/critic/SKILL.md', 'W03A'],
    ['packages/gan/skills/gan-planner/SKILL.md', 'W04C'],
    ['packages/core/hooks/block-dangerous-git.sh', 'W07A'],
    ['packages/stack-hooks/go/go-format-on-edit.sh', 'W07B'],
    ['packages/core/rules/security.md', 'W07C'],
    ['packages/showcase/.claude/agents/architect.md', 'W08A'],
    ['setup.sh', 'W08B'],
    ['packages/core/hooks/superkit-update.sh', 'W08B'],
    ['packages/core/INTERNAL-FILES', 'W08B'],
    ['.github/workflows/verify.yml', 'W09'],
    ['README.md', 'W10A'],
  ];
  for (const [path, wave] of cases) assert.equal(ownershipForPath(path).wave, wave, path);
});

test('explicit mirrors cover command aliases and keep the UI reviewer sources distinct', () => {
  assert.deepEqual(mirrorsForPath('packages/codex/skills/dev-orchestrator/SKILL.md'), ['packages/core/commands/dev.md']);
  assert.deepEqual(mirrorsForPath('packages/codex/skills/review-orchestrator/SKILL.md'), ['packages/core/commands/review.md']);
  assert.deepEqual(mirrorsForPath('packages/codex/skills/audit-orchestrator/SKILL.md'), ['packages/core/commands/audit.md']);
  assert.deepEqual(mirrorsForPath('packages/codex/skills/test-runner/SKILL.md'), ['packages/core/commands/test.md']);
  assert.deepEqual(mirrorsForPath('packages/codex/skills/lint-runner/SKILL.md'), ['packages/core/commands/lint.md']);
  assert.deepEqual(mirrorsForPath('packages/codex/skills/commit-helper/SKILL.md'), ['packages/core/commands/commit.md']);
  assert.deepEqual(mirrorsForPath('packages/codex/skills/ui-reviewer/SKILL.md'), ['packages/core/agents/ui-reviewer.md']);
  assert.deepEqual(mirrorsForPath('packages/codex/skills/frontend-ui-reviewer/SKILL.md'), ['packages/frontend-ui/agents/ui-reviewer.md']);
});

test('GAN skills are Codex-native counterparts of GAN agents', () => {
  const path = 'packages/gan/skills/gan-planner/SKILL.md';
  assert.equal(ownershipForPath(path).owner, 'codex-native');
  assert.deepEqual(mirrorsForPath(path), ['packages/gan/agents/gan-planner.md']);
});

test('stale claim scan includes explicit TOML and JavaScript text surfaces but skips binaries', (t) => {
  const fixtureRoot = tempDirectory(t, 'superkit-stale-scan-');
  const files = [
    ['packages/codex/config.toml', 'model = "gpt-5.5"\n'],
    ['lib/codex.js', 'console.log("gpt-5.5");\n'],
    ['asset.png', Buffer.from('gpt-5.5')],
  ];
  for (const [path, content] of files) {
    mkdirSync(dirname(join(fixtureRoot, path)), { recursive: true });
    writeFileSync(join(fixtureRoot, path), content);
  }
  const surfaces = files.map(([path]) => ({ path }));
  const ledger = { surfaces: files.map(([path]) => ({ path, owner: 'repo-internal' })) };
  assert.deepEqual(scanStaleClaims(fixtureRoot, surfaces, ledger).active.map((row) => row.path), [
    'packages/codex/config.toml',
    'lib/codex.js',
  ]);
});

test('collector and stale scan never read through symlinks to external text', (t) => {
  const repo = tempRepository(t, 'superkit-parent-link-');
  const external = tempDirectory(t, 'superkit-external-text-');
  mkdirSync(join(repo, 'docs'));
  writeFileSync(join(repo, 'docs/instruction.md'), 'safe\n');
  execFileSync('git', ['add', 'docs/instruction.md'], { cwd: repo });
  rmSync(join(repo, 'docs'), { recursive: true });
  writeFileSync(join(external, 'instruction.md'), 'gpt-5.5 external secret\n');
  symlinkSync(external, join(repo, 'docs'));

  assert.throws(() => collectSurfaces(repo), /outside repository root/);

  const linkRoot = tempDirectory(t, 'superkit-final-link-scan-');
  symlinkSync(join(external, 'instruction.md'), join(linkRoot, 'instruction.md'));
  const findings = scanStaleClaims(
    linkRoot,
    [{ path: 'instruction.md' }],
    { surfaces: [{ path: 'instruction.md', owner: 'repo-internal' }] },
  );
  assert.deepEqual(findings, { active: [], historical: [] });
});

test('CLI reports a usage error when an option flag has no value', () => {
  const result = spawnSync(process.execPath, ['tools/superkit-inventory.mjs', 'check', '--dir'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--dir requires a value/);
});
