#!/bin/bash
# scan.sh — Bearer-style SAST scan against pattern files.
# Usage: scan.sh [--exit-on-critical] [--patterns DIR] [--path PATH]
#        (--patterns=DIR and --path=PATH work too)
# Scans PATH (default .): one file as given, or a directory recursively —
# text files with a scanned extension plus extensionless files (hook scripts
# such as .husky/pre-commit); .git, node_modules, dist, build, .next and
# target are skipped, binary files never scanned.
# Exit codes: 0 no hits · 1 any hit (default mode)
#             with --exit-on-critical: 0 unless a CRITICAL hit, then 2
#             (HIGH/MEDIUM hits are still printed, never blocking)
#             3 patterns dir not found · 4 usage error or PATH not found
# Uses only grep, echo, basename and dirname; reads and prints, never writes.

set -u

EXIT_ON_CRITICAL=0
PATTERNS_DIR="$(dirname "$0")/patterns"
SCAN_PATH="."

usage() {
  echo "Usage: scan.sh [--exit-on-critical] [--patterns DIR] [--path PATH]"
  echo "       (--patterns=DIR and --path=PATH work too)"
  echo ""
  echo "Scans PATH (default .; one file, or a directory recursively) against all *.txt pattern files."
  echo "Pattern file format per line: SEVERITY|REGEX|DESCRIPTION — split at the first and the"
  echo "last '|', so REGEX may contain '|'. REGEX is grep -E syntax (no lookaround)."
  echo "Exit: 0 clean, 1 any hit; with --exit-on-critical 0 unless a CRITICAL hit, then 2;"
  echo "      3 patterns dir not found; 4 usage error or PATH not found."
}

while [ $# -gt 0 ]; do
  case "$1" in
    --exit-on-critical) EXIT_ON_CRITICAL=1 ;;
    --patterns=*)       PATTERNS_DIR="${1#--patterns=}" ;;
    --patterns)         [ $# -ge 2 ] || { usage >&2; exit 4; }; PATTERNS_DIR="$2"; shift ;;
    --path=*)           SCAN_PATH="${1#--path=}" ;;
    --path)             [ $# -ge 2 ] || { usage >&2; exit 4; }; SCAN_PATH="$2"; shift ;;
    -h|--help)          usage; exit 0 ;;
    *)                  echo "ERROR: unknown argument: $1" >&2; usage >&2; exit 4 ;;
  esac
  shift
done

[ -d "$PATTERNS_DIR" ] || { echo "ERROR: patterns dir not found: $PATTERNS_DIR" >&2; exit 3; }
[ -e "$SCAN_PATH" ] || { echo "ERROR: scan path not found: $SCAN_PATH" >&2; exit 4; }

EXCLUDE_DIRS=(--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist
              --exclude-dir=build --exclude-dir=.next --exclude-dir=target)

# is_candidate <path> — scanned extension, a .env* file, or no extension.
# (Filtered here, not with grep --include/--exclude: BSD grep matches those
# globs against the whole path, GNU grep against the base name.)
is_candidate() {
  local base="${1##*/}"
  case "$base" in
    .env*) return 0 ;;
    *.*)
      case "${base##*.}" in
        sh|md|json|yml|yaml|go|ts|tsx|js|mjs|cjs|py|rb|rs|env|ini|toml|txt|conf) return 0 ;;
      esac
      return 1
      ;;
    *) return 0 ;;
  esac
}

FILES=()
if [ -f "$SCAN_PATH" ]; then
  FILES=("$SCAN_PATH")   # an explicitly named file is always scanned
else
  # Every readable text file (-I skips binaries; -l with '' lists files that
  # have at least one line), NUL-separated so odd file names survive.
  while IFS= read -r -d '' f; do
    is_candidate "$f" && FILES+=("$f")
  done < <(grep -rlIs --null "${EXCLUDE_DIRS[@]}" -e '' -- "$SCAN_PATH")
fi

# scan_files <regex> — print file:line:content for every hit, -H so a single
# file still carries its name; files go to grep in chunks to stay under ARG_MAX.
scan_files() {
  local i=0 n=${#FILES[@]}
  while [ "$i" -lt "$n" ]; do
    grep -HnEIs -e "$1" -- "${FILES[@]:i:200}"
    i=$((i + 200))
  done
}

crit=0
high=0
medium=0
bad=0

for pfile in "$PATTERNS_DIR"/*.txt; do
  [ -f "$pfile" ] || continue
  cat_name=$(basename "$pfile" .txt)
  lineno=0

  while IFS= read -r line || [ -n "$line" ]; do
    lineno=$((lineno + 1))
    line="${line%$'\r'}"
    trimmed="${line#"${line%%[![:space:]]*}"}"
    # Skip comments and blanks
    [ -z "$trimmed" ] && continue
    [ "${trimmed:0:1}" = "#" ] && continue

    # SEVERITY|REGEX|DESCRIPTION — the regex may itself contain '|'
    case "$line" in
      *"|"*"|"*) ;;
      *) echo "pattern error: $pfile:$lineno — not SEVERITY|REGEX|DESCRIPTION; skipped" >&2
         bad=$((bad + 1)); continue ;;
    esac
    severity="${line%%|*}"
    rest="${line#*|}"
    desc="${rest##*|}"
    regex="${rest%|*}"
    severity="${severity//[[:space:]]/}"
    [ -z "$regex" ] && continue

    # A regex grep -E rejects (exit 2) would silently match nothing: say so.
    echo "" | grep -Eq -e "$regex" 2>/dev/null
    if [ $? -eq 2 ]; then
      echo "pattern error: $pfile:$lineno — grep -E rejects this regex; it was not applied" >&2
      bad=$((bad + 1))
      continue
    fi

    HITS=$(scan_files "$regex")
    [ -z "$HITS" ] && continue
    while IFS= read -r hit; do
      [ -z "$hit" ] && continue
      echo "[$severity] $cat_name: $desc"
      echo "  $hit"
      case "$severity" in
        CRITICAL) crit=$((crit+1)) ;;
        HIGH) high=$((high+1)) ;;
        MEDIUM) medium=$((medium+1)) ;;
      esac
    done <<< "$HITS"
  done < "$pfile"
done

echo ""
echo "═══════════════════════════════════════════"
echo "AgentShield scan complete"
echo "  CRITICAL: $crit"
echo "  HIGH:     $high"
echo "  MEDIUM:   $medium"
if [ "$bad" -gt 0 ]; then
  echo "  Pattern errors: $bad (not applied — see stderr)"
fi
echo "═══════════════════════════════════════════"

if [ "$EXIT_ON_CRITICAL" = "1" ]; then
  if [ "$crit" -gt 0 ]; then
    echo "CI gate: exiting 2 (CRITICAL findings blocked)" >&2
    exit 2
  fi
  exit 0
fi

if [ "$crit" -gt 0 ] || [ "$high" -gt 0 ] || [ "$medium" -gt 0 ]; then
  exit 1
fi

exit 0
