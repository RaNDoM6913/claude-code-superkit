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
4. Check hook profile is set:
   ```bash
   echo $CLAUDE_HOOK_PROFILE
   # Should be: fast, standard, or strict
   # Set it: export CLAUDE_HOOK_PROFILE=standard
   ```

### "/review" returns no results
- Ensure you have uncommitted changes: `git diff --stat HEAD~1`
- Check agents exist: `ls .claude/agents/`
- Try with explicit target: `/review HEAD~3`
- Try full scan: `/review --full`

### "/audit" dispatches no agents
- Verify agent files exist in `.claude/agents/`
- Check that `audit-frontend.md`, `audit-backend.md` etc. are present
- If using merge mode, some agents may not have been copied — re-run setup.sh with overwrite

### settings.json is corrupted
```bash
# If backup exists (created during setup)
cp .claude/settings.json.bak .claude/settings.json

# Or regenerate: re-run setup.sh with overwrite mode
bash /path/to/claude-code-superkit/setup.sh
# Choose [o] overwrite when prompted
```

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

### Forgetting to set CLAUDE_HOOK_PROFILE
Add to your shell profile (`~/.zshrc`, `~/.bashrc`):
```bash
export CLAUDE_HOOK_PROFILE=standard
```

### Editing settings.json manually and breaking JSON
Always validate after manual edits:
```bash
jq empty .claude/settings.json && echo "Valid" || echo "BROKEN"
```

## Getting Help

- Open an issue: https://github.com/RaNDoM6913/claude-code-superkit/issues
- Check the guide: `packages/core/docs/guide/`
