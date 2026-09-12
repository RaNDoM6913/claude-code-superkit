#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectSurfaces, reconcileLedger } from './lib/migration-inventory.mjs';

const BASELINE_COMMIT = 'e0314ad46442729578bfd43f409e52b6843282fc';
const SELF_ARTIFACTS = new Set([
  'docs/superpowers/migrations/astra-native/ledger.json',
  'docs/superpowers/migrations/astra-native/baseline.json',
  'docs/superpowers/migrations/astra-native/README.md',
]);

const FIRST_TOUCH = new Map([
  ['tools/lib/migration-inventory.mjs', ['repo-internal', 'W00A']],
  ['tools/superkit-inventory.mjs', ['repo-internal', 'W00A']],
  ['test/migration-inventory.test.js', ['repo-internal', 'W00A']],
  ['tools/lib/behavioral-eval.mjs', ['repo-internal', 'W00B']],
  ['tools/superkit-eval.mjs', ['repo-internal', 'W00B']],
  ['test/fixtures/astra-native/cases.json', ['repo-internal', 'W00B']],
  ['test/fixtures/astra-native/result.schema.json', ['repo-internal', 'W00B']],
  ['packages/codex/routing.json', ['codex-native', 'W01']],
  ['packages/codex/config.toml', ['codex-native', 'W01']],
  ['packages/codex/AGENTS.md', ['codex-native', 'W01']],
  ['packages/codex/INSTALL.md', ['codex-native', 'W01']],
  ['lib/codex.js', ['repo-internal', 'W01']],
  ['lib/installer.js', ['repo-internal', 'W01']],
  ['packages/contracts/ownership.json', ['shared-generated', 'W02A']],
  ['packages/contracts/shared.json', ['shared-generated', 'W02A']],
  ['tools/lib/prompt-contracts.mjs', ['repo-internal', 'W02A']],
  ['tools/superkit-contracts.mjs', ['repo-internal', 'W02A']],
  ['tools/sync-codex-contracts.mjs', ['repo-internal', 'W02A']],
  ['tools/convert-agents-to-codex-skills.sh', ['shared-generated', 'W02A']],
  ['packages/core/skills/writing-agents/SKILL.md', ['claude', 'W02A']],
  ['packages/core/skills/writing-commands/SKILL.md', ['claude', 'W02A']],
  ['packages/codex/skills/writing-agents/SKILL.md', ['codex-native', 'W02A']],
  ['packages/codex/skills/writing-commands/SKILL.md', ['codex-native', 'W02A']],
  ['bin/measure-tokens.js', ['repo-internal', 'W02B']],
  ['bin/inject-tokens.js', ['repo-internal', 'W02B']],
  ['lib/codex-assets.js', ['repo-internal', 'W02B']],
  ['packages/core/skills/writing-hooks/SKILL.md', ['claude', 'W07A']],
  ['.github/workflows/verify.yml', ['repo-internal', 'W09']],
]);

const TASKS = [
  ['W00A', 'Inventory, ledger, and repository baseline'],
  ['W00B', 'Behavioral corpus, scoring, and model baseline'],
  ['W01', 'Astra/Sol runtime and proven fallback'],
  ['W02A', 'Ownership, authoring, and safe synchronization'],
  ['W02B', 'Token accounting and contract delivery'],
  ['W03A', 'Critical decisions: architect / plan-checker / critic'],
  ['W03B', 'Goal acceptance: evaluator / goal-verifier / reality-checker / minimal-change-engineer'],
  ['W04A', 'Dev orchestrator and bounded correction loop'],
  ['W04B', 'Review / audit / test / lint coordination'],
  ['W04C', 'GAN planner / generator / evaluator'],
  ['W05A', 'Implementation, debugging, and cleanup'],
  ['W05B', 'Code review, silent failures, security, and dependencies'],
  ['W05C', 'Database, migrations, and API contracts'],
  ['W05D', 'Unit/E2E tests and health evidence'],
  ['W05E', 'Documentation, onboarding, and architecture map'],
  ['W05F', 'Infrastructure, audit, and delivery helpers'],
  ['W06A', 'Go reviewers and domain depth'],
  ['W06B', 'Go utility skills and reference delivery'],
  ['W06C', 'TypeScript / Python / Rust reviewers'],
  ['W06D', 'Frontend UI umbrella and specialists'],
  ['W06E', 'Shared UI and 3D reviewers'],
  ['W06F', '3D / animation skills'],
  ['W06G', 'Optional domain skills'],
  ['W06H', 'Bot and design-system reviewers'],
  ['W07A', 'Core hook contracts'],
  ['W07B', 'Stack and frontend hooks'],
  ['W07C', 'Rules, authority, and always-loaded context'],
  ['W08A', 'Extras, showcase, and unmatched surfaces'],
  ['W08B', 'Installation, updater, GAN opt-in, and package closure'],
  ['W09', 'Kit-wide verification and Astra adversarial audit'],
  ['W10A', 'Final documentation and migration handoff'],
  ['W10B', 'Conditional merge and next release'],
];

const ROLE_WAVES = new Map();
function roles(wave, names) {
  for (const name of names) ROLE_WAVES.set(name, wave);
}
roles('W03A', ['architect', 'plan-checker', 'critic']);
roles('W03B', ['evaluator', 'goal-verifier', 'reality-checker', 'minimal-change-engineer']);
roles('W04A', ['dev-orchestrator']);
roles('W04B', ['review-orchestrator', 'audit-orchestrator', 'test-runner', 'lint-runner']);
roles('W04C', ['gan-planner', 'gan-generator', 'gan-evaluator']);
roles('W05A', ['ai-slop-cleaner', 'debug-observer', 'scaffold-endpoint', 'behavioral-nudge-engine', 'comment-rot-analyzer']);
roles('W05B', ['code-reviewer', 'silent-failure-hunter', 'security-scanner', 'dependency-checker']);
roles('W05C', ['database-reviewer', 'migration-reviewer', 'api-contract-sync', 'migrate', 'new-migration']);
roles('W05D', ['test-generator', 'e2e-test-generator', 'health-checker']);
roles('W05E', ['docs-reviewer', 'codebase-onboarding-engineer', 'tree-generator', 'project-architecture', 'project-scanner']);
roles('W05F', ['audit-backend', 'audit-frontend', 'audit-infra', 'pre-deploy-validator', 'commit-helper', 'benchmark']);
roles('W06A', ['go-reviewer', 'go-error-reviewer', 'go-concurrency-reviewer', 'go-performance-reviewer', 'go-modernizer', 'go-observability-reviewer']);
roles('W06B', ['go-benchmark', 'go-grpc-patterns', 'go-samber-do', 'go-samber-lo', 'go-samber-oops']);
roles('W06C', ['ts-reviewer', 'py-reviewer', 'rs-reviewer']);
roles('W06D', ['frontend-ui-reviewer', 'frontend-ui-typography-reviewer', 'frontend-ui-color-reviewer', 'frontend-ui-motion-reviewer', 'frontend-ui-interaction-reviewer', 'frontend-ui-design-critic', 'impeccable-craft']);
roles('W06E', ['ui-reviewer', 'visual-reviewer', 'ui-design-reviewer', 'presentation-reviewer', 'r3f-scene-reviewer', 'frontend-perf-reviewer']);
roles('W06F', ['gltf-debugging', 'html-to-3d-texture', 'output-enforcement', 'product-3d-lighting', 'r3f-scroll-driven-3d', 'threejs-color-management']);
roles('W06G', ['drizzle-orm-expert', 'nextjs-supabase-auth', 'postgresql-optimization', 'redis-patterns', 'ru-text', 'telegram-bot-builder']);
roles('W06H', ['bot-reviewer', 'design-system-reviewer']);

const COMMAND_WAVES = new Map([
  ['dev', 'W04A'], ['review', 'W04B'], ['audit', 'W04B'], ['test', 'W04B'],
  ['lint', 'W04B'], ['migrate', 'W05C'], ['new-migration', 'W05C'],
  ['benchmark', 'W05F'], ['commit', 'W05F'],
]);

const MIRROR_GRAPH = new Map();
function mirrorPair(source, native) {
  for (const [from, to] of [[source, native], [native, source]]) {
    const targets = MIRROR_GRAPH.get(from) ?? [];
    targets.push(to);
    MIRROR_GRAPH.set(from, targets);
  }
}

for (const name of [
  'ai-slop-cleaner', 'api-contract-sync', 'architect', 'audit-backend',
  'audit-frontend', 'audit-infra', 'behavioral-nudge-engine', 'code-reviewer',
  'codebase-onboarding-engineer', 'comment-rot-analyzer', 'critic',
  'database-reviewer', 'debug-observer', 'dependency-checker', 'docs-reviewer',
  'e2e-test-generator', 'evaluator', 'goal-verifier', 'health-checker',
  'migration-reviewer', 'minimal-change-engineer', 'plan-checker',
  'pre-deploy-validator', 'reality-checker', 'scaffold-endpoint',
  'security-scanner', 'silent-failure-hunter', 'test-generator', 'tree-generator',
  'ui-reviewer', 'visual-reviewer',
]) {
  mirrorPair(`packages/core/agents/${name}.md`, `packages/codex/skills/${name}/SKILL.md`);
}

for (const [native, source] of Object.entries({
  'dev-orchestrator': 'dev',
  'review-orchestrator': 'review',
  'audit-orchestrator': 'audit',
  'test-runner': 'test',
  'lint-runner': 'lint',
  'commit-helper': 'commit',
  benchmark: 'benchmark',
  migrate: 'migrate',
  'new-migration': 'new-migration',
})) {
  mirrorPair(`packages/core/commands/${source}.md`, `packages/codex/skills/${native}/SKILL.md`);
}

for (const name of [
  'drizzle-orm-expert', 'nextjs-supabase-auth', 'postgresql-optimization',
  'project-architecture', 'redis-patterns', 'ru-text', 'telegram-bot-builder',
  'writing-agents', 'writing-commands',
]) {
  mirrorPair(`packages/core/skills/${name}/SKILL.md`, `packages/codex/skills/${name}/SKILL.md`);
}

for (const [source, native = source] of [
  ['go-reviewer'], ['go-error-reviewer'], ['go-concurrency-reviewer'],
  ['go-performance-reviewer'], ['go-modernizer'], ['go-observability-reviewer'],
  ['ts-reviewer'], ['py-reviewer'], ['rs-reviewer'],
]) {
  const family = source.startsWith('go-') ? 'go' : source === 'ts-reviewer' ? 'typescript' : source === 'py-reviewer' ? 'python' : 'rust';
  mirrorPair(`packages/stack-agents/${family}/${source}.md`, `packages/codex/skills/${native}/SKILL.md`);
}

for (const [source, native] of Object.entries({
  'ui-reviewer': 'frontend-ui-reviewer',
  'ui-typography-reviewer': 'frontend-ui-typography-reviewer',
  'ui-color-reviewer': 'frontend-ui-color-reviewer',
  'ui-motion-reviewer': 'frontend-ui-motion-reviewer',
  'ui-interaction-reviewer': 'frontend-ui-interaction-reviewer',
  'ui-design-critic': 'frontend-ui-design-critic',
})) {
  mirrorPair(`packages/frontend-ui/agents/${source}.md`, `packages/codex/skills/${native}/SKILL.md`);
}
mirrorPair('packages/frontend-ui/skills/impeccable-craft/SKILL.md', 'packages/codex/skills/impeccable-craft/SKILL.md');

for (const name of ['frontend-perf-reviewer', 'presentation-reviewer', 'r3f-scene-reviewer', 'ui-design-reviewer']) {
  mirrorPair(`packages/frontend-3d/agents/${name}.md`, `packages/codex/skills/${name}/SKILL.md`);
}
for (const name of ['gltf-debugging', 'html-to-3d-texture', 'output-enforcement', 'product-3d-lighting', 'r3f-scroll-driven-3d', 'threejs-color-management']) {
  mirrorPair(`packages/frontend-3d/skills/${name}/SKILL.md`, `packages/codex/skills/${name}/SKILL.md`);
}
for (const name of ['bot-reviewer', 'design-system-reviewer']) {
  mirrorPair(`packages/extras/${name}.md`, `packages/codex/skills/${name}/SKILL.md`);
}
for (const name of ['gan-planner', 'gan-generator', 'gan-evaluator']) {
  mirrorPair(`packages/gan/agents/${name}.md`, `packages/gan/skills/${name}/SKILL.md`);
}

function stem(path) {
  if (path.endsWith('/SKILL.md')) return path.split('/').at(-2);
  return path.split('/').at(-1).replace(/\.[^.]+$/, '');
}

export function ownershipForPath(path) {
  const firstTouch = FIRST_TOUCH.get(path);
  if (firstTouch) {
    return { owner: firstTouch[0], wave: firstTouch[1], rationale: 'Explicit first-touch assignment from the approved file responsibility table.' };
  }
  if (path.startsWith('test/fixtures/astra-native/repos/')) return { owner: 'repo-internal', wave: 'W00B', rationale: 'Behavioral fixture repository assigned by the approved responsibility table.' };
  if (path.startsWith('docs/superpowers/migrations/astra-native/evidence/') && !path.includes('/evidence/W00A/')) return { owner: 'repo-internal', wave: 'W00B', rationale: 'Behavioral evidence root is introduced by W00B; later evidence is updated by its owning wave.' };
  if (path === 'packages/core/hooks/superkit-update.sh') return { owner: 'repo-internal', wave: 'W08B', rationale: 'Updater first-touch assignment from the approved package-closure responsibility row.' };
  if (path.startsWith('docs/superpowers/plans/') || path.startsWith('docs/superpowers/specs/')) {
    return { owner: 'historical', wave: 'historical/preserved', rationale: 'Historical read-only design or plan evidence; preserved as migration context.' };
  }
  if (path.startsWith('packages/showcase/')) {
    return { owner: 'example', wave: 'W08A', rationale: 'Production showcase surface; reviewed in the dedicated showcase closure wave.' };
  }
  if (path.startsWith('packages/gan/')) {
    return { owner: path.includes('/skills/') ? 'codex-native' : 'claude', wave: 'W04C', rationale: 'GAN orchestration surface assigned to the GAN contract wave.' };
  }
  if (path.startsWith('packages/core/hooks/')) {
    return { owner: 'claude', wave: 'W07A', rationale: 'Deterministic core hook or its test/reference, assigned to core hook hardening.' };
  }
  if (path.startsWith('packages/stack-hooks/') || path.startsWith('packages/frontend-ui/hooks/') || path.startsWith('packages/frontend-3d/hooks/')) {
    return { owner: 'claude', wave: 'W07B', rationale: 'Deterministic stack/frontend hook or test, assigned to specialist hook hardening.' };
  }
  if (path.includes('/rules/') || path.endsWith('.rules')) {
    return { owner: path.startsWith('packages/codex/') ? 'codex-native' : 'claude', wave: 'W07C', rationale: 'Runtime policy surface assigned to the rules and authority wave.' };
  }
  if (path.startsWith('packages/stack-agents/go/references/')) {
    return { owner: 'claude', wave: 'W06B', rationale: 'Go knowledge reference delivered with the Go utility/reference wave.' };
  }
  if (path.startsWith('packages/stack-agents/go/')) return { owner: 'claude', wave: 'W06A', rationale: 'Go reviewer source assigned by the approved role-wave map.' };
  if (/^packages\/stack-agents\/(typescript|python|rust)\//.test(path)) return { owner: 'claude', wave: 'W06C', rationale: 'Language reviewer source assigned by the approved role-wave map.' };
  if (path.startsWith('packages/frontend-ui/agents/')) return { owner: 'claude', wave: 'W06D', rationale: 'Frontend UI reviewer source assigned to the UI specialist wave.' };
  if (path.startsWith('packages/frontend-3d/agents/')) return { owner: 'claude', wave: 'W06E', rationale: 'Frontend/3D reviewer source assigned to the shared visual reviewer wave.' };
  if (path.startsWith('packages/frontend-3d/skills/')) return { owner: 'claude', wave: 'W06F', rationale: '3D/animation skill source assigned to the specialist skill wave.' };
  if (path.startsWith('packages/frontend-ui/skills/')) return { owner: 'claude', wave: 'W06D', rationale: 'UI craft skill assigned with the frontend UI specialist wave.' };
  if (path.startsWith('packages/extras/bot-reviewer') || path.startsWith('packages/extras/design-system-reviewer')) return { owner: 'claude', wave: 'W06H', rationale: 'Optional reviewer assigned to the extras bridge wave.' };
  if (path.startsWith('packages/extras/skillsmp-search/')) return { owner: 'claude', wave: 'W08A', rationale: 'Optional search integration retained for the explicit extras/source-closure wave.' };
  if (path.startsWith('packages/extras/')) return { owner: 'claude', wave: 'W08A', rationale: 'Remaining optional package surface assigned to extras closure.' };
  if (path.startsWith('packages/core/agents/')) return { owner: 'claude', wave: ROLE_WAVES.get(stem(path)) ?? 'W08A', rationale: ROLE_WAVES.has(stem(path)) ? 'Claude agent source assigned by the approved role-wave map.' : 'Unmatched Claude agent retained visibly for the remaining-surfaces wave.' };
  if (path.startsWith('packages/core/commands/')) return { owner: 'claude', wave: COMMAND_WAVES.get(stem(path)) ?? 'W08A', rationale: COMMAND_WAVES.has(stem(path)) ? 'Claude command source assigned by the approved task heading.' : 'Command retained visibly for remaining package synchronization.' };
  if (path.startsWith('packages/core/skills/')) {
    const name = stem(path);
    const wave = ['writing-agents', 'writing-commands'].includes(name) ? 'W02A' : (name === 'writing-hooks' ? 'W07A' : (name === 'project-scanner' ? 'W08A' : (ROLE_WAVES.get(name) ?? 'W05E')));
    const rationale = name === 'project-scanner'
      ? 'Claude-only project scanner is explicitly preserved without a Codex mirror and reviewed in source closure.'
      : 'Claude skill source assigned by its explicit authoring or role family.';
    return { owner: 'claude', wave, rationale };
  }
  if (path.startsWith('packages/codex/skills/')) {
    const name = stem(path);
    const wave = ['writing-agents', 'writing-commands'].includes(name) ? 'W02A' : (ROLE_WAVES.get(name) ?? 'W08A');
    return { owner: 'codex-native', wave, rationale: ROLE_WAVES.has(name) ? 'Codex role assigned by the approved role-wave map; native ownership is reviewed independently.' : 'Codex skill retained visibly for authoring or remaining-surfaces review.' };
  }
  if (path === 'tools/convert-agents-to-codex-skills.sh') return { owner: 'shared-generated', wave: 'W02A', rationale: 'Cross-runtime conversion tool assigned to safe synchronization.' };
  if (path === 'bin/measure-tokens.js' || path === 'bin/inject-tokens.js') return { owner: 'repo-internal', wave: 'W02B', rationale: 'Prompt measurement tooling assigned to token accounting.' };
  if (path.includes('migration-inventory') || path === 'tools/superkit-inventory.mjs' || SELF_ARTIFACTS.has(path) || path.includes('/evidence/W00A/')) return { owner: 'repo-internal', wave: 'W00A', rationale: 'Phase 0 inventory implementation or non-self-hashing evidence artifact.' };
  if (path.startsWith('test/') || path.startsWith('.github/')) return { owner: 'repo-internal', wave: 'W09', rationale: 'Repository verification surface assigned to kit-wide verification.' };
  if (path.startsWith('packages/core/docs-templates/')) return { owner: 'claude', wave: 'W05E', rationale: 'Documentation template assigned to documentation and architecture mapping.' };
  if (path.startsWith('packages/core/') || path.startsWith('packages/codex/') || path.startsWith('lib/') || path.startsWith('bin/') || path === 'setup.sh' || path === 'package.json' || path === '.npmignore') return { owner: path.startsWith('packages/codex/') ? 'codex-native' : 'repo-internal', wave: 'W08B', rationale: 'Packaging, installation, configuration, or updater surface assigned to package closure.' };
  if (path.startsWith('packages/')) return { owner: 'claude', wave: 'W08A', rationale: 'Known package surface retained visibly for the remaining-surfaces wave.' };
  if (path.startsWith('docs/') || ['README.md', 'CHANGELOG.md', 'CLAUDE.md', 'CONTRIBUTING.md', 'EVALUATIONS.md', 'TROUBLESHOOTING.md', 'LICENSE', 'VERSION'].includes(path)) return { owner: 'repo-internal', wave: 'W10A', rationale: 'Repository documentation or release-facing artifact assigned to final documentation.' };
  if (path.startsWith('.claude/') || path === '.gitignore') return { owner: 'repo-internal', wave: 'W08B', rationale: 'Repository-local configuration assigned to package and updater closure.' };
  return { owner: 'ambiguous', wave: null, rationale: 'No approved ownership rule matched; Astra adjudication required.' };
}

export function mirrorsForPath(path, allPaths = new Set()) {
  const targets = MIRROR_GRAPH.get(path) ?? [];
  const existing = allPaths.size === 0 ? targets : targets.filter((target) => allPaths.has(target));
  return [...new Set(existing)].sort();
}

function baselineBlob(root, path, baselinePaths) {
  if (!baselinePaths.has(path)) return null;
  return execFileSync('git', ['show', `${BASELINE_COMMIT}:${path}`], { cwd: root, encoding: 'buffer' });
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function buildLedger(root, surfaces) {
  const baselinePaths = new Set(execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', BASELINE_COMMIT], { cwd: root, encoding: 'buffer' }).toString('utf8').split('\0').filter(Boolean));
  const allPaths = new Set(surfaces.map((surface) => surface.path));
  return {
    schemaVersion: 1,
    baselineCommit: BASELINE_COMMIT,
    artifactAccounting: 'Ledger, baseline, README, and evidence are inventoried, but baselineSha256 is null when absent from the immutable baseline commit. Generated artifacts never embed their current hash.',
    surfaces: surfaces.map((surface) => {
      const assignment = ownershipForPath(surface.path);
      const blob = baselineBlob(root, surface.path, baselinePaths);
      return {
        path: surface.path,
        kind: surface.kind,
        owner: assignment.owner,
        mirrors: mirrorsForPath(surface.path, allPaths),
        wave: assignment.wave,
        baselineSha256: blob === null ? null : sha256(blob),
        status: assignment.wave === 'historical/preserved' ? 'preserved' : 'pending',
        evidence: [],
        rationale: assignment.rationale,
        deferral: null,
      };
    }),
  };
}

const STALE_PATTERNS = [
  ['gpt-5.5', /gpt-5\.5/g],
  ['extra_high', /extra_high/g],
  ['no-subagents claim', /(?:no|without|cannot|can(?:not|'t))[^\n]{0,48}subagents?/gi],
  ['Agent tool', /Agent tool/g],
  ['TodoWrite', /TodoWrite/g],
  ['legacy Claude path', /\.claude\/(?:agents|commands)\//g],
];
const EXPLICIT_STALE_TEXT_PATHS = new Set([
  'packages/codex/config.toml',
  'lib/codex.js',
  'lib/installer.js',
]);

export function scanStaleClaims(root, surfaces, ledger) {
  const ownership = new Map(ledger.surfaces.map((row) => [row.path, row.owner]));
  const findings = { active: [], historical: [] };
  const rootReal = realpathSync(root);
  for (const surface of surfaces) {
    if (!/\.(?:md|rules)$/.test(surface.path) && !EXPLICIT_STALE_TEXT_PATHS.has(surface.path)) continue;
    const absolute = resolve(root, surface.path);
    let stat;
    try {
      stat = lstatSync(absolute);
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
    if (!stat.isFile() || stat.isSymbolicLink()) continue;
    const real = realpathSync(absolute);
    if (real !== rootReal && !real.startsWith(`${rootReal}/`)) continue;
    const content = readFileSync(real, 'utf8');
    const lines = content.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      for (const [claim, pattern] of STALE_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(lines[index])) {
          const target = ownership.get(surface.path) === 'historical' || surface.path === 'CHANGELOG.md'
            ? findings.historical
            : findings.active;
          const excerpt = lines[index]
            .trim()
            .slice(0, 240)
            .replace(/\/Users\/[^/\s]+/g, '<home>')
            .replace(/\/home\/[^/\s]+/g, '<home>');
          target.push({ claim, path: surface.path, line: index + 1, reviewStatus: 'unreviewed-candidate', excerpt });
        }
      }
    }
  }
  return findings;
}

function repeatedParagraphs(root, surfaces) {
  const occurrences = new Map();
  const rootReal = realpathSync(root);
  for (const surface of surfaces.filter((item) => item.tokensApprox !== null)) {
    const absolute = resolve(root, surface.path);
    const stat = lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) continue;
    const real = realpathSync(absolute);
    if (real !== rootReal && !real.startsWith(`${rootReal}/`)) continue;
    const content = readFileSync(real, 'utf8').replace(/^---[\s\S]*?---\r?\n/, '');
    for (const paragraph of content.split(/\r?\n\s*\r?\n/)) {
      const normalized = paragraph.replace(/\s+/g, ' ').trim();
      if (normalized.length < 120) continue;
      const hash = sha256(normalized);
      const entry = occurrences.get(hash) ?? { normalizedSha256: hash, count: 0, totalBytes: 0, paths: new Set() };
      entry.count += 1;
      entry.totalBytes += Buffer.byteLength(normalized);
      entry.paths.add(surface.path);
      occurrences.set(hash, entry);
    }
  }
  return [...occurrences.values()]
    .filter((entry) => entry.count > 1)
    .map((entry) => ({ ...entry, paths: [...entry.paths].sort() }))
    .sort((a, b) => b.totalBytes - a.totalBytes || a.normalizedSha256.localeCompare(b.normalizedSha256));
}

export function loadSuiteEvidence(root) {
  const evidenceRoot = join(root, 'docs/superpowers/migrations/astra-native/evidence/W00A/baseline');
  const summaryPath = join(evidenceRoot, 'summary.json');
  if (!existsSync(summaryPath)) {
    return { status: 'incomplete', errors: ['required baseline summary is missing'], commands: [], exception: null };
  }
  let rawCommands;
  try {
    rawCommands = JSON.parse(readFileSync(summaryPath, 'utf8'));
  } catch (error) {
    return { status: 'incomplete', errors: [`invalid baseline summary JSON: ${error.message}`], commands: [], exception: null };
  }
  if (!Array.isArray(rawCommands) || rawCommands.length === 0) {
    return { status: 'incomplete', errors: ['required baseline summary is empty'], commands: [], exception: null };
  }

  const requiredCommands = [
    ['npm', 'test'],
    ['npm', 'run', 'test:smoke'],
    ['bash', 'packages/core/hooks/tests/run-all.sh'],
    ['bash', 'packages/frontend-ui/hooks/tests/ui-color-check_test.sh'],
    ['bash', 'packages/frontend-ui/hooks/tests/ui-animation-easing-check_test.sh'],
    ['bash', 'packages/frontend-ui/hooks/tests/ui-banned-fonts-check_test.sh'],
    ['bash', 'bin/superkit-counts-verify.sh'],
  ];
  const requiredKeys = new Set(requiredCommands.map((command) => JSON.stringify(command)));
  const seen = new Set();
  const errors = [];

  function evidenceFile(candidate, label) {
    if (typeof candidate !== 'string' || !candidate) {
      errors.push(`${label} path is missing`);
      return null;
    }
    const absolute = resolve(evidenceRoot, candidate);
    if (absolute !== evidenceRoot && !absolute.startsWith(`${evidenceRoot}/`)) {
      errors.push(`${label} path escapes the evidence directory`);
      return null;
    }
    if (!existsSync(absolute)) {
      errors.push(`${label} file does not exist: ${candidate}`);
      return null;
    }
    const stat = lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      errors.push(`${label} is not a regular evidence file: ${candidate}`);
      return null;
    }
    return absolute;
  }

  const commands = rawCommands.map((record, index) => {
    const key = JSON.stringify(record?.command);
    if (!requiredKeys.has(key)) errors.push(`unexpected baseline command at index ${index}: ${key}`);
    if (seen.has(key)) errors.push(`duplicate baseline command: ${key}`);
    seen.add(key);
    if (!Number.isInteger(record?.exitCode)) errors.push(`baseline command ${key} has invalid exitCode`);
    const stdout = evidenceFile(record?.stdoutPath, `baseline command ${key} stdout`);
    const stderr = evidenceFile(record?.stderrPath, `baseline command ${key} stderr`);
    return {
      ...record,
      stdoutPath: stdout ? relative(root, stdout) : record?.stdoutPath ?? null,
      stderrPath: stderr ? relative(root, stderr) : record?.stderrPath ?? null,
    };
  });
  for (const key of requiredKeys) {
    if (!seen.has(key)) errors.push(`required baseline command missing: ${key}`);
  }
  if (errors.length) return { status: 'incomplete', errors, commands, exception: null };

  const failed = rawCommands.filter((record) => record.exitCode !== 0);
  if (failed.length === 0) return { status: 'pass', errors: [], commands, exception: null };
  const coreCommand = ['bash', 'packages/core/hooks/tests/run-all.sh'];
  if (failed.length !== 1 || JSON.stringify(failed[0].command) !== JSON.stringify(coreCommand) || failed[0].exitCode !== 1) {
    return { status: 'fail', errors: ['baseline contains an unrecognized command failure'], commands, exception: null };
  }

  const coreStdout = readFileSync(resolve(evidenceRoot, failed[0].stdoutPath), 'utf8');
  const coreStderr = readFileSync(resolve(evidenceRoot, failed[0].stderrPath), 'utf8');
  const footerMatches = [...coreStdout.matchAll(/^Failed suites:\s*$/gm)];
  const finalFooter = footerMatches.at(-1);
  const footerTail = finalFooter
    ? coreStdout.slice(finalFooter.index + finalFooter[0].length).trim()
    : '';
  const footerLines = footerTail ? footerTail.split(/\r?\n/) : [];
  const failedSuites = footerLines.every((line) => /^\s*-\s+\S+\s*$/.test(line))
    ? footerLines.map((line) => line.replace(/^\s*-\s+/, '').trim())
    : [];
  const exactFailedSuite = failedSuites.length === 1 && failedSuites[0] === 'dev-required-on-commit_test.sh';
  const exactPermissionDenial = /(?:<home>|\/Users\/[^/\s]+|\/home\/[^/\s]+)\/\.claude\/state\/dev-cycles-test-dev-required-(?:<pid>|\d+)\.jsonl:[^\n]*Operation not permitted/.test(coreStderr);
  if (!/Summary: 14 suites passed, 1 failed/.test(coreStdout) || !exactFailedSuite || !exactPermissionDenial) {
    return { status: 'fail', errors: ['core hook failure evidence does not match the documented sandbox exception'], commands, exception: null };
  }

  const elevatedPath = join(evidenceRoot, 'dev-required-elevated.json');
  if (!existsSync(elevatedPath)) return { status: 'fail', errors: ['required focused rerun record is missing'], commands, exception: null };
  let elevated;
  try {
    elevated = JSON.parse(readFileSync(elevatedPath, 'utf8'));
  } catch (error) {
    return { status: 'fail', errors: [`invalid focused rerun JSON: ${error.message}`], commands, exception: null };
  }
  const rerunCommand = ['bash', 'packages/core/hooks/tests/dev-required-on-commit_test.sh'];
  const rerunErrors = [];
  if (JSON.stringify(elevated.command) !== JSON.stringify(rerunCommand)) rerunErrors.push('focused rerun command does not match the failed component suite');
  if (elevated.exitCode !== 0) rerunErrors.push('focused rerun did not exit zero');
  const rerunStdout = evidenceFile(elevated.stdoutPath, 'focused rerun stdout');
  const rerunStderr = evidenceFile(elevated.stderrPath, 'focused rerun stderr');
  if (errors.length) rerunErrors.push(...errors);
  if (rerunStdout && !/Results: 18 passed, 0 failed/.test(readFileSync(rerunStdout, 'utf8'))) rerunErrors.push('focused rerun output does not prove 18/18 assertions passed');
  if (rerunErrors.length) return { status: 'fail', errors: rerunErrors, commands, exception: null };

  return {
    status: 'pass-with-environment-resolution',
    errors: [],
    commands,
    exception: {
      initialCommand: 'bash packages/core/hooks/tests/run-all.sh',
      initialExitCode: 1,
      condition: '14/15 component suites passed; dev-required-on-commit could not write its isolated ~/.claude/state test fixture under the sandbox.',
      resolution: 'The focused dev-required-on-commit suite was rerun with approved access and passed 18/18 assertions.',
      rerun: {
        ...elevated,
        stdoutPath: relative(root, rerunStdout),
        stderrPath: relative(root, rerunStderr),
      },
    },
  };
}

function buildBaseline(root, surfaces, ledger) {
  const byKind = Object.fromEntries([...new Set(surfaces.map((surface) => surface.kind))].sort().map((kind) => [kind, surfaces.filter((surface) => surface.kind === kind).length]));
  const prompts = surfaces.filter((surface) => surface.tokensApprox !== null).map((surface) => ({ path: surface.path, sha256: surface.sha256, tokensApprox: surface.tokensApprox }));
  return {
    schemaVersion: 1,
    baselineCommit: BASELINE_COMMIT,
    capturedFromHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    artifactAccounting: {
      policy: 'Generated ledger, baseline, README, and evidence are inventory surfaces. Their baseline hash is null when they did not exist at the immutable baseline commit; no generated artifact records its own mutable current hash.',
      selfArtifacts: [...SELF_ARTIFACTS].sort(),
    },
    inventory: {
      total: surfaces.length,
      tracked: surfaces.filter((surface) => surface.tracked).length,
      untracked: surfaces.filter((surface) => !surface.tracked).length,
      byKind,
    },
    suites: loadSuiteEvidence(root),
    staleClaims: scanStaleClaims(root, surfaces, ledger),
    promptMetrics: {
      unit: 'approximate prompt-body tokens estimated by Math.round(chars / 4); not API usage or subscription consumption',
      promptCount: prompts.length,
      prompts,
      top20: [...prompts].sort((a, b) => b.tokensApprox - a.tokensApprox || a.path.localeCompare(b.path)).slice(0, 20),
      repeatedNormalizedParagraphsMinChars120: repeatedParagraphs(root, surfaces),
    },
  };
}

function readme(ledger, baseline) {
  const rows = TASKS.map(([wave, title]) => `| ${wave} | ${title} | pending | — |`).join('\n');
  return `# Astra-native migration ledger\n\nBaseline commit: \`${BASELINE_COMMIT}\`. The machine-readable ledger contains ${ledger.surfaces.length} tracked and untracked repository surfaces. Current baseline evidence is \`${baseline.suites.status}\`; see \`baseline.json\` and \`evidence/W00A/baseline/\` for exact exits and outputs.\n\n## Artifact accounting\n\nLedger, baseline, README, and checked-in evidence are inventory surfaces. Files absent from the immutable baseline commit have \`baselineSha256: null\`. Generated artifacts do not embed hashes of their own current contents, avoiding circular hashes while keeping their paths owned and reconciled. Ignored temporary files and \`.git\` are excluded by Git's own tracked/untracked enumeration; no source directory is blanket-excluded.\n\n## Migration tasks\n\n| Wave | Scope | Status | Evidence / report |\n|---|---|---|---|\n${rows}\n\n## Open items\n\n- W00A remains pending until coordinator review accepts this inventory and its disclosed sandbox exception.\n- All later waves remain pending; no test, evaluation, review, or Astra gate is inferred from inventory status.\n`;
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function usage(message) {
  if (message) console.error(message);
  console.error('usage: node tools/superkit-inventory.mjs capture --out <dir> | check [--dir <dir>]');
  process.exitCode = 2;
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  return value;
}

export function capture(root, outputDir) {
  const initialArtifacts = [['ledger.json', '{}\n'], ['baseline.json', '{}\n'], ['README.md', '# Astra-native migration ledger\n']];
  for (const [name, initial] of initialArtifacts) {
    const path = join(outputDir, name);
    if (existsSync(path) && readFileSync(path, 'utf8') !== initial) {
      throw new Error(`migration inventory is already initialized; refusing to overwrite ${path}`);
    }
  }
  mkdirSync(outputDir, { recursive: true });
  for (const [name, initial] of initialArtifacts) {
    const path = join(outputDir, name);
    if (!existsSync(path)) writeFileSync(path, initial);
  }
  const surfaces = collectSurfaces(root);
  const ledger = buildLedger(root, surfaces);
  const baseline = buildBaseline(root, surfaces, ledger);
  writeJson(join(outputDir, 'ledger.json'), ledger);
  writeJson(join(outputDir, 'baseline.json'), baseline);
  writeFileSync(join(outputDir, 'README.md'), readme(ledger, baseline));
  return { surfaces: surfaces.length, tracked: surfaces.filter((item) => item.tracked).length, untracked: surfaces.filter((item) => !item.tracked).length };
}

export function check(root, inputDir) {
  const ledger = JSON.parse(readFileSync(join(inputDir, 'ledger.json'), 'utf8'));
  return reconcileLedger(collectSurfaces(root), ledger);
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const root = resolve(dirname(scriptPath), '..');
  const args = process.argv.slice(2);
  const defaultDir = join(root, 'docs/superpowers/migrations/astra-native');
  try {
    if (args[0] === 'capture') {
      const outputDir = resolve(root, option(args, '--out', defaultDir));
      console.log(JSON.stringify(capture(root, outputDir)));
    } else if (args[0] === 'check') {
      const inputDir = resolve(root, option(args, '--dir', defaultDir));
      const result = check(root, inputDir);
      console.log(JSON.stringify(result, null, 2));
      if (result.missing.length || result.stale.length || result.errors.length) process.exitCode = 1;
    } else {
      usage();
    }
  } catch (error) {
    usage(error.message);
  }
}
