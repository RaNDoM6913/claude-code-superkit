import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { captureEvidence, captureInputSnapshot, captureReviewWorkspace, loadVerificationEvidence } from '../tools/lib/verification-evidence.mjs';
import { classifyPlanDecision, normalizePlanCheckerOutput, scorePlanCheckerCase, scoreVerifiedPlanCheckerCase } from '../tools/lib/plan-checker-eval.mjs';

const scenario = JSON.parse(readFileSync(new URL('./fixtures/astra-native/plan-checker-case.json', import.meta.url), 'utf8'));

function setup(t, fixture = scenario, omittedInputs = []) {
  const evidenceRoot = mkdtempSync(join(tmpdir(), 'astra-plan-checker-'));
  t.after(() => rmSync(evidenceRoot, { recursive: true, force: true }));
  const workspaceRoot = join(evidenceRoot, 'workspace');
  mkdirSync(workspaceRoot);
  for (const file of fixture.files) {
    const path = join(workspaceRoot, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.content);
  }
  // Only the visible packet is materialized; golden decision/expected fields stay outside.
  writeFileSync(join(workspaceRoot, 'TASK.md'), JSON.stringify(fixture.packet, null, 2));
  const snapshot = captureInputSnapshot(workspaceRoot, evidenceRoot, 'inputs.json', {
    sources: fixture.files.filter((f) => !f.path.endsWith('.md')).map((f) => f.path).filter((path) => !omittedInputs.includes(path)),
    instructions: [...fixture.files.filter((f) => f.path.endsWith('.md')).map((f) => f.path), 'TASK.md'].filter((path) => !omittedInputs.includes(path)),
  });
  const command = [process.execPath, '--test', '--test-reporter=tap', 'test/policies.test.js'];
  const expectedIdentity = { snapshotSha256: snapshot.sha256, runId: randomUUID(), caseId: fixture.id, command };
  const before = captureReviewWorkspace(workspaceRoot, evidenceRoot, 'before.json', expectedIdentity);
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  const result = spawnSync(command[0], command.slice(1), { cwd: workspaceRoot, env, encoding: 'utf8', timeout: 10000, maxBuffer: 128 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^# pass 2$/m);
  writeFileSync(join(evidenceRoot, 'verification.json'), JSON.stringify({ version: 2, ...expectedIdentity,
    exitCode: result.status, signal: result.signal, error: null, stdout: result.stdout, stderr: result.stderr, truncated: false }));
  captureEvidence(evidenceRoot, 'verification.json', 'record.json', expectedIdentity);
  return { workspaceRoot, evidenceRoot, expectedIdentity, snapshotPath: 'inputs.json', recordPath: 'record.json',
    reviewSnapshotPath: 'before.json', reviewSnapshotSha256: before.sha256, scopePass: true };
}

// Hand-authored structured fixture response. This is never model/provider evidence.
function response(source) {
  return { version: 1, role: 'plan-checker', caseId: 'plan-checker-mandatory-policy',
    verdict: 'BLOCK', evidenceStatus: 'PARTIAL', execution: 'INDEPENDENT',
    requestedRuntime: { source: 'task', model: 'gpt-5.6-sol', effort: 'high' },
    observedRuntime: { status: 'UNVERIFIED', model: null, effort: null, evidence: null },
    requirementCoverage: [
      { requirementId: 'existing-row', taskIds: ['T1', 'T2', 'T3'], acceptanceIds: ['existing-row-preserved'], status: 'covered', missingDecisionId: null },
      { requirementId: 'null-input', taskIds: ['T1', 'T2', 'T3'], acceptanceIds: ['owner-selected-null-policy'], status: 'blocked', missingDecisionId: 'null-policy' },
    ],
    blockingIssues: [{ decisionId: 'null-policy', subject: 'lookup(null)',
      alternatives: [{ policy: 'return-null', reference: { path: 'requirements/null.md', line: 1 } },
        { policy: 'throw-missing-row', reference: { path: 'requirements/error.md', line: 1 } }],
      authorityReference: { path: 'requirements/authority.md', line: 1 },
      missingFact: 'owner-policy-selection', effect: 'implementation-and-acceptance-undetermined',
      resolution: 'unresolved', selectedPolicy: null, requiredAction: 'request-owner-policy' }],
    warnings: [], nextAction: { kind: 'request-owner-decision', decisionId: 'null-policy', alternatives: ['return-null', 'throw-missing-row'] },
    commands: [{ command: [...source.expectedIdentity.command], exitCode: 0, signal: null, error: null }],
    verificationMeaning: 'candidate-behaviors-only', edits: [],
  };
}
const run = (r) => ({ exitCode: 0, signal: null, error: null, rawOutput: JSON.stringify(r) });
const score = (source, r) => scoreVerifiedPlanCheckerCase(scenario, run(r), source);
function observation(source) {
  return { ...loadVerificationEvidence(source.evidenceRoot, source.recordPath, source.expectedIdentity).observation,
    workspaceRoot: source.workspaceRoot, scopePass: true, edits: [] };
}

test('candidate tests pass while the mandatory unresolved policy correctly blocks the plan', (t) => {
  const source = setup(t);
  const result = score(source, response(source));
  assert.equal(result.pass, true, JSON.stringify(result));
  assert.equal(result.g01ModelQualified, false);
  assert.equal(result.observedRuntime, null);
  assert.equal(result.checks.planEvidence, 1);
  assert.equal(result.checks.oracle, 1);
  assert.equal(result.evidenceLevel, 'deterministic-source-case-oracle-only');
});

test('equal-authority conflict alone does not force BLOCK when resolution or local correction exists', () => {
  assert.equal(classifyPlanDecision(scenario.decision), 'BLOCK');
  assert.equal(classifyPlanDecision({ ...scenario.decision, precedence: 'return-null' }), 'PASS');
  assert.equal(classifyPlanDecision({ ...scenario.decision, ownerSelection: 'throw-missing-row' }), 'PASS');
  assert.equal(classifyPlanDecision({ ...scenario.decision, localCorrectionAvailable: true }), 'REVISE');
  assert.equal(classifyPlanDecision({ ...scenario.decision, ownerDecisionInScope: true }), 'REVISE');
  assert.equal(classifyPlanDecision({ ...scenario.decision, mandatory: false }), 'PASS');
});

test('native normalizer rejects malformed, missing, extra and coercible output without trusting prose', (t) => {
  const source = setup(t);
  for (const raw of ['BLOCK', '```json\n{}\n```', 'null', '[]', '{', JSON.stringify({ ...response(source), version: '1' }),
    JSON.stringify({ ...response(source), verdict: ['BLOCK'] }), JSON.stringify({ ...response(source), verdict: 'block' }), JSON.stringify({ ...response(source), coveragePass: true })]) {
    assert.equal(normalizePlanCheckerOutput(raw).pass, false, raw);
  }
  for (const field of Object.keys(response(source))) {
    const r = response(source); delete r[field];
    assert.equal(normalizePlanCheckerOutput(JSON.stringify(r)).pass, false, field);
  }
  for (const mutate of [
    (r) => { r.blockingIssues[0].authorityReference.line = '1'; },
    (r) => { r.blockingIssues[0].authorityReference.extra = true; },
    (r) => { r.requirementCoverage[0].verified = true; },
    (r) => { r.commands[0].exitCode = '0'; },
    (r) => { r.commands[0].command = 'node --test test/policies.test.js'; },
    (r) => { r.observedRuntime.extra = 'provider'; },
  ]) {
    const r = response(source); mutate(r);
    assert.equal(normalizePlanCheckerOutput(JSON.stringify(r)).pass, false);
  }
});

test('rejects false verdict, fabricated resolution, omissions, wrong references and coverage mapping', (t) => {
  const source = setup(t);
  const mutations = [
    (r) => { r.verdict = 'PASS'; }, (r) => { r.verdict = 'REVISE'; },
    (r) => { r.role = 'code-reviewer'; }, (r) => { r.caseId = 'ambiguous'; },
    (r) => { r.evidenceStatus = 'COMPLETE'; }, (r) => { r.evidenceStatus = 'UNAVAILABLE'; },
    (r) => { r.blockingIssues = []; },
    (r) => { r.blockingIssues[0].resolution = 'resolved'; r.blockingIssues[0].selectedPolicy = 'return-null'; },
    (r) => { r.blockingIssues[0].alternatives.pop(); },
    (r) => { r.blockingIssues[0].alternatives[0].reference.path = 'src/policies.js'; },
    (r) => { r.blockingIssues[0].alternatives[1].reference.line = 2; },
    (r) => { r.blockingIssues[0].alternatives.reverse(); r.blockingIssues[0].alternatives[0].policy = 'return-null'; },
    (r) => { r.blockingIssues[0].authorityReference.line = 2; },
    (r) => { r.blockingIssues[0].missingFact = ''; },
    (r) => { r.blockingIssues[0].effect = 'tests-pass-so-proceed'; },
    (r) => { r.blockingIssues[0].requiredAction = 'choose-return-null'; },
    (r) => { r.nextAction.kind = 'proceed'; },
    (r) => { r.nextAction.alternatives = ['return-null']; },
    (r) => { r.verificationMeaning = 'plan-is-feasible'; },
    (r) => { r.requirementCoverage.pop(); },
    (r) => { r.requirementCoverage[1].status = 'covered'; r.requirementCoverage[1].missingDecisionId = null; },
    (r) => { r.requirementCoverage[1].taskIds = ['T1']; },
    (r) => { r.requirementCoverage[1].acceptanceIds = ['existing-row-preserved']; },
  ];
  for (const mutate of mutations) {
    const r = response(source); mutate(r);
    assert.equal(score(source, r).pass, false, mutate.toString());
  }
  const reordered = response(source);
  reordered.requirementCoverage.reverse(); reordered.blockingIssues[0].alternatives.reverse();
  reordered.nextAction.alternatives.reverse(); reordered.requirementCoverage[0].taskIds.reverse();
  assert.equal(score(source, reordered).pass, true);
});

test('model configuration cannot become observation and execution independence cannot be invented', (t) => {
  const source = setup(t);
  for (const mutate of [
    (r) => { r.observedRuntime = { status: 'VERIFIED', model: 'gpt-5.6-sol', effort: 'high', evidence: 'config.toml' }; },
    (r) => { r.observedRuntime.model = 'gpt-6-astra'; },
    (r) => { r.observedRuntime.effort = 'high'; },
    (r) => { r.observedRuntime.evidence = 'requested-model'; },
    (r) => { r.requestedRuntime.model = 'different-model'; },
    (r) => { r.requestedRuntime.source = 'configured'; },
    (r) => { r.execution = 'INLINE SELF-REVIEW'; },
  ]) {
    const r = response(source); mutate(r);
    const result = score(source, r);
    assert.equal(result.pass, false);
    assert.equal(result.g01ModelQualified, false);
    assert.equal(result.observedRuntime, null);
  }
  const inline = structuredClone(scenario); inline.packet.execution = 'INLINE SELF-REVIEW';
  const alternateSource = setup(t, inline);
  const r = response(alternateSource); r.execution = 'INLINE SELF-REVIEW';
  assert.equal(scoreVerifiedPlanCheckerCase(inline, run(r), alternateSource).pass, true);
});

test('truthful command claims require exact argv and real successful candidate evidence', (t) => {
  const source = setup(t);
  for (const mutate of [
    (r) => { r.commands[0].command = ['node --test test/policies.test.js']; },
    (r) => { r.commands[0].command.push('--test-name-pattern=null'); },
    (r) => { r.commands[0].exitCode = 1; },
    (r) => { r.commands = []; },
  ]) { const r = response(source); mutate(r); assert.equal(score(source, r).pass, false); }
  for (const mutate of [
    (o) => { o.commands[0].stdout = '# pass 2\n# fail 0\n'; },
    (o) => { o.commands[0].stdout = o.commands[0].stdout.replace('# pass 2', '# pass 3'); },
    (o) => { o.commands[0].exitCode = 1; },
    (o) => { o.commands[0].signal = 'SIGTERM'; },
    (o) => { o.commands[0].error = { code: 'ENOENT' }; },
    (o) => { o.commands[0].command = ['node', '--test', 'other.test.js']; },
    (o) => { o.evidencePass = false; }, (o) => { o.scopePass = false; },
  ]) {
    const o = structuredClone(observation(source)); mutate(o);
    assert.equal(scorePlanCheckerCase(scenario, run(response(source)), o).pass, false, mutate.toString());
  }
});

test('bound input, verification bytes and case/run identity cannot be substituted', (t) => {
  const source = setup(t);
  assert.equal(scoreVerifiedPlanCheckerCase(scenario, run(response(source)), { ...source,
    expectedIdentity: { ...source.expectedIdentity, caseId: 'another-case' } }).pass, false);
  assert.equal(scoreVerifiedPlanCheckerCase(scenario, run(response(source)), { ...source,
    expectedIdentity: { ...source.expectedIdentity, runId: randomUUID() } }).pass, false);
  writeFileSync(join(source.evidenceRoot, 'verification.json'), '{}');
  const tampered = score(source, response(source));
  assert.equal(tampered.pass, false); assert.equal(tampered.checks.evidence, 0);
});

test('unrelated and selected-file writes fail even if worker and caller claim read-only success', (t) => {
  const source = setup(t);
  const r = response(source); r.edits = ['src/lookup.js'];
  assert.equal(score(source, r).pass, false);
  writeFileSync(join(source.workspaceRoot, 'choice.txt'), 'return-null');
  const added = scoreVerifiedPlanCheckerCase(scenario, run(response(source)), { ...source, edits: [], readOnlyPass: true });
  assert.equal(added.pass, false); assert.equal(added.checks.readOnly, 0);
  rmSync(join(source.workspaceRoot, 'choice.txt'));
  writeFileSync(join(source.workspaceRoot, 'requirements/null.md'), 'Choose freely.\n');
  const modified = score(source, response(source));
  assert.equal(modified.pass, false); assert.equal(modified.checks.inputs, 0);
});

test('execution failure and a resolvable case cannot be scored as accepted mandatory BLOCK', (t) => {
  const source = setup(t);
  for (const change of [{ exitCode: 1 }, { signal: 'SIGTERM' }, { error: { code: 'EIO' } }]) {
    assert.equal(scoreVerifiedPlanCheckerCase(scenario, { ...run(response(source)), ...change }, source).pass, false);
  }
  for (const change of [{ precedence: 'return-null' }, { localCorrectionAvailable: true }, { mandatory: false }]) {
    const other = structuredClone(scenario); Object.assign(other.decision, change);
    assert.throws(() => scorePlanCheckerCase(other, run(response(source)), observation(source)), /unsupported plan-checker case/);
  }
});


test('the report and trusted packet cannot disagree with the selected worker-visible packet', (t) => {
  const source = setup(t);
  for (const mutate of [
    (p) => { p.execution = 'INLINE SELF-REVIEW'; },
    (p) => { p.requestedRuntime.model = 'gpt-6-astra'; },
    (p) => { p.requirements[0].requirement = 'Drop existing-row compatibility.'; },
  ]) {
    const changed = structuredClone(scenario); mutate(changed.packet);
    const r = response(source); r.execution = changed.packet.execution;
    r.requestedRuntime = changed.packet.requestedRuntime;
    const rejected = scoreVerifiedPlanCheckerCase(changed, run(r), source);
    assert.equal(rejected.pass, false, mutate.toString());
    assert.equal(rejected.checks.inputs, 0);
  }
  const changedFiles = structuredClone(scenario);
  changedFiles.files.find((f) => f.path === 'requirements/null.md').content = 'Changed null requirement.\n';
  assert.equal(scoreVerifiedPlanCheckerCase(changedFiles, run(response(source)), source).pass, false);
  for (const omitted of ['TASK.md', 'requirements/null.md', 'src/policies.js']) {
    const incomplete = setup(t, scenario, [omitted]);
    const rejected = score(incomplete, response(incomplete));
    assert.equal(rejected.pass, false, omitted);
    assert.equal(rejected.inputReason, 'case-input-mismatch');
  }
});

test('duplicate JSON keys cannot hide contradictory verdicts or nested claims', (t) => {
  const source = setup(t);
  const valid = JSON.stringify(response(source));
  const duplicateVerdict = valid.replace('"verdict":"BLOCK"', '"verdict":"PASS","verdict":"BLOCK"');
  const nestedDuplicate = valid.replace('"status":"UNVERIFIED"', '"status":"VERIFIED","status":"UNVERIFIED"');
  const escapedDuplicate = valid.replace('"verdict":"BLOCK"', '"verdict":"PASS","ver\\u0064ict":"BLOCK"');
  const arrayObjectDuplicate = valid.replace('"status":"covered"', '"status":"blocked","status":"covered"');
  for (const raw of [duplicateVerdict, nestedDuplicate, escapedDuplicate, arrayObjectDuplicate]) {
    assert.equal(normalizePlanCheckerOutput(raw).pass, false, raw);
    assert.equal(scoreVerifiedPlanCheckerCase(scenario, { ...run(response(source)), rawOutput: raw }, source).pass, false);
  }
  const quoted = response(source);
  quoted.warnings = ['Text with \"verdict\": \"PASS\", braces {} and [arrays], escape \\\"'];
  assert.equal(normalizePlanCheckerOutput(JSON.stringify(quoted)).pass, true);
});
