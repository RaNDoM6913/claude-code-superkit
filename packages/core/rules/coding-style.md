---
alwaysApply: true
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
