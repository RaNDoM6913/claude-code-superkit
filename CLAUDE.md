# claude-code-superkit

Production-tested agents, commands, hooks & skills for Claude Code and Codex CLI. All agents on Opus.

## Project Structure

```
packages/
  core/                     # Generic components (any project)
    agents/                 # 24 agents (all opus)
    commands/               # 11 commands
    hooks/                  # 11 hooks
    rules/                  # 6 rules
    skills/                 # 3 skills
    settings.json           # Hook wiring
    CLAUDE.md               # Template for users
    docs-templates/         # Architecture doc templates
  stack-agents/             # Language-specific reviewers
    go/                     # go-reviewer
    typescript/             # ts-reviewer
    python/                 # py-reviewer
    rust/                   # rs-reviewer
  stack-hooks/              # Language-specific hooks
    go/                     # format-on-edit, go-vet-on-edit
    typescript/             # typecheck-on-edit
    python/                 # ruff-on-edit
    rust/                   # cargo-check-on-edit
  extras/                   # Optional components (require specific setup)
    bot-reviewer.md         # Telegram/Discord/Slack bot review
    design-system-reviewer.md
    red-blue-auditor.md
    skillsmp-search/        # SkillsMP API search (requires API key)
  codex/                    # Codex CLI support
    skills/                 # 37 skills (converted from agents + commands)
    config.toml             # gpt-5.4, extra_high
    AGENTS.md               # Template
    INSTALL.md              # Guide
  showcase/                 # Production example (28 agents, 16 commands)
    .claude/                # Full .claude/ setup from real social app

setup.sh                    # Interactive installer
docs/
  guide/                    # 12 chapters
  examples/                 # 3 examples
  INSTALL-CLAUDE-CODE.md    # Detailed install guide
README.md
CHANGELOG.md
TROUBLESHOOTING.md
VERSION                     # 1.2.0
```

## Current Counts

| Component | Core | Stack | Extras | Showcase | Codex |
|-----------|------|-------|--------|----------|-------|
| Agents | 24 | 4 | 3 | 28 | — |
| Skills | 3 | — | 1 | 11 | 37 |
| Commands | 11 | — | — | 16 | 8 |
| Hooks | 11 | 5 | — | 13 | — |
| Rules | 6 | — | — | 5 | — |

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
4. **GitHub About** — `gh repo edit --description` if ANY count changed
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
- [ ] GitHub description counts match actual (`gh repo view --json description`)
- [ ] Codex AGENTS.md Available Skills lists are current
- [ ] Codex INSTALL.md counts match actual
- [ ] docs/INSTALL-CLAUDE-CODE.md counts match actual
- [ ] CHANGELOG has entry for the change

## Key Files

| File | What |
|------|------|
| `setup.sh` | Interactive installer — stack, extras, profile, plugins, validation |
| `packages/core/settings.json` | Hook wiring (PreToolUse, PostToolUse, Stop) + enabledPlugins |
| `packages/core/rules/documentation.md` | 3-layer doc enforcement rule |
| `packages/core/commands/dev.md` | 10-phase dev orchestrator with plan-checker + goal-verifier gates |
| `packages/core/commands/workflow.md` | Workflow templates: bugfix, hotfix, spike, refactor, dep-upgrade, security-audit |
| `packages/core/commands/review.md` | Double-verification review with --comment flag |
