# Superkit Context-Aware Agents — Implementation Plan (Plan 7)

> Add Phase 0 "Read Project Context" to all review/audit agents so they dynamically adapt to each project's architecture.

**Goal:** Every agent reads project documentation (`docs/architecture/`, `CLAUDE.md`) before starting review. This makes generic superkit agents understand the specific project they're working in — layer rules, API contracts, DB schema, conventions.

**Problem:** Currently agents have rules hardcoded in their prompts. This works for TGApp (rules are TGApp-specific), but generic superkit agents need to DISCOVER project rules from docs. Without Phase 0, a code-reviewer doesn't know if the project uses 3-layer or hexagonal architecture, what error handling pattern is standard, or which endpoints require auth.

**Working directory:** `/Users/ivankudzin/cursor/claude-code-superkit/`

---

## The Pattern: Phase 0

Every review/audit agent gets a new first phase:

```markdown
## Phase 0: Load Project Context

Before starting the review, read available project documentation to understand
architecture, conventions, and constraints. Skip files that don't exist.

**Required reads (if exist):**
1. `CLAUDE.md` (or `AGENTS.md`) — project overview, conventions, key commands
2. Relevant `docs/architecture/*.md` — architecture-specific docs (see mapping below)

**Doc mapping for this agent:**
- [agent-specific list of which docs to read]

**If no docs exist:** Fall back to codebase exploration:
- Read README.md for project overview
- Grep for patterns (imports, directory structure, config files)
- Infer conventions from existing code

**Output:** Mental model of project architecture. Use this to inform
Phase 1 (Checklist) and Phase 2 (Deep Analysis). Flag any review item
that contradicts project docs as higher confidence.
```

---

## Task 1: Update code-reviewer — Phase 0

**Files:**
- Modify: `packages/core/agents/code-reviewer.md`

- [ ] **Step 1: Add Phase 0 before Phase 1**

```markdown
## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` / `AGENTS.md` — conventions, tech stack, key patterns
2. `docs/architecture/backend-layers.md` — layer rules, DI pattern, error handling
3. `docs/architecture/data-flow.md` — how data moves through the system

Use this to calibrate:
- What layers exist? (handler→service→repo? controller→service→model? hexagonal?)
- What DI pattern? (constructor injection? container? global?)
- What error handling pattern? (domain errors? exceptions? Result types?)
- Are there explicit "NEVER do X" rules?

If code violates a documented convention → CRITICAL (HIGH confidence).
If code violates a common pattern but no docs exist → WARNING (MEDIUM confidence).
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/agents/code-reviewer.md
git commit -m "feat(core): add Phase 0 context loading to code-reviewer"
```

---

## Task 2: Update security-scanner — Phase 0

**Files:**
- Modify: `packages/core/agents/security-scanner.md`

- [ ] **Step 1: Add Phase 0**

```markdown
## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` / `AGENTS.md` — auth mechanism, known public endpoints
2. `docs/architecture/auth-and-sessions.md` — auth flow, token format, session management
3. `docs/architecture/api-reference.md` — which endpoints exist, which require auth

Use this to:
- Know which endpoints are INTENTIONALLY public (don't flag as auth bypass)
- Understand session mechanism (JWT? cookies? API keys?)
- Know payment flow (idempotency requirements)
- Identify sensitive data fields the project stores
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/agents/security-scanner.md
git commit -m "feat(core): add Phase 0 context loading to security-scanner"
```

---

## Task 3: Update migration-reviewer — Phase 0

**Files:**
- Modify: `packages/core/agents/migration-reviewer.md`

- [ ] **Step 1: Add Phase 0**

```markdown
## Phase 0: Load Project Context

Read if exists:
1. `docs/architecture/database-schema.md` — existing tables, constraints, conventions
2. Latest 3 migration files — understand naming/numbering pattern

Use this to:
- Know existing table names (avoid conflicts)
- Understand FK conventions (CASCADE vs RESTRICT)
- Check if new migration breaks documented schema invariants
- Verify migration number is sequential (no gaps, no duplicates)
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/agents/migration-reviewer.md
git commit -m "feat(core): add Phase 0 context loading to migration-reviewer"
```

---

## Task 4: Update api-contract-sync — Phase 0

**Files:**
- Modify: `packages/core/agents/api-contract-sync.md`

- [ ] **Step 1: Add Phase 0**

```markdown
## Phase 0: Load Project Context

Read if exists:
1. `docs/architecture/api-reference.md` — documented endpoints catalog
2. OpenAPI/Swagger spec file (auto-detect: openapi.yaml, swagger.json, api.yaml)
3. Routes registration file (auto-detect by framework)

Use this to:
- Know documented vs actual endpoints
- Understand API versioning scheme (/v1/, /api/, etc.)
- Know auth requirements per endpoint group
- Detect DTO naming conventions
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/agents/api-contract-sync.md
git commit -m "feat(core): add Phase 0 context loading to api-contract-sync"
```

---

## Task 5: Update audit-backend — Phase 0

**Files:**
- Modify: `packages/core/agents/audit-backend.md`

- [ ] **Step 1: Add Phase 0**

```markdown
## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` / `AGENTS.md` — conventions, forbidden patterns
2. `docs/architecture/backend-layers.md` — layer rules, error wrapping format
3. `docs/architecture/database-schema.md` — large tables (flag unbounded SELECT)

Use this to:
- Know error wrapping convention (fmt.Errorf pattern? custom error types?)
- Know which tables are large (require LIMIT in queries)
- Know which endpoints should be auth-protected
- Know PII fields specific to this project
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/agents/audit-backend.md
git commit -m "feat(core): add Phase 0 context loading to audit-backend"
```

---

## Task 6: Update audit-frontend — Phase 0

**Files:**
- Modify: `packages/core/agents/audit-frontend.md`

- [ ] **Step 1: Add Phase 0**

```markdown
## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` / `AGENTS.md` — frontend stack, conventions
2. `docs/architecture/frontend-state.md` — state management, routing, data fetching patterns

Use this to:
- Know state management library (Redux? Zustand? TanStack Query? Signals?)
- Know routing approach (React Router? file-based? state-based?)
- Know design system / component library in use
- Know query key conventions (centralized? inline?)
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/agents/audit-frontend.md
git commit -m "feat(core): add Phase 0 context loading to audit-frontend"
```

---

## Task 7: Update scaffold-endpoint — Phase 0

**Files:**
- Modify: `packages/core/agents/scaffold-endpoint.md`

- [ ] **Step 1: Add Phase 0**

```markdown
## Phase 0: Load Project Context

Read if exists:
1. `docs/architecture/backend-layers.md` — understand layer structure before scaffolding
2. `docs/architecture/api-reference.md` — see existing endpoint patterns
3. `docs/architecture/database-schema.md` — understand DB conventions

Use this to:
- Scaffold NEW endpoint that matches EXISTING patterns exactly
- Use correct error handling, auth middleware, response format
- Follow naming conventions from docs
- If no docs → read 2-3 existing endpoints as reference (current behavior)
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/agents/scaffold-endpoint.md
git commit -m "feat(core): add Phase 0 context loading to scaffold-endpoint"
```

---

## Task 8: Update test-generator — Phase 0

**Files:**
- Modify: `packages/core/agents/test-generator.md`

- [ ] **Step 1: Add Phase 0**

```markdown
## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` / `AGENTS.md` — testing conventions, required test patterns
2. Existing test files in the same package — match style exactly

Use this to:
- Match existing test naming ("should X when Y" vs "TestXxx" vs "test_xxx")
- Match mock patterns (interface mocks? test doubles? httptest servers?)
- Match assertion library (testify? stdlib? custom?)
- Know which edge cases are project-specific (e.g., expired locks, rate limits)
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/agents/test-generator.md
git commit -m "feat(core): add Phase 0 context loading to test-generator"
```

---

## Task 9: Update health-checker — Phase 0

**Files:**
- Modify: `packages/core/agents/health-checker.md`

- [ ] **Step 1: Add Phase 0**

```markdown
## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` / `AGENTS.md` — key commands, migration format, known constraints

Use this to:
- Know exact test command (not just auto-detect)
- Know migration directory and numbering scheme
- Know documentation locations to check freshness
- Know build commands and expected output
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/agents/health-checker.md
git commit -m "feat(core): add Phase 0 context loading to health-checker"
```

---

## Task 10: Update remaining agents — Phase 0

**Files:**
- Modify: `packages/core/agents/audit-infra.md`
- Modify: `packages/core/agents/debug-observer.md`
- Modify: `packages/core/agents/dependency-checker.md`
- Modify: `packages/core/agents/pre-deploy-validator.md`
- Modify: `packages/core/agents/ui-reviewer.md`
- Modify: `packages/core/agents/e2e-test-generator.md`
- Modify: `packages/core/agents/docs-checker.md`

- [ ] **Step 1: Add Phase 0 to each**

Each gets a minimal Phase 0 reading `CLAUDE.md`/`AGENTS.md` + their relevant architecture doc:

| Agent | Reads |
|-------|-------|
| audit-infra | CLAUDE.md, deployment.md |
| debug-observer | CLAUDE.md, backend-layers.md, database-schema.md |
| dependency-checker | CLAUDE.md (for known version constraints) |
| pre-deploy-validator | CLAUDE.md (commands, migration format, build commands) |
| ui-reviewer | CLAUDE.md, frontend-state.md |
| e2e-test-generator | CLAUDE.md, frontend-state.md (know screens to test) |
| docs-checker | CLAUDE.md (know which docs SHOULD exist) |

- [ ] **Step 2: Commit**
```bash
git add packages/core/agents/audit-infra.md packages/core/agents/debug-observer.md \
  packages/core/agents/dependency-checker.md packages/core/agents/pre-deploy-validator.md \
  packages/core/agents/ui-reviewer.md packages/core/agents/e2e-test-generator.md \
  packages/core/agents/docs-checker.md
git commit -m "feat(core): add Phase 0 context loading to 7 remaining agents"
```

---

## Task 11: Update stack agents — Phase 0

**Files:**
- Modify: `packages/stack-agents/go/go-reviewer.md`
- Modify: `packages/stack-agents/typescript/ts-reviewer.md`
- Modify: `packages/stack-agents/python/py-reviewer.md`
- Modify: `packages/stack-agents/rust/rs-reviewer.md`

- [ ] **Step 1: Add Phase 0 to each stack reviewer**

| Agent | Additional reads |
|-------|-----------------|
| go-reviewer | backend-layers.md (Go-specific: interface DI, error wrapping format) |
| ts-reviewer | frontend-state.md (TS-specific: state lib, component patterns) |
| py-reviewer | backend-layers.md (Python-specific: FastAPI/Django patterns) |
| rs-reviewer | backend-layers.md (Rust-specific: error handling, module structure) |

- [ ] **Step 2: Commit**
```bash
git add packages/stack-agents/
git commit -m "feat(stack): add Phase 0 context loading to 4 stack reviewers"
```

---

## Task 12: Update extras — Phase 0

**Files:**
- Modify: `packages/extras/bot-reviewer.md`
- Modify: `packages/extras/design-system-reviewer.md`

- [ ] **Step 1: Add Phase 0**

| Agent | Reads |
|-------|-------|
| bot-reviewer | CLAUDE.md (bot architecture, callback format, state machine docs) |
| design-system-reviewer | CLAUDE.md, frontend-state.md, project's design tokens file |

- [ ] **Step 2: Commit**
```bash
git add packages/extras/
git commit -m "feat(extras): add Phase 0 context loading to bot-reviewer and design-system-reviewer"
```

---

## Task 13: Update /dev and /review commands

**Files:**
- Modify: `packages/core/commands/dev.md`
- Modify: `packages/core/commands/review.md`

- [ ] **Step 1: Update /dev Phase 1**

Add explicit instruction: "Read `docs/architecture/` files relevant to the task scope BEFORE planning."

- [ ] **Step 2: Update /review agent dispatch**

Add: "When dispatching agents, include in each prompt: 'Read project docs in Phase 0 before starting your review.'"

- [ ] **Step 3: Commit**
```bash
git add packages/core/commands/dev.md packages/core/commands/review.md
git commit -m "feat(core): add docs-reading instructions to /dev and /review commands"
```

---

## Task 14: Update writing-agents skill

**Files:**
- Modify: `packages/core/skills/writing-agents/SKILL.md`

- [ ] **Step 1: Add Phase 0 section to the guide**

In the "Standard 2-Phase Review Process" section, update to "3-Phase":

```markdown
## Standard 3-Phase Review Process

### Phase 0: Load Project Context (NEW — required for all agents)
Read CLAUDE.md/AGENTS.md + relevant docs/architecture/ files.
This makes the agent context-aware for the specific project.

### Phase 1: Checklist (quick scan)
Now informed by project docs — flag violations of DOCUMENTED conventions
as higher confidence.

### Phase 2: Deep Analysis (think step by step)
Use project context to assess cross-component impact.
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/skills/writing-agents/SKILL.md
git commit -m "docs(core): update writing-agents skill with Phase 0 pattern"
```

---

## Summary

| What | Count | Description |
|------|:-----:|-------------|
| Core agents updated | 16 | All 16 get Phase 0 |
| Stack agents updated | 4 | go/ts/py/rs reviewers |
| Extras updated | 2 | bot-reviewer, design-system-reviewer |
| Commands updated | 2 | /dev, /review |
| Skills updated | 1 | writing-agents |
| **Total files modified** | **25** | |

### Impact

Before Plan 7: Agents work in a vacuum — rules hardcoded, no project awareness.
After Plan 7: Every agent reads project docs first — **context-aware review** that adapts to any project's architecture, conventions, and constraints.

### Confidence boost

| Situation | Before | After |
|-----------|--------|-------|
| Code violates documented convention | WARNING/MEDIUM | **CRITICAL/HIGH** |
| Code violates common pattern, no docs | WARNING/MEDIUM | WARNING/MEDIUM (unchanged) |
| New endpoint doesn't match existing patterns | SUGGESTION/LOW | **WARNING/HIGH** (knows patterns from docs) |
| Auth missing on endpoint | WARNING/MEDIUM | **CRITICAL/HIGH** (knows from api-reference which need auth) |
