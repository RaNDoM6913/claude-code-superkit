/**
 * W00B partial scorer: observed commands plus scope/evidence boolean gates.
 * `pass` covers only these gates, never overall implementation/model acceptance.
 * Evidence provenance, output, routing, and other dimensions are pending.
 */
export function scoreCase(caseSpec, execution, observation) {
  if (caseSpec?.kind !== 'implementation' || caseSpec.expected?.commandsPass !== true) {
    throw new Error('unsupported case: only implementation commandsPass=true is implemented');
  }

  // Worker claims and its own process exit cannot prove verification succeeded.
  // The caller must independently verify commands, scope, and evidence;
  // this scorer consumes observations and does not perform those audits itself.
  const commands = observation?.commands;
  const pass = Array.isArray(commands) && commands.length > 0
    && commands.every((command) => command?.exitCode === 0)
    && observation.scopePass === true
    && observation.evidencePass === true;
  return { pass, coverage: 'commands-scope-evidence-only' };
}
