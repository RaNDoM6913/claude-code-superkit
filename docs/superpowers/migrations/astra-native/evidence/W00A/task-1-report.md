# Task 1 / W00A report

## Status

Candidate implementation is ready for independent review. W00A remains `pending` in the master ledger until coordinator review; no later-wave status was advanced.

## Intended diff

- Add `tools/lib/migration-inventory.mjs`: NUL-safe tracked and untracked Git enumeration through `execFileSync`, raw-byte SHA-256, prompt-body token estimates, path classification, symlink-self hashing, deleted-worktree handling, and ledger reconciliation.
- Add `tools/superkit-inventory.mjs`: `capture` and non-mutating `check` entry points, explicit owner/wave assignment, historical baseline hashing from `e0314ad46442729578bfd43f409e52b6843282fc`, stale-claim candidate scan, top-20 prompt sizes, normalized repeated-paragraph accounting, and generated migration artifacts.
- Add `test/migration-inventory.test.js`: 11 focused behaviors covering hidden showcase/untracked discovery, missing/stale rows, validation, mirrors, path kinds, deleted tracked files, symlink safety, and AGENTS/CLAUDE prompt measurement.
- Add `docs/superpowers/migrations/astra-native/{ledger.json,baseline.json,README.md}` and sanitized W00A baseline command evidence.
- Add one truthful W00A bullet under `CHANGELOG.md` `[Unreleased]`.

No production agent, skill, hook, rule, runtime config, installer, package count, version, or release surface was rewritten.

## Inventory evidence

- Current inventory: 521 surfaces = 497 files present in the immutable original HEAD plus 24 W00A-added files/evidence.
- Independent cross-check: all 497 paths exist in the ledger and every `baselineSha256` matches `.superpowers/sdd/2026-09-12-astra-native-hardening-plan/independent-baseline-files.json`; 24 added files have `baselineSha256: null`.
- Artifact policy: ledger, baseline, README, and evidence paths are owned inventory rows; generated artifacts never embed their own current hash.
- Hidden `packages/showcase/.claude/` files are included. No tracked source directory is excluded.
- Live gate: `node tools/superkit-inventory.mjs check` reports `missing=[]`, `stale=[]`, `errors=[]`.
- Prompt metrics cover agent, command, skill, and rule bodies plus always-loaded `AGENTS.md` and `CLAUDE.md`; ordinary human docs retain `tokensApprox: null`. The chars/4 value is labeled as an approximation, not API/subscription usage.
- Stale-claim hits are recorded as `unreviewed-candidate`; historical specs/plans and CHANGELOG release history are separated from active candidates.

## TDD evidence

1. Initial red: `node --test test/migration-inventory.test.js` exited 1 with `ERR_MODULE_NOT_FOUND` for the not-yet-created module.
2. Mirror existence red: 5 passed / 1 failed because a stale mirror row was incorrectly accepted; implementation changed to require the mirror in the current inventory.
3. Working-tree/symlink red: 7 passed / 2 failed because deleted tracked files threw `ENOENT` and symlinks followed external targets; collector now omits absent paths for stale reconciliation and hashes link text without reading the target.
4. Classification/prompt red: 8 passed / 2 failed for stack-rule classification and missing AGENTS token measurement; both contracts were implemented.
5. Wave-validation red: 10 passed / 1 failed because an invented wave was accepted; reconciliation now validates the complete approved wave enum.
6. Final focused green: `node --test test/migration-inventory.test.js` exited 0 with 11/11 tests passing.

## Supplied repository baseline

- `npm test`: exit 0, 30/30 tests.
- `npm run test:smoke`: exit 0.
- Core hook runner: initial sandbox run exit 1, 14/15 suites. The sole failure was `dev-required-on-commit_test.sh` being denied access to its isolated `<home>/.claude/state/test-dev-required-<pid>` fixture. An approved focused rerun exited 0 with 18/18 assertions. Both the raw failure condition and resolution are preserved.
- Frontend UI color, easing, and banned-font suites: each exit 0.
- `bash bin/superkit-counts-verify.sh`: exit 0.

Evidence lives under `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/`; repository and temporary home paths were sanitized while meaningful command output and exits were retained.

## Changed files

- `CHANGELOG.md`
- `tools/lib/migration-inventory.mjs`
- `tools/superkit-inventory.mjs`
- `test/migration-inventory.test.js`
- `docs/superpowers/migrations/astra-native/ledger.json`
- `docs/superpowers/migrations/astra-native/baseline.json`
- `docs/superpowers/migrations/astra-native/README.md`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/summary.json`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/npm-test.stdout.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/npm-test.stderr.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/smoke.stdout.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/smoke.stderr.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/core-hooks.stdout.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/core-hooks.stderr.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/ui-color.stdout.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/ui-color.stderr.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/ui-easing.stdout.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/ui-easing.stderr.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/ui-fonts.stdout.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/ui-fonts.stderr.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/counts.stdout.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/counts.stderr.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/dev-required-elevated.json`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/dev-required-elevated.stdout.txt`
- `docs/superpowers/migrations/astra-native/evidence/W00A/baseline/dev-required-elevated.stderr.txt`

## Concerns for review

- Active stale-claim results are intentionally candidates, not adjudicated defects; later waves must decide each occurrence in context.
- The core hook baseline is effective-pass only with the sandbox exception and successful focused rerun disclosed together. It must not be summarized as an unqualified clean original runner exit.
- All migration task rows remain pending; the inventory does not imply behavioral evaluation or Astra acceptance.

## Correction round 1

The six blocking/important review findings and both requested minor items were addressed without changing shipped components:

1. Baseline suite loading now validates the exact seven-command set, integer exits, every referenced stdout/stderr file, the sole recognized core-runner exit 1, its 14/15 + permission-denial evidence, the exact focused rerun command, exit 0, and 18/18 transcript. Empty/malformed/missing evidence is `incomplete`; unrelated or unresolved failures are `fail`.
2. `capture` is initialization-only. It checks all three destinations before mutation and refuses any existing non-placeholder ledger, baseline, or README. No refresh/merge framework was added.
3. Explicit first-touch overrides now cover the approved responsibility map, including W01 runtime/config/installer paths and `writing-hooks` in W07A.
4. Mirrors now come from an explicit reviewed relationship graph. Command aliases are encoded, `ui-reviewer` and `frontend-ui-reviewer` remain distinct, and GAN skills pair explicitly with GAN agents under `codex-native` ownership.
5. Stale-claim scanning includes the explicit active TOML/JS runtime surfaces (`packages/codex/config.toml`, `lib/codex.js`, `lib/installer.js`) while continuing to skip binary assets and symlink content.
6. `project-scanner` remains `pending`; nonhistorical `preserved`/`verified` rows require nonempty evidence, and every referenced ledger evidence path must exist in the current inventory.
7. Every temporary repository/evidence fixture registers `t.after()` cleanup.
8. A present `--out` or `--dir` without a value exits 2 with an actionable usage error.
9. The collector rejects regular files reached through a parent symlink outside the repository, and stale/repeated-text scans skip symlinks and paths resolving outside the root.

Generated artifacts were rebuilt in the fresh ignored directory `.superpowers/sdd/2026-09-12-astra-native-hardening-plan/task-1-generated-round1/`, then only `ledger.json`, `baseline.json`, and `README.md` were copied over the unaccepted W00A-generated versions as authorized. A normal second capture against the initialized destination now refuses to mutate it.

### Correction TDD evidence

- Initial import red: `.superpowers/sdd/2026-09-12-astra-native-hardening-plan/task-1-round1-red.txt` (missing new test exports; exit 1).
- Meaningful assertion red: `.superpowers/sdd/2026-09-12-astra-native-hardening-plan/task-1-round1-red-assertions.txt` (22 tests: 12 pass, 10 fail across evidence validation, overwrite refusal, first-touch mapping, mirrors, GAN ownership, stale scan, and option usage).
- External symlink-boundary red: `.superpowers/sdd/2026-09-12-astra-native-hardening-plan/task-1-round1-red-symlink-boundary.txt` (exit 1 before the containment/skip fix).
- Final green: `.superpowers/sdd/2026-09-12-astra-native-hardening-plan/task-1-round1-green.txt` (`node --test test/migration-inventory.test.js`: 24/24 pass, exit 0).
- Final reconciliation: `.superpowers/sdd/2026-09-12-astra-native-hardening-plan/task-1-round1-check.txt` (`missing=[]`, `stale=[]`, `errors=[]`, exit 0).

Post-regeneration checks retain 521 unique surfaces, exact 497/497 original baseline path/hash agreement, and 24 added files with `baselineSha256: null`. The baseline suite status remains `pass-with-environment-resolution` with `errors=[]`, and active stale candidates now contain `gpt-5.5` occurrences from all three explicit runtime/config paths.

## Correction round 2

The remaining C1 evidence-gate case is fixed without changing generated baseline content:

- The loader parses the final `Failed suites:` footer and accepts the sandbox exception only when the footer contains exactly one bullet: `dev-required-on-commit_test.sh`.
- The permission-denial evidence must point to `.claude/state/dev-cycles-test-dev-required-<pid>.jsonl` under either sanitized `<home>` or a real `/Users/<user>` / `/home/<user>` path.
- A normal dev-required suite heading elsewhere in stdout cannot satisfy the footer check.
- Another footer suite, a missing footer, or an unrelated permission-denial path returns `status: fail`, even when the focused rerun is successful.
- The checked-in exception transcript remains valid and `baseline.json` was left byte-identical.

Raw TDD evidence:

- Red: `.superpowers/sdd/2026-09-12-astra-native-hardening-plan/task-1-round2-red.txt` — 27 tests, 24 pass / 3 fail for alternate footer, missing footer, and unrelated denial path.
- Green: `.superpowers/sdd/2026-09-12-astra-native-hardening-plan/task-1-round2-green.txt` — 27/27 pass, exit 0.
