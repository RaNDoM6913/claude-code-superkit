---
name: writing-agents
description: How to write Claude Code agents — standard format, 3-phase review, severity/confidence, dispatch patterns
user-invocable: false
---

# Writing Claude Code Agents

## Agent File Format

Agents are `.md` files in `.claude/agents/`. Frontmatter:

```yaml
---
name: agent-name
description: One-line description (used for dispatch matching)
model: sonnet|opus|haiku
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---
```

- **model**: `opus` for all agents -- maximum reasoning depth and accuracy. Sonnet/haiku available but not recommended.
- **allowed-tools**: minimal set needed. Review agents: `Read, Grep, Glob, Bash`. Generator agents add `Edit, Write`.

## Standard 3-Phase Review Process

### Phase 0: Load Project Context (required for all agents)
Read `CLAUDE.md`/`AGENTS.md` + relevant `docs/architecture/` files before starting.
This makes the agent context-aware for the specific project.
Violations of DOCUMENTED conventions get higher confidence (HIGH instead of MEDIUM).

### Phase 1: Checklist (quick scan)
Now informed by project docs — flag violations of documented conventions as higher confidence.

### Phase 2: Deep Analysis (think step by step)
Use project context to assess cross-component impact.

## Severity / Confidence System

### Severity
- **CRITICAL** — Data loss, security vulnerability, crash. Example: SQL injection, auth bypass.
- **WARNING** — Incorrect behavior under conditions. Example: missing error wrap, N+1 query.
- **SUGGESTION** — Style, readability. Won't break if ignored.

### Confidence
- **HIGH (90%+)** — Concrete bug visible in code.
- **MEDIUM (60-90%)** — Looks wrong based on patterns, might be missing context.
- **LOW (<60%)** — A hunch. Flagging for human review.

### Output Format
```
[SEVERITY/CONFIDENCE] file:line — description
  Evidence: <what I see>
  Fix: <suggested change>
```

**IMPORTANT: Do NOT inflate severity to seem thorough.** A review with 0 CRITICAL and 2 SUGGESTIONS is valid. If the code is clean, say so.

## Dispatch Priority

If a **stack-specific reviewer** exists (e.g., `go-reviewer` for `*.go`), it is dispatched **instead of** `code-reviewer` for matching files. `code-reviewer` handles files not covered by any stack reviewer.

## Checklist Design Tips

- Each item should have a **grep pattern** or **file path** to check
- Order by severity (critical checks first)
- Include both positive checks (X must be present) and negative (Y must NOT be present)
- 8-15 items is the sweet spot. More than 20 → split into two agents.

## Example: Minimal Agent

```markdown
---
name: dockerfile-reviewer
description: Review Dockerfiles for security and best practices
model: opus
allowed-tools: Read, Grep, Glob
---

# Dockerfile Reviewer

## Phase 1: Checklist
1. **Root user** — Grep for `USER` directive. Must not run as root.
2. **Latest tag** — Grep for `:latest`. Use specific version tags.
3. **Multi-stage** — Check for multi-stage build (reduce image size).
4. **COPY vs ADD** — Prefer COPY over ADD (no auto-extract).
5. **Health check** — HEALTHCHECK directive present?

## Phase 2: Deep Analysis
[standard questions]

## Output Format
[standard severity/confidence format]
```
