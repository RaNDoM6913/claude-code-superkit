# claude-code-superkit

Production-tested agents, commands, hooks & skills for Claude Code and Codex CLI. All agents on Opus.

## Project Structure

```
packages/
  core/                     # Generic components (any project)
    agents/                 # 27 agents (all opus)
    commands/               # 15 commands
    hooks/                  # 13 hooks (+2 superkit-internal) = 15 total
    helpers/                # 1 helper (statusline.cjs)
    rules/                  # 7 rules (+1 superkit-internal)
    skills/                 # 5 skills
    settings.json           # Hook wiring + statusLine
    CLAUDE.md               # Template for users
    docs-templates/         # Architecture doc templates
  stack-agents/             # Language-specific reviewers
    go/                     # go-reviewer + 5 specialized (error, concurrency, performance, modernizer, observability)
      references/           # 19 Go knowledge documents
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
  extras/                   # Optional components (require specific setup)
    bot-reviewer.md         # Telegram/Discord/Slack bot review
    design-system-reviewer.md
    red-blue-auditor.md
    skillsmp-search/        # SkillsMP API search (requires API key)
  codex/                    # Codex CLI support
    skills/                 # 50 skills (9 commands + 32 agents + 9 stack)
    config.toml             # gpt-5.4, extra_high
    AGENTS.md               # Template
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
  guide/                    # 12 chapters
  examples/                 # 3 examples
  INSTALL-CLAUDE-CODE.md    # Detailed install guide
README.md
CHANGELOG.md
TROUBLESHOOTING.md
VERSION                     # 1.3.7
```

## Current Counts

| Component | Core | Stack | Extras | Showcase | Codex |
|-----------|------|-------|--------|----------|-------|
| Agents | 27 | 9 | 3 | 28 | — |
| Skills | 5 | — | 1 | 11 | 50 |
| Commands | 15 | — | — | 17 | 9 |
| Hooks | 13 (+2 internal) | 9 | — | 13 | — |
| Helpers | 1 | — | — | — | — |
| Rules | 7 (+1 internal) | 2 | — | 6 | — |

## Conventions

- **Model**: ALL agents use `model: opus`. No sonnet. No haiku.
- **Codex model**: `gpt-5.4` with `model_reasoning_effort = "extra_high"`
- **Agent format**: YAML frontmatter (name, description, model, allowed-tools) + markdown body
- **Phase 0**: Every agent starts with "Load Project Context" (reads CLAUDE.md + docs/architecture/)
- **Output format**: Severity (CRITICAL/WARNING/SUGGESTION) + Confidence (HIGH/MEDIUM/LOW)
- **Generic**: Core agents must NOT reference specific projects. Use auto-detection patterns.
- **Showcase**: May reference TGApp/SocialApp patterns (it's a real production example)

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
| `packages/core/commands/dev.md` | 15-phase always-on dev orchestrator with pseudocode + sprint contract + evaluator + plan-checker + goal-verifier + critic gates |
| `packages/core/commands/superkit-init.md` | Intelligent project setup — scan, generate docs, configure rules |
| `packages/core/commands/superkit-evolve.md` | Incremental documentation drift detection and fix |
| `packages/core/commands/workflow.md` | Workflow templates: bugfix, hotfix, spike, refactor, dep-upgrade, security-audit |
| `packages/core/commands/review.md` | Double-verification review with --comment flag |
