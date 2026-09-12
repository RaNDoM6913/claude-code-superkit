# Independent rereview — Task 1 / W00A correction round 1

## Verdicts

- **Spec Compliance: BLOCK.** Seven of the eight original findings and the requested symlink boundary are addressed. The remaining Critical evidence-gate case can still misclassify a different core-suite failure as the documented sandbox resolution.
- **Task Quality: NEEDS ONE BOUNDED FIX.** No new material breakage was found in the round-one diff.

## Original findings

1. **Critical — suite status false success: NOT ADDRESSED.** The general missing/nonzero/mismatched/unrelated cases are now rejected, but `tools/superkit-inventory.mjs:468-471` only requires the phrases `Summary: 14 suites passed, 1 failed`, `dev-required-on-commit_test.sh`, and `Operation not permitted` somewhere in the complete stdout/stderr. The core runner prints `dev-required-on-commit_test.sh` as a suite heading even when another suite is the one that failed. I replaced only the frozen transcript footer with `Failed suites:\n  - doc-check-on-commit_test.sh`; `loadSuiteEvidence()` still returned `pass-with-environment-resolution` with no errors because the earlier dev-required heading remained and the unrelated focused rerun still passed. Parse the `Failed suites:` footer and require its exact sole entry to be `dev-required-on-commit_test.sh`; also bind the permission-denial line to that suite's state fixture. Add the alternate-footer regression test.

2. **Critical — repeat capture destroys state: ADDRESSED.** `tools/superkit-inventory.mjs:563-581` validates all three destinations before any mutation and refuses an initialized destination. The frozen CLI refusal exited 2 before modifying the artifacts, and the focused test verifies all contents remain byte-identical.

3. **Important — approved paths assigned to the wrong waves: ADDRESSED.** `FIRST_TOUCH` at `tools/superkit-inventory.mjs:25-54` now encodes the approved path-level assignments. The five runtime/config/installer rows are W01 in the generated ledger, and the table-driven test covers the responsibility-map boundaries.

4. **Important — basename mirror inference: ADDRESSED.** `MIRROR_GRAPH` at `tools/superkit-inventory.mjs:121-198` is explicit and bidirectional. All six command aliases are present, `ui-reviewer` points only to the core reviewer, and `frontend-ui-reviewer` points to the frontend-ui umbrella.

5. **Important — active TOML/JS stale claims omitted: ADDRESSED.** `scanStaleClaims()` at `tools/superkit-inventory.mjs:319-361` includes the three explicit runtime/config files. The generated baseline now records `packages/codex/config.toml:4`, `lib/codex.js:32`, and `lib/installer.js:467` plus installer path candidates.

6. **Important — project-scanner prematurely preserved: ADDRESSED.** The special preserved status was removed at `tools/superkit-inventory.mjs:302-305`; the generated W08A row is pending. `reconcileLedger()` at `tools/lib/migration-inventory.mjs:134-150` rejects nonhistorical preserved/verified rows without evidence and evidence paths absent from inventory.

7. **Minor — temporary repositories not cleaned: ADDRESSED.** `test/migration-inventory.test.js:25-34` registers recursive cleanup with `t.after()` and the temporary-fixture tests use the helper.

8. **Minor — missing option value had an opaque error: ADDRESSED.** `tools/superkit-inventory.mjs:549-560` emits the specific option error and exit 2; the focused test covers `check --dir` without a value.

## Requested symlink boundary

- **ADDRESSED.** `collectSurfaces()` resolves non-symlink entries and rejects a tracked regular file reached through a parent symlink outside the repository (`tools/lib/migration-inventory.mjs:62-86`). `scanStaleClaims()` skips final symlinks and any path whose real target is outside the root (`tools/superkit-inventory.mjs:328-342`). The supplied end-to-end test replaces a tracked parent directory with an external symlink and separately verifies stale scanning of an external final symlink; the frozen 24/24 green transcript includes this case.

## Frozen evidence checked

- All 25 files match `task-1-round1-hashes.json`.
- The supplied meaningful red transcript has 10 failing assertions spanning the requested fixes; the symlink-boundary red fails before containment is added; the final transcript records 24/24 passing.
- The coordinator-supplied current reconciliation is empty. Generated ledger rows, stale candidates, mirrors, statuses, and W01 assignments match the amended code.
- I did not rerun the full repository suites. I ran only the concrete alternate-failed-suite reproducer described above and a non-mutating initialized-capture refusal check.

## Residual fix

Require the parsed `Failed suites:` footer to contain exactly `dev-required-on-commit_test.sh`, require the permission denial to reference that suite's state fixture, and add a negative test where another suite is in the footer while the ordinary dev-required heading and successful focused rerun remain present. Then regenerate `baseline.json` only if its derived content changes and refreeze hashes for the next review.
