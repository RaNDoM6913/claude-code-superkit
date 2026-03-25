
## Your First Commands

After installation, here's what to try:

### 1. Verify installation
Open Claude Code in your project and try:
```
/review --full
```
This dispatches reviewer agents against your entire codebase. You should see a dispatch plan, then findings grouped by severity.

### 2. Run a quick audit
```
/audit
```
Dispatches up to 4 parallel audit agents (frontend, backend, infra, security). Each produces a findings report.

### 3. Check project health
```
/dev <describe your task>
```
The dev orchestrator runs 8 phases: understand → plan → implement → verify → test → review → document → report.

### If Something Doesn't Work

1. **settings.json invalid?** Run `jq empty .claude/settings.json` — no output means valid
2. **Hooks not firing?** Run `chmod +x .claude/scripts/hooks/*.sh`
3. **No agents found?** Check `ls .claude/agents/` — should have .md files
4. **Need help?** See `TROUBLESHOOTING.md` in the superkit repo

## Prerequisites

| Tool | Required | Install |
|------|----------|---------|
| Claude Code CLI | Yes | `npm install -g @anthropic-ai/claude-code` |
| git | Yes | System package manager |
| jq | Yes | `brew install jq` (macOS) or `apt install jq` (Linux) |
| Superpowers plugin | Recommended | Claude Code → `/plugins` → search "superpowers" |
| GitHub CLI (gh) | Optional | `brew install gh` — needed for `--comment` in /review |
| tree | Optional | `brew install tree` — nicer project tree generation |
