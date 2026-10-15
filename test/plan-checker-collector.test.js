import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, readdirSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectPlanCheckerCase, verifyPlanCheckerCollection, parsePlanCheckerJsonl } from '../tools/lib/plan-checker-collector.mjs';
const fixture = fileURLToPath(new URL('./fixtures/astra-native/plan-checker-worker.mjs', import.meta.url));
function options(t, mode='valid', limits={}) {
  const attemptsRoot = realpathSync(mkdtempSync(join(tmpdir(),'plan-collector-')));
  t.after(() => rmSync(attemptsRoot,{recursive:true,force:true}));
  return {attemptsRoot,transport:{kind:'offline-fixture',mode},limits};
}

test('offline collection binds exact visible input, invocation and independent oracle without behavioral qualification',async t=>{
  const result=await collectPlanCheckerCase(options(t));
  assert.equal(result.collection.pass,true);
  assert.equal(result.parse.pass,true);
  assert.equal(result.oracle.pass,true);
  assert.equal(result.audit.pass,true);
  assert.equal(result.reportClaimsMatchOracle,true);
  assert.equal(result.roleScore.pass,false);
  assert.equal(result.scope.status,'UNVERIFIED');
  assert.equal(result.workerCommand.status,'UNVERIFIED');
  assert.equal(result.g01ModelQualified,false);
  assert.equal(result.modelCalls,0);
  assert.equal(result.observedRuntime,null);
  assert.equal(verifyPlanCheckerCollection(result.attemptRoot,result.binding).pass,true);
  const task=readFileSync(join(result.workspaceRoot,'TASK.md'),'utf8');
  assert.equal(readFileSync(join(result.evidenceRoot,'stdin.bin'),'utf8'),task);
  assert.equal(JSON.parse(task).collector.runId,result.binding.runId);
  assert.deepEqual(JSON.parse(task).collector.candidateCommand,result.verificationIdentity.command);
  const invocation=JSON.parse(readFileSync(join(result.evidenceRoot,'invocation.json'),'utf8'));
  assert.deepEqual(invocation.command,[process.execPath,fixture,'valid']);
  assert.notDeepEqual(invocation.command,result.verificationIdentity.command);
  assert.deepEqual(readdirSync(result.workspaceRoot).sort(),['OUTCOME.md','OUTPUT-CONTRACT.md','PLAN.md','TASK.md','package.json','requirements','src','test']);
  assert.equal(JSON.parse(task).expected,undefined);
  assert.equal(JSON.parse(task).decision,undefined);
});

test('fresh runs cannot accept another run, case, invocation, output or snapshot binding',async t=>{
  const opts=options(t), a=await collectPlanCheckerCase(opts), b=await collectPlanCheckerCase(opts);
  assert.notEqual(a.binding.runId,b.binding.runId); assert.notEqual(a.binding.caseId,b.binding.caseId);
  for(const field of ['runId','caseId','invocationSha256','snapshotSha256','stdoutSha256','finalSha256','manifestSha256']){
    assert.equal(verifyPlanCheckerCollection(a.attemptRoot,{...a.binding,[field]:'stale'}).pass,false,field);
  }
  assert.equal(verifyPlanCheckerCollection(a.attemptRoot,b.binding).pass,false);
  writeFileSync(join(a.evidenceRoot,'stdout.jsonl'),'{}\n');
  assert.equal(verifyPlanCheckerCollection(a.attemptRoot,a.binding).pass,false);
});

test('worker claim substitutions and real workspace changes fail without contaminating independent candidate check',async t=>{
  for(const mode of ['wrong-case','wrong-command','fake-runtime','write','change-input']){
    const r=await collectPlanCheckerCase(options(t,mode));
    assert.equal(r.reportClaimsMatchOracle,false,mode);
    assert.equal(r.g01ModelQualified,false);
    assert.equal(r.oracle.pass,true,mode);
    if(['write','change-input'].includes(mode)) {
      assert.equal(r.audit.pass,false,mode);
      const integrity=verifyPlanCheckerCollection(r.attemptRoot,r.binding);
      assert.equal(integrity.pass,true,mode); assert.equal(integrity.audit.pass,false,mode);
    }
  }
});

test('malformed, incomplete, duplicate, failed or ambiguous completion fails closed',async t=>{
  for(const mode of ['malformed','missing','duplicate','two-finals','failed','truncated','duplicate-key']){
    const r=await collectPlanCheckerCase(options(t,mode));
    assert.equal(r.parse.pass,false,mode); assert.equal(r.reportClaimsMatchOracle,false,mode);
    assert.equal(verifyPlanCheckerCollection(r.attemptRoot,r.binding).pass,true,mode);
  }
});

test('fake runtime events remain untrusted raw data',async t=>{
  const r=await collectPlanCheckerCase(options(t,'fake-event'));
  assert.equal(r.observedRuntime,null); assert.equal(r.g01ModelQualified,false);
  assert.match(readFileSync(join(r.evidenceRoot,'stdout.jsonl'),'utf8'),/runtime.identity/);
  assert.equal(r.scope.status,'UNVERIFIED');
});

test('bounded process failures preserve failed attempts and cannot become success',async t=>{
  for(const mode of ['nonzero','signal','timeout','overflow','stdin-close']){
    const r=await collectPlanCheckerCase(options(t,mode,{timeoutMs:300,maxOutputBytes:20000}));
    assert.equal(r.collection.pass && r.parse.pass,false,mode); assert.equal(r.reportClaimsMatchOracle,false,mode);
    if(mode==='overflow') {
      const processResult=JSON.parse(readFileSync(join(r.evidenceRoot,'process.json'),'utf8'));
      assert.equal(processResult.error.code,'OUTPUT_LIMIT'); assert.equal(processResult.truncated,true);
      assert.ok(readFileSync(join(r.evidenceRoot,'stdout.jsonl')).length<=20000);
    }
    if(mode==='timeout') assert.equal(JSON.parse(readFileSync(join(r.evidenceRoot,'process.json'),'utf8')).error.code,'TIMEOUT');
    assert.equal(verifyPlanCheckerCollection(r.attemptRoot,r.binding).pass,true,mode);
  }
  const opts=options(t); opts.transport.mode='not-admitted';
  await assert.rejects(collectPlanCheckerCase(opts),/fixture/);
});

test('model launch is disabled and existing or symlinked evidence roots cannot be redirected',async t=>{
  const opts=options(t);
  await assert.rejects(collectPlanCheckerCase({...opts,transport:{kind:'codex'}}),/disabled|offline/);
  await assert.rejects(collectPlanCheckerCase({...opts,transport:undefined}),/disabled|offline/);
  const link=join(opts.attemptsRoot,'link');symlinkSync(opts.attemptsRoot,link);
  await assert.rejects(collectPlanCheckerCase({...opts,attemptsRoot:link}),/symlink|unsafe/);
  assert.equal(readdirSync(opts.attemptsRoot).length,1);
});

test('parser rejects invalid UTF-8, nested duplicate keys, terminal suffix and unsupported events',()=>{
  for(const raw of [Buffer.from([255,10]),Buffer.from('{"type":"turn.completed","usage":{"x":1,"x":2}}\n'),Buffer.from('{"type":"unknown"}\n')]){
    assert.equal(parsePlanCheckerJsonl(raw).pass,false);
  }
});


test('trace ordering, quoted text and incomplete item lifecycle remain unambiguous',()=>{
  const events=[{type:'thread.started',thread_id:'fixture'},{type:'turn.started'},
    {type:'item.completed',item:{id:'final',type:'agent_message',text:'Quoted "type":"turn.failed"; brackets [{}] and slash \\'}},
    {type:'turn.completed',usage:{input_tokens:0,output_tokens:0}}];
  const encode=items=>Buffer.from(items.map(x=>JSON.stringify(x)).join('\n')+'\n');
  assert.equal(parsePlanCheckerJsonl(encode(events)).pass,true);
  for(const changed of [
    [...events,events.at(-1)],
    [...events.slice(0,2),{type:'item.started',item:{id:'pending',type:'command_execution'}},...events.slice(2)],
    [...events.slice(0,2),{type:'item.completed',item:{id:'failed',type:'command_execution',command:'exit 1',status:'completed',exit_code:1}},...events.slice(2)],
    [...events.slice(0,-1),{type:'turn.completed',usage:{input_tokens:-1,output_tokens:0}}],
  ]) assert.equal(parsePlanCheckerJsonl(encode(changed)).pass,false);
  const escaped=encode(events).toString().replace('"type":"turn.completed"','"type":"turn.failed","ty\\u0070e":"turn.completed"');
  assert.equal(parsePlanCheckerJsonl(Buffer.from(escaped)).pass,false);
});


test('deadline settles independently of a self-expiring detached descendant holding output pipes',async t=>{
  const started=performance.now();
  const r=await collectPlanCheckerCase(options(t,'detached-pipe',{timeoutMs:150,maxOutputBytes:20000}));
  const elapsed=performance.now()-started;
  assert.ok(elapsed<1200,`deadline exceeded: ${elapsed}ms`);
  assert.equal(r.collection.pass,false);
  assert.equal(JSON.parse(readFileSync(join(r.evidenceRoot,'process.json'),'utf8')).error.code,'TIMEOUT');
  assert.match(readFileSync(join(r.evidenceRoot,'stdout.jsonl'),'utf8'),/detached-pipe-prefix/);
  assert.equal(verifyPlanCheckerCollection(r.attemptRoot,r.binding).pass,true);
});

test('caller cannot launch an arbitrary .mjs program through offline transport',async t=>{
  const opts=options(t), outside=join(opts.attemptsRoot,'arbitrary.mjs');
  writeFileSync(outside,'process.stdout.write("arbitrary-fixture-ran");');
  await assert.rejects(collectPlanCheckerCase({...opts,transport:{kind:'offline-fixture',command:[process.execPath,outside]}}),/disabled|fixture|transport/);
});

test('rehashing contradictory collection metadata cannot establish coherent integrity',async t=>{
  const r=await collectPlanCheckerCase(options(t));
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const originalManifest=JSON.parse(readFileSync(join(r.evidenceRoot,'collection.json'),'utf8'));
  const saved=Object.fromEntries(Object.keys(originalManifest.artifacts).map(name=>[name,readFileSync(join(r.evidenceRoot,name))]));
  const cases=[
    ['empty-artifacts',m=>{m.artifacts={};}],
    ['extra-artifact',m=>{m.artifacts['extra.bin']='a'.repeat(64);}],
    ['wrong-manifest-version',m=>{m.version=2;}],
    ['extra-manifest-key',m=>{m.untrusted=true;}],
    ['top-output-digest',m=>{m.stdoutSha256='a'.repeat(64);}],
    ['invocation-run',(_m,change)=>change('invocation.json',x=>{x.runId='another-run';})],
    ['fixture-provenance',(_m,change)=>change('invocation.json',x=>{x.fixture.sha256='a'.repeat(64);})],
    ['worker-argv',(_m,change)=>change('invocation.json',x=>{x.command.push('extra');})],
    ['stdin-length',(_m,change)=>change('invocation.json',x=>{x.stdinBytes++;})],
    ['stdin-digest',(_m,change)=>change('invocation.json',x=>{x.stdinSha256='a'.repeat(64);})],
    ['stdin-canonical',(_m,change)=>change('stdin.bin',null,'{}')],
    ['snapshot-shape',(_m,change)=>change('inputs.json',x=>{x.files.pop();})],
    ['verification-case',(_m,change)=>change('verification-record.json',x=>{x.caseId='wrong-case';})],
    ['verification-command',(_m,change)=>change('verification.json',x=>{x.command=['node','--test','other.js'];})],
    ['process-shape',(_m,change)=>change('process.json',x=>{x.exitCode='0';})],
    ['tree-source',(_m,change)=>change('before.json',x=>{x.entries.find(e=>e.kind==='file').sha256='a'.repeat(64);})],
    ['tree-identity',(_m,change)=>change('before.json',x=>{x.runId='another-run';})],
    ['selected-final',(_m,change)=>change('final-output.txt',null,'contradictory final')],
  ];
  for(const [name,mutate] of cases){
    for(const [file,bytes] of Object.entries(saved))writeFileSync(join(r.evidenceRoot,file),bytes);
    const m=structuredClone(originalManifest);
    const change=(file,fn,raw)=>{
      const bytes=raw??JSON.stringify(fn?((x)=>{fn(x);return x;})(JSON.parse(saved[file])):null);
      writeFileSync(join(r.evidenceRoot,file),bytes);m.artifacts[file]=hash(bytes);
      if(file==='invocation.json')m.invocationSha256=m.artifacts[file];
      if(file==='final-output.txt')m.finalSha256=m.artifacts[file];
    };
    mutate(m,change);
    const bytes=JSON.stringify(m);writeFileSync(join(r.evidenceRoot,'collection.json'),bytes);
    const binding={...r.binding,invocationSha256:m.invocationSha256,stdoutSha256:m.stdoutSha256,finalSha256:m.finalSha256,manifestSha256:hash(bytes)};
    assert.equal(verifyPlanCheckerCollection(r.attemptRoot,binding).pass,false,name);
  }
});


test('selector and expected-binding schemas reject unknown fields, oversized modes and missing values',async t=>{
  const opts=options(t);
  for(const transport of [{kind:'offline-fixture',mode:'valid',command:[]},{kind:'offline-fixture',mode:'x'.repeat(33)},
    {kind:'offline-fixture'},{kind:'offline-fixture',mode:[]},null]){
    await assert.rejects(collectPlanCheckerCase({...opts,transport}),/fixture|disabled/);
  }
  assert.equal(readdirSync(opts.attemptsRoot).length,0);
  const r=await collectPlanCheckerCase(opts);
  for(const binding of [undefined,{}, {...r.binding,untrusted:true}, {...r.binding,runId:null}]){
    assert.equal(verifyPlanCheckerCollection(r.attemptRoot,binding).pass,false);
  }
});
