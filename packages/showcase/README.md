# TGApp -- Production Showcase

This is a sanitized copy of a real production Claude Code setup from a Telegram dating mini app.

## Stats
- **21 agents** (quality reviewers, audit agents, productivity generators, DevOps validators, discovery)
- **14 commands** (orchestrators, service management, development workflow)
- **11 hooks** (7 PostToolUse + PreToolUse + UserPromptSubmit + PreCompact + SessionStart + Stop)
- **11 skills** (architecture, patterns, conventions, UI standards, state management)
- **3 rules** (coding-style, security, git-workflow)

## What makes this interesting
- 47-check security scanner with dating-app + Telegram-specific checks
- Moderation pipeline agents (snapshot-based content moderation)
- Bot reviewer with 22 Telegram-specific checks (callback data, state machines, rate limits)
- ONYX design system reviewer (custom glassmorphism UI)
- 8-phase `/dev` orchestrator dispatching 5+ agents per feature
- `/review` orchestrator that auto-detects changed files and dispatches the right reviewers in parallel
- `/audit` orchestrator running 4 specialized audit agents simultaneously
- Hook profiles (`fast`/`standard`/`strict`) for different workflow speeds
- SHA256 hash cache in typecheck hook (skips re-check if file unchanged)
- UserPromptSubmit hook that injects git context and suggests relevant agents
- Stop hook (LLM-based) that verifies compilation and doc freshness before session end

## Directory Structure

```
.claude/
  agents/                  # 21 agents
    go-reviewer.md         # Go code review (layers, DI, error handling, SQL safety)
    ts-reviewer.md         # TypeScript/React review (TanStack Query, Zustand, ONYX design)
    migration-reviewer.md  # SQL migration review (naming, rollback, constraints)
    onyx-ui-reviewer.md    # UI review (glassmorphism design system, z-index layers)
    bot-reviewer.md        # Telegram bot review (22 checks: callbacks, state machines, rate limits)
    security-scanner.md    # 47-check security scanner (OWASP + dating-app + Telegram + photo)
    test-generator.md      # Go table-driven test generator with edge case heuristics
    playwright-test-gen.md # Playwright e2e test generator for admin panel
    pre-deploy-validator.md # 9-point pre-deploy checklist
    api-contract-sync.md   # OpenAPI spec <-> routes.go sync checker
    debug-observer.md      # Production debugger (logs + DB + Redis + code trace)
    dependency-checker.md  # npm/Go dependency audit with prioritized update plan
    health-checker.md      # Project health dashboard (9 checks)
    docs-checker.md        # Documentation freshness checker
    scaffold-endpoint.md   # New endpoint scaffolding (handler + service + repo)
    audit-frontend.md      # 15 frontend checks (hardcoded values, mock data, TypeScript)
    audit-backend.md       # 15 backend checks (SQL safety, error handling, PII leaks)
    audit-bots.md          # 12 bot checks (goroutine safety, rate limits, callbacks)
    audit-security.md      # 12 security checks (secrets, CORS, photo URLs, phone isolation)
    content-curator.md     # Promotional content and seasonal events
    events-discovery.md    # Venue/event discovery via web search

  commands/                # 14 commands
    dev.md                 # 8-phase development orchestrator (understand -> document)
    review.md              # Unified code review orchestrator (parallel agent dispatch)
    audit.md               # 4-agent parallel audit orchestrator
    commit.md              # Conventional commit helper with secret scanning
    start.md               # Start full local stack
    stop.md                # Stop services (keep Docker)
    stop-docker.md         # Stop everything including Docker
    run-admin.md           # Admin panel launcher (live/demo/final modes)
    stop-admin.md          # Stop admin panel
    lint.md                # Run linters (Go + TypeScript)
    test.md                # Run tests (Go + Playwright)
    migrate.md             # Database migration runner
    new-migration.md       # Migration file generator
    seed-reset.md          # Demo data seeder

  rules/                   # 3 rules (always-active context)
    coding-style.md        # Go + TypeScript conventions
    security.md            # SQL injection, XSS, secrets, auth, CORS
    git-workflow.md        # Conventional commits, branch naming, no force push

  scripts/hooks/           # 10 hook scripts
    block-dangerous-git.sh # PreToolUse: blocks --no-verify, --force, reset --hard
    typecheck-on-edit.sh   # PostToolUse: tsc --noEmit with SHA256 hash cache
    format-on-edit.sh      # PostToolUse: gofmt -w on .go files
    go-vet-on-edit.sh      # PostToolUse: go vet (strict profile only)
    console-log-warning.sh # PostToolUse: warns on console.log in .ts/.tsx
    migration-safety.sh    # PostToolUse: validates migration naming + down.sql exists
    bundle-import-check.sh # PostToolUse: warns on new imports not in package.json
    user-prompt-context.sh # UserPromptSubmit: injects git context + agent suggestions
    pre-compact-save.sh    # PreCompact: saves context before compaction
    session-context-restore.sh # SessionStart: restores context on new session

  scripts/                 # Service management (stubbed)
    start.sh               # Stub -- replace with your start script
    stop.sh                # Stub -- replace with your stop script
    stop-docker.sh         # Stub -- replace with your stop-docker script

  skills/                  # 11 knowledge skills
    project-architecture/  # System overview, module map, data flows
    api-conventions/       # REST patterns, error format, middleware chain
    db-patterns/           # pgx usage, migrations, repository layer
    admin-auth-guide/      # JWT + TOTP + session lifecycle
    frontend-patterns/     # Mock/live API layer, page structure, hooks
    frontend-state-management/ # TanStack Query, Zustand, IndexedDB, multi-account
    onyx-ui-standard/      # Color palette, glass effects, layout standard
    tg-miniapp/            # Safe areas, BackButton, fixed positioning in TG WebApp
    pagination-and-filtering/ # Cursor pagination, LIMIT+1, infinite queries
    writing-agents/        # How to write agents (meta-skill)
    writing-commands/       # How to write commands (meta-skill)

  settings.json            # Hook wiring, permissions, plugins
  settings.local.json      # Local permission overrides

CLAUDE.md                  # Root project instructions (sanitized)
```

## How to explore

1. **Start with agents** -- read `go-reviewer.md` for the 2-phase review pattern, then `security-scanner.md` for a comprehensive 47-check example
2. **Study the orchestrators** -- `commands/dev.md` shows how to coordinate 8 phases with multiple agent dispatches
3. **Understand hooks** -- `scripts/hooks/typecheck-on-edit.sh` demonstrates hash caching, and `settings.json` shows how they're wired
4. **Read the skills** -- `skills/writing-agents/SKILL.md` and `skills/writing-commands/SKILL.md` explain the meta-patterns
5. **Check the rules** -- `rules/security.md` shows how always-active rules differ from on-demand agents

## Adapting for Your Project

To use these patterns in your own project:

1. Copy the `.claude/` structure
2. Replace agent checklists with your project's conventions
3. Update command paths to match your project layout
4. Modify hook scripts for your tech stack (e.g., replace `gofmt` with your formatter)
5. Write skills documenting your project's architecture and patterns
6. Replace stub scripts (`start.sh`, `stop.sh`) with your service management

The patterns (2-phase review, severity/confidence, orchestrator dispatch, hook profiles) are universal -- only the checklist items and file paths are project-specific.
