import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

const ARTIFACT_LIMIT = 2 * 1024 * 1024;
const RECORD_LIMIT = 64 * 1024;

function reject(reason) {
  throw Object.assign(new Error(reason), { reason });
}

// The evidence root belongs to the trusted collector, outside the worker tree.
// These checks reject static escapes; they are not a hostile-filesystem sandbox.
function evidencePath(root, relativePath, creating = false) {
  if (typeof relativePath !== 'string' || !relativePath || isAbsolute(relativePath)
      || /[\\:\0]/.test(relativePath)
      || relativePath.split('/').some((part) => !part || part === '.' || part === '..')) {
    reject('unsafe-path');
  }
  let path = realpathSync(root);
  const parts = relativePath.split('/');
  for (const [index, part] of parts.entries()) {
    path = join(path, part);
    if (creating && index === parts.length - 1) break;
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) reject('unsafe-path');
    if (index < parts.length - 1 && !stat.isDirectory()) reject('not-file');
    if (index === parts.length - 1 && !stat.isFile()) reject('not-file');
  }
  return path;
}

function readBounded(root, path, limit) {
  const fd = openSync(evidencePath(root, path), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile()) reject('not-file');
    if (stat.size > limit) reject('too-large');
    const buffer = Buffer.alloc(limit + 1);
    let size = 0;
    while (size < buffer.length) {
      const count = readSync(fd, buffer, size, buffer.length - size, null);
      if (count === 0) break;
      size += count;
    }
    if (size > limit) reject('too-large');
    return buffer.subarray(0, size);
  } finally {
    closeSync(fd);
  }
}

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Snapshot artifact bytes into a new record; an existing record is never replaced. */
export function captureEvidence(root, artifactPath, recordPath) {
  const record = Object.freeze({ version: 1, artifactPath, sha256: hash(readBounded(root, artifactPath, ARTIFACT_LIMIT)) });
  writeFileSync(evidencePath(root, recordPath, true), `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  return record;
}

/** Verify integrity against a trusted record; this does not authenticate its author. */
export function verifyEvidence(root, recordPath) {
  try {
    const record = JSON.parse(readBounded(root, recordPath, RECORD_LIMIT).toString('utf8'));
    if (!record || Array.isArray(record) || record.version !== 1
        || typeof record.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256)) {
      reject('invalid-record');
    }
    const matches = hash(readBounded(root, record.artifactPath, ARTIFACT_LIMIT)) === record.sha256;
    return { pass: matches, reason: matches ? null : 'hash-mismatch' };
  } catch (error) {
    const reason = error.reason ?? (error instanceof SyntaxError ? 'invalid-record'
      : ['ENOENT', 'ENOTDIR'].includes(error.code) ? 'missing-file'
        : error.code === 'ELOOP' ? 'unsafe-path' : 'read-error');
    return { pass: false, reason };
  }
}
