---
name: project-scanner
description: Project introspection — detect languages, frameworks, database, structure, scale, auth, CI/CD
tokens: 1509
user-invocable: false
---

# Project Scanner

Static reference for project introspection: file markers, import signals, and bash snippets that identify a repo's languages, frameworks, database, infrastructure, structure, components, and scale. Read the tables and apply them to the project in front of you — this file holds no per-project data.

## Use when
- You need to identify an unfamiliar project's stack, structure, or scale from its files alone.
- Building a project summary (languages, frameworks, DB, infra, components, auth, CI/CD) before deeper work.

## Do not use when
- The project is already described in `CLAUDE.md` / `AGENTS.md` — read that first; only re-detect what it omits.
- You already know the one fact you need from a file you have read (e.g. framework stated in `package.json`).

## Hard Rules
1. Detect from files actually present — read or grep the marker; never infer a stack from the project's name.
2. Report EVERY detected language, not just the first — polyglot repos are common.
3. Multiple structure matches → choose the most specific (see Tie-breaks) and name the signals that fired.
4. No marker matches a category → report `UNKNOWN` for it. Never guess a value.

## Scan procedure
1. Languages — match file markers (Languages table); read each hit's version source. Report all matches.
2. Frameworks — for each detected language, grep dependencies against the Frameworks table.
3. Database & infrastructure — check docker-compose, `.env`, and schema files (Database + Infrastructure tables).
4. Structure — classify the repo against the Structure Patterns table, applying Tie-breaks.
5. Components — scan top-level and second-level directories (Component Detection table).
6. Scale — run the Scale Estimation snippets for approximate counts.

Done when: every category above has a concrete value or `UNKNOWN`.

## Detection Patterns

### Languages

| File Marker | Language | Version Source |
|-------------|----------|---------------|
| `go.mod` | Go | First line: `go X.Y` |
| `package.json` + `tsconfig.json` | TypeScript | `package.json` → `typescript` version |
| `package.json` (no tsconfig) | JavaScript | `package.json` → `engines.node` |
| `pyproject.toml` | Python | `[project]` → `requires-python` |
| `requirements.txt` | Python | None (check `python --version`) |
| `Cargo.toml` | Rust | `[package]` → `edition` |
| `pom.xml` | Java | `<java.version>` |
| `build.gradle` / `build.gradle.kts` | Kotlin/Java | `sourceCompatibility` |

### Frameworks

| Language | Detection | Popular Frameworks |
|----------|-----------|-------------------|
| Go | `go.mod` requires | chi, gin, echo, fiber, gorilla/mux |
| TypeScript | `package.json` deps | react, vue, svelte, angular, next, nuxt, express, fastify, nestjs |
| Python | `pyproject.toml` / `requirements.txt` | fastapi, django, flask, starlette |
| Rust | `Cargo.toml` deps | actix-web, axum, rocket, warp |

### Database

| Signal | Database | Driver |
|--------|----------|--------|
| `postgres` in docker-compose | PostgreSQL | Read go.mod/package.json for driver |
| `mysql` in docker-compose | MySQL | Read go.mod/package.json for driver |
| `mongo` in docker-compose | MongoDB | Read go.mod/package.json for driver |
| `DATABASE_URL` in .env | Parse URL scheme | From URL |
| `schema.prisma` | From `datasource.provider` | Prisma |

### Infrastructure (cache, storage, auth, CI/CD)

| Category | Signal |
|----------|--------|
| Cache | `redis` in docker-compose; imports `go-redis`, `ioredis`, `redis-py` |
| Storage | `minio` / `s3` in docker-compose; imports `minio-go`, `@aws-sdk/client-s3` |
| Auth | grep for `jwt`, `session`, `oauth`, `passport`, `auth middleware` |
| CI/CD | `.github/workflows/`, `Dockerfile`, `docker-compose*.yml`, `.gitlab-ci.yml` |

### Structure Patterns

| Pattern | Classification |
|---------|---------------|
| Multiple `go.mod` or `package.json` (not in node_modules) | Monorepo |
| Single root `go.mod` + `cmd/` | Go standard layout |
| Single `package.json` + `src/` | Single app |
| `apps/` or `packages/` with workspace config | Monorepo (workspace) |
| `services/` with multiple subdirs each with own main | Microservices |

### Component Detection

Scan top-level and second-level directories:

| Directory Pattern | Component Type |
|-------------------|---------------|
| `backend/`, `server/`, `api/` | Backend |
| `frontend/`, `web/`, `client/`, `app/` | Frontend |
| `admin/`, `adminpanel/`, `dashboard/` | Admin UI |
| `bot*/`, `tgbot*/` | Bots |
| `worker*/`, `jobs/`, `queue/` | Background workers |
| `infra/`, `deploy/`, `terraform/` | Infrastructure |
| `mobile/`, `ios/`, `android/` | Mobile |
| `docs/` | Documentation |

### Tie-breaks (ambiguous detection)

- Several languages match → report all; there is no single "primary" language.
- Repo matches both Monorepo and Microservices → classify as Microservices only when `services/` holds ≥2 subdirs each with its own entrypoint (`main.go` / `package.json` / `main.py`); otherwise Monorepo.
- Several structure rows match → take the most specific (workspace or microservices over plain monorepo).
- No marker matches a category → `UNKNOWN`; do not infer a value from directory names alone.

### Scale Estimation

```bash
# Files by language
find . -name "*.go" | grep -v vendor | wc -l
find . \( -name "*.ts" -o -name "*.tsx" \) | grep -v node_modules | wc -l

# Migrations
find . -path "*/migrations/*" -name "*.up.sql" | wc -l

# API endpoints (approximate) — ERE, works with grep -E and ripgrep
grep -rE "router\.(Get|Post|Put|Delete|Patch)" --include="*.go" . | wc -l
grep -rE "app\.(get|post|put|delete|patch)" --include="*.ts" . | wc -l

# LOC estimate
find . \( -name "*.go" -o -name "*.ts" -o -name "*.py" \) | grep -v vendor | grep -v node_modules | xargs wc -l 2>/dev/null | tail -1
```

## Recap — non-negotiables
- Detect from real files; report every language; never infer a stack from the project name.
- Ambiguous structure → most specific match, and state which signals fired.
- No marker for a category → `UNKNOWN`, never a guess.
