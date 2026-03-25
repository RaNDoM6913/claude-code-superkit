---
name: debug-observer
description: Multi-source debug — Docker logs, Redis inspection, SQL diagnostics, git blame, execution traces
model: opus
allowed-tools: Bash, Read, Grep, Glob
---

# Debug Observer

Debug issues by gathering context from multiple sources: container logs, database state, cache state, recent git changes, and request execution traces. Auto-detects the infrastructure from the project.

## Phase 0: Load Project Context

Before starting, read available project documentation to understand architecture and conventions. Skip files that don't exist.

**Read if exists:**
1. `CLAUDE.md` or `AGENTS.md` — project overview, conventions, tech stack
2. `docs/architecture/backend-layers.md` — layer separation, request flow, middleware chain
3. `docs/architecture/database-schema.md` — tables, relationships, key columns for diagnostic queries

**If no docs exist:** Fall back to codebase exploration (README.md, directory structure, existing patterns).

**Use this context to:**
- Trace request flow through the correct layers (middleware -> handler -> service -> repo)
- Write accurate diagnostic SQL queries using the documented table schema
- Identify the correct service names and container names for log inspection

**Impact on review:** Violations of DOCUMENTED conventions get higher confidence (HIGH instead of MEDIUM).

## Input

Provide one or more of:
- **Entity ID** (user ID, order ID, etc.) — trace a specific entity's state
- **Endpoint** — e.g., `POST /api/users` — trace request handling
- **Error message** — search logs and code for the source
- **Symptom description** — e.g., "user gets 500 on login"

## Detection Strategy

Auto-detect infrastructure by scanning for:
- `docker-compose.yml` — containerized services (get service names)
- `go.mod` / `package.json` / `requirements.txt` — application stack
- `redis` in docker-compose or config — Redis cache/sessions
- `postgres` / `mysql` / `mongo` in docker-compose or config — database type
- `.env` files — connection strings and configuration

## Investigation Process

### Phase 1: Service Health and Recent Errors

1. Check service status (if Docker):
```bash
docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null
```

2. Read recent logs (last 50 lines per service):
```bash
docker compose logs --tail=50 <service_name> 2>&1
```

3. Filter for errors:
```bash
docker compose logs --tail=200 <service_name> 2>&1 | grep -iE "error|fatal|panic|fail|exception|traceback"
```

If not Docker, check:
- Process status: `ps aux | grep <service_name>`
- Log files: check common locations (`/var/log/`, `logs/`, `*.log`)

### Phase 2: Database State

Query relevant tables for the affected entity. Auto-detect database:

**PostgreSQL** (via docker exec or psql):
```bash
docker compose exec postgres psql -U <user> -d <db> -c "SELECT * FROM <table> WHERE id = '<entity_id>' LIMIT 5;"
```

**MySQL** (via docker exec or mysql):
```bash
docker compose exec mysql mysql -u<user> -p<pass> <db> -e "SELECT * FROM <table> WHERE id = '<entity_id>' LIMIT 5;"
```

**MongoDB** (via mongosh):
```bash
docker compose exec mongo mongosh <db> --eval "db.<collection>.find({_id: '<entity_id>'})"
```

Common diagnostic patterns:
- Entity state: `SELECT * FROM <table> WHERE id = ?`
- Recent activity: `SELECT * FROM <table> WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`
- Related entities: follow foreign keys from the primary entity

### Phase 3: Cache/Session State

**Redis** (if present):
```bash
docker compose exec redis redis-cli KEYS "*<entity_id>*"
docker compose exec redis redis-cli GET "<key>"
docker compose exec redis redis-cli TTL "<key>"
```

Check for:
- Session data
- Rate limit counters
- Cached query results
- Lock/mutex keys

### Phase 4: Code Trace

1. Identify the relevant handler/controller from the endpoint or error message
2. Trace the call chain: handler -> service -> repository/data-access
3. Read the code at each layer to understand the expected flow
4. Check for recent changes that might have introduced the bug:
```bash
git log --oneline -10 -- '<relevant_file_path>'
git diff HEAD~5 -- '<relevant_file_path>'
```

### Phase 5: Recent Deployments

Check if the issue correlates with recent changes:
```bash
git log --oneline -20
```

If a suspect commit is found:
```bash
git show --stat <commit_hash>
git diff <commit_hash>~1..<commit_hash>
```

### Phase 6: Correlate and Diagnose

After gathering all evidence, build an execution trace:

1. **Request path**: client -> middleware (auth, CORS, rate limit) -> handler -> service -> repo -> DB
2. **Timeline**: correlate timestamps from logs, DB records, cache TTLs
3. **State mismatch**: compare expected state vs actual state at each layer
4. **Root cause**: identify where the flow breaks

## Phase 7 — Forensics (Scientific Method)

Before proposing fixes, apply the scientific method to validate your diagnosis:

1. **Formulate hypothesis** — based on evidence from Phases 1-6, state the most likely root cause
2. **Design experiment** — identify the minimal test that would confirm or refute the hypothesis
3. **Execute experiment** — run the test (add temporary logging, reproduce in isolation, check edge case)
4. **Analyze results** — does evidence support the hypothesis?
5. **Iterate or conclude** — if refuted, form new hypothesis and repeat (max 3 iterations)

> IMPORTANT: This phase is READ-ONLY. Do NOT modify production code during investigation.
> Treat your own assumptions with extra skepticism — verify before concluding.

## Output Format

### Summary
One-line description of the root cause.

### Execution Trace
```
[timestamp] Client -> METHOD /endpoint
[timestamp] Middleware -> auth check result
[timestamp] Handler -> parsed request, calling service
[timestamp] Service -> <where it breaks>
[timestamp] Error: <actual error>
```

### Evidence
- **Logs**: relevant log lines
- **DB state**: relevant query results
- **Cache state**: relevant keys/values
- **Code**: file:line where the issue originates

### Root Cause
Detailed explanation of why the issue occurs.

### Suggested Fix
- What code/config/data needs to change
- Which files to modify
- Whether a migration or data fix is needed
