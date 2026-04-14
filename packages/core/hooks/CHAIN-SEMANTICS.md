# Hook chain execution semantics

**Question.** When multiple hooks share a matcher inside `.claude/settings.json`, does Claude Code run them sequentially (in list order, with `exit 2` in one suppressing peers) or in parallel (all three spawn at once, `exit 2` in one does NOT stop the others)?

This is load-bearing for every enforcement hook we ship — if we assume sequential but Claude Code runs parallel, hooks like `dev-required-on-commit` can't count on `doc-check-on-commit`'s exit code having already been observed.

## 1 · Authoritative answer

[Anthropic's hook reference](https://code.claude.com/docs/en/hooks) is explicit:

> When multiple hooks match the same event, they all run in parallel.

This is reproduced on `docs.anthropic.com/en/docs/claude-code/hooks` (same content, different origin). There is no "sequence" mode and no ordering guarantee beyond "all of them will fire".

Practical consequence: `exit 2` from one hook does **not** preempt its peers. Every hook registered under a matcher runs to completion (or times out). The runtime aggregates their verdicts — any single deny wins, but all of them still executed side-effects.

## 2 · Local simulation of both modes

`run-experiment.sh` in this directory runs the three test hooks `h1` / `h2` / `h3` in both sequential and parallel modes and records a shared log. It isn't real Claude Code, but it demonstrates the mechanics of each mode clearly and verifies the test hooks work.

### Sequential mode (what the settings.json list LOOKS like it does)

```
06:52:11.958 h1 start
06:52:12.327 h1 exit=2
06:52:12.376 h2 start        ← h2 only started after h1 finished
06:52:12.924 h2 exit=0
06:52:12.972 h3 start
06:52:13.740 h3 exit=0
```

Total wall-clock: ~1.8s. Each hook's full duration is serialized.

### Parallel mode (what Anthropic docs say Claude Code actually does)

```
06:52:13.815 h1 start        ← same millisecond
06:52:13.815 h2 start        ← same millisecond
06:52:13.815 h3 start        ← same millisecond
06:52:14.161 h1 exit=2
06:52:14.366 h2 exit=0
06:52:14.583 h3 exit=0       ← h3 ran to completion despite h1 exit=2
```

Total wall-clock: ~0.77s (time of the slowest hook). All three start simultaneously; h1's `exit 2` does not suppress h2 or h3; the `h3-ran` marker file exists afterwards.

## 3 · Verifying inside real Claude Code

The local simulation only checks that hooks work in isolation. To confirm Claude Code's actual scheduler:

1. Create a throwaway project directory.
2. Copy `settings-experiment.json` into it as `.claude/settings.json` (substituting `${CLAUDE_PROJECT_DIR}` with the absolute path to the superkit clone).
3. Open that directory in Claude Code and run any `Bash` tool call (`ls`, `pwd`, anything).
4. Inspect:
   - `${TMPDIR:-/tmp}/claude-chain-test.log` — the timestamps show whether hooks started within the same millisecond (parallel) or serially.
   - `${TMPDIR:-/tmp}/claude-chain-test-h3-ran` — presence confirms h3 ran even though h1 exited 2.
5. Record findings in this file under §5.

## 4 · Architectural consequence (applies regardless of runtime version)

Because Anthropic can change the runtime at any time and our local simulation can only show "parallel is possible, not mandatory", every hook we ship **MUST** behave correctly under BOTH semantics. The design contract:

1. **Hooks are idempotent.** Running the same hook twice with the same payload yields the same decision and the same side-effects. No hook leaves a dangling lock, half-written state file, or incrementable counter that depends on not being called twice.
2. **Decisions are independent.** A hook's verdict is computed from the payload plus the `${TMPDIR}`-backed state files — NOT from "what an earlier hook in the chain decided". `dev-required-on-commit.sh` reads the counter file that `dev-edit-counter.sh` wrote; it does not assume `doc-check-on-commit.sh` has already decided anything.
3. **State writes are atomic.** `> file` and `>> file` are both atomic at the shell level. Hooks that need multi-step updates use `mv` after writing to a `.tmp` sibling.
4. **settings.json order is cosmetic.** We still keep `block-dangerous-git → doc-check-on-commit → dev-required-on-commit → loop-guard` as a list for human readability, but no hook's logic depends on running before or after another hook.
5. **Timeouts are explicit.** Every hook that does real I/O has `timeout: 60` in settings.json (or the shell-level `timeout 55` inside the script) so a misbehaving peer can't starve the whole chain.

## 5 · Empirical findings (to fill in on the next real-runtime test)

| Field | Value |
|-------|-------|
| Date tested | *(TBD)* |
| Claude Code version | *(TBD, read from `/help` or `claude --version`)* |
| OS | *(TBD)* |
| Concurrency observed | *(parallel / sequential / other)* |
| h3 marker present after h1 exit 2 | *(yes / no)* |
| Notes | *(TBD)* |

## 6 · References

- Anthropic official hooks reference: `code.claude.com/docs/en/hooks`
- `disler/claude-code-hooks-multi-agent-observability` — similar in-the-wild observations on concurrency
- The test scaffolding files next to this document: `h1.sh`, `h2.sh`, `h3.sh`, `run-experiment.sh`, `settings-experiment.json`
