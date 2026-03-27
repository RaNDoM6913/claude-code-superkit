# Changelog

All notable changes to claude-code-superkit are documented here.

## [Unreleased]

### Changed
- **setup.sh → npx** — installer rewritten from 593-line bash to Node.js CLI. Install via `npx claude-code-superkit`. Zero external dependencies (no jq required). Works on macOS (any bash/zsh), Linux, and Windows
- **setup.sh** — now a 5-line POSIX sh wrapper that delegates to Node.js
- **`--defaults` flag** — non-interactive mode for CI/CD (`npx claude-code-superkit --defaults`)
- **CLI flags** — `--stacks=`, `--profile=`, `--extras=`, `--codex`, `--no-docs`, `--no-superpowers`
- **Graceful pipe handling** — if stdin closes during interactive mode, auto-falls back to `--defaults`

### Fixed
- **Hook git-ignore protection** — Added `verify-hooks.sh` script, installer validation, and TROUBLESHOOTING guidance for the critical bug where `.gitignore` blocking `.claude/scripts/` silently disables all enforcement for cloned repos
- **Silent failures on macOS** — Bash 3.2 + `set -euo pipefail` caused script to exit without error message
- **Bash 3.2 incompatibility** — empty arrays + `set -u` triggered unbound variable errors
- **`pipefail` + `ls | wc -l`** — false errors when counting files
- **`cd` in tree fallback** — changed working directory unexpectedly
- **zsh users** — running `zsh setup.sh` crashed on `BASH_VERSINFO`
- **jq dependency removed** — JSON assembly now native in Node.js

### Added
- `package.json` — npm package for `npx claude-code-superkit`
- `bin/cli.js` — CLI entry point with argument parsing
- `lib/` — modular Node.js installer (installer, prompts, settings-builder, superpowers, docs-scaffold, codex, validator, utils)
- `test/` — unit tests (utils, settings-builder) + smoke test (full --defaults flow)
- Windows support (via Node.js)

---

## [1.3.3] — 2026-03-26

### Added
- **`/superkit-init` command** — 5-phase intelligent project setup: scan codebase → generate filled architecture docs → configure rules with real paths → validate → commit. Supports `--non-interactive` flag and scaffold mode for empty projects
- **`/superkit-evolve` command** — incremental drift detection: migration counter, missing docs, stale trees, broken rule paths. Supports `--fix-all` flag
- **`project-scanner` skill** — codebase introspection patterns for language/framework/database/structure/component detection
- **`evolve-check.sh` hook** — SessionStart advisory: checks documentation drift every 24h, suggests `/superkit-evolve` if issues found
- **`superkit-update.sh` hook** — SessionStart auto-update: pulls latest superkit, re-copies agents/commands/hooks/rules/skills every 6h
- **`.superkit-meta`** — setup.sh saves source path + stacks + profile for auto-updates
- **Scaffold Mode** — `/superkit-init` on empty projects asks for stack, creates minimal CLAUDE.md with smart hints

### Changed
- **`/docs-init`** — now redirects to `/superkit-init` (fallback kept for older versions)
- `setup.sh` — suggests `/superkit-init` after file installation, saves `.superkit-meta` for auto-updates
- Commands: 11 → **13** (+superkit-init, +superkit-evolve)
- Hooks: 11 → **13** (+evolve-check, +superkit-update)
- Skills: 3 → **4** (+project-scanner)

---

## [1.3.2] — 2026-03-26

### Breaking Changes
- **`doc-check-on-commit.sh`** — now **BLOCKS** commits (exit 2) when code changes lack documentation updates. Previously advisory-only (exit 0). Commits with code changes now REQUIRE corresponding docs staged alongside

### Added
- **`auto-commands.md` rule** — "Documentation — Auto Verify Before Commit" as highest priority auto-trigger. Runs 15-point checklist before every git commit
- **Smart file-to-doc mapping** in doc-check hook — analyzes staged files and determines exactly which documentation files must be staged (migrations → database-schema, handlers → API reference, frontend src → frontend docs, new files → tree docs)
- **Subagent delegation template** in documentation rule — explicit instructions for dispatching subagents with complete doc file lists
- **Dual-repo sync advisory** — hook warns when `.claude/` infrastructure changes, reminding to sync upstream

### Changed
- **`doc-check-on-commit.sh`** — rewritten with smart mapping. Generalized for any project (no app-specific paths in core; full TGApp version in showcase)
- **`documentation.md` rule** — upgraded from 8-point checklist to **15-point** trigger-to-doc mapping table with explicit file paths. 3-layer → 4-layer enforcement (+ auto-commands rule)
- **`docs/guide/05-writing-hooks.md`** — updated doc-check description to reflect smart mapping and blocking behavior
- **`docs/guide/07-writing-rules.md`** — "Five Default Rules" → "Six" (+ auto-commands), updated documentation rule to mention 15-point checklist

### Codex CLI Sync
- **4 new skills**: ai-slop-cleaner, critic, visual-reviewer, tree-generator (37 → 41 total)
- **dev-orchestrator**: 8 → 12 phases (+Architect, +Validate, +Slop Cleanup, +Goals, +Critic)
- **commit-helper**: git trailers (Confidence, Scope-risk, Not-tested)
- **AGENTS.md**: 15-point doc checklist + 4-layer enforcement rules
- Codex skills: 37 → **41**
- Dev phases: 8 → **12** (aligned with Claude Code /dev)

---

## [1.3.1] — 2026-03-26

### Added
- **ai-slop-cleaner** agent — detect and fix AI-generated code patterns (redundant comments, unnecessary abstractions, over-engineering, template slop)
- **critic** agent — multi-perspective final quality gate (security, new-hire, ops) with gap analysis and predictions
- **visual-reviewer** agent — UI consistency scoring, design system compliance check (score 0-100)
- **Ambiguity Gate** in /dev Phase 1 — 5-dimension clarity check before planning, asks user if 2+ dimensions unclear
- **Phase 3.5 AI Slop Cleanup** in /dev — automatic cleanup pass after implementation
- **Phase 6.5 Critic** in /dev — final quality gate for complex tasks (5+ files)
- **Git trailers** in /commit — Confidence, Scope-risk, Not-tested metadata for non-trivial commits
- **Phase 0.5 Spec Compliance** in code-reviewer — verify implementation matches requirements before quality review

### Changed
- **debug-observer** — added circuit breaker: 3 failed fixes → escalate to architect
- **code-reviewer** — added Phase 0.5 spec compliance check before code quality review
- **/dev** — now 12 phases (was 10): +Phase 3.5 Slop Cleanup, +Phase 6.5 Critic, +Ambiguity Gate in Phase 1
- Core agents: 21 → **24** (+ai-slop-cleaner, +critic, +visual-reviewer)
- **`doc-check-on-commit.sh`** — now **BLOCKS** commits (exit 2) instead of warning (exit 0) when code changes lack documentation updates
- **`documentation.md` rule** — enforcement upgraded from 3 layers to **4 layers** (+auto-commands.md as highest-priority trigger)
- **`auto-commands.md` rule** — added "Documentation — Auto Verify Before Commit" as highest priority auto-trigger
- **`docs/guide/07-writing-rules.md`** — updated from "Five Default Rules" to **Six** (+auto-commands.md)

---

## [1.3.0] — 2026-03-25

### Added
- **`/workflow` command** — predefined workflow templates: bugfix, hotfix, spike, refactor, dep-upgrade, security-audit
- **`/dev --quick` mode** — lightweight dev cycle skipping architect, plan validation, goal verification, docs phases
- **`/audit --health` mode** — quick health dashboard dispatching only health-checker (~30s vs ~5min)
- **`loop-guard.sh` hook** — PreToolUse detection of repeated identical tool calls and A→B→A→B alternating loops
- **Anti-anchoring scan** in code-reviewer — Phase 1.5: grep anti-patterns before reading code to prevent anchoring bias
- **Forensics phase** in debug-observer — Phase 7: scientific method (hypothesis → experiment → verify) with READ-ONLY investigation
- **Reconnaissance phase** in architect — Phase 0 expanded: codebase scan + structured handoff output for other agents
- **Safe upgrade strategy** in dependency-checker — rollback planning, upgrade ordering, blast radius estimation
- **Mitigation roadmap** in security-scanner — Phase 3: prioritized fix plan (immediate/short/medium/long-term)
- **Auto-fix recommendations** in health-checker — check 10: concrete fix suggestions for each unhealthy check
- **Enhanced config-protection** — .env file warnings + DECISIONS.md append-only enforcement
- **`auto-commands.md` rule** — auto-triggers for /review, /test, /lint, /audit --health, /security-scan based on file count, change type, and sensitivity
- **`superkit-meta-check.sh` hook** (superkit-internal, not distributed) — pre-commit validation of counts consistency across README, CLAUDE.md, setup.sh, docs/INSTALL
- **Plugin auto-configuration** — setup.sh enables 4 base plugins (superpowers, github, context7, code-review) + 3 optional (code-simplifier, playwright, frontend-design)
- **`enabledPlugins`** in core settings.json — base plugins enabled out of the box

### Changed
- `settings.json` — added loop-guard.sh to PreToolUse hooks + enabledPlugins section
- `setup.sh` — 4-step installer (was 3): +Plugin Selection with base/optional split
- `setup.sh` — improved post-install instructions with plugin install reminder

---

## [1.2.0] — 2026-03-25

### Added
- **Phase 1.5 (Architect)** in `/dev` — dispatches architect agent for complex tasks (5+ files)
- **Phase 2.5 (Validate Plan)** in `/dev` — plan-checker validates before execution
- **Phase 5.5 (Verify Goals)** in `/dev` — goal-verifier checks 4-level substantiation
- **database-reviewer** in `/dev` Phase 6 — dispatched for migrations + repo files
- **docs-reviewer** in `/dev` Phase 7 — verifies documentation completeness
- **Complexity routing** — simple tasks skip validation phases, complex tasks get architect

### Changed
- `/dev` now has 10 phases (was 8): +Phase 1.5 Architect, +Phase 2.5 Validate, +Phase 5.5 Goals
- Phase 8 Report now shows all phases with status table
- Phase 6 Review dispatch table: added database-reviewer for SQL + repo files
- Superkit CLAUDE.md added with project structure, counts, conventions

---

## [1.1.0] — 2026-03-25

### Added
- **database-reviewer** agent — PostgreSQL specialist (EXPLAIN ANALYZE, indexes, anti-patterns, schema design)
- **architect** agent — System design advisor (trade-offs, scalability, patterns)
- **docs-reviewer** agent — Merged docs-checker + doc-updater: freshness, accuracy, coverage in one agent
- **plan-checker** agent — 8-dimension plan validation before execution (from GSD research)
- **goal-verifier** agent — 4-level goal substantiation: exists → substantive → wired → data-flow
- **context-monitor** hook — Warns at 75% and 90% context window usage
- **config-protection** hook — Warns when modifying linter/formatter configs
- **doc-check-on-commit** hook — PreToolUse warning before git commit without doc updates
- **SkillsMP search** skill — Search 500K+ community skills (requires API key)
- **Superpowers auto-install** in setup.sh — clones from GitHub, registers in plugin cache
- **Post-install validation** — checks settings.json, hook permissions, CLAUDE.md, agent count
- **Double-verification /review** — findings validated by independent agents
- **--comment flag** for /review — posts inline comments on GitHub PRs
- **3-layer documentation enforcement** — rule + PreToolUse hook + opus Stop hook
- **Plan completion gate** — docs must be updated before any plan is marked complete
- **TROUBLESHOOTING.md** — common issues, platform guidance, FAQ
- **docs/INSTALL-CLAUDE-CODE.md** — detailed installation guide
- **--help / --version** flags in setup.sh
- **Badges** in README (stars, license, model)
- **Phase 0** added to all 21 showcase agents
- **VERSION** and **CHANGELOG.md** files

### Changed
- All agents upgraded to **Opus** model (was sonnet)
- All docs/examples: sonnet references → opus
- Codex model: `o3` → **gpt-5.4** with **extra_high** reasoning
- Codex install: symlink → copy (survives superkit removal)
- /dev workflow threshold: 3+ files → **2+ files or 100+ lines**
- Stop hook: haiku → **opus** (60s timeout)
- Core hooks: 7 → **10** (+doc-check-on-commit, +config-protection, +context-monitor)
- Core agents: 17 → **21** (+database-reviewer, +architect, +docs-reviewer, +plan-checker, +goal-verifier, merged docs-checker+doc-updater)
- Codex skills: 33 → **37**
- Rules count display: 4 → **5**
- README: platform-specific install sections, What's New, badges
- Codex INSTALL.md: 16 agent skills → 21 (total 33 → 36)
- setup.sh: Codex section copies files instead of symlinking
- setup.sh: config.toml always overwritten to ensure latest model

### Fixed
- setup.sh: error handling in copy functions (was silent failure)
- setup.sh: JSON backup/rollback for installed_plugins.json + settings.json
- setup.sh: hooks executable in merge mode (find + chmod)
- README: manual copy paths (added $SUPERKIT variable)
- README: missing commands in Key Commands table
- Showcase: missing documentation.md rule
- Showcase: onyx-ui-standard SKILL.md missing frontmatter
- Codex INSTALL.md: skill count mismatch (16 → 21 actual)
- Codex config.toml: removed stale model_reasoning_effort for o3

## [1.0.0] — 2026-03-24

### Initial Release
- 17 core agents (code-reviewer, security-scanner, test-generator, audit-*, health-checker, etc.)
- 4 stack agents (Go, TypeScript, Python, Rust reviewers)
- 3 extra agents (bot-reviewer, design-system-reviewer, red-blue-auditor)
- 10 commands (/dev, /review, /audit, /test, /lint, /commit, /migrate, /new-migration, /docs-init, /security-scan)
- 7 core hooks + 5 stack hooks + Stop verification
- 5 rules (coding-style, security, git-workflow, documentation, dev-workflow)
- 3 skills (project-architecture, writing-agents, writing-commands)
- Interactive setup.sh installer with stack/profile selection
- Codex CLI support (33 skills, AGENTS.md, config.toml)
- 12-chapter guide + 3 examples
- Production showcase (21 agents, 14 commands from real social app)
- AgentShield security scanning integration
