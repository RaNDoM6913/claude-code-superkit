---
name: writing-commands
description: How to write Claude Code slash commands — orchestrator pattern, agent dispatch, auto-detection
user-invocable: false
---

# Writing Claude Code Commands

## Command File Format

Commands are `.md` files in `.claude/commands/`. Frontmatter:

```yaml
---
description: One-line description (shown in /help)
argument-hint: <what-user-types>
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Agent
---
```

- `$ARGUMENTS` — replaced with user input after the command name
- `allowed-tools` — limit what the command can do (security principle of least privilege)

## The Orchestrator Pattern

Most powerful commands are **orchestrators** — they coordinate multiple agents through phases:

```
Phase 1: Understand  → read codebase, find patterns
Phase 2: Plan        → output structured checklist
Phase 3: Execute     → create/modify files
Phase 4: Verify      → dispatch health-checker agent
Phase 5: Test        → dispatch test-generator agent
Phase 6: Review      → dispatch reviewer agents (parallel)
Phase 7: Document    → dispatch docs-checker agent
Phase 8: Report      → summary table
```

Not every command needs all 8 phases. Simple commands (lint, test) may have 2-3 phases.

## Dispatching Agents from Commands

Use the `Agent` tool to dispatch agents. Key patterns:

**Parallel dispatch** (independent agents):
```
Dispatch ALL triggered agents simultaneously using parallel Agent calls:
- go-reviewer (if .go files changed)
- ts-reviewer (if .ts/.tsx files changed)
- security-scanner (always)
```

**Sequential dispatch** (dependent results):
```
1. First dispatch health-checker → get results
2. If health check passes → dispatch test-generator
3. If tests pass → dispatch reviewer agents
```

## Auto-Detection Pattern

For multi-stack projects, detect the stack from project files:

```
Auto-detection:
  go.mod exists?          → Go project
  package.json + tsconfig → TypeScript project
  pyproject.toml          → Python project
  Cargo.toml              → Rust project
```

This allows commands to work in any project without hardcoded paths.

## Input Parsing

Parse `$ARGUMENTS` to support multiple modes:

```markdown
## Mode Selection

Parse `$ARGUMENTS`:
- If empty → default behavior
- If matches known keyword → specific mode
- If matches branch name → use as base
- If matches PR#NNN → fetch PR diff
```

## Example: Minimal Command

```markdown
---
description: Run project linters
argument-hint: "[--fix]"
allowed-tools: Bash, Glob
---

# Lint

$ARGUMENTS

## Auto-detect and run

1. Check for `go.mod` → run `gofmt -l . && go vet ./...`
2. Check for `tsconfig.json` → run `npx tsc --noEmit && npx eslint .`
3. If `$ARGUMENTS` contains `--fix` → add auto-fix flags

## Report

List files with issues. If clean: "All files pass linting."
```

## Tips

- Always include `$ARGUMENTS` in the document so user input is accessible
- Reference agents by their exact name (matches `.claude/agents/` filename without .md)
- Keep commands focused — one primary purpose per command
- For complex workflows, break into phases with clear names
