# Architecture Doc Templates

Copy relevant templates to your project's `docs/architecture/` directory and fill in the TODOs.

## Which templates to use

| Template | Use when your project has... |
|----------|----------------------------|
| `backend-layers.md` | Any backend (Go, Node, Python, Rust) |
| `api-reference.md` | REST/GraphQL API endpoints |
| `database-schema.md` | SQL database with migrations |
| `auth-and-sessions.md` | Authentication system |
| `frontend-state.md` | Frontend app (React, Vue, Svelte) |
| `deployment.md` | Production deployment process |
| `api-contracts.md` | External API integrations |
| `data-flow.md` | Complex multi-step data flows |

## How to use

1. Run `/docs-init` in Claude Code — auto-detects which templates apply
2. Or manually: `cp packages/core/docs-templates/architecture/*.md docs/architecture/`
3. Fill in the TODOs
4. Delete templates that don't apply
5. Add custom docs as your project grows

## Tips

- Start minimal — fill only what you know now, expand later
- These docs are read by AI agents (Phase 0) — accurate docs = better reviews
- The `docs-reviewer` agent will flag stale docs after code changes
