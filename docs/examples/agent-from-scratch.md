# Tutorial: Building an Agent from Scratch

This tutorial walks you through creating a **dockerfile-reviewer** agent -- a specialized code reviewer that checks Dockerfiles against 10 security and best-practice rules.

## What You'll Build

An agent that:
- Reads Dockerfiles in your project
- Runs a 10-item checklist (security + best practices)
- Reports findings with severity and confidence ratings
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

Add this after the frontmatter:

```markdown
# Dockerfile Reviewer

Review Dockerfiles for security vulnerabilities, performance issues, and best practices.

## Review Process

### Phase 1: Checklist (quick scan)

Run through all 10 checks below. Report violations immediately.

### Phase 2: Deep Analysis (think step by step)

After the checklist:
1. What is the intent of this Dockerfile?
2. What are the possible failure modes in production?
3. Are there edge cases the checklist didn't cover?
4. Could this image be smaller or more secure?

## Checklist

### 1. FROM Base Image Version (Critical)
Grep for `FROM.*:latest` or `FROM` without a version tag.
Every FROM instruction must pin a specific version (e.g., `golang:1.23-alpine`, not `golang:latest`).
Unpinned versions cause non-reproducible builds.

### 2. USER Non-Root (Critical)
Grep for `USER` directive. If absent, the container runs as root.
Must have `USER nonroot` or equivalent before the final CMD/ENTRYPOINT.
Exception: multi-stage builds where only the final stage matters.

### 3. COPY vs ADD (High)
Grep for `ADD` instructions. Prefer `COPY` unless you specifically need:
- Auto-extraction of tar archives
- Fetching from URLs (better: use `curl` + `COPY`)
`ADD` has implicit behavior that can introduce security risks.

### 4. Multi-Stage Build (High)
Check if the Dockerfile uses multi-stage builds (multiple `FROM` instructions).
Single-stage builds that include build tools (compilers, dev deps) in the final image
are bloated and increase attack surface.

### 5. .dockerignore Exists (Medium)
Check for `.dockerignore` in the same directory as the Dockerfile.
Missing `.dockerignore` means `COPY . .` sends everything to the daemon --
including `.git/`, `node_modules/`, `.env` files, and secrets.

### 6. HEALTHCHECK Present (Medium)
Grep for `HEALTHCHECK` instruction. Without it, Docker and orchestrators
cannot detect if the application inside the container is actually healthy.
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:8080/healthz || exit 1
```

### 7. Minimize Layers (Medium)
Count `RUN` instructions. More than 5-7 separate RUN commands suggest
they should be combined with `&&` to reduce image layers.
Each layer adds size and complexity.

### 8. Pin Package Versions (Medium)
Grep for `apt-get install`, `apk add`, `pip install`, `npm install` without version pins.
Unpinned packages break reproducibility:
- BAD: `apt-get install -y curl`
- GOOD: `apt-get install -y curl=7.88.1-10+deb12u5`
- ACCEPTABLE: `apk add --no-cache curl~7.88` (minor pin)

### 9. No Secrets in Build Args (Critical)
Grep for `ARG.*PASSWORD|ARG.*SECRET|ARG.*TOKEN|ARG.*KEY`.
Build args are visible in `docker history`. Use runtime env vars or
Docker secrets instead. Also check for `ENV` with secret-like names.

### 10. EXPOSE Documentation (Low)
Check that `EXPOSE` instructions match the ports the application actually listens on.
Missing EXPOSE doesn't prevent the port from working, but it serves as
documentation for operators and orchestration tools.
```

## Step 3: Add the Output Format

Every review agent needs a consistent output format. Add this at the end:

```markdown
## Output Format

For each finding, rate:

### Severity
- **CRITICAL** -- Container escape, secret exposure, or guaranteed production failure.
- **WARNING** -- Degraded security or reliability under specific conditions.
- **SUGGESTION** -- Best practice improvement. Won't break if ignored.

### Confidence
- **HIGH (90%+)** -- I can see the concrete issue in the Dockerfile.
- **MEDIUM (60-90%)** -- Likely an issue based on patterns, but context might justify it.
- **LOW (<60%)** -- A hunch. Flagging for human review.

### Format:
```
[SEVERITY/CONFIDENCE] Dockerfile:line -- description
  Evidence: <what I see>
  Fix: <suggested change>
```

IMPORTANT: Do NOT inflate severity to seem thorough. A review with 0 CRITICAL
findings and 2 SUGGESTIONS is perfectly valid. If the Dockerfile is clean, say so.
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

Here's what the agent produces when reviewing a real Dockerfile:

```
## Phase 1: Checklist

[CRITICAL/HIGH] Dockerfile:1 -- Base image uses :latest tag
  Evidence: `FROM node:latest`
  Fix: Pin to specific version: `FROM node:20.11-alpine`

[CRITICAL/HIGH] Dockerfile:24 -- No USER directive, container runs as root
  Evidence: No `USER` instruction found in the entire Dockerfile
  Fix: Add `RUN addgroup -S app && adduser -S app -G app` then `USER app` before CMD

[WARNING/HIGH] Dockerfile:8 -- ADD used instead of COPY
  Evidence: `ADD package*.json ./`
  Fix: Replace with `COPY package*.json ./` -- no archive extraction needed here

[WARNING/MEDIUM] -- No .dockerignore file found
  Evidence: Checked project root, no .dockerignore present
  Fix: Create .dockerignore with: .git, node_modules, .env*, *.log, dist/

[SUGGESTION/HIGH] Dockerfile:5,8,12,15,18 -- 5 separate RUN instructions
  Evidence: Each apt-get/npm command is its own RUN layer
  Fix: Combine with && and \ line continuations to reduce layers

## Phase 2: Deep Analysis

This Dockerfile builds a Node.js application in a single stage, including
all build dependencies (node-gyp, python3) in the final image. The main
risks are: (1) running as root in production, (2) non-reproducible builds
from unpinned versions, and (3) an unnecessarily large image (~1.2GB vs
~150MB with multi-stage + alpine).

**2 CRITICAL, 2 WARNING, 1 SUGGESTION**
```

## Key Takeaways

1. **Frontmatter is minimal** -- name, description, model, allowed-tools
2. **Checklist items need grep patterns** -- concrete, not vague
3. **2-phase review** -- quick scan first, then deep analysis
4. **Severity/confidence system** -- prevents inflation, builds trust
5. **Minimal tool access** -- review agents only need Read/Grep/Glob/Bash
6. **The "clean code" rule** -- explicitly state that finding nothing wrong is valid output

## Next Steps

- Add this agent to your `/review` orchestrator command's dispatch table
- Create a PostToolUse hook that warns when Dockerfiles are edited without review
- Build a `/docker-audit` command that dispatches this agent + a dependency-checker agent in parallel
