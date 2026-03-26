# Smart Onboarding System — Design Spec

**Date:** 2026-03-26
**Status:** Draft
**Repo:** claude-code-superkit

## Problem

Current `setup.sh` copies files and creates empty TODO-heavy templates. The user must manually:
- Fill 30+ TODOs in architecture docs
- Write CLAUDE.md from scratch
- Configure documentation rules with project-specific file paths
- Generate project trees
- Understand which agents/hooks are relevant

This takes 1-2 hours and most users skip it → agents work without project context → lower quality output → docs drift from code.

## Solution

Two commands that replace the manual work:

1. **`/superkit-init`** — first-time intelligent setup (new or existing projects)
2. **`/superkit-evolve`** — incremental update for projects already using superkit

Both use Claude's ability to read and analyze code to generate **pre-filled** documentation, not empty templates.

## Architecture

```
/superkit-init
  │
  ├── Phase 1: Scan ──────── Detect stack, structure, scale, patterns
  │     └── Output: ProjectProfile JSON (internal, not saved)
  │
  ├── Phase 2: Generate ──── Create docs from code analysis
  │     ├── docs/architecture/*.md (filled, not TODO)
  │     ├── docs/trees/*.md (from real structure)
  │     ├── CLAUDE.md (populated)
  │     └── ✋ Checkpoint: "Here's what I generated. Review?"
  │
  ├── Phase 3: Configure ─── Adapt rules/hooks to project
  │     ├── .claude/rules/documentation.md (15-point table with real paths)
  │     ├── .claude/rules/dev-workflow.md (with project commands)
  │     ├── .claude/rules/auto-commands.md (with project paths)
  │     └── ✋ Checkpoint: "Rules configured. Look good?"
  │
  ├── Phase 4: Validate ──── Cross-check everything
  │     ├── Dispatch docs-reviewer agent
  │     ├── Verify file paths in rules exist
  │     └── Verify CLAUDE.md references match reality
  │
  └── Phase 5: Commit ────── Single commit with all generated files
        └── "chore: initialize project documentation via superkit-init"
```

## Phase 1: Scan — Project Introspection

### What it detects

| Category | How | Output |
|----------|-----|--------|
| **Languages** | go.mod, package.json, tsconfig, pyproject.toml, Cargo.toml | `["go", "typescript"]` |
| **Framework** | chi/gin/echo, express/fastify, FastAPI/Django, actix | `"chi"` |
| **Database** | docker-compose, .env (DB_*), migrations dir, ORM imports | `"postgresql"`, `"pgx"` |
| **Cache** | redis in docker-compose or imports | `"redis"` |
| **Storage** | minio/s3 in docker-compose or imports | `"minio"` |
| **Structure** | Monorepo (multiple go.mod/package.json), single service | `"monorepo"` |
| **Components** | backend/, frontend/, adminpanel/, bots/, workers/ | `["backend", "frontend", "bots"]` |
| **Scale** | Count: files, LOC, endpoints, migrations, tables | `{files: 450, migrations: 50}` |
| **Auth** | JWT, sessions, OAuth imports | `"jwt+redis"` |
| **CI/CD** | .github/workflows, Dockerfile, docker-compose | `["docker", "github-actions"]` |
| **Existing docs** | CLAUDE.md, README.md, docs/, openapi.yaml | `{claude_md: true, arch_docs: false}` |

### Detection strategy

1. **File markers** (fast, no reading contents):
   - `go.mod` → Go
   - `package.json` + `tsconfig.json` → TypeScript
   - `migrations/` → has DB migrations
   - `docker-compose*.yml` → Docker infra

2. **Import analysis** (read first 50 lines of key files):
   - `go.mod` → framework (chi, gin, echo), DB driver (pgx, gorm), cache (go-redis)
   - `package.json` → deps (react, vue, express, prisma)

3. **Structure analysis** (directory tree):
   - Multiple `go.mod` / `package.json` → monorepo
   - `cmd/` dirs → multiple binaries
   - `internal/` → Go standard layout

### Output: ProjectProfile

```typescript
type ProjectProfile = {
  languages: string[];           // ["go", "typescript"]
  frameworks: Record<string, string>; // {backend: "chi", frontend: "react"}
  database: { engine: string; driver: string; migrations_dir: string; count: number } | null;
  cache: string | null;          // "redis"
  storage: string | null;        // "minio"
  structure: "monorepo" | "single" | "microservices";
  components: { name: string; path: string; type: string }[];
  scale: { files: number; loc_estimate: number; endpoints: number; migrations: number };
  auth: string | null;           // "jwt+redis"
  infra: string[];               // ["docker", "github-actions"]
  existing_docs: { claude_md: boolean; readme: boolean; arch_docs: string[]; openapi: boolean };
};
```

This is NOT saved to disk — it's passed internally to Phase 2.

## Phase 2: Generate — Documentation from Code

### 2.1 Architecture Docs

For each detected component, generate a **filled** doc (not a TODO template):

| Component | Generated Doc | How |
|-----------|---------------|-----|
| Backend (Go/Python/Rust) | `backend-layers.md` | Read `cmd/`, `internal/`, route files → describe layers, DI pattern, error handling |
| API endpoints | `backend-api-reference.md` | Grep route registrations → list all endpoints with methods, paths, auth |
| Database | `database-schema.md` | Read migrations → list tables, columns, constraints, indexes |
| Auth | `auth-and-sessions.md` | Read auth service → describe JWT/session lifecycle |
| Frontend | `frontend-state-contracts.md` | Read src/ → describe routing, state management, data fetching |
| Deployment | `deployment.md` | Read docker-compose, Dockerfile → describe how to run |

**Key principle**: read the ACTUAL code and write docs based on what's there. If a section can't be determined from code, write "TODO: describe X" — but minimize TODOs.

### 2.2 Project Trees

Generate using `tree` or `find`:
- `tree-monorepo.md` (if monorepo)
- `tree-backend.md` (if backend/ exists)
- `tree-frontend.md` (if frontend/ exists)
- Per-component trees for additional components

### 2.3 CLAUDE.md

Auto-populate from ProjectProfile:

```markdown
# ProjectName

Project description (from README.md first paragraph or package.json description)

## Tech Stack

| Component | Stack |
|-----------|-------|
| Backend | {from profile: Go 1.23, chi, pgx, redis} |
| Frontend | {from profile: React 19, TypeScript 5.9, Vite} |
| Infra | {from profile: Docker, PostgreSQL 16, Redis 7} |

## Project Structure
{generated tree, abbreviated}

## Key Commands
{detected from Makefile, package.json scripts, or common patterns}

## Migrations
Format: {detected from existing migrations}
Current: {count from scan}

## Architecture Reference
{table linking to generated docs/architecture/ files}

## Conventions
{detected from existing linter configs, .editorconfig, etc.}
```

### 2.4 Checkpoint

After generation, show the user:
```
Generated 6 architecture docs, 3 tree files, CLAUDE.md
Files:
  docs/architecture/backend-layers.md (142 lines)
  docs/architecture/database-schema.md (89 lines)
  docs/architecture/frontend-state-contracts.md (67 lines)
  docs/trees/tree-monorepo.md
  docs/trees/tree-backend.md
  docs/trees/tree-frontend.md
  CLAUDE.md (95 lines)

Review the generated files? [continue / show file / edit file]
```

User can review before Phase 3.

## Phase 3: Configure — Adapt Rules to Project

### 3.1 documentation.md

Generate the 15-point checklist with **real project paths**:

```markdown
| # | Trigger | Required Doc | File Path |
|---|---------|-------------|-----------|
| 1 | `backend/migrations/*.sql` | Database schema | `docs/architecture/database-schema.md` |
| 2 | `backend/internal/transport/http/handlers/*.go` | API reference | `docs/architecture/backend-api-reference.md` |
```

Paths come from Phase 1 scan — not hardcoded.

### 3.2 dev-workflow.md

Adapt build/test/lint commands to the project:
- Go project → `go vet ./...`, `go test ./...`
- TS project → `npx tsc --noEmit`, `npm test`
- Python → `ruff check .`, `pytest`

### 3.3 auto-commands.md

Configure with project-specific file patterns:
- Which paths trigger `/review`
- Which paths trigger `/security-scan`
- Which test commands to run

### 3.4 doc-check-on-commit.sh

Generate project-specific hook with real path mappings (like TGApp's 15-category version).

### 3.5 Checkpoint

```
Configured 4 rules and 1 hook for your project.
Rules use your actual file paths — no generic patterns.
Review? [continue / show rules]
```

## Phase 4: Validate

1. **Dispatch docs-reviewer** — verify generated docs are consistent
2. **Path check** — every file path referenced in rules/CLAUDE.md actually exists
3. **Cross-reference** — CLAUDE.md migration count matches actual migrations
4. **Report issues** — fix or flag for user

## Phase 5: Commit

Single commit:
```
chore: initialize project documentation via superkit-init

Generated:
- docs/architecture/ (N files)
- docs/trees/ (N files)
- CLAUDE.md
- .claude/rules/ (configured for project)
- .claude/scripts/hooks/doc-check-on-commit.sh (project-specific)
```

---

## `/superkit-evolve` — Incremental Update

For projects already using superkit. Detects what's missing or outdated.

### Flow

```
/superkit-evolve
  │
  ├── Diff scan ─── Compare current state vs ideal state
  │     ├── Which arch docs exist? Which are missing?
  │     ├── Is CLAUDE.md migration counter up to date?
  │     ├── Are documentation rules mapped to real paths?
  │     ├── Are there new components without docs?
  │     └── Are trees outdated?
  │
  ├── Report ────── Show what needs updating
  │     └── "Found 3 issues: missing frontend-state docs,
  │          migration counter 48→50, tree outdated"
  │
  └── Fix ─────── Generate/update only what's needed
        └── ✋ Checkpoint before commit
```

### Use cases

1. **New component added** — "I see `workers/` dir with no docs. Generate `docs/architecture/workers.md`?"
2. **Migration counter drift** — "CLAUDE.md says 000048, but there are 000050 migrations. Update?"
3. **Tree outdated** — "22 files added since last tree generation. Regenerate?"
4. **Rule paths broken** — "documentation.md references `services/feed/*.go` but path is `services/feed_engine/*.go`. Fix?"
5. **New agent needed** — "Detected Python files but no py-reviewer installed. Add?"

---

## What Changes in Existing Files

### setup.sh

**Keep** as the file-copy installer (for users who want manual control).
**Add** at the end: prompt to run `/superkit-init` in Claude Code.

```bash
echo ""
echo "Files installed. Now open Claude Code and run:"
echo "  /superkit-init"
echo ""
echo "This will scan your project and generate filled documentation."
```

### /docs-init command

**Replace** with a redirect to `/superkit-init`:
```markdown
This command has been replaced by /superkit-init which provides
intelligent project scanning and auto-populated documentation.
Run /superkit-init instead.
```

### README.md

Add "Quick Start" section:
```
1. bash setup.sh              # Install superkit files
2. claude                     # Open Claude Code
3. /superkit-init             # Intelligent project setup
```

### docs/guide/01-getting-started.md

Rewrite "After Installation" section to describe `/superkit-init` flow.

### docs/INSTALL-CLAUDE-CODE.md

Add Phase 3: "Project Initialization" describing `/superkit-init`.

---

## Implementation Plan (high-level)

| # | Task | Files | Complexity |
|---|------|-------|------------|
| 1 | `/superkit-init` command | `.claude/commands/superkit-init.md` | High — orchestrator with 5 phases |
| 2 | `/superkit-evolve` command | `.claude/commands/superkit-evolve.md` | Medium — diff + targeted fixes |
| 3 | Project scanner skill | `.claude/skills/project-scanner/SKILL.md` | Medium — detection logic |
| 4 | Doc generator skill | `.claude/skills/doc-generator/SKILL.md` | High — code→docs templates |
| 5 | Update setup.sh | `setup.sh` | Low — add /superkit-init prompt |
| 6 | Update README/docs | `README.md`, `docs/guide/*`, `docs/INSTALL-*` | Medium — rewrite sections |
| 7 | Template improvements | `packages/core/docs-templates/` | Low — better base templates |
| 8 | Showcase update | `packages/showcase/` | Low — add init/evolve commands |

**Estimated total:** 8 tasks, ~3 implementation sessions.

---

## Success Criteria

1. User runs `setup.sh` + `/superkit-init` on a real Go+TS monorepo → gets filled CLAUDE.md, 5+ architecture docs, trees, configured rules — in under 5 minutes
2. User runs `/superkit-evolve` after adding 2 migrations → gets migration counter updated, database-schema.md updated, tree regenerated
3. Zero TODOs in generated CLAUDE.md for a project with standard structure
4. doc-check-on-commit hook uses real project paths, not generic patterns
5. Generated docs are accurate enough that agents (go-reviewer, ts-reviewer) reference them and produce higher quality reviews

---

## Decisions (resolved 2026-03-26)

### 1. `--non-interactive` mode → YES
`/superkit-init --non-interactive` — генерирует всё без чекпоинтов и вопросов. Удобно для быстрого запуска. По умолчанию — интерактивный режим с чекпоинтами.

### 2. "Generated by superkit" заголовок → YES
Каждый сгенерированный файл начинается с:
```markdown
> Generated by `/superkit-init` on YYYY-MM-DD. Review and customize for your project.
```
Даёт понять что файл нужно и можно редактировать.

### 3. Автозапуск `/superkit-evolve` → YES (advisory)
SessionStart хук проверяет drift (миграции, новые файлы, устаревшие деревья). Если drift обнаружен — печатает advisory:
```
⚠ superkit-evolve: detected 3 issues since last run
  - Migration counter drift (CLAUDE.md: 48, actual: 50)
  - 12 new files without tree update
  - Missing docs for workers/ component
Run /superkit-evolve to fix, or ignore if not needed.
```
Не блокирует, не запускает автоматически — только уведомляет.

### 4. Пустой проект → Scaffold Mode
Если нет go.mod/package.json/Cargo.toml/pyproject.toml:
1. Спрашивает стек: "Go/TypeScript/Python/Rust?"
2. Создаёт минимальный CLAUDE.md с выбранным стеком
3. Создаёт пустую `docs/architecture/` с подсказками (не пустыми TODO)
4. Предлагает: "Начни через `/dev <задача>`, потом `/superkit-evolve` заполнит доки из реального кода"
В `--non-interactive` режиме без стека → создаёт только CLAUDE.md с секцией "TODO: определить стек".
