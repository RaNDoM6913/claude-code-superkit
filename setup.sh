#!/bin/bash
# claude-code-superkit — interactive installer
# Copies core + selected stack agents/hooks into your project's .claude/ directory

set -euo pipefail

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

# Check we're in a git repo
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  fail "Not inside a git repository. Run this from your project root."
fi

PROJECT_DIR="$(git rev-parse --show-toplevel)"
CLAUDE_DIR="$PROJECT_DIR/.claude"

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
echo "[1/3] Select your stacks:"
STACKS=()

read -rp "  Go?         [y/N] " yn; [[ "$yn" =~ ^[Yy] ]] && STACKS+=(go)
read -rp "  TypeScript?  [y/N] " yn; [[ "$yn" =~ ^[Yy] ]] && STACKS+=(typescript)
read -rp "  Python?      [y/N] " yn; [[ "$yn" =~ ^[Yy] ]] && STACKS+=(python)
read -rp "  Rust?        [y/N] " yn; [[ "$yn" =~ ^[Yy] ]] && STACKS+=(rust)

# ── Extras Selection ───────────────────────────────────────
echo ""
echo "[2/3] Select extras:"
EXTRAS=()

read -rp "  Bot reviewer (Telegram/Discord/Slack)?  [y/N] " yn; [[ "$yn" =~ ^[Yy] ]] && EXTRAS+=(bot-reviewer)
read -rp "  Design system reviewer?                  [y/N] " yn; [[ "$yn" =~ ^[Yy] ]] && EXTRAS+=(design-system-reviewer)

# ── Profile Selection ──────────────────────────────────────
echo ""
echo "[3/3] Select hook profile:"
echo "  [f] fast     — minimal checks, maximum speed"
echo "  [s] standard — balanced (default)"
echo "  [x] strict   — everything including vet/check on each edit"
read -rp "  Choice [f/s/x]: " profile_choice
case "$profile_choice" in
  f|F) PROFILE="fast" ;;
  x|X) PROFILE="strict" ;;
  *)   PROFILE="standard" ;;
esac

# ── Install ────────────────────────────────────────────────
echo ""
echo "Installing..."

copy_file() {
  local src="$1" dst="$2"
  if [ "$MODE" = "merge" ] && [ -f "$dst" ]; then
    return 0  # skip existing
  fi
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
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
for stack in "${STACKS[@]}"; do
  if [ -d "$PACKAGES/stack-agents/$stack" ]; then
    for f in "$PACKAGES/stack-agents/$stack/"*.md; do
      [ -f "$f" ] && copy_file "$f" "$CLAUDE_DIR/agents/$(basename "$f")" && ((STACK_AGENT_COUNT++))
    done
  fi
done

# Stack hooks
STACK_HOOK_COUNT=0
for stack in "${STACKS[@]}"; do
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
for extra in "${EXTRAS[@]}"; do
  if [ -f "$PACKAGES/extras/$extra.md" ]; then
    copy_file "$PACKAGES/extras/$extra.md" "$CLAUDE_DIR/agents/$extra.md"
    ((EXTRA_COUNT++))
  fi
done
[ "$EXTRA_COUNT" -gt 0 ] && info "Copied $EXTRA_COUNT extras → .claude/agents/"
[ "$STACK_AGENT_COUNT" -gt 0 ] && info "Copied $STACK_AGENT_COUNT stack agents → .claude/agents/"

# Make hooks executable
chmod +x "$CLAUDE_DIR/scripts/hooks/"*.sh 2>/dev/null

# ── Build settings.json ──────────────────────────────────
# Start with base settings
copy_file "$PACKAGES/core/settings.json" "$CLAUDE_DIR/settings.json"

# Add stack hooks to PostToolUse
SETTINGS="$CLAUDE_DIR/settings.json"
for stack in "${STACKS[@]}"; do
  for hook_file in "$PACKAGES/stack-hooks/$stack/"*.sh; do
    [ -f "$hook_file" ] || continue
    hook_name=$(basename "$hook_file")
    # Add to PostToolUse hooks array
    jq --arg cmd "\"$""CLAUDE_PROJECT_DIR\"/.claude/scripts/hooks/$hook_name" \
      '.hooks.PostToolUse[0].hooks += [{"type": "command", "command": $cmd}]' \
      "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
  done
done
info "Built settings.json with $PROFILE profile hooks"

# ── Copy CLAUDE.md template ──────────────────────────────
if [ ! -f "$PROJECT_DIR/CLAUDE.md" ] || [ "$MODE" != "merge" ]; then
  copy_file "$PACKAGES/core/CLAUDE.md" "$PROJECT_DIR/CLAUDE.md"
  info "Created CLAUDE.md template"
else
  warn "CLAUDE.md already exists — skipped (merge mode)"
fi

# ── Codex CLI Support (optional) ──────────────────────────
echo ""
read -rp "Also install for Codex CLI? [y/N] " codex_yn
if [[ "$codex_yn" =~ ^[Yy] ]]; then
  CODEX_SKILLS="$HOME/.agents/skills/superkit"
  if [ -L "$CODEX_SKILLS" ] || [ -d "$CODEX_SKILLS" ]; then
    warn "Codex skills already installed at $CODEX_SKILLS"
  else
    mkdir -p "$HOME/.agents/skills"
    ln -s "$PACKAGES/codex/skills" "$CODEX_SKILLS"
    info "Symlinked Codex skills → ~/.agents/skills/superkit"
  fi

  if [ ! -f "$PROJECT_DIR/AGENTS.md" ]; then
    cp "$PACKAGES/codex/AGENTS.md" "$PROJECT_DIR/AGENTS.md"
    info "Created AGENTS.md template"
  else
    warn "AGENTS.md already exists — skipped"
  fi

  mkdir -p "$PROJECT_DIR/.codex"
  if [ ! -f "$PROJECT_DIR/.codex/config.toml" ]; then
    cp "$PACKAGES/codex/config.toml" "$PROJECT_DIR/.codex/config.toml"
    info "Created .codex/config.toml"
  fi
  CODEX_INSTALLED=true
else
  CODEX_INSTALLED=false
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
echo "    Rules:    3"
echo "    Skills:   3"
echo "    Profile:  $PROFILE"
if [ "$CODEX_INSTALLED" = true ]; then
  CODEX_SKILL_COUNT=$(find "$PACKAGES/codex/skills" -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
  echo ""
  echo "  Codex CLI:"
  echo "    Skills:   $CODEX_SKILL_COUNT (symlinked to ~/.agents/skills/superkit)"
  echo "    Config:   .codex/config.toml"
  echo "    Docs:     AGENTS.md"
fi
echo ""
echo "  Next steps:"
echo "    1. Edit CLAUDE.md — fill in your project details"
echo "    2. Edit .claude/skills/project-architecture/SKILL.md"
echo "    3. Set profile: export CLAUDE_HOOK_PROFILE=$PROFILE"
echo "    4. Run: claude (or codex)"
echo "    5. Try: /review or /audit"
echo ""
