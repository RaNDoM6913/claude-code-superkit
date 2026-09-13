import { isAbsolute, resolve } from 'node:path';

const path = (value) => typeof value === 'string' && value.length > 0 && !isAbsolute(value)
  && !/[\\:\0]/.test(value) && value.split('/').every((part) => part && part !== '.' && part !== '..');
const argv = (value) => Array.isArray(value) && value.length > 0
  && Array.from(value).every((arg) => typeof arg === 'string' && !arg.includes('\0'));
const same = (a, b) => a.length === b.length && a.every((arg, index) => arg === b[index]);

/** Portable fixture commands only: one Node test file or a workspace-relative tool. */
export function validFixtureCommand(command) {
  return argv(command) && (command[0] === 'node'
    ? command.length === 3 && command[1] === '--test' && path(command[2])
    : command[0].startsWith('./') && path(command[0].slice(2)));
}

export function matchesFixtureCommand(expected, actual, workspaceRoot) {
  if (!validFixtureCommand(expected) || !argv(actual)) return false;
  if (expected[0] === 'node') {
    if (!['node', process.execPath].includes(actual[0])) return false;
    // The collector may add exactly this diagnostic reporter, without altering the test target.
    return same(actual.slice(1), expected.slice(1))
      || same(actual.slice(1), ['--test', '--test-reporter=tap', expected[2]]);
  }
  if (same(actual, expected)) return true;
  if (typeof workspaceRoot !== 'string' || !workspaceRoot) return false;
  return actual[0] === resolve(workspaceRoot, expected[0])
    && same(actual.slice(1), expected.slice(1));
}
