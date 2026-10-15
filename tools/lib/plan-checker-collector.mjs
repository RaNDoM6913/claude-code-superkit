import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';
import { captureEvidence, captureInputSnapshot, captureReviewWorkspace, verifyInputSnapshot, verifyReviewWorkspace, loadVerificationEvidence } from './verification-evidence.mjs';
import { scoreVerifiedPlanCheckerCase } from './plan-checker-eval.mjs';

const admitted = JSON.parse(readFileSync(new URL('../../test/fixtures/astra-native/plan-checker-case.json', import.meta.url), 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const fail = reason => { throw new Error(reason); };
const store = (root, name, bytes) => writeFileSync(join(root, name), bytes, { flag: 'wx', mode: 0o600 });
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const hashValue = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const FIXTURE_PATH = fileURLToPath(new URL('../../test/fixtures/astra-native/plan-checker-worker.mjs', import.meta.url));
const FIXTURE_SHA256 = 'cb87a9cb479aa657f96c5077421d4053b5f7ab7d58f6cca4222aeba88b6b09a9';
const FIXTURE_MODES = new Set(['valid', 'stdin-close', 'wrong-case', 'wrong-command', 'fake-runtime', 'write', 'change-input',
  'nonzero', 'signal', 'timeout', 'overflow', 'malformed', 'fake-event', 'missing', 'duplicate', 'two-finals', 'failed',
  'truncated', 'duplicate-key', 'detached-pipe']);
const ARTIFACTS = ['inputs.json', 'before.json', 'stdin.bin', 'invocation.json', 'stdout.jsonl', 'stderr.bin', 'process.json',
  'final-output.txt', 'verification.json', 'verification-record.json'];
const bindingKeys = ['runId', 'caseId', 'snapshotSha256', 'invocationSha256', 'stdoutSha256', 'finalSha256', 'manifestSha256'];
const candidateCommand = () => [process.execPath, '--test', '--test-reporter=tap', 'test/policies.test.js'];
function trustedSpec(runId, caseId) {
  const spec = structuredClone(admitted); spec.id = caseId; spec.packet.caseId = caseId;
  spec.packet.collector = { runId, baseCaseId: admitted.id, candidateCommand: candidateCommand() };
  return spec;
}
const nativePlan = workspace => ({ executed: false, command: ['codex', 'exec', '--json', '--sandbox', 'read-only', '--ephemeral',
  '--model', 'gpt-5.6-sol', '-c', 'model_reasoning_effort="high"', '--cd', workspace, '-'] });


// Caller owns these paths. Reject static symlink redirection, including ancestors;
// this is not a defence against a concurrent hostile same-user filesystem actor.
function safeDirectory(path) {
  if (typeof path !== 'string' || !isAbsolute(path) || resolve(path) !== path) fail('unsafe-root');
  let current = parse(path).root;
  for (const part of path.slice(current.length).split('/').filter(Boolean)) {
    current = join(current, part);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('unsafe-root-symlink');
  }
  return realpathSync(path);
}
function boundedFile(root, name) {
  const path = join(root, name), stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 2 * 1024 * 1024) fail('unsafe-artifact');
  return readFileSync(path);
}

// Reject duplicate decoded object keys before JSON.parse discards them. JSON.parse
// validates grammar; this bounded lexical pass only adds ambiguity/depth checks.
function strictEvent(line) {
  const stack = [];
  for (const token of line.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]]/g)) {
    const value = token[0];
    if (value === '{' || value === '[') {
      stack.push(value === '{' ? new Set() : null);
      if (stack.length > 64) fail('event-depth');
    } else if (value === '}' || value === ']') stack.pop();
    else if (/^\s*:/.test(line.slice(token.index + value.length))) {
      const keys = stack.at(-1), key = JSON.parse(value);
      if (!(keys instanceof Set) || keys.has(key)) fail('duplicate-event-key');
      keys.add(key);
    }
  }
  return JSON.parse(line);
}

/** Supported Codex exec JSONL subset. Native command strings are retained as
 * claims, never decoded into authoritative argv/scope or model attestation. */
export function parsePlanCheckerJsonl(bytes) {
  try {
    if (!Buffer.isBuffer(bytes) || bytes.length > 1024 * 1024) fail('invalid-trace-bytes');
    const raw = new TextDecoder('utf8', { fatal: true }).decode(bytes);
    if (!raw.endsWith('\n')) fail('truncated-jsonl');
    const lines = raw.slice(0, -1).split('\n');
    if (lines.length > 4096 || lines.some(line => !line.trim())) fail('invalid-jsonl-lines');
    let started = false, thread = false, complete = false, final = null;
    const completedItems = new Set(), pendingItems = new Map(), commandClaims = [];
    for (const line of lines) {
      const event = strictEvent(line);
      if (!record(event) || typeof event.type !== 'string' || complete) fail('invalid-event-order');
      if (event.type === 'thread.started') {
        if (thread || started || typeof event.thread_id !== 'string' || !event.thread_id) fail('invalid-thread');
        thread = true;
      } else if (event.type === 'turn.started') {
        if (started || !thread) fail('invalid-turn');
        started = true;
      } else if (event.type === 'turn.completed') {
        if (!started || final === null || pendingItems.size || !record(event.usage)
          || !['input_tokens', 'output_tokens'].every(key => Number.isSafeInteger(event.usage[key]) && event.usage[key] >= 0)
          || (Object.hasOwn(event.usage, 'cached_input_tokens') && (!Number.isSafeInteger(event.usage.cached_input_tokens) || event.usage.cached_input_tokens < 0))) fail('missing-final-or-invalid-completion');
        complete = true;
      } else if (event.type === 'runtime.identity' || event.type === 'runtime.unavailable') {
        // Unauthenticated trace data, deliberately ignored for identity.
        if (!started) fail('invalid-event-order');
      } else if (['item.started', 'item.updated', 'item.completed'].includes(event.type)) {
        const item = event.item;
        if (!started || final !== null || !record(item) || typeof item.id !== 'string' || !item.id
          || !['agent_message', 'command_execution', 'reasoning'].includes(item.type)) fail('unsupported-item');
        if (completedItems.has(item.id) || (pendingItems.has(item.id) && pendingItems.get(item.id) !== item.type)) fail('duplicate-or-conflicting-item');
        if (event.type === 'item.started') {
          if (pendingItems.has(item.id)) fail('duplicate-item');
          pendingItems.set(item.id, item.type);
        } else if (event.type === 'item.updated') {
          if (!pendingItems.has(item.id)) fail('missing-item-start');
        }
        if (event.type === 'item.completed') {
          pendingItems.delete(item.id);
          completedItems.add(item.id);
          if (item.type === 'agent_message') {
            if (typeof item.text !== 'string' || !item.text) fail('missing-final');
            final = item.text;
          } else if (item.type === 'command_execution') {
            if (typeof item.command !== 'string' || item.status !== 'completed'
              || !Number.isSafeInteger(item.exit_code) || item.exit_code !== 0) fail('failed-command-item');
            commandClaims.push({ command: item.command, exitCode: item.exit_code });
          }
        }
      } else fail('unsupported-or-failed-event');
    }
    if (!complete) fail('missing-completion');
    return { pass: true, reason: null, finalOutput: final, commandClaims };
  } catch (error) {
    return { pass: false, reason: error.message, finalOutput: null, commandClaims: [] };
  }
}

function limitsFor(limits = {}) {
  if (!record(limits) || Object.keys(limits).some(k => !['timeoutMs', 'maxOutputBytes'].includes(k))) fail('invalid-limits');
  const result = { timeoutMs: limits.timeoutMs ?? 10000, maxOutputBytes: limits.maxOutputBytes ?? 256 * 1024 };
  if (!Number.isInteger(result.timeoutMs) || result.timeoutMs < 20 || result.timeoutMs > 30000
    || !Number.isInteger(result.maxOutputBytes) || result.maxOutputBytes < 1024 || result.maxOutputBytes > 512 * 1024) fail('invalid-limits');
  return result;
}

// Spawn once, with bounded aggregate output and a sanitized environment. No shell,
// inherited credentials/config, retry, or model launcher is introduced here.
function execute(command, cwd, stdin, limits) {
  return new Promise(resolveResult => {
    let child, timer, settled = false, error = null, truncated = false, size = 0;
    const stdout = [], stderr = [];
    const kill = () => {
      if (!child?.pid) return;
      try { if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch { /* already exited */ }
    };
    const finish = (exitCode, signal, settlement = 'close') => {
      if (settled) return;
      settled = true; clearTimeout(timer); kill();
      // Detached descendants can retain inherited pipes after leaving our group.
      // Bound our own lifecycle without claiming their termination.
      child?.stdin?.destroy(); child?.stdout?.destroy(); child?.stderr?.destroy(); child?.unref();
      resolveResult({ exitCode: error || signal ? null : exitCode, signal: signal ?? null, error,
        truncated, cleanup: { settlement, processGroup: 'best-effort', detachedDescendants: 'UNVERIFIED' },
        stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) });
    };
    try {
      child = spawn(command[0], command.slice(1), { cwd, shell: false, detached: process.platform !== 'win32',
        env: { LANG: 'C', LC_ALL: 'C' }, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) { error = { code: e.code ?? 'SPAWN_ERROR' }; finish(null, null); return; }
    const consume = target => chunk => {
      if (settled) return;
      const remaining = Math.max(0, limits.maxOutputBytes - size);
      if (remaining) target.push(chunk.subarray(0, remaining));
      size += chunk.length;
      if (size > limits.maxOutputBytes) { truncated = true; error ??= { code: 'OUTPUT_LIMIT' }; finish(null, null, 'output-limit'); }
    };
    child.stdout.on('data', consume(stdout)); child.stderr.on('data', consume(stderr));
    child.on('error', e => { error ??= { code: e.code ?? 'SPAWN_ERROR' }; finish(null, null, 'error'); });
    child.on('close', finish);
    child.stdin.on('error', e => { error ??= { code: e.code ?? 'STDIN_ERROR' }; finish(null, null, 'stdin-error'); });
    child.stdin.end(stdin);
    timer = setTimeout(() => { error ??= { code: 'TIMEOUT' }; finish(null, null, 'deadline'); }, limits.timeoutMs);
  });
}
function materialize(root, spec) {
  mkdirSync(root, { mode: 0o700 });
  for (const file of [...spec.files, { path: 'TASK.md', content: JSON.stringify(spec.packet, null, 2) }]) {
    if (!/^[A-Za-z0-9_.\-/]+$/.test(file.path) || file.path.split('/').some(p => !p || p === '.' || p === '..') || isAbsolute(file.path)) fail('unsafe-case-path');
    mkdirSync(dirname(join(root, file.path)), { recursive: true, mode: 0o700 });
    store(root, file.path, file.content);
  }
}

/** One admitted source case and one pinned repository fixture with allowlisted modes.
 * A native invocation is recorded as a FUTURE PLAN only: native/model launching
 * is disabled, even if a caller supplies configuration asking for it. Caller-selected programs are unsupported. The pinned fixture is source-test code,
 * not a security sandbox for arbitrary programs.
 * Evidence is write-once by this collector, preserved on failure, and hash-bound
 * for later verification. Filesystem permissions do not make it WORM storage. */
export async function collectPlanCheckerCase({ attemptsRoot, transport, limits: requestedLimits } = {}) {
  if (!exact(transport, ['kind', 'mode']) || transport.kind !== 'offline-fixture'
    || typeof transport.mode !== 'string' || transport.mode.length > 32 || !FIXTURE_MODES.has(transport.mode)) {
    fail('native-launch-disabled: use the pinned offline fixture mode selector');
  }
  safeDirectory(dirname(FIXTURE_PATH));
  const fixtureBytes = boundedFile(dirname(FIXTURE_PATH), 'plan-checker-worker.mjs');
  if (digest(fixtureBytes) !== FIXTURE_SHA256) fail('pinned-fixture-mismatch');
  const root = safeDirectory(attemptsRoot), limits = limitsFor(requestedLimits);
  const runId = randomUUID(), caseId = `${admitted.id}-${randomUUID()}`;
  const attemptRoot = join(root, runId), workspaceRoot = join(attemptRoot, 'worker');
  mkdirSync(attemptRoot, { mode: 0o700 });
  const evidenceRoot = join(attemptRoot, 'evidence'); mkdirSync(evidenceRoot, { mode: 0o700 });
  const command = candidateCommand();
  const spec = trustedSpec(runId, caseId);
  materialize(workspaceRoot, spec);
  const snapshot = captureInputSnapshot(workspaceRoot, evidenceRoot, 'inputs.json', {
    sources: spec.files.filter(f => !f.path.endsWith('.md')).map(f => f.path),
    instructions: [...spec.files.filter(f => f.path.endsWith('.md')).map(f => f.path), 'TASK.md'],
  });
  const verificationIdentity = { runId, caseId, snapshotSha256: snapshot.sha256, command };
  const before = captureReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', verificationIdentity);
  const stdin = Buffer.from(JSON.stringify(spec.packet, null, 2));
  const invocation = { version: 1, runId, caseId, snapshotSha256: snapshot.sha256,
    transport: 'offline-fixture', fixture: { path: FIXTURE_PATH, sha256: FIXTURE_SHA256, mode: transport.mode },
    command: [process.execPath, FIXTURE_PATH, transport.mode], cwd: workspaceRoot,
    stdinSha256: digest(stdin), stdinBytes: stdin.length, limits,
    independentVerification: { command, limits: { timeoutMs: 10000, maxOutputBytes: 128 * 1024 }, source: 'trusted-admitted-case' },
    plannedNativeInvocation: nativePlan(workspaceRoot) };
  store(evidenceRoot, 'stdin.bin', stdin); store(evidenceRoot, 'invocation.json', json(invocation));
  const worker = await execute(invocation.command, workspaceRoot, stdin, limits);
  store(evidenceRoot, 'stdout.jsonl', worker.stdout); store(evidenceRoot, 'stderr.bin', worker.stderr);
  const processResult = { exitCode: worker.exitCode, signal: worker.signal, error: worker.error, truncated: worker.truncated, cleanup: worker.cleanup };
  store(evidenceRoot, 'process.json', json(processResult));
  const parsed = parsePlanCheckerJsonl(worker.stdout);
  store(evidenceRoot, 'final-output.txt', parsed.finalOutput ?? '');
  const inputs = verifyInputSnapshot(workspaceRoot, evidenceRoot, 'inputs.json', snapshot.sha256);
  const audit = verifyReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', before.sha256, verificationIdentity);
  // The candidate program comes from the trusted admitted case, never from a
  // worker-mutated tree. Create it only after bounded worker collection has settled; detached descendant
  // termination is unverified, so this remains offline-source evidence only.
  const oracleRoot = join(attemptRoot, 'oracle'); materialize(oracleRoot, spec);
  const oracleRun = await execute(command, oracleRoot, Buffer.alloc(0), invocation.independentVerification.limits);
  store(evidenceRoot, 'verification.json', json({ version: 2, ...verificationIdentity,
    exitCode: oracleRun.exitCode, signal: oracleRun.signal, error: oracleRun.error, truncated: oracleRun.truncated,
    stdout: oracleRun.stdout.toString('utf8'), stderr: oracleRun.stderr.toString('utf8') }));
  captureEvidence(evidenceRoot, 'verification.json', 'verification-record.json', verificationIdentity);
  const scope = { status: 'UNVERIFIED', reason: 'Native string events cannot attest complete worker tool argv or scope.' };
  const execution = { ...processResult, rawOutput: parsed.finalOutput ?? '' };
  const roleScore = scoreVerifiedPlanCheckerCase(spec, execution, { workspaceRoot, evidenceRoot, expectedIdentity: verificationIdentity,
    snapshotPath: 'inputs.json', recordPath: 'verification-record.json', reviewSnapshotPath: 'before.json', reviewSnapshotSha256: before.sha256,
    scopePass: false });
  const collection = { pass: worker.exitCode === 0 && worker.signal === null && worker.error === null && !worker.truncated };
  // Independent oracle validity is separate from input/audit/report acceptance.
  const oracleLines = oracleRun.stdout.toString('utf8').split(/\r?\n/);
  const oracle = { pass: oracleRun.exitCode === 0 && oracleRun.signal === null && oracleRun.error === null && !oracleRun.truncated
    && oracleLines.filter(l => /^# pass /.test(l)).join('') === '# pass 2'
    && oracleLines.filter(l => /^# fail /.test(l)).join('') === '# fail 0'
    && spec.deterministicChecks.requiredOutput.every(l => oracleLines.includes(l)) };
  const reportClaimsMatchOracle = collection.pass && parsed.pass && inputs.pass && audit.pass
    && Object.entries(roleScore.checks).every(([key, value]) => key === 'scope' || value === 1);
  const artifacts = Object.fromEntries(ARTIFACTS.map(name => [name, digest(boundedFile(evidenceRoot, name))]));
  const manifest = { version: 1, runId, caseId, snapshotSha256: snapshot.sha256,
    invocationSha256: artifacts['invocation.json'], stdoutSha256: artifacts['stdout.jsonl'], finalSha256: artifacts['final-output.txt'], artifacts };
  store(evidenceRoot, 'collection.json', json(manifest));
  const binding = { runId, caseId, snapshotSha256: snapshot.sha256, invocationSha256: manifest.invocationSha256,
    stdoutSha256: manifest.stdoutSha256, finalSha256: manifest.finalSha256, manifestSha256: digest(Buffer.from(json(manifest))) };
  return { attemptRoot, workspaceRoot, evidenceRoot, binding, verificationIdentity, collection, parse: parsed, inputs, audit, oracle,
    roleScore, reportClaimsMatchOracle, scope, workerCommand: { status: 'UNVERIFIED' }, modelCalls: 0, observedRuntime: null,
    g01ModelQualified: false, evidenceLevel: 'offline-fixture-collection-only' };
}

/** Caller must retain the returned binding outside the evidence directory.
 * A caller/worker-supplied replacement binding is not authentication. */
export function verifyPlanCheckerCollection(attemptRoot, expected) {
  try {
    const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
    if (!exact(expected, bindingKeys) || !uuid(expected.runId)
      || typeof expected.caseId !== 'string' || !expected.caseId.startsWith(`${admitted.id}-`)
      || !uuid(expected.caseId.slice(admitted.id.length + 1))
      || !bindingKeys.filter(key => key.endsWith('Sha256')).every(key => hashValue(expected[key]))) fail('invalid-binding');
    const root = safeDirectory(attemptRoot), evidenceRoot = safeDirectory(join(root, 'evidence'));
    if (root !== join(dirname(root), expected.runId)) fail('attempt-run-mismatch');
    const bytes = boundedFile(evidenceRoot, 'collection.json');
    if (digest(bytes) !== expected.manifestSha256) fail('manifest-mismatch');
    const manifest = strictEvent(bytes.toString('utf8'));
    if (!exact(manifest, ['version', ...bindingKeys.filter(k => k !== 'manifestSha256'), 'artifacts'])
      || manifest.version !== 1 || !exact(manifest.artifacts, ARTIFACTS)) fail('invalid-manifest');
    for (const key of bindingKeys.filter(k => k !== 'manifestSha256')) {
      if (manifest[key] !== expected[key]) fail('binding-mismatch');
    }
    const artifacts = Object.fromEntries(ARTIFACTS.map(name => {
      const content = boundedFile(evidenceRoot, name);
      if (!hashValue(manifest.artifacts[name]) || digest(content) !== manifest.artifacts[name]) fail('artifact-mismatch');
      return [name, content];
    }));
    for (const [key, name] of [['snapshotSha256', 'inputs.json'], ['invocationSha256', 'invocation.json'],
      ['stdoutSha256', 'stdout.jsonl'], ['finalSha256', 'final-output.txt']]) {
      if (manifest[key] !== manifest.artifacts[name]) fail('top-artifact-mismatch');
    }
    const read = name => strictEvent(new TextDecoder('utf8', { fatal: true }).decode(artifacts[name]));
    const identity = { runId: expected.runId, caseId: expected.caseId, snapshotSha256: expected.snapshotSha256, command: candidateCommand() };
    const identityMatches = value => ['runId', 'caseId', 'snapshotSha256'].every(key => value[key] === identity[key])
      && same(value.command, identity.command);
    const invocation = read('invocation.json'), workspace = join(root, 'worker');
    if (!exact(invocation, ['version', 'runId', 'caseId', 'snapshotSha256', 'transport', 'fixture', 'command', 'cwd',
      'stdinSha256', 'stdinBytes', 'limits', 'independentVerification', 'plannedNativeInvocation'])
      || invocation.version !== 1 || invocation.transport !== 'offline-fixture'
      || !exact(invocation.fixture, ['path', 'sha256', 'mode']) || invocation.fixture.path !== FIXTURE_PATH
      || invocation.fixture.sha256 !== FIXTURE_SHA256 || !FIXTURE_MODES.has(invocation.fixture.mode)
      || !same(invocation.command, [process.execPath, FIXTURE_PATH, invocation.fixture.mode])
      || !['runId', 'caseId', 'snapshotSha256'].every(key => invocation[key] === identity[key])
      || invocation.cwd !== workspace || !exact(invocation.limits, ['timeoutMs', 'maxOutputBytes'])
      || !same(limitsFor(invocation.limits), invocation.limits)
      || !same(invocation.independentVerification, { command: candidateCommand(), limits: { timeoutMs: 10000, maxOutputBytes: 128 * 1024 }, source: 'trusted-admitted-case' })
      || !same(invocation.plannedNativeInvocation, nativePlan(workspace))
      || invocation.stdinSha256 !== digest(artifacts['stdin.bin']) || invocation.stdinBytes !== artifacts['stdin.bin'].length) fail('invocation-mismatch');
    const spec = trustedSpec(identity.runId, identity.caseId);
    const task = JSON.stringify(spec.packet, null, 2);
    if (!artifacts['stdin.bin'].equals(Buffer.from(task))) fail('stdin-packet-mismatch');
    const visible = [...spec.files, { path: 'TASK.md', content: task }];
    const files = ['source', 'instruction'].flatMap(kind => visible.filter(file => file.path.endsWith('.md') === (kind === 'instruction'))
      .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
      .map(file => ({ kind, path: file.path, sha256: digest(file.content) })));
    if (!artifacts['inputs.json'].equals(Buffer.from(json({ version: 1, files })))) fail('canonical-input-mismatch');
    const before = read('before.json');
    const validMode = mode => Number.isInteger(mode) && mode >= 0 && mode <= 0o7777;
    const directories = new Set();
    for (const file of files) {
      let path = dirname(file.path);
      while (path !== '.') { directories.add(path); path = dirname(path); }
    }
    if (!exact(before, ['version', 'kind', 'snapshotSha256', 'runId', 'caseId', 'command', 'rootMode', 'entries'])
      || before.version !== 1 || before.kind !== 'review-workspace' || !identityMatches(before) || !validMode(before.rootMode)
      || !Array.isArray(before.entries) || before.entries.length !== files.length + directories.size
      || new Set(before.entries.map(entry => entry?.path)).size !== before.entries.length
      || before.entries.some(entry => !validMode(entry?.mode) || (entry.kind === 'directory'
        ? !exact(entry, ['path', 'kind', 'mode']) || !directories.has(entry.path)
        : entry.kind !== 'file' || !exact(entry, ['path', 'kind', 'mode', 'sha256'])
          || !files.some(file => file.path === entry.path && file.sha256 === entry.sha256)))) fail('review-snapshot-mismatch');
    const parsed = parsePlanCheckerJsonl(artifacts['stdout.jsonl']);
    if (!artifacts['final-output.txt'].equals(Buffer.from(parsed.finalOutput ?? ''))) fail('selected-final-mismatch');
    const result = read('process.json');
    const validProcess = value => (value.exitCode === null || (Number.isSafeInteger(value.exitCode) && value.exitCode >= 0))
      && (value.signal === null || (typeof value.signal === 'string' && value.signal.length > 0))
      && (value.error === null || (exact(value.error, ['code']) && typeof value.error.code === 'string' && value.error.code.length > 0))
      && typeof value.truncated === 'boolean' && ((value.exitCode === null) === (value.signal !== null || value.error !== null));
    if (!exact(result, ['exitCode', 'signal', 'error', 'truncated', 'cleanup']) || !validProcess(result)
      || !exact(result.cleanup, ['settlement', 'processGroup', 'detachedDescendants'])
      || !['close', 'deadline', 'output-limit', 'stdin-error', 'error'].includes(result.cleanup.settlement)
      || result.cleanup.processGroup !== 'best-effort' || result.cleanup.detachedDescendants !== 'UNVERIFIED'
      || (result.cleanup.settlement === 'deadline' && result.error?.code !== 'TIMEOUT')
      || (result.cleanup.settlement === 'output-limit' && (result.error?.code !== 'OUTPUT_LIMIT' || !result.truncated))
      || (result.cleanup.settlement !== 'close' && result.error === null)
      || artifacts['stdout.jsonl'].length + artifacts['stderr.bin'].length > invocation.limits.maxOutputBytes) fail('process-result-mismatch');
    const verification = read('verification.json'), evidence = read('verification-record.json');
    if (!exact(evidence, ['version', 'snapshotSha256', 'runId', 'caseId', 'command', 'artifactPath', 'sha256'])
      || evidence.version !== 4 || !identityMatches(evidence) || evidence.artifactPath !== 'verification.json'
      || evidence.sha256 !== manifest.artifacts['verification.json']
      || !exact(verification, ['version', 'runId', 'caseId', 'snapshotSha256', 'command', 'exitCode', 'signal', 'error', 'truncated', 'stdout', 'stderr'])
      || verification.version !== 2 || !identityMatches(verification) || !validProcess(verification)) fail('verification-identity-mismatch');
    const verificationEvidence = loadVerificationEvidence(evidenceRoot, 'verification-record.json', identity);
    if (!verificationEvidence.pass && verificationEvidence.reason !== 'incomplete-evidence') fail('invalid-verification-evidence');
    // Integrity is allowed for failed attempts. Current input/tree and process
    // success are separate observations, never prerequisites for preserving them.
    const inputs = verifyInputSnapshot(workspace, evidenceRoot, 'inputs.json', identity.snapshotSha256);
    const audit = verifyReviewWorkspace(workspace, evidenceRoot, 'before.json', manifest.artifacts['before.json'], identity);
    return { pass: true, reason: null, inputs, audit, parse: { pass: parsed.pass, reason: parsed.reason },
      processSucceeded: result.exitCode === 0 && result.signal === null && result.error === null && !result.truncated,
      verificationEvidence: { pass: verificationEvidence.pass, reason: verificationEvidence.reason } };
  } catch (error) { return { pass: false, reason: error.message }; }
}
