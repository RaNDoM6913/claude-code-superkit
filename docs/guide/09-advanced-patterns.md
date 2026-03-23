# Chapter 9: Advanced Patterns

## Hook Profiles in Depth

The `CLAUDE_HOOK_PROFILE` environment variable controls which hooks run. Each hook checks the profile and exits early if it should not run:

```bash
PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi
```

### Profile breakdown

| Hook | fast | standard | strict |
|------|------|----------|--------|
| block-dangerous-git (PreToolUse) | yes | yes | yes |
| console-log-warning (PostToolUse) | yes | yes | yes |
| user-prompt-context (UserPromptSubmit) | -- | yes | yes |
| migration-safety (PostToolUse) | -- | yes | yes |
| bundle-import-check (PostToolUse) | -- | yes | yes |
| format-on-edit / gofmt (PostToolUse) | -- | yes | yes |
| typecheck-on-edit / tsc (PostToolUse) | -- | yes | yes |
| go-vet-on-edit (PostToolUse) | -- | -- | yes |
| cargo-check-on-edit (PostToolUse) | -- | -- | yes |
| pre-compact-save (PreCompact) | yes | yes | yes |
| session-context-restore (SessionStart) | yes | yes | yes |
| Stop verification (Stop prompt) | -- | yes | yes |

**When to use each:**
- `fast` -- exploratory work, reading code, quick questions. Only safety hooks run.
- `standard` -- normal development. Formatters and type-checkers run after each edit.
- `strict` -- pre-release or critical code. Adds `go vet` / `cargo check` on every edit plus final verification at session end.

Set per-session: `export CLAUDE_HOOK_PROFILE=strict`

## Session Continuity

When Claude's context window fills up, it compacts (summarizes) the conversation. This loses detailed state. The superkit uses two hooks to preserve and restore context across compactions and sessions.

### pre-compact-save.sh (PreCompact)

Saves the current git state to `~/.config/claude-superkit/last-context.md`:

```
# Claude Code -- Last Context (auto-saved before compaction)
**Saved at:** 2026-03-23 14:30:00 UTC
**Working directory:** /Users/dev/myproject

## Git State
main
a1b2c3d feat(auth): add token refresh
d4e5f6a fix(feed): prevent duplicate swipes

## Modified Files
backend/internal/services/auth/service.go

## Staged Files
none
```

### session-context-restore.sh (SessionStart)

On the next session start, if the saved context is less than 24 hours old, it injects the saved state into Claude's context:

```bash
if [ "$FILE_AGE" -lt 86400 ]; then
  echo "<previous-session-context>"
  cat "$CONTEXT_FILE"
  echo "</previous-session-context>"
fi
```

This gives Claude a starting point: which branch it was on, what was modified, and recent commits.

## Parallel Agent Dispatch Patterns

### Foreground (blocking) dispatch

The command waits for all agents to complete before continuing. Use for reviews and audits where you need all results before producing the report.

```markdown
## Step 3: Dispatch in Parallel

Dispatch ALL triggered agents simultaneously:
- go-reviewer
- ts-reviewer
- security-scanner

Collect all results before proceeding to Step 4.
```

### Background considerations

All agent dispatches in the superkit are foreground (blocking). The command needs agent results to produce its report. Background dispatch would be appropriate for fire-and-forget tasks like "generate documentation in the background while I continue coding" -- but the current command set does not use this pattern.

## Using with the Superpowers Plugin

[Superpowers](https://github.com/obra/superpowers) is another Claude Code extension focused on development process. The two are complementary:

| Concern | superkit | superpowers |
|---------|----------|-------------|
| Code review | Review agents + /review command | -- |
| Security scanning | security-scanner agent | -- |
| Hook safety | block-dangerous-git, typecheck-on-edit | -- |
| TDD workflow | -- | tdd skill |
| Debugging process | debug-observer agent | debugging skill |
| Brainstorming | -- | brainstorm skill |
| Git worktrees | -- | using-git-worktrees skill |
| Session verification | Stop hook | verification skill |

**No conflicts.** superkit provides infrastructure (agents, hooks, commands) while superpowers provides process guidance (skills for how to think about problems).

To use both:
1. Install superkit via `setup.sh`
2. Install superpowers per its instructions
3. Both populate `.claude/` -- different subdirectories, no file collisions

## Git Worktrees for Feature Isolation

If you use the superpowers `using-git-worktrees` skill, each feature gets its own working directory:

```bash
git worktree add ../myproject-feature-auth feature/auth
cd ../myproject-feature-auth
claude  # superkit hooks still work -- they use $CLAUDE_PROJECT_DIR
```

The superkit hooks work in worktrees because they reference `$CLAUDE_PROJECT_DIR` for paths and use relative git commands. The pre-compact-save and session-context-restore hooks save state per working directory.

## CI/CD Integration

Hooks and agents have different CI compatibility:

### Hooks in CI (fully compatible)

Shell hooks follow a simple contract (JSON stdin, exit codes) that works in any CI environment:

```yaml
# GitHub Actions example
- name: Check migration safety
  run: |
    echo '{"tool_input":{"file_path":"migrations/000049_new.up.sql"}}' \
      | bash .claude/scripts/hooks/migration-safety.sh

- name: Block dangerous git patterns
  run: |
    echo '{"tool_input":{"command":"git push --force origin main"}}' \
      | bash .claude/scripts/hooks/block-dangerous-git.sh
    # Exit code 2 = blocked, fails the CI step
```

### Agents in CI (need Claude Code CLI)

Agents require the Claude Code runtime. To use them in CI:

```yaml
- name: Run security scan
  run: |
    npx @anthropic-ai/claude-code --print "Run the security-scanner agent on this repository"
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

The `--print` flag runs Claude Code non-interactively and outputs the result.

### Recommended CI setup

```yaml
# Fast checks (no Claude Code needed)
- migration-safety hook on SQL files
- block-dangerous-git hook on PR commands
- typecheck-on-edit hook equivalent (just run tsc --noEmit)

# AI-powered checks (needs Claude Code + API key)
- /review on PR diff
- /audit security on critical paths
```

## Writing Your Own Profile-Aware Hook

When creating a custom hook, follow this template to support all three profiles:

```bash
#!/bin/bash
# my-custom-hook.sh -- PostToolUse hook for Edit/Write
# Describe what it does.
# Profile: standard, strict (skip on fast)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

# For strict-only hooks:
# if [ "$PROFILE" != "strict" ]; then exit 0; fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# File extension filter
if [[ ! "$FILE_PATH" =~ \.(go|py|ts|tsx)$ ]]; then
  exit 0
fi

# Your check logic here
# ...

exit 0
```

The pattern is always: check profile first, parse input, filter irrelevant files early, then run the actual check. Exit 0 for pass/warn (warnings go to stderr), exit 2 to block.
