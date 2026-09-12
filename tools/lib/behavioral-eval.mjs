/**
 * W00B partial scorer: only the observed command-verification gate.
 * `pass` is local to this gate, never overall implementation/model acceptance.
 * Scope, evidence provenance, output, routing, and other dimensions are pending.
 */
export function scoreCase(caseSpec, execution, observation) {
  if (caseSpec?.kind !== 'implementation' || caseSpec.expected?.commandsPass !== true) {
    throw new Error('unsupported case: only implementation commandsPass=true is implemented');
  }

  // Worker claims and its own process exit cannot prove verification succeeded.
  // The observation must come from independently executed verification commands.
  const commands = observation?.commands;
  const pass = Array.isArray(commands) && commands.length > 0
    && commands.every((command) => command?.exitCode === 0);
  return { pass, coverage: 'command-verification-only' };
}
