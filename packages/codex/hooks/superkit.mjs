#!/usr/bin/env node
// Native Codex command hooks. No transcript reads, model calls, project scripts or writes.
import { spawnSync } from 'node:child_process';
import { isAbsolute } from 'node:path';

const mode = process.argv[2];
const deny = reason => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } });
const unverified = () => ({ systemMessage: 'Superkit diff hygiene UNVERIFIED: invalid input, unavailable Git, non-repository cwd, or bounded Git check failure. Run applicable verification explicitly; do not claim a pass.' });

// Deliberately a recognizer for explicit shell words, not a shell interpreter.
// Expansions, heredocs and nested interpreters are not assessed. Native permission
// rules/sandbox/user authority still apply; this hook never emits "allow".
function shellWords(command) {
  const commands = [];
  let words = [], word = '', quote = '', started = false, opaque = false;
  const finishWord = () => { if (started) words.push(word); word = ''; started = false; };
  const finishCommand = () => { finishWord(); if (words.length) commands.push(words); words = []; };
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote === "'") {
      if (ch === quote) quote = ''; else word += ch;
      continue;
    }
    if (ch === '\\' && quote !== "'") {
      if (i + 1 >= command.length) { opaque = true; break; }
      const next = command[++i];
      if (next !== '\n') { word += next; started = true; }
      continue;
    }
    if (ch === '$' || ch === '`') opaque = true;
    if (quote === '"') {
      if (ch === quote) quote = ''; else word += ch;
      continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; started = true; continue; }
    if (ch === '#' && !started) {
      while (i < command.length && command[i] !== '\n') i++;
      finishCommand(); continue;
    }
    if (ch === '<' && command[i + 1] === '<') { opaque = true; break; }
    if ('<>()[]{}*?~'.includes(ch)) opaque = true;
    if (';&|\n'.includes(ch)) { finishCommand(); continue; }
    if (/\s/.test(ch)) { finishWord(); continue; }
    word += ch; started = true;
  }
  if (quote) opaque = true;
  finishCommand();
  return { commands, opaque };
}

function commandIndex(words) {
  let i = 0;
  const assignments = () => { while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i] || '')) i++; };
  assignments();
  if (words[i] === 'env') {
    i++;
    while (['-i', '--ignore-environment', '--'].includes(words[i])) i++;
    assignments();
  }
  if (words[i] === 'command') { i++; if (words[i] === '--') i++; }
  return i;
}

function gitArgs(words) {
  let i = commandIndex(words);
  if (!/(^|\/)git$/.test(words[i] || '')) return null;
  i++;
  while (words[i]?.startsWith('-')) {
    const option = words[i++];
    if (['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(option)) { i++; continue; }
    if (/^(?:-C.|-c.|--(?:git-dir|work-tree|namespace)=)/.test(option)) continue;
    if (['--no-pager', '--paginate', '--bare', '--literal-pathspecs', '--no-optional-locks'].includes(option)) continue;
    return { opaque: true };
  }
  return { operation: words[i], args: words.slice(i + 1) };
}

// Value-taking options must be consumed before inspecting flags. In a short
// cluster, the remainder after such an option is its value (e.g. -amtext).
// This intentionally covers the direct Git forms below, not Git aliases or
// arbitrary wrappers/option abbreviations.
function gitOptions(operation, args) {
  const valueOptions = {
    commit: ['mFctC', '--message', '--file', '--reuse-message', '--reedit-message', '--template', '--author', '--date', '--fixup', '--squash', '--cleanup', '--trailer', '--pathspec-from-file'],
    push: ['o', '--push-option', '--repo', '--receive-pack', '--exec'],
    merge: ['mFsX', '--message', '--file', '--strategy', '--strategy-option', '--into-name'],
    rebase: ['sXx', '--onto', '--exec', '--strategy', '--strategy-option'],
    clean: ['e', '--exclude'],
    branch: ['', '--format', '--sort', '--points-at'],
    reset: ['', '--pathspec-from-file'],
    checkout: ['bB', '--orphan', '--conflict', '--pathspec-from-file'],
    switch: ['cC', '--create', '--force-create', '--orphan', '--conflict'],
    restore: ['s', '--source', '--conflict', '--pathspec-from-file']
  }[operation] || [''];
  const flags = new Set(), operands = [];
  let separator = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (separator) { operands.push(arg); continue; }
    if (arg === '--') { separator = true; continue; }
    if (arg.startsWith('--')) {
      const name = arg.split('=', 1)[0];
      flags.add(name);
      if (!arg.includes('=') && valueOptions.includes(name)) i++;
    } else if (/^-[^-]/.test(arg)) {
      for (let j = 1; j < arg.length; j++) {
        flags.add(`-${arg[j]}`);
        // Optional short values are attached only; e.g. -Skey must not turn
        // letters in a signing key into commit flags, or consume the next flag.
        if (operation === 'commit' && 'Su'.includes(arg[j])) break;
        if (valueOptions[0].includes(arg[j])) {
          if (j === arg.length - 1) i++;
          break;
        }
      }
    } else operands.push(arg);
  }
  return { flags, operands, separator };
}

function destructive(operation, args) {
  const { flags, operands, separator } = gitOptions(operation, args);
  const short = flag => flags.has(`-${flag}`);
  const has = flag => flags.has(flag);
  if (operation === 'commit' && (has('--no-verify') || short('n'))) return 'commit verification bypass';
  if (['push', 'merge', 'rebase'].includes(operation) && has('--no-verify')) return 'verification bypass';
  if (operation === 'push' && (short('f') || has('--force') || operands.some(a => a.startsWith('+')))) return 'force push';
  if (operation === 'reset' && has('--hard')) return 'hard reset';
  if (operation === 'clean' && !has('--dry-run') && !short('n') && (has('--force') || short('f'))) return 'forced clean';
  if (operation === 'branch' && (short('D') || ((has('--delete') || short('d')) && (has('--force') || short('f'))))) return 'forced branch deletion';
  if (operation === 'checkout' && (separator || operands.includes('.') || has('--force') || short('f') || short('B'))) return 'checkout discarding work';
  if (operation === 'switch' && (has('--discard-changes') || has('--force') || has('--force-create') || short('f') || short('C'))) return 'switch discarding work';
  if (operation === 'restore' && (!(has('--staged') || short('S')) || has('--worktree') || short('W'))) return 'restore overwriting working files';
  return null;
}

function preTool(input) {
  if (input?.hook_event_name !== 'PreToolUse' || typeof input.tool_name !== 'string') return deny('Superkit Git guard could not validate the hook input. Check the installed hook integration.');
  if (input.tool_name !== 'Bash') return {};
  const command = input.tool_input?.command;
  if (typeof command !== 'string' || !command.trim()) return deny('Superkit Git guard received no valid shell command.');
  const parsed = shellWords(command);
  let opaque = parsed.opaque;
  for (const words of parsed.commands) {
    const executable = words[commandIndex(words)]?.split('/').pop();
    if (['sh', 'bash', 'zsh', 'eval', 'source', '.'].includes(executable)) opaque = true;
    const git = gitArgs(words);
    if (!git) continue;
    if (git.opaque) { opaque = true; continue; }
    const reason = destructive(git.operation, git.args);
    if (reason) return deny(`Superkit blocked explicit ${reason}. Preserve work and use a non-destructive operation; do not bypass this hook. User authorization and native permissions remain required.`);
  }
  return opaque ? { hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: 'Superkit Git guard: dynamic or unsupported shell syntax was not assessed. This is not permission to execute it; inspect the exact operation and apply native permissions and user authority.' } } : {};
}

function git(cwd, args) {
  // Event cwd is the repository authority. Inherited Git location/index overrides
  // must not silently redirect hygiene checks to a different worktree or index.
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_PREFIX']) delete env[key];
  return spawnSync('git', ['--no-pager', '-c', 'core.fsmonitor=false', ...args], {
    cwd, encoding: 'utf8', timeout: 3000, maxBuffer: 1024 * 1024, windowsHide: true,
    env
  });
}

function stop(input) {
  if (input?.hook_event_name !== 'Stop' || typeof input.cwd !== 'string' || !isAbsolute(input.cwd)) return unverified();
  const root = git(input.cwd, ['rev-parse', '--show-toplevel']);
  if (root.error || root.status !== 0 || !root.stdout.trim()) return unverified();
  // --no-ext-diff/--no-textconv do not disable clean/process conversions, which
  // Git may run while comparing a working file. Enumerate names only, without
  // reading handler values into this process or executing any diff first.
  const filters = git(root.stdout.trim(), ['config', '--includes', '--name-only', '--get-regexp', '^filter\\..*\\.(clean|process)$']);
  if (filters.error || ![0, 1].includes(filters.status)) return unverified();
  if (filters.status === 0) return {
    systemMessage: 'Superkit diff hygiene UNVERIFIED: Git clean/process conversion filters are configured. Skipped diff checks to avoid executing configured conversion programs. This also applies to unused configured filters; run applicable verification explicitly without claiming this hook passed.'
  };
  const results = [
    git(root.stdout.trim(), ['diff', '--no-ext-diff', '--no-textconv', '--check']),
    git(root.stdout.trim(), ['diff', '--cached', '--no-ext-diff', '--no-textconv', '--check'])
  ];
  if (results.some(r => r.error || ![0, 2].includes(r.status))) return unverified();
  if (results.every(r => r.status === 0)) return {};
  const reason = 'Superkit Git diff hygiene found whitespace errors or conflict markers in tracked staged/unstaged changes. Inspect git diff --check and git diff --cached --check. Fix only changes within authorized scope; preserve/report pre-existing or unrelated errors. This check does not verify tests, builds, untracked files or behavior.';
  return input.stop_hook_active ? { systemMessage: `${reason} No further automatic continuation requested.` } : { decision: 'block', reason };
}

try {
  const chunks = [];
  let length = 0;
  for await (const chunk of process.stdin) {
    length += chunk.length;
    if (length > 1024 * 1024) throw new Error('Oversized input');
    chunks.push(chunk);
  }
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (mode !== 'pre-tool' && mode !== 'stop') throw new Error('Unknown hook mode');
  console.log(JSON.stringify(mode === 'pre-tool' ? preTool(input) : stop(input)));
} catch {
  // Do not echo payloads, commands, messages, transcripts or diff contents.
  console.log(JSON.stringify(mode === 'pre-tool' ? deny('Superkit Git guard input/check failed. Review the hook installation before retrying.') : unverified()));
}
