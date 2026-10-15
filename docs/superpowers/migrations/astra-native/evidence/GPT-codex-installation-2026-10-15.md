# Standalone Codex installation and safe updates — acceptance

Date: 2026-10-15. Base: `8977212`, branch `codex/astra-native-hardening`.
Scope: the installation/update milestone of the active Codex-only delivery plan.
Version remains **1.5.2**; no merge, tag, release or npm publication authorized here.

## Delivered contract

- `--codex-only` installs without interactive prompts, Claude prerequisites/calls,
  plugins, `.claude`/`CLAUDE.md` writes, Claude validation or docs scaffolding.
  It resolves the target Git root even when invoked from a subdirectory.
- Default installation and additive `--codex` remain supported. Codex ignores the
  Claude fresh/merge/overwrite choice and uses its own state.
- All 82 packaged skills remain under `.codex/skills`. Relative per-skill links in
  `.agents/skills` expose them to current Codex discovery. Existing discovery
  entries remain untouched and collisions are reported.
- Schema-1 `.codex/.superkit-manifest.json` records installed skill hashes. Exact
  stock v1.5.2 bytes are recognized offline using the packaged hash baseline pinned
  to remote-confirmed commit `cbb0565f4d4868fe77f4bd7e8fdd46dada3e52ab`.
- Only pristine managed skills are replaced, after unique backups of their old
  bytes and the previous manifest. Custom/unknown bytes, existing AGENTS/config/
  approval rules, support files, unrelated files and retired roles are preserved.
- Managed path preflight refuses symbolic links/special files; discovery links
  are an intentional exception with real parent directories. Malformed state or
  incomplete packages fail before install writes. A lock excludes another
  installer. New files publish atomically without clobbering; replacements use
  atomic rename. No shared Claude copy helper or shipped prompt source changed.

The [installation guide](../../../../../packages/codex/INSTALL.md) defines
conflicts, explicit reruns, backup restoration, symlink requirements and partial
installation recovery. The existing combined npm artifact is reused: the selector
controls installed assets; no new distribution service/package is introduced.

## Verification

| Evidence | Result |
| --- | --- |
| Focused Codex tests | 33/33 PASS; fresh/additive/update/custom/legacy/backup/idempotence/discovery/path/state/interruption contracts |
| Full `npm test` after review corrections | 66/66 PASS, zero failed/skipped/cancelled/todo |
| `npm run test:smoke` after corrections | 13/13 PASS, default Claude and standalone/additive Codex |
| Core hooks `tests/run-all.sh` | 15 suites PASS |
| Frontend UI hook scripts | animation 13/13, banned-fonts 9/9, color 12/12 PASS |
| Integrity with remote About check | PASS; version 1.5.2, agents 56, commands 16, hooks 42, skills 22, rules 19; Codex 82 |
| Phase/stale references and whitespace | 16-phase references consistent; no stale 8-phase hits; `git diff --check` PASS |
| Real unpacked local npm archive | 82 skills installed; source/installed bytes equal; no Claude tree; repeat idempotent |
| Actual v1.5.2 old CLI install, then candidate `--codex-only` | 58 pristine skills updated and backed up; 1 edited reviewer retained; custom config/AGENTS retained; Claude tree unchanged; second run idempotent |
| Actual local CLI discovery | `codex-cli 0.162.0-alpha.17.2`, read-only `codex debug prompt-input`, all 82 expected project skills present |

The discovery check resolves Codex's `rN` directory aliases before matching
project-owned skills. An initial full-path-only matcher incorrectly counted zero;
no loader defect was inferred from that failed assertion. No model generation was
requested. Global/private prompt contents were neither returned nor persisted.

One independent Sol `gpt-5.6-sol/high` review covered the coherent changeset. Its
initial REQUEST CHANGES identified partial fresh-file writes, an optional legacy
baseline, and unsafe manual `cp -r` instructions. All three were accepted and
corrected. Six actual failing regressions became green; full suite and archive
checks were rerun. Coordinator inspected the narrow fixes and accepts them; no
second whole-scope review or fabricated reviewer approval is claimed.

Logs and reproducible archive-check script:
`/tmp/superkit-codex-install-2026-10-15/`.
Local candidate archive:
`.superpowers/sdd/2026-10-09-gpt-agent-roadmap-1.5.3/artifacts/claude-code-superkit-1.5.2-codex-candidate.tgz`.
SHA-256: `6245768f4f17ee2dfb9418069068a56ce26802d514061404ee7060a118a75be6`.
This locally built candidate is **not** the published v1.5.2 artifact.

## Acceptance and remaining boundary

**Installation/update milestone accepted by the coordinator.** It does not close
broader workflow/support compatibility, native hook mapping or final release
candidate approval. Discovery is loading evidence, not workflow/model-quality
proof. macOS was exercised; other OS/filesystem behavior, including Windows
symlink permission requirements, was not runtime-qualified. The whole install is
not transactional, concurrent external edits are unsupported, and the lock is
not a hostile-filesystem security boundary. Conflicts require manual resolution;
preserving them is not equivalent to applying all upstream changes.

Source/static native ownership protections remain covered by existing product
tests. Research/BEH/collector queues remain out of scope, not passed. Preserve the
unrelated market-workstation ZIP. Commit/push of this bounded feature checkpoint
is authorized; merge/tag/publication remain separate.
