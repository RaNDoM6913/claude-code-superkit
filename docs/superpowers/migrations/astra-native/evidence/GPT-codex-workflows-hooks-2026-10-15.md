# Codex workflows and native hooks — bounded acceptance

Date: 2026-10-15. Base: `7ab4881`, branch `codex/astra-native-hardening`.
Owner scope: necessary Codex workflow/support compatibility and hooks; no research
queue, version bump or publication. Version stays **1.5.2**. The coordinator
retains integration/acceptance; after the owner's routing update, remaining
implementation, documentation and independent review used GPT-6.1 Sol workers.
This routing choice is not a claim of empirically measured model equivalence.

## Accepted source and product changes

All nine workflow skills and all 21 support skills were inspected against actual
installed paths, dependencies, invocation and authority boundaries.

| Scope | Concrete result |
| --- | --- |
| dev/review/audit orchestrators | Discover available tools/roles; coherent review target; honest unavailable/inline-versus-independent coverage; migration scaffolding distinct from application |
| test/lint runners | Installed commands; no implicit package installs or default formatting writes; original failures/skips retained |
| commit helper | Authorized staged scope, unrelated index preservation, redacted secret findings, actual new-commit verification |
| new-migration/migrate | Real format/target/tool authority; status preparation default; no rollback-to-reset/push substitutions or implicit database/service setup |
| benchmark | Preserve checkout/WIP; isolated comparison and evidence; no unconditional latest tool install or invented significance |
| 21 support sources | Four confirmed fixes: impeccable-craft missing Claude rules/memory assumptions, html-to-3d-texture prerequisites, go-benchmark tool availability, postgresql-optimization nonexistent companion |
| Native ownership | Ten newly adapted sources registered; 65 protected entries; converter preservation regression reproduced and fixed |

The other 17 support sources, including all four accepted K01 sources, remain
byte-identical to the base. Accepted role sources, Claude package sources and
optional GAN sources are unchanged. The catalog remains 82 skills and the dev
workflow retains sixteen phases. These are source/dependency compatibility
results, not live database/browser/workflow/model-quality qualification.

## Native hook contract

The existing Codex-only and additive installers now ship one Node script with two
native command handlers. No Claude tree or plugin is needed.

- **PreToolUse / Bash:** deny-only recognition of bounded explicit destructive Git
  operations. Options, value arguments, messages, short clusters and `--` are
  handled for covered direct forms. Dynamic syntax, aliases and arbitrary
  wrappers are not a complete shell enforcement surface. Absence of a deny is
  never an approval grant; native permissions and task authority still apply.
- **Stop:** fixed tracked staged/unstaged Git diff hygiene, with at most one
  continuation. It does not establish tests/builds, untracked-file correctness or
  behavior. Git errors/unavailable checks are `UNVERIFIED`.
- **Filter safety:** any configured clean/process conversion driver, including
  unused/global Git LFS, causes both diff checks to be skipped as `UNVERIFIED`.
  Only configuration keys are enumerated, never command values. No filter/config
  is changed. Filter-free repositories retain the diff checks. This conservative
  availability limit prevents configured conversion programs from executing.
- No transcript reads, model requests, project commands, external services or
  automatic formatting are added. External diff/textconv/fsmonitor are disabled.
  Concurrent external Git reconfiguration is outside the bounded contract.

`hooks/superkit.mjs` and `superkit-hooks.json` are managed assets in the existing
schema-1 manifest's optional `assets` map. Pristine replacements receive unique
backups. Active `hooks.json`, user config and edited assets are preserved. New
active wiring is created only beside absent/exact-shipped config and unconflicted
assets; other consumers receive a separate merge template. Trust is never granted
by the installer. Review script updates separately from definition-hash trust.
See the [installation contract](../../../../../packages/codex/INSTALL.md).

Official mechanisms checked: [hooks](https://learn.chatgpt.com/docs/hooks) and
[approval rules](https://learn.chatgpt.com/docs/agent-configuration/rules).
Current native command handlers and project/definition trust are distinct from
unsupported prompt/agent hook execution. This packet maps two useful checks;
it does not promise parity with all Claude hooks. POSIX/macOS was exercised;
Windows/cloud orchestration remains unqualified.

## Verification and review

| Evidence | Result |
| --- | --- |
| Final `npm test` | 133/133 PASS; zero failed/skipped/cancelled/todo |
| Final `npm run test:smoke` | 13/13 PASS |
| Native converter preservation | 3/3 PASS; actual overwrite RED before registration |
| Hook-only suite after P1 correction | 56/56 PASS; real clean/process side-effect RED 0/2 became green |
| Core hook suites | 15 suites PASS |
| Frontend UI hooks | animation 13/13, banned-fonts 9/9, color 12/12 PASS |
| Integrity with remote About, version/count/phase, whitespace | PASS; Claude 56/16/42/22/19, Codex 82 skills, version 1.5.2 |
| Extracted archive fresh/repeat | 82 skills; exact installed source bytes; no Claude; idempotent |
| Actual v1.5.2 install → candidate | 68 pristine skills updated with 68 backups; one edited reviewer preserved; config/AGENTS/Claude unchanged |
| Previous installation candidate → new candidate | Skills-only schema-1 manifest upgraded; two managed assets; custom active hooks/AGENTS preserved |
| Installed handler commands from subdirectory | Native-shaped input produces deny, detects real diff errors and prevents repeat continuation; workspace bytes unchanged |
| Normal host with configured Git LFS | Stop returns UNVERIFIED; never reported as hygiene PASS |
| Native rule parser | `codex execpolicy check`, 6/6 expected allow/prompt/forbidden decisions; candidate commands were evaluated, not executed |
| Native skill loader | `codex debug prompt-input`, expected 82 project skills; no model generation or retained private/global prompt |

Installed-handler hygiene tests isolate the fixture's Git configuration so its
filter-free path is explicit. Separate real clean/process/global-filter tests
cover conservative skipping. They are not evidence of trusted lifecycle firing.

One independent GPT-6.1 Sol review covered the whole coherent scope and raised
one P1: Git diff can execute clean/process conversions despite the other helper
flags. The assigned worker reproduced both side effects and added the key-only
pre-diff guard. The coordinator inspected the narrow correction, reran the full
suite and final archive checks, and accepts it. No second whole-scope review or
unperformed reviewer approval is claimed. A coordinator CLI check also corrected
an intermediate mistaken assumption: `codex execpolicy check` exists even though
it is omitted from the top-level help list; final docs retain the valid command.

## Runtime activation boundary

On local `codex-cli 0.162.0-alpha.17.2`, a fresh generated fixture was inspected
through native `config/read` and `hooks/list`. Its project layer is disabled
pending project trust; zero fixture hooks run. No persistent project/hook trust
was changed and no trust bypass was used. **Native lifecycle firing remains
UNVERIFIED.** The consumer must trust the reviewed project and review definitions
through `/hooks` before automatic hook execution can be exercised.

The implementation/source/package/handler milestone is accepted at those exact
evidence levels. Activation and live workflow/model behavior are not inferred
from tests or discovery. Final release-candidate review and all publication
remain outside this packet's authorization.

## Artifacts and Git boundary

Logs, native probe results and reproducible artifact scripts:
`/tmp/superkit-codex-hooks-2026-10-15/`.

Local candidate:
`.superpowers/sdd/2026-10-09-gpt-agent-roadmap-1.5.3/artifacts/claude-code-superkit-1.5.2-codex-hooks-candidate.tgz`.
SHA-256: `ae56c9cf8851e7edd86a125d269f6b0f4c4ff38cda9f36839d69fc164266fb39`.
This is a local candidate with unchanged package version, not a published release.
The previous installation artifact/evidence is retained; one negative stale-phase
scan description was reworded to avoid matching its own scan, without changing
historical test results. The unrelated market-workstation ZIP is preserved.
