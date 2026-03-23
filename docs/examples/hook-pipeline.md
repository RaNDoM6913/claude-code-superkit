# Tutorial: Setting Up a Complete Hook Pipeline

This tutorial walks you through creating a **format + lint** pipeline that fires automatically on every file edit. You'll learn the hook system, create two hooks, wire them in settings.json, and add hook profile support.

## What You'll Build

A pipeline where every `.ts`/`.tsx` file edit triggers:
1. **format-on-save** -- runs Prettier to auto-format the file
2. **lint-check** -- runs ESLint and warns on issues

Both hooks fire on the `PostToolUse` event for `Edit` and `Write` tools.

## Concept: How Hook Pipelines Work

```
Claude edits a .tsx file
        |
        v
  PostToolUse event fires
        |
        v
  +-----------------------+
  | Hook 1: format-on-save |  <-- Prettier formats the file
  +-----------------------+
        |
        v
  +-----------------------+
  | Hook 2: lint-check     |  <-- ESLint checks for issues
  +-----------------------+
        |
        v
  Claude sees formatted file + any lint warnings
```

Key principles:
- Hooks run **sequentially** in the order listed in `settings.json`
- Each hook receives the **tool input** as JSON on stdin
- Hooks communicate via **exit codes** and **stderr** messages
- Exit code `0` = success (silent), `2` = block the action, anything else = warning

## Step 1: Create the Format-on-Save Hook

Create `.claude/scripts/hooks/format-on-save.sh`:

```bash
#!/bin/bash
# format-on-save.sh -- PostToolUse hook for Edit/Write
# Runs Prettier on .ts/.tsx files after each edit
# Profile: standard, strict (skip on fast)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only process TypeScript files
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

# Check if the file exists (Write might create new files)
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Find the nearest prettier config by walking up
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Determine which subproject the file belongs to
if [[ "$FILE_PATH" == *"frontend/"* ]]; then
  PRETTIER_DIR="$PROJECT_DIR/frontend"
elif [[ "$FILE_PATH" == *"admin/"* ]]; then
  PRETTIER_DIR="$PROJECT_DIR/admin"
else
  PRETTIER_DIR="$PROJECT_DIR"
fi

# Run prettier if available
if [ -f "$PRETTIER_DIR/node_modules/.bin/prettier" ]; then
  "$PRETTIER_DIR/node_modules/.bin/prettier" --write "$FILE_PATH" 2>/dev/null
elif command -v prettier >/dev/null 2>&1; then
  prettier --write "$FILE_PATH" 2>/dev/null
fi

exit 0
```

**Key patterns:**

1. **Read stdin as JSON** -- `INPUT=$(cat)` captures the tool input
2. **Extract file path** -- `jq -r '.tool_input.file_path'` gets what was edited
3. **Filter by extension** -- only process `.ts`/`.tsx` files
4. **Profile support** -- skip on `fast` profile for speed
5. **Always exit 0** -- format-on-save should never block an edit

Make it executable:

```bash
chmod +x .claude/scripts/hooks/format-on-save.sh
```

## Step 2: Create the Lint-Check Hook

Create `.claude/scripts/hooks/lint-check.sh`:

```bash
#!/bin/bash
# lint-check.sh -- PostToolUse hook for Edit/Write
# Runs ESLint on edited .ts/.tsx files and warns on issues
# Profile: standard, strict (skip on fast)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Determine subproject
if [[ "$FILE_PATH" == *"frontend/"* ]]; then
  LINT_DIR="$PROJECT_DIR/frontend"
elif [[ "$FILE_PATH" == *"admin/"* ]]; then
  LINT_DIR="$PROJECT_DIR/admin"
else
  LINT_DIR="$PROJECT_DIR"
fi

# Run ESLint if available
ESLINT="$LINT_DIR/node_modules/.bin/eslint"
if [ ! -x "$ESLINT" ]; then
  exit 0
fi

# Run lint on the specific file (not the whole project)
RESULT=$("$ESLINT" "$FILE_PATH" --no-error-on-unmatched-pattern 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  # Count errors vs warnings
  ERROR_COUNT=$(echo "$RESULT" | grep -c " error " || true)
  WARN_COUNT=$(echo "$RESULT" | grep -c " warning " || true)

  if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "ESLint: $ERROR_COUNT error(s), $WARN_COUNT warning(s) in $(basename "$FILE_PATH")" >&2
    echo "$RESULT" | grep -E "error|warning" | head -5 >&2
  elif [ "$WARN_COUNT" -gt 0 ]; then
    echo "ESLint: $WARN_COUNT warning(s) in $(basename "$FILE_PATH")" >&2
  fi
fi

# Always exit 0 -- lint issues are warnings, not blockers
exit 0
```

**Key pattern: warn but don't block.** Lint issues go to stderr (Claude sees them as warnings) but exit code 0 means the edit is not blocked. If you want to block edits that introduce lint errors, change to `exit 2` on errors.

## Step 3: Wire Both Hooks in settings.json

Edit `.claude/settings.json` to register both hooks:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/format-on-save.sh"
          },
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/lint-check.sh"
          }
        ]
      }
    ]
  }
}
```

**Wiring explained:**

| Field | Value | Meaning |
|-------|-------|---------|
| `PostToolUse` | Event name | Fires after a tool completes |
| `matcher` | `"Edit\|Write"` | Only fires for Edit and Write tools (pipe = OR) |
| `hooks` | Array | Hooks run in order -- format first, then lint |
| `type` | `"command"` | Runs a shell command (vs `"prompt"` for LLM-based hooks) |
| `$CLAUDE_PROJECT_DIR` | Built-in variable | Resolves to project root |

## Step 4: See the Pipeline in Action

When Claude edits a TypeScript file, this happens:

```
1. Claude runs: Edit tool on src/components/Button.tsx
2. PostToolUse fires (matcher: Edit matches)
3. Hook 1: format-on-save.sh
   - Reads stdin JSON: {"tool_input": {"file_path": "src/components/Button.tsx", ...}}
   - Detects .tsx extension
   - Runs: prettier --write src/components/Button.tsx
   - File is now formatted
   - Exit 0 (success, silent)
4. Hook 2: lint-check.sh
   - Reads same stdin JSON
   - Detects .tsx extension
   - Runs: eslint src/components/Button.tsx
   - Finds 1 warning: 'unused variable'
   - Outputs to stderr: "ESLint: 1 warning(s) in Button.tsx"
   - Exit 0 (warning shown to Claude, not blocking)
5. Claude sees: formatted file + "ESLint: 1 warning(s) in Button.tsx"
```

## Step 5: Add Hook Profile Support

Hook profiles let users control which hooks run based on their workflow:

| Profile | Use Case | Hooks Active |
|---------|----------|--------------|
| `fast` | Quick fixes, small changes | Minimal -- only blockers |
| `standard` | Normal development | Format + lint + typecheck |
| `strict` | Pre-commit, code review | Everything including `go vet` |

Set the profile via environment variable:

```bash
export CLAUDE_HOOK_PROFILE=strict
```

The hooks already check this at the top:

```bash
PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0  # Skip this hook in fast mode
fi
```

### Adding a Strict-Only Hook

For hooks that should only run in strict mode (e.g., full typecheck):

```bash
#!/bin/bash
# typecheck-strict.sh -- only runs in strict profile

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" != "strict" ]; then
  exit 0
fi

# ... expensive typecheck logic here
```

## Complete Pipeline Summary

Here's what a full pipeline looks like with multiple hook types:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/block-dangerous-git.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/format-on-save.sh"
          },
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/lint-check.sh"
          },
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/console-log-warning.sh"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/inject-git-context.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Before finishing, verify all changed files compile and pass lint. Report any issues.",
            "model": "haiku"
          }
        ]
      }
    ]
  }
}
```

### Hook Event Reference

| Event | When it fires | Common uses |
|-------|---------------|-------------|
| `PreToolUse` | Before a tool runs | Block dangerous commands, validate inputs |
| `PostToolUse` | After a tool completes | Format code, run linters, type-check |
| `UserPromptSubmit` | When user sends a message | Inject git context, suggest agents |
| `PreCompact` | Before context compaction | Save state to disk |
| `SessionStart` | When a new session begins | Restore saved state |
| `Stop` | Before Claude Code exits | Final validation, cleanup |

## Key Takeaways

1. **Hooks are shell scripts** that receive tool input as JSON on stdin
2. **Exit codes matter**: 0 = pass, 2 = block, other = warn
3. **stderr = messages to Claude** -- use `echo "..." >&2` to communicate
4. **Hooks run in order** -- format before lint (so lint checks formatted code)
5. **Profile system** -- `CLAUDE_HOOK_PROFILE` controls which hooks are active
6. **`$CLAUDE_PROJECT_DIR`** -- always use this for paths in settings.json
7. **Filter by extension early** -- exit 0 immediately for irrelevant files
8. **Never block on warnings** -- exit 0 for format/lint, exit 2 only for security blockers

## Next Steps

- Add a `typecheck-on-edit` hook that runs `tsc --noEmit` with hash caching
- Add a `migration-safety` hook that validates SQL migration file naming
- Create a `bundle-import-check` hook that warns when new npm packages are imported
- Add a `Stop` hook that verifies all changed files compile before ending the session
