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
- Name the precedent you follow (file:line) — or state explicitly that no precedent was found after searching

### Solution Ladder (before writing new code)
Stop at the first rung that holds:
1. Doesn't need to exist (YAGNI)? — don't write it
2. Already in this codebase? — reuse it
3. Stdlib covers it? — use stdlib; don't reimplement, don't add a dependency
4. Native platform feature covers it? — use it (`<input type="date">` over a picker lib, CSS over JS, a DB constraint over app-level checks)
5. An installed dependency covers it? — use it; never add a NEW dependency for what stdlib, the platform, or a few lines can do

Mark a deliberate simplification with a comment naming its ceiling and the upgrade trigger. Minimal never means fragile: input validation at trust boundaries, error handling, security, and accessibility are never simplified away — and anything explicitly requested is never dropped.

## Approval Rules

This kit ships `rules/default.rules` — execution rules for commands outside the
sandbox. Rules do not grant task authority or override the active sandbox and
approval settings.

**Install:** copy `packages/codex/rules/default.rules` to `~/.codex/rules/default.rules`
(or your project's local `.codex/rules/`) so Codex CLI picks it up.

**Format (Starlark-like DSL):**

```
prefix_rule(
    pattern = ["git", "push"],
    decision = "prompt",
    justification = "Push changes remote state; inspect target and flags.",
)
```

**Decisions:**
- `allow` — permits a matching command at the execution-rule layer
- `prompt` — requires approval, subject to the runtime's approval policy
- `forbidden` — forbids a matching command

**Coverage:**
- Destructive system calls (`rm -rf /`, `sudo`, `dd`, `mkfs`, `shutdown`) → forbidden
- Git / gh CLI / npm / pnpm / yarn / pip / cargo / go → mostly allowed
- Force-push, hard reset, `git clean -fdx` → prompt
- Docker / kubectl reads → allowed; deletes / prune → prompt
- Systemd / pm2 / supervisorctl start/stop/restart/reload → allowed
- Systemd enable/disable/mask → prompt
- Nginx / Caddy / Apache config check + reload → allowed
- `chmod`, `chown` → prompt
- `curl`, `wget`, `bash -c`, and `sh -c` → prompt; this is not a blanket
  prohibition of downloading and executing a script

**Matching:** patterns match literal argv prefixes. When multiple rules match,
the most restrictive decision wins: `forbidden` > `prompt` > `allow`.
Simple shell commands may be split for checking; complex shell syntax may be
checked as the whole shell invocation. Do not infer complete shell or SQL
inspection from prefix rules. Validate custom rules with the installed Codex
`execpolicy check` command before relying on them.

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

Before EVERY commit, check if any apply. The doc names below are the SHOWCASE example map (a real social app) — ADAPT the rows to your project's own `docs/architecture/` set:

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
3. **docs-reviewer skill** — used by dev-orchestrator in Phase 14 (Document) to verify completeness.
4. **Plan completion gate** — plans are NOT complete until docs are updated.

Do NOT rely on a single layer — update docs proactively with every code change.

## Model Configuration

The shipped `.codex/config.toml` selects **gpt-6-astra / high** for the coordinator
and **gpt-5.6-sol / medium** as the subagent fallback. Configuration is a default,
not evidence of which model executed a task or of independent review. Honor the
user's explicit routing and verify available models/efforts before dispatch.

Astra owns architecture, shared prompt/behavior contracts, consequential
security/authority/data-loss decisions, and final high-risk acceptance. Sol may
perform bounded implementation, evidence collection, and review with an explicit
task packet. Use a supported effort appropriate to the task (normally high for
substantive review); do not silently substitute another model or lower effort.
If required Astra acceptance is unavailable, report it as pending rather than
delegating that acceptance to a fallback model.

These are consumer runtime defaults. Superkit's contributor model choices and
prompt-authoring agreement are maintained separately in its repository working
agreement; they do not alter the model conventions of shipped Claude assets.

## Codex-Specific Notes

### Skill Execution and Delegation
- Read the named skill and preserve its authority, evidence, and verdict contract.
  Check actual runtime delegation tools and user authorization before spawning;
  a skill name alone does not create an agent or grant additional permissions.
- When delegation is available and authorized, use clean worker contexts by
  default. Supply explicit model and reasoning effort, objective, owned scope,
  relevant contracts, permitted tools/actions, acceptance checks, and required
  return evidence. Include full history only when specifically necessary.
- Parallelize independent work within available slots and use disjoint ownership
  for edits. Workers must preserve others' changes and may not recursively fan out
  unless assigned. The coordinator integrates results and accepts the outcome.
- If delegation or explicit routing is unavailable, perform suitable skills as
  separate inline passes and disclose the missing independence/routing. Do not
  claim an independent review or waive a mandatory independent/Astra gate.
- Review roles are read-only; their verdicts do not authorize edits, external
  writes, merge, or release. Implement corrections in a separately authorized
  implementation step. Preserve prior user authorization; ask only for a missing
  decision or permission that blocks the next action.
- Reuse checks when command/results, relevant code, inputs, and environment are
  recorded and unchanged. Rerun for relevant change or concrete uncertainty.
  Report mandatory unknowns separately from observed failures; neither becomes
  success because a retry budget is exhausted.

### Planning
- Use `update_plan` for tracking progress

### Skills
- Skills auto-activate based on description matching
- Invoke skills by describing the task that matches the skill description
- Orchestrator skills use available, authorized delegation or disclosed inline
  execution as described above.

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

**Go semantic navigation via gopls MCP (optional, opt-in):** if a gopls MCP server is registered (Codex: `[mcp_servers]` in config.toml; Claude Code: `claude mcp add gopls -- gopls mcp`), prefer its `go_symbol_references` / `go_diagnostics` / `go_package_api` tools over grep for build-resolved Go questions (references, interface satisfaction, blast radius). Never assume it is wired — with no server registered, fall back to grep + `go doc`.

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
| `dev-orchestrator` | Work needs coordinated planning, implementation, and acceptance across meaningful dependencies or risks |
| `review-orchestrator` | Requested code review, consequential behavior/contract changes, or a required project review gate |
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
- A narrow low-risk change can use focused checks; file or line count alone never
  waives a mandatory review or safety gate.

## Active Plans

None yet.

## Known Constraints

TODO: list known limitations, stubs, tech debt.
