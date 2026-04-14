#!/bin/bash
# dev-required-on-commit.sh — BLOCK commits when ≥N code edits happened
#                              without /dev orchestration
# Triggers on: PreToolUse(Bash) when command contains "git commit"
# Profile: standard, strict
#
# Layer 3 enforcement of .claude/rules/dev-workflow.md:
#
#   Claude MUST follow the /dev orchestration for ALL tasks that involve
#   code changes — without the user explicitly calling /dev.
#
# Session-local state:
#   ${TMPDIR}/claude-edit-count-${SESSION_KEY}  — counter (dev-edit-counter.sh)
#   ${TMPDIR}/claude-dev-marker-${SESSION_KEY}  — /dev marker (dev-marker-set.sh)
#
# Long-lived state (Task 11 anti-reset cycle detection):
#   ~/.claude/state/dev-cycles-${SESSION_KEY}.jsonl — one line per reset
#     { ts, outcome: "allow-under-threshold" | "allow-with-dev" |
#                    "allow-override", tag?, counter }
#   If the last hour contains ≥2 override-ended cycles, strictness rises
#   (threshold 3 → 2). ≥3 consecutive override-ended cycles → override
#   DISABLED for 60 minutes; /dev is required unconditionally.
#
# Logic:
#   - count < THRESHOLD                   → allow + reset + cycle log
#   - count ≥ THRESHOLD + marker exists   → allow + reset + cycle log
#   - override tag present (+ passes     → allow + reset + cycle log
#     Task 12 rationale checks)
#   - otherwise                           → block (exit 2)
#
# THRESHOLD:
#   Default 3. If anti-reset detected 2+ override cycles in the last 60
#   min, THRESHOLD drops to 2. If 3+ consecutive override cycles, the
#   override path is DISABLED (forced recovery).
#
# EXIT CODES:
#   0 = allow
#   2 = BLOCK (no /dev + no valid override)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // .command // empty' 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)

# Match `git commit` including `git -C <path> commit`
if ! echo "$COMMAND" | grep -qE 'git(\s+-[cC]\s+\S+)*\s+commit'; then
  exit 0
fi

SESSION_KEY="${SESSION_ID:-${CLAUDE_HOOK_PID:-$PPID}}"
COUNTER="${TMPDIR:-/tmp}/claude-edit-count-${SESSION_KEY}"
MARKER="${TMPDIR:-/tmp}/claude-dev-marker-${SESSION_KEY}"
CYCLES_DIR="$HOME/.claude/state"
CYCLES_FILE="$CYCLES_DIR/dev-cycles-${SESSION_KEY}.jsonl"
mkdir -p "$CYCLES_DIR" 2>/dev/null

log_cycle() {
  # $1 = outcome, $2 = optional tag, $3 = counter value
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  printf '{"ts":"%s","outcome":"%s","tag":"%s","counter":%s}\n' \
    "$ts" "$1" "${2:-}" "${3:-0}" >> "$CYCLES_FILE" 2>/dev/null
}

reset_state() {
  rm -f "$COUNTER" "$MARKER"
}

# ── Analyse last hour of cycles (anti-reset detection) ──
cycles_last_hour() {
  # Output: count of override-ended cycles in the last 60 minutes
  [ -f "$CYCLES_FILE" ] || { echo 0; return; }
  local cutoff
  cutoff=$(date -u -v-60M +%s 2>/dev/null || date -u -d '60 minutes ago' +%s 2>/dev/null || echo 0)
  awk -v cutoff="$cutoff" '
    /"outcome":"allow-override"/ {
      match($0, /"ts":"([^"]+)"/, a); if (!a[1]) next
      "date -u -j -f %Y-%m-%dT%H:%M:%SZ " a[1] " +%s 2>/dev/null || date -u -d " a[1] " +%s 2>/dev/null" | getline ts
      if (ts+0 >= cutoff+0) n++
    }
    END { print n+0 }
  ' "$CYCLES_FILE"
}

consecutive_override_tail() {
  # Output: number of override cycles at the END of the log (consecutive)
  [ -f "$CYCLES_FILE" ] || { echo 0; return; }
  tac "$CYCLES_FILE" 2>/dev/null | awk '
    /"outcome":"allow-override"/ { n++; next }
    { exit }
    END { print n+0 }
  '
}
# macOS ships with `tail -r` but not `tac` — provide a fallback
if ! command -v tac >/dev/null 2>&1; then
  consecutive_override_tail() {
    [ -f "$CYCLES_FILE" ] || { echo 0; return; }
    tail -r "$CYCLES_FILE" 2>/dev/null | awk '
      /"outcome":"allow-override"/ { n++; next }
      { exit }
      END { print n+0 }
    '
  }
fi

OVERRIDE_CYCLES_RECENT=$(cycles_last_hour)
OVERRIDE_CYCLES_CONSEC=$(consecutive_override_tail)

THRESHOLD=3
OVERRIDE_DISABLED=false
if [ "$OVERRIDE_CYCLES_CONSEC" -ge 3 ]; then
  OVERRIDE_DISABLED=true
fi
if [ "$OVERRIDE_CYCLES_RECENT" -ge 2 ]; then
  THRESHOLD=2
fi

# ── Rolling-budget query (Task 12): count overrides in audit log ──
budget_last_30min() {
  # Count override-tagged entries in ~/.claude/audit/*.jsonl within 30 min.
  # Audit log lives under $HOME/.claude/audit/YYYY-MM-DD.jsonl.
  local cutoff
  cutoff=$(date -u -v-30M +%s 2>/dev/null || date -u -d '30 minutes ago' +%s 2>/dev/null || echo 0)
  local cnt=0
  for f in "$HOME/.claude/audit/"*.jsonl; do
    [ -f "$f" ] || continue
    while IFS= read -r line; do
      local tag ts_iso ts_epoch
      tag=$(printf '%s' "$line" | jq -r '.tag // empty' 2>/dev/null)
      [ -z "$tag" ] && continue
      ts_iso=$(printf '%s' "$line" | jq -r '.ts // empty' 2>/dev/null)
      [ -z "$ts_iso" ] && continue
      ts_epoch=$(date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$ts_iso" +%s 2>/dev/null || \
                 date -u -d "$ts_iso" +%s 2>/dev/null || echo 0)
      [ "$ts_epoch" -ge "$cutoff" ] && cnt=$((cnt + 1))
    done < "$f"
  done
  echo "$cnt"
}

# ── Override: explicit bypass tag in commit message (Task 12 validation) ──
# Recognised tags: [quick] [no-dev] [trivial] [hotfix] [wip]
MATCHED_TAG=$(echo "$COMMAND" | grep -oiE '\[(quick|no-dev|trivial|hotfix|wip)(:[^]]*)?\]' | head -1)
if [ -n "$MATCHED_TAG" ]; then
  if [ "$OVERRIDE_DISABLED" = true ]; then
    cat >&2 <<EOF

BLOCKED: Override path disabled (anti-reset penalty)

  You've used ${OVERRIDE_CYCLES_CONSEC} consecutive override cycles in this
  session. The escape hatch is temporarily locked — /dev is required for
  the next code-changing commit regardless of the [quick] / [no-dev] /
  [trivial] / [hotfix] / [wip] tag.

  Options:
    1) Run /dev — orchestrate through the phased workflow.
    2) Commit only non-code files (docs, .claude/, memory/) — those are
       exempt and will clear the penalty on the next commit.
    3) End the session and start a fresh one — the penalty state is
       session-keyed so it does not bleed across sessions.

  To manually clear the penalty: rm ${CYCLES_FILE}

EOF
    exit 2
  fi

  # Extract tag name + optional `: <reason>`
  TAG_NAME=$(printf '%s' "$MATCHED_TAG" | tr '[:upper:]' '[:lower:]' | sed -E 's/^\[([a-z-]+).*/\1/')
  TAG_REASON=$(printf '%s' "$MATCHED_TAG" | sed -nE 's/^\[[a-z-]+:[[:space:]]*([^]]*)\]$/\1/ip')

  # Rule 1: quick / trivial / no-dev require a rationale of ≥15 chars
  case "$TAG_NAME" in
    quick|trivial|no-dev)
      if [ -z "$TAG_REASON" ] || [ "${#TAG_REASON}" -lt 15 ]; then
        cat >&2 <<EOF

BLOCKED: [${TAG_NAME}] override requires a rationale of at least 15 characters.

  Format: [${TAG_NAME}: <explain why /dev is not needed here>]

  Example:
    [${TAG_NAME}: config-only tweak, no logic change, follow-up in plan #42]

  Current tag: ${MATCHED_TAG}

EOF
        exit 2
      fi
      ;;
  esac

  # Rule 2: [hotfix] requires a ticket ID OR `no-ticket: <reason>`
  if [ "$TAG_NAME" = "hotfix" ]; then
    if [ -z "$TAG_REASON" ]; then
      cat >&2 <<EOF

BLOCKED: [hotfix] requires a ticket reference OR an explicit no-ticket justification.

  Formats accepted:
    [hotfix: #1234 …]             — GitHub/Linear-style numeric ticket
    [hotfix: ABC-123 …]           — Jira-style key-number ticket
    [hotfix: no-ticket: <reason>] — explain why there is no ticket (≥15 chars)

  Current tag: ${MATCHED_TAG}

EOF
      exit 2
    fi
    # Accept if reason contains ticket-id OR starts with `no-ticket:<reason ≥15 chars>`
    if ! printf '%s' "$TAG_REASON" | grep -qE '(#[0-9]+|[A-Z]+-[0-9]+)'; then
      if ! printf '%s' "$TAG_REASON" | grep -qiE '^no-ticket:[[:space:]]*.{15,}$'; then
        cat >&2 <<EOF

BLOCKED: [hotfix] rationale must contain a ticket ID (#123 or ABC-123) or
  start with "no-ticket: <reason of at least 15 chars>".

  Current reason: "${TAG_REASON}"

EOF
        exit 2
      fi
    fi
  fi

  # Rule 3: [wip] is forbidden on main / prod branches
  if [ "$TAG_NAME" = "wip" ]; then
    CURRENT_BRANCH=$($GIT_CMD_PREFIX rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    case "$CURRENT_BRANCH" in
      main|master|prod|prod/*|production|production/*)
        cat >&2 <<EOF

BLOCKED: [wip] is not allowed on ${CURRENT_BRANCH}.

  WIP commits belong on feature branches, not the mainline. Options:
    1) Checkout a feature branch and try again.
    2) Finish the work and drop the [wip] tag.
    3) Use [quick: <reason>] if this is genuinely a small standalone fix.

EOF
        exit 2
        ;;
    esac
  fi

  # Rule 4: rolling budget — max 2 overrides per 30 min across audit log
  RECENT_OVERRIDES_30M=$(budget_last_30min 2>/dev/null || echo 0)
  if [ "$RECENT_OVERRIDES_30M" -ge 2 ]; then
    cat >&2 <<EOF

BLOCKED: Override budget exhausted (${RECENT_OVERRIDES_30M} in the last 30 min, cap = 2).

  You've used 2+ override tags in the last 30 minutes. The next commit
  must go through /dev instead of adding another [quick] / [no-dev] /
  [trivial] / [hotfix] / [wip] tag.

  Options:
    1) Run /dev  — orchestrate through the phased workflow (recommended).
    2) Wait until the oldest override drops out of the 30-min window,
       then retry.
    3) Split the staged files — commit docs/config first (those don't
       count against the budget), then handle code via /dev.

  Audit log: ~/.claude/audit/$(date -u +%Y-%m-%d).jsonl

EOF
    exit 2
  fi

  log_cycle "allow-override" "$MATCHED_TAG" "$(cat "$COUNTER" 2>/dev/null || echo 0)"
  if [ "$OVERRIDE_CYCLES_RECENT" -ge 1 ]; then
    cat >&2 <<EOF

⚠ override-cycle warning: you've used an override tag ${OVERRIDE_CYCLES_RECENT}× in the
  last 60 min. Consider running /dev for the next code-changing commit —
  one more override in this window will raise strictness (threshold 3 → 2).

EOF
  fi
  reset_state
  exit 0
fi

# ── Resolve the real target repo if `-C <path>` is present ──
GIT_TARGET_DIR=$(echo "$COMMAND" | sed -nE 's/.*git[[:space:]]+(-[cC][[:space:]]+([^[:space:]]+)).*/\2/p' | head -n1)
if [ -n "$GIT_TARGET_DIR" ] && [ -d "$GIT_TARGET_DIR" ]; then
  GIT_CMD_PREFIX="git -C $GIT_TARGET_DIR"
else
  GIT_CMD_PREFIX="git"
fi

STAGED=$($GIT_CMD_PREFIX diff --cached --name-only 2>/dev/null)
if [ -z "$STAGED" ] && echo "$COMMAND" | grep -qE '(^|[[:space:]])(-a|--all)([[:space:]]|$)'; then
  STAGED=$($GIT_CMD_PREFIX diff --name-only 2>/dev/null)
fi

HAS_CODE=false
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    *.go|*.ts|*.tsx|*.js|*.jsx|*.py|*.rs|*.sql|*.rb|*.java|*.kt|*.cs|*.swift|*.c|*.cpp|*.h|*.hpp)
      # Skip test / presentation / .claude / memory / docs
      case "$f" in
        *_test.go|*test_*.go|*.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx) continue ;;
        presentation/*|*/presentation/*) continue ;;
        .claude/*|*/.claude/*|memory/*|*/memory/*) continue ;;
      esac
      HAS_CODE=true
      break
      ;;
  esac
done <<< "$STAGED"

if [ "$HAS_CODE" = false ]; then
  # Docs-only or exempt-only commit — no /dev required. Preserve counter.
  exit 0
fi

# ── Check edit budget ──
COUNT=$(cat "$COUNTER" 2>/dev/null || echo 0)

if [ "$COUNT" -lt "$THRESHOLD" ]; then
  log_cycle "allow-under-threshold" "" "$COUNT"
  reset_state
  exit 0
fi

if [ -f "$MARKER" ]; then
  log_cycle "allow-with-dev" "" "$COUNT"
  reset_state
  exit 0
fi

# ── Block ──
EXTRA_NOTE=""
if [ "$THRESHOLD" = "2" ]; then
  EXTRA_NOTE="  Note: threshold was raised from 3 to 2 because ${OVERRIDE_CYCLES_RECENT}+ override
  cycles were recorded in the last 60 min (anti-reset strictness).

"
fi
cat >&2 <<EOF

BLOCKED: $COUNT code-file edits without /dev orchestration

  Rule (.claude/rules/dev-workflow.md):
    Claude MUST follow /dev for ALL tasks that involve code changes.

${EXTRA_NOTE}  Options:
    1) Run /dev  — orchestrate through the phased workflow (recommended).
    2) Add one of these tags to your commit message to override:
         [quick]   — small fix, skip /dev intentionally
         [no-dev]  — non-trivial but /dev not applicable (explain why)
         [trivial] — cosmetic change (naming, formatting)
         [hotfix]  — emergency fix
         [wip]     — work-in-progress checkpoint

  Current state:
    edits       = $COUNT  (threshold: $THRESHOLD)
    marker      = missing  → /dev was NOT invoked this work-cycle
    recent-override-cycles (60 min) = $OVERRIDE_CYCLES_RECENT
    consecutive-override-cycles     = $OVERRIDE_CYCLES_CONSEC

  To reset manually: rm $COUNTER
  To clear anti-reset penalty: rm $CYCLES_FILE

EOF
exit 2
