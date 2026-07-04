# Tutorial: Building an Agent from Scratch

This tutorial walks you through creating a **dockerfile-reviewer** agent -- a specialized code reviewer that checks Dockerfiles against 10 security and best-practice rules.

## What You'll Build

An agent that:
- Reads Dockerfiles in your project
- Runs a 10-item checklist (security + best practices)
- Gates every finding behind an Evidence Gate, routing low-confidence hunches to Open Questions
- Reports findings with canonical severity and confidence ratings
- Follows the standard 2-phase review process

## Step 1: Create the Agent File

Agents live in `.claude/agents/` as Markdown files with YAML frontmatter.

Create `.claude/agents/dockerfile-reviewer.md`:

```markdown
---
name: dockerfile-reviewer
description: Review Dockerfiles for security, performance, and best practices
model: opus
allowed-tools: Read, Grep, Glob, Bash
---
```

**Frontmatter explained:**

| Field | Value | Why |
|-------|-------|-----|
| `name` | `dockerfile-reviewer` | Used for dispatch matching when calling the agent |
| `description` | One-line summary | Shown in agent listings, used by orchestrators to decide when to dispatch |
| `model` | `opus` | Maximum reasoning depth for all tasks |
| `allowed-tools` | `Read, Grep, Glob, Bash` | Minimal toolset. Review agents don't need `Edit` or `Write` |

## Step 2: Write the Checklist

The checklist is the core of any review agent. Each item should have:
- A **concrete grep pattern** or file path to check
- A clear **pass/fail criterion**
- The expected **severity** if violated

Add this after the frontmatter. Before the checklist itself, every kit reviewer opens its body with a **Hard Rules** block -- the non-negotiables, kept at the very top so a weaker model can't lose them mid-file:

```markdown
# Dockerfile Reviewer

Review Dockerfiles for security vulnerabilities, performance issues, and best practices.

## Hard Rules
1. Every finding passes the Evidence Gate: cite only `Dockerfile:line` you Read this session; missing files -> `NOT FOUND: <path>`.
2. Severity CRITICAL/WARNING/SUGGESTION; Confidence HIGH (>=80) / MEDIUM (60-79) / LOW (<60); LOW -> Open Questions.
3. 0 findings is a valid result -- never manufacture findings.

## Review Process

### Phase 1: Checklist (quick scan)

Run through all 10 checks below. Report violations immediately.

### Phase 2: Deep Analysis

After the checklist:
1. What is the intent of this Dockerfile?
2. What are the possible failure modes in production?
3. Are there edge cases the checklist didn't cover?
4. Could this image be smaller or more secure?

## Checklist

### 1. FROM Base Image Version (WARNING)
Grep for `FROM.*:latest` or `FROM` without a version tag.
Every FROM instruction must pin a specific version (e.g., `golang:1.23-alpine`, not `golang:latest`).
Unpinned versions cause non-reproducible builds.

### 2. USER Non-Root (CRITICAL)
Grep for `USER` directive. If absent, the container runs as root.
Must have `USER nonroot` or equivalent before the final CMD/ENTRYPOINT.
Exception: multi-stage builds where only the final stage matters.

### 3. COPY vs ADD (WARNING)
Grep for `ADD` instructions. Prefer `COPY` unless you specifically need:
- Auto-extraction of tar archives
- Fetching from URLs (better: use `curl` + `COPY`)
`ADD` has implicit behavior that can introduce security risks.

### 4. Multi-Stage Build (WARNING)
Check if the Dockerfile uses multi-stage builds (multiple `FROM` instructions).
Single-stage builds that include build tools (compilers, dev deps) in the final image
are bloated and increase attack surface.

### 5. .dockerignore Exists (WARNING)
Check for `.dockerignore` in the same directory as the Dockerfile.
Missing `.dockerignore` means `COPY . .` sends everything to the daemon --
including `.git/`, `node_modules/`, `.env` files, and secrets.

### 6. HEALTHCHECK Present (SUGGESTION)
Grep for `HEALTHCHECK` instruction. Without it, Docker and orchestrators
cannot detect if the application inside the container is actually healthy.
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:8080/healthz || exit 1
```

### 7. Minimize Layers (SUGGESTION)
Count `RUN` instructions. More than 5-7 separate RUN commands suggest
they should be combined with `&&` to reduce image layers.
Each layer adds size and complexity.

### 8. Pin Package Versions (WARNING)
Grep for `apt-get install`, `apk add`, `pip install`, `npm install` without version pins.
Unpinned packages break reproducibility:
- BAD: `apt-get install -y curl`
- GOOD: `apt-get install -y curl=7.88.1-10+deb12u5`
- ACCEPTABLE: `apk add --no-cache curl~7.88` (minor pin)

### 9. No Secrets in Build Args (CRITICAL)
Grep for `ARG.*PASSWORD|ARG.*SECRET|ARG.*TOKEN|ARG.*KEY`.
Build args are visible in `docker history`. Use runtime env vars or
Docker secrets instead. Also check for `ENV` with secret-like names.

### 10. EXPOSE Documentation (SUGGESTION)
Check that `EXPOSE` instructions match the ports the application actually listens on.
Missing EXPOSE doesn't prevent the port from working, but it serves as
documentation for operators and orchestration tools.
```

## Step 3: Add the Evidence Gate and Output Contract

A review agent is only as trustworthy as its findings, so the body closes with the blocks that keep them honest. First the **Evidence Gate** -- what a finding must satisfy before it may be reported -- and the canonical severity/confidence legend. Add this at the end:

```markdown
## Evidence Gate
Report a finding ONLY if all four hold:
1. **Citation** -- exact `Dockerfile:line` you Read in this session, never from memory.
2. **Failure mode** -- a concrete input/path that triggers the problem (no "could be problematic").
3. **Context** -- you read the surrounding instructions/stages, not just the flagged line.
4. **Severity** you can defend to a skeptic.
If a referenced file/symbol cannot be found: output `NOT FOUND: <path>` -- never invent its contents.
A clean review (0 findings) is a valid result -- do not manufacture findings.

## Severity and Confidence
### Severity
- **CRITICAL** -- data loss, security vulnerability, or crash. Example: secret exposure, container escape.
- **WARNING** -- incorrect behavior under specific conditions, or perf degradation. Example: unpinned base image, running as root.
- **SUGGESTION** -- style or readability. Safe to ignore.

### Confidence
- **HIGH (>=80)** -- the issue is visible in the Dockerfile.
- **MEDIUM (60-79)** -- pattern-based; mark "needs verification".
- **LOW (<60)** -- route to Open Questions, never silently dropped.
```

Then the **Output Contract**: an exact template plus one filled example, so a weaker model can never fall back on "report in the usual format". In the agent file this lives under an `## Output Contract` heading:

```
### Findings
[SEVERITY/CONFIDENCE] Dockerfile:line -- one-line description
  Evidence: <what the file shows>
  Fix: <concrete change>

### Deep Analysis
<2-3 sentences: the Dockerfile's intent, its production failure modes, image size / attack surface>

### Open Questions
- Dockerfile:line -- LOW-confidence or ambiguous suspicion + what would confirm it (or "none")

### Summary
<N> CRITICAL, <N> WARNING, <N> SUGGESTION -- <one-line verdict>
```

A filled mini example leaves no ambiguity about the shape:

```
### Findings
[CRITICAL/HIGH] Dockerfile:1 -- base image uses :latest tag
  Evidence: `FROM node:latest` -- no pinned version
  Fix: pin a specific version, e.g. `FROM node:20.11-alpine`

### Deep Analysis
Single-stage Node build that ships node-gyp and python3 in the final image. Chief risks: non-reproducible builds from unpinned versions and an image ~8x larger than a multi-stage alpine equivalent.

### Open Questions
- Dockerfile:12 -- five separate RUN layers may be intentional for cache granularity; confirm the build-cache strategy before flagging.

### Summary
1 CRITICAL, 0 WARNING, 0 SUGGESTION -- fix the floating base tag before merge.
```

Finally, close the agent file with the anti-inflation note and a **Recap** that restates the non-negotiables as the last section:

```markdown
IMPORTANT: Do NOT inflate severity to seem thorough. A review with 0 CRITICAL
findings and 2 SUGGESTIONS is perfectly valid. If the Dockerfile is clean, say so.

## Recap -- non-negotiables
- Evidence Gate: cite only `Dockerfile:line` Read this session; `NOT FOUND: <path>` for missing files.
- Canonical enums, exact spelling; LOW -> Open Questions.
- 0 findings is valid -- never inflate severity.
```

## Step 4: Test It

Now test your agent. In Claude Code, use the Agent tool to dispatch it:

```
Review the Dockerfiles in this project using the dockerfile-reviewer agent.
```

Or from an orchestrator command, dispatch it explicitly when Dockerfiles are in the changeset:

```markdown
If changed files include `Dockerfile` or `*.dockerfile`:
  Dispatch **dockerfile-reviewer** agent with the changed Dockerfile content.
```

## Step 5: Sample Output

Here's what the agent produces when reviewing a real Dockerfile. Notice how the sections mirror the Output Contract, and how the one finding it can't pin to a line drops into Open Questions instead of the findings list:

```
### Findings

[CRITICAL/HIGH] Dockerfile:1 -- base image uses :latest tag
  Evidence: `FROM node:latest`
  Fix: pin to a specific version: `FROM node:20.11-alpine`

[CRITICAL/HIGH] Dockerfile:24 -- no USER directive, container runs as root
  Evidence: no `USER` instruction found in the entire Dockerfile
  Fix: add `RUN addgroup -S app && adduser -S app -G app` then `USER app` before CMD

[WARNING/HIGH] Dockerfile:8 -- ADD used instead of COPY
  Evidence: `ADD package*.json ./`
  Fix: replace with `COPY package*.json ./` -- no archive extraction needed here

[SUGGESTION/HIGH] Dockerfile:5,8,12,15,18 -- 5 separate RUN instructions
  Evidence: each apt-get/npm command is its own RUN layer
  Fix: combine with && and \ line continuations to reduce layers

### Deep Analysis

This Dockerfile builds a Node.js application in a single stage, including
all build dependencies (node-gyp, python3) in the final image. The main
risks are: (1) running as root in production, (2) non-reproducible builds
from unpinned versions, and (3) an unnecessarily large image (~1.2GB vs
~150MB with multi-stage + alpine).

### Open Questions

- Dockerfile (build context) -- no `.dockerignore` found; if the build uses `COPY . .` this could ship `.git/` and `.env`. No single line to cite, so it stays here until the build context is confirmed.

### Summary

2 CRITICAL, 1 WARNING, 1 SUGGESTION -- fix root user and the floating base tag before merge.
```

## Key Takeaways

1. **Frontmatter is minimal** -- name, description, model, allowed-tools
2. **Hard Rules ride at the top** -- the non-negotiables, where a weaker model can't lose them
3. **Checklist items need grep patterns** -- concrete, not vague
4. **2-phase review** -- quick scan first, then deep analysis
5. **Evidence Gate** -- every finding cites a `Dockerfile:line` Read this session; un-citable hunches route to Open Questions
6. **Canonical severity/confidence** -- CRITICAL/WARNING/SUGGESTION and HIGH (>=80) / MEDIUM (60-79) / LOW (<60); LOW never dropped
7. **Exact Output Contract** -- a filled template, never "report in the usual format"
8. **Minimal tool access** -- review agents only need Read/Grep/Glob/Bash
9. **The "clean code" rule** -- explicitly state that finding nothing wrong is valid output

## Next Steps

- Add this agent to your `/review` orchestrator command's dispatch table
- Create a PostToolUse hook that warns when Dockerfiles are edited without review
- Build a `/docker-audit` command that dispatches this agent + a dependency-checker agent in parallel
