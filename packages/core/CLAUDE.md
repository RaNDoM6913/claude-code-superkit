# YOUR_PROJECT_NAME

> TODO: One-line project description.

## Tech Stack

| Component | Stack |
|-----------|-------|
| **Backend** | TODO: language, framework, database |
| **Frontend** | TODO: framework, bundler, CSS |
| **Infra** | TODO: Docker, CI/CD, cloud |

## Project Structure

```
TODO: top-level directory layout
```

## Key Commands

```bash
# Build
TODO: build commands

# Test
TODO: test commands

# Lint / Format
TODO: lint commands

# Database
TODO: migration commands

# Dev
TODO: dev server commands
```

## Conventions

- TODO: language formatting rules
- TODO: error handling patterns
- TODO: commit message format (conventional commits recommended)
- TODO: API style (REST/GraphQL, auth pattern)
- TODO: env var strategy (.env files, VITE_* prefix, etc.)

## Architecture Reference

> Fill in after running `/docs-init`. Update when code changes affect architecture.

| Doc | Description |
|-----|-------------|
| `docs/architecture/backend-layers.md` | TODO: Layers, DI, error handling |
| `docs/architecture/api-reference.md` | TODO: All API endpoints |
| `docs/architecture/database-schema.md` | TODO: Tables, migrations, indexes |
| `docs/architecture/auth-and-sessions.md` | TODO: Auth flow, sessions |
| `docs/architecture/frontend-state.md` | TODO: State, routing, data fetching |
| `docs/architecture/deployment.md` | TODO: Deploy process, environments |
| `docs/trees/tree-monorepo.md` | TODO: Project directory structure |

## Migrations

Format: `TODO: path/000NNN_description.{up,down}.sql`
Current: `TODO: 000001..000NNN`

## Mandatory Documentation Updates

**Rule:** Code changes affecting logic/API/architecture MUST include doc updates in the same response.

### Checklist (after any code change)
1. Did I change an API endpoint? → update `docs/architecture/api-reference.md`
2. Did I add/change a DB table/column? → update `docs/architecture/database-schema.md`
3. Did I change auth/session logic? → update `docs/architecture/auth-and-sessions.md`
4. Did I change backend layers? → update `docs/architecture/backend-layers.md`
5. Did I change frontend state/routing? → update `docs/architecture/frontend-state.md`
6. Did I add/remove files or directories? → regenerate `docs/trees/`

### Rule: code without updated docs = incomplete task. Do it in the SAME response as the code.

## Active Plans

None yet.

## Known Constraints

TODO: list known limitations, stubs, tech debt.
