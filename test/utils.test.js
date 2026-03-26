import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let utils;

before(async () => {
  utils = await import('../lib/utils.js');
});

describe('countFiles', () => {
  it('counts .md files in a directory', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'superkit-test-'));
    writeFileSync(join(tmp, 'a.md'), '# A');
    writeFileSync(join(tmp, 'b.md'), '# B');
    writeFileSync(join(tmp, 'c.txt'), 'not md');
    assert.equal(utils.countFiles(tmp, '.md'), 2);
    rmSync(tmp, { recursive: true });
  });

  it('returns 0 for empty directory', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'superkit-test-'));
    assert.equal(utils.countFiles(tmp, '.md'), 0);
    rmSync(tmp, { recursive: true });
  });

  it('returns 0 for non-existent directory', () => {
    assert.equal(utils.countFiles('/tmp/nonexistent-superkit-dir', '.md'), 0);
  });
});

describe('copyFile', () => {
  it('copies file in fresh mode', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'superkit-test-'));
    const src = join(tmp, 'src.md');
    const dst = join(tmp, 'sub', 'dst.md');
    writeFileSync(src, '# Test');
    utils.copyFile(src, dst, 'fresh');
    assert.ok(existsSync(dst));
    rmSync(tmp, { recursive: true });
  });

  it('skips existing file in merge mode', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'superkit-test-'));
    const src = join(tmp, 'src.md');
    const dst = join(tmp, 'dst.md');
    writeFileSync(src, 'new content');
    writeFileSync(dst, 'old content');
    utils.copyFile(src, dst, 'merge');
    assert.equal(readFileSync(dst, 'utf8'), 'old content');
    rmSync(tmp, { recursive: true });
  });
});

describe('isInsideGitRepo', () => {
  it('returns true in a git repo', () => {
    assert.equal(utils.isInsideGitRepo(), true);
  });
});
