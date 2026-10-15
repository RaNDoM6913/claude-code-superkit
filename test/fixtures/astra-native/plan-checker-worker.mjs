// Deterministic OFFLINE fixture; never model or provider evidence.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
function response(packet) {
  return { version: 1, role: 'plan-checker', caseId: packet.caseId,
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
    commands: [{ command: [...packet.collector.candidateCommand], exitCode: 0, signal: null, error: null }],
    verificationMeaning: 'candidate-behaviors-only', edits: [],
  };
}
const mode = process.argv[2] ?? 'valid';
if (mode === 'detached-pipe') {
  const child = spawn(process.execPath, ['-e', 'setTimeout(() => process.exit(0), 2500)'], { detached: true, stdio: ['ignore', 1, 2], env: { LANG: 'C' } });
  child.unref();
  process.stdout.write('detached-pipe-prefix\n');
  process.exit(0);
}
else if (mode === 'stdin-close') { process.stdin.destroy(); setTimeout(() => process.exit(0), 200); }
else {
  const input = readFileSync(0, 'utf8');
  const packet = JSON.parse(input);
  if (readFileSync('TASK.md', 'utf8') !== input) throw new Error('stdin/task mismatch');
  const r = response(packet);
  if (mode === 'wrong-case') r.caseId = 'stale-case';
  if (mode === 'wrong-command') r.commands[0].command = ['node', '--test', 'test/policies.test.js'];
  if (mode === 'fake-runtime') r.observedRuntime = {status:'VERIFIED',model:'gpt-5.6-sol',effort:'high',evidence:'requested'};
  if (mode === 'write') writeFileSync('choice.txt', 'return-null');
  if (mode === 'change-input') writeFileSync('requirements/null.md', 'Choose freely.');
  if (mode === 'nonzero') process.exit(2);
  if (mode === 'signal') process.kill(process.pid, 'SIGTERM');
  if (mode === 'timeout') setInterval(() => {}, 1000);
  else if (mode === 'overflow') process.stdout.write('x'.repeat(300000));
  else if (mode === 'malformed') process.stdout.write('{not json}\n');
  else {
    const events = [
      {type:'thread.started',thread_id:'fixture-thread'},
      {type:'turn.started'},
      {type:'item.completed',item:{id:'cmd',type:'command_execution',command:'claimed shell text',status:'completed',exit_code:0,aggregated_output:'fixture claim'}},
      {type:'item.completed',item:{id:'final',type:'agent_message',text:JSON.stringify(r)}},
      {type:'turn.completed',usage:{input_tokens:0,output_tokens:0}},
    ];
    if (mode === 'fake-event') events.splice(2,0,{type:'runtime.identity',source:'runtime',observed:{model:'gpt-5.6-sol',effort:'high'}});
    if (mode === 'missing') events.pop();
    if (mode === 'duplicate') events.push(events.at(-1));
    if (mode === 'two-finals') events.splice(4,0,events[3]);
    if (mode === 'failed') events[events.length-1] = {type:'turn.failed',error:{message:'fixture failure'}};
    let raw = events.map(x => JSON.stringify(x)).join('\n')+'\n';
    if (mode === 'truncated') raw = raw.slice(0,-1);
    if (mode === 'duplicate-key') raw = raw.replace('"type":"turn.completed"','"type":"turn.failed","type":"turn.completed"');
    process.stdout.write(raw);
  }
}
