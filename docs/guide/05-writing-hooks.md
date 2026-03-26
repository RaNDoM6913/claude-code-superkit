# Chapter 5: Writing Hooks

Hooks are shell scripts that run automatically at specific lifecycle events. They can block dangerous actions, validate edits, inject context, or save state -- without the user doing anything.

## Hook Lifecycle Events

| Event | When it fires | Use cases |
|-------|--------------|-----------|
| **PreToolUse** | Before a tool executes | Block dangerous commands, validate arguments |
| **PostToolUse** | After a tool executes | Run linters, type-checkers, warn on patterns |
| **UserPromptSubmit** | When the user sends a message | Inject git context, suggest agents |
| **PreCompact** | Before context window compaction | Save state that would be lost |
| **SessionStart** | When a new session begins | Restore saved state from previous session |
| **Stop** | When Claude is about to finish | Final verification (prompt-based, not shell) |

## Shell Hook Protocol

Shell hooks (all events except Stop) follow this contract:

1. **Input**: JSON on stdin describing the tool call
2. **Parsing**: use `jq` to extract fields
3. **Exit codes**: `0` = pass (allow), `2` = block (prevent the action)
4. **Warnings**: write to stderr (shown to Claude as warnings, does not block)
5. **Context injection**: write JSON to stdout for UserPromptSubmit hooks

### Minimal hook template

```bash
#!/bin/bash
# my-hook.sh -- PostToolUse hook for Edit/Write

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Skip irrelevant files
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Your check here
if some_condition; then
  echo "WARNING: description of the issue" >&2
fi

exit 0
```

### Blocking a tool call (PreToolUse)

Return exit code 2 with a message on stderr:

```bash
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force'; then
  echo "BLOCKED: Force push is not allowed." >&2
  exit 2
fi
```

Claude sees the block message and must find an alternative approach.

### Smart file-to-doc mapping (doc-check-on-commit)

The `doc-check-on-commit.sh` hook demonstrates an advanced PreToolUse pattern: it intercepts `git commit` commands, analyzes all staged files, and maps each code file to its required documentation. For example:

- `*/migrations/*.sql` → requires database schema docs
- `*/handlers/*.go` or `*/routes*.go` → requires API reference or OpenAPI spec
- `*/src/**/*.ts(x)` → requires frontend architecture docs
- New files (diff filter A) → requires project tree docs
- `.claude/` changes → prints a non-blocking sync advisory

If any required doc is missing from the staged files, the hook exits with code 2 (BLOCK). This is more precise than a simple "any code needs any doc" check -- it tells Claude exactly which documentation files are missing.

## Prompt-Based Hooks (Stop Event)

The Stop event uses a different mechanism -- it sends a prompt to a lightweight model (haiku) that returns a JSON decision:

```json
{
  "type": "prompt",
  "prompt": "Verify all changed files compile. Respond with {\"decision\": \"allow\"} or {\"decision\": \"block\", \"reason\": \"...\"}.",
  "model": "haiku",
  "timeout": 30,
  "statusMessage": "Verifying session changes..."
}
```

This runs as the last check before Claude finishes its response.

## Hook Profiles

Hooks check the `CLAUDE_HOOK_PROFILE` environment variable to decide whether to run:

```bash
PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0  # Skip this hook in fast mode
fi
```

| Profile | What runs | When to use |
|---------|-----------|-------------|
| `fast` | Only git safety + console.log warning | Quick edits, exploration |
| `standard` | All core hooks + stack formatters | Normal development (default) |
| `strict` | Everything + go vet / cargo check on every edit + Stop verification | Pre-release, critical code |

Set it: `export CLAUDE_HOOK_PROFILE=strict`

## Performance: SHA256 Hash Caching

Type-checking and linting on every edit can be slow. The hash caching pattern skips the check if the file has not changed since the last successful run:

```bash
CACHE_DIR="$HOME/.cache/claude-typecheck"
mkdir -p "$CACHE_DIR" 2>/dev/null

HASH=$(shasum -a 256 "$FILE_PATH" 2>/dev/null | cut -d' ' -f1)
CACHE_KEY="$CACHE_DIR/$(echo "$FILE_PATH" | tr '/' '_').hash"

# Skip if unchanged since last successful check
if [ -n "$HASH" ] && [ -f "$CACHE_KEY" ] && [ "$(cat "$CACHE_KEY" 2>/dev/null)" = "$HASH" ]; then
  exit 0
fi

# Run the check...
RESULT=$(npx tsc --noEmit 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "$HASH" > "$CACHE_KEY"  # Cache successful hash
else
  echo "TypeScript errors:" >&2
  echo "$RESULT" | head -20 >&2
  rm -f "$CACHE_KEY"  # Invalidate cache on failure
fi
```

## settings.json Wiring

Register hooks in `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/my-hook.sh" }
        ]
      }
    ]
  }
}
```

- **matcher** -- regex against the tool name. `"Bash"` matches Bash. `"Edit|Write"` matches either. Empty string or omitted matches all tools.
- Multiple hooks in the same array run sequentially for the same event.

## Full Example: lint-on-save Hook

Create `.claude/scripts/hooks/lint-on-save.sh`:

```bash
#!/bin/bash
# lint-on-save.sh -- PostToolUse hook for Edit/Write
# Runs the appropriate linter after file edits.
# Profile: standard, strict (skip on fast)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Go files: gofmt
if [[ "$FILE_PATH" =~ \.go$ ]]; then
  gofmt -w "$FILE_PATH" 2>/dev/null
  exit 0
fi

# Python files: ruff (if available)
if [[ "$FILE_PATH" =~ \.py$ ]]; then
  if command -v ruff &>/dev/null; then
    RESULT=$(ruff check "$FILE_PATH" 2>&1)
    if [ $? -ne 0 ]; then
      echo "Ruff issues in $FILE_PATH:" >&2
      echo "$RESULT" | head -10 >&2
    fi
  fi
  exit 0
fi

# TypeScript files: eslint (if available)
if [[ "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  if command -v npx &>/dev/null; then
    RESULT=$(npx eslint "$FILE_PATH" --no-warn-ignored 2>&1)
    if [ $? -ne 0 ]; then
      echo "ESLint issues in $FILE_PATH:" >&2
      echo "$RESULT" | head -10 >&2
    fi
  fi
  exit 0
fi

exit 0
```

Then wire it in `settings.json`:

```json
{
  "matcher": "Edit|Write",
  "hooks": [
    { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/lint-on-save.sh" }
  ]
}
```

Make it executable: `chmod +x .claude/scripts/hooks/lint-on-save.sh`
