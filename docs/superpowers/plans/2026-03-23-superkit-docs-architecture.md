# Superkit Documentation Architecture — Implementation Plan (Plan 6)

> Add documentation scaffolding, architecture templates, tree generation, and doc-update enforcement to superkit.

**Goal:** When a user installs superkit, they also get a complete documentation system: architecture doc templates, project tree generation, mandatory doc-update rules, and tooling that keeps docs in sync with code.

**Context:** TGApp has a mature documentation system (13 architecture docs, 4 project trees, mandatory update rules, docs-checker agent, Stop hook verification). This plan extracts and generalizes that system into superkit.

**Working directory:** `/Users/ivankudzin/cursor/claude-code-superkit/`

---

## What TGApp has (source of truth)

```
docs/
├── architecture/                    # 13 architecture documents
│   ├── backend-layers.md            # Layers, DI, error handling, middleware
│   ├── backend-api-reference.md     # All endpoints — method, path, auth, req/res
│   ├── database-schema.md           # Tables, constraints, indexes, migrations
│   ├── auth-and-sessions.md         # JWT, refresh, single-device, Redis sessions
│   ├── moderation-pipeline.md       # draft→snapshot→moderation workflow
│   ├── photo-pipeline.md            # Upload→crop→S3→thumbhash→overlay
│   ├── entitlements-and-store.md    # Credits, subscriptions, payments
│   ├── notification-system.md       # In-app + bot dual delivery
│   ├── feed-and-antiabuse.md        # Feed algorithm, anti-abuse levels
│   ├── bot-moderator.md             # State machine, inline UX, diff cards
│   ├── bot-support.md               # Message routing, attachments
│   ├── frontend-onboarding-flow.md  # 9 steps, validation, API, draft system
│   └── frontend-state-contracts.md  # Screen tree, z-index, animations, cache
├── trees/                           # 4 project tree files
│   ├── tree-monorepo.md
│   ├── tree-backend.md
│   ├── tree-frontend.md
│   └── tree-adminpanel.md
```

**Enforcement:**
- CLAUDE.md "Mandatory Documentation Updates" — checklist after ANY code change
- docs-checker agent — compares git diff vs docs, flags stale
- Stop hook — verifies docs updated before session end
- Rule: "код без обновлённых docs = незавершённая задача"

---

## Task 1: Create architecture doc templates

**Files:**
- Create: `packages/core/docs-templates/architecture/` with 8 universal template files

- [ ] **Step 1: Create template directory**
```bash
mkdir -p packages/core/docs-templates/architecture
```

- [ ] **Step 2: Create universal architecture templates**

Each template has sections with TODO placeholders and instructions:

**a) `backend-layers.md`** — for any backend project
```markdown
# Backend Architecture — Layers

> TODO: Fill in your backend's layered architecture.

## Layers
<!-- Describe your layers: e.g., Transport → Service → Repository -->

## Dependency Injection
<!-- How are dependencies wired? Constructor injection? DI container? -->

## Error Handling
<!-- Error propagation strategy: domain errors, HTTP mapping -->

## Adding a New Endpoint
<!-- Step-by-step checklist for adding new endpoints -->
```

**b) `api-reference.md`** — endpoint catalog
```markdown
# API Reference

> Auto-maintain: update when handlers change.

## Authentication
<!-- Auth mechanism: JWT, API key, OAuth -->

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| TODO | TODO | TODO | TODO |

## Error Format
<!-- Standard error response shape -->
```

**c) `database-schema.md`** — DB documentation
```markdown
# Database Schema

> Auto-maintain: update when migrations change.

## Tables
<!-- Key tables, relationships, constraints -->

## Migrations
<!-- Migration format, naming, tooling -->

## Indexes
<!-- Key indexes and their purpose -->
```

**d) `auth-and-sessions.md`** — auth system
**e) `frontend-state.md`** — frontend architecture (state, routing, data fetching)
**f) `deployment.md`** — deploy process, environments, CI/CD
**g) `api-contracts.md`** — external API integrations
**h) `data-flow.md`** — key data flows through the system

- [ ] **Step 3: Create README for templates**

`packages/core/docs-templates/README.md`:
```markdown
# Architecture Doc Templates

Copy these to your project's `docs/architecture/` directory and fill in the TODOs.

## Which templates to use

| Template | Use when your project has... |
|----------|----------------------------|
| backend-layers | Any backend (Go, Node, Python, Rust) |
| api-reference | REST/GraphQL API endpoints |
| database-schema | SQL database with migrations |
| auth-and-sessions | Authentication system |
| frontend-state | Frontend app (React, Vue, Svelte) |
| deployment | Production deployment process |
| api-contracts | External API integrations |
| data-flow | Complex multi-step data flows |

Delete templates that don't apply. Add custom ones as needed.
```

- [ ] **Step 4: Commit**
```bash
git add packages/core/docs-templates/
git commit -m "feat(core): add 8 architecture doc templates"
```

---

## Task 2: Create tree-generator agent

**Files:**
- Create: `packages/core/agents/tree-generator.md`

- [ ] **Step 1: Create agent**

Agent that auto-generates project tree documentation:

```markdown
---
name: tree-generator
description: Generate project directory tree documentation — auto-detect structure, filter noise, output clean markdown trees
model: sonnet
allowed-tools: Bash, Read, Glob, Write
---

# Tree Generator

Generate clean, annotated project tree files for documentation.

## Process

### Step 1: Detect project structure
- Find root markers: go.mod, package.json, Cargo.toml, pyproject.toml
- Identify major directories (src/, backend/, frontend/, etc.)

### Step 2: Generate tree for each component
Run `tree` or `find` with smart exclusions:
- Exclude: node_modules, .git, __pycache__, vendor, dist, build, .next
- Exclude: binary files, images, fonts
- Max depth: 4 levels (configurable)

### Step 3: Annotate key directories
Add inline comments for important directories:
```
src/
├── api/          # API client functions
├── components/   # Reusable UI components
├── hooks/        # Custom React hooks
└── pages/        # Page components (routing)
```

### Step 4: Write to docs/trees/
- `tree-monorepo.md` — full project overview (depth 2)
- `tree-{component}.md` — per-component deep tree (depth 4)

## Output Format
Each file starts with generation date and command used.
Use markdown code blocks with annotations.
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/agents/tree-generator.md
git commit -m "feat(core): add tree-generator agent"
```

---

## Task 3: Create docs-init command

**Files:**
- Create: `packages/core/commands/docs-init.md`

- [ ] **Step 1: Create command**

New slash command that scaffolds the full documentation structure:

```markdown
---
description: Initialize project documentation — architecture docs, trees, and update rules
argument-hint: "[minimal|standard|full]"
allowed-tools: Bash, Read, Write, Glob, Agent
---

# Initialize Project Documentation

Scaffold documentation structure for the project.

## Modes

Parse $ARGUMENTS:
- **minimal** — just docs/architecture/ dir + README
- **standard** (default) — architecture templates + tree generation
- **full** — architecture + trees + OpenAPI stub + changelog

## Steps

### 1. Create directories
```bash
mkdir -p docs/architecture docs/trees
```

### 2. Copy relevant architecture templates
Based on project detection:
- Has go.mod? → copy backend-layers, api-reference, database-schema
- Has package.json + src/? → copy frontend-state
- Has migrations/? → copy database-schema
- Has Dockerfile? → copy deployment
- Always copy: auth-and-sessions, data-flow

### 3. Generate project trees
Dispatch tree-generator agent to create initial tree files.

### 4. Update CLAUDE.md / AGENTS.md
Add "Architecture Reference" section pointing to created docs.
Add "Mandatory Documentation Updates" checklist.

$ARGUMENTS
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/commands/docs-init.md
git commit -m "feat(core): add /docs-init command for documentation scaffolding"
```

---

## Task 4: Create documentation-update rule

**Files:**
- Create: `packages/core/rules/documentation.md`

- [ ] **Step 1: Create rule**

```markdown
---
alwaysApply: true
---

# Documentation Updates

## Mandatory Rule
Code changes that affect logic, API, architecture, or database schema MUST include
documentation updates in the same response. Code without updated docs = incomplete task.

## When to update docs

| Change Type | Required Doc Updates |
|------------|---------------------|
| New/changed API endpoint | api-reference.md, OpenAPI spec (if exists) |
| New migration / schema change | database-schema.md |
| Auth flow change | auth-and-sessions.md |
| New service / layer change | backend-layers.md |
| Frontend screen / state change | frontend-state.md |
| File structure change | docs/trees/ (regenerate) |

## When docs are NOT needed
- Pure refactors (no behavior change)
- Bug fixes in existing documented behavior
- Test-only changes
- Dependency updates (unless API changes)

## Checklist (after any code change)
1. Did I change an API endpoint? → update api-reference.md
2. Did I add/change a DB table/column? → update database-schema.md
3. Did I change auth/session logic? → update auth-and-sessions.md
4. Did I add/remove files? → regenerate project trees
5. Did I change architecture? → update relevant docs/architecture/ files
```

- [ ] **Step 2: Update core rules count**

Now 4 rules: coding-style, security, git-workflow, documentation.

- [ ] **Step 3: Commit**
```bash
git add packages/core/rules/documentation.md
git commit -m "feat(core): add documentation-update enforcement rule"
```

---

## Task 5: Update CLAUDE.md template

**Files:**
- Modify: `packages/core/CLAUDE.md`

- [ ] **Step 1: Add Architecture Reference section**

```markdown
## Architecture Reference

> Fill in after running `/docs-init`. These are contracts — update when code changes.

| Doc | Description |
|-----|-------------|
| `docs/architecture/backend-layers.md` | TODO: Layers, DI, error handling |
| `docs/architecture/api-reference.md` | TODO: All endpoints |
| `docs/architecture/database-schema.md` | TODO: Tables, migrations |
| `docs/architecture/auth-and-sessions.md` | TODO: Auth flow |
| `docs/architecture/frontend-state.md` | TODO: State, routing, data |
| `docs/trees/tree-monorepo.md` | TODO: Project structure |

## Mandatory Documentation Updates

**Rule:** code changes that affect logic/API/architecture MUST include doc updates
in the same response. Code without updated docs = incomplete task.

### Checklist
1. **Architecture docs** (`docs/architecture/`) — update affected files
2. **Project trees** (`docs/trees/`) — update if file structure changed
3. **This file** (CLAUDE.md) — update Active Plans, counts, constraints
4. **OpenAPI spec** — update if API endpoints changed
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/CLAUDE.md
git commit -m "feat(core): add architecture reference and mandatory doc updates to CLAUDE.md template"
```

---

## Task 6: Enhance docs-checker agent

**Files:**
- Modify: `packages/core/agents/docs-checker.md`

- [ ] **Step 1: Add tree staleness check**

Add to docs-checker checklist:
- Check if `docs/trees/` files exist
- Compare tree file modification dates vs recent code changes
- If code structure changed (new dirs, deleted files) but trees not updated → flag as STALE

- [ ] **Step 2: Add architecture template coverage check**

Add check: scan `docs/architecture/` — are there docs covering the project's main components?
- Backend exists but no backend-layers.md? → WARN: missing architecture doc
- Migrations exist but no database-schema.md? → WARN: missing schema doc

- [ ] **Step 3: Commit**
```bash
git add packages/core/agents/docs-checker.md
git commit -m "feat(core): enhance docs-checker with tree staleness and coverage checks"
```

---

## Task 7: Update setup.sh

**Files:**
- Modify: `setup.sh`

- [ ] **Step 1: Add docs scaffolding option**

After skills installation, add:
```bash
echo ""
read -rp "Initialize documentation structure? [y/N] " docs_yn
if [[ "$docs_yn" =~ ^[Yy] ]]; then
  mkdir -p "$PROJECT_DIR/docs/architecture" "$PROJECT_DIR/docs/trees"
  # Copy relevant templates based on detected stack
  for tmpl in "$PACKAGES/core/docs-templates/architecture/"*.md; do
    copy_file "$tmpl" "$PROJECT_DIR/docs/architecture/$(basename "$tmpl")"
  done
  info "Created docs/architecture/ with $(ls "$PROJECT_DIR/docs/architecture/"*.md | wc -l | tr -d ' ') templates"
  info "Run /docs-init in Claude Code to customize and generate trees"
fi
```

- [ ] **Step 2: Commit**
```bash
git add setup.sh
git commit -m "feat: add documentation scaffolding to setup.sh"
```

---

## Task 8: Add guide chapter

**Files:**
- Create: `docs/guide/11-documentation-architecture.md`

- [ ] **Step 1: Write chapter**

Content:
- Why documentation matters for AI-assisted development (Claude reads docs!)
- Architecture docs: what to document, what to skip
- Project trees: auto-generation with tree-generator agent
- Documentation-update rule: mandatory doc updates
- docs-checker agent: finding stale docs
- /docs-init command: scaffolding from templates
- Stop hook: verification before session end
- The full loop: code change → doc update → docs-checker → Stop verification

- [ ] **Step 2: Update README.md guide table**

Add chapter 11 to the documentation table in README.

- [ ] **Step 3: Commit**
```bash
git add docs/guide/11-documentation-architecture.md README.md
git commit -m "docs: add documentation architecture guide (chapter 11)"
```

---

## Task 9: Update summary numbers

**Files:**
- Modify: `README.md` — update counts
- Modify: `docs/guide/01-getting-started.md` — update verification counts

- [ ] **Step 1: Update counts everywhere**

After this plan:
- Core agents: 16 → **17** (+tree-generator)
- Core commands: 8 → **9** (+docs-init)
- Core rules: 3 → **4** (+documentation)
- Doc templates: 0 → **8**
- Guide chapters: 9 → **11** (+codex ch10, +docs ch11)

- [ ] **Step 2: Commit**
```bash
git add README.md docs/guide/01-getting-started.md
git commit -m "docs: update component counts after Plan 6"
```

---

## Summary

| Deliverable | Files |
|-------------|-------|
| Architecture doc templates (8) | `packages/core/docs-templates/architecture/` |
| tree-generator agent | `packages/core/agents/tree-generator.md` |
| /docs-init command | `packages/core/commands/docs-init.md` |
| documentation rule | `packages/core/rules/documentation.md` |
| CLAUDE.md template update | `packages/core/CLAUDE.md` |
| docs-checker enhancement | `packages/core/agents/docs-checker.md` |
| setup.sh docs option | `setup.sh` |
| Guide chapter 11 | `docs/guide/11-documentation-architecture.md` |
| README + counts update | `README.md`, `01-getting-started.md` |
| **Total new/modified** | **~15 files** |

### Updated superkit totals (after Plan 6)

| Component | Before | After |
|-----------|:------:|:-----:|
| Core agents | 16 | **17** |
| Core commands | 8 | **9** |
| Core rules | 3 | **4** |
| Doc templates | 0 | **8** |
| Guide chapters | 9 | **11** |
| Stack agents | 4 | 4 |
| Extras | 2 | 2 |
| Skills | 3 | 3 |
