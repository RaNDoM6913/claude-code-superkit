# Chapter 6: Writing Skills

Skills are knowledge documents that provide Claude with domain-specific context. Unlike rules (which are always loaded), skills are loaded on demand -- either when the user invokes them or when Claude determines they are relevant.

## Skill Format

Skills live in `.claude/skills/<skill-name>/SKILL.md`. The directory name becomes the skill identifier.

```
.claude/skills/
  project-architecture/
    SKILL.md
  deployment-guide/
    SKILL.md
  api-conventions/
    SKILL.md
```

### Frontmatter

```yaml
---
name: skill-name
description: One-line description (used for matching and display)
user-invocable: true
---
```

| Field | Values | Purpose |
|-------|--------|---------|
| `name` | kebab-case | Display name and identifier |
| `description` | One line | Claude uses this to decide when to auto-load the skill |
| `user-invocable` | `true` or `false` | `true` = user can type `/skill-name`. `false` = auto-activated only |

### User-Invocable Skills

When `user-invocable: true`, the user can trigger the skill directly:

```
> /deployment-checklist
```

Claude loads the SKILL.md and follows its instructions.

### Auto-Activated Skills

When `user-invocable: false`, the skill is loaded automatically when Claude determines the context is relevant. For example, a `project-architecture` skill with `user-invocable: false` is loaded when Claude needs to understand the project structure.

## Knowledge Skills

The simplest skills are static reference documents. They contain architecture descriptions, conventions, API contracts, or domain knowledge:

```markdown
---
name: api-conventions
description: API design conventions for this project
user-invocable: false
---

# API Conventions

## URL Structure
- Resources: `/v1/{resource}` (plural nouns)
- Actions: `/v1/{resource}/{id}/{action}` (verbs for non-CRUD)

## Request/Response
- Always JSON, `Content-Type: application/json`
- Errors: `{ "error": { "code": "SNAKE_CASE", "message": "Human-readable" } }`

## Authentication
- Bearer JWT in Authorization header
- Public endpoints: /health, /auth/login, /auth/register
```

## Dynamic Content

Prefix a line with `!` to execute it as a shell command. The output replaces the line at load time:

```markdown
## Current Scale
- Services: !`ls backend/internal/services/ | wc -l | tr -d ' '`
- Migrations: !`ls backend/migrations/*.up.sql 2>/dev/null | wc -l | tr -d ' '`
- Endpoints: !`grep -c 'r\.\(Get\|Post\|Put\|Delete\)' backend/internal/app/routes.go 2>/dev/null || echo 0`
```

When the skill is loaded, Claude sees the computed values (e.g., "Services: 31") instead of the shell commands. This keeps the skill fresh without manual updates.

## When to Use Skill vs Rule vs Agent

| Need | Use | Why |
|------|-----|-----|
| Universal instruction ("always use parameterized SQL") | **Rule** | Loaded into every conversation, always active |
| Reference data ("here is our API schema") | **Skill** | Loaded on demand, does not waste context window |
| Automated check ("scan for SQL injection") | **Agent** | Runs tools, produces findings, can be dispatched in parallel |
| Multi-step workflow ("review all changed files") | **Command** | Orchestrates agents and tools through phases |
| Format enforcement ("gofmt on every Go edit") | **Hook** | Runs automatically as a shell script, no AI reasoning needed |

Rules are always in context -- keep them under 50 lines total. Skills can be longer because they are only loaded when needed.

## Full Example: Deployment Checklist Skill

Create `.claude/skills/deployment-checklist/SKILL.md`:

```markdown
---
name: deployment-checklist
description: Pre-deployment checklist and procedures
user-invocable: true
---

# Deployment Checklist

Run through this checklist before every production deployment.

## Pre-Deploy

- [ ] All tests pass: !`cd backend && go test ./... -short -count=1 2>&1 | tail -1`
- [ ] No pending migrations: !`ls backend/migrations/*.up.sql | wc -l` total migrations
- [ ] No uncommitted changes: !`git status --short | wc -l | tr -d ' '` dirty files
- [ ] Current branch: !`git branch --show-current`
- [ ] Last commit: !`git log --oneline -1`

## Deployment Steps

1. Tag the release: `git tag -a v$(date +%Y.%m.%d) -m "Release"`
2. Build production images: `docker compose -f docker-compose.prod.yml build`
3. Run migrations: `make migrate-up`
4. Deploy: `docker compose -f docker-compose.prod.yml up -d`
5. Verify health: `curl -s https://api.example.com/health | jq .`

## Rollback

If something goes wrong:

1. Revert to previous tag: `git checkout v{previous-tag}`
2. Rollback migration: `make migrate-down`
3. Redeploy: `docker compose -f docker-compose.prod.yml up -d`

## Post-Deploy

- [ ] Verify key endpoints respond (health, auth, main API)
- [ ] Check error rates in monitoring
- [ ] Confirm no new errors in application logs
```

The user types `/deployment-checklist` and gets a live checklist with dynamic values filled in from shell commands.
