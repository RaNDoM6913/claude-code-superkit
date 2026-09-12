import { loadRuntimeEvidence, loadVerificationEvidence, verifyInputSnapshot } from './verification-evidence.mjs';

/**
 * W00B partial scorer: commands, scope/evidence flags, output, and execution.
 * `pass` covers only these gates, never overall implementation/model acceptance.
 * Pending: full output schema, evidence provenance, live runtime model/effort provenance,
 * model evaluations, CLI runner, and the remaining acceptance dimensions.
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Evidence-backed entry point. Recheck the selected inputs before and after
 * loading evidence. Scope remains independently supplied; successful snapshots
 * do not establish selection completeness or defend edits restored between checks.
 */
export function scoreVerifiedCase(caseSpec, execution, {
  workspaceRoot, snapshotPath, evidenceRoot, recordPath, expectedIdentity, scopePass,
} = {}) {
  let inputs = { pass: false, reason: 'not-checked' };
  let evidence = { reason: 'case-mismatch', observation: { commands: [], evidencePass: false } };
  if (typeof caseSpec?.id === 'string' && caseSpec.id === expectedIdentity?.caseId) {
    inputs = verifyInputSnapshot(workspaceRoot, evidenceRoot, snapshotPath, expectedIdentity?.snapshotSha256);
    evidence = inputs.pass
      ? loadVerificationEvidence(evidenceRoot, recordPath, expectedIdentity)
      : { reason: 'input-snapshot-invalid', observation: { commands: [], evidencePass: false } };
    if (evidence.pass) {
      inputs = verifyInputSnapshot(workspaceRoot, evidenceRoot, snapshotPath, expectedIdentity.snapshotSha256);
    }
  }
  const score = scoreCase(caseSpec, execution, { ...evidence.observation, scopePass });
  return {
    ...score,
    pass: score.pass && inputs.pass,
    checks: { ...score.checks, inputs: Number(inputs.pass) },
    coverage: 'inputs-commands-scope-evidence-output-execution-only',
    evidenceReason: evidence.reason,
    inputReason: inputs.reason,
  };
}

/** Model-attempt entry point; deterministic process fixtures may use scoreVerifiedCase.
 * Runtime identity comes only from separately captured collector evidence, never
 * execution.requested or response labels. Real provider adapters remain pending.
 */
export function scoreModelVerifiedCase(caseSpec, execution, source = {}) {
  const base = scoreVerifiedCase(caseSpec, execution, source);
  const runtime = loadRuntimeEvidence(source.evidenceRoot, source.runtimeRecordPath,
    source.expectedIdentity, source.expectedRuntime);
  let inputs = { pass: base.checks.inputs === 1, reason: base.inputReason };
  // A failed runtime comparison must not hide an edit made while its trace loaded.
  if (inputs.pass) {
    inputs = verifyInputSnapshot(source.workspaceRoot, source.evidenceRoot,
      source.snapshotPath, source.expectedIdentity.snapshotSha256);
  }
  return {
    ...base,
    pass: base.pass && runtime.pass && inputs.pass,
    checks: { ...base.checks, inputs: Number(inputs.pass), runtime: Number(runtime.pass) },
    coverage: 'inputs-commands-scope-evidence-output-execution-runtime-only',
    inputReason: inputs.reason,
    runtimeReason: runtime.reason,
    observedRuntime: runtime.observed,
  };
}

export function scoreCase(caseSpec, execution, observation) {
  if (caseSpec?.kind !== 'implementation' || caseSpec.expected?.commandsPass !== true) {
    throw new Error('unsupported case: only implementation commandsPass=true is implemented');
  }

  // Worker claims and its own process exit cannot prove verification succeeded.
  // The caller must independently verify commands, scope, and evidence;
  // this scorer consumes observations and does not perform those audits itself.
  const commands = observation?.commands;
  const checks = {
    commands: Number(Array.isArray(commands) && commands.length > 0
      && commands.every((command) => command?.exitCode === 0)),
    scope: Number(observation?.scopePass === true),
    evidence: Number(observation?.evidencePass === true),
    // Input is a parsed response object. Parsing raw output belongs to the caller.
    output: Number(isRecord(execution) && isRecord(execution.response)
      && execution.response.status === 'complete'),
    execution: Number(isRecord(execution) && execution.exitCode === 0
      && execution.signal == null && execution.error == null),
  };
  return {
    pass: Object.values(checks).every((value) => value === 1),
    coverage: 'commands-scope-evidence-output-execution-only',
    checks,
  };
}
