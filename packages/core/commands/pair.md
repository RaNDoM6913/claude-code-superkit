---
description: AI pair programming — switch between Driver, Navigator, TDD, Review, and Debug modes
argument-hint: "<mode: driver|navigator|tdd|review|debug> [task]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# Pair Programming

AI-assisted pair programming with structured collaboration modes.

## Task

$ARGUMENTS

## Mode Selection

Parse `$ARGUMENTS` to select mode:

| Input | Mode | Who codes | Who reviews |
|-------|------|-----------|-------------|
| `driver` or empty | Driver | Claude writes code | User guides direction |
| `navigator` | Navigator | User writes code | Claude reviews each change |
| `tdd` | TDD Ping-Pong | Alternating | Claude writes test, user implements (or vice versa) |
| `review` | Review | — | Claude reviews recent changes with dialogue |
| `debug` | Debug | Collaborative | Claude traces execution, user provides runtime context |

If mode is omitted, default to **driver**.

## Phase 0 — Setup

1. Read `CLAUDE.md` and relevant `docs/architecture/` files
2. Detect project stack (Go, TypeScript, Python, Rust)
3. Identify the scope of work from the task description
4. Announce the mode and ground rules

## Driver Mode

Claude writes code, user steers.

### Process
1. **Understand the goal** — ask one clarifying question if the task is ambiguous
2. **Propose approach** — brief plan (3-5 bullet points), wait for user OK
3. **Implement incrementally** — write code in small chunks (1 function or 1 component at a time)
4. **Pause after each chunk** — show what was written, ask: "Continue with [next piece], or adjust?"
5. **Never write more than ~50 lines without checking in**

### Rules
- Small increments, frequent check-ins
- Explain non-obvious decisions inline (1-line comment, not paragraph)
- If user says "faster" — reduce check-in frequency, batch larger chunks
- If user says "slower" — break into smaller pieces, explain more

## Navigator Mode

User writes code, Claude reviews in real-time.

### Process
1. **Set scope** — agree on what the user will implement
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
4. **Track progress** — remind user of remaining scope items

### Rules
- Only flag real issues, not style preferences
- Use [CRITICAL], [WARNING], [SUGGESTION] severity levels
- If code is clean, say "Looks good" — don't manufacture issues
- Ask before making any edits yourself

## TDD Ping-Pong Mode

Alternating between writing tests and implementation.

### Process

**Option A — Claude writes tests first:**
1. Claude writes a failing test for the next requirement
2. User implements code to make it pass
3. Claude reviews the implementation
4. Claude writes the next failing test
5. Repeat until all requirements covered

**Option B — User writes tests first:**
1. User writes a failing test
2. Claude implements the minimal code to pass
3. User reviews and writes the next test
4. Repeat

### Rules
- Each test covers ONE behavior
- Tests must fail before implementation (Red-Green-Refactor)
- After 3-5 cycles, pause for refactoring if needed
- Name tests: `should [behavior] when [condition]`
- Use project's existing test framework and patterns

## Review Mode

Interactive code review with dialogue.

### Process
1. **Identify scope** — use `git diff` or user-specified files
2. **First pass** — read all changed files, note issues
3. **Present findings one at a time**:
   ```
   [WARNING] src/handler.go:45 — Missing context propagation
   The handler creates a new context instead of using the request context.
   This breaks tracing and cancellation.

   Fix: Use r.Context() instead of context.Background()

   Agree? Should I fix it?
   ```
4. **Wait for user response** before moving to next finding
5. **Apply agreed fixes** immediately
6. **Summary** — list all findings, which were fixed, which were deferred

### Rules
- One finding at a time, wait for response
- If user disagrees, accept and move on (they may have context you don't)
- After all findings, offer to run linters/tests

## Debug Mode

Collaborative debugging with execution tracing.

### Process
1. **Reproduce** — understand the bug: expected vs actual behavior
2. **Hypothesize** — propose 2-3 likely causes based on code structure
3. **Trace** — read code along the execution path, noting:
   - Where data transforms
   - Where errors could be swallowed
   - Where state could be unexpected
4. **Narrow down** — ask user targeted questions:
   - "Does the error happen on first request or subsequent?"
   - "What does the log show at [specific point]?"
   - "Can you check the value of X in the debugger?"
5. **Fix** — once root cause is found, propose minimal fix
6. **Verify** — run tests, check the fix doesn't break related functionality

### Rules
- Don't guess — trace the actual code path
- Ask user for runtime data you can't see (logs, debugger output, network)
- Dispatch **debug-observer** agent if Docker/Redis/SQL diagnostics needed
- After fix, write a regression test

## Session Management

- **Switch modes anytime**: user says "switch to navigator" or "let's do TDD"
- **Pause**: user says "pause" — Claude summarizes progress and stops
- **Resume**: user says "resume" — Claude restates where we left off
- **End**: user says "done" — Claude provides session summary

## Session Summary (on end)

```
## Pair Session Summary

Mode(s): [modes used]
Duration: [approximate]

### Changes Made
| File | Action | Description |
|------|--------|-------------|
| ... | ... | ... |

### Decisions
- [key decision 1]
- [key decision 2]

### Follow-up
- [ ] [remaining work if any]
```
