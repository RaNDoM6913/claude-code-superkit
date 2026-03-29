# Future Improvements Backlog

Ideas researched but deferred. Pick up when ready.

## Medium Priority (v1.5+)

| # | Idea | Source | What it does |
|---|------|--------|-------------|
| 1 | Agent persistent memory (`memory: project`) | Claude Code docs | Agents learn across sessions — reviewer remembers project patterns |
| 2 | Path-scoped rules (`paths: "src/api/**"`) | Claude Code docs | Rules only activate for matching files |
| 3 | `prompt` type hooks (AI-powered validation) | Claude Code docs | Replace bash scripts with AI evaluation |
| 4 | `if` conditionals in hooks | Claude Code docs | `"if": "Bash(rm *)"` — targeted hook triggers |
| 5 | Selective review (`/review tests errors`) | Official pr-review-toolkit | Run specific review dimensions, not all-or-nothing |
| 6 | Dynamic context injection in skills | Claude Code docs | `` !`command` `` syntax for live data in skill prompts |
| 7 | Subagent orchestration control | Anthropic prompting guide | Opus 4.6 overspawns subagents — add guidance |
| 8 | Dead rules validator | Community claude-rules-doctor | Verify `.claude/rules/` path globs match actual files |
| 9 | "Surgical Changes" principle | Community claude-forge | Anti-drive-by-refactoring rule |
| 10 | Hookify (NL → hooks) | Official hookify plugin | Create hooks from natural language descriptions |

## Lower Priority (v2.0+)

| # | Idea | Source |
|---|------|--------|
| 1 | Cross-model review (GPT reviews Claude's work) | claude-review-loop |
| 2 | Auto-generate rules from PR history | Tacit |
| 3 | Codebase cartography (parallel subagent mapping) | cartographer |
| 4 | Model routing (haiku/sonnet/opus by complexity) | claude-model-router-hook |
| 5 | Autonomous iteration loops (ralph-wiggum Stop hook) | Official ralph-wiggum plugin |
| 6 | Skill evaluation framework (measure error rate per skill) | samber/cc-skills |
| 7 | Context health monitoring (statusLine API) | claude-hud |
| 8 | TLDR code analysis (multi-layer summarization) | Continuous-Claude-v3 |
| 9 | Memory daemon (background learning extraction) | Continuous-Claude-v3 |
| 10 | Skill activation injection (SessionStart tells which skills apply) | Continuous-Claude-v3 |

## Reference Links

- Anthropic certification: https://anthropic.skilljar.com/
- Claude Code API course: https://anthropic.skilljar.com/claude-with-the-anthropic-api
- Claude Code in Action course: https://anthropic.skilljar.com/claude-code-in-action
- Official plugins: https://github.com/anthropics/claude-code/tree/main/plugins
- Frontend design skill: https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md
- Superpowers: https://github.com/obra/superpowers
- SkillsMP: https://skillsmp.com
