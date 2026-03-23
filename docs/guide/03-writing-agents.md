# Chapter 3: Writing Agents

Agents are specialized AI workers that run in their own sub-conversation. They are dispatched by commands, by other agents, or manually by the user.

## Standard Agent Format

Agent files are Markdown with YAML frontmatter. Place them in `.claude/agents/`.

```yaml
---
name: agent-name
description: One-line description (used for dispatch matching)
model: sonnet
allowed-tools: Read, Grep, Glob, Bash
---
```

**Frontmatter fields:**

| Field | Values | Guidance |
|-------|--------|----------|
| `name` | kebab-case identifier | Matches the filename without `.md` |
| `description` | One line | Commands use this to decide which agent to dispatch |
| `model` | `sonnet`, `opus`, `haiku` | `sonnet` for review/audit (fast, cheap). `opus` for code generation (high quality). `haiku` for lightweight checks. |
| `allowed-tools` | Comma-separated | Review agents: `Read, Grep, Glob, Bash`. Generator agents add: `Edit, Write`. |

## 2-Phase Review Process

All review agents follow the same two-phase structure.

### Phase 1: Checklist (quick scan)

A numbered list of concrete checks. Each item has a grep pattern or file path to inspect. Report violations immediately without extended analysis.

```markdown
## Phase 1: Checklist
1. **SQL injection** -- Grep for `fmt.Sprintf.*SELECT`. Parameterized queries only.
2. **Error swallowing** -- Grep for `_ = err` or empty catch blocks.
3. **Auth coverage** -- Every `/v1/` route has auth middleware.
```

Aim for 8--15 checklist items. More than 20 means you should split into two agents.

### Phase 2: Deep Analysis (think step by step)

After the checklist, the agent reasons about higher-level concerns:

```markdown
## Phase 2: Deep Analysis
1. What is the intent of this change?
2. What are the possible failure modes?
3. Are there edge cases the checklist didn't cover?
4. Does this change affect other components?

Show your reasoning before stating findings.
```

## Severity Levels

Define these in every review agent so findings are consistently categorized:

| Level | Definition | Example |
|-------|-----------|---------|
| **CRITICAL** | Data loss, security vulnerability, or crash | SQL injection, nil pointer on hot path, auth bypass |
| **WARNING** | Incorrect behavior under specific conditions | Missing error wrap, N+1 query, resource leak |
| **SUGGESTION** | Style or readability. Won't break if ignored | Variable naming, comment clarity |

## Confidence Levels

| Level | Threshold | Meaning |
|-------|-----------|---------|
| **HIGH** | 90%+ | Concrete bug visible in code. Would bet money on it. |
| **MEDIUM** | 60--90% | Looks wrong based on patterns, might be missing context. |
| **LOW** | <60% | A hunch. Flagging for human review. |

## Output Format

Every finding follows this structure:

```
[SEVERITY/CONFIDENCE] file:line -- description
  Evidence: <what I see in the code>
  Fix: <suggested change>
```

## Anti-Inflation Rule

Include this line in every review agent -- it prevents the model from generating noise:

```markdown
IMPORTANT: Do NOT inflate severity to seem thorough. A review with 0 CRITICAL
findings and 2 SUGGESTIONS is perfectly valid. If the code is clean, say so.
```

## Dispatch Priority

When multiple agents could handle the same files, stack-specific reviewers take precedence:

```
*.go files  --> go-reviewer (NOT code-reviewer)
*.ts files  --> ts-reviewer (NOT code-reviewer)
*.py files  --> py-reviewer (NOT code-reviewer)
*.rs files  --> rs-reviewer (NOT code-reviewer)
other files --> code-reviewer (fallback)
```

The `/review` command enforces this -- it dispatches each agent at most once, even if multiple files match.

## Full Example: Dockerfile Reviewer

Create `.claude/agents/dockerfile-reviewer.md`:

```markdown
---
name: dockerfile-reviewer
description: Review Dockerfiles for security, image size, and best practices
model: sonnet
allowed-tools: Read, Grep, Glob
---

# Dockerfile Reviewer

You review Dockerfiles and docker-compose files for security and efficiency.

## Phase 1: Checklist

1. **Root user** -- Check for `USER` directive. Running as root is a vulnerability.
   Grep: `USER` in Dockerfile. Must be present and not `USER root`.
2. **Latest tag** -- Grep for `:latest` or bare image names without tags.
   Use specific version tags for reproducible builds.
3. **Multi-stage build** -- Check for `FROM ... AS` patterns.
   Multi-stage builds reduce final image size.
4. **COPY vs ADD** -- Grep for `ADD`. Prefer `COPY` unless you need
   auto-extraction or remote URLs.
5. **Health check** -- Grep for `HEALTHCHECK`. Container orchestrators
   need health checks to manage restarts.
6. **Secrets in build** -- Grep for `ENV.*PASSWORD|ENV.*SECRET|ENV.*TOKEN|ENV.*KEY`.
   Never bake secrets into the image. Use runtime env vars or secrets managers.
7. **Layer caching** -- Check that `COPY package*.json` and dependency install
   come before `COPY . .` to maximize cache hits.
8. **Exposed ports** -- Verify `EXPOSE` matches the actual application port.
   Check docker-compose port mappings are not exposing debug ports.

## Phase 2: Deep Analysis

1. What is the purpose of this container?
2. Could the image size be significantly reduced?
3. Are there security risks from the base image choice?
4. Does the build respect the principle of least privilege?

## Output Format

[SEVERITY/CONFIDENCE] file:line -- description
  Evidence: <what I see>
  Fix: <suggested change>

IMPORTANT: Do NOT inflate severity to seem thorough. A review with 0 CRITICAL
findings and 2 SUGGESTIONS is perfectly valid. If the code is clean, say so.
```

This agent can be dispatched by `/review` when Dockerfiles change, or manually: "Run the dockerfile-reviewer agent on this project."
