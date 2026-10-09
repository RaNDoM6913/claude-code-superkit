# Chapter 10: Codex CLI Support

superkit works with both Claude Code and OpenAI Codex CLI. This chapter explains the differences and how to use superkit with Codex.

## Key Differences

| Concept | Claude Code | Codex CLI |
|---------|------------|-----------|
| Config directory | `.claude/` | `.codex/` (project) or `~/.codex/` (global) |
| Instructions file | `CLAUDE.md` | `AGENTS.md` |
| Agents | `.claude/agents/*.md` | `~/.agents/skills/*/SKILL.md` (global skills) |
| Commands | `.claude/commands/*.md` (slash commands) | No equivalent — converted to user-invocable skills |
| Hooks | `settings.json` (shell scripts) | No equivalent |
| Rules | `.claude/rules/*.md` | Inline in AGENTS.md |
| Settings | `settings.json` (JSON) | `config.toml` (TOML) |
| Subagents | `Agent` tool | `spawn_agent` + `wait_agent` |
| Task tracking | `TodoWrite` | `update_plan` |
| Skills | `.claude/skills/*/SKILL.md` | `~/.agents/skills/*/SKILL.md` (same format!) |

## What Works in Both

**Skills are 100% compatible.** The SKILL.md format (frontmatter + markdown body) is identical in Claude Code and Codex. No conversion needed for skills.

**Converted and native roles coexist.** The converter normalizes Claude agents into Codex skills. Roles listed in `packages/codex/native-skills.txt` are authored natively for GPT and preserved by the converter; a missing declared native role stops conversion before any writes.

**Commands convert to user-invocable skills.** Slash commands become skills with `user-invocable: true`. Users activate them by saying "use the dev-orchestrator skill" instead of typing `/dev`.

## What's Claude Code Only

These features have no Codex equivalent:

- **Hooks** — format-on-edit, typecheck-on-edit, git safety blocks, migration validation. Use editor plugins instead.
- **Hook profiles** — fast/standard/strict. Not applicable.
- **Session continuity** — pre-compact-save / session-context-restore.
- **Stop verification** — the prompt-based Stop hook that checks compilation and docs.

## Installation

### Via setup.sh

When running `setup.sh`, answer "y" to "Also install for Codex CLI?":

```
Also install for Codex CLI? [y/N] y
Copied 82 Codex skills → .codex/skills/
Created AGENTS.md template
Copied shipped Codex config template → .codex/config.toml
```

The installer copies skills into the current project. Existing project
instructions, Codex config, and approval rules are preserved and reported as
skipped; a manual symlink setup is a separate option below.

### Manual

```bash
# Symlink all superkit skills to Codex discovery path
mkdir -p ~/.agents/skills
ln -s /path/to/claude-code-superkit/packages/codex/skills ~/.agents/skills/superkit

# Copy templates
cp /path/to/claude-code-superkit/packages/codex/AGENTS.md ./AGENTS.md
cp /path/to/claude-code-superkit/packages/codex/config.toml .codex/config.toml
```

## config.toml

Codex uses TOML instead of JSON for configuration:

```toml
model = "gpt-6-astra"
model_reasoning_effort = "high"
web_search = "live"

[features]
multi_agent = true

[agents]
default_subagent_model = "gpt-5.6-sol"
default_subagent_reasoning_effort = "medium"
```

Astra coordinates and accepts critical decisions; Sol performs bounded delegated work. Skills themselves do not select a model. Explicit dispatch settings override the subagent defaults, and the runtime must support the requested model and effort. The installer preserves an existing project config. Configuration validation is separate from live behavioral acceptance, which remains pending for the migration.

## Tool Mapping

When reading superkit agent/command docs, translate tool references:

| Claude Code | Codex CLI |
|------------|-----------|
| `Agent` tool (dispatch subagent) | `spawn_agent` |
| Wait for agent result | `wait_agent` or `wait` |
| `TodoWrite` (task list) | `update_plan` |
| `Skill` tool (invoke skill) | Skills auto-activate from description |
| `Read`, `Write`, `Edit` | Same (native file tools) |
| `Bash` | Same (native shell tool) |
| `Glob`, `Grep` | Same (native search tools) |

## Using Orchestrator Skills

In Claude Code you type `/review`. In Codex, say:

```
Use the review-orchestrator skill to review my recent changes
```

Or simply describe what you want — skills auto-activate based on their description field:

```
Review the code changes in the last 3 commits
```

The review-orchestrator skill's description ("Use when reviewing code changes...") will match and activate automatically.

## Skill Discovery

Codex scans `~/.agents/skills/` at startup. After installation, verify:

```bash
codex --ask-for-approval never "List all superkit skills you can see"
```

You should see 82 skills: 9 command skills + 36 agent skills + 9 stack skills + 10 frontend-3d skills + 7 frontend-ui skills + 5 Go knowledge skills (samber-do/oops/lo, grpc-patterns, benchmark) + 6 TGApp skills.
