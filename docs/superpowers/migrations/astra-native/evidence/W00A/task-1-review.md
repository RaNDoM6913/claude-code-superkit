# Independent review — Task 1 / W00A

## Verdicts

- **Spec Compliance: BLOCK.** Path/hash coverage is complete, but the baseline gate can report a resolved pass for unrelated or unresolved failures, and the ledger does not faithfully encode several approved ownership relationships/waves.
- **Task Quality: NEEDS FIX.** The collector/reconciler fundamentals are sound, but `capture` is unsafe to rerun and the stale-claim baseline omits known active runtime/config occurrences.

## Critical findings

1. **Suite status can become a false success for any nonzero command.** `tools/superkit-inventory.mjs:282` maps every command set containing any nonzero exit to `pass-with-environment-resolution`. It does not require `dev-required-elevated.json`, validate that the failed command is the core hook runner, require the rerun's `exitCode` to be zero, or tie the hard-coded explanation at lines 285–293 to the actual failure. A missing, failed, or unrelated rerun therefore still yields a pass-like status, violating the evidence-before-completion and exact-failure requirements. Fix by validating the exact required command set and referenced files, returning `fail`/`incomplete` for every unrecognized nonzero result, and allowing the environment-resolved state only for the exact core-hook failure plus an exact successful focused rerun. Add negative tests for missing, nonzero, mismatched, and unrelated reruns.

2. **A repeat `capture` destroys the migration ledger and mutates the original baseline.** `tools/superkit-inventory.mjs:347-358` always rebuilds and overwrites `ledger.json`, `baseline.json`, and `README.md`; `buildLedger()` resets row statuses/evidence at lines 202–205 and `readme()` resets all task rows to pending at lines 328–330. After any accepted wave, running the documented capture command would erase adjudicated ownership, evidence links, verified statuses, and the immutable pre-migration prompt baseline. This breaks recoverable incremental migration and evidence retention. Make capture an initialization-only operation that refuses to overwrite non-placeholder artifacts, or implement an explicit merge/refresh path that preserves reviewed fields and never rewrites the frozen baseline. Test a second capture with nonempty evidence and a verified status.

## Important findings

1. **The generated ownership map is not the approved wave map.** The broad fallback at `tools/superkit-inventory.mjs:144` assigns `packages/codex/config.toml`, `packages/codex/AGENTS.md`, `packages/codex/INSTALL.md`, `lib/codex.js`, and `lib/installer.js` to W08B; the generated rows show this at `ledger.json:1051`, `ledger.json:1075`, and `ledger.json:1159-1188`. The binding map assigns these runtime-default/capability/installer surfaces first to Task 3 / W01 (`global-constraints.md:90-91`). This would leave W01's acceptance scope incomplete while the ledger reports it owned elsewhere. Encode explicit path-level assignments before broad package fallbacks and add a table-driven test for every path named in the approved file/responsibility map.

2. **Mirror assignment still guesses by basename and is both over- and under-inclusive.** `mirrorCandidates()` at `tools/superkit-inventory.mjs:151-173` derives relationships from names rather than an adjudicated relationship table. It falsely gives `packages/codex/skills/ui-reviewer/SKILL.md` both the core reviewer and the distinct frontend-ui umbrella as mirrors (`ledger.json:2277-2283`), even though `frontend-ui-reviewer` is the Codex counterpart for that umbrella. It also leaves the semantic command aliases `dev-orchestrator→dev`, `review-orchestrator→review`, `audit-orchestrator→audit`, `test-runner→test`, `lint-runner→lint`, and `commit-helper→commit` with empty mirrors. Replace candidate inference with an explicit reviewed mapping (or keep unadjudicated candidates outside `mirrors`) and test the collision and aliases.

3. **The stale-claim baseline excludes known active runtime/config claims.** `staleClaims()` skips every file except `.md` and `.rules` at `tools/superkit-inventory.mjs:223-225`. Consequently the baseline omits `gpt-5.5` in `packages/codex/config.toml:4`, `lib/codex.js:32`, and `lib/installer.js:467`, even though the global constraints identify these active defaults/messages as migration inputs. The current report's claim that stale-claim candidates were captured is therefore incomplete. Scan the relevant text-bearing config/tool surfaces (at minimum these explicit paths) and add TOML/JS coverage tests while continuing to exclude binary assets.

4. **A future-wave surface is marked preserved without its required evidence.** `tools/superkit-inventory.mjs:202-205` special-cases `packages/core/skills/project-scanner/SKILL.md` to `preserved`; its ledger row at `ledger.json:3834-3842` is W08A with an empty evidence array. The global ledger contract says preserved requires a compatibility check and rationale (`global-constraints.md:133`), and the W00A report says no later-wave status was advanced. Keep this row pending until W08A verifies preservation, and make reconciliation reject non-historical `preserved` rows without the required evidence.

## Minor items

- `test/migration-inventory.test.js` creates temporary Git repositories without cleanup. Register cleanup with `t.after()` so repeated local/CI runs do not accumulate fixtures.
- `option()` at `tools/superkit-inventory.mjs:342-345` does not reject a present `--out`/`--dir` flag with no value; the resulting `resolve()` exception is less actionable than a usage error.

## Verified evidence

- All 25 frozen files match `task-1-reviewed-hashes.json`.
- The ledger has 521 unique surfaces. Its 497 original paths and every `baselineSha256` match `independent-baseline-files.json`; all 24 W00A-added surfaces have `baselineSha256: null`.
- `node tools/superkit-inventory.mjs check` returns empty `missing`, `stale`, and `errors` on the frozen worktree.
- The frozen HEAD and `capturedFromHead` both equal `e0314ad46442729578bfd43f409e52b6843282fc` on `codex/astra-native-hardening`.
- All eight referenced suite stdout/stderr records exist. The preserved raw core-hook output shows the sandbox run failed only in `dev-required-on-commit_test.sh`; the focused approved transcript reports 18/18 assertions passing.
- Prompt count and top-20 ordering are internally consistent, and the approximation is accurately labeled. The changed production surface is limited to the requested changelog entry; no Claude/Codex prompt, hook, rule, installer, or runtime component was modified.

## Cannot verify from the frozen artifacts

- The claimed TDD red-to-green chronology is not independently verifiable because the intermediate red transcripts/commits are not part of the frozen evidence.
- The authorization provenance of the approved focused hook rerun is represented only by the supplied JSON/text records; the final transcript is consistent with the claim, but the external approval event itself is not independently attestable from repository files.
- Per instruction, I did not rerun the full repository suites. I verified their frozen outputs and performed only the focused non-mutating inventory check and parsed hash/coverage comparisons.
- Independent Astra acceptance and the final W00A commit/push are intentionally still outstanding; this review does not satisfy those gates.
