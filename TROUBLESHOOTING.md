# Troubleshooting

## Installation Issues

### "jq: command not found"
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq

# Fedora/RHEL
sudo dnf install jq

# Windows (Chocolatey)
choco install jq

# Windows (Scoop)
scoop install jq
```

### "Not inside a git repository"
Run setup.sh from your project root:
```bash
cd /path/to/your-project
git init  # if not already a git repo
bash /path/to/claude-code-superkit/setup.sh
```

### "Claude Code CLI not found"
```bash
npm install -g @anthropic-ai/claude-code
# or
npx @anthropic-ai/claude-code
```
This is a warning, not a blocker — setup.sh will continue. But you need Claude Code to actually use the superkit.

### Superpowers plugin failed to install
If auto-install in setup.sh failed (network error, etc.):
```bash
# Manual install:
# 1. Open terminal
# 2. Run: claude
# 3. Type: /plugins
# 4. Search: superpowers
# 5. Select and confirm install
```

## After Installation

### ❌ Hooks are git-ignored (CRITICAL — most common cause)

**Symptoms:** Hooks work on your machine but not for teammates. No doc enforcement, no git safety blocks.

**Cause:** `.gitignore` contains `.claude/scripts/` — hook scripts are invisible to git.

**Fix:**
1. Remove `.claude/scripts/` from `.gitignore`
2. Commit all hooks: `git add .claude/scripts/hooks/ && git commit -m "fix: track hook scripts in git"`
3. Verify: `bash .claude/scripts/hooks/verify-hooks.sh`

**Why this matters:** Hooks enforce documentation updates, block dangerous git commands, validate migrations, and check TypeScript types. If they're not in git, anyone who clones the repo gets zero enforcement.

### Hooks not firing
1. Check settings.json is valid JSON:
   ```bash
   jq empty .claude/settings.json
   # No output = valid. Error message = broken.
   ```
2. Check hooks are executable:
   ```bash
   ls -la .claude/scripts/hooks/*.sh
   # All should have 'x' in permissions (e.g., -rwxr-xr-x)
   ```
3. Fix permissions:
   ```bash
   chmod +x .claude/scripts/hooks/*.sh
   ```
4. Check the hook profile — the installer pins it in `.claude/settings.json`, which Claude Code applies over your shell in most sessions:
   ```bash
   jq -r '.env.CLAUDE_HOOK_PROFILE' .claude/settings.json
   # Should be: fast, standard, or strict. "fast" skips everything except the safety hooks.
   # Change it there (or in .claude/settings.local.json for yourself only).
   ```

### "/review" returns no results
- Ensure you have uncommitted changes: `git diff --stat HEAD~1`
- Check agents exist: `ls .claude/agents/`
- Try with explicit target: `/review HEAD~3`
- Try full scan: `/review --full`

### "/audit" dispatches no agents
- Verify agent files exist in `.claude/agents/`
- Check that `audit-frontend.md`, `audit-backend.md` etc. are present
- If using merge mode, existing files were kept as they were (merge only adds missing files) — re-run setup.sh with overwrite if an old copy is in the way

### Statusline shows no context percentage (`ctx` bar)
- On Claude Code builds that pass a native context window, the `ctx ██████░░░░ NN%` segment appears automatically.
- On older CLIs that pass no native `context_window`, the statusline reconstructs usage from the session transcript — if `ctx%` is still blank, the transcript path wasn't supplied to the statusline; update Claude Code.
- If `ctx%` shows but looks mis-scaled (e.g. a 1M-context model reading near 100%), set the real window: `export CLAUDE_CONTEXT_TOKENS_MAX=1000000`. The resolution path is fail-open, so this never breaks the statusline — see [Chapter 15](docs/guide/15-env-vars-and-hook-profiles.md).

### settings.json is corrupted
```bash
# Merge-mode re-runs back up the previous file before writing (newest last):
ls .claude/settings.json.bak-*
cp "$(ls .claude/settings.json.bak-* | tail -1)" .claude/settings.json

# Or regenerate: re-run setup.sh with overwrite mode
bash /path/to/claude-code-superkit/setup.sh
# Choose [o] overwrite when prompted
```

### Merge left my settings.json unchanged / "not valid JSON"
- Merge mode never rebuilds `settings.json` from defaults. Your keys, permissions, `env`, plugin `true`/`false` values and hooks are kept; superkit only adds hooks, plugins and `env.CLAUDE_HOOK_PROFILE` that are missing.
- "not valid JSON … left untouched" means nothing was applied: fix the JSON (`jq empty .claude/settings.json`) and re-run, or copy entries from `packages/core/settings.json` by hand.
- "kept your permissions unchanged; N superkit default deny rule(s) not added": copy the `permissions.deny` entries you want from `packages/core/settings.json`.
- "stack hook entries from an older superkit install … can be removed": installers before this fix wired stack hooks (e.g. `typecheck-on-edit.sh`, `go-*-on-edit.sh`) into the `PostToolUse` `Bash` group, where they never fire. The merge added them to the `Edit|Write` group; delete the listed entries from the `Bash` group when convenient.

### "ui-reviewer conflict" during install or update
`.claude/agents/ui-reviewer.md` has two superkit owners: core and the frontend-ui umbrella. Exactly one is installed — the umbrella when Frontend UI is selected (or listed in `SUPERKIT_STACKS` in `.claude/.superkit-meta`), otherwise core. An unmodified superkit copy is refreshed (same variant) or upgraded from core to the umbrella automatically; an umbrella is never downgraded to core (the updater notes that it kept it); a customised file is kept and reported. Compare it with the selected source (`packages/frontend-ui/agents/ui-reviewer.md` or `packages/core/agents/ui-reviewer.md`) and merge by hand.

### Superpowers skills not found by Claude
```bash
# Check if installed
ls ~/.claude/plugins/cache/claude-plugins-official/superpowers/

# If empty or missing:
# Open Claude Code → /plugins → search 'superpowers' → install
```

## Platform-Specific

### Windows / WSL
- **Use WSL2** (not WSL1 or Git Bash) for full compatibility
- Run setup.sh from WSL bash terminal
- Ensure `/bin/bash` exists in WSL
- Clone with correct line endings: `git config core.autocrlf input`
- If `tree` command is missing: `sudo apt install tree` (optional)

### Linux
- Ensure bash 4+: `bash --version`
- Install jq: `sudo apt install jq` or `sudo dnf install jq`
- If `tree` is missing: `sudo apt install tree` (optional, fallback exists)

### macOS
- Default bash is 3.x — install bash 4+: `brew install bash`
- Install jq: `brew install jq`
- setup.sh works with bash 3 but some edge cases may occur

## Common Mistakes

### Running setup.sh from the superkit directory
```bash
# WRONG — installs into the superkit itself
cd claude-code-superkit && bash setup.sh

# RIGHT — run from YOUR project
cd my-project && bash /path/to/claude-code-superkit/setup.sh
```

### Changing CLAUDE_HOOK_PROFILE in the shell has no effect
The installer writes the profile to `.claude/settings.json` → `env.CLAUDE_HOOK_PROFILE`, and Claude Code applies settings `env` over the shell in most sessions. Edit the value there, or set `env.CLAUDE_HOOK_PROFILE` in `.claude/settings.local.json` for a personal override.

### Editing settings.json manually and breaking JSON
Always validate after manual edits:
```bash
jq empty .claude/settings.json && echo "Valid" || echo "BROKEN"
```

## Getting Help

- Open an issue: https://github.com/RaNDoM6913/claude-code-superkit/issues
- Check the guide: `docs/guide/`
