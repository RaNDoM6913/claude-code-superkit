---
name: full-output-enforcement
description: Anti-laziness enforcement — bans placeholder patterns (// ..., // TODO, // rest of code), enforces complete code generation, handles token-limit splits cleanly. Activate for every code generation task.
---

# Full Output Enforcement

Never produce incomplete code. Every response must contain complete, runnable code.

## Banned Patterns

These MUST NEVER appear in generated code:

```
// ...
// rest of code
// rest of the implementation
// implement here
// TODO: implement
// TODO
// existing code...
// previous code remains
// ... (other methods)
// similar to above
/* ... */
# ... rest
# TODO
```

## Execution Protocol

### Before Writing Code

1. **Scope:** Count files and functions to generate
2. **Build:** Write every file completely — no shortcuts
3. **Cross-check:** Verify every import resolves, every type exists, every function is defined

### During Writing

- Write complete file from first line to last
- If a file is too long for one response, write to a clean breakpoint (complete function/class)
- Mark pause point: `[PAUSED — 3 of 7 files complete. Continuing with AuthService.ts]`

### Quick Check (Run Before Every Response)

1. Search for banned patterns in your response
2. Verify every `import` has a matching `export`
3. Verify every type reference has a definition
4. Verify no function calls reference undefined functions

## Token Limit Handling

If approaching token limit mid-file:

1. Finish the current function/class completely
2. Add pause marker with progress tracking
3. In next response, continue from the marker — don't repeat completed code

**Format:**
```
[PAUSED — AuthController.ts: 4 of 6 methods complete]
[Completed: login, logout, refresh, validate]
[Remaining: resetPassword, changeEmail]
```

## The Rule

**Incomplete code is worse than no code.** A placeholder `// TODO` becomes invisible tech debt. A complete implementation can be reviewed, tested, and shipped.
