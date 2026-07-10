#!/bin/bash
# superkit-update.sh — auto-update superkit files at session start
# Triggers on: SessionStart
# Profile: all (fast, standard, strict)
#
# Reads .claude/.superkit-meta (created by setup.sh) to find the superkit clone
# path. Compares install version (meta) vs source version (clone's VERSION file),
# pulls remote if behind, and re-syncs updated files when install lags source.
#
# CONTRACT (rewritten 2026-07-10 — see the D1 defect brief):
#   1. SELF-BOOTSTRAP first. The consumer runs its OWN copy of this script, so the
#      sync that ships a fix would otherwise be performed by the old, blind copy.
#      Before anything else, if the source clone's copy of this script differs from
#      the installed copy, replace the installed copy and re-exec it (guarded by an
#      env sentinel against re-exec loops).
#   2. NEVER copy a repo-only internal file (derived from packages/core/INTERNAL-FILES).
#   3. PRISTINE-PRESERVE. A consumer file is only overwritten when its CONTENT equals
#      the same file's blob at the install-baseline tag (v$INSTALL_VERSION) OR at any
#      of the last ~5 released tags. No tag matches → treat as locally customized →
#      preserve it and report it. Any uncertainty (missing tag, git error, no temp)
#      → PRESERVE (fail-safe). Content-only compare (cmp), never mtime, and NEVER
#      against the clone's HEAD/worktree blob (that is the *new* content, useless as
#      a pristine test).
#   4. A file absent in the consumer is created (that is not a clobber). Hooks stay +x.
#   5. Coverage: core agents/commands/hooks(.sh,.py)/rules/skills, hooks/lib/*.sh,
#      stack-agents (+ references), stack-hooks, stack-rules, and helpers/statusline.cjs
#      — all under the same pristine rule (a forked statusline is preserved).
#   6. Report one compact line at SessionStart, plus the preserved paths when any.
#
# Two independent triggers for sync:
#   1. Install-version lags source-version (someone pulled the clone but did not
#      sync this repo). Cheap local check, no network required.
#   2. Source clone is behind remote — pull, then re-check version.

# ── Read meta file (entry condition) ─────────────────────────────────
META_FILE="$CLAUDE_PROJECT_DIR/.claude/.superkit-meta"
if [ ! -f "$META_FILE" ]; then
  exit 0  # superkit source not tracked, skip
fi

source "$META_FILE"
SUPERKIT_STACKS="${SUPERKIT_STACKS:-}"

# Verify source exists (safety exits)
if [ ! -d "$SUPERKIT_SOURCE" ]; then
  exit 0  # clone directory missing, skip silently
fi
if [ ! -f "$SUPERKIT_SOURCE/VERSION" ]; then
  exit 0  # not a valid superkit clone
fi

# ── (1) SELF-BOOTSTRAP ───────────────────────────────────────────────
# Replace the installed copy of THIS script with the source's copy before doing
# anything destructive, then re-exec the fresh copy. The env sentinel breaks any
# re-exec loop. Guarded so a missing source/local copy, or an identical pair,
# is a no-op. This is the ONE file we always overwrite from source — it is
# self-managed infrastructure, so it is deliberately excluded from the pristine
# sync loop below (a consumer never "customizes" the updater).
SELF_SRC="$SUPERKIT_SOURCE/packages/core/hooks/superkit-update.sh"
SELF_LOCAL="$CLAUDE_PROJECT_DIR/.claude/scripts/hooks/superkit-update.sh"
if [ "${SUPERKIT_UPDATE_BOOTSTRAPPED:-}" != "1" ] \
   && [ -f "$SELF_SRC" ] && [ -f "$SELF_LOCAL" ] \
   && ! cmp -s "$SELF_SRC" "$SELF_LOCAL"; then
  if cp "$SELF_SRC" "$SELF_LOCAL" 2>/dev/null; then
    chmod +x "$SELF_LOCAL" 2>/dev/null
    export SUPERKIT_UPDATE_BOOTSTRAPPED=1
    exec bash "$SELF_LOCAL" "$@"
  fi
  # If the copy failed we fall through and run the current (old) logic once.
fi

# ── Cheap version check FIRST (no network) ───────────────────────────
# Detects the case where someone manually pulled the clone (or another project
# synced first) — install in this repo lags the source clone.
SOURCE_VERSION=$(cat "$SUPERKIT_SOURCE/VERSION" | tr -d '[:space:]')
INSTALL_VERSION="$SUPERKIT_VERSION"

NEED_SYNC=false
if [ "$INSTALL_VERSION" != "$SOURCE_VERSION" ]; then
  NEED_SYNC=true
fi

# Rate limit: check remote at most once per 6 hours. Version-mismatch bypasses
# the rate limit (we already know we need to sync).
LAST_UPDATE_FILE="$HOME/.claude/.superkit-update-last-check"
NOW=$(date +%s)
LAST=$(cat "$LAST_UPDATE_FILE" 2>/dev/null || echo "0")
DIFF=$((NOW - LAST))

SKIP_REMOTE_CHECK=false
if [ "$DIFF" -lt 21600 ]; then
  SKIP_REMOTE_CHECK=true
fi

# Fully up to date: install matches source AND we checked remote recently
if [ "$NEED_SYNC" = "false" ] && [ "$SKIP_REMOTE_CHECK" = "true" ]; then
  exit 0
fi

# ── Network check ────────────────────────────────────────────────────
if [ "$SKIP_REMOTE_CHECK" = "false" ]; then
  echo "$NOW" > "$LAST_UPDATE_FILE" 2>/dev/null

  cd "$SUPERKIT_SOURCE" 2>/dev/null && git fetch --quiet 2>/dev/null
  LOCAL=$(cd "$SUPERKIT_SOURCE" && git rev-parse HEAD 2>/dev/null)
  REMOTE=$(cd "$SUPERKIT_SOURCE" && git rev-parse @{u} 2>/dev/null)

  if [ -n "$LOCAL" ] && [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
    cd "$SUPERKIT_SOURCE" && git pull --quiet 2>/dev/null || {
      echo ""
      echo "⚠ superkit: git pull failed in $SUPERKIT_SOURCE"
      echo "  Run manually: cd $SUPERKIT_SOURCE && git pull"
      echo ""
      # Continue — install may still lag source even without pull
    }
    # Refresh source version after pull attempt
    SOURCE_VERSION=$(cat "$SUPERKIT_SOURCE/VERSION" | tr -d '[:space:]')
    if [ "$INSTALL_VERSION" != "$SOURCE_VERSION" ]; then
      NEED_SYNC=true
    fi
  fi
fi

# Nothing to sync after remote check either
if [ "$NEED_SYNC" = "false" ]; then
  exit 0
fi

# ── Sync setup ───────────────────────────────────────────────────────
NEW_VERSION="$SOURCE_VERSION"
OLD_VERSION="$INSTALL_VERSION"
PACKAGES="$SUPERKIT_SOURCE/packages"
CLAUDE_DIR="$CLAUDE_PROJECT_DIR/.claude"

# ── Internal-file ship-list (derived from the manifest) ──────────────
# packages/core/INTERNAL-FILES is the single source of truth for repo-only files
# that must NEVER be installed into a consumer's .claude/. We DERIVE the per-
# category basename lists from it so this hook, lib/installer.js, and
# superkit-counts-verify.sh never drift.
MANIFEST_FILE="$SUPERKIT_SOURCE/packages/core/INTERNAL-FILES"
manifest_category() {
  local category="$1" line dir base
  [ -f "$MANIFEST_FILE" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line#"${line%%[![:space:]]*}"}"   # ltrim
    line="${line%"${line##*[![:space:]]}"}"   # rtrim
    [ -z "$line" ] && continue
    case "$line" in \#*) continue ;; esac
    dir="${line%/*}"; base="${line##*/}"
    [ "$dir" = "$category" ] && printf '%s ' "$base"
  done < "$MANIFEST_FILE"
}
SUPERKIT_INTERNAL_HOOKS="$(manifest_category hooks)"
SUPERKIT_INTERNAL_RULES="$(manifest_category rules)"
# FALLBACK — PER CATEGORY: each list independently falls back to its hard-coded
# literal when its own manifest lookup yields nothing. (A joint both-empty guard
# let a manifest that lost just one category's lines silently ship that
# category's internal files — the exact D2 leak the manifest exists to prevent.)
# A broken updater is worse than a stale list. Literals live ONLY on the
# FALLBACK lines. When the manifest EXISTS but a category is empty, we warn on
# stderr — a silent fallback is how a corrupted manifest stays invisible; a
# MISSING manifest stays silent (benign: the source clone predates it).
if [ -z "${SUPERKIT_INTERNAL_HOOKS// }" ]; then
  [ -f "$MANIFEST_FILE" ] && echo "⚠ superkit-update: INTERNAL-FILES manifest has no 'hooks/' entries — using built-in fallback list" >&2
  SUPERKIT_INTERNAL_HOOKS="superkit-counts-verify.sh verify-hooks.sh"  # FALLBACK
fi
if [ -z "${SUPERKIT_INTERNAL_RULES// }" ]; then
  [ -f "$MANIFEST_FILE" ] && echo "⚠ superkit-update: INTERNAL-FILES manifest has no 'rules/' entries — using built-in fallback list" >&2
  SUPERKIT_INTERNAL_RULES="superkit-integrity.md"                      # FALLBACK
fi

in_list() {  # <needle> <space-separated-haystack>
  local needle="$1" hay="$2" x
  for x in $hay; do [ "$x" = "$needle" ] && return 0; done
  return 1
}

# ── Tags to compare against (pristine test) ──────────────────────────
# Baseline = the version the consumer customized FROM (v$INSTALL_VERSION), plus
# the last ~5 released tags so a file that is merely STALE (never synced, e.g.
# references/) still matches a released blob and updates rather than freezes.
RECENT_TAGS=$(git -C "$SUPERKIT_SOURCE" tag --list 'v*' --sort=-v:refname 2>/dev/null | head -5)
CHECK_TAGS=$(printf 'v%s\n%s\n' "$INSTALL_VERSION" "$RECENT_TAGS" | awk 'NF && !seen[$0]++')

# One reusable temp for git-show output; one for the preserved list. If mktemp
# fails, is_pristine treats every file as unverifiable → preserve (fail-safe).
GITSHOW_TMP=$(mktemp 2>/dev/null) || GITSHOW_TMP=""
PRESERVED_TMP=$(mktemp 2>/dev/null) || PRESERVED_TMP=""
trap 'rm -f "$GITSHOW_TMP" "$PRESERVED_TMP" 2>/dev/null' EXIT

# is_pristine <consumer_abs_path> <packages-relative-source-path>
# Returns 0 (safe to overwrite) iff the consumer's CONTENT matches the file's
# blob at one of CHECK_TAGS. Returns 1 (preserve) on any non-match/uncertainty.
is_pristine() {
  local consumer="$1" rel="$2" tag
  [ -n "$GITSHOW_TMP" ] || return 1   # no temp → cannot prove → preserve
  while IFS= read -r tag; do
    [ -z "$tag" ] && continue
    if git -C "$SUPERKIT_SOURCE" show "${tag}:packages/${rel}" > "$GITSHOW_TMP" 2>/dev/null; then
      cmp -s "$consumer" "$GITSHOW_TMP" && return 0
    fi
  done <<EOF
$CHECK_TAGS
EOF
  return 1
}

SYNCED=0
PRESERVED=0
SKIPPED=0

# sync_file <src_abs> <dst_abs> <src_packages_rel> [exec]
#   absent in consumer → create · pristine → overwrite · else → preserve+report
sync_file() {
  local src="$1" dst="$2" rel="$3" x="${4:-}"
  [ -f "$src" ] || return 0
  if [ ! -e "$dst" ]; then
    mkdir -p "$(dirname "$dst")" 2>/dev/null
    if cp "$src" "$dst" 2>/dev/null; then
      [ "$x" = "exec" ] && chmod +x "$dst" 2>/dev/null
      SYNCED=$((SYNCED + 1))
    fi
    return 0
  fi
  if is_pristine "$dst" "$rel"; then
    if cp "$src" "$dst" 2>/dev/null; then
      [ "$x" = "exec" ] && chmod +x "$dst" 2>/dev/null
      SYNCED=$((SYNCED + 1))
    fi
  else
    PRESERVED=$((PRESERVED + 1))
    [ -n "$PRESERVED_TMP" ] && printf '%s\n' "$dst" >> "$PRESERVED_TMP"
  fi
}

# ── Core agents ──────────────────────────────────────────────────────
for f in "$PACKAGES/core/agents/"*.md; do
  [ -f "$f" ] || continue
  b=$(basename "$f")
  sync_file "$f" "$CLAUDE_DIR/agents/$b" "core/agents/$b"
done

# ── Core commands ────────────────────────────────────────────────────
for f in "$PACKAGES/core/commands/"*.md; do
  [ -f "$f" ] || continue
  b=$(basename "$f")
  sync_file "$f" "$CLAUDE_DIR/commands/$b" "core/commands/$b"
done

# ── Core hooks (.sh AND .py) — skip internal + the self-managed updater ──
for f in "$PACKAGES/core/hooks/"*.sh "$PACKAGES/core/hooks/"*.py; do
  [ -f "$f" ] || continue
  b=$(basename "$f")
  [ "$b" = "superkit-update.sh" ] && continue   # self-managed via bootstrap
  if in_list "$b" "$SUPERKIT_INTERNAL_HOOKS"; then
    SKIPPED=$((SKIPPED + 1)); continue
  fi
  sync_file "$f" "$CLAUDE_DIR/scripts/hooks/$b" "core/hooks/$b" exec
done

# ── Core hook library (hooks/lib/*.sh — the :108 glob never descended here) ──
for f in "$PACKAGES/core/hooks/lib/"*.sh; do
  [ -f "$f" ] || continue
  b=$(basename "$f")
  sync_file "$f" "$CLAUDE_DIR/scripts/hooks/lib/$b" "core/hooks/lib/$b" exec
done

# ── Core rules — skip internal ───────────────────────────────────────
for f in "$PACKAGES/core/rules/"*.md; do
  [ -f "$f" ] || continue
  b=$(basename "$f")
  if in_list "$b" "$SUPERKIT_INTERNAL_RULES"; then
    SKIPPED=$((SKIPPED + 1)); continue
  fi
  sync_file "$f" "$CLAUDE_DIR/rules/$b" "core/rules/$b"
done

# ── Core skills (SKILL.md + any sibling files inside each skill dir) ──
for skill_dir in "$PACKAGES/core/skills/"*/; do
  [ -d "$skill_dir" ] || continue
  skill_name=$(basename "$skill_dir")
  for sf in "$skill_dir"*; do
    [ -f "$sf" ] || continue
    b=$(basename "$sf")
    sync_file "$sf" "$CLAUDE_DIR/skills/$skill_name/$b" "core/skills/$skill_name/$b"
  done
done

# ── Stack packages (only for installed stacks) ───────────────────────
for stack in $SUPERKIT_STACKS; do
  # Stack agents
  if [ -d "$PACKAGES/stack-agents/$stack" ]; then
    for f in "$PACKAGES/stack-agents/$stack/"*.md; do
      [ -f "$f" ] || continue
      b=$(basename "$f")
      sync_file "$f" "$CLAUDE_DIR/agents/$b" "stack-agents/$stack/$b"
    done
    # Stack agent references (on-demand knowledge docs — never synced before)
    if [ -d "$PACKAGES/stack-agents/$stack/references" ]; then
      for f in "$PACKAGES/stack-agents/$stack/references/"*.md; do
        [ -f "$f" ] || continue
        b=$(basename "$f")
        sync_file "$f" "$CLAUDE_DIR/agents/references/$b" "stack-agents/$stack/references/$b"
      done
    fi
  fi
  # Stack hooks (.sh AND .py)
  if [ -d "$PACKAGES/stack-hooks/$stack" ]; then
    for f in "$PACKAGES/stack-hooks/$stack/"*.sh "$PACKAGES/stack-hooks/$stack/"*.py; do
      [ -f "$f" ] || continue
      b=$(basename "$f")
      sync_file "$f" "$CLAUDE_DIR/scripts/hooks/$b" "stack-hooks/$stack/$b" exec
    done
  fi
  # Stack rules (never synced before — go-safety.md drifted two releases)
  if [ -d "$PACKAGES/stack-rules/$stack" ]; then
    for f in "$PACKAGES/stack-rules/$stack/"*.md; do
      [ -f "$f" ] || continue
      b=$(basename "$f")
      sync_file "$f" "$CLAUDE_DIR/rules/$b" "stack-rules/$stack/$b"
    done
  fi
done

# ── ADR template (project root, create-if-missing only) ──────────────
# dev.md Phase 2 + superkit-init.md reference docs-templates/adr-template.md at
# the PROJECT root (NOT .claude/ — note CLAUDE_DIR points at .claude). Create it
# when absent so the nudge never dangles (counts as synced). If present, leave it
# untouched and do NOT report it as preserved: it's a doc template consumers
# legitimately edit, so silence — not "preserved (locally customized)" — is right.
ADR_SRC="$PACKAGES/core/docs-templates/adr-template.md"
ADR_DST="$CLAUDE_PROJECT_DIR/docs-templates/adr-template.md"
if [ -f "$ADR_SRC" ] && [ ! -e "$ADR_DST" ]; then
  mkdir -p "$(dirname "$ADR_DST")" 2>/dev/null
  if cp "$ADR_SRC" "$ADR_DST" 2>/dev/null; then
    SYNCED=$((SYNCED + 1))
  fi
fi

# Settings.json — SKIP (user may have customized it)
# CLAUDE.md — SKIP (user fills it with project info)

# statusline.cjs — synced under the SAME pristine rule as everything else: a
# consumer who forked it keeps their fork (preserved + reported); an untouched
# copy gets the upstream improvements; an absent one is created.
sync_file "$PACKAGES/core/helpers/statusline.cjs" "$CLAUDE_DIR/scripts/statusline.cjs" "core/helpers/statusline.cjs"

# Keep hooks executable (matches the installer's +x behavior)
chmod +x "$CLAUDE_DIR/scripts/hooks/"*.sh 2>/dev/null
chmod +x "$CLAUDE_DIR/scripts/hooks/"*.py 2>/dev/null
chmod +x "$CLAUDE_DIR/scripts/hooks/lib/"*.sh 2>/dev/null

# ── Update meta version ──────────────────────────────────────────────
sed -i.bak "s/SUPERKIT_VERSION=.*/SUPERKIT_VERSION=\"$NEW_VERSION\"/" "$META_FILE" 2>/dev/null
rm -f "$META_FILE.bak"

# ── Report (compact — lands in every session start) ──────────────────
echo "superkit-update: $SYNCED synced · $PRESERVED preserved (locally customized) · $SKIPPED skipped (internal) · $OLD_VERSION → $NEW_VERSION"
if [ "$PRESERVED" -gt 0 ] && [ -n "$PRESERVED_TMP" ] && [ -f "$PRESERVED_TMP" ]; then
  while IFS= read -r dpath; do
    [ -z "$dpath" ] && continue
    echo "  preserved: $dpath"
  done < "$PRESERVED_TMP"
  echo "  review with: git -C $SUPERKIT_SOURCE show v$OLD_VERSION:packages/<srcpath> | diff - <consumerpath>"
fi

exit 0
