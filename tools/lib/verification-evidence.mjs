import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { TextDecoder } from 'node:util';

const ARTIFACT_LIMIT = 2 * 1024 * 1024;
const RECORD_LIMIT = 64 * 1024;
const INPUT_FILE_LIMIT = 128;
const INPUT_BYTE_LIMIT = 8 * 1024 * 1024;

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
    && typeof identity.snapshotSha256 === 'string' && /^[a-f0-9]{64}$/.test(identity.snapshotSha256)
    && typeof identity.runId === 'string' && identity.runId.trim().length > 0
    && !identity.runId.includes('\0')
    && typeof identity.caseId === 'string' && identity.caseId.trim().length > 0
    && !identity.caseId.includes('\0')
    && Array.isArray(identity.command) && identity.command.length > 0
    && Array.from(identity.command).every((arg) => typeof arg === 'string' && !arg.includes('\0'))
    && identity.command[0].length > 0;
}

function sameIdentity(actual, expected) {
  return actual.snapshotSha256 === expected.snapshotSha256
    && actual.runId === expected.runId && actual.caseId === expected.caseId
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

function validSelection(selection) {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)
      || !Array.isArray(selection.sources) || !selection.sources.length
      || !Array.isArray(selection.instructions) || !selection.instructions.length) return false;
  const paths = [...selection.sources, ...selection.instructions];
  return paths.length <= INPUT_FILE_LIMIT && paths.every((path) => typeof path === 'string' && path.length > 0)
    && new Set(paths).size === paths.length;
}

/** Capture only the trusted caller's explicit source/instruction selection.
 * Selection completeness is not inferred. Store this manifest outside the worker root.
 */
export function captureInputSnapshot(workspaceRoot, evidenceRoot, snapshotPath, selection) {
  if (!validSelection(selection)) reject('invalid-selection');
  let totalBytes = 0;
  const files = [];
  for (const [group, kind] of [['sources', 'source'], ['instructions', 'instruction']]) {
    for (const path of [...selection[group]].sort()) {
      const bytes = readBounded(workspaceRoot, path, ARTIFACT_LIMIT);
      totalBytes += bytes.length;
      if (totalBytes > INPUT_BYTE_LIMIT) reject('too-large');
      files.push(Object.freeze({ kind, path, sha256: hash(bytes) }));
    }
  }
  const manifest = Object.freeze({ version: 1, files: Object.freeze(files) });
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  if (Buffer.byteLength(serialized) > RECORD_LIMIT) reject('too-large');
  writeFileSync(evidencePath(evidenceRoot, snapshotPath, true), serialized, { flag: 'wx', mode: 0o600 });
  return Object.freeze({ ...manifest, sha256: hash(Buffer.from(serialized)) });
}

/** Compare selected current files to the externally trusted manifest digest.
 * This is a point-in-time content check, not monitoring or a filesystem sandbox.
 */
export function verifyInputSnapshot(workspaceRoot, evidenceRoot, snapshotPath, expectedSha256) {
  try {
    if (typeof expectedSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(expectedSha256)) reject('invalid-snapshot-hash');
    const bytes = readBounded(evidenceRoot, snapshotPath, RECORD_LIMIT);
    if (hash(bytes) !== expectedSha256) reject('snapshot-mismatch');
    const manifest = parseJson(bytes, 'invalid-snapshot');
    if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.files)
        || manifest.files.length > INPUT_FILE_LIMIT
        || manifest.files.some((file) => !file || !['source', 'instruction'].includes(file.kind)
          || typeof file.path !== 'string' || typeof file.sha256 !== 'string'
          || !/^[a-f0-9]{64}$/.test(file.sha256))) reject('invalid-snapshot');
    const selection = {
      sources: manifest.files.filter((file) => file.kind === 'source').map((file) => file.path),
      instructions: manifest.files.filter((file) => file.kind === 'instruction').map((file) => file.path),
    };
    if (!validSelection(selection)) reject('invalid-snapshot');
    let totalBytes = 0;
    for (const file of manifest.files) {
      const current = readBounded(workspaceRoot, file.path, ARTIFACT_LIMIT);
      totalBytes += current.length;
      if (totalBytes > INPUT_BYTE_LIMIT) reject('too-large');
      if (hash(current) !== file.sha256) reject('input-mismatch');
    }
    return { pass: true, reason: null };
  } catch (error) {
    return { pass: false, reason: failureReason(error) };
  }
}

/** Snapshot artifact bytes into a new record; an existing record is never replaced. */
export function captureEvidence(root, artifactPath, recordPath, identity) {
  if (!validIdentity(identity)) reject('invalid-identity');
  const record = Object.freeze({
    version: 4,
    snapshotSha256: identity.snapshotSha256,
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
  if (!record || Array.isArray(record) || record.version !== 4 || !validIdentity(record)
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
    if (!validIdentity(payload) || payload.version !== 2
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

function validRuntimePair(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && nonemptyString(value.model) && !value.model.includes('\0')
    && nonemptyString(value.effort) && !value.effort.includes('\0');
}

/** Internal normalized collector trace, not a provider-native event schema.
 * Only a trusted adapter may label events as source=runtime. This checks that
 * declaration and verified bytes; provider adapters/authentication remain pending.
 * The expectation must already be approved by caller routing policy/registry.
 */
export function loadRuntimeEvidence(root, recordPath, expectedIdentity, expectedRuntime) {
  let observed = null;
  try {
    if (!validRuntimePair(expectedRuntime)) reject('invalid-runtime-expectation');
    const { record, bytes } = readVerifiedEvidence(root, recordPath, expectedIdentity);
    const trace = parseJson(bytes, 'invalid-runtime-trace');
    if (!validIdentity(trace) || trace.version !== 1 || trace.kind !== 'runtime-identity'
        || typeof trace.truncated !== 'boolean' || !Array.isArray(trace.events) || trace.events.length > 256
        || trace.events.some((event) => !event || typeof event !== 'object' || Array.isArray(event)
          || !nonemptyString(event.type))) reject('invalid-runtime-trace');
    if (!sameIdentity(trace, record)) reject('runtime-identity-mismatch');
    if (trace.truncated) reject('incomplete-runtime-evidence');
    let unavailable = false;
    for (const event of trace.events) {
      if (!['runtime.identity', 'runtime.unavailable'].includes(event.type)) {
        if (event.type.startsWith('runtime.')) reject('invalid-runtime-trace');
        continue;
      }
      if (event.source !== 'runtime') reject('untrusted-runtime-event');
      if (event.runId !== record.runId) reject('runtime-event-run-mismatch');
      if (event.type === 'runtime.unavailable') {
        if (!nonemptyString(event.code)) reject('invalid-runtime-trace');
        unavailable = true;
        continue;
      }
      if (!validRuntimePair(event.observed)) reject('incomplete-runtime-identity');
      if (observed && (observed.model !== event.observed.model || observed.effort !== event.observed.effort)) {
        reject('conflicting-runtime-identity');
      }
      observed = Object.freeze({ model: event.observed.model, effort: event.observed.effort });
    }
    if (unavailable) reject('runtime-unavailable');
    if (!observed) reject('runtime-unobserved');
    if (observed.model !== expectedRuntime.model) reject('model-mismatch');
    if (observed.effort !== expectedRuntime.effort) reject('effort-mismatch');
    return { pass: true, reason: null, observed };
  } catch (error) {
    const reason = failureReason(error);
    return { pass: false, reason, observed: ['model-mismatch', 'effort-mismatch'].includes(reason) ? observed : null };
  }
}
