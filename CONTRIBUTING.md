# Contributing to claude-code-superkit

## Adding a New Stack

1. Create a stack agent: `packages/stack-agents/your-stack/your-stack-reviewer.md`
2. Create stack hooks: `packages/stack-hooks/your-stack/your-hook.sh`
3. Update `setup.sh` to include the new stack in selection
4. Submit a PR with examples of what the reviewer catches

## Adding a New Core Agent

1. Follow the format in any existing agent (`packages/core/agents/*.md`)
2. Required sections: frontmatter (name, description, model, allowed-tools), Phase 1 Checklist, Phase 2 Deep Analysis, Output Format
3. Place in `packages/core/agents/` (universal) or `packages/extras/` (specialized)
4. Test by running the agent against a real codebase

## Adding a New Command

1. Follow the format in `packages/core/commands/*.md`
2. Required: frontmatter (description, argument-hint, allowed-tools), $ARGUMENTS usage
3. For orchestrator commands: document which agents get dispatched and when

## Agent Format Reference

```markdown
---
name: agent-name
description: One-line description
model: opus
allowed-tools: Read, Grep, Glob, Bash
---

# Agent Name

## Review Process
### Phase 1: Checklist (quick scan)
### Phase 2: Deep Analysis (think step by step)

## Checklist
1. **Check name** — what to grep/read, what to look for

## Output Format
[SEVERITY/CONFIDENCE] file:line — description
  Evidence: <what I see>
  Fix: <suggested change>
```

## Hook Format Reference

- Shell scripts in `packages/core/hooks/` or `packages/stack-hooks/`
- Read JSON from stdin: `INPUT=$(cat); FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')`
- Exit 0 = pass, Exit 2 = block
- stderr = warning messages shown to Claude
- Check `CLAUDE_HOOK_PROFILE` for profile-aware behavior

## Pull Request Process

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `shellcheck` on any new .sh files
5. Submit a PR with description of what you added and why

## Code of Conduct

Be respectful. Be constructive. Help each other build better tools.
