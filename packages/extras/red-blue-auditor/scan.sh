#!/bin/bash
# scan.sh — Bearer-style SAST scan against pattern files.
# Usage: scan.sh [--exit-on-critical] [--patterns DIR] [--path PATH]
# Exit codes: 0 clean, 1 any findings, 2 CRITICAL findings (with --exit-on-critical)

set -u

EXIT_ON_CRITICAL=0
PATTERNS_DIR="$(dirname "$0")/patterns"
SCAN_PATH="."

for arg in "$@"; do
  case "$arg" in
    --exit-on-critical) EXIT_ON_CRITICAL=1 ;;
    --patterns=*)       PATTERNS_DIR="${arg#--patterns=}" ;;
    --path=*)           SCAN_PATH="${arg#--path=}" ;;
    -h|--help)
      echo "Usage: scan.sh [--exit-on-critical] [--patterns=DIR] [--path=PATH]"
      echo ""
      echo "Scans files under --path (default .) against all *.txt pattern files."
      echo "Pattern file format per line: SEVERITY|REGEX|DESCRIPTION"
      echo "Exit: 0 clean, 1 any finding, 2 CRITICAL finding (with --exit-on-critical)"
      exit 0
      ;;
  esac
done

[ -d "$PATTERNS_DIR" ] || { echo "ERROR: patterns dir not found: $PATTERNS_DIR" >&2; exit 3; }

crit=0
high=0
medium=0

for pfile in "$PATTERNS_DIR"/*.txt; do
  [ -f "$pfile" ] || continue
  cat_name=$(basename "$pfile" .txt)

  while IFS='|' read -r severity regex desc; do
    # Skip comments and blanks
    [ -z "${severity:-}" ] && continue
    [[ "$severity" =~ ^[[:space:]]*# ]] && continue
    [ -z "${regex:-}" ] && continue

    # Trim whitespace
    severity="$(echo "$severity" | tr -d '[:space:]')"

    # grep with common exclusions
    if HITS=$(grep -rEn "$regex" "$SCAN_PATH" \
                --include="*.sh" --include="*.md" --include="*.json" \
                --include="*.yml" --include="*.yaml" --include="*.go" \
                --include="*.ts" --include="*.tsx" --include="*.js" \
                --include="*.py" --include="*.rb" --include="*.rs" \
                --exclude-dir=.git --exclude-dir=node_modules \
                --exclude-dir=dist --exclude-dir=build \
                --exclude-dir=.next --exclude-dir=target \
                2>/dev/null); then
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
    fi
  done < "$pfile"
done

echo ""
echo "═══════════════════════════════════════════"
echo "AgentShield scan complete"
echo "  CRITICAL: $crit"
echo "  HIGH:     $high"
echo "  MEDIUM:   $medium"
echo "═══════════════════════════════════════════"

if [ "$EXIT_ON_CRITICAL" = "1" ] && [ "$crit" -gt 0 ]; then
  echo "CI gate: exiting 2 (CRITICAL findings blocked)" >&2
  exit 2
elif [ "$crit" -gt 0 ] || [ "$high" -gt 0 ] || [ "$medium" -gt 0 ]; then
  exit 1
fi

exit 0
