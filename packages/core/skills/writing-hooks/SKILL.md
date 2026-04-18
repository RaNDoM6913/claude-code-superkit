---
name: writing-hooks
description: How to write Claude Code hooks — lifecycle events, exit codes, profile system, shell patterns, best practices
tokens: 1844
user-invocable: false
---

# Writing Claude Code Hooks

## Hook File Format

Hooks are `.sh` files in `.claude/scripts/hooks/`. They execute at specific Claude Code lifecycle events.

```bash
#!/bin/bash
# hook-name.sh — [Event] hook
# Description of what this hook does
# Profile: [always|fast|standard|strict]

# Read hook input from stdin (JSON)
INPUT=$(cat)

# Parse fields with jq (if available) or node
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Your validation logic here

exit 0
```

## Exit Codes

| Code | Meaning | Effect |
|------|---------|--------|
| `0` | Allow | Tool call proceeds (or no output for info-only hooks) |
| `2` | **BLOCK** | Tool call is rejected, stderr message shown to Claude |
| Other | Error | Hook failure logged, tool call proceeds (fail-open) |

**IMPORTANT:** Hooks must never crash Claude Code. Use `exit 0` as the default. Only use `exit 2` when you are certain the action should be blocked.

## Lifecycle Events

### PreToolUse

Fires **before** a tool executes. Can block the tool call.

```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "git push --force"
  }
}
```

**Settings wiring:**
```json
{
  "PreToolUse": [{
    "matcher": "Bash",
    "hooks": [{
      "type": "command",
      "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/your-hook.sh"
    }]
  }]
}
```

**Matcher values:** `Bash`, `Edit`, `Write`, `Read`, `Glob`, `Grep`, or combinations with `|` (e.g., `Edit|Write`).

### PostToolUse

Fires **after** a tool executes. Cannot block (tool already ran). Use for warnings and tracking.

**Output to stderr** → shown as a warning to Claude:
```bash
echo "WARNING: console.log detected in production code" >&2
```

### PreCompact

Fires before context compaction. Save important state here.

**Input:** `{ "trigger": "manual" | "auto" }`

**Stdout** is NOT injected — use file writes to persist data.

### SessionStart

Fires when a new Claude Code session begins.

**Stdout IS injected** into Claude's initial context — use this to restore state.

```bash
echo "<previous-session-context>"
echo "Last session was working on: feature X"
echo "</previous-session-context>"
```

### Stop

Fires when Claude is about to end a response. Can use `prompt` type for LLM-based verification.

```json
{
  "type": "prompt",
  "prompt": "Verify compilation is clean and docs are updated.",
  "model": "opus",
  "timeout": 60
}
```

## Profile System

Hooks support 3 profiles for different workflow speeds:

| Profile | Behavior | Use Case |
|---------|----------|----------|
| `fast` | Only critical safety hooks | Quick edits, prototyping |
| `standard` | All core hooks (default) | Normal development |
| `strict` | Everything + extra validation | Pre-release, security-sensitive |

### Implementing Profile Support

```bash
#!/bin/bash
PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"

# Skip in fast mode
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

# Extra checks only in strict mode
if [ "$PROFILE" = "strict" ]; then
  # additional validation...
fi
```

## Input Parsing Patterns

### With jq (preferred)

```bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
```

### With node (jq fallback)

```bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try { console.log(JSON.parse(d).tool_input?.file_path||''); }
    catch { console.log(''); }
  });
")
```

### File Extension Check

```bash
case "$FILE_PATH" in
  *.go) ;; # Go file — proceed with check
  *.ts|*.tsx) ;; # TypeScript file — proceed
  *) exit 0 ;; # Not relevant — skip
esac
```

## Best Practices

### DO

- **Fail open** — unknown errors should `exit 0`, not block work
- **Be fast** — hooks run on every tool call, keep under 1-2 seconds
- **Use stderr for warnings** — `echo "WARNING: ..." >&2`
- **Check profile first** — skip unnecessary work in fast mode
- **Quote paths** — always `"$FILE_PATH"` to handle spaces
- **Set timeouts** — use `timeout` command for external calls
- **Be specific** — check file extensions before running expensive analysis

### DON'T

- **Don't block on network** — hooks must work offline
- **Don't modify files** — hooks observe and warn, they don't change code
- **Don't produce false positives** — every warning should be actionable
- **Don't use `set -e`** — one failing command shouldn't crash the hook
- **Don't read large files** — if checking a file, use `head` or grep patterns
- **Don't output to stdout in PreToolUse** — only stderr matters for blocking

## Hook Registration

Hooks are registered in `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/your-hook.sh",
        "timeout": 10
      }]
    }]
  }
}
```

**timeout** — milliseconds (default varies by event). Set appropriately:
- PreToolUse: 5-10s
- PostToolUse: 5-15s
- PreCompact: 10-30s
- SessionStart: 10-30s

## Example: Minimal PostToolUse Hook

```bash
#!/bin/bash
# todo-check.sh — PostToolUse hook
# Warns when TODO comments are added without ticket references
# Profile: standard

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
[ "$PROFILE" = "fast" ] && exit 0

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Only check source files
case "$FILE_PATH" in
  *.go|*.ts|*.tsx|*.py|*.rs) ;;
  *) exit 0 ;;
esac

[ -z "$FILE_PATH" ] && exit 0
[ ! -f "$FILE_PATH" ] && exit 0

# Check for TODOs without ticket reference
if grep -n 'TODO[^(]' "$FILE_PATH" 2>/dev/null | grep -v 'TODO([A-Z]*-[0-9])' | head -3 | grep -q .; then
  echo "WARNING: TODO without ticket reference found in $FILE_PATH" >&2
  echo "  Format: TODO(PROJ-123) description" >&2
fi

exit 0
```

## Example: Minimal PreToolUse Hook

```bash
#!/bin/bash
# block-env-commit.sh — PreToolUse hook
# Blocks git commits that include .env files
# Profile: always

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Only check git add/commit commands
case "$COMMAND" in
  git\ add*|git\ commit*) ;;
  *) exit 0 ;;
esac

# Check if .env files are staged
if git diff --cached --name-only 2>/dev/null | grep -q '\.env'; then
  echo "BLOCKED: .env file is staged for commit. Remove with: git reset HEAD .env" >&2
  exit 2
fi

exit 0
```

## Naming Convention

```
[action]-[target]-[trigger].sh

Examples:
  block-dangerous-git.sh     — PreToolUse: blocks dangerous git commands
  console-log-warning.sh     — PostToolUse: warns on console.log
  migration-safety.sh        — PostToolUse: validates migration files
  pre-compact-save.sh        — PreCompact: saves context before compaction
  session-context-restore.sh — SessionStart: restores previous context
```

## Testing Hooks

```bash
# Test a PostToolUse hook manually:
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/main.go"}}' | \
  bash .claude/scripts/hooks/your-hook.sh

# Check exit code:
echo $?  # 0 = allow, 2 = block

# Check stderr output:
echo '{"tool_name":"Bash","tool_input":{"command":"git push --force"}}' | \
  bash .claude/scripts/hooks/block-dangerous-git.sh 2>&1
```
