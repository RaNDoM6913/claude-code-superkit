#!/bin/bash
# cargo-check-on-edit.sh — PostToolUse hook for Edit/Write
# Runs cargo check in the nearest Cargo.toml directory after .rs file edits.
# Never touches the network: --offline (crates come from the local cache) and
# RUSTUP_AUTO_INSTALL=0 (an absent pinned toolchain is not downloaded).
# Never rewrites a tracked lockfile: --locked when Cargo.lock is tracked by git.
# Profile: strict only (a whole-crate check on every edit, like go vet)

# Unified profile + disable check
SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" != "strict" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.rs$ ]]; then
  exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# cargo not installed → skip quietly, like the other stack hooks
command -v cargo >/dev/null 2>&1 || exit 0

# Find nearest Cargo.toml by walking up from the file's directory
DIR=$(dirname "$FILE_PATH")
CARGO_ROOT=""
SEARCH_DIR="$DIR"
while [ "$SEARCH_DIR" != "/" ] && [ "$SEARCH_DIR" != "." ]; do
  if [ -f "$SEARCH_DIR/Cargo.toml" ]; then
    CARGO_ROOT="$SEARCH_DIR"
    break
  fi
  SEARCH_DIR=$(dirname "$SEARCH_DIR")
done

if [ -z "$CARGO_ROOT" ]; then
  exit 0
fi

cd "$CARGO_ROOT" 2>/dev/null || exit 0

CARGO_FLAGS=(--offline --message-format=short)

# --locked only when the lockfile in effect (nearest Cargo.lock at or above the
# crate, inside the git work tree — a workspace member uses the root's) is
# tracked: cargo errors on --locked when Cargo.lock is missing.
GIT_TOP=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -n "$GIT_TOP" ]; then
  LOCK_DIR=$(pwd -P)
  while :; do
    if [ -f "$LOCK_DIR/Cargo.lock" ]; then
      if git -C "$LOCK_DIR" ls-files --error-unmatch -- Cargo.lock >/dev/null 2>&1; then
        CARGO_FLAGS=(--locked "${CARGO_FLAGS[@]}")
      fi
      break
    fi
    [ "$LOCK_DIR" = "$GIT_TOP" ] || [ "$LOCK_DIR" = "/" ] || [ "$LOCK_DIR" = "." ] && break
    LOCK_DIR=$(dirname "$LOCK_DIR")
  done
fi

# Run cargo check (faster than cargo build, catches type/borrow errors)
RESULT=$(RUSTUP_AUTO_INSTALL=0 cargo check "${CARGO_FLAGS[@]}" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "cargo check errors in $CARGO_ROOT:" >&2
  # Short format puts the location first ("src/lib.rs:3:5: error[E0425]: …");
  # cargo's own errors ("error: could not compile …") start the line.
  ERRORS=$(printf '%s\n' "$RESULT" | grep -E '(^|: )error(\[[A-Za-z0-9]+\])?: ' | head -10)
  if [ -n "$ERRORS" ]; then
    printf '%s\n' "$ERRORS" >&2
  else
    printf '%s\n' "$RESULT" | tail -10 >&2
  fi
  WARN_COUNT=$(printf '%s\n' "$RESULT" | grep -cE ': warning(\[[A-Za-z0-9_-]+\])?: ')
  if [ "$WARN_COUNT" -gt 0 ]; then
    echo "($WARN_COUNT warnings)" >&2
  fi
  if printf '%s\n' "$RESULT" | grep -q -- '--locked'; then
    echo "(locked: Cargo.lock is out of date with Cargo.toml — refresh it with a normal cargo build; this hook never rewrites a tracked lockfile)" >&2
  elif printf '%s\n' "$RESULT" | grep -q -- '--offline'; then
    echo "(offline: a needed crate is not in the local cache — run \`cargo fetch\` once; this hook never downloads)" >&2
  fi
fi

exit 0
