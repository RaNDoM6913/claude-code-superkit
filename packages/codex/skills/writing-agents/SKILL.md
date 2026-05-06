---
name: writing-agents
description: How to write Codex reviewer skills — SKILL.md format, review process, severity/confidence, spawn_agent dispatch patterns
user-invocable: false
---

# Writing Codex Reviewer Skills

## Skill File Format

Reviewer skills live in `.codex/skills/<skill-name>/SKILL.md`. Frontmatter:

```yaml
---
name: skill-name
description: One-line trigger description for Codex skill matching
user-invocable: false
---
```

- Keep frontmatter minimal: `name`, `description`, and `user-invocable`.
- Do not include Claude-only fields such as per-agent model routing or allowed tool lists.
- Codex uses the project-level `.codex/config.toml` model and reasoning effort.

## Codex Tool Mapping

- Search file names with `rg --files`; search contents with `rg`.
- Run shell checks with `exec_command`.
- Edit files with `apply_patch` unless a formatter or mechanical bulk rewrite is more appropriate.
- Track multi-step work with `update_plan`.
- Dispatch independent reviewer work with `spawn_agent` only when the user has authorized parallel agent work; collect required results with `wait_agent`.

## Standard 2-Phase Review Process

All review skills should follow this pattern:

### Phase 1: Checklist
Run through numbered checks. Report concrete violations immediately. Each item should point to a file path, `rg` pattern, command, or explicit code invariant.

### Phase 2: Deep Analysis
After the checklist:
1. What is the intent of this change?
2. What failure modes are plausible?
3. Are there edge cases the checklist did not cover?
4. Does this change affect other components?

State evidence before findings. If the code is clean, say so and call out residual test gaps.

## Severity / Confidence System

### Severity
- **CRITICAL** — Data loss, security vulnerability, crash. Example: SQL injection, auth bypass.
- **WARNING** — Incorrect behavior under conditions. Example: missing error wrap, N+1 query.
- **SUGGESTION** — Style, readability. Won't break if ignored.

### Confidence
- **HIGH (90%+)** — Concrete bug visible in code.
- **MEDIUM (60-90%)** — Looks wrong based on patterns, might be missing context.
- **LOW (<60%)** — A hunch. Flag for human review.

### Output Format
```text
[SEVERITY/CONFIDENCE] file:line — description
  Evidence: <what I see>
  Fix: <suggested change>
```

Do not inflate severity to seem thorough. A review with no findings is valid.

## Dispatch Priority

If a stack-specific reviewer exists, use it instead of a generic reviewer for matching files. `code-reviewer` handles files not covered by a stack reviewer.

## Checklist Design Tips

- Each item should have a concrete `rg` pattern, command, or file path.
- Order by severity.
- Include positive checks and negative checks.
- Keep checklists around 8-15 items. Split larger surfaces into multiple skills.

## Example: Minimal Codex Reviewer Skill

```markdown
---
name: dockerfile-reviewer
description: Review Dockerfiles for security and build hygiene
user-invocable: false
---

# Dockerfile Reviewer

## Phase 1: Checklist
1. **Root user** — Use `rg '^USER ' Dockerfile*`; images must not run as root.
2. **Latest tag** — Use `rg ':latest' Dockerfile*`; pin base image versions.
3. **Multi-stage** — Check for multiple `FROM` lines where build tooling is needed.
4. **COPY vs ADD** — Prefer `COPY` unless archive extraction or remote URLs are intentional.
5. **Health check** — Verify `HEALTHCHECK` exists for long-running services.

## Phase 2: Deep Analysis
Apply the standard deep analysis questions.

## Output Format
Use the standard severity/confidence format.
```
