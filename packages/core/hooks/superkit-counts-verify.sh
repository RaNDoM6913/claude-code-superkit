#!/bin/bash
# superkit-counts-verify.sh — PreToolUse hook (Bash)
# Verifies file counts, versions, and documentation consistency before git commit/push
# Profile: standard, strict
# SUPERKIT-INTERNAL: only runs in the superkit repo itself
#
# EXIT CODES:
#   0 = allow (everything matches)
#   2 = BLOCK (mismatch detected)

# Only run inside the superkit repo
if [ ! -f "packages/core/settings.json" ] || [ ! -d "packages/core/agents" ]; then
  exit 0
fi

# Read the tool input (PreToolUse payload: .tool_input.command).
# See doc-check-on-commit.sh for the historical-bug context — same JSON shape.
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // .command // empty' 2>/dev/null)

# Only trigger on git commit or git push
if ! echo "$COMMAND" | grep -qE 'git\s+(commit|push)'; then
  exit 0
fi

ERRORS=""

# ── Count actual files ──────────────────────────────────────────────

# Core
CORE_AGENTS=$(ls packages/core/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
CORE_COMMANDS=$(ls packages/core/commands/*.md 2>/dev/null | wc -l | tr -d ' ')
CORE_HOOKS=$(ls packages/core/hooks/*.sh 2>/dev/null | wc -l | tr -d ' ')
CORE_RULES=$(ls packages/core/rules/*.md 2>/dev/null | wc -l | tr -d ' ')

# Stack (per-language packages under packages/stack-*/)
STACK_AGENTS=0
STACK_HOOKS=0
STACK_RULES=0
for lang in go typescript python rust; do
  if [ -d "packages/stack-agents/$lang" ]; then
    COUNT=$(ls packages/stack-agents/$lang/*.md 2>/dev/null | wc -l | tr -d ' ')
    STACK_AGENTS=$((STACK_AGENTS + COUNT))
  fi
  if [ -d "packages/stack-hooks/$lang" ]; then
    COUNT=$(ls packages/stack-hooks/$lang/*.sh 2>/dev/null | wc -l | tr -d ' ')
    STACK_HOOKS=$((STACK_HOOKS + COUNT))
  fi
  if [ -d "packages/stack-rules/$lang" ]; then
    COUNT=$(ls packages/stack-rules/$lang/*.md 2>/dev/null | wc -l | tr -d ' ')
    STACK_RULES=$((STACK_RULES + COUNT))
  fi
done

# Self-contained packages (agents/hooks/rules/commands colocated in packages/<pkg>/)
PKG_AGENTS=0
PKG_HOOKS=0
PKG_RULES=0
PKG_COMMANDS=0
for pkg in frontend-3d frontend-ui; do
  if [ -d "packages/$pkg/agents" ]; then
    COUNT=$(ls packages/$pkg/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
    PKG_AGENTS=$((PKG_AGENTS + COUNT))
  fi
  if [ -d "packages/$pkg/hooks" ]; then
    COUNT=$(ls packages/$pkg/hooks/*.sh 2>/dev/null | wc -l | tr -d ' ')
    PKG_HOOKS=$((PKG_HOOKS + COUNT))
  fi
  if [ -d "packages/$pkg/rules" ]; then
    COUNT=$(ls packages/$pkg/rules/*.md 2>/dev/null | wc -l | tr -d ' ')
    PKG_RULES=$((PKG_RULES + COUNT))
  fi
  if [ -d "packages/$pkg/commands" ]; then
    COUNT=$(ls packages/$pkg/commands/*.md 2>/dev/null | wc -l | tr -d ' ')
    PKG_COMMANDS=$((PKG_COMMANDS + COUNT))
  fi
done

# Extras
EXTRAS_AGENTS=$(ls packages/extras/*.md 2>/dev/null | wc -l | tr -d ' ')

# Codex
CODEX_SKILLS=$(find packages/codex/skills -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')

# Showcase
SHOWCASE_AGENTS=$(ls packages/showcase/.claude/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
SHOWCASE_COMMANDS=$(ls packages/showcase/.claude/commands/*.md 2>/dev/null | wc -l | tr -d ' ')

# References
REFERENCE_DOCS=$(ls packages/stack-agents/go/references/*.md 2>/dev/null | wc -l | tr -d ' ')

# Totals — include frontend-3d (and any future self-contained pkg) in stack sums
TOTAL_AGENTS=$((CORE_AGENTS + STACK_AGENTS + PKG_AGENTS + EXTRAS_AGENTS))
# Internal-only core hooks aren't shipped to users — subtract them so TOTAL_HOOKS
# matches the number published in README/GitHub About / CLAUDE.md public counts.
# Ship-list: exclude superkit-counts-verify.sh + verify-hooks.sh (both are
# superkit-repo-internal per installer.js SUPERKIT_INTERNAL_HOOKS).
SHIPPED_CORE_HOOKS=$((CORE_HOOKS - 2))
TOTAL_HOOKS=$((SHIPPED_CORE_HOOKS + STACK_HOOKS + PKG_HOOKS))
# Rules: exclude superkit-integrity.md (internal, see installer.js SUPERKIT_INTERNAL_RULES)
SHIPPED_CORE_RULES=$((CORE_RULES - 1))
TOTAL_RULES=$((SHIPPED_CORE_RULES + STACK_RULES + PKG_RULES))
TOTAL_COMMANDS=$((CORE_COMMANDS + PKG_COMMANDS))

# ── Check VERSION vs package.json ───────────────────────────────────
VERSION_FILE=$(cat VERSION 2>/dev/null | tr -d '[:space:]')
PKG_VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null)

if [ "$VERSION_FILE" != "$PKG_VERSION" ]; then
  ERRORS="${ERRORS}\n  - VERSION ($VERSION_FILE) != package.json ($PKG_VERSION)"
fi

# ── Check CLAUDE.md counts table ────────────────────────────────────

# Core agents
CLAUDE_CORE_AGENTS=$(grep '| Agents |' CLAUDE.md 2>/dev/null | grep -oE '[0-9]+' | head -1)
if [ -n "$CLAUDE_CORE_AGENTS" ] && [ "$CLAUDE_CORE_AGENTS" != "$CORE_AGENTS" ]; then
  ERRORS="${ERRORS}\n  - CLAUDE.md Core Agents ($CLAUDE_CORE_AGENTS) != actual ($CORE_AGENTS)"
fi

# Stack agents
CLAUDE_STACK_AGENTS=$(grep '| Agents |' CLAUDE.md 2>/dev/null | grep -oE '[0-9]+' | sed -n '2p')
if [ -n "$CLAUDE_STACK_AGENTS" ] && [ "$CLAUDE_STACK_AGENTS" != "$STACK_AGENTS" ]; then
  ERRORS="${ERRORS}\n  - CLAUDE.md Stack Agents ($CLAUDE_STACK_AGENTS) != actual ($STACK_AGENTS)"
fi

# Core commands
CLAUDE_COMMANDS=$(grep '| Commands |' CLAUDE.md 2>/dev/null | grep -oE '[0-9]+' | head -1)
if [ -n "$CLAUDE_COMMANDS" ] && [ "$CLAUDE_COMMANDS" != "$CORE_COMMANDS" ]; then
  ERRORS="${ERRORS}\n  - CLAUDE.md Commands ($CLAUDE_COMMANDS) != actual ($CORE_COMMANDS)"
fi

# Codex skills
CLAUDE_CODEX=$(grep '| Skills |' CLAUDE.md 2>/dev/null | grep -oE '[0-9]+' | tail -1)
if [ -n "$CLAUDE_CODEX" ] && [ "$CLAUDE_CODEX" != "$CODEX_SKILLS" ]; then
  ERRORS="${ERRORS}\n  - CLAUDE.md Codex Skills ($CLAUDE_CODEX) != actual ($CODEX_SKILLS)"
fi

# Showcase commands — Commands row `| Commands | 15 | — | 1 | — | 17 | 9 |`
# grep -oE '[0-9]+' extracts non-dash columns in order: Core, Frontend, Showcase, Codex.
# Position 3 = Showcase when all 4 numeric columns exist.
CLAUDE_SHOWCASE_CMD=$(grep '| Commands |' CLAUDE.md 2>/dev/null | grep -oE '[0-9]+' | sed -n '3p')
if [ -n "$CLAUDE_SHOWCASE_CMD" ] && [ "$CLAUDE_SHOWCASE_CMD" != "$SHOWCASE_COMMANDS" ]; then
  ERRORS="${ERRORS}\n  - CLAUDE.md Showcase Commands ($CLAUDE_SHOWCASE_CMD) != actual ($SHOWCASE_COMMANDS)"
fi

# ── Check README total agent count ──────────────────────────────────
README_TOTAL_AGENTS=$(grep -oE '[0-9]+_agents|[0-9]+ agents' README.md 2>/dev/null | grep -oE '[0-9]+' | head -1)
if [ -n "$README_TOTAL_AGENTS" ] && [ "$README_TOTAL_AGENTS" != "$TOTAL_AGENTS" ]; then
  ERRORS="${ERRORS}\n  - README total agents ($README_TOTAL_AGENTS) != actual ($TOTAL_AGENTS)"
fi

# ── Check README Codex skill count (look for "N skills" near "Codex" context) ──
README_CODEX=$(grep -i 'codex' README.md 2>/dev/null | grep -oE '[0-9]+ skills' | grep -oE '^[0-9]+' | head -1)
if [ -n "$README_CODEX" ] && [ "$README_CODEX" != "$CODEX_SKILLS" ]; then
  ERRORS="${ERRORS}\n  - README Codex skills ($README_CODEX) != actual ($CODEX_SKILLS)"
fi

# ── Check GitHub About description (if gh available) ────────────────
if command -v gh &>/dev/null; then
  GH_DESC=$(gh repo view --json description -q '.description' 2>/dev/null)
  if [ -n "$GH_DESC" ]; then
    # Extract numbers from description: "agents (N), commands (N), hooks (N), skills (N), rules (N)"
    GH_AGENTS=$(echo "$GH_DESC" | grep -oE 'agents \([0-9]+\)' | grep -oE '[0-9]+')
    GH_COMMANDS=$(echo "$GH_DESC" | grep -oE 'commands \([0-9]+\)' | grep -oE '[0-9]+')
    GH_HOOKS=$(echo "$GH_DESC" | grep -oE 'hooks \([0-9]+\)' | grep -oE '[0-9]+')
    GH_RULES=$(echo "$GH_DESC" | grep -oE 'rules \([0-9]+\)' | grep -oE '[0-9]+')

    if [ -n "$GH_AGENTS" ] && [ "$GH_AGENTS" != "$TOTAL_AGENTS" ]; then
      ERRORS="${ERRORS}\n  - GitHub About agents ($GH_AGENTS) != actual ($TOTAL_AGENTS)"
    fi
    if [ -n "$GH_COMMANDS" ] && [ "$GH_COMMANDS" != "$TOTAL_COMMANDS" ]; then
      ERRORS="${ERRORS}\n  - GitHub About commands ($GH_COMMANDS) != actual ($TOTAL_COMMANDS)"
    fi
    if [ -n "$GH_HOOKS" ] && [ "$GH_HOOKS" != "$TOTAL_HOOKS" ]; then
      ERRORS="${ERRORS}\n  - GitHub About hooks ($GH_HOOKS) != actual ($TOTAL_HOOKS)"
    fi
    if [ -n "$GH_RULES" ] && [ "$GH_RULES" != "$TOTAL_RULES" ]; then
      ERRORS="${ERRORS}\n  - GitHub About rules ($GH_RULES) != actual ($TOTAL_RULES)"
    fi
  fi
fi

# ── Check CHANGELOG has current version ─────────────────────────────
if [ -n "$VERSION_FILE" ]; then
  if ! grep -q "$VERSION_FILE" CHANGELOG.md 2>/dev/null; then
    ERRORS="${ERRORS}\n  - CHANGELOG.md has no entry for version $VERSION_FILE"
  fi
fi

# ── Check Codex AGENTS.md skill count ───────────────────────────────
if [ -f "packages/codex/AGENTS.md" ]; then
  CODEX_AGENTS_LISTED=$(grep -oE '[0-9]+ skills' packages/codex/AGENTS.md 2>/dev/null | grep -oE '^[0-9]+' | head -1)
  if [ -n "$CODEX_AGENTS_LISTED" ] && [ "$CODEX_AGENTS_LISTED" != "$CODEX_SKILLS" ]; then
    ERRORS="${ERRORS}\n  - Codex AGENTS.md skill count ($CODEX_AGENTS_LISTED) != actual ($CODEX_SKILLS)"
  fi
fi

# ── Check Codex INSTALL.md skill count ──────────────────────────────
if [ -f "packages/codex/INSTALL.md" ]; then
  CODEX_INSTALL_COUNT=$(grep -oE '[0-9]+ skills' packages/codex/INSTALL.md 2>/dev/null | grep -oE '^[0-9]+' | head -1)
  if [ -n "$CODEX_INSTALL_COUNT" ] && [ "$CODEX_INSTALL_COUNT" != "$CODEX_SKILLS" ]; then
    ERRORS="${ERRORS}\n  - Codex INSTALL.md skill count ($CODEX_INSTALL_COUNT) != actual ($CODEX_SKILLS)"
  fi
fi

# ── Output result ───────────────────────────────────────────────────
if [ -n "$ERRORS" ]; then
  echo ""
  echo "BLOCKED: Superkit count/version mismatch detected"
  echo ""
  echo -e "  Mismatches:${ERRORS}"
  echo ""
  echo "  Actual counts:"
  echo "    Core:     agents=$CORE_AGENTS commands=$CORE_COMMANDS hooks=$CORE_HOOKS rules=$CORE_RULES"
  echo "    Stack:    agents=$STACK_AGENTS hooks=$STACK_HOOKS rules=$STACK_RULES"
  echo "    Packages: agents=$PKG_AGENTS hooks=$PKG_HOOKS rules=$PKG_RULES commands=$PKG_COMMANDS"
  echo "    Total:    agents=$TOTAL_AGENTS commands=$TOTAL_COMMANDS hooks=$TOTAL_HOOKS rules=$TOTAL_RULES"
  echo "    Codex:    skills=$CODEX_SKILLS"
  echo "    Showcase: agents=$SHOWCASE_AGENTS commands=$SHOWCASE_COMMANDS"
  echo "    References: $REFERENCE_DOCS"
  echo "    VERSION=$VERSION_FILE package.json=$PKG_VERSION"
  echo ""
  echo "  Fix: update documented counts to match, then run gh repo edit --description if GitHub About is wrong."
  echo ""
  exit 2
fi

exit 0
