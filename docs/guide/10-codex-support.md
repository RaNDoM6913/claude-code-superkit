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

The current installer does not reproduce these Claude hook behaviors for Codex; native hook mapping remains a separate product package:

- **Hooks** — format-on-edit, typecheck-on-edit, git safety blocks, migration validation. Use editor plugins instead.
- **Hook profiles** — fast/standard/strict. Not applicable.
- **Session continuity** — pre-compact-save / session-context-restore.
- **Stop verification** — the prompt-based Stop hook that checks compilation and docs.

## Installation

### Automated standalone installation

From your target project's Git directory:

```bash
bash /path/to/claude-code-superkit/setup.sh --codex-only
```

This installs 82 Codex skills without Claude prerequisites, plugins or writes.
Skills are stored under `.codex/skills` and exposed through relative links under
`.agents/skills`. Re-run the same command after refreshing the Superkit checkout:
pristine managed skills (including recognized stock v1.5.2 files) are backed up
and updated; custom or unknown content is preserved and reported. Existing
AGENTS, config, approval rules and discovery entries are never replaced.
The standard `--codex` option still installs Claude + Codex.

See the [installation/update contract](../../packages/codex/INSTALL.md) for
conflicts, recovery, filesystem restrictions and local package artifacts.

### Manual

For selective setup, copy or link chosen skill folders into project
`.agents/skills/`. Merge existing configuration/instructions manually. Linked
manual skills follow the source checkout and have no installer-managed backups.

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

Codex scans project `.agents/skills/` and user `~/.agents/skills/`. After
installation, open `/skills` or type `$` in Codex to inspect available skills.
Restart if changes do not appear and resolve any installer discovery conflicts.
The packaged catalog contains 82 skills; discovery does not establish live
workflow behavior. See [official discovery documentation](https://learn.chatgpt.com/docs/build-skills).
