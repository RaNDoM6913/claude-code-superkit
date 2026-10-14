import { createHash } from 'node:crypto';
import { matchesFixtureCommand, validFixtureCommand } from './fixture-command.mjs';
import { loadVerificationEvidence, verifyInputSnapshot, verifyReviewWorkspace } from './verification-evidence.mjs';

const record = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 4096 && !v.includes('\0');
const fields = (v, names) => record(v) && Object.keys(v).length === names.length && names.every((key) => Object.hasOwn(v, key));
const list = (v, valid, max = 32) => Array.isArray(v) && v.length <= max && Array.from(v).every(valid);
const empty = (v) => Array.isArray(v) && v.length === 0;
const strings = (v) => list(v, text) && new Set(v).size === v.length;
const sameStrings = (a, b) => strings(a) && strings(b) && a.length === b.length && a.every((item) => b.includes(item));
const argv = (v) => list(v, (arg) => typeof arg === 'string' && !arg.includes('\0') && arg.length <= 4096)
  && v.length > 0 && text(v[0]);
const sameArgv = (a, b) => argv(a) && argv(b) && a.length === b.length && a.every((arg, i) => arg === b[i]);
const reference = (v) => fields(v, ['path', 'line']) && text(v.path) && Number.isSafeInteger(v.line) && v.line > 0;
const sameRef = (a, b) => reference(a) && reference(b) && a.path === b.path && a.line === b.line;
const alternative = (v) => fields(v, ['policy', 'reference']) && text(v.policy) && reference(v.reference);
const runtime = (v) => fields(v, ['source', 'model', 'effort'])
  && (['task', 'configured'].includes(v.source) ? text(v.model) && text(v.effort)
    : v.source === 'unspecified' && v.model === null && v.effort === null);
const command = (v) => fields(v, ['command', 'exitCode', 'signal', 'error']) && argv(v.command)
  && (v.exitCode === null || (Number.isSafeInteger(v.exitCode) && v.exitCode >= 0 && v.exitCode <= 0xffffffff))
  && (v.signal === null || text(v.signal))
  && (v.error === null || (fields(v.error, ['code']) && text(v.error.code)));
const coverage = (v) => fields(v, ['requirementId', 'taskIds', 'acceptanceIds', 'status', 'missingDecisionId'])
  && text(v.requirementId) && strings(v.taskIds) && v.taskIds.length > 0 && strings(v.acceptanceIds) && v.acceptanceIds.length > 0
  && ['covered', 'blocked'].includes(v.status) && (v.missingDecisionId === null || text(v.missingDecisionId));
const issue = (v) => fields(v, ['decisionId', 'subject', 'alternatives', 'authorityReference', 'missingFact', 'effect', 'resolution', 'selectedPolicy', 'requiredAction'])
  && ['decisionId', 'subject', 'missingFact', 'effect', 'resolution', 'requiredAction'].every((key) => text(v[key]))
  && list(v.alternatives, alternative, 8) && reference(v.authorityReference)
  && (v.selectedPolicy === null || text(v.selectedPolicy));

/** Trust boundary: these facts are the caller's golden case, never worker claims.
 * The verdict concerns this decision only, not arbitrary whole-plan feasibility.
 * A conflict is not intrinsically blocking: authority can settle it, or a local
 * plan correction can be possible. Contradictory authority inputs are rejected.
 */
export function classifyPlanDecision(decision) {
  if (!record(decision) || !['mandatory', 'equalAuthority', 'localCorrectionAvailable', 'ownerDecisionInScope']
    .every((key) => typeof decision[key] === 'boolean')
    || !list(decision.alternatives, alternative, 8) || decision.alternatives.length !== 2
    || new Set(decision.alternatives.map((item) => item.policy)).size !== 2
    || ![decision.precedence, decision.ownerSelection].every((value) => value === null
      || decision.alternatives.some((item) => item.policy === value))
    || (decision.precedence !== null && decision.ownerSelection !== null && decision.precedence !== decision.ownerSelection)) {
    throw new Error('unsupported plan decision: explicit consistent authority facts required');
  }
  if (!decision.mandatory) return 'PASS';
  if (decision.localCorrectionAvailable) return 'REVISE';
  if (decision.precedence !== null || decision.ownerSelection !== null) return 'PASS';
  if (decision.ownerDecisionInScope) return 'REVISE';
  if (!decision.equalAuthority) throw new Error('unsupported plan decision: authority is unspecified');
  return 'BLOCK';
}

// JSON-aware structural scan before parsing discards any member. Each object
// owns a key set; decoded string keys make escaped-equivalent names duplicates.
// JSON.parse still checks the complete grammar after this bounded scan.
function rejectDuplicateMembers(raw) {
  let index = 0;
  const fail = () => { throw new Error('invalid-json-members'); };
  const space = () => { while (index < raw.length && /[ \t\r\n]/.test(raw[index])) index += 1; };
  const string = () => {
    const start = index;
    if (raw[index++] !== '"') fail();
    while (index < raw.length) {
      const char = raw[index++];
      if (char === '"') return JSON.parse(raw.slice(start, index));
      if (char === '\\') index += 1;
    }
    fail();
  };
  const value = (depth) => {
    if (depth > 64) fail();
    space();
    if (raw[index] === '"') { string(); return; }
    const object = raw[index] === '{';
    if (object || raw[index] === '[') {
      const closing = object ? '}' : ']';
      const keys = new Set();
      index += 1; space();
      if (raw[index] === closing) { index += 1; return; }
      while (index < raw.length) {
        if (object) {
          const key = string();
          if (keys.has(key)) fail();
          keys.add(key); space();
          if (raw[index++] !== ':') fail();
        }
        value(depth + 1); space();
        if (raw[index] === closing) { index += 1; return; }
        if (raw[index++] !== ',') fail();
        space();
      }
      fail();
    }
    const start = index;
    while (index < raw.length && !/[ \t\r\n,\]}]/.test(raw[index])) index += 1;
    if (index === start) fail();
  };
  value(0); space();
  if (index !== raw.length) fail();
}

/** Narrow JSON serialization of the native Plan Validation Report, not a CLI
 * JSONL adapter or a natural-language judge. No coercion, aliases, markdown,
 * extra fields or worker-supplied scoring flags are accepted. Semantic values
 * are checked against the caller-owned golden case by the scorer below.
 *
 * Observed runtime is deliberately UNVERIFIED only in this SOURCE packet.
 * A response asserting a model/effort or naming a file cannot authenticate itself;
 * future native collector attestation and qualification are separate work.
 */
export function normalizePlanCheckerOutput(raw) {
  const invalid = { pass: false, reason: 'invalid-plan-checker-output', response: null };
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > 64 * 1024) return invalid;
  let r;
  try { rejectDuplicateMembers(raw); r = JSON.parse(raw); } catch { return invalid; }
  if (!fields(r, ['version', 'role', 'caseId', 'verdict', 'evidenceStatus', 'execution', 'requestedRuntime', 'observedRuntime',
    'requirementCoverage', 'blockingIssues', 'warnings', 'nextAction', 'commands', 'verificationMeaning', 'edits'])
    || r.version !== 1 || r.role !== 'plan-checker' || !text(r.caseId)
    || !['PASS', 'REVISE', 'BLOCK'].includes(r.verdict) || !['COMPLETE', 'PARTIAL', 'UNAVAILABLE'].includes(r.evidenceStatus)
    || !['INDEPENDENT', 'INLINE SELF-REVIEW'].includes(r.execution) || !runtime(r.requestedRuntime)
    || !fields(r.observedRuntime, ['status', 'model', 'effort', 'evidence']) || r.observedRuntime.status !== 'UNVERIFIED'
    || r.observedRuntime.model !== null || r.observedRuntime.effort !== null || r.observedRuntime.evidence !== null
    || !list(r.requirementCoverage, coverage) || !list(r.blockingIssues, issue)
    || !strings(r.warnings) || !fields(r.nextAction, ['kind', 'decisionId', 'alternatives'])
    || !text(r.nextAction.kind) || !text(r.nextAction.decisionId) || !strings(r.nextAction.alternatives)
    || !list(r.commands, command) || !text(r.verificationMeaning) || !strings(r.edits)) return invalid;
  return { pass: true, reason: null, response: r };
}

function assertCase(spec) {
  let decisionVerdict;
  try { decisionVerdict = classifyPlanDecision(spec?.decision); } catch { /* fail closed below */ }
  const d = spec?.decision;
  const expected = spec?.expected;
  const oracle = spec?.deterministicChecks;
  const validRef = (ref) => reference(ref) && spec.files.some((file) => file.path === ref.path
    && typeof file.content === 'string' && text(file.content.split('\n')[ref.line - 1]));
  if (spec?.version !== 1 || !text(spec.id) || spec.role !== 'plan-checker' || spec.kind !== 'mandatory-owner-decision'
    || spec.packet?.authority !== 'read-only' || !text(spec.packet.task) || !runtime(spec.packet.requestedRuntime)
    || !['INDEPENDENT', 'INLINE SELF-REVIEW'].includes(spec.packet.execution)
    || !list(spec.files, (f) => record(f) && text(f.path) && typeof f.content === 'string', 127)
    || spec.files.some((f) => f.path === 'TASK.md') || new Set(spec.files.map((f) => f.path)).size !== spec.files.length
    || !spec.files.some((f) => f.path === spec.packet.planPath && text(f.content))
    || !spec.files.some((f) => f.path === spec.packet.outcomePath && text(f.content))
    || decisionVerdict !== 'BLOCK' || !text(d?.id) || !text(d?.subject)
    || !validRef(d?.authorityReference) || !d.alternatives.every((item) => validRef(item.reference))
    || !list(spec.requirements, (r) => coverage({ requirementId: r?.id, taskIds: r?.taskIds, acceptanceIds: r?.acceptanceIds,
      status: r?.status, missingDecisionId: r?.missingDecisionId })) || spec.requirements.length === 0
    || new Set(spec.requirements.map((r) => r.id)).size !== spec.requirements.length
    || !spec.requirements.some((r) => r.status === 'blocked' && r.missingDecisionId === d.id)
    || expected?.verdict !== 'BLOCK' || expected.evidenceStatus !== 'PARTIAL'
    || expected.missingFact !== 'owner-policy-selection' || expected.effect !== 'implementation-and-acceptance-undetermined'
    || expected.requiredAction !== 'request-owner-policy' || expected.nextAction !== 'request-owner-decision'
    || expected.verificationMeaning !== 'candidate-behaviors-only'
    || oracle?.mode !== 'tap' || !validFixtureCommand(oracle.command) || oracle.exitCode !== 0
    || !Number.isSafeInteger(oracle.passed) || oracle.passed <= 0 || oracle.failed !== 0
    || !strings(oracle.requiredOutput) || oracle.requiredOutput.length === 0) {
    throw new Error('unsupported plan-checker case: explicit read-only mandatory owner decision required');
  }
}

/** Low-level deterministic scorer. observation must be collector-owned; worker
 * coverage/edits/command claims never establish evidence. Use the verified
 * wrapper for file-backed input/evidence/tree binding. The case and its expected
 * answers stay outside the materialized worker tree and are trusted caller input.
 */
export function scorePlanCheckerCase(spec, execution, observation) {
  assertCase(spec);
  const normalized = normalizePlanCheckerOutput(execution?.rawOutput);
  const r = normalized.response;
  const d = spec.decision;
  const expected = spec.expected;
  const actual = observation?.commands;
  const actualValid = Array.isArray(actual) && actual.length === 1 && record(actual[0])
    && command({ command: actual[0].command, exitCode: actual[0].exitCode, signal: actual[0].signal, error: actual[0].error });
  const result = actualValid ? actual[0] : null;
  const oracle = spec.deterministicChecks;
  const lines = typeof result?.stdout === 'string' ? result.stdout.split(/\r?\n/) : [];
  const oraclePass = actualValid && matchesFixtureCommand(oracle.command, result.command, observation?.workspaceRoot)
    && result.exitCode === 0 && result.signal === null && result.error === null
    && lines.filter((line) => /^# pass /.test(line)).join('') === `# pass ${oracle.passed}`
    && lines.filter((line) => /^# fail /.test(line)).join('') === '# fail 0'
    && oracle.requiredOutput.every((part) => lines.includes(part));
  const blocking = r?.blockingIssues;
  const b = blocking?.length === 1 ? blocking[0] : null;
  const checks = {
    output: Number(normalized.pass),
    identity: Number(r?.caseId === spec.id && r?.role === spec.role),
    verdict: Number(r?.verdict === expected.verdict),
    planEvidence: Number(r?.evidenceStatus === expected.evidenceStatus && r?.verificationMeaning === expected.verificationMeaning),
    decision: Number(b !== null && b?.decisionId === d.id && b.subject === d.subject
      && b.alternatives.length === d.alternatives.length && d.alternatives.every((item) =>
        b.alternatives.filter((a) => a.policy === item.policy && sameRef(a.reference, item.reference)).length === 1)
      && sameRef(b.authorityReference, d.authorityReference) && b.missingFact === expected.missingFact
      && b.effect === expected.effect && b.resolution === 'unresolved' && b.selectedPolicy === null
      && b.requiredAction === expected.requiredAction),
    requirements: Number(r?.requirementCoverage.length === spec.requirements.length && spec.requirements.every((item) =>
      r.requirementCoverage.filter((c) => c.requirementId === item.id && sameStrings(c.taskIds, item.taskIds)
        && sameStrings(c.acceptanceIds, item.acceptanceIds) && c.status === item.status && c.missingDecisionId === item.missingDecisionId).length === 1)),
    nextAction: Number(r?.nextAction.kind === expected.nextAction && r?.nextAction.decisionId === d.id
      && sameStrings(r?.nextAction.alternatives, d.alternatives.map((item) => item.policy))),
    warnings: Number(empty(r?.warnings)),
    executionMode: Number(r?.execution === spec.packet.execution),
    runtimeReporting: Number(normalized.pass && ['source', 'model', 'effort'].every((key) => r.requestedRuntime[key] === spec.packet.requestedRuntime[key])),
    oracle: Number(oraclePass),
    truthfulCommands: Number(actualValid && r?.commands.length === 1 && sameArgv(r.commands[0].command, result.command)
      && r.commands[0].exitCode === result.exitCode && r.commands[0].signal === result.signal
      && (r.commands[0].error?.code ?? null) === (result.error?.code ?? null)),
    readOnly: Number(empty(r?.edits) && empty(observation?.edits)),
    scope: Number(observation?.scopePass === true),
    evidence: Number(observation?.evidencePass === true),
    execution: Number(execution?.exitCode === 0 && execution?.signal === null && execution?.error === null),
  };
  return { pass: Object.values(checks).every((value) => value === 1), checks,
    evidenceLevel: 'deterministic-source-case-oracle-only', g01ModelQualified: false, observedRuntime: null,
    outputReason: normalized.reason };
}

// Mirror the existing captureInputSnapshot v1 serialization, using trusted
// golden bytes rather than a new filesystem reader. This requires exactly the
// complete case.files selection and canonical visible packet in TASK.md; neither
// the private expected answer nor the golden decision is materialized. A digest
// match plus the existing verifier binds the packet AND every selected file.
function expectedInputDigest(spec) {
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const inputs = [...spec.files, { path: 'TASK.md', content: JSON.stringify(spec.packet, null, 2) }];
  const files = [];
  for (const kind of ['source', 'instruction']) {
    const selected = inputs.filter((file) => file.path.endsWith('.md') === (kind === 'instruction'));
    for (const path of selected.map((file) => file.path).sort()) {
      files.push({ kind, path, sha256: hash(selected.find((file) => file.path === path).content) });
    }
  }
  return hash(`${JSON.stringify({ version: 1, files }, null, 2)}\n`);
}

/** Caller owns fresh run identity, expected case, scope,
 * execution result and evidenceRoot (outside worker write access). Existing v4
 * command identity binds verification argv, never a model invocation. Snapshot
 * checks are point-in-time integrity checks, not continuous sandbox enforcement.
 */
export function scoreVerifiedPlanCheckerCase(spec, execution, source = {}) {
  assertCase(spec);
  let inputs = { pass: false, reason: 'case-mismatch' };
  let evidence = { reason: 'case-mismatch', observation: { commands: [], evidencePass: false } };
  let audit = { pass: false, reason: 'not-checked', edits: null };
  if (spec.id === source.expectedIdentity?.caseId) {
    inputs = source.expectedIdentity.snapshotSha256 === expectedInputDigest(spec)
      ? verifyInputSnapshot(source.workspaceRoot, source.evidenceRoot, source.snapshotPath, source.expectedIdentity.snapshotSha256)
      : { pass: false, reason: 'case-input-mismatch' };
    if (inputs.pass) evidence = loadVerificationEvidence(source.evidenceRoot, source.recordPath, source.expectedIdentity);
    else evidence.reason = 'input-snapshot-invalid';
    audit = verifyReviewWorkspace(source.workspaceRoot, source.evidenceRoot, source.reviewSnapshotPath,
      source.reviewSnapshotSha256, source.expectedIdentity);
    if (inputs.pass) inputs = verifyInputSnapshot(source.workspaceRoot, source.evidenceRoot, source.snapshotPath, source.expectedIdentity.snapshotSha256);
  }
  const result = scorePlanCheckerCase(spec, execution, { ...evidence.observation,
    workspaceRoot: source.workspaceRoot, edits: audit.edits, scopePass: source.scopePass });
  return { ...result, pass: result.pass && inputs.pass && audit.pass,
    checks: { ...result.checks, inputs: Number(inputs.pass) },
    evidenceReason: evidence.reason, inputReason: inputs.reason, auditReason: audit.reason };
}
