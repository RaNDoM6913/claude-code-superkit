---
alwaysApply: true
tokens: 1145
---

# Auto Dev Workflow

## Hard Rules

1. Every task that creates or modifies code files MUST follow the /dev orchestration (`packages/core/commands/dev.md`, installed as the `/dev` command) — even when the user never typed `/dev`. This covers features, bug fixes of any size, refactors, migrations, bot changes, and integration work.
2. Do NOT announce "I'm using the /dev workflow" — just follow the phases.
3. NEVER commit with `[wip]` on `main` / `master` / `prod*` branches.
4. `[quick:]` / `[no-dev:]` / `[trivial:]` require a reason of ≥ 15 characters; `[hotfix:]` requires a ticket ID or an explicit `no-ticket: <reason ≥15 chars>`.
5. Override budget: at most 2 override tags per 30 minutes across the whole project. The third is blocked — run /dev instead or wait for the oldest override to age out.
6. The commit gate hard-blocks `git commit` after 3 or more code-file edits in a session unless /dev ran or a valid override tag is present.

## When NOT to use /dev

| Task Type | Action |
|-----------|--------|
| Docs-only update | Direct edit |
| Config / env change | Direct edit |
| Question / explanation | Just answer |
| Typo fix in non-code file | Direct edit |

## Complexity → phases

The /dev Skip Matrix in `packages/core/commands/dev.md` is the single source of truth. Complexity is decided in the /dev Understand phase and never changes mid-run:

| Complexity | Signals | Skipped phases |
|------------|---------|----------------|
| **Simple** | 1 file, < 100 lines, existing pattern | Architect (2), Pseudocode (3), Contract (5), Validate Plan (6), Evaluate (8), Verify Goals (11), Critic (13) |
| **Standard** | 2–5 files | Architect (2), Pseudocode (3), Critic (13) |
| **Complex** | 6+ files, new subsystem, auth/payments/security | none — all 16 phases |

The Review and Document phases run for every complexity class — never skip them; Document is where logic/API/architecture changes get their doc updates.

Consume gate verdicts exactly as produced: plan-checker PASS/REVISE/BLOCK · evaluator PROCEED/ITERATE/ESCALATE · goal-verifier PASS/NEEDS-ATTENTION/NEEDS-REMEDIATION · critic APPROVE/CONCERN/BLOCK.

## Enforcement (hard-block at commit)

Three hooks enforce this rule technically:

| Hook | Event | Behavior |
|------|-------|----------|
| `dev-edit-counter.sh` | `PostToolUse(Edit\|Write)` | Counts code-file edits per session. Tests, docs, memory, `.claude/`, and config files are ignored. |
| `dev-marker-set.sh` | `UserPromptSubmit` + `PreToolUse(Skill)` | Records that /dev was invoked this session (word-boundary match — `/develop`, `/device`, `/devops` do NOT trigger). |
| `dev-required-on-commit.sh` | `PreToolUse(Bash)` | Blocks `git commit` (incl. `git -C <path> commit`) when the edit count is ≥ 3 AND no /dev marker is set AND no override tag is present. |

**Threshold:** 3 code-file edits — below that, committing without /dev is allowed. Counter and marker reset on every successful code commit (exempt commits leave the counter untouched), so each work-cycle starts fresh.

**Exempt commits** (no /dev required even at counter ≥ 3):

- Docs-only commits (no `.go` / `.ts` / `.tsx` / etc. files staged)
- Test-only commits (`*_test.go`, `*.test.ts`, `*.spec.*`)
- `presentation/` changes (see the frontend-3d package documentation)
- `.claude/` and `memory/` changes

**Override tags** (added to the commit message):

| Tag | When to use | Rationale requirements |
|-----|-------------|------------------------|
| `[quick: <reason ≥15 chars>]` | Small fix, intentional skip | Reason required |
| `[no-dev: <reason ≥15 chars>]` | /dev not applicable (pure infra / docs) | Reason required |
| `[trivial: <reason ≥15 chars>]` | Cosmetic change (naming, formatting) | Reason required |
| `[hotfix: #123 …]` or `[hotfix: ABC-123 …]` | Emergency fix tied to a ticket | Ticket ID mandatory |
| `[hotfix: no-ticket: <reason ≥15 chars>]` | Emergency fix without a ticket | Explicit justification |
| `[wip]` | Work-in-progress checkpoint | Feature branches only (Hard Rule 3) |

**Anti-reset penalty** — override cycles are logged per session: ≥ 2 override cycles within 60 minutes lower the threshold from 3 to 2; ≥ 3 consecutive override cycles disable the override path entirely for the rest of the session (forced recovery via /dev).

## Recap

- Code change of any size → follow /dev phases, silently.
- Skips come only from the Skip Matrix; Review and Document always run.
- `[wip]` never lands on `main` / `master` / `prod*`.
- Overrides are budgeted (2 per 30 min) and penalized when chained — /dev is always the cheaper path.
