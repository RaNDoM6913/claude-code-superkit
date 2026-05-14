# claude-code-superkit

Production-tested agents, commands, hooks & skills for Claude Code and Codex CLI. All agents on Opus.

## Project Structure

```
packages/
  core/                     # Generic components (any project)
    agents/                 # 31 agents (all opus) · incl. v1.4.0: minimal-change-engineer, reality-checker, codebase-onboarding-engineer, behavioral-nudge-engine
    commands/               # 15 commands (+ 1 frontend-3d = 16 total)
    hooks/                  # 28 hooks (+2 superkit-internal) = 30 total · incl. /dev trio, audit-settings-source, audit-trail, plan-completion-gate, user-intent-detect, subagent-stop-validate, compact-state-inject, edit-streak-check, intake-classifier (Python), gateguard-pre-edit, gateguard-record-facts
    helpers/                # 1 helper (statusline.cjs)
    rules/                  # 8 rules (+1 superkit-internal)
    skills/                 # 11 skills · incl. v1.4.0: telegram-bot-builder, nextjs-supabase-auth, drizzle-orm-expert, ru-text, postgresql-optimization, redis-patterns
    settings.json           # Hook wiring + statusLine
    CLAUDE.md               # Template for users
    docs-templates/         # Architecture doc templates
  stack-agents/             # Language-specific reviewers
    go/                     # go-reviewer + 5 specialized (error, concurrency, performance, modernizer, observability)
      references/           # 29 Go knowledge documents (+5 in v1.4.0: di-frameworks, graphql-patterns, module-management, stay-updated, standard-stdlib-now)
    typescript/             # ts-reviewer
    python/                 # py-reviewer
    rust/                   # rs-reviewer
  stack-hooks/              # Language-specific hooks
    go/                     # format-on-edit, go-vet-on-edit + 4 new (error-check, context-check, safety-check, golangci-lint)
    typescript/             # typecheck-on-edit
    python/                 # ruff-on-edit
    rust/                   # cargo-check-on-edit
  stack-rules/              # Language-specific rules
    go/                     # go-conventions, go-safety
  frontend-3d/              # Self-contained Frontend/3D/Animation package
    agents/                 # 4 agents (presentation-reviewer, r3f-scene-reviewer, ui-design-reviewer, frontend-perf-reviewer)
    hooks/                  # 4 hooks (gsap-pattern-check, r3f-color-check, tailwind-version-guard, bundle-size-warn)
    skills/                 # 6 skills (threejs-color-management, r3f-scroll-driven-3d, gltf-debugging, html-to-3d-texture, product-3d-lighting, output-enforcement)
    rules/                  # 3 rules (gsap-conventions, threejs-conventions, frontend-aesthetics-3d)
    commands/               # 1 command (capture-screen)
    README.md               # Package documentation
  frontend-ui/              # Self-contained Frontend 2D UI package (typography, color, motion, interaction)
    agents/                 # 6 agents (ui-reviewer umbrella + typography / color / motion / interaction / design-critic)
    hooks/                  # 3 hooks (ui-banned-fonts-check, ui-color-check, ui-animation-easing-check) + tests/
    skills/                 # 1 skill (impeccable-craft, opt-in shape-then-build flow)
    rules/                  # 7 rules (frontend-design-aesthetics, typography, color, spatial, motion, interaction, anti-patterns) — all applyWhenPaths-scoped
    NOTICE.md               # Apache-2.0 attribution for pbakaus/impeccable material
    README.md               # Package documentation
  gan/                      # NEW v1.4.0 — adversarial verification harness (optional, Playwright required)
    agents/                 # 3 agents (gan-planner, gan-generator, gan-evaluator)
    skills/                 # 3 Codex SKILL.md mirrors
    rubrics/                # 2 rubric files (ui-quality, functionality)
    README.md
  extras/                   # Optional components (require specific setup)
    bot-reviewer.md         # Telegram/Discord/Slack bot review
    design-system-reviewer.md
    red-blue-auditor.md
    skillsmp-search/        # SkillsMP API search (requires API key)
  codex/                    # Codex CLI support
    skills/                 # 82 skills (added: 3 cross-CLI roles, 6 TGApp skills, behavioral-nudge, 3 GAN, silent-failure-hunter expansion)
    rules/                  # NEW v1.4.0 — default.rules DSL (Codex approval policy)
    config.toml             # gpt-5.5, xhigh
    AGENTS.md               # Template (incl. new "Approval Rules" section)
    INSTALL.md              # Guide
  showcase/                 # Production example (28 agents, 17 commands, 13 hooks, 11 skills, 6 rules)
    .claude/                # Full .claude/ setup from real social app

setup.sh                    # POSIX wrapper → `node bin/cli.js`
bin/
  cli.js                    # CLI entry point (#!/usr/bin/env node)
lib/
  installer.js              # Main orchestrator
  prompts.js                # Interactive prompts (readline)
  settings-builder.js       # JSON assembly (replaces jq)
  superpowers.js            # Plugin installation
  docs-scaffold.js          # Doc templates + tree
  codex.js                  # Codex CLI support
  validator.js              # Post-install validation
  utils.js                  # Colors, file helpers, git
test/
  utils.test.js             # Unit tests
  settings-builder.test.js  # Unit tests
  smoke.test.js             # Full install smoke test
package.json                # npm package config
docs/
  guide/                    # 13 chapters
  examples/                 # 3 examples
  INSTALL-CLAUDE-CODE.md    # Detailed install guide
  dev-flow.svg              # Hand-authored /dev flow diagram used in README
  dev-flow-variants/        # 4 alternative SVG layouts (timeline, radial, waterfall, node graph)
README.md
CHANGELOG.md
TROUBLESHOOTING.md
VERSION                     # 1.3.11
```

## Current Counts

| Component | Core | Stack | Frontend-3D | Frontend-UI | GAN | Extras | Showcase | Codex |
|-----------|------|-------|-------------|-------------|-----|--------|----------|-------|
| Agents | 31 | 9 | 4 | 6 | 3 | 3 | 28 | — |
| Skills | 11 | — | 6 | 1 | 3 | 1 | 11 | 82 |
| Commands | 15 | — | 1 | — | — | — | 17 | 9 |
| Hooks | 28 (+2 internal) | 9 | 4 | 3 | — | — | 13 | — |
| Helpers | 1 | — | — | — | — | — | — | — |
| Rules | 8 (+1 internal) | 2 | 3 | 7 | — | — | 6 | 1 file |

**Total agents:** 56 (was 49 in v1.3.11)

## Conventions

- **Model**: ALL agents use `model: opus`. No sonnet. No haiku. The `opus` alias routes to the latest Opus release (currently **Opus 4.7, 1M context**) — kit automatically picks up new Opus versions without code changes.
- **Codex model**: `gpt-5.5` with `model_reasoning_effort = "xhigh"`
- **Agent format**: YAML frontmatter (name, description, model, allowed-tools) + markdown body
- **Phase 0**: Every agent starts with "Load Project Context" (reads CLAUDE.md + docs/architecture/)
- **Output format**: Severity (CRITICAL/WARNING/SUGGESTION) + Confidence (HIGH/MEDIUM/LOW)
- **Generic**: Core agents must NOT reference specific projects. Use auto-detection patterns.
- **Showcase**: May reference TGApp/SocialApp patterns (it's a real production example)
- **Token metadata**: All agents, skills, and rules declare `tokens: N` in YAML frontmatter as a transparency signal (approximate body size, ~4 chars/token). This is NOT a budget — specialist agents may run 2500+ tokens because depth is the point. Authors should update `tokens:` when editing a file so users see the real cost. Regenerate via `node bin/inject-tokens.js`.

## Mandatory Documentation Updates

After ANY change to agents, commands, hooks, rules, skills, plugins, or setup.sh:

### Tier 1 — ALWAYS update (every change):
1. **README.md** — counts in "What's Inside" table, Codex comparison table, showcase description, badges
2. **CHANGELOG.md** — add entry under `[Unreleased]` (or current version)
3. **CLAUDE.md** (this file) — counts table, structure section
4. **GitHub About** — `gh repo edit --description` if ANY count changed. Format: "Production-tested agents (N), commands (N), hooks (N), skills (N), and rules (N) for Claude Code and Codex CLI. All agents on Opus." — THIS IS MANDATORY AND MUST NOT BE SKIPPED
5. **GitHub Release** — `gh release edit` if release already exists for this version

### Tier 2 — Update when relevant:
6. **packages/codex/INSTALL.md** — skill counts, feature comparison table
7. **packages/codex/AGENTS.md** — Available Skills lists, Auto-Activation Rules
8. **docs/INSTALL-CLAUDE-CODE.md** — step counts, file counts, plugin list
9. **docs/guide/*.md** — any chapter referencing changed counts
10. **setup.sh** — summary output counts, step numbering, VERSION variable

### Tier 3 — On release:
11. **VERSION** — bump version number
12. **README "What's New"** — update version and bullet points
13. **CHANGELOG.md** — move `[Unreleased]` → `[X.Y.Z] — date`
14. **GitHub Release** — `gh release create vX.Y.Z`

### CRITICAL: Never forget Codex!
- Codex AGENTS.md and INSTALL.md MUST stay in sync with core changes
- New rules → add equivalent section to AGENTS.md (Codex has no rules files)
- New commands → check if Codex skill exists, update INSTALL.md counts
- GitHub description (`gh repo edit`) → update on EVERY count change

### Release Rules (MANDATORY)

- **Releases are NOT per-commit** — accumulate changes, release when user says "выпусти релиз"
- **Claude may suggest a release** — if enough changes accumulated (3+ agents, major command rewrite, etc.), ask: "Накопилось N изменений, выпустить релиз?"
- **Releases are sequential** — never skip versions (1.0→1.1→1.2, not 1.0→1.2)
- **CHANGELOG.md** — update continuously as changes are made (under `## [Unreleased]` section)
- **On release**: move `[Unreleased]` → `[X.Y.Z] — date`, bump VERSION, update README What's New, commit, push, `gh release create`
- **Release notes** — comprehensive summary of ALL changes since last release, with emoji headers
- **Order**: CHANGELOG [Unreleased] → rename to version → bump VERSION → update README What's New → commit → push → `gh release create`

### Checklist before commit:
- [ ] Agent count in README badge matches `ls packages/core/agents/*.md | wc -l` + stack + extras
- [ ] Showcase count matches `ls packages/showcase/.claude/agents/*.md | wc -l`
- [ ] Codex skill count matches `find packages/codex/skills -name "SKILL.md" | wc -l`
- [ ] Hook count matches `ls packages/core/hooks/*.sh | wc -l` + stack hooks
- [ ] Rule count matches `ls packages/core/rules/*.md | wc -l`
- [ ] **VERSION matches package.json version** (critical — npm uses package.json)
- [ ] **Phase count consistent** across dev.md, README, CLAUDE.md, guides, Codex
- [ ] **GitHub About/description** counts match actual — run `gh repo view --json description` and verify ALL numbers. NEVER skip this step
- [ ] Codex AGENTS.md Available Skills lists are current
- [ ] Codex INSTALL.md counts match actual
- [ ] docs/INSTALL-CLAUDE-CODE.md counts match actual
- [ ] CHANGELOG has entry for the change
- [ ] `grep -rn "OLD_PHASE_COUNT-phase" docs/ README.md CLAUDE.md packages/codex/` returns 0 results (excluding plans/ and CHANGELOG)

### Self-Audit Rule (MANDATORY)
The `superkit-integrity.md` rule (alwaysApply) and `superkit-counts-verify.sh` hook enforce automated verification. The rule defines 4 verification steps that Claude MUST run before every commit. The hook blocks commits/pushes when VERSION != package.json or README counts != actual file counts. See `packages/core/rules/superkit-integrity.md` for full details.

## Key Files

| File | What |
|------|------|
| `setup.sh` | POSIX wrapper → `node bin/cli.js` |
| `package.json` | npm package config for `npx claude-code-superkit` |
| `bin/cli.js` | CLI entry point — arg parsing, error handling |
| `lib/installer.js` | Main install orchestrator — ports all setup.sh logic |
| `lib/settings-builder.js` | JSON assembly — replaces jq dependency |
| `packages/core/settings.json` | Hook wiring (PreToolUse, PostToolUse, Stop) + enabledPlugins |
| `packages/core/rules/documentation.md` | 4-layer doc enforcement rule (rule + auto-commands + BLOCKING hook + Stop) |
| `packages/core/commands/dev.md` | 16-phase always-on dev orchestrator with pseudocode + sprint contract + evaluator + plan-checker + goal-verifier + critic gates |
| `packages/core/commands/superkit-init.md` | Intelligent project setup — scan, generate docs, configure rules |
| `packages/core/commands/superkit-evolve.md` | Incremental documentation drift detection and fix |
| `packages/core/commands/workflow.md` | Workflow templates: bugfix, hotfix, spike, refactor, dep-upgrade, security-audit |
| `packages/core/commands/review.md` | Double-verification review with --comment flag |
| `packages/frontend-3d/README.md` | Frontend 3D package — agents, hooks, skills, rules, commands for GSAP/Three.js/R3F |
| `packages/core/helpers/statusline.cjs` | Claude Code status bar — stack detector scans root + 1 level of subdirs (monorepo-aware) |
| `docs/dev-flow.svg` | Hand-authored `/dev` 16-phase flow diagram embedded in main `README.md` |
| `docs/dev-flow-variants/` | Alternative layouts (timeline / radial / waterfall / node graph) with gallery `README.md` |

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
