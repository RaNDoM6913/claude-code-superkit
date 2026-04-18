#!/bin/bash
set -euo pipefail

LIB="$(cd "$(dirname "$0")/.." && pwd)/lib/profile.sh"
[ -f "$LIB" ] || { echo "FAIL: lib not found at $LIB"; exit 1; }
# shellcheck source=/dev/null
source "$LIB"

# Test 1: CLAUDE_DISABLED_HOOKS matches
CLAUDE_DISABLED_HOOKS="loop-guard,security-patterns" should_skip_hook "loop-guard" && echo "PASS: loop-guard disabled" || { echo "FAIL"; exit 1; }
CLAUDE_DISABLED_HOOKS="loop-guard,security-patterns" should_skip_hook "audit-trail" && { echo "FAIL: should not skip"; exit 1; } || echo "PASS: audit-trail not disabled"

# Test 2: CLAUDE_HOOK_PROFILE=fast skips non-critical
CLAUDE_HOOK_PROFILE=fast should_skip_hook "loop-guard" && echo "PASS: fast skips loop-guard" || { echo "FAIL"; exit 1; }
CLAUDE_HOOK_PROFILE=fast should_skip_hook "block-dangerous-git" && { echo "FAIL: fast should not skip critical"; exit 1; } || echo "PASS: fast keeps block-dangerous-git"

# Test 3: Default profile keeps all hooks
unset CLAUDE_HOOK_PROFILE CLAUDE_DISABLED_HOOKS
should_skip_hook "loop-guard" && { echo "FAIL: default should not skip"; exit 1; } || echo "PASS: default keeps loop-guard"

echo "ALL PROFILE-HELPER TESTS PASSED"
