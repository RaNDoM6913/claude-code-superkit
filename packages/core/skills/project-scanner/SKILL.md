---
name: project-scanner
description: Project introspection — detect languages, frameworks, database, structure, scale, auth, CI/CD
user-invocable: false
---

# Project Scanner

> Generated knowledge used by `/superkit-init` and `/superkit-evolve`.

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

### Scale Estimation

```bash
# Files by language
find . -name "*.go" | grep -v vendor | wc -l
find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | wc -l

# Migrations
find . -path "*/migrations/*" -name "*.up.sql" | wc -l

# API endpoints (approximate)
grep -r "router\.\(Get\|Post\|Put\|Delete\|Patch\)" --include="*.go" | wc -l
grep -r "app\.\(get\|post\|put\|delete\|patch\)" --include="*.ts" | wc -l

# LOC estimate
find . \( -name "*.go" -o -name "*.ts" -o -name "*.py" \) | grep -v vendor | grep -v node_modules | xargs wc -l 2>/dev/null | tail -1
```
