---
name: writing-commands
description: How to write Codex user-invocable workflow skills — orchestrator pattern, argument parsing, tool mapping, and dispatch guidance
user-invocable: false
---

# Writing Codex User-Invocable Skills

Codex does not use slash-command files. A command-like workflow is a skill in `.codex/skills/<skill-name>/SKILL.md` with `user-invocable: true`.

## Skill File Format

```yaml
---
name: workflow-name
description: One-line trigger description for this workflow
user-invocable: true
---
```

Put argument parsing and workflow phases in the body. Do not include Claude-only tool allow-list metadata.

## The Orchestrator Pattern

Most powerful user-invocable skills coordinate phases:

```text
Phase 1: Understand  -> read docs, inspect files, find patterns
Phase 2: Plan        -> output a structured checklist and call update_plan
Phase 3: Execute     -> edit files with apply_patch
Phase 4: Verify      -> run build/typecheck commands with exec_command
Phase 5: Test        -> run or add tests
Phase 6: Review      -> optionally use spawn_agent for independent reviewers
Phase 7: Document    -> update affected docs
Phase 8: Report      -> summarize files changed and verification
```

Not every workflow needs all phases. Simple workflows such as lint or test may have 2-3 phases.

## Dispatching Subagents

Use `spawn_agent` only when the user has authorized subagents or parallel agent work. Good subagent prompts are self-contained:

```text
Review the TypeScript changes listed below.
Context: <diff/stat/intent>
Files: <filtered list>
Return only findings in the standard severity/confidence format.
```

Use `wait_agent` only when the next step depends on the result. Keep local critical-path work moving while independent agents run.

## Auto-Detection Pattern

For multi-stack projects, detect stack markers with `rg --files`:

```text
go.mod exists?                    -> Go project
package.json + tsconfig.json      -> TypeScript project
pyproject.toml / requirements.txt -> Python project
Cargo.toml exists?                -> Rust project
```

Use existing project commands from `AGENTS.md`, `package.json`, `Makefile`, or CI before inventing new commands.

## Input Parsing

Parse the user's text naturally:

```markdown
## Mode Selection

- Empty target -> default behavior
- Known keyword -> specific mode
- Branch name -> use as diff base
- PR#NNN or number -> fetch PR context if GitHub tooling is available
```

## Example: Minimal Test Workflow Skill

```markdown
---
name: test-runner
description: Auto-detect and run the project's test command
user-invocable: true
---

# Test Runner

## Auto-detect and run

1. Check `AGENTS.md` for the canonical test command.
2. If unavailable, inspect project files:
   - `go.mod` -> `go test ./...`
   - `package.json` -> package manager test script
   - `pyproject.toml` -> `pytest` or configured test runner
   - `Cargo.toml` -> `cargo test`
3. Run the selected command with `exec_command`.
4. Report failures with the exact command and relevant error lines.
```

## Tips

- Keep workflows focused on one primary purpose.
- Use `update_plan` for multi-step work.
- Prefer `rg` for search and `apply_patch` for manual edits.
- Include exact verification commands in the final report.
