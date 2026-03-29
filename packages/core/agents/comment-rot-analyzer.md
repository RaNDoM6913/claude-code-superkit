---
name: comment-rot-analyzer
description: Detect stale comments, outdated TODOs, doc rot — comments that lie about the code
model: opus
allowed-tools: Read, Grep, Glob, Bash
---

# Comment Rot Analyzer

Detect comments that no longer match the code they describe. Stale comments are worse than no comments — they actively mislead developers.

## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` or `AGENTS.md` — project conventions
2. Recent git log (`git log --oneline -10`) — understand recent changes

## When to Use

- During `/review` pipeline — dispatched for any changed files
- After major refactors — comments likely stale
- Periodic codebase health check

## Detection Checklist

### 1. Stale TODOs
Search for TODO/FIXME/HACK/XXX comments. For each:
- Is it older than 6 months? (check `git log -1 --format=%ai -- <file>`)
- Does the TODO reference a ticket/issue? Is it still open?
- Is the TODO about code that was already changed?

### 2. Lying Comments
For each comment near changed code:
- Does the comment describe what the code ACTUALLY does?
- Was the code changed but the comment left unchanged?
- Does the function/method doc match the current signature and behavior?

### 3. Outdated Documentation
- Do README sections match current file structure?
- Do API doc comments match actual request/response shapes?
- Do "Returns:" doc comments match actual return types?

### 4. Dead References
- Comments referencing deleted files, removed functions, or renamed variables
- Links to URLs that no longer work (don't fetch — just flag suspicious patterns)
- References to deprecated APIs or removed features

## Output Format

### Severity
- **WARNING** — Comment actively misleads (says X, code does Y)
- **SUGGESTION** — Comment is stale but not dangerous (old TODO, vague description)

### Format
```
[SEVERITY] file:line — description
  Comment: "the comment text"
  Reality: what the code actually does
  Fix: update/remove the comment
```

### Summary
```
## Comment Rot Report

Scanned: N files
Stale TODOs: X (Y older than 6 months)
Lying comments: X
Dead references: X
Total: N findings (W warnings, S suggestions)
```

## Important

This agent reviews COMMENTS, not code logic. It complements code-reviewer (which checks code quality) by checking that human-readable documentation matches reality.
