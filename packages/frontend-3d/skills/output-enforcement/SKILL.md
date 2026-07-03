---
name: output-enforcement
description: Anti-laziness enforcement — bans placeholder patterns (// ..., // TODO, // rest of code), enforces complete code generation, handles token-limit splits cleanly. Activate for every code generation task.
tokens: 595
---

# Full Output Enforcement

## Purpose

Every response contains complete, runnable code — no placeholders, no elided sections.

**Use when:** any code-generation task (new files, edits, refactors).
**Do not use:** prose-only responses with no code output.

## Hard Rules

1. NEVER emit a banned pattern (list below) in generated code.
2. Write every file complete, from first line to last.
3. If output must split, break ONLY at a complete function/class boundary and add a `[PAUSED …]` marker.
4. If a banned pattern appears in your draft, rewrite that section in full before responding — never send the draft as-is.
5. Every `import` must resolve, every type must be defined, every called function must exist.

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

`/* ... */` is banned when it stands in for omitted code; a block comment with real content is fine.

## Workflow

1. **Scope** — count the files and functions to generate.
2. **Build** — write every file completely, no shortcuts.
3. **Cross-check** — every import resolves, every type exists, every function call targets a defined function.
4. **Self-check before sending** — search your draft for banned patterns:
   - Pattern found → rewrite that section completely, then repeat this step.
   - No pattern found → send.

## Token Limit Handling

If approaching the token limit mid-file:

1. Finish the current function/class completely.
2. Add a pause marker with progress tracking.
3. In the next response, continue from the marker — do not repeat completed code.

**Marker formats:**

```
[PAUSED — 3 of 7 files complete. Continuing with AuthService.ts]
```

```
[PAUSED — AuthController.ts: 4 of 6 methods complete]
[Completed: login, logout, refresh, validate]
[Remaining: resetPassword, changeEmail]
```

## Recap — non-negotiables

- Zero banned patterns in output; found in draft → rewrite the section in full before sending.
- Split only at a complete function/class boundary, always with a PAUSED marker.
- **Incomplete code is worse than no code.** A placeholder `// TODO` becomes invisible tech debt; a complete implementation can be reviewed, tested, and shipped.
