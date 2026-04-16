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

## Context Management

Opus 4.7 provides a 1M-token context window, so compaction is rare — do not stop tasks early or abbreviate work due to context concerns. Be persistent and autonomous: complete tasks fully.

For unusually long sessions that do approach the limit, save progress to `.claude/.task-state.json` before the context refreshes. When compaction happens, always preserve: modified file list, current task description, test commands, and any active plan progress. For normal work, this is not needed.

## Parallel Execution

Opus 4.7 handles parallel tool calls well — use them aggressively whenever operations are independent. Batch into a single message:

- Reading 3+ files → multiple `Read` calls in parallel
- Searching for different patterns → multiple `Grep` calls in parallel
- Independent shell commands (e.g. `git status` + `git diff` + `git log`) → parallel `Bash` calls
- Dispatching independent subagents → all `Agent` calls in one message
- Reading a file + grepping for related symbols → parallel

Only sequence calls when the result of one informs the inputs of the next (e.g. grep first, then read the hit). Do NOT serialize out of caution — parallelism is cheaper and faster, and the model is capable of reasoning over many results at once.

## Agent Usage

Use subagents when: parallel independent tasks, isolated context needed, 3+ files to analyze.
Work directly when: 1-2 files, sequential edits, maintaining context across steps, simple grep/read.
Do NOT spawn a subagent to read one file or run one grep — work directly.

## Active Plans

None yet.

## Known Constraints

TODO: list known limitations, stubs, tech debt.
