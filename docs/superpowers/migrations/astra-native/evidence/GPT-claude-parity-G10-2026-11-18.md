# G10 · Native Codex roles against Claude v1.5.4

2026-11-18. Source comparison for the ordinary installer, using the G7–G9 Claude baseline `2cf6f27f02d9a56a49c0bbb47fed8c349ad7634b` and release tag `v1.5.4` → `412b87e01fe9bac8109c11df93b10e4dcd17ffec`. The evidence here concerns shipped prompts and local fixtures. Consumer model behavior and deployment enforcement are UNVERIFIED.

## Inventory and counting

| Source set | Mapped ordinary roles | Claude body changed | Claude header only | Native ADOPT | Native KEEP |
|---|---:|---:|---:|---:|---:|
| core | 31 | 31 | 0 | 30 | 1 |
| stack-agents | 9 | 9 | 0 | 9 | 0 |
| frontend-3d | 4 | 0 | 4 | 0 | 4 |
| frontend-ui | 6 | 4 | 2 | 5 | 1 |
| extras | 3 | 3 | 0 | 2 | 1 |
| **Total** | **53** | **47** | **6** | **46** | **7** |

Each role has exactly one primary disposition. **ADOPT** means a targeted native edit. **KEEP** means its skill body and metadata are byte-identical to the pre-G10 native commit `0ade50a`. **REJECT** decisions apply to individual proposals. The three optional GAN sources are under `packages/gan/skills`; they belong to a separate inventory. Of the 66 entries in `packages/codex/native-skills.txt`, these 53 correspond to ordinary agents. Other entries represent command/workflow/support skills. The 56 Claude agents include the three optional GAN roles. Counts use actual source files, including both `ui-reviewer.md` files and the nested extra `packages/extras/red-blue-auditor/agent.md`. The brief's “46 changed” is not the ordinary source count: the tag comparison changes all 53 ordinary source blobs, 47 bodies and six header-only.

Reproduce a row with `git diff --no-ext-diff -U0 2cf6f27 v1.5.4 -- <Claude path>`, `git show v1.5.4:<Claude path> | nl -ba` and `git diff 0ade50a f7d4096 -- <native path>`. Release-note references below use **the tagged CHANGELOG.md** (use `git show v1.5.4:CHANGELOG.md | nl -ba`), whose line numbers can differ from the working copy. In each row, source line numbers identify tag-side changes and native line numbers identify the resulting implementation or existing contract. Hunk locations include changes to examples and templates as well as the applicable rule. Local semantic checks and limits appear after the ledger.

## Shared decisions

- **REJECT** copying Claude `tools:`, model/effort and generated token values into Codex frontmatter. The 53 mappings below have a native authority model. The six header-only sources retain the same Claude body since `2cf6f27`. The working Codex token metadata uses the project body-length heuristic in `bin/measure-tokens.js:6`.
- **ADOPT** content-aware, repository-root side-effect comparison around authorized operations. A status string alone misses a second write to an already-dirty path and a change under an untracked directory. Include untracked path identities and contents, relevant tracked state and selected ignored outputs. Failure, unsupported Git state, unreadable input or a boundary outside observation leaves the result unverified. Preserve unexpected changes. **REJECT** copying a pipeline whose last successful hash could mask an earlier failure, and claiming absence of all workstation side effects from a repository snapshot.
- **KEEP** the caller's assigned range, working tree or audit scope. A named working-tree file is compared to HEAD if available; read untracked additions whole. Missing Git, truncated hunks or a missing base requires file inspection and explicit attribution limits. **REJECT** silently substituting a previous commit or fetching a base. A full audit can report an in-scope pre-existing defect.
- **ADOPT** original command/exit and concrete evidence for a run, nonzero finding-severity summaries and explicit missing evidence. Mandatory unknown checks remain UNVERIFIED; count distinct findings separately from coverage. **KEEP** caller-consumed required domain/status rows, including an actual zero where the field counts checks or MISSING documents. A capability's absence by itself is never a successful check. Never invent an acknowledgement. The Claude advisory hook at `packages/core/hooks/subagent-stop-validate.sh:59` and `:106` is a different runtime from `packages/codex/hooks/superkit.mjs`.
- **KEEP** existing native qualitative confidence, output headings, owner decisions and scope-sensitive severities wherever Claude changed examples, percentages, suggested thresholds or dispatch instructions. Concrete impact and actual evidence govern findings. **REJECT** copying any filled example as observed evidence or treating an illustrative grep, glob or library default as proof. A search error / truncated output is incomplete coverage.
- **ADOPT** offline execution only where authorized, using already installed and inspected executables. Launcher flags alone do not isolate repository config, wrappers, caches, package-manager resolution, subprocesses or the network. Prefer local source or skip the check when its assumptions cannot be established.

## Role decisions

### core

#### ai-slop-cleaner · ADOPT

Claude `packages/core/agents/ai-slop-cleaner.md` lines 11, 15–22, 26, 30–32, 34, 36, 38–39, 41–42, 44–45, 47–48, 50–51, 53–54, 58–62, 64, 68–72, 76, 79, 81–82, 84, 89, 93–94, 96–101, 104, 107–108, 110, 112–115, 117–118, 121–130, 135–138, 144–147. Codex `packages/codex/skills/ai-slop-cleaner/SKILL.md` lines 18. Tagged release note `CHANGELOG.md:60`.

- **ADOPT** Protect executable comments, Go defer/finally scope and effectful initializers.
- **KEEP** The existing edit gate checks public signatures, placeholders, truthiness, default arms, assertions, empty catches, one-use boundaries and uncertain cleanup. Report missing behavior as a follow-up; retain existing tests and owner work.
- **REJECT** Fixed category passes, language-wide one-use bans and rollback by deleting arbitrary files would widen authority.

#### api-contract-sync · ADOPT

Claude `packages/core/agents/api-contract-sync.md` lines 15, 25, 30, 39, 41, 48, 52, 55, 60–63, 67, 89. Codex `packages/codex/skills/api-contract-sync/SKILL.md` lines 20. Tagged release note `CHANGELOG.md:19`.

- **ADOPT** Resolve operation-level responses and ranges, dialect-specific nullable/$ref/readOnly/additionalProperties, merge-base/rename, generated client scope, directional compatibility and protobuf wire/method identity. Unknown operations prevent a complete verdict.
- **KEEP** Inspect actual registrations, serializer/middleware/error mapping, code-first schemas, clients and GraphQL selections. The native inventory handles no applicable target, missing spec or partial access separately.
- **REJECT** Do not fetch remote refs or substitute a base-branch tip. Treat framework-specific Go JSON/encoding, discriminator and codegen marker examples as versioned evidence to verify in the selected project; no generic serializer or CI-YAML rule.

#### architect · ADOPT

Claude `packages/core/agents/architect.md` lines 11, 26, 46, 54, 63, 68, 79, 100, 112, 123, 126, 139, 147, 156, 160, 176. Codex `packages/codex/skills/architect/SKILL.md` lines 16. Tagged release note `CHANGELOG.md:43`.

- **ADOPT** On escalation bind each disputed MUST to failure evidence, classification, proposed contract change and owner. Preserve blocking decisions.
- **KEEP** The existing design review checks other owners/layers, permits one viable approach and requests a check of the riskiest unknown. Implementation, conflicting requirements and missing evidence do not establish design failure.
- **REJECT** Fixed option/quota, confidence percentages, model-specific caller prose and filled Redis examples would introduce new evidence or change the caller contract.

#### audit-backend · ADOPT

Claude `packages/core/agents/audit-backend.md` lines 17, 23, 27–29, 35, 42, 70, 75, 78–79, 113. Codex `packages/codex/skills/audit-backend/SKILL.md` lines 22. Tagged release note `CHANGELOG.md:39`.

- **ADOPT** Recognize full-stack routes, workers and server actions, verify middleware order, preserve a proven no-backend result and distinguish failed discovery. Use literal search for code tokens; trace issued tokens, raw versus bound SQL and default credentials to real consumers.
- **KEEP** Keep migrations as schema evidence and test files for the test criterion. Evaluate TLS, public routes, error masking and input binding in context. Preserve 12 status rows for applicable backend audits.
- **REJECT** Reject PASS for missing evidence and copied grep/severity defaults. A framework-specific pattern is a lead, and a failed query supplies no coverage.

#### audit-frontend · ADOPT

Claude `packages/core/agents/audit-frontend.md` lines 16, 29, 50, 55–56, 59, 63, 67, 76, 79, 83, 88, 91, 101. Codex `packages/codex/skills/audit-frontend/SKILL.md` lines 20, 22. Tagged release note `CHANGELOG.md:36`.

- **ADOPT** Use root-scoped content checks, inspect leaf/hoisted tsc, composite/declaration flags, drift in strict defaults, missing generated types, alias failures and config-only exits. Include native form posts, wrapper semantics and file-based splitting.
- **KEEP** Twelve domains cover actual framework code, including dangerous HTML, exposed env/redirects, cache keys, accessibility, locales, tests and workspace dependencies. Guarded hits, plural/inline defaults and file routes need impact.
- **REJECT** Avoid regex catalogs as coverage gates, check-by-error-code alone, blanket tsc timeout and invented FAIL for missing project dependencies.

#### audit-infra · ADOPT

Claude `packages/core/agents/audit-infra.md` lines 16, 27, 37, 42–43, 45–49, 54, 57, 63, 69–70, 72, 76, 80, 82, 99–100, 104, 112, 117, 120, 128, 147, 149, 168. Codex `packages/codex/skills/audit-infra/SKILL.md` lines 22, 24. Tagged release note `CHANGELOG.md:35`.

- **ADOPT** Bind scanner status to actual roots, scope, original exit, endpoints and freshness; offline Go cannot establish latest. Verify permitted no-resolution pip input, unrated findings and relevant ignored output. Inspect K8s/Helm/Terraform, single-file migrations, actual datastore and backup applicability.
- **KEEP** Keep 12 domains, redacted evidence, context for CORS/CI/secrets, compose/Kubernetes health and logger presence. Include prod-like test/doc exposures, migrations/rollback ownership and data-retention intent in the selected scope.
- **REJECT** A literal hit, generic example variable, wildcard CORS, rollback dropping its own table or missing monitoring product is not automatically an issue. Reject infrastructure CLI execution or raw private state/config ingestion to fill evidence gaps.

#### behavioral-nudge-engine · ADOPT

Claude `packages/core/agents/behavioral-nudge-engine.md` lines 11, 15–22, 24, 26–32, 34, 38, 40, 42–46, 48, 50, 52, 54, 56, 58, 60, 62, 68–72, 76, 80–83, 86, 89–92, 94–99, 102–105, 108–112, 115, 119–122, 125–129, 131–133, 138–141, 147–150. Codex `packages/codex/skills/behavioral-nudge-engine/SKILL.md` lines 20. Tagged release note `CHANGELOG.md:57`.

- **ADOPT** Carry opt-outs into every experiment variant, avoid loss framing in sensitive contexts and keep drafts in-app while channel consent or time zone is unknown.
- **KEEP** Effective pause/stop/completion, suppression/expiry, queued cancellations, cross-channel consent, truthful placeholders, sensitive data minimization, voluntary progress and advisory-only authority already exist. MAP is a diagnostic lens; silence cannot establish motivation.
- **REJECT** Decline fixed three/five-ignore cadence and a forced digest/weekly sequence without a user-owned contract. No messaging, experiment, new collection or scheduling follows from a plan.

#### code-reviewer · ADOPT

Claude `packages/core/agents/code-reviewer.md` lines 15, 42–45, 47, 51, 65, 72, 83, 109, 113, 127, 142, 150, 156. Codex `packages/codex/skills/code-reviewer/SKILL.md` lines 20, 54. Tagged release note `CHANGELOG.md:53`.

- **ADOPT** Recover the assigned worktree, untracked files, truncated patches and selected merge parent. Keep pre-existing findings attributed. Reject unsafe caches/executed configs during check-only review. Emit actual severity tags and nonzero summary counts.
- **KEEP** Native already checks caller requirements, nullability, effective access controls, separation of confirmed and unverified issues and concrete review impact. Preserve the generic reviewer scope without assuming a dispatcher.
- **REJECT** Do not copy Claude probability bands, universal linter options, invented example requirements or a catch-all last-commit fallback.

#### codebase-onboarding-engineer · ADOPT

Claude `packages/core/agents/codebase-onboarding-engineer.md` lines 11, 15–22, 26–30, 32, 34, 38–39, 41–42, 44–45, 47–48, 50–53, 55, 57–58, 64–66, 69, 72–79, 82, 86, 89, 92, 94–95, 97–101, 104, 107–109, 112, 115, 118–121, 124, 127–128, 130–134, 137, 142–146, 152–155. Codex `packages/codex/skills/codebase-onboarding-engineer/SKILL.md` lines 18. Tagged release note `CHANGELOG.md:59`.

- **ADOPT** Qualify history by shallow status, entry scope, and generated/vendor/lockfile churn. Use example schemas without opening private environment files.
- **KEEP** Read-only entry task, checked source versus docs, declared/resolved/observed versions, actual flows, narrower hot paths, missing layers, command provenance and NOT RUN/app-readiness limits are already native.
- **REJECT** No universal history window, 120-line cap or examples-per-layer quota; an explicitly authorized bounded check can still produce observed evidence.

#### comment-rot-analyzer · ADOPT

Claude `packages/core/agents/comment-rot-analyzer.md` lines 20–21, 26, 30, 34, 36, 47–48, 50, 56, 62, 79, 104. Codex `packages/codex/skills/comment-rot-analyzer/SKILL.md` lines 20. Tagged release note `CHANGELOG.md:18`.

- **ADOPT** Use the actual left blob and rename source; recover scope or mark partial. Check complete literal issue IDs, generated/ignored definitions and truncated searches. Protect executable docs, type/directive comments and corroborate each repetition.
- **KEEP** Keep public contract comments, evidence for textual contradictions, security/data/outage consequence, conditional cleanup and native review scope.
- **REJECT** Do not label every restatement a defect or a missing grep result proof. History/example commit text, one output shape or a reference to a non-dispatched reviewer cannot establish correctness.

#### critic · ADOPT

Claude `packages/core/agents/critic.md` lines 28, 30, 32, 70, 112, 130, 134, 138, 140, 146–147. Codex `packages/codex/skills/critic/SKILL.md` lines 18. Tagged release note `CHANGELOG.md:46`.

- **ADOPT** Reconcile prior CRITICAL and WARNING issues by stable ID. Coverage stays partial for unrechecked criticals; distinguish a gate, owner decision and fix, and verify old/new evidence against the real diff.
- **KEEP** Keep conditional severity by demonstrated/reachable impact and the native APPROVE/CONCERN/BLOCK fields. A dependency-triggered hang needs its actual reachability and consequence.
- **REJECT** Do not import the erroneous old-file example, downgrade an unrechecked issue or assign owner-only fixes to the reviewer.

#### database-reviewer · ADOPT

Claude `packages/core/agents/database-reviewer.md` lines 15, 18, 29, 43, 53, 60, 65, 69–70, 115–116. Codex `packages/codex/skills/database-reviewer/SKILL.md` lines 20. Tagged release note `CHANGELOG.md:33`.

- **ADOPT** Read newly added model/query/migration paths whole. Distinguish bound ORM templates from raw fragments, PostgreSQL custom plans and constraint indexes, estimate-only EXPLAIN, SQLite numeric affinity, transaction semantics and version-scoped null uniqueness.
- **KEEP** Native traces planner predicates, conditional constraints, actual engine/transaction isolation, cascade retention requirements, SQLite busy behavior and ORM/schema ownership. Open Questions retain unavailable plans.
- **REJECT** Do not use a downloaded/client --version as deployment evidence or run a data-changing plan. Reject unconditional partial-index misses, mandatory money/soft-delete recipes or automatic cascade findings.

#### debug-observer · ADOPT

Claude `packages/core/agents/debug-observer.md` lines 16–17, 34–35, 44–46, 65, 85, 93, 112, 132, 161, 166. Codex `packages/codex/skills/debug-observer/SKILL.md` lines 26, 28. Tagged release note `CHANGELOG.md:22`.

- **ADOPT** Compare per-run effects and bound observation. Check listener/forward and Docker context, exited services, log start/end, verified env presence, test setup/pre/post scripts, and package-level shuffle/seed for an order claim.
- **KEEP** Keep bounded, redacted correlations and safe read-only data sources. No cause or fix is a valid result when evidence is absent. Existing native reporting distinguishes captured evidence, hypotheses and untried checks.
- **REJECT** No raw environment dump, assumed local target, forced 50× reruns/three failures/fourth hypothesis cap, automatic architect dispatch or mandatory container/DB access.

#### dependency-checker · ADOPT

Claude `packages/core/agents/dependency-checker.md` lines 21, 31, 38, 40, 43, 50–51, 57–58, 60, 87. Codex `packages/codex/skills/dependency-checker/SKILL.md` lines 22, 24. Tagged release note `CHANGELOG.md:37`.

- **ADOPT** Recognize exit-zero npm offline audit and omitted dependency classes in outdated; establish manager version, endpoint, wrapper and local installation, locked Rust input, Go replacements and ignored lock content. Expose only sanitized host metadata.
- **KEEP** The lock defines resolved versions. Distinguish unreachable/stale sources, errors versus tidy drift, uninstalled peers, advisory freshness and actual update ownership. Installed tools and config require inspection.
- **REJECT** No blanket registry probes, endpoint-version minimum detached from the selected backend, claims from truncated npm output, unpinned toolchain installs or printing full auth-bearing config.

#### docs-reviewer · ADOPT

Claude `packages/core/agents/docs-reviewer.md` lines 30, 46–47, 53, 116, 137, 142. Codex `packages/codex/skills/docs-reviewer/SKILL.md` lines 24. Tagged release note `CHANGELOG.md:24`.

- **ADOPT** Use quiet, single-path git check-ignore with proper error handling. Check actual maintained tree, its root/depth, ancestors of untracked additions, and explicitly superseded scaffolds. Confirm the requirement and scope before counting MISSING.
- **KEEP** Native keeps STALE/BROKEN/DRIFT/MISSING distinct; a known defect need not be missing. Relevant inaccessible evidence remains UNVERIFIED. Links/commands outside the required check are not blanket coverage failures. Search README and assigned doc roots.
- **REJECT** Reject a zero-MISSING-only PASS, unsafe external URL access, arbitrary old-commit fallback, and classification based on file presence alone.

#### e2e-test-generator · ADOPT

Claude `packages/core/agents/e2e-test-generator.md` lines 16, 26, 33, 38–39, 41, 50–52, 56–57, 63, 65, 74, 84–86, 112, 120–121, 144, 149–151, 153. Codex `packages/codex/skills/e2e-test-generator/SKILL.md` lines 22, 24, 87, 91, 95–97. Tagged release note `CHANGELOG.md:40`.

- **ADOPT** Preserve report title, add second-line count/result, actual Execution exit and separate reviewer mode. Inspect whole run effects including new baselines/ignored reports. Account for setup projects, retries/flaky outcomes, no runner, non-serving reporter and supported snapshot-update controls. Intercept by method/path, prove the route was hit, and qualify SSR/backend coverage.
- **KEEP** Keep Cypress/Playwright-specific behavior, positive anchors, page assertions, independently authorized environment and mock versus real contract. Preserve equivalent safe checks and separate generated cases from project/retry counts, unrelated failures and unrun targets.
- **REJECT** No install, unrequested snapshot generation, global service worker/config edit, blindly repeated risky browser steps, or claiming a caught abort proves a user-visible result.

#### evaluator · ADOPT

Claude `packages/core/agents/evaluator.md` lines 17, 20, 30–32, 42, 47, 95, 110, 130–131, 146–147. Codex `packages/codex/skills/evaluator/SKILL.md` lines 18, 20. Tagged release note `CHANGELOG.md:45`.

- **ADOPT** Check supplied evidence against actual working contents/binary; mark blocked setup, timeouts, mock/provenance mismatches and conflicting runs UNVERIFIED. Include content-aware before/after snapshots with independent ignored results.
- **KEEP** Keep agreed criterion thresholds, separate gate FAIL from missing evidence, score only evidenced rows and report MUST/SHOULD individually. Missing contract is an explicit dependency.
- **REJECT** Reject timestamp-only freshness, fabricated grades/aggregate progression and unconditional reruns or writes outside role authority.

#### goal-verifier · ADOPT

Claude `packages/core/agents/goal-verifier.md` lines 28, 30–31, 39, 46, 57, 61, 81, 109, 123. Codex `packages/codex/skills/goal-verifier/SKILL.md` lines 18. Tagged release note `CHANGELOG.md:48`.

- **ADOPT** Bind caller goals/embedded MUSTs by ID across passes. Changed or removed goals are GOAL CHANGED. Separate artifact existence, missing wiring and unreachable/unavailable deployment checks.
- **KEEP** Keep scope by requested slice and relevant plan, per-level evidence, known environment failure as a gap, mandatory unknowns and actual owner/resolver. Review reports missing goals explicitly.
- **REJECT** No self-authored replacement outcome, automatically treating an unregistered existing handler as missing implementation or guessing absent external config.

#### health-checker · ADOPT

Claude `packages/core/agents/health-checker.md` lines 19, 35, 47, 51, 53, 73–74, 81, 91, 137, 142, 151, 158. Codex `packages/codex/skills/health-checker/SKILL.md` lines 22, 24. Tagged release note `CHANGELOG.md:52`.

- **ADOPT** Separate npm pre/post effects, ignored build outputs and actual Next client chunks; count package-level Go results, inspect tracked Cargo lock/provenance and never use offline npm results as advisory coverage.
- **KEEP** Keep nine distinct health criteria, actual manager and environment, conditional forward-only migration strategy, evidence-limited compilation/test results and honest health verdict.
- **REJECT** No registry fetch, unwanted package-lock or cargo-audit lock creation, assuming a ready web client from a complete server build, or imposing nine expensive commands for a narrow health query.

#### migration-reviewer · ADOPT

Claude `packages/core/agents/migration-reviewer.md` lines 15, 19, 34, 45, 51, 59, 82, 100, 131. Codex `packages/codex/skills/migration-reviewer/SKILL.md` lines 22, 24. Tagged release note `CHANGELOG.md:25`.

- **ADOPT** Use trusted installed sqlite3 -safe and only self-authored inert, bounded SQL if needed. Inspect side effects and individually scoped untracked migrations; match the CLI to selected application engine/version. Assess row-scaled cost versus lock/rebuild.
- **KEEP** Keep application-specific recovery and locking, PostgreSQL/SQLite/version evidence, conditional index rebuild and unavailable verification. Follow installed manuals or scoped authoritative material.
- **REJECT** A mirror checklist or the client version alone cannot certify the production engine. No arbitrary SQL, extension/file operations, migrations, live database or dependency download.

#### minimal-change-engineer · KEEP

Claude `packages/core/agents/minimal-change-engineer.md` lines 11, 15–22, 26, 32, 34, 36, 38, 40–44, 48–51, 55–59, 61–62, 66–71, 75–79, 81, 83, 85–87, 89, 95, 99–100, 107, 110, 116, 122, 125–126, 129, 140, 142–144, 155–159, 162, 166–171, 173–174, 179–182. Codex `packages/codex/skills/minimal-change-engineer/SKILL.md` lines 12, 18, 28, 34. Tagged release note `CHANGELOG.md:58`.

- **KEEP** Native already requires smallest sufficient correct change, checking caller compatibility and invariants, tests, handling reachable failures, separating security follow-ups, and read-only REVIEW versus authorized implementation. Its output reports incomplete changes and checks.
- **REJECT** Reject mandatory test bootstrapping/line budgets, local non-use as deletion proof, automatic unrelated fixes, and narrowing the native review to supplied diff text only when trusted local evidence is available.

#### plan-checker · ADOPT

Claude `packages/core/agents/plan-checker.md` lines 11, 29–30, 45, 49, 52, 64, 72, 123, 154. Codex `packages/codex/skills/plan-checker/SKILL.md` lines 18. Tagged release note `CHANGELOG.md:44`.

- **ADOPT** Bind to caller's actual plan and goals, diagnose missing/ambiguous plan, unknown critical dimensions and changed/weakened prior criteria. Do not choose arbitrarily among several files.
- **KEEP** Keep native PASS/REVISE/BLOCK, prerequisite/test/doc work tied to requirements, already-done items checked against state, assumption/risk ownership and unresolved external versus local issues.
- **REJECT** Reject goal derivation from implementation items, automatically accepting a deleted blocker, example-specific priority/arithmetic or a hunt for unrelated plan files. Plan edits/retries belong to caller.

#### pre-deploy-validator · ADOPT

Claude `packages/core/agents/pre-deploy-validator.md` lines 16–18, 28, 30–31, 36, 39, 42, 71, 94, 104, 113, 120. Codex `packages/codex/skills/pre-deploy-validator/SKILL.md` lines 24, 26. Tagged release note `CHANGELOG.md:38`.

- **ADOPT** Inspect script lifecycle and no-fix modes, solution tsconfig leaf coverage, Go offline settings and tracked-lock Cargo behavior. Count Go package outcomes. Incomplete secret searches and unobserved outputs stay unverified.
- **KEEP** Keep original scanner exit, actual suite and build scope, CI/make configuration, isolated environment, non-deployed READY and native nine statuses. No findings from failed leading-dash grep.
- **REJECT** No blind container builds, portably assumed launcher, fail-token substring parsing, forced registry lookup or interpreting zero discovered tests as a pass.

#### reality-checker · ADOPT

Claude `packages/core/agents/reality-checker.md` lines 29, 31–33, 47, 53, 55, 61, 123, 126, 130–131. Codex `packages/codex/skills/reality-checker/SKILL.md` lines 18, 20. Tagged release note `CHANGELOG.md:47`.

- **ADOPT** Bind supplied results and local service evidence to the actual worktree and authorized listener. Timeouts, conflicting runs or missing evidence remain UNVERIFIED. Compare repository-root snapshots around meaningful checks.
- **KEEP** Retain the caller's scoped claim, mock/real boundary, independent evidence and read-only authority. A claim can be verified within a named limited scope.
- **REJECT** No unconditional repro, staging write or mandatory repeat of an unsafe or nonrepeatable check. A timestamp alone cannot identify the tested build.

#### scaffold-endpoint · ADOPT

Claude `packages/core/agents/scaffold-endpoint.md` lines 15–16, 30, 32, 42, 46–47, 51–52, 54, 58–59, 70, 75, 77, 80, 101–102, 107, 125, 130. Codex `packages/codex/skills/scaffold-endpoint/SKILL.md` lines 22, 24. Tagged release note `CHANGELOG.md:41`.

- **ADOPT** Bracket verification commands separately from intended writes, compare against baseline/callers, check route parameter normalization and precedence, distinguish build/test compilation and syntax-only results, and permit a sibling handler in its existing file.
- **KEEP** Keep real DI/route registration, scoped schema and down/forward ownership, validation/auth, prior failures and explicit BLOCKED/incomplete outcomes.
- **REJECT** No unconditional generated files, new tables, executing code generators or DSN-bearing builds solely to satisfy a template.

#### security-scanner · ADOPT

Claude `packages/core/agents/security-scanner.md` lines 17, 22, 36, 46, 81, 90, 101, 112–113, 146, 152, 212–213, 221, 233, 236, 238, 248, 293, 310, 323, 334, 337–338, 363, 373. Codex `packages/codex/skills/security-scanner/SKILL.md` lines 22, 80, 96. Tagged release note `CHANGELOG.md:49`.

- **ADOPT** Keep per-finding tags/nonzero severity summaries, safe local scanner preconditions and redacted output. Check yarnPath/lock/rules/metrics/advisory scope, Unicode context and actual permissions of third-party CI actions.
- **KEEP** Keep static triage, bound controls, contextual placeholders/secret output, prior issue ID, evidence for request binding, exposed raw queries and task-scoped threat coverage.
- **REJECT** Reject raw secret lines, automatic package-resolution/network scans, exploit reproduction or a fixed checklist/regex severity as proof of application risk.

#### silent-failure-hunter · ADOPT

Claude `packages/core/agents/silent-failure-hunter.md` lines 15, 29–31, 34, 64, 68, 70, 109, 113, 130, 136, 140, 147. Codex `packages/codex/skills/silent-failure-hunter/SKILL.md` lines 20. Tagged release note `CHANGELOG.md:26`.

- **ADOPT** Use trusted/local Go and isolated stdlib-only Python, avoid rustup installs, compare side effects, select relevant release lines and cite the drop site. Distinguish last shell operand and cancellation inheritance.
- **KEEP** Existing native guidance already handles allSettled input iteration failure, conditional errexit, process status and caller/recovery behavior. Review untracked/full-assigned context and retain actual category finding counts.
- **REJECT** No mandatory sample execution, external repro, blanket signal-preservation via retries or a made-up version fact when a local runtime is absent.

#### test-generator · ADOPT

Claude `packages/core/agents/test-generator.md` lines 15, 17–18, 25, 30, 32, 34, 36–39, 44, 56, 58, 60–61, 95, 99, 106–107, 131–132, 158. Codex `packages/codex/skills/test-generator/SKILL.md` lines 22, 24, 68, 72, 76–78. Tagged release note `CHANGELOG.md:42`.

- **ADOPT** Adopt generated/result/Execution contract, per-command content fingerprints, offline installed runner with npx argument delimiter, snapshot initialization guard, Go leaf/anchored selection, Rust in-file tests and explicit characterization scope.
- **KEEP** Retain actual product/fixture/setup distinction, meaningful independent oracle, relevant unrun cases and red regression tests. Preserve pre-existing failures, do not weaken a red test or silently call an uncollected case green.
- **REJECT** No automatic deletion of user changes after retry quota, global three-attempt requirement, mandatory second run for every safe deterministic test, or production edits merely to pass.

#### tree-generator · ADOPT

Claude `packages/core/agents/tree-generator.md` lines 11, 15–21, 25, 32–33, 36–38, 41–42, 44, 46, 50, 53, 56–72, 75, 79, 81, 83, 85–87, 89–90, 92, 94, 98, 103–104, 106–108, 110–113, 116, 121–122, 124–129, 131–134, 139–141, 147–150. Codex `packages/codex/skills/tree-generator/SKILL.md` lines 24. Tagged release note `CHANGELOG.md:61`.

- **ADOPT** Record depth/maintained generated marker, preserve actual tool output/unreadable subtrees, diagnose duplicate basenames and superseded scaffolds.
- **KEEP** Native already protects authored sections and dirty changes, handles symlinks/depth/sort/fallback/permissions accurately, avoids reading secrets, and distinguishes tracked revision from filesystem traversal.
- **REJECT** Reject imposing one docs path, depth cap, excluded hidden-file set or unsafe blanket overwrite from a header marker. The Superkit setup fallback is overview depth 3 / component depth 4 only when applicable and unspecified. Existing docs trees and selective inclusion follow the actual project contract.

#### ui-reviewer · ADOPT

Claude `packages/core/agents/ui-reviewer.md` lines 11, 20, 28, 32, 39–40, 42, 48, 50, 52–53, 73, 78, 81, 108, 116–117, 122, 127. Codex `packages/codex/skills/ui-reviewer/SKILL.md` lines 22, 103. Tagged release note `CHANGELOG.md:17`.

- **ADOPT** Use unrounded contrast, applied thresholds and exceptions, actual dialog modality, focus obstruction and alternatives to drag. Inspect additions and bind exercised evidence to the relevant build. Omit zero severity counts.
- **KEEP** Keep source/rendered/exercised hierarchy, i18n/media responsibilities, native core role, incomplete zero-finding scope, actual wrappers and unknown color conversion. Generic template TODOs are not applicable convention evidence.
- **REJECT** Reject copied calculation limited to one color syntax, mandatory frontend-ui aliases, automatic 44px AA target rule, or treating a screenshot as a keyboard test.

#### visual-reviewer · ADOPT

Claude `packages/core/agents/visual-reviewer.md` lines 16, 19, 25, 28, 35, 63, 69, 71, 78, 126. Codex `packages/codex/skills/visual-reviewer/SKILL.md` lines 24. Tagged release note `CHANGELOG.md:23`.

- **ADOPT** Use observed artifact/region for visible regression without inventing precise CSS pixel/hex/contrast values from screenshots. Compare other themes for literal/token values and guard all-N/A scoring and empty merge diffs.
- **KEEP** Keep 8 native categories, active target scope/asset identities, source-vs-rendered provenance, known context or NOT FOUND and caller-approved rubric arithmetic.
- **REJECT** Reject universal 100-point formula, screenshot-derived compliance, toolkit-specific color literals as severity defaults, or declaring clean from empty/truncated Git output.

### stack-agents

#### go-concurrency-reviewer · ADOPT

Claude `packages/stack-agents/go/go-concurrency-reviewer.md` lines 15, 26, 30, 48, 52, 62–63, 79, 84, 88, 115, 137, 140, 146. Codex `packages/codex/skills/go-concurrency-reviewer/SKILL.md` lines 22, 38, 111. Tagged release note `CHANGELOG.md:28`.

- **ADOPT** Scope Go effects to repository root, include ignored workspace sums, avoid downloads/rewrites and unsafe vet/gopls calls. Timer behavior follows the executable's main module/runtime settings and loop capture can depend on file build constraints.
- **KEEP** Keep cancellation and ownership checks, detached work lifetime, goroutine leak/user impact, actual alias and WaitGroup/Once/errgroup contracts, supported Go versions and independent evidence.
- **REJECT** Reject library-version-only timer rules, blanket ticker leak/severity, naming a correct slice-element address as an alias defect, assuming every target recognizes asynctimerchan, and the source's impossible version combination.

#### go-error-reviewer · ADOPT

Claude `packages/stack-agents/go/go-error-reviewer.md` lines 15, 32, 36, 49, 51, 73, 114–115, 138, 144, 150. Codex `packages/codex/skills/go-error-reviewer/SKILL.md` lines 22, 24, 111. Tagged release note `CHANGELOG.md:32`.

- **ADOPT** Apply Go workspace/side-effect safeguards, identify invalid errors.As targets that may panic, inspect qualified equality/inequality and dropped Wait errors. Clean vet cannot establish complete error handling.
- **KEEP** Keep error identity, wrapped/multi-errors, reference scope, best-effort cleanup, missing-source reporting and bounded specialist ownership; no insecure tool grants.
- **REJECT** Reject an analyzer-family result as every possible unchecked error, automatically running go vet -fix, shared-error/sentinel keyword guarantees and recursive dispatch.

#### go-modernizer · ADOPT

Claude `packages/stack-agents/go/go-modernizer.md` lines 13, 17, 24, 31–32, 37, 41, 60, 71, 83, 122, 160, 166. Codex `packages/codex/skills/go-modernizer/SKILL.md` lines 22, 24, 113. Tagged release note `CHANGELOG.md:31`.

- **ADOPT** Inspect file constraints, actual stdlib/compiler and diagnostic coverage. Include workspace fingerprints and ignored go.work.sum, prefer local help/source and skip unsupported analysis.
- **KEEP** Native already distinguishes compiler/language/library/CI bounds, build tags, genuine analyzer protocol, unapplied fixes, semantic impact and benchmark baseline changes. A compiler query verifies only its own available APIs.
- **REJECT** No universal minimum across all files or blind copy of version/feature examples, wake-up/lookup claims or a go fix applying invocation.

#### go-observability-reviewer · ADOPT

Claude `packages/stack-agents/go/go-observability-reviewer.md` lines 33, 46, 72, 79, 81, 118, 138, 143, 151, 153, 159. Codex `packages/codex/skills/go-observability-reviewer/SKILL.md` lines 22, 24, 123. Tagged release note `CHANGELOG.md:30`.

- **ADOPT** Inspect affected mux and middleware's actual status mapping, public/internal access, retry-to-202 example and unobserved external collector/scrape/alert boundary. Record ignored workspace sum before/after, source first.
- **KEEP** Keep COVERED/GAP/UNKNOWN/N/A/OUT-OF-SCOPE meaning, actual exported sinks, privacy-safe attributes, separate mux/default mux and health semantics.
- **REJECT** Reject equating expvar import with externally exposed pprof, a handler-level 5xx with lost status, or sending an unowned external collector test to audit-infra.

#### go-performance-reviewer · ADOPT

Claude `packages/stack-agents/go/go-performance-reviewer.md` lines 15, 20, 26, 51, 61, 74, 78, 83, 115, 137, 139, 141, 147, 149. Codex `packages/codex/skills/go-performance-reviewer/SKILL.md` lines 22, 32, 110. Tagged release note `CHANGELOG.md:29`.

- **ADOPT** Record Go workspace effects; first successful b.Loop resets the timer, so setup before the loop is excluded. A change between b.N and b.Loop can invalidate a baseline.
- **KEEP** Keep actual measurement provenance; privacy and ownership take precedence for cross-request pooled data. HTTP connection reuse/churn depends on protocol (HTTP/2 multiplexes); distinguish allocation, panic and OOM against input/limits.
- **REJECT** Do not import example nanoseconds, universal pool thresholds, unused vet/benchmark runs, or claim a static pattern proves runtime benefit.

#### go-reviewer · ADOPT

Claude `packages/stack-agents/go/go-reviewer.md` lines 15, 21, 33, 62, 64, 92, 102, 104, 108–109, 112, 139, 165, 184–185, 192. Codex `packages/codex/skills/go-reviewer/SKILL.md` lines 22, 24, 109. Tagged release note `CHANGELOG.md:54`.

- **ADOPT** Add conservative offline GO environment and workspace checks, correct gopls interface references versus other builds/function values, timer/loop ownership, map read/write races, context deadlines and best-effort error paths. Summary counts nonzero severities only.
- **KEEP** Keep selective source/reference loads, gopls build scope, existing and missing tests, generated omissions, intentional public routes, secret redaction, slice-copy traps and per-request goroutine lifecycle.
- **REJECT** Reject implicit downloads including gopls vuln lookup, syntax that cannot compile as a proposed runtime bug, universal timeout/ticker leaks, and claiming a routed specialist measured performance or generated a query plan.

#### py-reviewer · ADOPT

Claude `packages/stack-agents/python/py-reviewer.md` lines 25–26, 35, 53, 64, 66–68, 70–74, 100. Codex `packages/codex/skills/py-reviewer/SKILL.md` lines 22, 68, 104. Tagged release note `CHANGELOG.md:50`.

- **ADOPT** Use trusted isolated python3 -I -S -B for a necessary stdlib-only check, avoiding pydoc/dynamic imports of project packages. Distinguish Python 3.14 tarfile data default/overrides, lexical vs resolved paths, naive/aware equality, session sharing and validation bypass. Emit nonzero summary.
- **KEEP** Keep actual asyncio ownership (including gather/task groups), async commit, framework-level permissions, validated inputs, reachable failures, existing tests, runtime/venv source and archive/filter version evidence.
- **REJECT** Do not execute a repository .venv binary, infer library behavior from a signature or version alone, blanket-flag intentionally public routes/framework-managed defaults, or classify every extractall call identically.

#### rs-reviewer · ADOPT

Claude `packages/stack-agents/rust/rs-reviewer.md` lines 15, 25, 35, 53, 66–67, 71–72, 74–75, 104–105. Codex `packages/codex/skills/rs-reviewer/SKILL.md` lines 22, 98. Tagged release note `CHANGELOG.md:51`.

- **ADOPT** Read selected Cargo config/wrappers, known installed toolchain, no rustup auto-install, offline checks and tracked-lock condition. Distinguish shared/mutable RefCell overlap, edition-sensitive temporary lifetimes and Tokio handle detachment. Use nonzero summary.
- **KEEP** Keep ABI/version/panic semantics, lock ordering, check-then-act, guarded arithmetic conditions, actual std/crate source and meaningful SAFETY invariants. Nonexistent or unavailable rust-src stays a coverage gap.
- **REJECT** No unconditional extern C UB, every shift as overflow, blanket source-comment severities or treating rustc --version as necessarily non-installing.

#### ts-reviewer · ADOPT

Claude `packages/stack-agents/typescript/ts-reviewer.md` lines 15, 26, 35, 53, 55, 69–70, 74–76, 103–104, 125. Codex `packages/codex/skills/ts-reviewer/SKILL.md` lines 22, 90. Tagged release note `CHANGELOG.md:54`.

- **ADOPT** Account for effective compiler defaults omitted by showConfig, composite/declarationMap/emitDeclarationOnly failures, leaf scopes and real missing project imports versus missing packages. Check React/SSR behavior against its installed version. Emit nonzero counts.
- **KEEP** Keep no-emit/incremental safeguards, resolved declarations including platform packages, hydration/environment, scoped diff, missing declarations, accessibility wrappers/keyboard and actual error boundaries.
- **REJECT** Reject defaulting strict from an omitted key without version evidence, demoting all TS2307/7016 errors to setup, applying React/JSX behavior to every renderer or assuming check-only means write-free.

### frontend-3d

#### frontend-perf-reviewer · KEEP

Claude `packages/frontend-3d/agents/frontend-perf-reviewer.md` lines 6. Codex `packages/codex/skills/frontend-perf-reviewer/SKILL.md` lines 12, 20, 41, 53, 61, 70. Tagged release note `CHANGELOG.md:14`.

- **KEEP** Preserve the native performance domains, units, measurement provenance and explicit unmeasured claims. Claude body unchanged since 2cf6f27.
- **REJECT** The tools-only migration applies to Claude frontmatter.

#### presentation-reviewer · KEEP

Claude `packages/frontend-3d/agents/presentation-reviewer.md` lines 6. Codex `packages/codex/skills/presentation-reviewer/SKILL.md` lines 12, 20, 32, 55, 58. Tagged release note `CHANGELOG.md:14`.

- **KEEP** Preserve 16 presentation domains and rendered versus source evidence. Claude body unchanged since 2cf6f27.
- **REJECT** The tools-only migration applies to Claude frontmatter.

#### r3f-scene-reviewer · KEEP

Claude `packages/frontend-3d/agents/r3f-scene-reviewer.md` lines 6. Codex `packages/codex/skills/r3f-scene-reviewer/SKILL.md` lines 12, 20, 32, 54, 57. Tagged release note `CHANGELOG.md:14`.

- **KEEP** Preserve R3F/Three/Drei version, render-loop and resource ownership checks. Claude body unchanged since 2cf6f27.
- **REJECT** The tools-only migration applies to Claude frontmatter.

#### ui-design-reviewer · KEEP

Claude `packages/frontend-3d/agents/ui-design-reviewer.md` lines 6. Codex `packages/codex/skills/ui-design-reviewer/SKILL.md` lines 12, 20, 47, 55, 65, 68. Tagged release note `CHANGELOG.md:14`.

- **KEEP** Preserve the existing 16-check DOM/canvas design review and evidence requirements. Claude body unchanged since 2cf6f27.
- **REJECT** The tools-only migration applies to Claude frontmatter.

### frontend-ui

#### frontend-ui-color-reviewer · ADOPT

Claude `packages/frontend-ui/agents/ui-color-reviewer.md` lines 15, 23, 25, 29, 31, 34, 41, 43, 47, 84, 111. Codex `packages/codex/skills/frontend-ui-color-reviewer/SKILL.md` lines 20. Tagged release note `CHANGELOG.md:15`.

- **ADOPT** Compare unrounded ratios; truncate display. Resolve color-scheme/light-dark, actual cue/theme, alpha/gamut and evidence before measuring.
- **KEEP** Keep conditional WCAG version/level, text vs nontext exemption/size/threshold, hue-independent cues, strict provenance, contrast versus APCA and actual resolved token colors. Named colors, fills and different color functions all may affect a surface.
- **REJECT** No universal banned palette, hand-approximated inaccessible gamut, bundled node one-liner, or color-only heuristic as a conformance decision.

#### frontend-ui-design-critic · ADOPT

Claude `packages/frontend-ui/agents/ui-design-critic.md` lines 6. Codex `packages/codex/skills/frontend-ui-design-critic/SKILL.md` lines 87. Tagged release note `CHANGELOG.md:14`.

- **ADOPT** Adopt the cross-role nonzero finding-summary convention in its existing narrative field.
- **KEEP** Claude body unchanged since 2cf6f27. Preserve distinct narrative, evidence and exact distinct finding counts.
- **REJECT** Claude tools-only change does not grant Codex capabilities.

#### frontend-ui-interaction-reviewer · KEEP

Claude `packages/frontend-ui/agents/ui-interaction-reviewer.md` lines 6. Codex `packages/codex/skills/frontend-ui-interaction-reviewer/SKILL.md` lines 12, 20, 68, 74, 79. Tagged release note `CHANGELOG.md:14`.

- **KEEP** Claude body unchanged since 2cf6f27. Existing wrapper-first, keyboard/focus, actual control/state and recovery evidence retain the caller-native output and scope.
- **REJECT** Reject importing Claude tool metadata.

#### frontend-ui-motion-reviewer · ADOPT

Claude `packages/frontend-ui/agents/ui-motion-reviewer.md` lines 18, 20, 31, 33, 35, 37–38, 45–50, 53, 109. Codex `packages/codex/skills/frontend-ui-motion-reviewer/SKILL.md` lines 20. Tagged release note `CHANGELOG.md:21`.

- **ADOPT** Recognize implicit all transitions, Bézier overshoot, Tailwind reduced-motion variants, view-transition pseudo-elements, finite timers, continuous progress and input modality. Preserve escaped-pipe table cells and distinguish failed searches.
- **KEEP** Keep actual user-impact and WCAG applicability/auto-start conditions, open unknowns for unverified behavior, existing four questions, reasoned five-column table, full assigned scope and interruption evidence.
- **REJECT** Reject universal curve/keyboard/spinner duration bans, mandatory commands/regexes or aesthetic settings treated as runtime failures.

#### frontend-ui-reviewer · ADOPT

Claude `packages/frontend-ui/agents/ui-reviewer.md` lines 16, 32–33, 35, 42, 54, 59, 63, 66–67, 83, 88, 101–102, 106, 140, 174, 180, 182. Codex `packages/codex/skills/frontend-ui-reviewer/SKILL.md` lines 36, 38, 66–69, 71. Tagged release note `CHANGELOG.md:16`.

- **ADOPT** Return exact specialist names, statuses and bounded route rows. Parent dispatches once; reconcile returned reports/leads by evidence. Scope includes untracked and partially recovered patches. Unmeasured contrast remains UNVERIFIED.
- **KEEP** Keep separate core/umbrella ownership, evidence levels, route-by-actual-surface (including component/utility syntax), attributed motion Why/evidence, fallback tails and context for repeated card design.
- **REJECT** Do not count reflex keywords into CRITICAL, infer render/zoom outcomes from an isolated pattern, or copy Claude-specific agent-path probes or duplicate dispatch.

#### frontend-ui-typography-reviewer · ADOPT

Claude `packages/frontend-ui/agents/ui-typography-reviewer.md` lines 26, 30, 32, 36, 44, 46–47, 115. Codex `packages/codex/skills/frontend-ui-typography-reviewer/SKILL.md` lines 20. Tagged release note `CHANGELOG.md:20`.

- **ADOPT** Check zoom separately from default-font resizing, variable weights, preload credentials, both neighboring scale steps, undeclared faces and correct full-audit attribution.
- **KEEP** Keep actual font/shorthand/loader/query usage, established rules or context, supported scripts/loading and evidence needed for rendering. Incomplete search or proof remains explicit.
- **REJECT** No prescribed 1.25 ratio, generic default-family penalty, universal px violation or undocumented line-height rule.

### extras

#### bot-reviewer · KEEP

Claude `packages/extras/bot-reviewer.md` lines 11, 15–22, 26–30, 32, 36, 38, 40–52, 56, 58, 60–61, 64, 68, 70, 72, 74, 76, 78, 80, 82, 86, 88, 90–92, 94, 96–98, 100, 102–105, 107, 109–111, 113, 115–117, 119, 121–126, 130–132, 134, 141, 143–144, 147–148, 152–153, 156, 159, 162, 164–167, 169–172, 174–176, 178–179, 181–182, 187–190, 194–197. Codex `packages/codex/skills/bot-reviewer/SKILL.md` lines 12, 20, 36, 65. Tagged release note `CHANGELOG.md:56`.

- **KEEP** Keep the read-only 22-domain platform/ingress audit: Telegram callback bytes and missing universal deadline, distinct chat/group/bulk limits, Discord name versus component-ID limits, separate ack and follow-up lifecycle, Slack signature replay and retry ownership. Stale actions, deduplication, concurrent handlers, privacy, and user consequences have distinct checks.
- **REJECT** Do not freeze mutable rate limits, SDK-specific enforcement or initial-response/follow-up constants into universal verdicts. Use cited official docs for the selected platform/version; function names or access to a bot do not authorize sending.

#### design-system-reviewer · ADOPT

Claude `packages/extras/design-system-reviewer.md` lines 11, 15–21, 25, 29–33, 35, 37, 39, 41, 43, 45–48, 50, 54–61, 65, 67, 69, 71, 73–80, 82, 84–86, 90–92, 94, 98, 101–102, 106, 108, 110–111, 114–115, 117–119, 130, 132–135, 137–139, 141–142, 144–151, 155–156, 158, 164–167. Codex `packages/codex/skills/design-system-reviewer/SKILL.md` lines 22, 117. Tagged release note `CHANGELOG.md:55`.

- **ADOPT** Include resolved default themes and semantic, variant-specific token matches. Compare full-precision ratios, truncate display only; summarize nonzero finding severities.
- **KEEP** Keep TOKEN MAP/NO TOKEN SYSTEM DISCOVERED, eight domains, all relevant styling surfaces, exceptions, no arbitrary cutoffs, source/rendered/exercised distinctions and version-bound accessible measurements.
- **REJECT** Reject universal percentages, warning counts as automatic compliance grades, mandatory rewrites, style bans and inferred contrast without measured effective foreground/background.

#### red-blue-auditor · ADOPT

Claude `packages/extras/red-blue-auditor/agent.md` lines 11, 15, 63, 71–73, 75, 78, 80, 102, 104, 106, 108, 115, 151, 174–175, 180, 187, 200. Codex `packages/codex/skills/red-blue-auditor/SKILL.md` lines 22, 51, 62. Tagged release note `CHANGELOG.md:34`.

- **ADOPT** Identify optional Claude extra and actual scanner/pattern paths, 35 patterns, mode-dependent exits, redaction before intake and scanner side effects. Interpret hook decision JSON/event/error rules and configuration scope against installed version.
- **KEEP** Keep read-only defensive config inspection, trusted loaders and scoped capabilities, sanitized candidate evidence, independent control checks and missing coverage. Nested/imported instructions, output styles and actual launch settings are relevant when loaded.
- **REJECT** Do not assume standalone installs include the scanner, scan exit 2 is a verdict, text match proves severity, Unicode controls are all malicious, or project-level settings necessarily take effect. No running hooks/attack examples, live bypass, or offensive automation.

## Local role evidence

| Question | Check and observed result |
|---|---|
| What do the two hook implementations consume? | Claude's `packages/core/hooks/subagent-stop-validate.sh:59` looks for finding tags, then `:105–121` searches Generated/result and original Execution/exit. Both native generators emit the summary on the second line, although the Claude implementation searches the message. `bash packages/core/hooks/tests/subagent-stop-validate_test.sh` returned **28 passed, 0 failed**. Native `packages/codex/hooks/superkit.mjs:138` and `:168` handle PreToolUse/Stop Git safety and whitespace. The native development caller consumes generator evidence directly. |
| Are original source ownership and installer paths preserved? | `node --test test/codex-native-preservation.test.js` returned **3 passed**. `env GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 node --test test/red-blue-auditor.test.js` returned **9 passed**, including both installer cases, all pattern files, normal/critical-only exit codes and invalid args/paths. A first run inherited host Git signing; the seven scanner cases passed but test setup failed to create its temporary repository commit and cancelled two installer cases. Isolating Git global/system config for the temporary fixture resolved it. No signing setting was changed. |
| Does quiet ignore checking distinguish a negating rule? | Git 2.54.0, temporary core.excludesFile with `g10-probe-*` then `!g10-probe-kept`, tested one untracked path at a time using `git -c core.excludesFile=<fixture> check-ignore --no-index -q -- <path>`. Ignored/kept exits **0/1**, compared with verbose mode's **0/0**. |
| Does an offline clean report prove advisory coverage? | npm 11.17.0, isolated temporary package/lockfile with lodash 4.17.20, disposable cache, npm_config_offline=true, registry on unused loopback port. `npm audit --json` returned **exit 0, vulnerabilities.total 0**. Offline argv fixture with a locally installed executable and `npx --no -- g10-showargv --noEmit --flag` returned **exit 0** and exactly `["--noEmit","--flag"]`. Project scripts and network behavior were not exercised. |
| Can a workspace diagnostic update sums, and does b.Loop exclude setup? | Installed Go 1.26.4 source `src/cmd/go/internal/modload/init.go:1967–1972` writes go.work.sum in workspace mode. `src/testing/benchmark.go:414–434` resets timing on first entry and `:502` identifies the benchmark API. `src/time/sleep.go:16–39` and `src/time/tick.go:28–36` document the selected version's timer runtime switch and unreachable ticker collection. Go 1.27 runtime behavior is UNVERIFIED locally; native roles require checking the built executable and supported settings. |
| Does the Python tar assertion match local stdlib? | Homebrew Python 3.14.6 `tarfile.py:2404`, inspected using its installed interpreter with `-I -S -B`: absent an explicit filter, TarFile consults extraction_filter and defaults to data_filter if that is also None. The system Python 3.9.6 reported isolated=1, no_site=1 and dont_write_bytecode=True under those flags. `sqlite3 -safe :memory: 'select sqlite_version();'` returned **3.54.0**; no migration or repository SQL ran. |
| Does the contrast cutoff change the verdict? | Node 26.4.0 applied the sRGB luminance transfer function to (0,111,251) and white. `1.05 / (0.2126*r + 0.7152*g + 0.0722*b + 0.05)` produced **4.499888087779618**, `ratio >= 4.5` false, and truncation to three decimals **4.499**. This is an opaque sRGB pair, with no conclusion about a rendered component or composited theme. |
| How much did native role guidance grow? | For the 46 changed roles only, repository heuristic `node bin/measure-tokens.js <path>` went from **123,049** to **131,752** total (+8,703). The largest relative increase was test-generator (+504, 21.2%) for run accounting, snapshot and side-effect checks, and report/caller compatibility. This is a body-length estimate, not token billing. |

The tagged changelog and cited Claude hunks are source evidence for the remaining version-specific propositions, illustrative inputs and search examples. Only the checks above were independently exercised in the role pass. Rust runtime behavior, browser execution, installed TypeScript/React variants, Go 1.27, production DB/CI/provider behavior, current platform/API limits and all live model outcomes are UNVERIFIED here. Native review requires authoritative evidence for the actual target before a version-sensitive claim can become a finding.

## Command mirrors and supporting skills

Line numbers in the Claude column refer to the `v1.5.4` tag. Native references identify installed role files under `packages/codex/skills/<name>/SKILL.md`.

| Claude command | Disposition and native evidence |
|---|---|
| `packages/core/commands/dev.md:101,153,176,188,193,219,232,244` | **ADOPT** in `dev-orchestrator`, phases 2, 6, 8 and 10–14. Hand off task, inline plan, contract, prior verdict, changed files and expected-value source. Separate code fixes from missing evidence. Two plan retries, Standard/Complex budgets of two/three evaluation passes, one architecture restart, two critic retries. Phase 11 takes task outcomes and MUST criteria. Phase 12 covers ORM/SQL queries and API contracts and consumes each outstanding umbrella `route` once. Missing required specialist coverage or unconfirmed required docs prevents progression. **KEEP** native verdicts, ownership and evidence gates. **REJECT** advancing on exhausted mandatory evidence. |
| `packages/core/commands/review.md:62,64,68,69,93,146` | **ADOPT** schema, query, bot, component and actual API contract routing in `review-orchestrator` Steps 2–3. A goal review receives the matching plan, outcomes and all hunks. Keep its native Overall/goal evidence and verification gaps. **KEEP** target-bound PR SHAs, branch merge-base and explicitly selected worktree scope from Step 1. |
| `packages/core/commands/test.md:17,29,62,68` | **KEEP** directly resolved local runners. **ADOPT** the npm workspace form with a verified local executable, offline cache and argument separator, plus Cypress detection in `test-runner` Steps 1–2. **KEEP** missing/partial/all-skipped results distinct from green. See the npm fixture below. |
| `packages/core/commands/audit.md:73,91,128` | **ADOPT** contract-specific collection in `audit-orchestrator` Step 4. Only the three full domain audits reconcile twelve IDs and status totals. Security uses finding severities and coverage. A missing report or evidence stays unknown. Quote the backend no-target line and its search evidence, and preserve malformed reports. **KEEP** native UNKNOWN/N/A statuses, mandatory-coverage checks and unresolved prior findings. |
| `packages/core/commands/lint.md:43,86` | **KEEP** installed ESLint, TSC and formatter binaries in `lint-runner` Step 1. **ADOPT** offline workspace invocation with forwarded flags and explicit Go sum/ignored build-output checks. In check mode inspect configured targets before execution. |
| `packages/core/commands/workflow.md:41,65,69,75,78,87` | There is no standalone Codex command named workflow. **ADOPT** pre-change characterization and per-cause repair in `dev-orchestrator` Phases 7/10, symptom/failed attempts and a proposed repro in `debug-observer`, and prior findings with scope in `audit-orchestrator` Notes. **KEEP** the risk-ordered, scoped update proposal in `dependency-checker` and the separate build/test outcomes in `health-checker`. The installed hand-off is described in `packages/codex/INSTALL.md` under the command table. |
| `packages/core/commands/superkit-init.md:136` | There is no standalone Codex superkit-init. **ADOPT** the setup hand-off to `tree-generator` for a depth-3 overview and depth-4 component tree. **KEEP** explicit destination, depth override and native preview/write authority. An unavailable tree step is reported. |

All 66 names in `native-skills.txt` resolve. Besides the 53 agent-backed entries, the manifest contains nine commands and four supporting skills. Of the nine, the five direct mirrors above and `benchmark` changed. The latter uses the local Go toolchain even for version queries. `commit-helper`, `new-migration` and `migrate` have no changed command counterpart in this release. Of the four supporting skills, `go-benchmark` adopts Go 1.24 B.Loop timer and optimization semantics and corrects the interpretation of repeated samples and benchstat intervals. `impeccable-craft`, `html-to-3d-texture` and `postgresql-optimization` have no changed upstream skill in the comparison. Of the 17 other catalog entries, `writing-agents` is the applicable authoring guide: its Skill File Format section already uses native frontmatter. The corresponding Claude guide changed its tool field. **REJECT** copying that field. The source catalog remains 83, and the two native hook handlers are in one script. [Go benchmark loop](https://pkg.go.dev/testing#B.Loop) · [benchstat](https://pkg.go.dev/golang.org/x/perf/cmd/benchstat).

### Optional GAN package

These three additional native roles live at `packages/gan/skills/<role>/SKILL.md`, outside the 83-skill standalone catalog and the 53-role tally. Each Claude source changed. `git diff --numstat 2cf6f27 v1.5.4 -- packages/gan/agents` returned 114/127 inserted/deleted lines for evaluator, 107/109 for generator and 1/1 for planner.

| Role | Supplemental disposition and evidence |
|---|---|
| gan-planner | **KEEP.** The only source hunk (`packages/gan/agents/gan-planner.md:6`) renames the Claude tool field. Native rubric, revision/criteria IDs and retry budget are already explicit in its SKILL.md:36,58,82,99. |
| gan-generator | **KEEP.** Compared the changed generator and hand-off against native SKILL.md:16–37,47–65. The approved plan binds the rubric, per-scenario tests, permitted scope, expected outcomes and budgets. A local result carries exact command, counts, failed assumptions and pending checks. No Claude path or runtime tool is required by the existing native contract. |
| gan-evaluator | **KEEP.** Compared the changed evaluator and verdicts against native SKILL.md:14–26,40–52. The evaluator verifies the bound rubric, executes required tests, reconciles skips/retries and reports incomplete evidence. Retain the approved-rubric requirement. **REJECT** silently falling back to both rubrics when the plan is missing. |

### Hooks, conversion and local fixtures

- `packages/codex/hooks.json:4,17` registers PreToolUse and Stop. `packages/codex/hooks/superkit.mjs:138,168` checks destructive Git command forms and tracked diff hygiene. Neither handler parses a subagent transcript. Codex callers use role reports. The separate Claude SubagentStop advisory reads finding tags, acknowledgements and generated-test reports at `packages/core/hooks/subagent-stop-validate.sh:58–122`.
- Fed both role names and synthetic reports to that actual hook via JSON on stdin (`hook_event_name=SubagentStop`, `agent_type`, `last_assistant_message`). Each report had a title, line 2 `Generated 2 tests in 1 file — Result: …` and the stated execution line. For both generators the output was **PASS/exit 0 quiet, FAIL/exit 1 quiet, NOT RUN warns, PASS without exit warns**. A code-reviewer report with `No findings` was quiet. An open `[CRITICAL/HIGH]` finding warned. An indented `Status: FIXED` under that finding cleared the advisory. All hook invocations returned 0 as designed. These are parser fixtures, not generated model output.
- For side effects, initialized a disposable repository with one committed file and ignored `out/`. Created dirty `tracked`, an untracked nested name containing a space/newline, and an existing ignored `out/cache`. Rewrote each without changing its Git status. The root fingerprint from `packages/codex/AGENTS.md` (NUL-delimited status, index entries, changed/untracked path types, modes, contents and explicitly watched ignored output) detected **3/3** changes. Status alone was identical in all three cases. This fixture covers write detection; it cannot prevent writes.
- Offline npm fixture used an empty cache, an installed local stub and no registry access. `npm_config_offline=true npx --no -- g10-runner --runner-option 'hello world'` → exit 0, `["--runner-option","hello world"]`. A missing runner returned exit 1 and created no executable. The local Go contract accounts for GOPRIVATE/GONOPROXY direct fetches as well as automatic toolchain selection. [Go private module resolution](https://go.dev/ref/mod#private-modules).
- `rg -N '^[^#[:space:]]' packages/extras/red-blue-auditor/patterns | wc -l` → **35**. Source at `lib/installer.js:338–359` puts the optional Claude helper and patterns under `.claude/scripts/red-blue-auditor/`. In normal mode 1 means a match. In critical-only mode 2 means a critical match and 0 can include noncritical matches. Exit 3 means missing pattern directory and 4 invalid arguments/target (`scan.sh:26–46,151–166`). The native skill and INSTALL document the separate optional helper and scope of the result. Actual parser/CLI/installation coverage is in `test/red-blue-auditor.test.js:58–146`.
- `tools/convert-agents-to-codex-skills.sh:75–76` strips both Claude tool keys. `test/codex-native-preservation.test.js:110,147–169` converts a fixture privately and asserts no leaked key while preserving native owners. Parsed the YAML header region of **83/83** ordinary skills: **0** Claude tool fields. The converter did not regenerate the product sources.
- The local model catalog (`~/.codex/models_cache.json`, fetched `2026-11-18T12:13:11.956756Z`, catalog client `0.169.0`) returned slug `gpt-6.2-astra`, visibility `list`, with `high` and `xhigh` in supported reasoning levels. CLI: `0.169.0-alpha.11.1`. Updated the **model ID in the new-install template**; coordinator effort stays high and Sol worker fallback stays medium. An isolated consumer install through `bash /path/to/setup.sh --codex-only` returned 83 discoverable skills and the new model. After substituting a custom config and rerunning setup the bytes matched the custom file. The fixture establishes install/preservation behavior and does not attest every user's model access.
- README alt text, badge visible/accessibility text (XML-parsed), both CLAUDE.md descriptions, package metadata and the Codex documents use **Codex agent refresh by GPT-6.2 Astra (xhigh)**. GitHub About text for the owner:

  > Production-tested agents (56), commands (16), hooks (42), skills (22), and rules (19) for Claude Code; 83 skills and 2 native hook handlers for Codex. Claude agents written by Opus 5.5, reviewed and corrected by Fable 5.2 (xhigh); Codex agent refresh by GPT-6.2 Astra (xhigh).

## Signed delivery and pre-commit verification

The branch `codex/astra-native-hardening` started at `a4414e8`. Its existing tip was an ancestor of the remote main verified by `git ls-remote origin refs/heads/main` as `babb37dfd21dd42e2ea231f7f7cab7a005c6b409`. `git merge --ff-only origin/main` printed `Updating a4414e8..babb37d` and `Fast-forward`; no separate merge commit was needed.

| Signed changeset | Codex subset | Full npm suite | Mirror invariants | Counts | Whitespace (unstaged / staged) |
|---|---:|---:|---:|---:|---:|
| `0ade50a` · model ID, template and attribution | 103/103 | 142/142 | 79/79 | exit 0 | 0 / 0 |
| `f7d4096` · role and command integration | 103/103 | 142/142 | 79/79 | exit 0 | 0 / 0 |
| `docs(evidence)` · G10 and Claude crosscheck | 103/103 | 142/142 | 79/79 | exit 0 | 0 / 0 |

Final summary lines were the same across the accepted runs (timings omitted). The Codex subset is included in the full suite.

```text
$ node --test test/codex-*.test.js
ℹ tests 103
ℹ suites 8
ℹ pass 103
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0

$ GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=commit.gpgsign GIT_CONFIG_VALUE_0=false npm test
ℹ tests 142
ℹ suites 16
ℹ pass 142
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0

$ bash packages/core/hooks/tests/mirror-invariants_test.sh
ALL MIRROR-INVARIANTS TESTS PASSED (79/79)

$ bash bin/superkit-counts-verify.sh
[no output, exit 0]
$ git diff --check
[no output, exit 0]
$ git diff --cached --check
[no output, exit 0]
```

The first plain Codex-subset attempt returned 94 passes and nine failures because its temporary Git commits lacked access to the SSH signer. After `ssh-add --apple-load-keychain`, the plain suite ran with SSH-agent access. The full npm suite received the owner-specified per-process fixture override. Delivery commits used `git commit -S`; `git verify-commit` returned a good ED25519 Git signature for each product commit. During integration the mirror check exposed a missing `inspect.signature` reference in the Python reviewer. The correction limits it to already trusted stdlib objects and distinguishes call shape from behavior.

Independent source review of the integrated changes found two caller/guide errors. Corrected the twelve-domain requirement to apply only to the three domain auditors and corrected the benchmark checklist for valid B.Loop benchmarks. The command contract review also qualified partial/skipped suites and disabled configured linter auto-fixes in check mode. All 53 changed SKILL.md files match the repository token metadata formula. The second changeset contains 46 agent-backed roles and seven command/support skills. The release version remains 1.5.4. GitHub About text is supplied above for owner publication.
