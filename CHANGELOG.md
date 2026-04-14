# Changelog

All notable changes to claude-code-superkit are documented here.

## [Unreleased]

### Fixed (critical)
- **Hooks reading `.command` / `.file_path` at the top level of the tool-input JSON** — Claude Code actually sends those fields under `.tool_input.<field>`, so every one of `doc-check-on-commit.sh`, `superkit-counts-verify.sh`, `config-protection.sh`, `security-patterns.sh`, and `loop-guard.sh` silently exited 0 on every invocation since inception. None of them have ever blocked a real commit or warned on a real edit. Every hook now reads `.tool_input.<field>` first with the legacy path as a fallback for defence-in-depth. Covered by `packages/core/hooks/tests/json-path_test.sh`.
- **`superkit-counts-verify.sh`** — after the JSON-path fix exposed it, the hook itself undercounted: its per-language loop missed the self-contained `packages/frontend-3d/` package (+4 agents / +4 hooks / +3 rules / +1 command) and its CLAUDE.md "Showcase Commands" parser pointed at the wrong column (Codex instead of Showcase). Counts now include self-contained packages, use `TOTAL_COMMANDS` in the GitHub-About comparison, and read Showcase from `sed -n '3p'`. Excludes internal-only hooks (superkit-counts-verify, verify-hooks) and internal rules (superkit-integrity) from the ship-totals so the numbers match what users actually see.

### Added
- **`audit-settings-source.sh` (SessionStart)** — mitigates [CVE-2025-59536](https://research.checkpoint.com/2026/rce-and-api-token-exfiltration-through-claude-code-project-files-cve-2025-59536/). A malicious `.claude/settings.json` committed to an untrusted repo can register a PreToolUse hook that runs arbitrary code the moment you open the project. The hook inspects git history on `.claude/settings.json`: if the last 10 commits contain any author other than your `git config user.email` within the last 7 days, it prints a loud stderr warning naming the offending commits and touches `${TMPDIR:-/tmp}/claude-untrusted-settings-<session>` so downstream hooks can downgrade decisions. Fails open everywhere. Opt-out via `CLAUDE_DISABLE_SETTINGS_AUDIT=1`.
- **`audit-trail.sh` (PostToolUse Bash + Edit|Write)** — hash-chained append-only audit log at `~/.claude/audit/YYYY-MM-DD.jsonl`. Each line carries `{ts, session_id, project, event, tool, field, tag, counter, marker_exists, prev_hash, hash}` where `hash = sha256(prev_hash || canonical_json_of_line_without_hash)`. Genesis hash is 64 zeros. Tamper detection: recomputing the chain exposes the first divergence. Opt-out via `CLAUDE_DISABLE_AUDIT_TRAIL=1`. Rotation of logs older than 30 days is queued for a follow-up.
- **`block-dangerous-git.sh` — stash-commit bypass patterns (Task 18).** Blocks three additional commit-gate bypass patterns proved out in [anthropics/claude-code#40117](https://github.com/anthropics/claude-code/issues/40117): stash-commit-stash-pop sandwich, `-q|--quiet` combined with `--no-verify`, `--amend --no-verify`. Each emits a targeted stderr message pointing at the underlying fix instead of offering a workaround.
- **`block-dangerous-git.sh` — structured "Suggested alternative" block responses (Task 19).** Every existing block message (`--no-verify`, `--force` push, `reset --hard`, `branch -D`) now carries a **Why** line plus concrete **Suggested alternative** commands — `--force-with-lease`, `stash push -u` before reset, `branch -d` for safe delete, etc. Gives Claude a reasoning path forward instead of a dead-end, without weakening any block.
- **`plan-completion-gate.sh` (PostToolUse Skill) + `doc-check-on-commit.sh` extension (Task 14).** When `superpowers:executing-plans` or `superpowers:writing-plans` finishes with a "plan complete" / "✅ done" / "Final report" signal in its output, the gate drops a marker at `${TMPDIR:-/tmp}/claude-plan-docs-pending-<session>`. The next code-changing commit must either stage a `docs/architecture/*` file OR include `[plan-docs-deferred: <plan-id>: <reason ≥15 chars>]` in the commit message. The marker is cleared once consumed so follow-up commits don't re-fire. Opt-out via `CLAUDE_DISABLE_PLAN_GATE=1`.
- **`user-intent-detect.sh` (UserPromptSubmit) + `dev-required-on-commit.sh` exception (Task 15).** When the user explicitly asks for a "quick fix" / "small tweak" / "tiny change" / "hotfix" etc. in chat, the hook drops `${TMPDIR:-/tmp}/claude-user-said-quick-<session>`. `dev-required-on-commit.sh` consumes that marker once to allow a bare `[quick]` tag without the ≥15 char rationale. The marker is single-use so subsequent commits still need rationale. Opt-out via `CLAUDE_DISABLE_INTENT_DETECT=1`.
- **`subagent-stop-validate.sh` (SubagentStop) — per-agent post-run checks (Task 16).** Reads `agent_type` + `last_assistant_message` from the SubagentStop payload. For `{go,ts,py,rs,code}-reviewer` — warns if CRITICAL findings are reported without "acknowledged" / "will fix" / "deferred". For `security-scanner` / `red-blue-auditor` — warns on any HIGH/CRITICAL finding with a "do not merge until resolved" message. For `test-generator` — warns if the message says "Generated N tests" with no evidence they were executed. Advisory only (exit 0) — a hard block requires an acknowledgement workflow (follow-up).
- **`packages/core/hooks/CHAIN-SEMANTICS.md` + scaffolding** under `tests/chain-semantics/` — Task 25 prerequisite. Documents Anthropic's "hooks run in parallel" statement, a local sequential-vs-parallel simulation (`run-experiment.sh`), a reproducible procedure to verify the scheduler against real Claude Code, and the defensive design contract every hook now follows (idempotent, decision independent of peer exit codes, atomic writes, cosmetic settings.json order, explicit timeouts).
- **`dev-required-on-commit.sh` — anti-reset cycle detection (Task 11).** New long-lived state at `~/.claude/state/dev-cycles-<session>.jsonl` logs one line per allow path (`allow-under-threshold`, `allow-with-dev`, `allow-override`). Before deciding, the hook queries the last 60 minutes: `≥ 2` override cycles → threshold drops from 3 to 2 (stricter); `≥ 3` consecutive override cycles → override path DISABLED for the remainder of the session; `/dev` required unconditionally until the cycles log is cleared. At cycle #1 a stderr warning nudges toward `/dev`. Closes the "3 edits → `[quick]` → reset → repeat" bad-faith loop.
- **`dev-required-on-commit.sh` — override budget + structured rationale (Task 12).** Overrides now require real justification: `[quick]` / `[no-dev]` / `[trivial]` need a `: <reason ≥15 chars>`; `[hotfix]` needs either a ticket ID (`#123` or `ABC-123`) or `no-ticket: <reason ≥15 chars>`; `[wip]` is forbidden on `main` / `master` / `prod*` branches. A rolling budget of max 2 overrides per 30 min is enforced by querying `~/.claude/audit/*.jsonl` — the third override in the window is blocked with a clear message. Regression suite grew 5 new cases (G..K); 11/11 pass.
- **`/dev` hard-enforcement — three cooperating hooks.** Closes Layer 3 of the docs-enforcement chain, which until now was advisory-only.
  - `dev-edit-counter.sh` (PostToolUse Edit|Write|MultiEdit) — increments `${TMPDIR:-/tmp}/claude-edit-count-<session_id>` on each code-file edit (tests, docs, memory, `.claude/`, configs ignored).
  - `dev-marker-set.sh` (UserPromptSubmit + PreToolUse Skill) — touches `${TMPDIR:-/tmp}/claude-dev-marker-<session_id>` when the user types `/dev …` (word-bounded, so `/develop`, `/device`, `/devops` do NOT trigger) OR Claude invokes `Skill({skill: "dev"})` / any `:dev$` namespace variant.
  - `dev-required-on-commit.sh` (PreToolUse Bash) — blocks `git commit` (including `git -C <path> commit`) with `exit 2` if counter ≥ 3 AND no marker AND no override tag. Overrides: `[quick]`, `[no-dev]`, `[trivial]`, `[hotfix]`, `[wip]`. Docs-only commits are exempt.
  - Wired in `packages/core/settings.json` across PreToolUse (Bash + Skill), PostToolUse (Edit|Write), and UserPromptSubmit.
- **Regression test suites** under `packages/core/hooks/tests/` (`doc-check-on-commit_test.sh` · 7 cases, `dev-required-on-commit_test.sh` · 6 cases, `json-path_test.sh` · 6 checks, plus `run-all.sh` aggregator).

### Changed
- **`doc-check-on-commit.sh`** — explicit exclusion list that can NEVER satisfy an architecture-doc requirement: `docs/superpowers/plans/**`, `docs/superpowers/specs/**`, `docs/superpowers/research/**`, `memory/**`, `CHANGELOG*`, `HISTORY.md`, `docs/active-plans-archive.md`. Checked BEFORE the generic `docs/*|*.md` fallthrough so a plan named `foo-database-schema.md` cannot falsely set `HAS_DB_SCHEMA=true`.
- **`doc-check-on-commit.sh` — adversarial audit fixes:** matcher now catches `git -C <path> commit` (previously the hook ran `git diff --cached` in the shell cwd and saw an empty STAGED); `-a` / `--all` matcher anchored so `--allow-empty` / `--author` no longer mis-trigger; tree-doc requirement for `app/middleware/jobs/workers/cmd/repo` paths now fires only for NEW files (modifications don't change the tree).
- **`doc-check-on-commit.sh` — coverage extension:** `*/jobs/**`, `*/workers/**`, `*/cmd/**` → backend-layers + tree-docs (if new); `*/repo/**` NEW files → tree-docs.
- **`packages/core/rules/documentation.md`** — three new sections: "What CANNOT satisfy the doc requirement", "Historical bug (fixed 2026-04-14)", "Coverage of the path-to-doc map".
- **`packages/core/rules/dev-workflow.md`** — new "Enforcement (hard-block)" section describing the three-hook `/dev` enforcement system, state files, override tags, and exempt paths.
- **Hook counts** — core hooks 13 → 16 user-facing (18 including internal), total hooks 26 → 29. README "What's Inside" and Codex comparison updated; GitHub About description synced.
- **Frontend 3D agents** — replaced ad-hoc `## Before Review` section with the conventional `## Phase 0: Load Project Context` across all four agents (`presentation-reviewer`, `r3f-scene-reviewer`, `ui-design-reviewer`, `frontend-perf-reviewer`). Each agent now explicitly reads `CLAUDE.md`, `docs/architecture/*.md`, and relevant rules before review, matching core-agent conventions.
- **`lib/codex.js`** — guarded `config.toml` copy against a missing source file and unified the call through the `copyFile` utility, so the installer now respects the chosen mode (merge/overwrite/fresh) and prints a clear warning instead of crashing when the Codex package is incomplete.
- **`lib/settings-builder.js`** — dedupes stack hook entries before writing `settings.json`, and refuses to re-add a hook that is already wired in the base settings. Prevents duplicate `PostToolUse` invocations if a hook file ever appears in multiple stack packages. Covered by two new unit tests.
- **`bin/cli.js`** — `main()` invocation now has an explicit `.catch` handler, so any async error bubbling past the inner try/catch prints a clean message (stack in `DEBUG` mode) and exits 1 instead of triggering Node's default `UnhandledPromiseRejection` dump.
- **`lib/installer.js`** — install summary now computes the rules and skills count from the copy results instead of printing the hardcoded `Rules: 7` / `Skills: 5 + packages`, so the line stays accurate when stack rules, frontend-3d rules, or additional core rules ship with the toolkit.
- **`loop-guard.sh`** (core + showcase copy) — log path now honors `$TMPDIR` and falls back to `/tmp`, so the hook works on environments where `/tmp` isn't writable (sandboxed macOS contexts, Windows via WSL where `TMPDIR` points elsewhere).

### Changed
- **README — Frontend 3D section** — replaced the two-column 2×2 tables (Agents/Skills and Hooks/Rules) with single-column bullet lists per category. Much easier to scan on mobile and scales past 4 items per group without breaking the grid.
- **README — External design & asset resources** — new collapsible section (under Frontend 3D) grouping five curated resources: [React Bits](https://reactbits.dev) (open-source React components), [Unicorn.Studio](https://www.unicorn.studio) (no-code WebGL), [Cosmos](https://www.cosmos.so) (visual moodboards), [Free Faces](https://www.freefaces.gallery) (free fonts), and [Pixolite](https://pixolite.ru) (free 3D assets). The existing community skill packs and `gsap-master` MCP server are consolidated into the same block so there's one place to look for frontend resources.
- **README — `/dev` flow diagram** — replaced the mermaid block (which rendered a flat `P→E→Q` graph with empty-string edge labels) with a hand-authored SVG at `docs/dev-flow.svg`. Three pastel phase cards (Planning / Execution / Quality) list all 15 numbered steps with monospaced numbers for alignment, connected by two minimal arrows between phase headers — no per-step arrows, no redundant dashed lines. Subtle drop-shadow, gradient canvas, aligned typography (SF Mono for commands and numbers, system sans for labels).
- **README — resource sections reorganized** — "External Design & Asset Resources" and "Recommended Companion Tools" are now proper `###` headings (not tiny `<summary>` labels). SkillsMP and 21st.dev moved from the generic "Repos & Platforms" table into the design-focused block, and the one-row "Ecosystem & Companions" section (cc-skills-golang) was merged into Companion Tools under "Language-specific skill packs" so the two stray one-item sections no longer exist.

## [1.3.8] — 2026-04-09

### Added
- **`packages/frontend-3d/` package** — self-contained frontend/3D/animation development toolkit
- **`presentation-reviewer` agent** — 16-check review for scroll-driven sections: GSAP ScrollTrigger, phone frame conventions, combined sections, 3D textures
- **`r3f-scene-reviewer` agent** — 15-check review for R3F/Three.js: color management, performance, GLB handling, R3F patterns
- **`ui-design-reviewer` agent** — 16-check anti-slop UI review: typography, color calibration, layout diversity, motion quality, interactive states, glassmorphism
- **`frontend-perf-reviewer` agent** — 12-check performance review: bundle size, lazy loading, CSS containment, web vitals
- **`gsap-pattern-check.sh` hook** — 5 GSAP anti-pattern checks on .tsx files (scrub type, invalidateOnRefresh, tl.set extension, context, imports)
- **`r3f-color-check.sh` hook** — 4 Three.js color management checks (deprecated encoding, colorSpace, material type, toneMapped)
- **`tailwind-version-guard.sh` hook** — Tailwind v3 vs v4 syntax mismatch detection
- **`bundle-size-warn.sh` hook** — heavy package import detection (moment, lodash, THREE, chart.js, MUI, antd, framer-motion)
- **`threejs-color-management` skill** — sRGB vs Linear workflow, toneMapping, texture colorSpace, debug checklist
- **`r3f-scroll-driven-3d` skill** — GSAP ScrollTrigger → Zustand → R3F useFrame bridge pattern
- **`gltf-debugging` skill** — runtime GLB inspection: traverse, UV, material dump, texture replacement
- **`html-to-3d-texture` skill** — capture HTML/React as PNG for 3D (Playwright, html2canvas, CanvasTexture)
- **`product-3d-lighting` skill** — studio lighting setups for dark/light product showcases
- **`output-enforcement` skill** — anti-laziness: bans // ..., TODO, placeholder patterns
- **`gsap-conventions` rule** — scrub number, invalidateOnRefresh, tl.set, context cleanup, phase objects
- **`threejs-conventions` rule** — meshBasicMaterial for screens, UV settings, useFrame performance
- **`frontend-aesthetics-3d` rule** — anti-center bias, spring physics, 3D atmosphere, scroll-driven 3D
- **`/capture-screen` command** — capture React components as PNG textures for 3D model screens
- **`docs/guide/13-frontend-3d.md`** — guide chapter with installation, components, workflows
- **`docs/FRONTEND-3D.md`** — complete reference catalog with all checklists and troubleshooting
- **10 Codex skills** — all frontend-3d agents and skills ported to Codex CLI (50 → 60 total)

### Changed
- **Installer** — "Frontend 3D" added to stack selection, self-contained package support (`packages/{name}/` pattern)
- **`settings-builder.js`** — `collectStackHooks` supports dual path patterns for self-contained packages
- Stack agents: 9 → **13** (+4 frontend-3d)
- Commands: 15 → **16** (+capture-screen)
- Stack hooks: 9 → **13** (+4 frontend-3d)
- Stack rules: 2 → **5** (+3 frontend-3d)
- Skills: 5+1 → **5+6+1** (+6 frontend-3d knowledge skills)
- Codex skills: 50 → **60** (+10 frontend-3d)

## [1.3.7] — 2026-04-07

### Added
- **`/pair` command** — AI pair programming with 5 modes: Driver, Navigator, TDD Ping-Pong, Review, Debug. Session management with switch/pause/resume
- **`statusline.cjs` helper** — Claude Code status bar showing hook profile, stacks, git, migrations, counts. Pure Node.js, no deps
- **`writing-hooks` skill** — comprehensive hook authoring guide: lifecycle events, exit codes, profiles, best practices
- **Pseudocode phase (Phase 1.7)** in `/dev` — validate core algorithm before plan (complex tasks only)
- **Enhanced context persistence** — pre-compact-save captures arch decisions, plans, review findings, issues. session-context-restore injects them
- **`packages/core/helpers/`** — new directory for runtime helper scripts
- **Go Agents:** go-error-reviewer, go-concurrency-reviewer, go-performance-reviewer, go-modernizer, go-observability-reviewer
- **Go Hooks:** go-error-check-on-edit, go-context-check-on-edit, go-safety-check-on-edit, golangci-lint-on-edit
- **Go Rules:** go-conventions, go-safety (new `packages/stack-rules/go/` directory)
- **Commands:** /benchmark for Go benchmarks with benchstat comparison
- **Reference Docs:** 19 Go knowledge documents in `packages/stack-agents/go/references/`
- **EVALUATIONS.md:** Framework for measuring agent effectiveness
- **Ecosystem:** Recommended cc-skills-golang as companion plugin
- **All stack reviewers:** Added `AskUserQuestion` to allowed-tools
- **`superkit-counts-verify.sh`** — rewritten with 15+ comprehensive checks
- **`doc-check-on-commit.sh`** — detects new dependencies, blocks commit without README/CLAUDE.md

### Changed
- **go-reviewer:** Expanded checklist from 12 to 20 points, audit mode, cross-references
- **All stack reviewers:** Persona framing and operating modes (Coding/Review/Audit)
- **security-scanner:** 6 Go-specific security checks
- **security-patterns.sh:** Expanded Go detection
- **database-reviewer, test-generator, dependency-checker, debug-observer, architect:** Go patterns
- `/dev` orchestrator: 14 → **15 phases** (+pseudocode)
- Core commands: 13 → **15** (+benchmark, +pair)
- Core skills: 4 → **5** (+writing-hooks)
- Stack agents: 4 → **9** (+5 Go specialists)
- Stack hooks: 5 → **9** (+4 Go hooks)
- Stack rules: 0 → **2** (+go-conventions, +go-safety)
- Codex skills: 44 → **50** (+6 new Go + benchmark skills)
- `settings.json`: added `statusLine` configuration
- `installer.js`: copies statusline helper, updated skill count display

### Fixed
- **`bin/cli.js`** — version was hardcoded as '1.3.3', now reads from package.json dynamically
- **`settings.json`** — removed fork bomb deny rule that broke JSON parsing
- **`superkit-counts-verify.sh`, `evolve-check.sh`** — replaced `grep -P` (macOS incompatible) with POSIX `grep -oE`
- **`format-on-edit.sh`** — renamed to `go-format-on-edit.sh` to prevent overwriting core hook
- **Showcase counts** — fixed various stale count references

### Removed
- **`user-prompt-context.sh`** — removed UserPromptSubmit hook that duplicated built-in git status, caused timeout errors

---

## [1.3.6] — 2026-03-30

### Added
- **`frontend-aesthetics.md` rule** — path-scoped proactive anti-slop for frontend: typography, color, motion, AI pattern red flags. Activates only for .tsx/.jsx/.vue/.svelte/.css/.scss
- **`security-patterns.sh` hook** — PostToolUse real-time detection of eval(), innerHTML, pickle, os.system, fmt.Sprintf in SQL, GitHub Actions injection. Based on Anthropic official security-guidance plugin
- **`comment-rot-analyzer` agent** — detect stale TODOs (>6mo), lying comments, dead references, outdated API docs
- **`silent-failure-hunter` agent** — find swallowed errors: empty catches, `_ = err`, `2>/dev/null`, `|| true`, bare `except:`, linter suppressions across Go/JS/TS/Python/Bash
- **Confidence scoring formula** in code-reviewer — numerical 0-100 scale (start at 50, adjust per factor), threshold >=80 for high-confidence findings
- **Confidence distribution** in /review report — breakdown by HIGH (80-100) / MEDIUM (60-79) / LOW (<60, filtered)
- **Anti-hallucination rule** in coding-style — investigate before answering, verify packages exist, don't invent APIs
- **Surgical Changes principle** in coding-style — change only what was requested, no drive-by refactoring
- **Parallel Execution guidance** in coding-style — batch independent tool calls
- **Context awareness** in CLAUDE.md template — don't stop early, save progress before compaction
- **Subagent control** in CLAUDE.md template — when to use subagents vs direct work
- **Compaction recovery validation** — pre-compact validates save, session-restore validates JSON
- **Codex skills** — comment-rot-analyzer + silent-failure-hunter (Codex equivalents)

### Changed
- **`security.md` rule** — path-scoped: activates only for code/infra files, not docs
- **`/review` command** — dispatches comment-rot-analyzer + silent-failure-hunter, confidence breakdown in report
- **`code-reviewer` agent** — numerical 0-100 confidence with calculation formula
- Core agents: 25 → **27** (+comment-rot-analyzer, +silent-failure-hunter)
- Core hooks: 13 (+2 internal) → **14** (+security-patterns) (+2 internal)
- Core rules: 6 (+1 internal) → **7** (+frontend-aesthetics) (+1 internal)
- Codex skills: 42 → **44** (+comment-rot-analyzer, +silent-failure-hunter)

---

## [1.3.5] — 2026-03-29

### Added
- **`evaluator` agent** — calibrated QA evaluator: scores implementation against Sprint Contract criteria (0-10 with few-shot anchors), MUST/SHOULD priorities, structured critique with trend tracking across passes
- **Phase 2.1 (Sprint Contract)** in `/dev` — testable acceptance criteria generated BEFORE coding. 5-10 criteria for standard tasks, 10-20 for complex
- **Phase 3.5 (Evaluate + Iterate)** in `/dev` — conditional GAN loop: evaluator checks contract, iterates on FAIL (max 2 passes standard, 3 complex), escalates to architect if scores plateau
- **Design Quality dimension** in visual-reviewer — coherent whole vs assembled parts, calibrated 1-10 with score anchors
- **Originality dimension** in visual-reviewer — custom decisions vs AI template defaults, red flag detection (purple gradients, uniform cards, shadow-everything)
- **AI UI pattern detection** in ai-slop-cleaner — Category 6: detects AI-generated interface patterns in frontend code
- **Task state persistence** — pre-compact-save includes `.claude/.task-state.json`, session-context-restore injects it for multi-session /dev continuity
- **Cost metrics** in Phase 8 Report — agent dispatch count, evaluation passes, sprint contract score
- **Codex evaluator skill** — Codex equivalent of evaluator agent

### Changed
- **`/dev` phases**: 12 → **14** (+Sprint Contract, +Evaluate+Iterate)
- **Phase 1 complexity assessment** — enhanced with novelty, risk, and ambiguity factors (not just file/line count)
- **visual-reviewer** scoring — 8 → **10** dimensions (total stays 100pts, weights redistributed)
- Core agents: 24 → **25** (+evaluator)
- Codex skills: 41 → **42** (+evaluator)
### Added (post-audit)
- **`superkit-integrity.md` rule** — superkit-internal (not installed to user projects): 4-step verification before every commit
- **`superkit-counts-verify.sh` hook** — superkit-internal: blocks commit/push when VERSION != package.json or counts mismatch
- **Installer exclude lists** — superkit-internal rules and hooks are excluded from user installations (`copyDir` exclude parameter)
- **`.claude/settings.json`** for superkit repo — registers superkit-counts-verify.sh locally

### Fixed (post-audit)
- **package.json** version 1.3.3 → 1.3.5 (was out of sync with VERSION)
- **CLAUDE.md** structure comment: 24 → 25 agents
- **docs/guide/02-architecture.md**: 12-phase → 14-phase
- **docs/guide/01-getting-started.md**: jq → Node.js dependency, `bash setup.sh` → `npx`
- **docs/INSTALL-CLAUDE-CODE.md**: 41 → 42 Codex skills
- **docs/guide/10-codex-support.md**: 29 → 30 agent skills
- **packages/codex/INSTALL.md**: dev-orchestrator full 14-phase list

---

## [1.3.4] — 2026-03-29

### Changed
- **`/dev` command** — always-on: triggers automatically for all code tasks. Removed Quick Mode (`--quick`), removed Phase 3.5 (AI Slop Cleanup), removed Ambiguity Gate from Phase 1. Phase 6.5 (Critic) retained as independent evaluator
- **`dev-workflow.md` rule** — simplified to always-on: all code tasks trigger `/dev`, Phase 1 complexity assessment handles depth
- **`/dev` phases**: composition changed — removed Slop Cleanup, surfaced Goals in summary (still 12 phases)
- **Showcase `dev.md`** — synced with core: added Phase 6.5 (Critic)
- **Showcase `dev-workflow.md`** — synced with core: always-on
- **setup.sh → npx** — installer rewritten from 593-line bash to Node.js CLI. Install via `npx claude-code-superkit`. Zero external dependencies (no jq required). Works on macOS (any bash/zsh), Linux, and Windows
- **setup.sh** — now a 5-line POSIX sh wrapper that delegates to Node.js
- **`--defaults` flag** — non-interactive mode for CI/CD (`npx claude-code-superkit --defaults`)
- **CLI flags** — `--stacks=`, `--profile=`, `--extras=`, `--codex`, `--no-docs`, `--no-superpowers`
- **Graceful pipe handling** — if stdin closes during interactive mode, auto-falls back to `--defaults`

### Fixed
- **CRITICAL: `doc-check-on-commit.sh`** — bash `case` doesn't support `**` globs. Patterns like `*/src/**/*.tsx` only matched ONE level, silently skipping deeply nested files. Refactored to `in_dir()` helper using grep — works at ANY nesting depth with no hardcoded level limit. Hook was effectively broken for most project files
- **`user-prompt-context.sh`** — POSIX sh compatible, safe JSON via `node JSON.stringify()`, multiline git output flattened
- **`doc-check-on-commit.sh`** — expanded to 15+ doc category mappings (191→299 lines)
- **`/dev` threshold** — lowered from 100 to 50 changed lines for auto-trigger
- **Hook git-ignore protection** — Added `verify-hooks.sh` script, installer validation, and TROUBLESHOOTING guidance for the critical bug where `.gitignore` blocking `.claude/scripts/` silently disables all enforcement for cloned repos
- **Silent failures on macOS** — Bash 3.2 + `set -euo pipefail` caused script to exit without error message
- **Bash 3.2 incompatibility** — empty arrays + `set -u` triggered unbound variable errors
- **`pipefail` + `ls | wc -l`** — false errors when counting files
- **`cd` in tree fallback** — changed working directory unexpectedly
- **zsh users** — running `zsh setup.sh` crashed on `BASH_VERSINFO`
- **jq dependency removed** — JSON assembly now native in Node.js

### Added
- **`loop-guard.sh` hook** — PreToolUse: detects 3x repeated identical tool calls and A→B→A→B alternating patterns
- **`/workflow` command** — 6 predefined templates: bugfix, hotfix, spike, refactor, dep-upgrade, security-audit
- **`verify-hooks.sh`** — validates hooks are tracked in git, executable, not blocked by .gitignore
- **Codex INSTALL.md** — git-tracking warning for AGENTS.md and config.toml
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
