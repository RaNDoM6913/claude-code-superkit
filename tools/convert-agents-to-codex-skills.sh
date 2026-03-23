#!/usr/bin/env bash
#
# convert-agents-to-codex-skills.sh
#
# Reads each .md file from packages/core/agents/,
# extracts the name from frontmatter, creates
# packages/codex/skills/{name}/SKILL.md with
# Codex-compatible frontmatter (no model/allowed-tools,
# adds user-invocable: false).
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
