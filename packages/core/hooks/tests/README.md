# Hook regression tests

Self-contained bash tests that stand up a temp git repo, pipe a realistic
Claude Code payload into each hook, and assert on the exit code.

## Run

```bash
# All tests
bash packages/core/hooks/tests/run-all.sh

# Individual suites
bash packages/core/hooks/tests/doc-check-on-commit_test.sh
bash packages/core/hooks/tests/dev-required-on-commit_test.sh
bash packages/core/hooks/tests/json-path_test.sh
```

Each suite exits 0 when every case passes, non-zero on the first failure.

## What's covered

**`doc-check-on-commit_test.sh`** — 7 scenarios
- Code-only commit → exit 2 (BLOCK)
- Code + `docs/superpowers/plans/` file → still BLOCK (plan does not satisfy)
- Code + `memory/` markdown → still BLOCK
- Code + `CHANGELOG.md` → still BLOCK
- Code + matching architecture doc → exit 0 (allow)
- New `*/jobs/**` file → BLOCK (backend-layers + tree-docs required)
- Modified `*/middleware/*.go` → BLOCK on backend-layers only (no tree demand)

**`dev-required-on-commit_test.sh`** — 5 scenarios
- 0 edits + code staged → allow
- 3 edits + code + no `/dev` marker → BLOCK
- 3 edits + `[quick]` override → allow + state reset
- 3 edits + marker present → allow + state reset
- 5 edits + docs-only staged → allow (docs-only exempt)

**`json-path_test.sh`** — 5 hooks × 1 sanity case each
- Each hook receives a realistic `.tool_input.*` payload and runs its main
  branch instead of the pre-fix silent `exit 0`. We assert that the hook
  either matches (does work / blocks) or falls through — never the silent
  "input was empty" path.
