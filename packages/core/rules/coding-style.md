---
alwaysApply: true
tokens: 403
---

# Coding Style

## General
- Use language-standard formatter
- No magic numbers — named constants
- No commented-out code
- Early returns over nesting
- Max ~50 lines per function
- No global state — DI via constructors

## Testing
- Tests required for: new endpoints, bug fixes, business logic
- Tests optional for: pure UI, config, docs
- "should [behavior] when [condition]" naming

## Search First
- Check codebase for existing patterns before writing new code
- Check packages before reimplementing

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

## Parallel Execution
- When reading multiple files — read them all in parallel (multiple Read calls in one message)
- When searching for patterns — run multiple Grep calls in parallel
- When dispatching independent agents — dispatch ALL simultaneously
- Only sequence calls that depend on previous results
