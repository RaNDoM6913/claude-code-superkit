import { loadVerificationEvidence } from './verification-evidence.mjs';

/**
 * W00B partial scorer: commands, scope/evidence flags, output, and execution.
 * `pass` covers only these gates, never overall implementation/model acceptance.
 * Pending: full output schema, evidence provenance, runtime model/effort identity,
 * model evaluations, CLI runner, and the remaining acceptance dimensions.
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Evidence-backed entry point. Scope is still independently supplied; command
 * results and evidence acceptance come exclusively from the verified artifact.
 */
export function scoreVerifiedCase(caseSpec, execution, {
  evidenceRoot, recordPath, expectedIdentity, scopePass,
} = {}) {
  const evidence = typeof caseSpec?.id === 'string' && caseSpec.id === expectedIdentity?.caseId
    ? loadVerificationEvidence(evidenceRoot, recordPath, expectedIdentity)
    : { reason: 'case-mismatch', observation: { commands: [], evidencePass: false } };
  return {
    ...scoreCase(caseSpec, execution, { ...evidence.observation, scopePass }),
    evidenceReason: evidence.reason,
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
