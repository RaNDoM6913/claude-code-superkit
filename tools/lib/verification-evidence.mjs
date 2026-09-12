import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { TextDecoder } from 'node:util';

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

function validIdentity(identity) {
  return identity !== null && typeof identity === 'object' && !Array.isArray(identity)
    && typeof identity.runId === 'string' && identity.runId.trim().length > 0
    && !identity.runId.includes('\0')
    && typeof identity.caseId === 'string' && identity.caseId.trim().length > 0
    && !identity.caseId.includes('\0')
    && Array.isArray(identity.command) && identity.command.length > 0
    && Array.from(identity.command).every((arg) => typeof arg === 'string' && !arg.includes('\0'))
    && identity.command[0].length > 0;
}

function sameIdentity(actual, expected) {
  return actual.runId === expected.runId && actual.caseId === expected.caseId
    && actual.command.length === expected.command.length
    && actual.command.every((arg, index) => arg === expected.command[index]);
}

function parseJson(bytes, reason) {
  try {
    return JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(bytes));
  } catch {
    reject(reason);
  }
}

function failureReason(error) {
  return error.reason ?? (['ENOENT', 'ENOTDIR'].includes(error.code) ? 'missing-file'
    : error.code === 'ELOOP' ? 'unsafe-path' : 'read-error');
}

/** Snapshot artifact bytes into a new record; an existing record is never replaced. */
export function captureEvidence(root, artifactPath, recordPath, identity) {
  if (!validIdentity(identity)) reject('invalid-identity');
  const record = Object.freeze({
    version: 3,
    runId: identity.runId,
    caseId: identity.caseId,
    command: Object.freeze([...identity.command]),
    artifactPath,
    sha256: hash(readBounded(root, artifactPath, ARTIFACT_LIMIT)),
  });
  const serialized = `${JSON.stringify(record, null, 2)}\n`;
  if (Buffer.byteLength(serialized) > RECORD_LIMIT) reject('too-large');
  writeFileSync(evidencePath(root, recordPath, true), serialized, { flag: 'wx', mode: 0o600 });
  return record;
}

function readVerifiedEvidence(root, recordPath, expectedIdentity) {
  if (!validIdentity(expectedIdentity)) reject('invalid-identity');
  const record = parseJson(readBounded(root, recordPath, RECORD_LIMIT), 'invalid-record');
  if (!record || Array.isArray(record) || record.version !== 3 || !validIdentity(record)
      || typeof record.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256)) {
    reject('invalid-record');
  }
  if (!sameIdentity(record, expectedIdentity)) reject('identity-mismatch');
  const bytes = readBounded(root, record.artifactPath, ARTIFACT_LIMIT);
  if (hash(bytes) !== record.sha256) reject('hash-mismatch');
  return { record, bytes };
}

/** Expected identity is trusted caller input, never taken from worker output.
 * The collector must assign a fresh runId per attempt; matching data does not authenticate it.
 */
export function verifyEvidence(root, recordPath, expectedIdentity) {
  try {
    readVerifiedEvidence(root, recordPath, expectedIdentity);
    return { pass: true, reason: null };
  } catch (error) {
    return { pass: false, reason: failureReason(error) };
  }
}

const FAILED_OBSERVATION = Object.freeze({ commands: Object.freeze([]), evidencePass: false });
const nonemptyString = (value) => typeof value === 'string' && value.trim().length > 0;

/** Load one collector verification result. Parse the exact verified byte snapshot;
 * do not reopen its path or derive command results from worker success claims.
 * This is a narrow artifact format, not the eventual model response schema.
 */
export function loadVerificationEvidence(root, recordPath, expectedIdentity) {
  try {
    const { record, bytes } = readVerifiedEvidence(root, recordPath, expectedIdentity);
    const payload = parseJson(bytes, 'invalid-payload');
    if (!validIdentity(payload) || payload.version !== 1
        || typeof payload.stdout !== 'string' || typeof payload.stderr !== 'string'
        || typeof payload.truncated !== 'boolean'
        || !(payload.signal === null || nonemptyString(payload.signal))
        || !(payload.error === null || (typeof payload.error === 'object'
          && !Array.isArray(payload.error) && nonemptyString(payload.error?.code)))
        || !(payload.exitCode === null || (Number.isSafeInteger(payload.exitCode)
          && payload.exitCode >= 0 && payload.exitCode <= 0xffffffff))) {
      reject('invalid-payload');
    }
    if (!sameIdentity(payload, record)) reject('payload-identity-mismatch');
    if (payload.truncated) reject('incomplete-evidence');
    const interrupted = payload.signal !== null || payload.error !== null;
    if ((payload.exitCode === null) !== interrupted) reject('invalid-payload');
    const command = Object.freeze({
      command: Object.freeze([...record.command]), exitCode: payload.exitCode,
      signal: payload.signal, error: payload.error === null ? null : Object.freeze({ code: payload.error.code }),
      stdout: payload.stdout, stderr: payload.stderr,
    });
    return {
      pass: true, reason: null,
      observation: Object.freeze({ commands: Object.freeze([command]), evidencePass: true }),
    };
  } catch (error) {
    return { pass: false, reason: failureReason(error), observation: FAILED_OBSERVATION };
  }
}
