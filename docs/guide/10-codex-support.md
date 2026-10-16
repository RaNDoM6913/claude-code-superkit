# Chapter 10: Codex CLI Support

superkit works with both Claude Code and OpenAI Codex CLI. This chapter explains the differences and how to use superkit with Codex.

## Key Differences

| Concept | Claude Code | Codex CLI |
|---------|------------|-----------|
| Config directory | `.claude/` | `.codex/` (project) or `~/.codex/` (global) |
| Instructions file | `CLAUDE.md` | `AGENTS.md` |
| Agents | `.claude/agents/*.md` | Native/converted skills at project `.agents/skills/` or user `~/.agents/skills/` |
| Commands | `.claude/commands/*.md` (slash commands) | User-invocable skills selected through `$` or `/skills` |
| Hooks | `settings.json` | Native `hooks.json`; Superkit ships 2 bounded handlers in 1 script, requiring trust |
| Rules | `.claude/rules/*.md` | Project instructions in AGENTS.md plus execution-policy `default.rules` |
| Settings | `settings.json` (JSON) | `config.toml` (TOML) |
| Subagents | `Agent` tool | Discover available dispatch/result tools; CLI and desktop/API names differ |
| Task tracking | `TodoWrite` | Available plan tool, or concise conversation/project plan |
| Skills | `.claude/skills/*/SKILL.md` | Project `.agents/skills/` or user `~/.agents/skills/` folders containing SKILL.md |

## What Works in Both

**Skills share the SKILL.md structure.** Frontmatter and Markdown can be portable;
actual tool names, bundled dependencies, discovery and authority still need
runtime-specific checks. Matching format alone does not establish compatibility.

**Converted and native roles coexist.** The converter normalizes Claude agents into Codex skills. Roles listed in `packages/codex/native-skills.txt` are authored natively for GPT and preserved by the converter; a missing declared native role stops conversion before any writes.

**Commands convert to user-invocable skills.** Slash commands become skills with `user-invocable: true`. Users activate them by saying "use the dev-orchestrator skill" instead of typing `/dev`.

## What's Claude Code Only

Superkit's native Codex mapping covers recognized static destructive Git commands
in `PreToolUse` and read-only tracked/staged whitespace checks in `Stop`.
The following Claude behaviors have no shipped Codex mapping:

- Format/typecheck-on-edit, migration validation, dependency and documentation commit gates.
- Hook profiles: fast/standard/strict.
- Session continuity: pre-compact-save / session-context-restore.
- Full Stop verification of compilation, tests and documentation.

Run the applicable skills/project checks for those gates. Native hooks do not
supply missing tool/service authority or prove the whole workflow passed.

## Installation

### Automated standalone installation

From your target project's Git directory:

```bash
bash /path/to/claude-code-superkit/setup.sh --codex-only
```

This installs 82 Codex skills without Claude prerequisites, plugins or writes.
Skills are stored under `.codex/skills` and exposed through relative links under
`.agents/skills`. Re-run the same command after refreshing the Superkit checkout:
pristine managed skills (including recognized stock v1.5.2 files) and hook assets
are backed up and updated; custom or unknown content is preserved and reported.
Existing AGENTS, config, approval rules, active hooks and discovery entries are
preserved. Schema-1 manifests accept an optional `assets` map for hook updates.
The standard `--codex` option still installs Claude + Codex.

See the [installation/update contract](../../packages/codex/INSTALL.md) for
conflicts, recovery, filesystem restrictions and local package artifacts.

### Manual

For selective setup, copy or link chosen skill folders into project
`.agents/skills/`. Merge existing configuration/instructions manually. Linked
manual skills follow the source checkout and have no installer-managed backups.

## Native hook setup and limits

The installer manages `.codex/hooks/superkit.mjs` and the merge template
`.codex/superkit-hooks.json` with pristine hashes, conflict preservation and
backups. It creates a new active `.codex/hooks.json` only when that file is absent,
config is absent or exactly stock, and hook assets have no conflicts. Otherwise
review and merge the template into existing configuration manually.

Installation grants neither project nor hook trust. Review both definition and
script and use `/hooks` in the intended runtime. Existing definitions remain
preserved on updates; definition-hash trust does not fully attest script bytes,
so review script updates separately. See [official hook/trust documentation](https://learn.chatgpt.com/docs/hooks).

`PreToolUse` never returns permission allow; opaque shell commands are unassessed.
`Stop` first enumerates Git config keys only. Any configured `filter.*.clean` or
`filter.*.process`, including unused/global Git LFS drivers, skips both diffs with
UNVERIFIED to avoid executing conversion programs; no filter values are captured
and no Git config is changed. In filter-free repositories, it can request one
continuation after read-only `git diff --check` checks;
it does not establish tests/builds passed or verify untracked behavior. The script
runs no project scripts, reads no transcripts and contacts no external services.
The POSIX shell/Git-root wiring is not qualified for Windows or cloud runtimes.
Installation, trust, direct handler execution and observed native firing are
separate evidence levels. See the [complete setup/update contract](../../packages/codex/INSTALL.md#native-hooks-and-trust).

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
| `Agent` tool (dispatch subagent) | Available authorized dispatch tool, such as `spawn_agent` |
| Wait for agent result | Matching result/wait tool; do not interchange tool-specific identifiers |
| `TodoWrite` (task list) | Plan tool when available; otherwise concise written plan |
| `Skill` tool (invoke skill) | Explicit `$skill-name`/selection or runtime description-based selection |
| `Read`, `Write`, `Edit` | Available file tools, e.g. `apply_patch` |
| `Bash` | Available shell tool, e.g. `exec_command` |
| `Glob`, `Grep` | `rg --files`, `rg` or available search tools |

## Using Orchestrator Skills

In Claude Code you type `/review`. In Codex, say:

```
Use the review-orchestrator skill to review my recent changes
```

Or describe the task for runtime description-based selection:

```
Review the code changes in the last 3 commits
```

Selection depends on the active runtime and discovered skills; it is not a
guaranteed automatic launch. Explicitly select `$review-orchestrator` when needed.
Resolve and read its installed `SKILL.md`, declare the review target and retain
unavailable verification or independence as gaps. Migration scaffolding follows
the actual tool/dialect, migration execution requires bounded action authority,
and test/lint/benchmark utilities use available project tools.

## Skill Discovery

Codex scans project `.agents/skills/` and user `~/.agents/skills/`. After
installation, open `/skills` or type `$` in Codex to inspect available skills.
Restart if changes do not appear and resolve any installer discovery conflicts.
The packaged catalog contains 82 skills; discovery does not establish live
workflow behavior. See [official discovery documentation](https://learn.chatgpt.com/docs/build-skills).
