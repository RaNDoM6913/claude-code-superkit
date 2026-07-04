---
name: writing-agents
description: How to write Claude Code agents — playbook skeleton, canonical severity/confidence enums, Evidence Gate, Output Contract, dispatch patterns
tokens: 2453
user-invocable: false
---

# Writing Claude Code Agents

Meta-skill: the standard every kit agent follows. Agents are `.md` files in `.claude/agents/` — YAML frontmatter + markdown body. Reference implementations of this standard: `critic.md` and `code-reviewer.md` in the same directory.

## Use when / Do not use

- **Use when:** authoring a new agent, rewriting an existing one, or checking an agent file for kit compliance.
- **Do not use for:** commands, hooks, rules, or skills — those have different formats.

## Hard Rules

1. `model: opus` — the kit is opus-only. NEVER emit sonnet or haiku.
2. Canonical enums, exact spelling — Severity: CRITICAL / WARNING / SUGGESTION. Confidence: HIGH (≥80) / MEDIUM (60–79) / LOW (<60). LOW items route to Open Questions, never silently dropped.
3. Every reviewer agent carries the Evidence Gate; every generator agent carries a "Done ONLY when" gate.
4. Every agent ends with an exact fenced Output Contract plus one filled mini example — never "[standard format]", "[standard questions]", or "report in your usual format".
5. Reference /dev phases by NAME ("the /dev Review phase", "the /dev Critic phase"), never by bare number.
6. Grep patterns must be ripgrep-safe: literal text, alternation `a|b`, character classes — no lookaheads or lookbehinds.

## Frontmatter

```yaml
---
name: agent-name
description: One line — what it reviews/creates AND when to dispatch it
model: opus
allowed-tools: Read, Grep, Glob, Bash
---
```

- `description` — single line; dispatch matches on it, so include the trigger condition (e.g., "Review Dockerfiles for security — dispatch when Dockerfile or docker-compose files change").
- `allowed-tools` — minimal set. Reviewers: `Read, Grep, Glob, Bash`. Generators add `Edit, Write`.
- `tokens: N` — transparency signal, not a budget. Do not hand-count; regenerate with `node bin/inject-tokens.js` after editing.

## Body Skeleton (every agent, this order)

1. **Role** — 1–2 sentences.
2. **Hard Rules** — ≤7 MUST/NEVER bullets at the TOP (weaker models lose constraints buried mid-file).
3. **Phase 0 — Load Project Context** — kit convention, template below.
4. **Process** — numbered phases, linear integers only (no 1.5/2.1); each phase: goal → tool-level actions → done-when.
5. **Domain checklists / decision tables** — the expertise; keep depth, cut prose.
6. **Output Contract** — exact fenced template + one filled mini example.
7. **Recap** — 3–5 bullets restating the hard rules, as the last section.

Precision rules: a list labeled "N-point" contains exactly N items; every decision fork lists all branches plus an explicit default — no "use judgment" or "as appropriate".

### Phase 0 template

```markdown
## Phase 0 — Load Project Context
Read if present, skip silently if absent: `CLAUDE.md` or `AGENTS.md`; relevant `docs/architecture/*.md`.
Use it to: [one line — what this agent extracts]. Violations of DOCUMENTED conventions → report with HIGH confidence instead of MEDIUM.
```

## Authoring Workflow

1. Define the role in one sentence and the dispatch condition — both go into `description`.
2. Write frontmatter: `model: opus`, minimal `allowed-tools`.
3. Write the body top-down in skeleton order: Hard Rules → Phase 0 → Process → checklists.
4. Write the Output Contract and fill the mini example with realistic content — zero bracketed placeholders.
5. Add the Evidence Gate (reviewer) or Done-gate (generator), then the Recap.
6. Run `node bin/inject-tokens.js` to refresh `tokens:`.

Done when: sections appear in skeleton order and `rg -n "standard format|usual format|standard questions"` on the file returns nothing.

## Severity / Confidence (canonical)

**Severity**
- **CRITICAL** — data loss, security vulnerability, crash. Example: SQL injection, auth bypass.
- **WARNING** — incorrect behavior under specific conditions. Example: missing error wrap, N+1 query.
- **SUGGESTION** — style, readability. Safe to ignore.

**Confidence**
- **HIGH (≥80)** — bug visible in the code.
- **MEDIUM (60–79)** — pattern-based; mark "needs verification".
- **LOW (<60)** — route to Open Questions, never silently drop.

Finding format:

```
[SEVERITY/CONFIDENCE] file:line — one-line description
  Evidence: <what the code shows>
  Fix: <concrete change>
```

**Do NOT inflate severity to seem thorough.** A review with 0 CRITICAL and 2 SUGGESTIONS is valid. If the code is clean, say so.

## Evidence Gate (copy into every reviewer)

```markdown
## Evidence Gate
Report a finding ONLY if all four hold:
1. **Citation** — exact `file:line` you Read in this session, never from memory.
2. **Failure mode** — a concrete input/path that triggers the problem (no "could be problematic").
3. **Context** — you read the surrounding function/callers, not just the flagged line.
4. **Severity** you can defend to a skeptic.
If a referenced file/symbol cannot be found: output `NOT FOUND: <path>` — never invent its contents.
A clean review (0 findings) is a valid result — do not manufacture findings.
```

## Done-gate (copy into every generator)

```markdown
## Done ONLY when
- [ ] Every promised artifact exists on disk — verified with Read/ls, not from memory.
- [ ] [compile/test command] ran; paste its real output in the report.
- [ ] Report separates VERIFIED (tool output seen) from ASSUMED (not checked) — list both.
Not all boxes checked → say what is missing; do not claim completion.
```

Multi-phase reviewers may also end with a "Done ONLY when" checklist of per-phase completion criteria — the pattern `critic.md` and `code-reviewer.md` use.

## Dispatch Priority

If a **stack-specific reviewer** exists (e.g., `go-reviewer` for `*.go`), it is dispatched **instead of** `code-reviewer` for matching files. `code-reviewer` covers files no specialist claims.

## Checklist Design Tips

- Each item names a concrete probe: a ripgrep-safe grep pattern or a file path to check.
- Order by severity — critical checks first.
- Include both positive checks (X must be present) and negative checks (Y must NOT be present).
- 8–15 items is the sweet spot. More than 20 → split into two agents.

## Example: Complete Minimal Agent

Every section filled — this is the template to copy, not a sketch:

````markdown
---
name: dockerfile-reviewer
description: Review Dockerfiles for security and image hygiene — dispatch when Dockerfile or docker-compose files change
model: opus
allowed-tools: Read, Grep, Glob
---

# Dockerfile Reviewer

Reviews Dockerfiles for security and build hygiene, producing evidence-gated findings.

## Hard Rules
1. Every finding passes the Evidence Gate: cite only `file:line` you Read this session; missing files → `NOT FOUND: <path>`.
2. Severity CRITICAL/WARNING/SUGGESTION; Confidence HIGH (≥80) / MEDIUM (60–79) / LOW (<60); LOW → Open Questions.
3. 0 findings is a valid result — never manufacture findings.

## Phase 0 — Load Project Context
Read if present, skip silently if absent: `CLAUDE.md` or `AGENTS.md`; `docs/architecture/deployment.md`.
Use it to: learn base-image, registry, and deploy conventions. Violations of DOCUMENTED conventions → HIGH confidence instead of MEDIUM.

## Evidence Gate
Report a finding ONLY if all four hold:
1. **Citation** — exact `file:line` you Read in this session, never from memory.
2. **Failure mode** — a concrete input/path that triggers the problem (no "could be problematic").
3. **Context** — you read the surrounding function/callers, not just the flagged line.
4. **Severity** you can defend to a skeptic.
If a referenced file/symbol cannot be found: output `NOT FOUND: <path>` — never invent its contents.
A clean review (0 findings) is a valid result — do not manufacture findings.

## Process
1. **Locate** — Glob `**/Dockerfile*`, Read each hit. Done when: every file Read or reported `NOT FOUND`.
2. **Checklist** — evaluate all 5 items below against every file. Done when: 5 items × files evaluated.
3. **Report** — emit the Output Contract.

## Checklist (5 items)
1. **Root user** — grep `USER`; missing, or `USER root` as the last USER directive → CRITICAL.
2. **Floating tag** — grep `:latest`; pin a specific version → WARNING.
3. **Multi-stage** — count `FROM` lines; single-stage build shipping compilers in the final image → WARNING.
4. **COPY vs ADD** — grep `ADD`; prefer COPY unless extracting an archive → SUGGESTION.
5. **Health check** — grep `HEALTHCHECK`; absent for a long-running service → SUGGESTION.

## Output Contract

```
## Dockerfile Review

### Findings
[SEVERITY/CONFIDENCE] file:line — one-line description
  Evidence: <what the file shows>
  Fix: <concrete change>

### Open Questions
- file:line — suspicion + what would confirm it (or "none")

### Summary
<N> CRITICAL, <N> WARNING, <N> SUGGESTION — <one-line verdict>
```

Mini example:

```
### Findings
[CRITICAL/HIGH] deploy/Dockerfile:14 — container runs as root
  Evidence: no USER directive after the final FROM stage
  Fix: create a non-root user and add `USER app` before ENTRYPOINT

### Open Questions
- deploy/Dockerfile:3 — pinned digest may be stale; confirm the base-image update policy

### Summary
1 CRITICAL, 0 WARNING, 0 SUGGESTION — fix root user before merge.
```

## Recap — non-negotiables
- Evidence Gate: cite only lines Read this session; `NOT FOUND: <path>` for missing files.
- Canonical enums, exact spelling; LOW → Open Questions.
- 0 findings is valid — never inflate.
````

## Recap — non-negotiables

- `model: opus` only — never sonnet or haiku.
- Severity CRITICAL/WARNING/SUGGESTION; Confidence HIGH ≥80 / MEDIUM 60–79 / LOW <60; LOW → Open Questions.
- Reviewers carry the Evidence Gate; generators carry the Done-gate.
- Output Contract is a fenced template with a filled mini example — placeholders like "[standard format]" are banned.
- /dev phases by NAME; greps ripgrep-safe; `tokens:` via `node bin/inject-tokens.js`.
