#!/usr/bin/env bash
#
# convert-agents-to-codex-skills.sh
#
# Reads each .md file from packages/core/agents/,
# extracts the name from frontmatter, creates
# packages/codex/skills/{name}/SKILL.md with
# Codex-compatible frontmatter and normalizes common Claude Code
# tool references into Codex-native guidance.
#
# Usage:
#   bash tools/convert-agents-to-codex-skills.sh
#
# Run from the repository root (claude-code-superkit/).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

AGENTS_DIR="$REPO_ROOT/packages/core/agents"
SKILLS_DIR="$REPO_ROOT/packages/codex/skills"

if [ ! -d "$AGENTS_DIR" ]; then
  echo "ERROR: Agents directory not found: $AGENTS_DIR"
  exit 1
fi

normalize_body_for_codex() {
  local body="$1"

  printf '%s' "$body" | sed \
    -e 's/Claude Code agents/Codex skills/g' \
    -e 's/Claude Code Agents/Codex Skills/g' \
    -e 's/Claude Code agent/Codex skill/g' \
    -e 's/Claude Code Agent/Codex Skill/g' \
    -e 's/Claude Code slash commands/Codex user-invocable skills/g' \
    -e 's/Claude Code Commands/Codex User-Invocable Skills/g' \
    -e 's/\.claude\/agents\//.codex\/skills\/<skill-name>\//g' \
    -e 's/\.claude\/commands\//.codex\/skills\/<skill-name>\//g' \
    -e 's/Use the `Agent` tool to dispatch agents./Use `spawn_agent` to dispatch subagents when the user has authorized parallel agent work./g' \
    -e 's/Agent tool/spawn_agent/g' \
    -e 's/TodoWrite/update_plan/g' \
    -e 's/`Read`/`file reads`/g' \
    -e 's/`Grep`/`rg`/g' \
    -e 's/`Glob`/`rg --files`/g' \
    -e 's/`Bash`/`exec_command`/g' \
    -e 's/`Edit`/`apply_patch`/g' \
    -e 's/`Write`/`apply_patch`/g' \
    -e 's/Read, Grep, Glob/file reads, rg, rg --files/g' \
    -e 's/Bash, Read, Edit, Write, Glob, Grep/exec_command, file reads, apply_patch, apply_patch, rg --files, rg/g' \
    -e '/^model: /d' \
    -e '/^allowed-tools: /d' \
    -e '/Co-Authored-By: Claude <noreply@anthropic\.com>/d'
}

converted=0
skipped=0

for agent_file in "$AGENTS_DIR"/*.md; do
  [ -f "$agent_file" ] || continue

  filename="$(basename "$agent_file")"

  # Extract frontmatter fields
  name=""
  description=""
  in_frontmatter=false
  frontmatter_done=false
  body=""

  while IFS= read -r line; do
    if [ "$frontmatter_done" = true ]; then
      body="${body}${line}
"
      continue
    fi

    if [ "$in_frontmatter" = false ] && [ "$line" = "---" ]; then
      in_frontmatter=true
      continue
    fi

    if [ "$in_frontmatter" = true ] && [ "$line" = "---" ]; then
      frontmatter_done=true
      continue
    fi

    if [ "$in_frontmatter" = true ]; then
      # Extract name
      case "$line" in
        name:*)
          name="$(echo "$line" | sed 's/^name:[[:space:]]*//')"
          ;;
        description:*)
          description="$(echo "$line" | sed 's/^description:[[:space:]]*//')"
          ;;
      esac
    fi
  done < "$agent_file"

  # If no name found, derive from filename
  if [ -z "$name" ]; then
    name="${filename%.md}"
  fi

  # If no description found, use a generic one
  if [ -z "$description" ]; then
    description="Agent skill converted from $filename"
  fi
  description="$(printf '%s' "$description" | sed \
    -e 's/Claude Code/Codex/g' \
    -e 's/slash commands/user-invocable skills/g')"
  body="$(normalize_body_for_codex "$body")"

  # Create skill directory
  skill_dir="$SKILLS_DIR/$name"
  mkdir -p "$skill_dir"

  # Write SKILL.md with transformed frontmatter
  cat > "$skill_dir/SKILL.md" <<SKILLEOF
---
name: $name
description: $description
user-invocable: false
---
$body
SKILLEOF

  echo "  Converted: $filename -> skills/$name/SKILL.md"
  converted=$((converted + 1))
done

echo ""
echo "Done. Converted $converted agent(s) to Codex skills in $SKILLS_DIR"
