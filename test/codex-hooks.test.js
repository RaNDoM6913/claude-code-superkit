import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

const hook = resolve('packages/codex/hooks/superkit.mjs');
// Host-wide filters (for example Git LFS) intentionally cause UNVERIFIED.
// Keep ordinary-repository fixtures independent of the operator's Git config.
const hookEnv = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_COUNT: '0' };
function run(mode, input, cwd = process.cwd(), env = hookEnv) {
  const result = spawnSync(process.execPath, [hook, mode], {
    cwd, env, input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', timeout: 15000
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
function guard(command, extra = {}) {
  return run('pre-tool', { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, ...extra });
}
function project(t) {
  const dir = mkdtempSync(join(tmpdir(), 'superkit-hook-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', dir]);
  writeFileSync(join(dir, 'tracked.txt'), 'baseline\n');
  execFileSync('git', ['add', 'tracked.txt'], { cwd: dir });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'baseline'], { cwd: dir });
  return dir;
}

describe('native Codex PreToolUse Git guard', () => {
  for (const command of [
    'git push --force origin main', 'git push origin main --force', 'git push origin +HEAD:main',
    'git -C "folder with spaces" reset HEAD --hard', 'git clean -fdx', 'git branch --delete --force old',
    'git checkout -- src/file.js', 'git switch -C replacement', 'git restore src/file.js',
    'git commit --no-verify -m fix', 'git status && git reset --hard',
    'env LANG=C git push -f origin main', 'command git branch -D old',
    'git commit -an -m fix', 'git commit -nmfix', 'git commit tracked.txt -n',
    'git clean -e -n -f', 'git push -- origin +HEAD:main', 'git branch --contains -D old'
  ]) {
    it(`denies explicit destructive command: ${command}`, () => {
      const output = guard(command);
      assert.equal(output.hookSpecificOutput.hookEventName, 'PreToolUse');
      assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
      assert.ok(output.hookSpecificOutput.permissionDecisionReason);
      assert.equal(output.hookSpecificOutput.updatedInput, undefined);
    });
  }
  for (const command of [
    'git status --short', 'git push --force-with-lease origin feature', 'git clean -fdn',
    'git restore --staged tracked.txt', 'git branch -d merged', 'git checkout feature',
    'git commit -m "Document git reset --hard and --no-verify risks"',
    'echo "git push --force"', "printf '%s' 'git reset --hard'", '# git push --force\ngit status',
    'git commit -am "--no-verify"', 'git commit -am "-n"', 'git commit -mfix -- -n',
    'git reset -- --hard', 'git branch -- --force', 'git clean -- -f',
    'git push -o -f origin main', 'git restore --staged --source -W tracked.txt',
    'git commit -Snobody -m fix', 'git reset --pathspec-from-file --hard'
  ]) {
    it(`does not grant or deny unrelated/safe command: ${command}`, () => {
      const output = guard(command);
      assert.equal(output.hookSpecificOutput?.permissionDecision, undefined);
    });
  }
  it('does not strip an executed command chained after a quoted commit message', () => {
    assert.equal(guard('git commit -m "safe; git push --force"; git clean -fd').hookSpecificOutput.permissionDecision, 'deny');
  });
  for (const command of ['bash -c "$COMMAND"', 'env LANG=C /bin/bash -c "git reset --hard"', 'CHECK=1 command sh -c "git clean -fd"', 'git checkout feature*']) {
    it(`reports opaque shell syntax as unassessed without granting permission: ${command}`, () => {
      const output = guard(command);
      assert.equal(output.hookSpecificOutput?.permissionDecision, undefined);
      assert.match(output.hookSpecificOutput?.additionalContext || '', /not assessed/i);
    });
  }
  it('does not scan non-shell payloads as commands', () => {
    const output = guard('git reset --hard', { tool_name: 'apply_patch' });
    assert.equal(output.hookSpecificOutput?.permissionDecision, undefined);
  });
  it('denies malformed pre-tool data instead of pretending it was checked', () => {
    for (const value of ['{', { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: {} }]) {
      assert.equal(run('pre-tool', value).hookSpecificOutput.permissionDecision, 'deny');
    }
  });
});

describe('native Codex Stop diff hygiene', () => {
  it('reports clean tracked changes without claiming tests passed', t => {
    const dir = project(t);
    writeFileSync(join(dir, 'tracked.txt'), 'changed\n');
    const result = run('stop', { hook_event_name: 'Stop', cwd: dir, stop_hook_active: false }, dir);
    assert.equal(result.decision, undefined);
    assert.equal(result.systemMessage, undefined);
  });
  it('requests one scoped follow-up for real unstaged/staged diff errors, without rewriting files', t => {
    const dir = project(t);
    const contents = 'changed with whitespace   \n';
    writeFileSync(join(dir, 'tracked.txt'), contents);
    for (const stage of [false, true]) {
      if (stage) execFileSync('git', ['add', 'tracked.txt'], { cwd: dir });
      const result = run('stop', { hook_event_name: 'Stop', cwd: dir, stop_hook_active: false }, dir);
      assert.equal(result.decision, 'block');
      assert.match(result.reason, /diff/i);
      assert.ok(!JSON.stringify(result).includes('changed with whitespace'));
      assert.equal(run('stop', { hook_event_name: 'Stop', cwd: dir, stop_hook_active: true }, dir).decision, undefined);
    }
    assert.equal(execFileSync('git', ['diff', '--cached'], { cwd: dir, encoding: 'utf8' }).includes(contents.trimEnd()), true);
  });
  it('uses the event cwd from a subdirectory and never invokes project test scripts', t => {
    const dir = project(t);
    mkdirSync(join(dir, 'nested'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'touch SHOULD_NOT_EXIST' } }));
    writeFileSync(join(dir, 'tracked.txt'), 'bad   \n');
    assert.equal(run('stop', { hook_event_name: 'Stop', cwd: join(dir, 'nested'), stop_hook_active: false }, dir).decision, 'block');
    assert.ok(!existsSync(join(dir, 'SHOULD_NOT_EXIST')));
  });
  it('reports non-Git or invalid inputs as unverified rather than success or endless continuation', t => {
    const dir = mkdtempSync(join(tmpdir(), 'superkit-hook-nongit-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const output = run('stop', { hook_event_name: 'Stop', cwd: dir }, dir);
    assert.equal(output.decision, undefined);
    assert.match(output.systemMessage, /unverified/i);
    assert.match(run('stop', '{', dir).systemMessage, /unverified/i);
  });
  it('checks the event repository even when the parent environment names another Git directory', t => {
    const dir = project(t);
    const other = project(t);
    writeFileSync(join(dir, 'tracked.txt'), 'bad whitespace   \n');
    const output = run('stop', { hook_event_name: 'Stop', cwd: dir }, dir, {
      ...hookEnv, GIT_DIR: join(other, '.git'), GIT_WORK_TREE: other,
      GIT_INDEX_FILE: join(other, '.git/index')
    });
    assert.equal(output.decision, 'block');
  });
  it('does not execute configured external diff, text conversion or filesystem monitor helpers', t => {
    const dir = project(t);
    const helper = join(dir, 'project-helper.sh');
    writeFileSync(helper, '#!/bin/sh\ntouch SHOULD_NOT_EXIST\nprintf "PRIVATE_HELPER_OUTPUT"\n');
    chmodSync(helper, 0o755);
    for (const key of ['diff.external', 'diff.superkit-test.textconv', 'core.fsmonitor']) {
      execFileSync('git', ['config', key, helper], { cwd: dir });
    }
    writeFileSync(join(dir, '.gitattributes'), 'tracked.txt diff=superkit-test\n');
    writeFileSync(join(dir, 'tracked.txt'), 'PRIVATE_DIFF_CONTENT   \n');
    const output = run('stop', { hook_event_name: 'Stop', cwd: dir, transcript_path: helper }, dir);
    assert.equal(output.decision, 'block');
    assert.ok(!existsSync(join(dir, 'SHOULD_NOT_EXIST')));
    assert.ok(!JSON.stringify(output).includes('PRIVATE_'));
  });
  it('reports unavailable Git without exposing input data or claiming a pass', t => {
    const dir = project(t);
    const output = run('stop', {
      hook_event_name: 'Stop', cwd: dir, transcript_path: '/PRIVATE_TRANSCRIPT', last_assistant_message: 'PRIVATE_MESSAGE'
    }, dir, { ...hookEnv, PATH: '' });
    assert.equal(output.decision, undefined);
    assert.match(output.systemMessage, /unverified/i);
    assert.ok(!JSON.stringify(output).includes('PRIVATE_'));
  });
  for (const conversion of ['clean', 'process']) {
    it(`does not execute configured ${conversion} conversion filters and reports hygiene unverified`, t => {
      const dir = project(t);
      const helper = join(dir, `conversion-${conversion}.sh`);
      writeFileSync(helper, `#!/bin/sh\ntouch FILTER_EXECUTED\n${conversion === 'clean' ? 'cat' : 'exit 1'}\n`);
      chmodSync(helper, 0o755);
      execFileSync('git', ['config', `filter.private-driver.${conversion}`, helper], { cwd: dir });
      writeFileSync(join(dir, '.gitattributes'), 'tracked.txt filter=private-driver\n');
      writeFileSync(join(dir, 'tracked.txt'), 'PRIVATE_FILTERED_CONTENT   \n');
      const output = run('stop', { hook_event_name: 'Stop', cwd: dir }, dir);
      assert.ok(!existsSync(join(dir, 'FILTER_EXECUTED')), 'Git conversion helper must never start');
      assert.equal(output.decision, undefined);
      assert.match(output.systemMessage, /unverified/i);
      assert.match(output.systemMessage, /filter/i);
      assert.ok(!JSON.stringify(output).includes('private-driver'));
      assert.ok(!JSON.stringify(output).includes(helper));
      assert.ok(!JSON.stringify(output).includes('PRIVATE_FILTERED_CONTENT'));
    });
  }
  it('conservatively reports unused global conversion filters as unverified', t => {
    const dir = project(t);
    const globalConfig = join(dir, 'operator-gitconfig');
    execFileSync('git', ['config', '--file', globalConfig, 'filter.private-unused.clean', 'PRIVATE_CONVERSION_COMMAND'], { cwd: dir });
    const output = run('stop', { hook_event_name: 'Stop', cwd: dir }, dir, { ...hookEnv, GIT_CONFIG_GLOBAL: globalConfig });
    assert.equal(output.decision, undefined);
    assert.match(output.systemMessage, /unverified/i);
    assert.match(output.systemMessage, /unused/i);
    assert.ok(!JSON.stringify(output).includes('private-unused'));
    assert.ok(!JSON.stringify(output).includes('PRIVATE_CONVERSION_COMMAND'));
  });
});
