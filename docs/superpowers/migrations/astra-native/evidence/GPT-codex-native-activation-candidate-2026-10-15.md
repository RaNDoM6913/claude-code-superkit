# Codex native activation and reviewed local candidate

Date: 2026-10-15. Base: `bf2ad470878a5cab4a8333fd5103ccc48d751a4d` on
`codex/astra-native-hardening`. Owner authorized continuation of the native hook
check and local candidate preparation; no version bump, push or publication.
GPT-6.1 Sol performed the independent candidate audit and bounded documentation
corrections. The coordinator ran the native test and accepts the scoped evidence.

## Native lifecycle proof

Test runtime: `codex-cli 0.162.0-alpha.17.2`, local POSIX/macOS. A disposable Git
repository with no remotes was installed from the prior candidate archive
`ae56c9cf8851e7edd86a125d269f6b0f4c4ff38cda9f36839d69fc164266fb39`.
Only manufactured sentinel text was at risk. The fixture's AGENTS constrained the
mechanical smoke to its own directory and prohibited unrelated tools/actions.

The normal CLI folder-trust prompt was accepted for that fixture. In `/hooks`,
the two project definitions were inspected and trusted individually. No trust-all,
hook-trust bypass, permission bypass or provider substitution was used. Existing
global hook definitions were not toggled. Native `hooks/list` then reported both
fixture hooks trusted/enabled. These deliberate trust decisions are saved for
this fixture; no real consumer project was installed or activated.

| Native observation | Evidence |
| --- | --- |
| PreToolUse blocked an attempted hard reset | Project-scoped native `hook/completed`, event `preToolUse`, status `blocked`, reason identifies Superkit explicit hard reset denial |
| Stop requested follow-up on intentional whitespace | Project-scoped native `hook/completed`, event `stop`, status `blocked` |
| Stop continuation terminated without a loop | Successor observation: `stop` statuses `blocked` then `completed`, followed by native `turn/completed` status `completed` |
| Fixture preservation | Exact uncommitted sentinel bytes retained; installed hook script/config hashes unchanged |

Two explicit native turn starts were used, both requesting GPT-6.1 Sol/high.
This counts native turn-start requests, not internal inference calls or billed
usage. One turn tested a denied shell operation; the other requested no tools and
checked Stop continuation. No additional model evaluation program was started.

The first attempt captured PreToolUse and initial Stop denial, then hit its
180-second event-reader bound before recording final completion. It is retained
as **partial**, not relabeled successful. The local probe mixed `TextIO` buffering
with descriptor readiness; an independent two-line pipe check reproduced missed
buffered notifications. A queue reader was used in a distinct successor attempt.
That attempt recorded both Stop completions and a completed native turn. Native
hook/product code was not changed to obtain this result.

Fixture Git configuration was isolated per test process so global clean/process
filters did not suppress the intended whitespace test. HOME/CODEX_HOME and the
operator's Git configuration were not changed. The documented normal behavior
with any configured conversion filter, including global Git LFS, remains
UNVERIFIED/skip. These observations prove the two bounded native handlers in
this runtime; they do not establish all shell protection, every workflow/model,
Windows/cloud compatibility, or deployment into other projects.

Exact native-tested bytes, also present in the final candidate:

- `hooks/superkit.mjs` SHA-256:
  `142f9c710284f61f8eab849fae280923878ff562a00c6032469cee17d4f8f5eb`.
- `hooks.json` SHA-256:
  `8fe8fe037c3bf673b2a59e1d34046fe72a47c8f5685ffa46f84b398dc8d17aa8`.

Fixture (retained for audit):
`/private/var/folders/sf/h7tqnm5j5d738jxc4yhrspdh0000gn/T/superkit-native-activation-76qcyuwc/project`.
Filtered project-only native evidence and both attempts:
`/tmp/superkit-codex-native-activation-2026-10-15/`.
No unrelated/global prompt contents or transcripts were collected in this bundle.

## Complete candidate accounting

The independent audit classified all **180** changed paths from v1.5.2 to bf2ad47:
90 appear in the npm archive and 90 are excluded. The coordinator reviewed this
subsequent documentation/evidence-only checkpoint; the final delta contains
**181 paths: 90 shipped and 91 excluded**, including the new activation record.
Product code is unchanged in this packet. The final category totals are below.

| Delta category | Paths | Shipped |
| --- | ---: | ---: |
| Codex skills | 69 | 69 |
| Codex configuration/install/native metadata/hooks/rules | 8 | 8 |
| Installer/converter | 4 | 3 |
| Existing Claude/shared core work | 4 | 4 |
| Optional GAN | 4 | 4 |
| Documentation/agreements/metadata | 9 | 2 |
| Historical evidence/baseline/plans/specs | 78 | 0 |
| Product tests | 5 | 0 |

The shared artifact includes completed prior Claude statusline/updater changes
and optional GAN sources; they are explicitly accounted for, not silently treated
as new Codex-only work. No unfinished Claude prompt migration was found. The
Codex-only selector still installs no Claude assets, and GAN remains manual opt-in.
Preexisting internal core test/rule files are in the broad source archive; the
INTERNAL-FILES contract prevents their installation into consumer `.claude`.
No root research executables, docs/tools/test trees, private ZIP or nested archive
are included. Accepted role authoring was reused, not repeated.

Four narrow documentation issues were corrected: stale audit/plan/visual catalog
claims, false statusline profile-badge claims, initial native-count/routing
chronology, and a research landing page that still looked like an active queue.
Immutable baseline/evidence records remain preserved; research is out of scope,
not declared complete. Current contributor routing and consumer model defaults
remain separate.

## Reviewed local artifact and checks

Local candidate:
`.superpowers/sdd/2026-10-09-gpt-agent-roadmap-1.5.3/artifacts/claude-code-superkit-1.5.2-codex-reviewed-candidate.tgz`.
SHA-256: `c33ae88029444396228ef24b39466980eaff40edf29be499ddcaa168e8eb412d`.

All **353** regular archive files match the checkout. Compared with the retained
prior candidate, only packaged `packages/codex/INSTALL.md` differs. The native-tested
hook bytes, all 82 ordinary skills and 65 native ownership entries are preserved.
VERSION/package.json remain **1.5.2**. This is a local candidate, not a published
release or a new package version.

Reused code-level verification remains applicable: 133 product tests, 13 smoke
checks, 56 hook cases, 15 core-hook suites, three frontend hook suites, native
policy decisions and installed/archive update preservation. No code changed, so
those suites were not repeated for prose-only fixes. Current scoped whitespace,
version/count/phase integrity, remote numeric metadata, link checks, archive byte
comparison and native activation checks passed within their stated scope.

## Remaining release decisions

At read-only inspection on 2026-10-15, remote tags/GitHub releases ended at v1.5.2;
v1.5.3 was not observed. npm package lookup returned E404. No next version, npm
name rights or publication availability is inferred; recheck before any release.

GitHub About's numeric counts match, but its blanket Claude Fable authorship
wording still needs to be scoped to the Claude layer in a future authorized
publication-metadata change. It was not changed remotely in this no-publication
packet. Version selection/synchronization, push, merge, tag, GitHub release and
npm publication remain explicit owner decisions. No release operation occurred.

**Accepted:** bounded native activation plus reviewed local candidate preparation.
No broader model-quality or production-deployment claim is made. The unrelated
market-workstation ZIP and previous candidate/evidence remain preserved.
