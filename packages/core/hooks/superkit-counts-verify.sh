#!/bin/bash
# superkit-counts-verify.sh — PreToolUse hook (Bash)
# Verifies file counts, versions, and documentation consistency before git commit/push
# Profile: standard, strict
# SUPERKIT-INTERNAL: only runs in the superkit repo itself
#
# FLAGS:
#   --check-remote   Also verify the GitHub About description via `gh repo view`
#                    (a network call). Off by default so every local commit
#                    stays offline-fast; the network check auto-enables on a
#                    `git push` command, where the remote About actually
#                    matters. Set SUPERKIT_VERIFY_CHECK_REMOTE=1 to force it on.
#
# EXIT CODES:
#   0 = allow (everything matches)
#   2 = BLOCK (mismatch detected)

# ── Flag parsing ────────────────────────────────────────────────────
CHECK_REMOTE="${SUPERKIT_VERIFY_CHECK_REMOTE:-0}"
for arg in "$@"; do
  case "$arg" in
    --check-remote) CHECK_REMOTE=1 ;;
  esac
done

# ── Internal-file ship-list (single source of truth) ────────────────
# These files live in packages/core/ but are NEVER installed into a user's
# .claude/ — they only run inside the superkit repo itself. They must be
# subtracted from the on-disk core counts to get the public "shipped" counts.
# Keep this list IN SYNC with lib/installer.js:
#   SUPERKIT_INTERNAL_HOOKS = ['superkit-counts-verify.sh', 'verify-hooks.sh']
#   SUPERKIT_INTERNAL_RULES = ['superkit-integrity.md']
SUPERKIT_INTERNAL_HOOKS="superkit-counts-verify.sh verify-hooks.sh"
SUPERKIT_INTERNAL_RULES="superkit-integrity.md"

# count_internal_present <dir> <space-separated-basenames>
# Counts how many of the named internal files actually exist in <dir>, so the
# subtraction tracks reality instead of a magic constant. If someone renames
# or removes an internal file (and updates installer.js + this list), the
# shipped count stays correct automatically.
count_internal_present() {
  local dir="$1"; shift
  local n=0 f
  for f in "$@"; do
    [ -f "$dir/$f" ] && n=$((n + 1))
  done
  printf '%s' "$n"
}

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

# Network About check runs on push (where it matters) or when --check-remote
# / SUPERKIT_VERIFY_CHECK_REMOTE=1 is given — not on every local commit.
if echo "$COMMAND" | grep -qE 'git\s+push'; then
  CHECK_REMOTE=1
fi

ERRORS=""

# ── Label-anchored table-cell extractor ─────────────────────────────
# claude_col <row-label> <pipe-field-number> — pull one cell from the
# CLAUDE.md "Current Counts" table by anchoring on the row label, then
# selecting the Nth pipe-delimited field. Robust against column/row reorders
# and embedded numbers in neighbouring cells (unlike `grep -oE | sed -n Np`).
# Field map for `| Component | Core | Stack | … | Showcase | Codex |`:
#   2=Label 3=Core 4=Stack 5=Frontend-3D 6=Frontend-UI 7=GAN 8=Extras 9=Showcase 10=Codex
# Returns the first integer in the cell, or empty if the cell holds no digits
# (e.g. a "—" placeholder) — callers skip the check when the result is empty.
claude_col() {
  local label="$1" field="$2"
  grep -E "^\| ${label} \|" CLAUDE.md 2>/dev/null | head -1 \
    | cut -d'|' -f"$field" | grep -oE '[0-9]+' | head -1
}

# readme_count <row-label> — pull the first integer from a README "What's
# Inside" table row, anchored on its bold label (e.g. `| **Core Agents** |`).
# Anchoring on the label means a row reorder can't silently shift the number.
readme_count() {
  local label="$1"
  grep -E "^\| \*\*${label}\*\* \|" README.md 2>/dev/null | head -1 \
    | cut -d'|' -f3 | grep -oE '[0-9]+' | head -1
}

# ── Count actual files ──────────────────────────────────────────────

# Core
CORE_AGENTS=$(ls packages/core/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
CORE_COMMANDS=$(ls packages/core/commands/*.md 2>/dev/null | wc -l | tr -d ' ')
CORE_HOOKS=$(ls packages/core/hooks/*.sh packages/core/hooks/*.py 2>/dev/null | wc -l | tr -d ' ')
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
for pkg in frontend-3d frontend-ui gan; do
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
EXTRAS_AGENTS=$({ ls packages/extras/*.md 2>/dev/null; ls packages/extras/*/agent.md 2>/dev/null; } | wc -l | tr -d ' ')

# Codex
CODEX_SKILLS=$(find packages/codex/skills -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')

# Showcase
SHOWCASE_AGENTS=$(ls packages/showcase/.claude/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
SHOWCASE_COMMANDS=$(ls packages/showcase/.claude/commands/*.md 2>/dev/null | wc -l | tr -d ' ')

# References
REFERENCE_DOCS=$(ls packages/stack-agents/go/references/*.md 2>/dev/null | wc -l | tr -d ' ')

# Totals — include frontend-3d (and any future self-contained pkg) in stack sums
TOTAL_AGENTS=$((CORE_AGENTS + STACK_AGENTS + PKG_AGENTS + EXTRAS_AGENTS))
# Internal-only core hooks/rules aren't shipped to users — subtract the ones
# that actually exist on disk (named ship-list above, in sync with
# installer.js) so TOTAL_* matches the public README/GitHub/CLAUDE.md counts.
# No magic constant: the count tracks the named list against reality.
INTERNAL_HOOKS_PRESENT=$(count_internal_present "packages/core/hooks" $SUPERKIT_INTERNAL_HOOKS)
INTERNAL_RULES_PRESENT=$(count_internal_present "packages/core/rules" $SUPERKIT_INTERNAL_RULES)
SHIPPED_CORE_HOOKS=$((CORE_HOOKS - INTERNAL_HOOKS_PRESENT))
TOTAL_HOOKS=$((SHIPPED_CORE_HOOKS + STACK_HOOKS + PKG_HOOKS))
SHIPPED_CORE_RULES=$((CORE_RULES - INTERNAL_RULES_PRESENT))
TOTAL_RULES=$((SHIPPED_CORE_RULES + STACK_RULES + PKG_RULES))
TOTAL_COMMANDS=$((CORE_COMMANDS + PKG_COMMANDS))

# ── Check VERSION vs package.json ───────────────────────────────────
VERSION_FILE=$(cat VERSION 2>/dev/null | tr -d '[:space:]')
PKG_VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null)

if [ "$VERSION_FILE" != "$PKG_VERSION" ]; then
  ERRORS="${ERRORS}\n  - VERSION ($VERSION_FILE) != package.json ($PKG_VERSION)"
fi

# ── Check CLAUDE.md counts table (label-anchored, column-precise) ────
# Field map: 3=Core 4=Stack 9=Showcase 10=Codex (see claude_col header).

# Core agents (Agents row, Core column)
CLAUDE_CORE_AGENTS=$(claude_col "Agents" 3)
if [ -n "$CLAUDE_CORE_AGENTS" ] && [ "$CLAUDE_CORE_AGENTS" != "$CORE_AGENTS" ]; then
  ERRORS="${ERRORS}\n  - CLAUDE.md Core Agents ($CLAUDE_CORE_AGENTS) != actual ($CORE_AGENTS)"
fi

# Stack agents (Agents row, Stack column)
CLAUDE_STACK_AGENTS=$(claude_col "Agents" 4)
if [ -n "$CLAUDE_STACK_AGENTS" ] && [ "$CLAUDE_STACK_AGENTS" != "$STACK_AGENTS" ]; then
  ERRORS="${ERRORS}\n  - CLAUDE.md Stack Agents ($CLAUDE_STACK_AGENTS) != actual ($STACK_AGENTS)"
fi

# Core commands (Commands row, Core column)
CLAUDE_COMMANDS=$(claude_col "Commands" 3)
if [ -n "$CLAUDE_COMMANDS" ] && [ "$CLAUDE_COMMANDS" != "$CORE_COMMANDS" ]; then
  ERRORS="${ERRORS}\n  - CLAUDE.md Commands ($CLAUDE_COMMANDS) != actual ($CORE_COMMANDS)"
fi

# Codex skills (Skills row, Codex column)
CLAUDE_CODEX=$(claude_col "Skills" 10)
if [ -n "$CLAUDE_CODEX" ] && [ "$CLAUDE_CODEX" != "$CODEX_SKILLS" ]; then
  ERRORS="${ERRORS}\n  - CLAUDE.md Codex Skills ($CLAUDE_CODEX) != actual ($CODEX_SKILLS)"
fi

# Showcase commands (Commands row, Showcase column)
CLAUDE_SHOWCASE_CMD=$(claude_col "Commands" 9)
if [ -n "$CLAUDE_SHOWCASE_CMD" ] && [ "$CLAUDE_SHOWCASE_CMD" != "$SHOWCASE_COMMANDS" ]; then
  ERRORS="${ERRORS}\n  - CLAUDE.md Showcase Commands ($CLAUDE_SHOWCASE_CMD) != actual ($SHOWCASE_COMMANDS)"
fi

# ── Check README total agent count (badge / "N agents" free text) ────
README_TOTAL_AGENTS=$(grep -oE '[0-9]+_agents|[0-9]+ agents' README.md 2>/dev/null | grep -oE '[0-9]+' | head -1)
if [ -n "$README_TOTAL_AGENTS" ] && [ "$README_TOTAL_AGENTS" != "$TOTAL_AGENTS" ]; then
  ERRORS="${ERRORS}\n  - README total agents ($README_TOTAL_AGENTS) != actual ($TOTAL_AGENTS)"
fi

# ── Check README "What's Inside" table (label-anchored by row) ───────
# Anchored on the bold row label so a row reorder can't shift the parse.
README_CORE_AGENTS=$(readme_count "Core Agents")
if [ -n "$README_CORE_AGENTS" ] && [ "$README_CORE_AGENTS" != "$CORE_AGENTS" ]; then
  ERRORS="${ERRORS}\n  - README Core Agents ($README_CORE_AGENTS) != actual ($CORE_AGENTS)"
fi

README_COMMANDS=$(readme_count "Commands")
if [ -n "$README_COMMANDS" ] && [ "$README_COMMANDS" != "$TOTAL_COMMANDS" ]; then
  ERRORS="${ERRORS}\n  - README Commands ($README_COMMANDS) != actual ($TOTAL_COMMANDS)"
fi

README_HOOKS=$(readme_count "Hooks")
if [ -n "$README_HOOKS" ] && [ "$README_HOOKS" != "$TOTAL_HOOKS" ]; then
  ERRORS="${ERRORS}\n  - README Hooks ($README_HOOKS) != actual ($TOTAL_HOOKS)"
fi

README_RULES=$(readme_count "Rules")
if [ -n "$README_RULES" ] && [ "$README_RULES" != "$TOTAL_RULES" ]; then
  ERRORS="${ERRORS}\n  - README Rules ($README_RULES) != actual ($TOTAL_RULES)"
fi

# ── Check README Codex skill count (look for "N skills" near "Codex" context) ──
README_CODEX=$(grep -i 'codex' README.md 2>/dev/null | grep -oE '[0-9]+ skills' | grep -oE '^[0-9]+' | head -1)
if [ -n "$README_CODEX" ] && [ "$README_CODEX" != "$CODEX_SKILLS" ]; then
  ERRORS="${ERRORS}\n  - README Codex skills ($README_CODEX) != actual ($CODEX_SKILLS)"
fi

# ── Check GitHub About description (network; gated by --check-remote) ──
# Off for local commits (offline-fast); auto-enabled on `git push` or via
# --check-remote / SUPERKIT_VERIFY_CHECK_REMOTE=1.
if [ "$CHECK_REMOTE" = "1" ] && command -v gh &>/dev/null; then
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
  echo "" >&2
  echo "BLOCKED: Superkit count/version mismatch detected" >&2
  echo "" >&2
  echo -e "  Mismatches:${ERRORS}" >&2
  echo "" >&2
  echo "  Actual counts:" >&2
  echo "    Core:     agents=$CORE_AGENTS commands=$CORE_COMMANDS hooks=$CORE_HOOKS rules=$CORE_RULES" >&2
  echo "    Stack:    agents=$STACK_AGENTS hooks=$STACK_HOOKS rules=$STACK_RULES" >&2
  echo "    Packages: agents=$PKG_AGENTS hooks=$PKG_HOOKS rules=$PKG_RULES commands=$PKG_COMMANDS" >&2
  echo "    Total:    agents=$TOTAL_AGENTS commands=$TOTAL_COMMANDS hooks=$TOTAL_HOOKS rules=$TOTAL_RULES" >&2
  echo "    Codex:    skills=$CODEX_SKILLS" >&2
  echo "    Showcase: agents=$SHOWCASE_AGENTS commands=$SHOWCASE_COMMANDS" >&2
  echo "    References: $REFERENCE_DOCS" >&2
  echo "    VERSION=$VERSION_FILE package.json=$PKG_VERSION" >&2
  echo "" >&2
  echo "  Fix: update documented counts to match, then run gh repo edit --description if GitHub About is wrong." >&2
  echo "" >&2
  exit 2
fi

exit 0
