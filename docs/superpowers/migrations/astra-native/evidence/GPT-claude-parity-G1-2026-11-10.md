# Codex / Claude role comparison — G1

Date: 2026-11-10. Status: ACCEPTED — bounded source, static and local integration evidence.
No live model-quality qualification is claimed.

## Scope and checkpoint

Owner-authorized G1 only: `comment-rot-analyzer`, `silent-failure-hunter`, and
`go-modernizer` under `packages/codex/skills/<name>/SKILL.md`. Compare against
the Claude rework without copying its harness-specific contracts. Stop after
one verified group commit and report; return the shared checkout to
`claude/opus-5-5-agents`. Do not start G2 in this task.

Implementation branch: `codex/astra-native-hardening`; initial HEAD
`3db1fa6c8bde53b00671baadc6008cc8c9b0c853`. Read-only Claude source pinned to
`2cba85502706c673209499690b01c248b136f0de`; relevant reworks are `4f94606`
(comment/silent) and `44f5974` (Go modernizer). No Claude package, manifest,
baseline, historical evidence, unrelated working file, release, version, tag,
push, or merge is in scope. Component counts must stay unchanged.

The current request and `docs/WORKING_AGREEMENT.md` govern this packet. One
bounded Astra author owns the three role semantics; Sol owns local fact checks,
integration, independent review and Git acceptance. Requested worker routes:
`gpt-6-astra/high` and `gpt-6.1-sol/ultra`. These are dispatch requests, not
independent runtime-identity attestation or measured model-quality evidence.

Acceptance: role-by-role take/reject/KEEP triage, native caller compatibility,
local support for new tool/runtime claims (otherwise explicit uncertainty),
size and token metadata checks, complete relevant source review, `npm test`,
`node --test test/codex*.test.js`, counts/version/phase/About checks and
`git diff --check`; explicit-path commit after passing gates.

Historical `ledger.json`, `baseline.json` and existing evidence remain unchanged:
the migration inventory is explicitly INACTIVE / HISTORICAL in its README.
This document is the current G1 checkpoint and acceptance record, with no
promotion of historical research status or behavioral counters.

Preservation snapshot: `/private/tmp/superkit-g1-20261110-protected.json`
(413 pre-existing files, including owner WIP and protected package/evidence
sources). Local author/fact records use `/private/tmp/superkit-g1-20261110-*`.
The initial context measurement was unavailable; a later coordinator reading
was 90,248 at `2026-11-10T15:04:59.676Z` (latest completed request/response,
not an exact live count); no compaction was reported.

At acceptance, the remaining coordinator actions are the explicit-path signed
G1 commit and restoration of the caller's branch. Their observed result and
commit identity are reported after execution. Do not start G2.

## Initial deficiencies and pre-edit triage

Comment role lacks CRITICAL for relied-on, consequential false safety or contract guarantees; silent-failure role has broad language coverage but lacks compact concrete runtime traps and an explicit gate for decisive unverified runtime behavior; Go modernizer has good execution restrictions but no usable conditional installed fix-analyzer diagnostic path.

### comment-rot-analyzer (6 decisions)

| Decision | Candidate | Reason |
|---|---|---|
| TAKE | Consequential relied-on false safety/contract claim can be CRITICAL; add to native report slot | Existing WARNING/SUGGESTION ceiling understates severe impact; require reliance and consequence, not scary wording. |
| TAKE | Concrete safety/contract assertions to verify | Makes authorization, validation, concurrency and privacy guarantees discoverable without broadening scope. |
| KEEP | Contract-vs-code ownership, TODO/reference evidence and functional annotations | Native already guards against rewriting an invariant to excuse a bug and preserves legitimate comments. |
| KEEP | Selected scope, coverage, uncertainty, runtime identity and native report | Already supports caller acceptance without invented probability. |
| REJECT | Automatic latest-commit scope, repository-wide harvesting, unconditional external-read prohibition | Conflicts with caller-owned native scope or narrows existing permitted read access without need. |
| REJECT | Claude frontmatter, tools, report phrasing and numeric confidence | Native contracts are intentionally independent. |

### silent-failure-hunter (6 decisions)

| Decision | Candidate | Reason |
|---|---|---|
| TAKE | Compact locally vetted runtime-status, async, finally and shell candidates | Concrete missed failure mechanisms; each still needs caller consequence. |
| TAKE | Decisive runtime uncertainty goes to Open Questions | MEDIUM cannot substitute for an unverified premise that decides whether failure exists. |
| KEEP | Trace/consequence severity, recovery, redaction and scoped check authority | Already stronger and more nuanced than blanket suppression findings. |
| KEEP | Native report labels, selected scope and required-coverage behavior | No caller change needed. |
| REJECT | Absolute allSettled-never-rejects, curl exit-zero, Node/asyncio global behavior claims | Input/protocol/configuration and supervision exceptions make broad wording misleading; no need to import every trap. |
| REJECT | Claude default scope, numeric confidence, commands/tool frontmatter and mandatory pattern accounting | Unnecessary behavioral rewrite. |

### go-modernizer (6 decisions)

| Decision | Candidate | Reason |
|---|---|---|
| TAKE | Optional installed fix analyzer through a locally confirmed non-editing vettool mode | Adds useful diagnostics without downloads or source edits; task authority and effects remain prerequisite. |
| KEEP | Version/API/equivalence coverage, source verification and reference safety | Native already covers supported matrix, GODEBUG, library contracts and optional references. |
| KEEP | Native report, caller ownership and no self-delegation | Compatible with go-reviewer and orchestrator boundaries. |
| REJECT | Mandatory vet/fix-analyzer run and exact exit-1 assumption | Optional evidence cannot create execution authority; nonzero may mean setup failure. |
| REJECT | Expanded API catalog, blanket syntax-only labels, reference rewrite recipes | Adds scope and risk without addressing the admitted deficiency. |
| REJECT | Claude frontmatter, severity inflation, numeric confidence and report replacement | Preserve native semantics and caller contracts. |

## Caller compatibility

- dev-orchestrator Phase 12 already dispatches comment/silent and consumes CRITICAL/WARNING at HIGH/MEDIUM, preserving coverage and mandatory unknowns. Adding comment CRITICAL uses an existing caller enum.
- review-orchestrator preserves role reports, coverage and mandatory evidence; its current direct dispatch table does not list comment/silent. This is pre-existing, not changed or silently claimed fixed by this bounded patch.
- go-reviewer recommends go-modernizer through the caller and already requires installed-version evidence and inspected execution effects. The new optional diagnostic route must remain under that same authority.
- Report headings, confidence labels, Coverage/Progression enums, migration table, failure categories, and role ownership remain intact.

## Integrated changes and evidence

Changed product paths are only:

- `packages/codex/skills/comment-rot-analyzer/SKILL.md`
- `packages/codex/skills/silent-failure-hunter/SKILL.md`
- `packages/codex/skills/go-modernizer/SKILL.md`

`README.md`, `CLAUDE.md`, and `CHANGELOG.md` document the bounded update; this
file is its sole current acceptance/checkpoint record. Caller/support skills,
`native-skills.txt`, `legacy-baseline.json`, the historical ledger and all
previous evidence remain unchanged. No counts changed: Claude 56 agents,
16 commands, 42 shipped hooks, 22 skills, 19 shipped rules; Codex 82 skills
and two native handlers. Version remains 1.5.3.

| Role | Body chars before → after | Growth | tokens before → after | SHA256 after |
|---|---:|---:|---:|---|
| comment-rot-analyzer | 6342 → 6981 | 10.08% | 1586 → 1745 | `f602d7ce8e0c6f5d1c69655e20eacb4b6ed05e63af686605a347549f3b7d2bf5` |
| silent-failure-hunter | 14007 → 15973 | 14.04% | 3502 → 3993 | `bfffa3fb090b7616dba8125b591252375ae4ab14c256cc3443ebe12a4cebdbc9` |
| go-modernizer | 14319 → 15367 | 7.32% | 3580 → 3842 | `3debab95093aa6cbba3ea79fe254b605c7496ebe9cee4820ad18418f972fe7da` |

Each addition prevents a specific misclassification or unestablished execution:
comment reliance/severity, lost runtime failure results, or an unsafe analyzer
invocation. No role grew by 25%. Tokens use `Math.round(body.length / 4)`;
the broad token injector was not run because it targets Claude sources.

### Local claim verification

Installed versions: Node 26.4.0, Python 3.9.6, Requests 2.32.5, Bash 3.2.57,
Go 1.26.4 darwin/arm64. Exact probe arguments, outputs, installed-source
excerpts and hashes: `/private/tmp/superkit-g1-20261110-facts/`; compact facts:
`/private/tmp/superkit-g1-20261110-local-facts.md`. Entry scripts are
`probe_local_facts.py` and `probe_http_local.py` in that directory. These are
isolated runtime checks; no server, remote service, download or project
application was started.

| Claim checked | Method / actual observation |
|---|---|
| JS/Python finally-return replacement | Local functions threw in try and returned in finally; caller received replacement. Both runtime probes exited 0. |
| forEach async and allSettled | Local JS probe observed forEach return before callback completion; synchronous catch missed the owned async rejection. Ordinary allSettled rejection became an entry, but a throwing iterator rejected the outer promise. |
| Child-process failure status | spawnSync and subprocess.run returned child exit 7; Python check=True raised CalledProcessError. Process launch errors are a distinct, unqualified case. |
| HTTP error response handling | Socket-free Node custom dispatcher and Requests BaseAdapter returned 503 normally. Fetch ok=false; Requests raise_for_status raised HTTPError. Matching installed source was inspected; no transport/TLS behavior is qualified. |
| Bash status masking | Isolated function with false under set-e stopped normally, but continued when used in if/and/or condition contexts. local assignment lost the substitution failure; plain assignment stopped. |
| Go analyzer mode | Installed go help vet, go tool fix help and driver/unitchecker source establish default non-applying mode and explicit -fix application. A dependency-free temporary fixture, `go vet -mod=readonly -vettool=<verified GOTOOLDIR>/fix ./...`, exited 1 with two interface{} modernization diagnostics; source and go.mod hashes stayed identical. |

The Go fixture used GOTOOLCHAIN=local, GOPROXY=off, GOSUMDB=off, GOENV=off,
empty GOFLAGS, GOWORK=off and temporary cache/module-cache/tmp/telemetry paths.
It created 250 cache files: source-preserving does not mean side-effect-free.
The transferred route still requires selected-installation help/source,
workspace settings, effects and task authority; this fixture does not qualify
other Go versions or arbitrary project wrappers/compilers. Nonzero is not
universally a finding and zero is not equivalence proof.

Preserved failures/limits: the initial combined Node HTTP probe exited 1 due
to a dispatcher-callback mismatch. Core JS facts were rerun independently
(`js_core.json`, exit 0); installed-source-matched HTTP rerun
(`js_http_corrected.json`, exit 0). Requests emitted a preserved urllib3 TLS
warning; TLS was not tested. No claim that the first combined probe passed.

### Repository verification

| Check | Result / evidence |
|---|---|
| First npm test | Exit 1: 115 passed, 9 failed, 9 cancelled out of 133. Temporary Git commit signing could not access the key. Original `superkit-g1-20261110-npm-test.log` retained. |
| First Codex suite | Exit 1: 103 passed, 9 failed out of 112, same signing setup failure. Original `superkit-g1-20261110-codex-tests.log` retained. |
| Authorized signing recovery | `ssh-add --apple-load-keychain` exited 0. Signing stayed enabled; no Git config/test change or bypass. Tests rerun with access to the loaded signing agent. |
| Final npm test | Exit 0: 133/133, 14 suites, zero failures/cancellations/skips/todo; `superkit-g1-20261110-npm-test-rerun.log`. |
| Final node --test test/codex*.test.js | Exit 0: 112/112 across five files, nine suites, zero failures/cancellations/skips/todo; `superkit-g1-20261110-codex-tests-rerun.log`. This is a subset of the full suite, not 112 additional unique tests. |
| bash bin/superkit-counts-verify.sh | Exit 0; all component counts and version remain unchanged. |
| Manual documentation counts | CLAUDE per-package cells, including shipped/internal separation and skills, match; detailed log `superkit-g1-20261110-counts-detail.log`. Initial ad-hoc inventory used the wrong showcase hook directory; corrected to .claude/scripts/hooks (13), no repository defect. |
| Phase/stale-reference checks | All seven required docs/callers retain 16 phases; no stale 8-phase reference outside excluded historical plans/changelog. |
| GitHub About | gh repo view --json nameWithOwner,description succeeded after a restricted-network failure; 56/16/42/22/19 and Codex 82/two match. Read-only; no remote update. |
| Protected sources / owner WIP | All 413 existing snapshot files byte-identical before commit, independently checked by coordinator and reviewer. |
| Native structure and tokens | Unchanged discovery/invocation metadata, balanced fences, exact tokens and body growth verified; `superkit-g1-20261110-structural.json`. |
| git diff --check | Exit 0 for the integrated tracked diff. Final staged whitespace check remains part of commit preparation. |

Log basenames above are under `/private/tmp/`. No mandatory check is waived.
Structure/converter/installer tests and source review do not establish model
quality. Live model evaluation, real network/TLS behavior, other installed
runtime versions, release/tag/publication/push/merge, and G2–G6 were NOT RUN
because they are outside this group's authorized scope. Model runtime identity
remains UNVERIFIED independently of requested routing. Future role users must
verify their actual runtime/library context as the revised skills require.

## Acceptance

Independent source review: PASS, COMPLETE assigned coverage, zero actionable
findings and ALLOWED progression. The reviewer authored local fact probes but
none of the product/documentation edits; all seven changed files and relevant
caller/support contracts were covered. Report:
`/private/tmp/superkit-g1-20261110-review.md`.

Astra final semantic source acceptance: ACCEPTED for the exact three SHA256
values above, with no requested corrections or outstanding semantic findings.
Authorship, pre-edit triage and final acceptance are recorded in
`/private/tmp/superkit-g1-20261110-astra.md`. No product-source edits followed
independent review; final evidence-slot completion is factual documentation.
The coordinator accepts G1 within this bounded source/local-check scope.

No mandatory behavioral-model evaluation is included in this product-source
scope; no historical research gate or evidence is promoted by these checks.
Final passing log SHA256 values: npm
`652e2c2eebf599ddc767e506c1aa5dff0b67e694beefa4ba0b672c633514fa25`,
Codex `8e3f26481351645891f7500ab9f73c6219c6b55d2b1024aae0ee95b4576f898d`.

## Remaining groups

G2–G6 (31 roles in the supplied 34-role list) remain unstarted. The owner also
reports that Claude packages 12–19 are still being rewritten; after those are
finished, the remaining 22 agents need a further comparison. That future work
is not claimed complete by G1.
