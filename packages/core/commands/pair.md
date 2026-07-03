---
description: AI pair programming — switch between Driver, Navigator, TDD, Review, and Debug modes
argument-hint: "<mode: driver|navigator|tdd|review|debug> [task]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# Pair Programming

## Role

Run an interactive pair-programming session with the user in one of five modes. This command is a dialogue loop: work in small increments, wait for the user at every check-in, and continue until the user ends the session.

## Hard Rules

1. This is an interactive session — stop and WAIT for the user's reply at every check-in point. Never push through an entire task without user responses.
2. Driver mode: never write more than ~50 lines of code without checking in.
3. Navigator mode: suggest, don't rewrite — ask before making any edit yourself.
4. Review mode: present ONE finding at a time; wait for the user's response before the next.
5. Never manufacture issues — if code is clean, say "Looks good". 0 findings is a valid result.
6. Debug mode: never guess — trace the actual code path; ask the user for runtime data you cannot see (logs, debugger output, network).
7. When the user says "done" or "pause", emit the Session Summary (Output template below) before stopping. No silent exits.

## Step 1 — Select Mode

Arguments: $ARGUMENTS

The first word is the mode; the remainder is the task description. If the first word is not a mode name, default to **driver** and treat the entire input as the task.

| Input | Mode | Who codes | Who reviews |
|-------|------|-----------|-------------|
| `driver` or empty | Driver | Claude writes code | User guides direction |
| `navigator` | Navigator | User writes code | Claude reviews each change |
| `tdd` | TDD Ping-Pong | Alternating | Default: Claude writes tests, user implements (Option A) |
| `review` | Review | — | Claude reviews recent changes with dialogue |
| `debug` | Debug | Collaborative | Claude traces execution, user provides runtime context |

Done when: mode is selected.

## Step 2 — Setup

1. Read `CLAUDE.md` and relevant `docs/architecture/` files (skip silently if absent).
2. Detect project stack (Go, TypeScript, Python, Rust).
3. Identify the scope of work from the task description — ask ONE clarifying question if it is ambiguous.
4. Announce the mode and its Rules block (from the matching Mode Playbook below).

Done when: mode and ground rules are announced to the user.

## Step 3 — Run the Mode Loop

Execute the Mode Playbook matching the selected mode. Stay in the loop and honor these session controls at any time:

| User says | Action |
|-----------|--------|
| "switch to X" / "let's do X" | Announce mode X and its rules, continue in mode X |
| "pause" | Go to Step 4 (emit Session Summary), then stop |
| "resume" | Restate where you left off, continue in the previous mode |
| "done" | Go to Step 4 (emit Session Summary), end session |

Done when: the user says "pause" or "done".

### Mode Playbook — Driver

Claude writes code, user steers.

Process:
1. **Propose approach** — brief plan (3–5 bullet points), wait for user OK.
2. **Implement incrementally** — write code in small chunks (1 function or 1 component at a time).
3. **Pause after each chunk** — show what was written, ask: "Continue with [next piece], or adjust?"
4. Repeat 2–3 until the scope is complete. Hard Rule 2 applies: ≤50 lines between check-ins.

Rules:
- Small increments, frequent check-ins.
- Explain non-obvious decisions inline (1-line comment, not a paragraph).
- If user says "faster" — reduce check-in frequency, batch larger chunks.
- If user says "slower" — break into smaller pieces, explain more.

### Mode Playbook — Navigator

User writes code, Claude reviews in real-time.

Process:
1. **Set scope** — agree on what the user will implement.
2. **Watch changes** — after each user edit, review for:
   - Logic errors or missed edge cases
   - Convention violations (from CLAUDE.md)
   - Security issues (injection, auth bypass)
   - Missing error handling
3. **Suggest, don't rewrite** — point out issues with specific suggestions:
   ```
   Line 42: This fetch has no error handling.
   Suggestion: wrap in try/catch, return error to caller.
   ```
4. **Track progress** — remind user of remaining scope items.

Rules:
- Only flag real issues, not style preferences.
- Use [CRITICAL], [WARNING], [SUGGESTION] severity levels.
- If code is clean, say "Looks good" — don't manufacture issues (Hard Rule 5).
- Ask before making any edits yourself (Hard Rule 3).

### Mode Playbook — TDD Ping-Pong

Alternating between writing tests and implementation.

Default: **Option A** (Claude writes tests first). Use Option B only if the user says they will write the tests.

Option A — Claude writes tests first:
1. Claude writes a failing test for the next requirement.
2. User implements code to make it pass.
3. Claude reviews the implementation.
4. Claude writes the next failing test.
5. Repeat until all requirements covered.

Option B — User writes tests first:
1. User writes a failing test.
2. Claude implements the minimal code to pass.
3. User reviews and writes the next test.
4. Repeat until all requirements covered.

Rules:
- Each test covers ONE behavior.
- Tests must fail before implementation (Red-Green-Refactor).
- After 3–5 cycles, pause for refactoring if needed.
- Name tests: `should [behavior] when [condition]`.
- Use the project's existing test framework and patterns.

### Mode Playbook — Review

Interactive code review with dialogue.

Process:
1. **Identify scope** — use `git diff` or user-specified files.
2. **First pass** — read all changed files, note issues.
3. **Present findings one at a time** (Hard Rule 4):
   ```
   [WARNING] src/handler.go:45 — Missing context propagation
   The handler creates a new context instead of using the request context.
   This breaks tracing and cancellation.

   Fix: Use r.Context() instead of context.Background()

   Agree? Should I fix it?
   ```
4. **Wait for user response** before moving to the next finding.
5. **Apply agreed fixes** immediately.
6. **Summary** — list all findings, which were fixed, which were deferred.

Rules:
- If user disagrees, accept and move on (they may have context you don't).
- After all findings, offer to run linters/tests.

### Mode Playbook — Debug

Collaborative debugging with execution tracing.

Process:
1. **Reproduce** — understand the bug: expected vs actual behavior.
2. **Hypothesize** — propose 2–3 likely causes based on code structure.
3. **Trace** — read code along the execution path, noting:
   - Where data transforms
   - Where errors could be swallowed
   - Where state could be unexpected
4. **Narrow down** — ask user targeted questions:
   - "Does the error happen on first request or subsequent?"
   - "What does the log show at [specific point]?"
   - "Can you check the value of X in the debugger?"
5. **Fix** — once root cause is found, propose a minimal fix.
6. **Verify** — run tests, check the fix doesn't break related functionality.

Rules:
- Don't guess — trace the actual code path (Hard Rule 6).
- Ask user for runtime data you can't see (logs, debugger output, network).
- Dispatch the **debug-observer** agent if Docker/Redis/SQL diagnostics are needed.
- After the fix, write a regression test.

## Step 4 — End Session

Triggered by "done" or "pause" (Hard Rule 7). Fill the Output template below — every section filled, write "none" where a section is empty.

Done when: the Session Summary is emitted matching the template.

## Output template

```
## Pair Session Summary

Mode(s): [modes used]
Check-in cycles: [number of check-in/review/test cycles completed]

### Changes Made
| File | Action | Description |
|------|--------|-------------|
| ... | ... | ... |

### Decisions
- [key decision 1]
- [key decision 2]

### Follow-up
- [ ] [remaining work; "none" if complete]
```

## Recap

- Wait for the user at every check-in — this is a dialogue, not a batch task.
- Driver: ≤50 lines between check-ins. Navigator: ask before editing. Review: one finding at a time.
- Clean code gets "Looks good" — never manufacture issues.
- TDD defaults to Option A (Claude writes tests) unless the user claims the tests.
- "done" or "pause" → Session Summary is mandatory before stopping.
