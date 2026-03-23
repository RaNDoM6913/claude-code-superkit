# Chapter 11: Documentation Architecture

Good documentation is not just for humans. Claude reads your docs in Phase 0 of every session — before touching any code. Better docs mean better reviews, better plans, and fewer mistakes.

## Architecture Doc Templates

superkit ships 8 architecture doc templates in `packages/core/docs-templates/architecture/`:

| Template | When to use |
|----------|-------------|
| `backend-layers.md` | You have a layered backend (handlers → services → repos) |
| `api-reference.md` | You have REST/GraphQL endpoints to document |
| `database-schema.md` | You use SQL with migrations |
| `auth-and-sessions.md` | You have authentication, JWT, sessions |
| `frontend-state.md` | You have a frontend with state management |
| `deployment.md` | You deploy to staging/production environments |
| `api-contracts.md` | You have typed request/response contracts |
| `data-flow.md` | You have complex data pipelines or event flows |

Each template includes section headers, placeholder text, and comments explaining what to fill in. Start with the ones that match your stack and ignore the rest.

## Project Trees

The `tree-generator` agent auto-generates directory trees for your project and writes them to `docs/trees/`. This keeps a human-readable snapshot of your file structure that Claude can reference without running `find` or `ls` across your entire repo.

Trees are checked for staleness by the `docs-checker` agent — if your file structure changed but the trees did not, you will get a warning.

## The /docs-init Command

The fastest way to set up documentation is the `/docs-init` command:

```
/docs-init
```

It does three things:

1. **Scans your project** — detects languages, frameworks, database migrations, auth patterns
2. **Copies relevant templates** — only the ones that match your stack (e.g., skips `database-schema.md` if you have no migrations directory)
3. **Generates initial trees** — creates `docs/trees/` with your current directory structure

You can also run it manually via `setup.sh` by answering "y" to "Initialize documentation structure?".

## The Documentation Rule

The `documentation` rule (`.claude/rules/documentation.md`) enforces a simple principle:

> Code without updated docs = incomplete task.

When this rule is active, Claude will update all related architecture docs, project trees, and CLAUDE.md in the same response as any code change that affects logic, API, or architecture. No separate "update docs" step needed.

## The docs-checker Agent

The `docs-checker` agent finds stale documentation by comparing `git diff` against `docs/`:

- **Stale content** — code changed but the corresponding doc was not updated
- **Tree staleness** — files added or removed but `docs/trees/` not regenerated
- **Coverage gaps** — entire subsystems with no architecture doc at all

Run it manually via `/review` (it is part of the review pipeline) or invoke it directly:

```
Use the docs-checker agent to verify documentation is up to date
```

## Stop Hook Verification

The Stop hook (active in `standard` and `strict` profiles) runs before Claude ends a session. Among other checks, it verifies that documentation was updated alongside code changes. If it detects a mismatch, it will prompt Claude to fix the docs before finishing.

## The Full Loop

Every code change follows this cycle:

```
code change → doc update (same response) → docs-checker (review) → Stop verification
```

This means documentation never drifts. The rule ensures Claude updates docs proactively, the agent catches anything missed, and the Stop hook provides a final safety net.

## Tips

- **Start minimal.** You do not need all 8 templates on day one. Pick 2-3 that match your current stack.
- **Fill only what you know.** Leave template sections empty rather than writing speculative docs. Claude will fill them as features land.
- **Add detail as the project grows.** A 10-line architecture doc is better than no architecture doc. It gives Claude enough context to ask the right questions.
- **Let trees auto-generate.** Do not manually maintain `docs/trees/` — that is what the tree-generator agent is for.
- **Review docs in PRs.** If a PR changes behavior but not docs, the docs-checker agent will flag it during `/review`.
