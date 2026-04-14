#!/bin/bash
# doc-check-on-commit_test.sh — regression tests for packages/core/hooks/doc-check-on-commit.sh
#
# Usage: bash packages/core/hooks/tests/doc-check-on-commit_test.sh
# Exit codes: 0 if all cases pass, 1 on first failure.

set -u

HOOK=$(cd "$(dirname "$0")/.." && pwd)/doc-check-on-commit.sh
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

PASS=0
FAIL=0
FAIL_DETAILS=""

run_case() {
  local name="$1"
  local expected="$2"
  shift 2
  # Each case prepares its own repo state in a subshell + checks exit.
  local repo="$TMP/case-$PASS-$FAIL"
  rm -rf "$repo"
  mkdir -p "$repo"
  (cd "$repo" && git init -q && git -c user.email=t@t -c user.name=t commit --allow-empty -qm init)
  # shellcheck disable=SC2068
  $@ "$repo"
  # Payload uses `git -C <repo> commit` so the hook runs `git diff` against
  # the right repo regardless of caller's cwd.
  local payload
  payload=$(printf '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"git -C %s commit -m test"}}' "$repo")
  local actual
  actual=$(echo "$payload" | CLAUDE_PROJECT_DIR="$repo" bash "$HOOK" >/dev/null 2>&1; echo $?)
  if [ "$actual" = "$expected" ]; then
    echo "  ✓ $name (exit=$actual)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name — expected $expected, got $actual"
    FAIL=$((FAIL + 1))
    FAIL_DETAILS="${FAIL_DETAILS}\n  - $name (expected=$expected actual=$actual)"
  fi
}

# ── Case setup helpers ─────────────────────────────────────────────────────

stage_code_only() {
  local r="$1"
  (cd "$r" && mkdir -p backend/migrations && \
    echo "CREATE TABLE foo();" > backend/migrations/001_foo.up.sql && \
    git add backend/migrations/001_foo.up.sql)
}

stage_code_plus_plan() {
  local r="$1"
  (cd "$r" && mkdir -p backend/migrations docs/superpowers/plans && \
    echo "CREATE TABLE foo();" > backend/migrations/001_foo.up.sql && \
    echo "# plan" > docs/superpowers/plans/2026-04-14-foo.md && \
    git add backend/migrations/001_foo.up.sql docs/superpowers/plans/2026-04-14-foo.md)
}

stage_code_plus_memory() {
  local r="$1"
  (cd "$r" && mkdir -p backend/migrations memory && \
    echo "CREATE TABLE foo();" > backend/migrations/001_foo.up.sql && \
    echo "# memory note" > memory/note.md && \
    git add backend/migrations/001_foo.up.sql memory/note.md)
}

stage_code_plus_changelog() {
  local r="$1"
  (cd "$r" && mkdir -p backend/migrations && \
    echo "CREATE TABLE foo();" > backend/migrations/001_foo.up.sql && \
    echo "# changelog" > CHANGELOG.md && \
    git add backend/migrations/001_foo.up.sql CHANGELOG.md)
}

stage_code_plus_arch_doc() {
  local r="$1"
  (cd "$r" && mkdir -p backend/migrations docs/architecture && \
    echo "CREATE TABLE foo();" > backend/migrations/001_foo.up.sql && \
    echo "# Database schema\nTable foo added" > docs/architecture/database-schema.md && \
    echo "# CLAUDE" > CLAUDE.md && \
    git add backend/migrations/001_foo.up.sql docs/architecture/database-schema.md CLAUDE.md)
}

stage_new_jobs_file() {
  local r="$1"
  (cd "$r" && mkdir -p backend/jobs && \
    echo "package jobs" > backend/jobs/cleanup.go && \
    git add backend/jobs/cleanup.go)
}

stage_modified_middleware() {
  local r="$1"
  (cd "$r" && mkdir -p backend/middleware && \
    echo "package middleware // v1" > backend/middleware/auth.go && \
    git add backend/middleware/auth.go && \
    git -c user.email=t@t -c user.name=t commit -qm init-middleware && \
    echo "package middleware // v2" > backend/middleware/auth.go && \
    git add backend/middleware/auth.go)
}

# ── Run suite ──────────────────────────────────────────────────────────────

echo "doc-check-on-commit_test.sh — regression suite"
echo ""

run_case "code-only commit (migration, no docs) → BLOCK"        2 stage_code_only
run_case "code + plan file → BLOCK (plan does not satisfy)"     2 stage_code_plus_plan
run_case "code + memory/*.md → BLOCK (memory does not satisfy)" 2 stage_code_plus_memory
run_case "code + CHANGELOG → BLOCK (CHANGELOG does not satisfy)" 2 stage_code_plus_changelog
run_case "code + matching arch doc + CLAUDE.md → ALLOW"         0 stage_code_plus_arch_doc
run_case "new */jobs/**/*.go → BLOCK (backend-layers + tree)"   2 stage_new_jobs_file
run_case "modified */middleware/*.go → BLOCK (backend-layers)"  2 stage_modified_middleware

echo ""
echo "Results: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  echo -e "Failures:${FAIL_DETAILS}"
  exit 1
fi
exit 0
