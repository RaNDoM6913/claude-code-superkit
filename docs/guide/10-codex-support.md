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

**Agents convert to skills.** Claude Code agents (with `model:` and `allowed-tools:` frontmatter) become Codex skills by removing those fields and adding `user-invocable: false`.

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
✓ Symlinked Codex skills → ~/.agents/skills/superkit
✓ Created AGENTS.md template
✓ Created .codex/config.toml
```

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
model = "o3"
model_reasoning_effort = "high"

[features]
multi_agent = true    # Required for orchestrator skills
web_search = true
```

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

You should see 37 skills: 25 agent skills + 8 command skills + 4 stack skills.
