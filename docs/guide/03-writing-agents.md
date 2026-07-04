# Chapter 3: Writing Agents

Agents are specialized AI workers that run in their own sub-conversation. They are dispatched by commands, by other agents, or manually by the user.

## Standard Agent Format

Agent files are Markdown with YAML frontmatter. Place them in `.claude/agents/`.

```yaml
---
name: agent-name
description: One-line description (used for dispatch matching)
model: opus
allowed-tools: Read, Grep, Glob, Bash
---
```

**Frontmatter fields:**

| Field | Values | Guidance |
|-------|--------|----------|
| `name` | kebab-case identifier | Matches the filename without `.md` |
| `description` | One line | Commands use this to decide which agent to dispatch |
| `model` | `opus` | `opus` for every agent -- the kit is opus-only; never sonnet or haiku. |
| `allowed-tools` | Comma-separated | Review agents: `Read, Grep, Glob, Bash`. Generator agents add: `Edit, Write`. |

## The Body Skeleton

Every kit agent lays out its body in the same order, top to bottom. The shape is load-bearing -- weaker models drop constraints buried mid-file, so the strong rules go first:

1. **Role** -- one or two sentences: what this agent reviews or creates.
2. **Hard Rules** -- up to 7 MUST/NEVER bullets, right at the top.
3. **Phase 0 -- Load Project Context** -- read the project's own docs before judging it.
4. **Process** -- numbered phases with linear integers (no 1.5); each states a goal, its tool-level actions, and a done-when.
5. **Output Contract** -- an exact fenced template plus one filled mini example (covered below).
6. **Recap** -- three to five bullets restating the hard rules, as the very last section.

### Phase 0: Load Project Context

The body proper opens with a context load. It grounds the agent in the project's own conventions, so it can escalate documented-rule violations from MEDIUM to HIGH confidence:

```markdown
## Phase 0 -- Load Project Context
Read if present, skip silently if absent: `CLAUDE.md` or `AGENTS.md`; relevant `docs/architecture/*.md`.
Use it to: learn the conventions this agent enforces. Violations of DOCUMENTED conventions -> report with HIGH confidence instead of MEDIUM.
```

### The Process: checklist, then deep analysis

The Process phases are where a reviewer does its work. Two moves cover most agents -- a fast checklist pass, then a slower reasoning pass.

**Checklist (quick scan)** -- a numbered list of concrete checks. Each item names a ripgrep-safe pattern or a file path to inspect, and violations are reported immediately without extended analysis:

```markdown
## Process
1. **Checklist** -- evaluate every item below against each changed file:
   - **SQL injection** -- Grep `fmt.Sprintf.*SELECT`. Parameterized queries only.
   - **Error swallowing** -- Grep `_ = err` or empty catch blocks.
   - **Auth coverage** -- Every `/v1/` route has auth middleware.
```

Aim for 8--15 checklist items. More than 20 means you should split into two agents.

**Deep analysis** -- after the checklist, the agent reasons about the higher-level concerns a checklist can't encode, then reports only the conclusions:

```markdown
2. **Deep analysis** -- reason about intent, failure modes, edge cases the checklist missed, and cross-component effects. Report conclusions only.
```

## Severity Levels

Define these in every review agent so findings are consistently categorized:

| Level | Definition | Example |
|-------|-----------|---------|
| **CRITICAL** | Data loss, security vulnerability, or crash | SQL injection, nil pointer on hot path, auth bypass |
| **WARNING** | Incorrect behavior under specific conditions | Missing error wrap, N+1 query, resource leak |
| **SUGGESTION** | Style or readability. Won't break if ignored | Variable naming, comment clarity |

## Confidence Levels

| Level | Band | Meaning |
|-------|------|---------|
| **HIGH** | ≥80 | Concrete bug visible in the code. Would bet money on it. |
| **MEDIUM** | 60--79 | Looks wrong based on patterns; mark "needs verification". |
| **LOW** | <60 | A hunch -- route to Open Questions, never silently dropped. |

LOW findings are never thrown away. They go into an **Open Questions** section of the report, where a human can weigh in. Listing them there -- rather than dropping them or inflating them into the main findings -- is the entire point of the band.

## The Output Contract

End every agent with an exact, fenced Output Contract -- then fill in one real mini example beneath it. Placeholders like "[standard format]" or "report in your usual format" are banned: a weaker model needs to see the concrete shape, not a promise of one.

Every finding follows this structure:

```
[SEVERITY/CONFIDENCE] file:line -- description
  Evidence: <what I see in the code>
  Fix: <suggested change>
```

Findings that clear neither HIGH nor MEDIUM go under Open Questions instead of the main list:

```
### Open Questions
- file:line -- what you suspect + what context would confirm it (or "none")
```

The Dockerfile example below shows a complete contract with both sections and a filled mini example.

## Evidence Gate and Done-gate

Two gates keep agents honest, and which one you include depends on whether the agent reviews or generates.

**Reviewers carry the Evidence Gate.** It forces every finding to rest on something the agent actually read this session, not on memory or a hunch dressed up as fact:

```markdown
## Evidence Gate
Report a finding ONLY if all four hold:
1. **Citation** -- exact `file:line` you Read in this session, never from memory.
2. **Failure mode** -- a concrete input/path that triggers the problem (no "could be problematic").
3. **Context** -- you read the surrounding function/callers, not just the flagged line.
4. **Severity** you can defend to a skeptic.
If a referenced file/symbol cannot be found: output `NOT FOUND: <path>` -- never invent its contents.
A clean review (0 findings) is a valid result -- do not manufacture findings.
```

**Generators carry a Done-gate.** An agent that writes files or code must prove the work exists before it claims completion:

```markdown
## Done ONLY when
- [ ] Every promised artifact exists on disk -- verified with Read/ls, not from memory.
- [ ] [compile/test command] ran; paste its real output in the report.
- [ ] Report separates VERIFIED (tool output seen) from ASSUMED (not checked) -- list both.
Not all boxes checked -> say what is missing; do not claim completion.
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
description: Review Dockerfiles for security, image size, and best practices -- dispatch when Dockerfile or docker-compose files change
model: opus
allowed-tools: Read, Grep, Glob
---

# Dockerfile Reviewer

Reviews Dockerfiles and docker-compose files for security and image hygiene, producing evidence-gated findings.

## Hard Rules
1. Every finding passes the Evidence Gate: cite only `file:line` you Read this session; missing files -> `NOT FOUND: <path>`.
2. Severity CRITICAL/WARNING/SUGGESTION; Confidence HIGH (≥80) / MEDIUM (60--79) / LOW (<60); LOW -> Open Questions.
3. 0 findings is a valid result -- never manufacture findings.

## Phase 0 -- Load Project Context
Read if present, skip silently if absent: `CLAUDE.md` or `AGENTS.md`; `docs/architecture/deployment.md`.
Use it to: learn base-image, registry, and deploy conventions. Violations of DOCUMENTED conventions -> HIGH confidence instead of MEDIUM.

## Evidence Gate
Report a finding ONLY if all four hold:
1. **Citation** -- exact `file:line` you Read this session, never from memory.
2. **Failure mode** -- a concrete input/path that triggers the problem.
3. **Context** -- you read the surrounding stage/instructions, not just the flagged line.
4. **Severity** you can defend to a skeptic.
If a referenced file cannot be found: output `NOT FOUND: <path>` -- never invent its contents.

## Process

1. **Locate** -- Glob `**/Dockerfile*` and `**/docker-compose*`, Read each hit. Done when: every file Read or reported `NOT FOUND`.
2. **Checklist** -- evaluate all 8 items below against every file:
   1. **Root user** -- Grep `USER`. Must be present and not `USER root`; running as root is a vulnerability.
   2. **Latest tag** -- Grep `:latest` or bare image names without tags. Pin specific versions for reproducible builds.
   3. **Multi-stage build** -- Check for `FROM ... AS`. Multi-stage builds reduce final image size.
   4. **COPY vs ADD** -- Grep `ADD`. Prefer `COPY` unless you need auto-extraction or remote URLs.
   5. **Health check** -- Grep `HEALTHCHECK`. Orchestrators need it to manage restarts.
   6. **Secrets in build** -- Grep `ENV.*PASSWORD|ENV.*SECRET|ENV.*TOKEN|ENV.*KEY`. Never bake secrets in; use runtime env or a secrets manager.
   7. **Layer caching** -- `COPY package*.json` and dependency install come before `COPY . .` to maximize cache hits.
   8. **Exposed ports** -- `EXPOSE` matches the app port; docker-compose does not expose debug ports.
3. **Deep analysis** -- reason about image size, base-image risk, and least privilege. Report conclusions only.
4. **Report** -- emit the Output Contract.

## Output Contract

```
## Dockerfile Review

### Findings
[SEVERITY/CONFIDENCE] file:line -- description
  Evidence: <what the file shows>
  Fix: <concrete change>

### Open Questions
- file:line -- suspicion + what would confirm it (or "none")

### Summary
<N> CRITICAL, <N> WARNING, <N> SUGGESTION -- one-line verdict
```

Mini example:

```
### Findings
[CRITICAL/HIGH] deploy/Dockerfile:14 -- container runs as root
  Evidence: no USER directive after the final FROM stage
  Fix: create a non-root user and add `USER app` before ENTRYPOINT

### Open Questions
- deploy/Dockerfile:3 -- pinned digest may be stale; confirm the base-image update policy

### Summary
1 CRITICAL, 0 WARNING, 0 SUGGESTION -- fix root user before merge.
```

## Recap -- non-negotiables
- Evidence Gate: cite only lines Read this session; `NOT FOUND: <path>` for missing files.
- Canonical enums, exact spelling; LOW -> Open Questions.
- 0 findings is valid -- never inflate.
```

This agent can be dispatched by `/review` when Dockerfiles change, or manually: "Run the dockerfile-reviewer agent on this project."
