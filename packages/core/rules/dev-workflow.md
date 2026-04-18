---
alwaysApply: true
tokens: 1025
---

# Auto Dev Workflow

## Rule

Claude MUST follow the /dev orchestration for **ALL tasks that involve code changes** — without the user explicitly calling /dev.

This includes: new features, bug fixes (any size), refactors, migrations, bot changes, integration work, and any task that creates or modifies code files.

## When NOT to use /dev

| Task Type | Action |
|-----------|--------|
| Docs-only update | Direct edit |
| Config / env change | Direct edit |
| Question / explanation | Just answer |
| Typo fix in non-code file | Direct edit |

## Behavior

- Do NOT announce "I'm using /dev workflow" — just follow the phases naturally
- Phase 1 complexity assessment determines which phases to skip:
  - **Simple** (1 file, < 100 lines) → skip 1.5, 2.1, 2.5, 3.5, 5.5, 6.5
  - **Standard** (2-5 files) → full workflow
  - **Complex** (5+ files) → full workflow + architect + critic
- Always include Phase 6 (review) for changes touching 2+ files
- Always include Phase 7 (document) if logic/API/architecture changed

## Enforcement (hard-block)

Since 2026-04-14 this rule is technically enforced by three cooperating hooks:

| Hook | Event | Purpose |
|------|-------|---------|
| `dev-edit-counter.sh` | `PostToolUse(Edit\|Write\|MultiEdit)` | Increments the per-session counter on each code-file edit. Tests, docs, memory, `.claude/`, and config files are ignored. |
| `dev-marker-set.sh` | `UserPromptSubmit` + `PreToolUse(Skill)` | Sets a marker when `/dev` is invoked — either as a user prompt (`/dev …` with word boundary, so `/develop`, `/device`, `/devops` do NOT trigger) or as a Skill tool call (`skill == "dev"` or any `:dev$` variant). |
| `dev-required-on-commit.sh` | `PreToolUse(Bash)` | Blocks `git commit` (incl. `git -C <path> commit`) with `exit 2` when the counter is ≥ threshold AND no `/dev` marker is set AND no override tag is present. |

**Threshold:** 3 code-file edits. Below that, the commit is allowed without `/dev`.

**State files** (keyed by Claude Code `session_id`, falls back to `$PPID` for older runtimes):
- `${TMPDIR:-/tmp}/claude-edit-count-<session_id>` — counter
- `${TMPDIR:-/tmp}/claude-dev-marker-<session_id>` — marker

Both are reset on any successful commit so the next work-cycle starts fresh.

**Override tags** (added to the commit message):

| Tag | When to use | Rationale requirements |
|-----|-------------|------------------------|
| `[quick: <reason ≥15 chars>]` | Small fix, intentional skip | Reason required |
| `[no-dev: <reason ≥15 chars>]` | `/dev` not applicable (pure infra / docs) | Reason required |
| `[trivial: <reason ≥15 chars>]` | Cosmetic change (naming, formatting) | Reason required |
| `[hotfix: #123 …]` or `[hotfix: ABC-123 …]` | Emergency fix tied to a ticket | Ticket ID mandatory |
| `[hotfix: no-ticket: <reason ≥15 chars>]` | Emergency fix without a ticket | Explicit justification |
| `[wip]` | Work-in-progress checkpoint | **Forbidden on `main` / `master` / `prod*` branches** |

**Rolling budget** — at most **2 override tags per 30 min** across the whole project (read from `~/.claude/audit/*.jsonl`). The third override in that window is blocked; use `/dev` instead or wait for the oldest override to drop out of the window.

**Anti-reset penalty** — `~/.claude/state/dev-cycles-<session>.jsonl` logs one entry per allow path. `≥ 2` override cycles in the last 60 min lower the threshold from 3 to 2. `≥ 3` consecutive override cycles disable the override path entirely for the rest of the session (forced recovery).

**Exempt commits** (no `/dev` required even at counter ≥ 3):

- Docs-only commits (no `.go` / `.ts` / `.tsx` / etc. files staged)
- Test-only commits (`*_test.go`, `*.test.ts`, `*.spec.*`)
- `presentation/` changes (see the frontend-3d documentation)
- `.claude/` and `memory/` changes

This closes the historical gap where `/dev` was advisory-only (only Claude's discipline enforced it). Skipping `/dev` on 3+ code edits now fails at commit time instead of being noticed only in review.

Reference implementation proven in production: https://github.com/RaNDoM6913/tgapp/commit/41cc6832
