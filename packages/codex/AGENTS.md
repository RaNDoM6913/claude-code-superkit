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

## Approval Rules

This kit ships `rules/default.rules` — a Codex CLI approval policy that
declares allow / prompt / forbidden decisions for common commands.

**Install:** copy `packages/codex/rules/default.rules` to `~/.codex/rules/default.rules`
(or your project's local `.codex/rules/`) so Codex CLI picks it up.

**Format (Starlark-like DSL):**

```
prefix_rule(
    pattern = ["git", "push"],
    decision = "allow",
    justification = "Globally approved; force-push is handled by more specific rule.",
)
```

**Decisions:**
- `allow` — Codex executes silently
- `prompt` — Codex asks before executing
- `forbidden` — Codex refuses to execute

**Coverage:**
- Destructive system calls (`rm -rf /`, `sudo`, `dd`, `mkfs`, `shutdown`) → forbidden
- Git / gh CLI / npm / pnpm / yarn / pip / cargo / go → mostly allowed
- Force-push, hard reset, `git clean -fdx` → prompt
- Docker / kubectl reads → allowed; deletes / prune → prompt
- Systemd / pm2 / supervisorctl start/stop/restart/reload → allowed
- Systemd enable/disable/mask → prompt
- Nginx / Caddy / Apache config check + reload → allowed
- `chmod`, `chown` → prompt
- Pipe to bash from curl/wget → forbidden

**Customization:** more-specific patterns take precedence. Add project-local
rules in your own `rules/` file alongside `default.rules`.

Adapted from VKirill/codex-starter-kit (MIT). See `packages/codex/rules/default.rules`
for the complete ruleset.

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

**HARD RULE**: Code changes affecting logic, API, architecture, or behavior MUST include documentation updates **IN THE SAME RESPONSE** as the code. Code without updated docs = **INCOMPLETE TASK**. NEVER defer docs to "later" or "next commit".

### Pre-Commit Checklist (15 points):

Before EVERY commit, check if any apply:

1. **API changed?** -> update `docs/architecture/backend-api-reference.md` + OpenAPI spec
2. **Frontend behavior changed?** -> update `docs/architecture/frontend-state-contracts.md`
3. **Onboarding changed?** -> update `docs/architecture/frontend-onboarding-flow.md`
4. **DB schema changed?** -> update `docs/architecture/database-schema.md`
5. **Files created/deleted/moved?** -> update `docs/trees/` (relevant tree file)
6. **Backend layers/DI changed?** -> update `docs/architecture/backend-layers.md`
7. **Auth/sessions changed?** -> update `docs/architecture/auth-and-sessions.md`
8. **Feed algorithm changed?** -> update `docs/architecture/feed-and-antiabuse.md`
9. **Moderation flow changed?** -> update `docs/architecture/moderation-pipeline.md`
10. **Bot behavior changed?** -> update `docs/architecture/bot-moderator.md` or `bot-support.md`
11. **Architecture docs** (`docs/architecture/`) — update affected files
12. **AGENTS.md** — update Active Plans, Project Structure, Known Constraints
13. **README files** — update all affected READMEs
14. **Project trees** (`docs/trees/`) — update on ANY file structure changes
15. **OpenAPI spec** — update on API endpoint changes

If ANY answer is YES -> update docs BEFORE committing.

### When NOT needed
- Pure refactors (no behavior change)
- Test-only changes
- Config/env changes
- Typo fixes

### 4-Layer Enforcement

1. **AGENTS.md (this file)** — Codex reads this on every session. Primary mechanism.
2. **Pre-commit checklist (above)** — 15-point check before every commit.
3. **docs-reviewer skill** — run inline by dev-orchestrator in Phase 14 (Document) to verify completeness.
4. **Plan completion gate** — plans are NOT complete until docs are updated.

Do NOT rely on a single layer — update docs proactively with every code change.

## Model Configuration

This project uses **gpt-5.5** with **xhigh** reasoning effort (maximum accuracy). All skills inherit this from `.codex/config.toml`. Do NOT downgrade the model or reasoning level — maximum performance is required for code review, security scanning, and test generation.

Note: Claude Code (Opus 4.8) also supports `high`/`xhigh`/`max` effort levels, so the effort concept is cross-CLI — not Codex-only.

## Codex-Specific Notes

### Skill Execution (Codex has no subagents)
- Codex has no subagent runtime. When an orchestrator skill says "perform X following the `<name>` skill", read `.codex/skills/<name>/SKILL.md` and execute its process inline yourself, then apply its verdict exactly as that skill defines it.
- Run one referenced skill at a time. Keep each inline pass self-contained and do not overlap file scopes across passes.

### Planning
- Use `update_plan` for tracking progress

### Skills
- Skills auto-activate based on description matching
- Invoke skills by describing the task that matches the skill description
- Orchestrator skills execute the skills they reference inline (see Skill Execution above) — there is no parallel subagent dispatch

### Local Tool Mapping
- Search files with `rg` / `rg --files`
- Run shell checks with `exec_command`
- Edit files with `apply_patch` unless using a mechanical formatter or bulk rewrite

### Available Skills

Skills are located in `.codex/skills/` directories. Each skill has a `SKILL.md` with its description and instructions.

**Command skills (user-invocable):**

| Skill | Description |
|-------|-------------|
| `dev-orchestrator` | 16-phase development cycle: read-docs, understand, architect, pseudocode, plan, contract, validate, implement, evaluate, verify, test, verify-goals, review, critic, document, report |
| `review-orchestrator` | Detect changes, dispatch reviewer agents, collect and deduplicate findings |
| `audit-orchestrator` | Parallel audit: frontend, backend, infra, security |
| `test-runner` | Auto-detect and run project tests (Go, TS, Python, Rust) |
| `lint-runner` | Auto-detect and run project linters with optional --fix |
| `commit-helper` | Conventional commit: analyze changes, detect secrets, create commit |
| `new-migration` | Scaffold migration file pair (up + down) with auto-numbering |
| `migrate` | Apply or rollback database migrations |
| `benchmark` | Run Go benchmarks with benchstat comparison |

**Agent skills (auto-dispatched by orchestrators):**
ai-slop-cleaner, api-contract-sync, architect, audit-backend, audit-frontend, audit-infra, behavioral-nudge-engine, bot-reviewer, code-reviewer, codebase-onboarding-engineer, comment-rot-analyzer, critic, database-reviewer, debug-observer, dependency-checker, design-system-reviewer, docs-reviewer, e2e-test-generator, evaluator, goal-verifier, health-checker, migration-reviewer, minimal-change-engineer, plan-checker, pre-deploy-validator, project-architecture, reality-checker, scaffold-endpoint, security-scanner, silent-failure-hunter, test-generator, tree-generator, ui-reviewer, visual-reviewer, writing-agents, writing-commands

**Production skills (auto-activated by description matching):**
telegram-bot-builder, nextjs-supabase-auth, drizzle-orm-expert, ru-text, postgresql-optimization, redis-patterns

**GAN harness skills (auto-activated; optional package, requires Playwright):**
gan-planner, gan-generator, gan-evaluator

**Frontend 3D skills (optional, for R3F/Three.js/GSAP projects):**

| Skill | Category |
|-------|----------|
| `presentation-reviewer` | Quality — scroll-driven presentation sections (GSAP ScrollTrigger, phone frames, 3D textures) |
| `r3f-scene-reviewer` | Quality — React Three Fiber / Three.js code (color management, GLB, useFrame, disposal) |
| `ui-design-reviewer` | Quality — anti-slop UI review (typography, color, layout, motion, interactive states) |
| `frontend-perf-reviewer` | Quality — frontend performance (bundle size, lazy loading, CSS containment, web vitals) |
| `threejs-color-management` | Knowledge — Three.js color pipeline (sRGB vs Linear, toneMapping, texture colorSpace) |
| `r3f-scroll-driven-3d` | Knowledge — GSAP ScrollTrigger + R3F via Zustand bridge pattern |
| `gltf-debugging` | Knowledge — runtime GLB/GLTF inspection (UV, materials, texture replacement) |
| `html-to-3d-texture` | Knowledge — capture HTML/React as PNG textures for 3D models |
| `product-3d-lighting` | Knowledge — studio lighting setups for 3D product showcases |
| `output-enforcement` | Knowledge — anti-laziness enforcement, bans placeholder patterns |

**Frontend UI skills (optional, for 2D UI / landing page / dashboard projects):**

| Skill | Category |
|-------|----------|
| `frontend-ui-reviewer` | Quality umbrella — auto-dispatches on audit/review/polish/critique when .tsx/.jsx/.ts/.css/.vue active; runs 11-item reflex audit + delegates to specialists |
| `frontend-ui-typography-reviewer` | Quality — reflex_fonts_to_reject list, modular scale, line-height/length, font-loading hygiene, OpenType, 4-step font-selection procedure |
| `frontend-ui-color-reviewer` | Quality — OKLCH over HSL, tinted neutrals, palette cohesion, theme-by-use-context decision table, WCAG/APCA contrast, AI-palette reflexes |
| `frontend-ui-motion-reviewer` | Quality — Emil's 4-question Animation Decision Framework, easing constants, duration table, spring vs duration, reduced-motion. Outputs Before/After/Why markdown table |
| `frontend-ui-interaction-reviewer` | Quality — buttons (:active, hit target), modals (transform-origin, scroll-lock, focus trap), forms (validation timing, inline errors), focus-visible, loading patterns, UX writing |
| `frontend-ui-design-critic` | Quality — holistic gestalt critique ("does it feel designed?"), narrative output, reflex audit scaled across whole diff |
| `impeccable-craft` | Knowledge (user-invocable) — shape-then-build 4-stage craft flow: Shape → Refine → Implement → Polish |

**Stack-specific reviewers (optional):**
go-reviewer, go-error-reviewer, go-concurrency-reviewer, go-performance-reviewer, go-modernizer, go-observability-reviewer, ts-reviewer, py-reviewer, rs-reviewer

**Go knowledge skills (optional, auto-activated by description matching):**

| Skill | Category |
|-------|----------|
| `go-samber-do` | Knowledge — DI container (Provide/Invoke, named providers, scoped injectors, shutdown order, testing overrides, migration from manual wiring) |
| `go-samber-oops` | Knowledge — structured errors (Code/In/With/Hint/Owner/Public, stack traces, APM serialization, HTTP boundary safety, errors.Is/As compat) |
| `go-samber-lo` | Knowledge — generic collection helpers (Map/Filter/Reduce/FilterMap/GroupBy/Must/Try), stdlib slices overlap, parallel.Map, perf caveats |
| `go-grpc-patterns` | Knowledge — gRPC service/stream types, interceptors, status codes, deadline propagation, TLS/mTLS, bufconn testing |
| `go-benchmark` | Knowledge — testing.B, benchstat, sub-benchmarks, profile capture, reading output, dead-code elimination trap |

### Auto-Activation Rules

Codex MUST auto-invoke skills when these conditions are met (without the user explicitly asking):

| Skill | Auto-trigger when |
|-------|-------------------|
| `dev-orchestrator` | New feature, bug fix touching 2+ files, 100+ lines in one file, migration + service |
| `review-orchestrator` | After completing work on 3+ files, before commit with 5+ files changed |
| `test-runner` | After feature implementation, bug fix, refactor, or test file edits |
| `lint-runner` | Before any commit with code changes (not docs-only) |
| `audit-orchestrator` | When touching infrastructure, CI/CD, or security-sensitive code (use health-only mode for quick check) |
| `frontend-ui-reviewer` | User asks for audit/review/polish/critique AND active edits are in .tsx/.jsx/.ts/.css/.scss/.html/.vue files · 3+ UI file edits in one task · before commit staging ≥2 UI files. Do NOT activate for .go/.py/.rs backend, 3D/WebGL code, tests |
| `frontend-ui-typography-reviewer` | font-family / weight / scale token changed · Google Fonts import added · user asks about fonts/type/hierarchy while UI files active |
| `frontend-ui-color-reviewer` | palette / theme / color-token changed · dark/light mode added · oklch/hsl/rgb/hex added · user asks about palette/theme/contrast/dark mode while UI files active |
| `frontend-ui-motion-reviewer` | transition / @keyframes / animation / useSpring / motion.* added or changed · user asks about motion/animation/easing/duration/spring while UI files active |
| `frontend-ui-interaction-reviewer` | button / modal / drawer / form / focus / loading / empty / microcopy change · user asks about interactions/polish/accessibility while UI files active |
| `frontend-ui-design-critic` | user asks for critique / design-review / holistic-review / aesthetic-audit · major new UI surface created · 5+ UI files changed in one task. Do NOT activate for bug fixes or single-component changes |
| `go-samber-do` | Code imports `github.com/samber/do` or `github.com/samber/do/v2` · user asks about Go dependency injection · reviewing service wiring / Provide/Invoke patterns |
| `go-samber-oops` | Code imports `github.com/samber/oops` · user asks about structured Go errors, error codes, APM context, stack traces in Go |
| `go-samber-lo` | Code imports `github.com/samber/lo` or `github.com/samber/lo/parallel` · user asks about Go collection utilities, Map/Filter/Reduce helpers |
| `go-grpc-patterns` | Code imports `google.golang.org/grpc` · `.proto` file in scope · user asks about gRPC services, interceptors, status codes, streaming |
| `go-benchmark` | File matches `*_test.go` containing `func Benchmark*` · user asks about Go benchmarks, benchstat, performance measurement methodology |

**Skip auto-activation when:**
- Already inside `dev-orchestrator` (it includes review + test)
- User explicitly says "just do X" / "quick fix"
- Docs-only or config-only changes
- Single file with < 50 lines changed

## Active Plans

None yet.

## Known Constraints

TODO: list known limitations, stubs, tech debt.
