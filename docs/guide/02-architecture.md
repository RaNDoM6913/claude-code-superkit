# Chapter 2: Architecture

## Five Component Types

Everything in claude-code-superkit is one of five types:

| Type | Location | Loaded when | Purpose |
|------|----------|-------------|---------|
| **Agents** | `.claude/agents/*.md` | Dispatched by commands or manually | Specialized AI workers (reviewers, scanners, generators) |
| **Commands** | `.claude/commands/*.md` | User types `/command-name` | Orchestrators that coordinate agents and tools |
| **Hooks** | `.claude/scripts/hooks/*.sh` | Automatically on tool events | Shell scripts that guard, validate, or inject context |
| **Rules** | `.claude/rules/*.md` | Every conversation (always loaded) | Short advisory instructions baked into Claude's context |
| **Skills** | `.claude/skills/*/SKILL.md` | On demand or auto-activated | Knowledge documents with optional dynamic content |

## How a Request Flows

```
User prompt
    |
    v
[SessionStart hooks] -----> session-context-restore.sh (load prior state)
    |
    v
[UserPromptSubmit hooks] -> user-prompt-context.sh (inject git context)
    |
    v
Claude reads prompt + rules + CLAUDE.md
    |
    v
User typed /command?
    |--- yes --> Command .md loaded as instructions
    |              |
    |              v
    |           Command dispatches Agent(s)
    |              |
    |              v
    |           Agents run in sub-conversations (parallel or sequential)
    |              |
    |              v
    |           Results collected back into command
    |
    |--- no ---> Claude processes directly
    |
    v
Claude calls tools (Bash, Edit, Write, Read, ...)
    |
    v
[PreToolUse hooks] -------> block-dangerous-git.sh (guard before execution)
    |
    v
Tool executes
    |
    v
[PostToolUse hooks] ------> console-log-warning.sh, typecheck-on-edit.sh, etc.
    |
    v
Claude continues or finishes
    |
    v
[Stop hooks] -------------> Prompt-based verification (compile + docs check)
```

## Directory Layout

```
.claude/
  agents/
    code-reviewer.md          # Generic reviewer (fallback)
    go-reviewer.md            # Go-specific reviewer (stack agent)
    ts-reviewer.md            # TypeScript-specific reviewer
    security-scanner.md       # Cross-cutting security audit
    migration-reviewer.md     # SQL migration checks
    test-generator.md         # Generates tests for new code
    ...                       # 24 core + 4 stack agents
  commands/
    dev.md                    # 12-phase development orchestrator
    review.md                 # Unified review: detect -> dispatch -> report
    audit.md                  # Parallel audit: up to 4 agents
    test.md                   # Auto-detect and run tests
    lint.md                   # Auto-detect and run linters
    commit.md                 # Conventional commit with secret scan
    migrate.md                # Run database migrations
    new-migration.md          # Scaffold new migration files
  scripts/hooks/
    block-dangerous-git.sh    # PreToolUse: blocks --no-verify, --force, etc.
    console-log-warning.sh    # PostToolUse: warns on console.log in TS
    typecheck-on-edit.sh      # PostToolUse: tsc --noEmit after TS edits
    format-on-edit.sh         # PostToolUse: gofmt after Go edits
    migration-safety.sh       # PostToolUse: validates migration naming
    user-prompt-context.sh    # UserPromptSubmit: injects git state
    pre-compact-save.sh       # PreCompact: saves context before compaction
    session-context-restore.sh # SessionStart: restores saved context
    bundle-import-check.sh    # PostToolUse: warns on missing deps
  rules/
    coding-style.md           # Formatting, naming, search-first
    security.md               # SQL safety, XSS, secrets, auth
    git-workflow.md           # Conventional commits, no force push
  skills/
    project-architecture/     # Template for your architecture reference
    writing-agents/           # Guide for creating custom agents
    writing-commands/         # Guide for creating custom commands
  settings.json               # Hook wiring configuration
```

## settings.json: How Hooks Are Wired

Hooks are registered in `.claude/settings.json` under the `hooks` key. Each lifecycle event has an array of hook groups with matchers:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/block-dangerous-git.sh" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/console-log-warning.sh" },
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/typecheck-on-edit.sh" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "prompt", "prompt": "Verify all changes...", "model": "haiku", "timeout": 30 }
        ]
      }
    ]
  }
}
```

- **matcher** -- regex pattern matching tool names. `"Bash"` matches only Bash calls. `"Edit|Write"` matches either. Empty string matches all.
- **type: "command"** -- runs a shell script. Receives JSON on stdin.
- **type: "prompt"** -- sends a prompt to a model for a decision (used by Stop hooks).
- `$CLAUDE_PROJECT_DIR` -- replaced at runtime with the project root.

## Decision Tree: When to Use What

```
Need to enforce something automatically?
  |
  |-- Yes, block dangerous actions ---------> Hook (PreToolUse, exit 2)
  |-- Yes, warn on bad patterns ------------> Hook (PostToolUse, stderr)
  |-- Yes, inject context every time -------> Hook (UserPromptSubmit)
  |
  `-- No, it's advisory?
        |
        |-- Short, universal instruction ----> Rule (.md in rules/, <50 lines)
        |-- Reference data / architecture ---> Skill (SKILL.md, loaded on demand)
        |
        `-- Needs AI reasoning?
              |
              |-- Standalone review/scan ----> Agent (dispatched manually or by command)
              `-- Multi-step workflow --------> Command (orchestrates agents + tools)
```
