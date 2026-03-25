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

## Coding Style

### General
- Use language-standard formatter
- No magic numbers — named constants
- No commented-out code
- Early returns over nesting
- Max ~50 lines per function
- No global state — DI via constructors

### Testing
- Tests required for: new endpoints, bug fixes, business logic
- Tests optional for: pure UI, config, docs
- "should [behavior] when [condition]" naming

### Search First
- Check codebase for existing patterns before writing new code
- Check packages before reimplementing

## Security

- SQL: parameterized queries ($1 for pgx, ? for MySQL, %s for Python)
- XSS: no dangerouslySetInnerHTML without DOMPurify
- Secrets: no hardcoded tokens/passwords/keys — use env vars
- Auth: all API endpoints require auth middleware
- Input: validate at system boundaries
- Files: validate MIME type and size server-side
- CORS: explicit origin allowlist, no wildcards in production

## Git Workflow

- **Commits**: conventional format `type(scope): description`
  - Types: feat, fix, docs, refactor, chore, test, perf
  - Scope: backend, frontend, admin, bot, claude
- **No --no-verify**: Fix pre-commit hook issues, don't skip them
- **No force push to main**: Use PRs
- **No git reset --hard**: Use stash or soft reset
- **Branch naming**: `feature/description`, `fix/description`, `chore/description`

## Conventions

- TODO: language formatting rules
- TODO: error handling patterns
- TODO: commit message format (conventional commits recommended)
- TODO: API style (REST/GraphQL, auth pattern)
- TODO: env var strategy (.env files, VITE_* prefix, etc.)

## Architecture Reference

> Before changing any component, read the corresponding architecture doc.

| File | Description |
|------|-------------|
| `docs/architecture/TODO.md` | TODO: list architecture docs |

## Migrations

Format: `TODO: path/000NNN_description.{up,down}.sql`
Current: `TODO: 000001..000NNN`

## Mandatory Documentation Updates

After ANY changes to logic, API, or architecture, update all related docs in the same response as the code change. Do not wait for a separate request.

### Checklist:

1. **Architecture docs** (`docs/architecture/`) — update affected files
2. **AGENTS.md** — update Active Plans, Project Structure, Known Constraints
3. **README files** — update all affected READMEs
4. **Project trees** (`docs/trees/`) — update on ANY file structure changes
5. **OpenAPI spec** — update on API endpoint changes

### Rule: code without updated docs = incomplete task. Do it in the SAME response as the code.

## Model Configuration

This project uses **gpt-5.4** with **extra_high** reasoning effort (maximum accuracy). All skills inherit this from `.codex/config.toml`. Do NOT downgrade the model or reasoning level — maximum performance is required for code review, security scanning, and test generation.

## Codex-Specific Notes

### Agent Dispatch
- Use `spawn_agent` instead of the Agent tool for subagent dispatch
- Use `wait_agent` / `wait` to collect agent results
- All reviewer agents are independent — dispatch them in parallel

### Planning
- Use `update_plan` instead of TodoWrite for tracking progress

### Skills
- Skills auto-activate based on description matching
- Invoke skills by describing the task that matches the skill description
- Multi-agent requires `[features] multi_agent = true` in config.toml

### Available Skills

Skills are located in `.codex/skills/` directories. Each skill has a `SKILL.md` with its description and instructions.

**Command skills (user-invocable):**

| Skill | Description |
|-------|-------------|
| `dev-orchestrator` | Full-stack development cycle: understand, plan, implement, verify, test, review, document |
| `review-orchestrator` | Detect changes, dispatch reviewer agents, collect and deduplicate findings |
| `audit-orchestrator` | Parallel audit: frontend, backend, infra, security |
| `test-runner` | Auto-detect and run project tests (Go, TS, Python, Rust) |
| `lint-runner` | Auto-detect and run project linters with optional --fix |
| `commit-helper` | Conventional commit: analyze changes, detect secrets, create commit |
| `new-migration` | Scaffold migration file pair (up + down) with auto-numbering |
| `migrate` | Apply or rollback database migrations |

**Agent skills (auto-dispatched by orchestrators):**
code-reviewer, security-scanner, test-generator, e2e-test-generator, health-checker, pre-deploy-validator, dependency-checker, debug-observer, docs-reviewer, api-contract-sync, scaffold-endpoint, tree-generator, database-reviewer, architect, plan-checker, goal-verifier, audit-frontend, audit-backend, audit-bots, audit-infra, audit-security, project-architecture, writing-agents, writing-commands, red-blue-auditor, ai-slop-cleaner, critic, visual-reviewer

**Stack-specific reviewers (optional):**
go-reviewer, ts-reviewer, py-reviewer, rs-reviewer

### Auto-Activation Rules

Codex MUST auto-invoke skills when these conditions are met (without the user explicitly asking):

| Skill | Auto-trigger when |
|-------|-------------------|
| `dev-orchestrator` | New feature, bug fix touching 2+ files, 100+ lines in one file, migration + service |
| `review-orchestrator` | After completing work on 3+ files, before commit with 5+ files changed |
| `test-runner` | After feature implementation, bug fix, refactor, or test file edits |
| `lint-runner` | Before any commit with code changes (not docs-only) |
| `audit-orchestrator` | When touching infrastructure, CI/CD, or security-sensitive code (use health-only mode for quick check) |

**Skip auto-activation when:**
- Already inside `dev-orchestrator` (it includes review + test)
- User explicitly says "just do X" / "quick fix"
- Docs-only or config-only changes
- Single file with < 50 lines changed

## Active Plans

None yet.

## Known Constraints

TODO: list known limitations, stubs, tech debt.
