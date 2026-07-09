---
alwaysApply: true
tokens: 755
---

# Coding Style

Always-on discipline for every response that touches code: verify before you claim, change only what was asked, follow the style rules below.

## Investigate Before Answering
- Never speculate about code you have not opened
- If a user references a file — READ it before answering
- Do NOT invent API endpoints, package names, or function signatures
- Do NOT assume a package exists — verify in package registry or node_modules/go.mod
- If unsure whether something exists — grep for it first

## Surgical Changes
- Change ONLY what was requested — nothing more
- A bug fix does NOT need surrounding code cleaned up
- A new feature does NOT need existing code refactored
- Do NOT "improve" code you're passing through
- Do NOT add docstrings, comments, or type annotations to code you didn't change
- If you see a real problem in unrelated code — mention it, don't fix it
- Three similar lines of code is better than a premature abstraction

## Search First
- Check codebase for existing patterns before writing new code
- Check packages before reimplementing
- Name the precedent you follow (file:line) — or state explicitly that no precedent was found after searching

## Solution Ladder (before writing new code)

Stop at the first rung that holds:
1. Doesn't need to exist (YAGNI)? — don't write it (anti-patterns below).
2. Already in this codebase? — reuse it (Search First above).
3. Stdlib covers it? — use stdlib; don't reimplement, don't add a dependency.
4. Native platform feature covers it? — use it: `<input type="date">` over a picker lib, CSS over JS, a DB constraint over app-level checks.
5. An installed dependency covers it? — use it. Never add a NEW dependency for what stdlib, the platform, or a few lines can do.

Mark a deliberate simplification with a comment naming its ceiling and the upgrade trigger: `// simplified: global lock; per-account locks if throughput matters`.

Minimal never means fragile: input validation at trust boundaries, error handling, security, and accessibility are never simplified away — and anything explicitly requested is never dropped.

## YAGNI Anti-Patterns (canonical)
- Abstraction with one implementation
- Config option nobody sets
- Scaffolding "for later"
- Wrapper that adds nothing over what it wraps
- Dead flag/parameter kept "just in case"

## General
- Use language-standard formatter
- No magic numbers — named constants
- No commented-out code
- Early returns over nesting
- Max ~50 lines per function
- No global state — DI via constructors

## Testing
- Tests required for: new endpoints, bug fixes (regression test), business logic
- Tests optional for: pure UI, config, docs
- "should [behavior] when [condition]" naming

## Parallel Execution
- When reading multiple files — read them all in parallel (multiple Read calls in one message)
- When searching for patterns — run multiple Grep calls in parallel
- When dispatching independent agents — dispatch ALL simultaneously
- Only sequence calls that depend on previous results
