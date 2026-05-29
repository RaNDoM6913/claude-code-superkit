#!/bin/bash
# run-all.sh — invoke every regression-test suite and report a summary.
# Usage: bash packages/core/hooks/tests/run-all.sh

DIR=$(cd "$(dirname "$0")" && pwd)
SUITES=(
  "doc-check-on-commit_test.sh"
  "dev-required-on-commit_test.sh"
  "dev-required-wip-on-main_test.sh"
  "json-path_test.sh"
  "profile-helper_test.sh"
  "session-key-helper_test.sh"
  "edit-streak-check_test.sh"
  "audit-trail-chain_test.sh"
  "warn-visibility_test.sh"
  "nudge-throttle_test.sh"
  "counts-verify_test.sh"
)

TOTAL_PASS=0
TOTAL_FAIL=0
FAILED_SUITES=""

for suite in "${SUITES[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ $suite"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if bash "$DIR/$suite"; then
    TOTAL_PASS=$((TOTAL_PASS + 1))
  else
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
    FAILED_SUITES="${FAILED_SUITES}\n  - $suite"
  fi
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary: $TOTAL_PASS suites passed, $TOTAL_FAIL failed"
if [ "$TOTAL_FAIL" -gt 0 ]; then
  echo -e "Failed suites:${FAILED_SUITES}"
  exit 1
fi
exit 0
