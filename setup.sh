#!/bin/bash
# claude-code-superkit — interactive installer
# Copies core + selected stack agents/hooks into your project's .claude/ directory

set -euo pipefail

VERSION="1.4.0"

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "claude-code-superkit v$VERSION — interactive installer"
  echo ""
  echo "Usage: bash setup.sh [options]"
  echo ""
  echo "Options:"
  echo "  --help, -h     Show this help"
  echo "  --version, -v  Show version"
  echo ""
  echo "Run from your project root (must be a git repository)."
  echo "Requires: git, jq. Recommended: claude CLI, tree."
  exit 0
fi

if [ "${1:-}" = "--version" ] || [ "${1:-}" = "-v" ]; then
  echo "claude-code-superkit v$VERSION"
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGES="$SCRIPT_DIR/packages"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1" >&2; exit 1; }

# ── Prerequisites ──────────────────────────────────────────
echo ""
echo "🚀 claude-code-superkit setup"
echo ""

# Check bash version
if [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
  warn "Bash 4+ recommended (you have ${BASH_VERSION}). Continuing anyway..."
fi

# Check git
if ! command -v git &>/dev/null; then
  fail "git is required but not found. Install git first."
fi

# Check jq
if ! command -v jq &>/dev/null; then
  fail "jq is required for settings.json assembly. Install: brew install jq (macOS) or apt install jq (Linux)"
fi

# Check claude CLI (recommended)
if ! command -v claude &>/dev/null; then
  warn "Claude Code CLI not found. Install: npm install -g @anthropic-ai/claude-code"
  warn "Superkit requires Claude Code to function. Continuing setup anyway..."
fi

# Check we're in a git repo
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  fail "Not inside a git repository. Run from your project root: cd /path/to/your-project && git init"
fi

PROJECT_DIR="$(git rev-parse --show-toplevel)"
CLAUDE_DIR="$PROJECT_DIR/.claude"

# Check superpowers plugin (recommended dependency)
SUPERPOWERS_DIR="$HOME/.claude/plugins/cache/claude-plugins-official/superpowers"
INSTALLED_PLUGINS="$HOME/.claude/plugins/installed_plugins.json"
if [ -d "$SUPERPOWERS_DIR" ]; then
  SP_VERSION=$(ls "$SUPERPOWERS_DIR" 2>/dev/null | sort -V | tail -1)
  info "Superpowers plugin found (v${SP_VERSION})"
else
  echo ""
  warn "Superpowers plugin is NOT installed."
  echo ""
  echo "  Superkit depends on superpowers for: brainstorming, TDD, debugging,"
  echo "  writing plans, verification, code review workflows."
  echo "  Without it, these features will silently fail."
  echo ""
  read -rp "Install superpowers automatically? [Y/n] " sp_install
  case "$sp_install" in
    n|N)
      warn "Skipping superpowers. Some features will not work."
      warn "To install later: open Claude Code → /plugins → search 'superpowers'"
      ;;
    *)
      echo "  Cloning superpowers from GitHub..."
      SP_TMP=$(mktemp -d)
      if git clone --depth 1 https://github.com/obra/superpowers.git "$SP_TMP/superpowers" 2>/dev/null; then
        # Read version from plugin manifest
        SP_VERSION=$(jq -r '.version' "$SP_TMP/superpowers/.claude-plugin/plugin.json" 2>/dev/null || echo "latest")
        SP_SHA=$(cd "$SP_TMP/superpowers" && git rev-parse HEAD)

        # Copy to cache
        mkdir -p "$SUPERPOWERS_DIR/$SP_VERSION"
        cp -r "$SP_TMP/superpowers/"* "$SUPERPOWERS_DIR/$SP_VERSION/"
        cp -r "$SP_TMP/superpowers/".* "$SUPERPOWERS_DIR/$SP_VERSION/" 2>/dev/null || true

        # Register in installed_plugins.json
        mkdir -p "$(dirname "$INSTALLED_PLUGINS")"
        if [ ! -f "$INSTALLED_PLUGINS" ]; then
          echo '{"version":2,"plugins":{}}' > "$INSTALLED_PLUGINS"
        fi

        SP_NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
        SP_ENTRY=$(cat <<SPEOF
{
  "scope": "user",
  "projectPath": "",
  "installPath": "$SUPERPOWERS_DIR/$SP_VERSION",
  "version": "$SP_VERSION",
  "installedAt": "$SP_NOW",
  "lastUpdated": "$SP_NOW",
  "gitCommitSha": "$SP_SHA"
}
SPEOF
)
        # Backup before mutation
        cp "$INSTALLED_PLUGINS" "$INSTALLED_PLUGINS.bak" 2>/dev/null || true

        # Add to registry (merge with existing)
        jq --argjson entry "[$SP_ENTRY]" \
          '.plugins["superpowers@claude-plugins-official"] = $entry' \
          "$INSTALLED_PLUGINS" > "$INSTALLED_PLUGINS.tmp" \
          && mv "$INSTALLED_PLUGINS.tmp" "$INSTALLED_PLUGINS"

        # Validate JSON integrity
        if ! jq empty "$INSTALLED_PLUGINS" 2>/dev/null; then
          warn "Plugin registry corrupted — restoring backup"
          cp "$INSTALLED_PLUGINS.bak" "$INSTALLED_PLUGINS" 2>/dev/null || true
        else
          rm -f "$INSTALLED_PLUGINS.bak"
        fi

        rm -rf "$SP_TMP"
        info "Superpowers plugin installed (v${SP_VERSION})"
      else
        rm -rf "$SP_TMP"
        warn "Failed to clone superpowers. Install manually:"
        echo "  Open Claude Code → /plugins → search 'superpowers'"
      fi
      ;;
  esac
  echo ""
fi

# ── Handle existing .claude/ ───────────────────────────────
if [ -d "$CLAUDE_DIR" ]; then
  echo ""
  warn "Existing .claude/ directory found."
  echo "  [m] Merge — add new files, skip existing"
  echo "  [o] Overwrite — backup to .claude.bak/ and replace"
  echo "  [a] Abort"
  read -rp "  Choice [m/o/a]: " choice
  case "$choice" in
    m|M) MODE="merge" ;;
    o|O)
      MODE="overwrite"
      if [ -d "$CLAUDE_DIR.bak" ]; then rm -rf "$CLAUDE_DIR.bak"; fi
      mv "$CLAUDE_DIR" "$CLAUDE_DIR.bak"
      info "Backed up to .claude.bak/"
      ;;
    *) echo "Aborted."; exit 0 ;;
  esac
else
  MODE="fresh"
fi

# ── Stack Selection ────────────────────────────────────────
echo ""
echo "[1/4] Select your stacks:"
STACKS=()

read -rp "  Go?         [y/N] " yn; [[ "$yn" =~ ^[Yy] ]] && STACKS+=(go)
read -rp "  TypeScript?  [y/N] " yn; [[ "$yn" =~ ^[Yy] ]] && STACKS+=(typescript)
read -rp "  Python?      [y/N] " yn; [[ "$yn" =~ ^[Yy] ]] && STACKS+=(python)
read -rp "  Rust?        [y/N] " yn; [[ "$yn" =~ ^[Yy] ]] && STACKS+=(rust)

# ── Extras Selection ───────────────────────────────────────
echo ""
echo "[2/4] Select extras:"
EXTRAS=()

read -rp "  Bot reviewer (Telegram/Discord/Slack)?  [y/N] " yn; [[ "$yn" =~ ^[Yy] ]] && EXTRAS+=(bot-reviewer)
read -rp "  Design system reviewer?                  [y/N] " yn; [[ "$yn" =~ ^[Yy] ]] && EXTRAS+=(design-system-reviewer)

# ── Profile Selection ──────────────────────────────────────
echo ""
echo "[3/4] Select hook profile:"
echo "  [f] fast     — minimal checks, maximum speed"
echo "  [s] standard — balanced (default)"
echo "  [x] strict   — everything including vet/check on each edit"
read -rp "  Choice [f/s/x]: " profile_choice
case "$profile_choice" in
  f|F) PROFILE="fast" ;;
  x|X) PROFILE="strict" ;;
  *)   PROFILE="standard" ;;
esac

# ── Plugin Selection ───────────────────────────────────────
echo ""
echo "[4/4] Claude Code plugins:"
echo ""
echo "  Base plugins (always enabled):"
echo "    ✓ superpowers  — TDD, brainstorming, debugging, verification"
echo "    ✓ github       — PR comments, issue tracking (/review --comment)"
echo "    ✓ context7     — library documentation lookup"
echo "    ✓ code-review  — enhanced code review workflows"
echo ""
echo "  Optional plugins:"
OPTIONAL_PLUGINS=()

read -rp "  code-simplifier (code cleanup/refactoring)?    [y/N] " yn
[[ "$yn" =~ ^[Yy] ]] && OPTIONAL_PLUGINS+=(code-simplifier)

read -rp "  playwright (browser automation, e2e tests)?    [y/N] " yn
[[ "$yn" =~ ^[Yy] ]] && OPTIONAL_PLUGINS+=(playwright)

# Auto-suggest frontend-design if TypeScript selected
if [[ " ${STACKS[*]+"${STACKS[*]}"} " =~ " typescript " ]]; then
  read -rp "  frontend-design (UI/design assistance)?       [Y/n] " yn
  yn="${yn:-y}"
  [[ "$yn" =~ ^[Yy] ]] && OPTIONAL_PLUGINS+=(frontend-design)
else
  read -rp "  frontend-design (UI/design assistance)?       [y/N] " yn
  [[ "$yn" =~ ^[Yy] ]] && OPTIONAL_PLUGINS+=(frontend-design)
fi

# ── Install ────────────────────────────────────────────────
echo ""
echo "Installing..."

copy_file() {
  local src="$1" dst="$2"
  if [ "$MODE" = "merge" ] && [ -f "$dst" ]; then
    return 0  # skip existing
  fi
  mkdir -p "$(dirname "$dst")" || { warn "Cannot create directory for $dst"; return 1; }
  cp "$src" "$dst" || { warn "Failed to copy $src → $dst"; return 1; }
}

copy_dir() {
  local src="$1" dst="$2"
  mkdir -p "$dst"
  for f in "$src"/*; do
    [ -f "$f" ] && copy_file "$f" "$dst/$(basename "$f")"
  done
}

# Core agents
copy_dir "$PACKAGES/core/agents" "$CLAUDE_DIR/agents"
AGENT_COUNT=$(ls "$PACKAGES/core/agents/"*.md 2>/dev/null | wc -l | tr -d ' ')
info "Copied $AGENT_COUNT agents → .claude/agents/"

# Core commands
copy_dir "$PACKAGES/core/commands" "$CLAUDE_DIR/commands"
CMD_COUNT=$(ls "$PACKAGES/core/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')
info "Copied $CMD_COUNT commands → .claude/commands/"

# Core hooks
mkdir -p "$CLAUDE_DIR/scripts/hooks"
for f in "$PACKAGES/core/hooks/"*.sh; do
  copy_file "$f" "$CLAUDE_DIR/scripts/hooks/$(basename "$f")"
done
HOOK_COUNT=$(ls "$PACKAGES/core/hooks/"*.sh 2>/dev/null | wc -l | tr -d ' ')

# Core rules
copy_dir "$PACKAGES/core/rules" "$CLAUDE_DIR/rules"

# Core skills
for skill_dir in "$PACKAGES/core/skills/"*/; do
  skill_name=$(basename "$skill_dir")
  mkdir -p "$CLAUDE_DIR/skills/$skill_name"
  copy_file "$skill_dir/SKILL.md" "$CLAUDE_DIR/skills/$skill_name/SKILL.md"
done

# Stack agents
STACK_AGENT_COUNT=0
for stack in "${STACKS[@]+"${STACKS[@]}"}"; do
  if [ -d "$PACKAGES/stack-agents/$stack" ]; then
    for f in "$PACKAGES/stack-agents/$stack/"*.md; do
      [ -f "$f" ] && copy_file "$f" "$CLAUDE_DIR/agents/$(basename "$f")" && ((STACK_AGENT_COUNT++))
    done
  fi
done

# Stack hooks
STACK_HOOK_COUNT=0
for stack in "${STACKS[@]+"${STACKS[@]}"}"; do
  if [ -d "$PACKAGES/stack-hooks/$stack" ]; then
    for f in "$PACKAGES/stack-hooks/$stack/"*.sh; do
      [ -f "$f" ] && copy_file "$f" "$CLAUDE_DIR/scripts/hooks/$(basename "$f")" && ((STACK_HOOK_COUNT++))
    done
  fi
done

TOTAL_HOOKS=$((HOOK_COUNT + STACK_HOOK_COUNT))
info "Copied $TOTAL_HOOKS hooks → .claude/scripts/hooks/ ($HOOK_COUNT core + $STACK_HOOK_COUNT stack)"

# Extras
EXTRA_COUNT=0
for extra in "${EXTRAS[@]+"${EXTRAS[@]}"}"; do
  if [ -f "$PACKAGES/extras/$extra.md" ]; then
    copy_file "$PACKAGES/extras/$extra.md" "$CLAUDE_DIR/agents/$extra.md"
    ((EXTRA_COUNT++))
  fi
done
[ "$EXTRA_COUNT" -gt 0 ] && info "Copied $EXTRA_COUNT extras → .claude/agents/"
[ "$STACK_AGENT_COUNT" -gt 0 ] && info "Copied $STACK_AGENT_COUNT stack agents → .claude/agents/"

# Make hooks executable
chmod +x "$CLAUDE_DIR/scripts/hooks/"*.sh 2>/dev/null

# Ensure ALL hooks are executable (covers merge mode + edge cases)
find "$CLAUDE_DIR/scripts/hooks" -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true

# ── Build settings.json ──────────────────────────────────
# Start with base settings
copy_file "$PACKAGES/core/settings.json" "$CLAUDE_DIR/settings.json"

# Add stack hooks to PostToolUse
SETTINGS="$CLAUDE_DIR/settings.json"
for stack in "${STACKS[@]+"${STACKS[@]}"}"; do
  for hook_file in "$PACKAGES/stack-hooks/$stack/"*.sh; do
    [ -f "$hook_file" ] || continue
    hook_name=$(basename "$hook_file")
    # Add to PostToolUse hooks array
    cp "$SETTINGS" "$SETTINGS.bak" 2>/dev/null || true
    jq --arg cmd "\"\$CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/$hook_name" \
      '.hooks.PostToolUse[0].hooks += [{"type": "command", "command": $cmd}]' \
      "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
    if ! jq empty "$SETTINGS" 2>/dev/null; then
      warn "settings.json corrupted by hook injection — restoring backup"
      cp "$SETTINGS.bak" "$SETTINGS"
    fi
  done
done
rm -f "$SETTINGS.bak"

# Add optional plugins to enabledPlugins
for plugin in "${OPTIONAL_PLUGINS[@]+"${OPTIONAL_PLUGINS[@]}"}"; do
  cp "$SETTINGS" "$SETTINGS.bak" 2>/dev/null || true
  jq --arg p "${plugin}@claude-plugins-official" \
    '.enabledPlugins[$p] = true' \
    "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
  if ! jq empty "$SETTINGS" 2>/dev/null; then
    warn "settings.json corrupted by plugin injection — restoring backup"
    cp "$SETTINGS.bak" "$SETTINGS"
  fi
done
rm -f "$SETTINGS.bak"

PLUGIN_COUNT=$(jq '.enabledPlugins | length' "$SETTINGS" 2>/dev/null || echo "4")
info "Built settings.json with $PROFILE profile hooks + $PLUGIN_COUNT plugins"

# ── Copy CLAUDE.md template ──────────────────────────────
if [ ! -f "$PROJECT_DIR/CLAUDE.md" ] || [ "$MODE" != "merge" ]; then
  copy_file "$PACKAGES/core/CLAUDE.md" "$PROJECT_DIR/CLAUDE.md"
  info "Created CLAUDE.md template"
else
  warn "CLAUDE.md already exists — skipped (merge mode)"
fi

# ── Documentation scaffolding (recommended) ──────────────
echo ""
echo "  All agents use Phase 0 — they read docs/architecture/ before reviewing."
echo "  Without these docs, agents work blind and produce less accurate reviews."
echo "  This step creates architecture templates (fill TODOs later) and a project tree."
echo ""
read -rp "Initialize documentation structure? (recommended) [Y/n] " docs_yn
docs_yn="${docs_yn:-y}"  # default to yes
if [[ "$docs_yn" =~ ^[Yy] ]]; then
  mkdir -p "$PROJECT_DIR/docs/architecture" "$PROJECT_DIR/docs/trees"
  TMPL_DIR="$PACKAGES/core/docs-templates/architecture"
  if [ -d "$TMPL_DIR" ]; then
    TMPL_COUNT=0
    for tmpl in "$TMPL_DIR/"*.md; do
      [ -f "$tmpl" ] || continue
      copy_file "$tmpl" "$PROJECT_DIR/docs/architecture/$(basename "$tmpl")"
      ((TMPL_COUNT++))
    done
    info "Copied $TMPL_COUNT architecture doc templates → docs/architecture/"

    # Auto-detect which templates are relevant and remove others
    REMOVED=0
    # No Go? Remove backend-layers
    if [ ! -f "$PROJECT_DIR/go.mod" ] && ! find "$PROJECT_DIR" -maxdepth 2 -name "go.mod" -print -quit 2>/dev/null | grep -q .; then
      [ -f "$PROJECT_DIR/docs/architecture/backend-layers.md" ] && rm "$PROJECT_DIR/docs/architecture/backend-layers.md" && ((REMOVED++))
    fi
    # No package.json with src/? Remove frontend-state
    if ! find "$PROJECT_DIR" -maxdepth 2 -name "package.json" -print -quit 2>/dev/null | grep -q .; then
      [ -f "$PROJECT_DIR/docs/architecture/frontend-state.md" ] && rm "$PROJECT_DIR/docs/architecture/frontend-state.md" && ((REMOVED++))
    fi
    # No migrations dir? Remove database-schema
    if ! find "$PROJECT_DIR" -maxdepth 3 -type d -name "migrations" -print -quit 2>/dev/null | grep -q .; then
      if ! find "$PROJECT_DIR" -maxdepth 2 -name "schema.prisma" -print -quit 2>/dev/null | grep -q .; then
        [ -f "$PROJECT_DIR/docs/architecture/database-schema.md" ] && rm "$PROJECT_DIR/docs/architecture/database-schema.md" && ((REMOVED++))
      fi
    fi
    # No Dockerfile? Remove deployment
    if [ ! -f "$PROJECT_DIR/Dockerfile" ] && [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
      if ! find "$PROJECT_DIR" -maxdepth 2 -name "Dockerfile" -print -quit 2>/dev/null | grep -q .; then
        [ -f "$PROJECT_DIR/docs/architecture/deployment.md" ] && rm "$PROJECT_DIR/docs/architecture/deployment.md" && ((REMOVED++))
      fi
    fi
    [ "$REMOVED" -gt 0 ] && info "Removed $REMOVED irrelevant templates (auto-detected)"
  else
    info "Created docs/architecture/ and docs/trees/ directories"
  fi

  # Generate project tree (no LLM needed — pure shell)
  TREE_FILE="$PROJECT_DIR/docs/trees/tree-project.md"
  {
    echo "# Project Tree"
    echo "> Auto-generated by setup.sh on $(date +%Y-%m-%d). Regenerate with tree-generator agent."
    echo ""
    echo '```'
    if command -v tree &>/dev/null; then
      tree "$PROJECT_DIR" -I 'node_modules|.git|__pycache__|vendor|dist|build|.next|.cache|*.pyc|.DS_Store' \
           --dirsfirst -L 3 2>/dev/null || echo "(tree command failed)"
    else
      # Fallback: find-based tree
      cd "$PROJECT_DIR"
      find . -maxdepth 3 \
        -not -path '*/node_modules/*' \
        -not -path '*/.git/*' \
        -not -path '*/dist/*' \
        -not -path '*/__pycache__/*' \
        -not -path '*/vendor/*' \
        -not -path '*/.next/*' \
        -not -path '*/.cache/*' \
        -not -name '.DS_Store' \
        -not -name '*.pyc' \
        | sort | head -100
    fi
    echo '```'
  } > "$TREE_FILE"
  info "Generated project tree → docs/trees/tree-project.md"
fi

# ── Codex CLI Support (optional) ──────────────────────────
echo ""
read -rp "Also install for Codex CLI? [y/N] " codex_yn
if [[ "$codex_yn" =~ ^[Yy] ]]; then
  # Check if codex CLI is available
  if ! command -v codex &>/dev/null; then
    warn "Codex CLI not found. Install: npm install -g @openai/codex"
    warn "Continuing with file setup anyway..."
  fi

  # Copy skills into project (not symlink — survives superkit removal)
  CODEX_SKILLS_DIR="$PROJECT_DIR/.codex/skills"
  mkdir -p "$CODEX_SKILLS_DIR"
  CODEX_SKILL_COUNT=0
  for skill_dir in "$PACKAGES/codex/skills/"*/; do
    skill_name=$(basename "$skill_dir")
    if [ "$MODE" = "merge" ] && [ -d "$CODEX_SKILLS_DIR/$skill_name" ]; then
      continue  # skip existing in merge mode
    fi
    mkdir -p "$CODEX_SKILLS_DIR/$skill_name"
    cp "$skill_dir/SKILL.md" "$CODEX_SKILLS_DIR/$skill_name/SKILL.md" 2>/dev/null && ((CODEX_SKILL_COUNT++))
  done
  info "Copied $CODEX_SKILL_COUNT Codex skills → .codex/skills/"

  # AGENTS.md template
  if [ ! -f "$PROJECT_DIR/AGENTS.md" ]; then
    cp "$PACKAGES/codex/AGENTS.md" "$PROJECT_DIR/AGENTS.md"
    info "Created AGENTS.md template"
  else
    warn "AGENTS.md already exists — skipped"
  fi

  # config.toml (always overwrite to ensure latest model)
  mkdir -p "$PROJECT_DIR/.codex"
  cp "$PACKAGES/codex/config.toml" "$PROJECT_DIR/.codex/config.toml"
  info "Created .codex/config.toml (gpt-5.4, extra_high reasoning)"

  CODEX_INSTALLED=true
else
  CODEX_INSTALLED=false
fi

# ── Post-Install Validation ──────────────────────────────
echo ""
VALIDATION_OK=true

# Check settings.json is valid
SETTINGS="$CLAUDE_DIR/settings.json"
if [ -f "$SETTINGS" ]; then
  if jq empty "$SETTINGS" 2>/dev/null; then
    info "Validation: settings.json is valid JSON"
  else
    warn "Validation: settings.json is INVALID — hooks will not work!"
    VALIDATION_OK=false
  fi
fi

# Check hooks are executable
NON_EXEC=$(find "$CLAUDE_DIR/scripts/hooks" -name "*.sh" ! -perm -111 2>/dev/null | wc -l | tr -d ' ')
if [ "$NON_EXEC" -gt 0 ]; then
  warn "Validation: $NON_EXEC hooks are not executable — fixing..."
  find "$CLAUDE_DIR/scripts/hooks" -name "*.sh" -exec chmod +x {} \; 2>/dev/null
else
  info "Validation: all hooks are executable"
fi

# Check CLAUDE.md exists
if [ -f "$PROJECT_DIR/CLAUDE.md" ]; then
  info "Validation: CLAUDE.md is present"
else
  warn "Validation: CLAUDE.md is missing"
  VALIDATION_OK=false
fi

# Check agents installed
INSTALLED_AGENTS=$(find "$CLAUDE_DIR/agents" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$INSTALLED_AGENTS" -gt 0 ]; then
  info "Validation: $INSTALLED_AGENTS agents installed"
else
  warn "Validation: no agents found — installation may have failed"
  VALIDATION_OK=false
fi

if [ "$VALIDATION_OK" = true ]; then
  echo ""
  info "All validation checks passed"
else
  echo ""
  warn "Some validation checks failed — review warnings above"
fi

# ── Summary ──────────────────────────────────────────────
TOTAL_AGENTS=$((AGENT_COUNT + STACK_AGENT_COUNT + EXTRA_COUNT))
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "Installation complete!"
echo ""
echo "  Claude Code:"
echo "    Agents:   $TOTAL_AGENTS ($AGENT_COUNT core + $STACK_AGENT_COUNT stack + $EXTRA_COUNT extras)"
echo "    Commands: $CMD_COUNT"
echo "    Hooks:    $TOTAL_HOOKS + Stop prompt"
echo "    Rules:    6"
echo "    Skills:   3"
echo "    Plugins:  $PLUGIN_COUNT"
echo "    Profile:  $PROFILE"
if [ "$CODEX_INSTALLED" = true ]; then
  INSTALLED_CODEX_SKILLS=$(find "$PROJECT_DIR/.codex/skills" -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
  echo ""
  echo "  Codex CLI:"
  echo "    Skills:   $INSTALLED_CODEX_SKILLS (copied to .codex/skills/)"
  echo "    Model:    gpt-5.4 (extra_high reasoning)"
  echo "    Config:   .codex/config.toml"
  echo "    Docs:     AGENTS.md"
fi
echo ""
echo "  Next steps:"
echo "    1. Run: claude"
echo "    2. Run: /superkit-init  ← intelligent project setup (auto-fills docs!)"
echo "    3. Install plugins: /plugins → install missing"
echo "    4. Try: /review or /audit"
echo ""
echo "  💡 /superkit-init scans your code and generates FILLED docs —"
echo "     no more manual TODO filling! Use --non-interactive for quick setup."
echo ""
echo "  ⚠ Plugins are ENABLED in settings.json but may need to be"
echo "    installed first. Open Claude Code → /plugins → install:"
PLUGIN_LIST="superpowers, github, context7, code-review"
for p in "${OPTIONAL_PLUGINS[@]+"${OPTIONAL_PLUGINS[@]}"}"; do
  PLUGIN_LIST="$PLUGIN_LIST, $p"
done
echo "    $PLUGIN_LIST"
echo ""
