---
name: writing-hooks
description: How to write Claude Code hooks — lifecycle events, exit codes, profiles, jq/node parsing, settings.json wiring, and testing.
tokens: 2640
user-invocable: false
---

# Writing Claude Code Hooks

Hooks are shell scripts Claude Code runs at lifecycle events (before/after a tool, on session start, before compaction, on stop). They observe tool calls and can block a dangerous one. This reference covers the file format, exit codes, per-event stdin JSON, the profile system, parsing, `settings.json` wiring, and testing.

## Use when

- Writing or editing a hook under `.claude/scripts/hooks/`.
- Wiring a hook into `.claude/settings.json`.
- Debugging why a hook blocks, warns, or gets skipped.

## Do not use when

- Authoring agents or slash commands → use the writing-agents / writing-commands skills.
- The task is application code, not lifecycle automation.

## Hard Rules

- Default to `exit 0`. Use `exit 2` only when you are certain the action must be blocked — a hook must never crash Claude Code.
- On any unexpected error, fail open (`exit 0`); a broken hook must not stop the user's work.
- Do NOT use `set -e` — one failing command must not abort the whole hook.
- Keep every hook under ~1-2 seconds; guard external calls with the `timeout` command; never block on the network.
- Always quote paths (`"$FILE_PATH"`); confirm a file exists before reading it.
- `timeout:` in `settings.json` is in SECONDS, not milliseconds.
- Hooks observe and warn — they do not modify files.

## Hook File Anatomy

Hooks are `.sh` files in `.claude/scripts/hooks/`.

```bash
#!/bin/bash
# hook-name.sh — [Event] hook
# Description of what this hook does
# Profile: [always|fast|standard|strict]   # see Profile System

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
| `2` | **BLOCK** | Tool call is rejected; stderr message shown to Claude |
| Other | Error | Hook failure logged, tool call proceeds (fail-open) |

## Lifecycle Events

### PreToolUse

Fires **before** a tool executes. Can block the tool call.

```json
{ "tool_name": "Bash", "tool_input": { "command": "git push --force" } }
```

Settings wiring:

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

Matcher values: `Bash`, `Edit`, `Write`, `Read`, `Glob`, `Grep`, or combinations with `|` (e.g. `Edit|Write`).

### PostToolUse

Fires **after** a tool executes. Cannot block (the tool already ran). Use for warnings and tracking. Output to stderr is shown as a warning to Claude:

```bash
echo "WARNING: console.log detected in production code" >&2
```

### PreCompact

Fires before context compaction. Save important state here. Input: `{ "trigger": "manual" | "auto" }`. Stdout is NOT injected — persist data with file writes.

### SessionStart

Fires when a new Claude Code session begins. Stdout IS injected into Claude's initial context — use it to restore state.

```bash
echo "<previous-session-context>"
echo "Last session was working on: feature X"
echo "</previous-session-context>"
```

### Stop

Fires when Claude is about to end a response. Use the `prompt` type for LLM-based verification. `timeout` is in SECONDS (the kit's `settings.json` uses `60`):

```json
{
  "type": "prompt",
  "prompt": "Verify compilation is clean and docs are updated.",
  "model": "opus",
  "timeout": 60
}
```

## Profile System

Users trade thoroughness for speed with the `CLAUDE_HOOK_PROFILE` env var, which takes one of three runtime values: `fast`, `standard` (default), `strict`. Each hook declares the tier at which it runs in its header `# Profile:` line — one of **four** labels:

| Label | fast | standard | strict | Use for |
|-------|------|----------|--------|---------|
| `always` | runs | runs | runs | safety that must never be skipped (block `.env` commit, dangerous git) — carries no profile guard |
| `fast` | runs | runs | runs | critical safety kept in the minimal fast set |
| `standard` | skip | runs | runs | default core hooks (the common case) |
| `strict` | skip | skip | runs | extra or expensive validation, pre-release only |

`always` differs from `fast` only in intent: an `always` hook has no profile guard at all, so it keeps running even if the fast set is later trimmed.

Implementing profile support:

```bash
#!/bin/bash
PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"

# 'standard' hook: skip in fast mode
[ "$PROFILE" = "fast" ] && exit 0

# extra checks only in strict mode
if [ "$PROFILE" = "strict" ]; then
  : # additional validation...
fi
```

## Input Parsing Patterns

With jq (preferred):

```bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
```

With node (jq fallback):

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

File extension filter:

```bash
case "$FILE_PATH" in
  *.go) ;;          # Go file — proceed
  *.ts|*.tsx) ;;    # TypeScript file — proceed
  *) exit 0 ;;      # not relevant — skip
esac
```

## Registering a Hook

Hooks are registered in `.claude/settings.json`. `timeout` is in **SECONDS**:

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

Recommended `timeout` values (seconds):

- PreToolUse: 5-10
- PostToolUse: 5-15
- PreCompact: 10-30
- SessionStart: 10-30
- Stop (prompt): 60 (matches the kit's `settings.json`)

## Advanced: JSON on stdout

This kit uses the exit-code + stderr protocol above. Claude Code also accepts a JSON object on a hook's stdout for finer control:

- `{"decision": "block", "reason": "..."}` / `{"decision": "allow"}` — how the `Stop` prompt hook gates the end of a response (see the kit's `settings.json` Stop hook).
- `{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}` — inject text into context from `SessionStart` or `UserPromptSubmit` (equivalent to plain stdout injection for those two events).

Prefer exit codes + stderr unless you specifically need to return a structured decision or inject context.

## Best Practices

DO:

- **Fail open** — unexpected errors should `exit 0`, not block work.
- **Be fast** — hooks run on every matching tool call; keep them under 1-2 seconds.
- **Use stderr for warnings** — `echo "WARNING: ..." >&2`.
- **Check the profile first** — skip unnecessary work in fast mode.
- **Quote paths** — always `"$FILE_PATH"` to handle spaces.
- **Set timeouts** — wrap external calls in the `timeout` command.
- **Be specific** — check file extensions before running expensive analysis.

DON'T:

- **Don't block on the network** — hooks must work offline.
- **Don't modify files** — hooks observe and warn, they don't change code.
- **Don't produce false positives** — every warning must be actionable.
- **Don't use `set -e`** — one failing command shouldn't crash the hook.
- **Don't read large files** — use `head` or grep patterns instead.
- **Don't rely on stdout to block in PreToolUse** — in this kit's exit-code protocol, only the exit code and stderr affect a PreToolUse call (the JSON-on-stdout decision protocol above is not used by this kit's hooks).

## Naming Convention

Use descriptive kebab-case. Lead with the action verb when the hook blocks or mutates state; otherwise name by target + concern. Keep the event or trigger recognizable.

```
block-dangerous-git.sh     — PreToolUse: blocks dangerous git commands
console-log-warning.sh     — PostToolUse: warns on console.log
migration-safety.sh        — PostToolUse: validates migration files
pre-compact-save.sh        — PreCompact: saves context before compaction
session-context-restore.sh — SessionStart: restores previous context
```

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

[ -z "$FILE_PATH" ] && exit 0
[ ! -f "$FILE_PATH" ] && exit 0

# Only check source files
case "$FILE_PATH" in
  *.go|*.ts|*.tsx|*.py|*.rs) ;;
  *) exit 0 ;;
esac

# Find TODOs, then drop the ones that carry a real ticket like TODO(PROJ-123).
MATCHES=$(grep -nE 'TODO' "$FILE_PATH" 2>/dev/null | grep -vE 'TODO\([A-Z]+-[0-9]+\)' | head -3)
if [ -n "$MATCHES" ]; then
  echo "WARNING: TODO(s) without ticket reference in $FILE_PATH:" >&2
  echo "$MATCHES" >&2
  echo "  Expected form: TODO(PROJ-123) description" >&2
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

# Block if .env files are staged
if git diff --cached --name-only 2>/dev/null | grep -q '\.env'; then
  echo "BLOCKED: .env file is staged for commit. Remove with: git reset HEAD .env" >&2
  exit 2
fi

exit 0
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

## Recap — non-negotiables

- Default `exit 0`; `exit 2` only to block with certainty; fail open on errors; no `set -e`.
- Keep hooks under ~1-2s, quote paths, and never block on the network.
- `timeout:` in `settings.json` is in SECONDS.
- Profile labels are `always` / `fast` / `standard` / `strict`; the runtime `CLAUDE_HOOK_PROFILE` is `fast` / `standard` / `strict`.
- Hooks observe and warn — they never modify files.
