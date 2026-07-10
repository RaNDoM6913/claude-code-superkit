# Changelog

All notable changes to claude-code-superkit are documented here.

## [Unreleased]

## [1.5.2] — 2026-07-10

**The auto-sync integrity release.** Five defects found by dogfooding the kit in a real
production consumer flowed back and got fixed with tests: the updater no longer silently
clobbers consumer customizations (pristine-check against released tags + a SessionStart
report + self-bootstrap), repo-only files can no longer leak (one INTERNAL-FILES manifest,
now with per-category fallback), and the two commit-gate hooks stop false-positiving on
their own commit messages. Plus the statusline visual upgrade (heat bars, model+effort,
real rate-limit meters). Headline counts unchanged; no breaking changes.

- **Fix (updater manifest fallback — per category):** `superkit-update.sh`'s INTERNAL-FILES fallback engaged only when BOTH categories were empty, so a manifest that lost just its `rules/` line would silently ship `superkit-integrity.md` into every consumer — the exact D2 leak the manifest exists to prevent, reachable through a one-line typo. Each category now falls back independently; an empty category in an existing manifest warns on stderr, a missing manifest stays silent (pre-manifest clones). Proven failing-first (h1/h2 leaked before the fix); 31-case updater suite, 15/15 suites green.
- **Statusline (visual upgrade — bars, model, effort, ULTRA, real limits):** `helpers/statusline.cjs` now renders the context as a 10-cell heat bar (`ctx ██████░░░░ 62%`, percent-only to stay narrow; green→yellow at 50→red at 80) instead of bare `ctx:NN%`; shows the **current model** (cyan) and **effort** (bold, heat-graded: high=green, xhigh=yellow, max=red) with a bright-magenta `⟁ULTRA` badge while the session's `/effort` is set to ultracode (detected from the transcript's command echo — same single tail-scan as the ctx fallback); adds **real 5h/weekly rate-limit bars** read from the CLI's own `rate_limits` payload (the same data `/usage` shows; epoch and ISO `resets_at` both handled; absent on API-key billing → segments silently skipped — no invented denominators); and renders the active task from `.task-state.json` in bright white (Claude Code paints uncoloured statusline text in its own muted gray — an explicit colour is required for readability); the git branch gets the same bright treatment; set `CLAUDE_STATUSLINE_THEME=light` on light terminals to flip both to black. All additions fail-open; older CLIs simply show fewer segments. Technique for the rate-limit bars verified from inbrace-tech/tokenline (supply chain CLEAN — it only reads the statusLine stdin payload).
- **Fix (auto-sync integrity — 5 defects found by dogfooding in a real consumer project):** `superkit-update.sh` no longer blind-clobbers customized consumer files — a file is overwritten only when its content matches a released tag's blob (`v<installed>` + last 5 tags); no match or any uncertainty → **preserved and reported** at SessionStart (`N synced · M preserved · K skipped (internal)`), with a self-bootstrap `exec` so the fixed updater applies before its first sync, and coverage extended to `stack-rules/`, stack `references/` and `hooks/lib/` (19→22-case fixture suite; dry-run against a copy of the consumer: 102 synced, all 7 known customizations preserved). Repo-only files (`superkit-counts-verify.sh`, `verify-hooks.sh`, `superkit-integrity.md`) can no longer leak: one shared `packages/core/INTERNAL-FILES` manifest now feeds the installer, the counts hook and the updater (enforced by `internal-manifest_test.sh`). `dev-required-on-commit.sh` no longer blocks its own exempt commits — the exempt-only short-circuit runs before the override branch, and override tags must OPEN a message line (prose mentioning `[no-dev:…]` is not an override; `-m`/`--message`/`--message=` payload extraction; counter semantics preserved; 18 cases). `block-dangerous-git.sh` no longer matches its own commit messages — `-m`/`--message`/heredoc payloads are stripped before the guards run while chained real commands still block (38 cases + 11 adversarial orchestrator checks). The ADR template now actually installs (unconditional, idempotent, project-root `docs-templates/adr-template.md`; updater creates it when missing, never overwrites; `/dev`'s nudge degrades silently when absent). `v1.5.1` tag created locally as the pristine-check baseline.

## [1.5.1] — 2026-07-10

**The upstream-adoption & quality-compactness release.** The best of three public kits —
samber/cc-skills-golang v1.7/1.8, everything-claude-code v2.0, and DietrichGebert/ponytail
v4.8.4 — mined by multi-agent recon, with **every claim re-verified against the real shipped
files and a real Go 1.26.4 toolchain** before it landed (nothing adopted on the strength of an
upstream README). It fixes **4 defects users hit today** — the superseded `synctest.Run` API,
fx's blocking-`OnStart` example, the `tool`-directive contradiction with go-modernizer, and the
force-push hook that blocked the exact `--force-with-lease` command it recommends — grows the Go
knowledge docs **29 → 34**, extends the **Evidence Gate to external symbols on all six stack
reviewers**, and lands the **Solution Ladder** in the always-on rules with its safety
counterweight in the same breath (minimal never means fragile). Claude↔Codex parity is now
**machine-enforced** by a 79-pin mirror-invariants suite instead of a human checklist. Headline
component counts unchanged; no breaking changes. Every card applied by Opus and verified by
**Claude Fable 5**.

- **Docs (pre-tag verification sweep, 2 auditors):** the `fast` hook-profile description was wrong in five docs and now matches `profile.sh` everywhere — fast runs the critical-safety allowlist (`block-dangerous-git`, `security-patterns`, `audit-settings-source`, `doc-check-on-commit`), NOT console-log-warning/context-monitor as previously claimed (notably: the doc-check commit gate blocks even in fast); guide-09's profile table gained the three missing always-on rows and corrected pre-compact-save/session-context-restore cells. Codex INSTALL's security-scanner cell said "47 checks" (matches nothing) → "OWASP top-10 + 18 generic checks" per the actual mirror. Guide-07 now documents all SEVEN core rules (frontend-aesthetics was missing) with real line counts; guide-05's teaching snippet uses a token-anchored force regex (the naive form would re-teach the exact bug this release fixes); installer docs list all 6 stacks and mark red-blue-auditor flag-only; Codex AGENTS.md's doc map is now marked as the showcase ADAPT example (parity with documentation.md's v1.5.0 cleanup); brittle "37 non-internal hooks" count dropped; ponytail star-count flex trimmed from What's New.
- **Fix (hygiene, found by full verification sweep):** two Codex SKILL.md files (`dev-orchestrator`, `impeccable-craft`) had unquoted `: ` inside `description:` — strict YAML parsers rejected the frontmatter; descriptions now quoted. CLAUDE.md structure tree no longer hardcodes a stale version next to `VERSION` (points to package.json sync instead). Full matrix otherwise green: 28/28 npm tests incl. fresh-install smoke, 13/13 hook suites, counts-verify, 210-file frontmatter scan, statusline + git-hook functional spots, zero stale count/phase references.
- **Quality-compactness package (ponytail adoption, batch 7a):** `coding-style.md` (alwaysApply) gained the **Solution Ladder** — before writing new code stop at the first rung: not-needed (YAGNI) → reuse-in-codebase → stdlib → native platform feature (`<input type="date">` over a picker lib, CSS over JS, DB constraint over app code) → installed dependency; a NEW dependency is the last resort — plus the deliberate-simplification comment convention (name the ceiling + upgrade trigger) and the safety counterweight in the same breath (validation/error-handling/security/a11y and anything explicitly requested are never simplified away). Search First is now evidence-shaped (name the precedent file:line or state none found), and a canonical **YAGNI Anti-Patterns** list (abstraction-with-one-implementation, config-nobody-sets, scaffolding-for-later, no-op wrapper, dead flag) becomes the single source of truth — `minimal-change-engineer` (new `stdlib:`/`native:` creep categories + ladder step in IMPLEMENT) and `ai-slop-cleaner` now point at it. `/dev` Phase 7 walks the ladder explicitly; Codex `AGENTS.md` mirrors the ladder verbatim. Adopted from the verified core of DietrichGebert/ponytail (craftsmanship A−, supply chain CLEAN — see recon brief) at ~1/15th of its standing token cost; frontend absolute-ban home deliberately rejected (native-first cannot be an absolute ban).
- **Reviewers (external-symbol Evidence Gate → all stacks, batch 7b):** the go-only external-symbol clause from batch 2 now covers **ts-reviewer / py-reviewer / rs-reviewer** (+ their 3 Codex mirrors) with offline-safe, per-language verification recipes: TS — read the installed `.d.ts`/`package.json` types under `node_modules/` (the types on disk ARE the contract); Python — `inspect.signature` / `pydoc` against the project env; Rust — crate source in the local cargo registry or `cargo doc --no-deps`. Cannot resolve locally → ASSUMED, never asserted from memory; Output Contract VERIFIED/ASSUMED lines route it.
- **Tests (mirror-drift enforcement, batch 7c):** new `tests/mirror-invariants_test.sh` (idea adapted from ponytail's CI rule-copy checker) — 79 assertions pinning invariant substrings on BOTH sides of the 6 Claude↔Codex reviewer pairs (external-symbol clauses per language), severity enums across all 12 reviewer surfaces, the Solution-Ladder mirror (coding-style ↔ Codex AGENTS.md), and the Go-reference count in CLAUDE.md against the actual file count (previously manual). Registered in run-all.sh — 13/13 suites green; mirror drift now fails the suite instead of waiting for a human checklist.
- **Fix (hooks — force-push guard, upstream-adoption batch G, owner-authorized):** `block-dangerous-git.sh` no longer blocks the exact command it recommends — the force-push check is now token-aware, so `git push --force-with-lease[=branch]` / `--force-if-includes` PASS while bare `--force`/`-f` still block, and refspec-force (`git push origin +main`, `+refs/...`) is now caught (it previously slipped through free). New working-tree-discard gate: `git checkout .`/`--`/`-f`, `git clean -f*`, `git switch --discard-changes/-C` each block with a stash-first / dry-run alternative, while `checkout <branch>`/`-b`, `switch <branch>`/`-c`, `clean -n`, `restore` pass untouched. Ships with a 26-case regression suite (`tests/block-dangerous-git_test.sh`) registered in run-all.sh — 12/12 suites green. The showcase copy intentionally still carries the old behavior (showcase-untouched constraint); rm-rf/quote-strip hardening deliberately deferred (C11). **security-scanner:** the CHECK-19..25 applicability gate no longer hides secret scanning from repos with a standalone `.mcp.json`/`.kiro/settings/mcp.json` but no `.claude/` dir (completes the batch-4 CHECK-19 broadening).
- **Statusline (context fallback, upstream-adoption batch 6):** `helpers/statusline.cjs` no longer renders a blank ctx segment on CLIs that don't pass native `context_window` — it now falls back to summing the latest usage record (input + cache_read + cache_creation tokens) from the transcript's trailing 256KB, and resolves the window via `CLAUDE_CONTEXT_TOKENS_MAX` env → `[1m]` model marker → >200k heuristic → 200k default (the flat-1M mis-scaling on 200k sessions is gone from the fallback path). Native path byte-identical; fully fail-open (missing/corrupt transcript → empty segment, never a crash); verified against a 12-case smoke matrix incl. HEAD-equivalence on the native path. The upstream compact-nag hook was deliberately NOT ported.
- **Go stack + core (upstream-adoption batch 5 — 32→34 knowledge docs, ADR template):** (1) `rest-openapi-patterns.md` — the missing third Go API surface (gRPC and GraphQL refs existed, REST didn't): swag v1 code-first as primary (v2 explicitly marked RC/preview) vs oapi-codegen spec-first, the annotation cheatsheet with the three lying-spec traps (primitive body @Param, blank-import `_ "yourmodule/docs"`, stale docs/ + CI freshness gate), per-router UI wiring, @securityDefinitions/@Security discipline, `swaggerignore:"true"` on secrets, and a 5-item graded go-reviewer checklist (Swagger UI ungated in prod = CRITICAL); security-checklist.md gained the matching API-Documentation-Exposure cross-ref. (2) `troubleshooting.md` — the missing live-triage path: symptom→first-move table, Golden Rules / Red Flags debugging discipline, Delve basics, GODEBUG schedtrace/gctrace (with how to read a sample line), goroutine-dump-for-hangs (`?debug=2`, `kill -QUIT`), safe production pprof (auth-gate + capture-before-restart), `-race -count=100` flaky recipe, httputil wire dumps (strip auth first); cross-linked from go-concurrency-reviewer, upstream orchestration language stripped. (3) **ADR template** — `docs-templates/adr-template.md` (lean Nygard: Context / Decision / Alternatives-with-rejection-rationale / Consequences / Status, with the trivial-choice exclusion so it never becomes ceremony); /dev Phase 2 Architect gained a one-sentence opt-in nudge (the rejected alternatives it already produces stop being thrown away), /superkit-init now OFFERS (never forces) seeding docs/adr/.
- **Quick wins (upstream-adoption batch 4 — 8 small quality edits):** `code-style.md` gained a **Doc-Comment Quality** rubric (6 anti-patterns: paraphrase, signature restatement, marketing vocabulary, invented rationale, groundless future claims, hollow filler + 4 writing principles) so go-reviewer flags hollow comments, not just missing ones; the **modality-preservation principle** ("must/should/may are different obligations — a cleaner sentence that changes obligations is wrong") landed in `documentation.md` as an Editing-integrity block; `security-scanner.md` got a `**Requires:** govulncheck` transparency line and CHECK-19 now sweeps standalone `.mcp.json`/`.kiro/settings/mcp.json` with `github_pat_`/`AIza`/`xox` prefixes (folded — still 31 checks); `reality-checker.md` Evidence Requirements gained a background-job/async row (dispatch a no-op job, run one worker, show the side effect); `go-safety.md` rule gained Linter Suppression (`//nolint` must name the linter + justify; suppressed security linter = CRITICAL); `benchmark-methodology.md` now states variant passes run SERIALLY (concurrent capture = contention, not code) inline + as a pitfalls row; `testing-patterns.md` names `go test -race -shuffle=on ./...` canonical for CI; `docs/recommendations.md` MCP list reframed as **MCP hygiene** (two-part test: universally useful AND needs a stateful session; per-turn schema-token + attack-surface cost; rationale + pinned version — no bare @latest; the 5 rows kept but judged honestly) with a matching one-paragraph caveat in Codex INSTALL.md.
- **Go stack (three new references, upstream-adoption batch 3 — 29→32 knowledge docs):** (1) `refactoring-mechanics.md` — behavior-preserving transforms: the 8-rung tool-escalation ladder (gopls code actions → `gofmt -r` → `eg` → `gopatch` → go/analysis+SuggestedFixes → `go fix`/`//go:fix inline` (1.26+, `-fixtool` verified) → dave/dst → `deadcode -whylive`) with per-rung gotchas and the never-sed/perl rule, a smell→fix→tool→risk catalog cross-linking design-patterns.md, alias-moves/Sprout/Wrap, and the rename→struct-tag/reflect/template desync rule; testing-patterns.md gained the companion **Coverage-Adaptive Refactoring Safety Net** (per-function ≥80/40-80/<40 tiers, characterization-vs-golden-files distinction, object seams, `-coverpkg` diagnostic + statement≠branch and silent-no-_test.go caveats); wired into go-modernizer Phase 0/Phase 3 and go-reviewer. (2) `cli-cobra-viper.md` — the missing Go CLI surface: decision ladder (flag→cobra→cobra+viper, urfave honesty note), root hygiene (SilenceUsage/Errors, exit-code table, stdout-vs-stderr, NotifyContext), the five Run* hooks in order + child-PersistentPreRunE-replaces-parent trap (incl. `EnableTraverseRunHooks`), RunE-over-Run, Args validators, and the viper env-trio silent failure (`SetEnvPrefix`+`SetEnvKeyReplacer`+`AutomaticEnv`) with WRONG/CORRECT pair + merged severity-graded mistakes table; conditionally loaded by go-reviewer on spf13 imports. (3) `gopls-driving.md` — **opt-in** gopls MCP semantic navigation (requires `claude mcp add gopls -- gopls mcp`, inert otherwise): the 8 go_* tools with signatures, blast-radius-before-edit workflow, mandatory post-edit go_diagnostics, static-dispatch/disk-only/build-config caveats; the 3 Go reviewers gained `mcp__gopls` in allowed-tools + a conditional never-assume-wired protocol (gopls output = valid VERIFIED citation), /dev Phase 12 a gated Go-path line, Codex AGENTS.md a registration-honest note. No headline counts changed (references aren't counted components); Codex mirror for the CLI ref deliberately deferred.
- **Go reviewers (Evidence Gate → external symbols, upstream-adoption batch 2):** the Evidence Gate in go-reviewer / go-error-reviewer / go-concurrency-reviewer (+ their 3 Codex SKILL.md mirrors) now covers symbols NOT defined in the reviewed code: a finding hinging on a stdlib/third-party symbol's signature or contract must be verified with stdlib `go doc <pkg> [<Symbol>]` (its output counts as the citation) or labeled ASSUMED — never asserted from memory. Conditional clause, not a blanket 5th gate; zero new dependencies (the upstream godig binary/MCP deliberately rejected). Output Contract VERIFIED/ASSUMED lines route go-doc-confirmed vs unconfirmed external facts. **/workflow discipline:** `bugfix` is now red-first (Triage writes the failing repro test; Fix's Done-when requires it to pass green; Test no longer re-adds the test) and `refactor` gained a leading **Baseline** step (affected suite green before any change; thin coverage → characterization tests first). Filled example synced; hotfix's deliberate 'if quick' hedge untouched.
- **Go refs (1.25/1.26 currency refresh, upstream-adoption batch 1a):** the currency docs no longer stop at 1.24 — `stay-updated.md` gained `### 1.25` / `### 1.26` blocks and `modernize-guide.md` gained matching feature-matrix subsections + two migration-table rows, every signature verified against a real Go 1.26.4 `go doc` (notably `errors.AsType[E error]` — the *error* constraint, not the rumored `[E any]`). New API teaching: `wg.Go` (sync-primitives.md, pinned 1.25, panics/cancellation steered to errgroup), `errors.AsType` subsection + migration row (error-inspection.md), `runtime.AddCleanup` backfilled into the 1.24 matrix, container-aware GOMAXPROCS (automaxprocs now redundant), `reflect.TypeAssert`, Green Tea GC (1.25 experimental → 1.26 default), `ReverseProxy.Rewrite` over deprecated Director, one cautious json/v2 line. `module-management.md` now teaches Go 1.24 `tool` directives (fixing its contradiction with go-modernizer) with a pinned govulncheck default; `standard-stdlib-now.md` Crypto gained stdlib `crypto/pbkdf2` (returns an error!)/`hkdf`/`sha3`; `samber-libraries.md` notes stdlib `slog.NewMultiHandler` for plain fan-out. Codex parity: one-line `errors.AsType` / `wg.Go` mirrors in go-error-reviewer + go-concurrency-reviewer SKILL.md.
- **Go refs (os.Root security stream, upstream-adoption batch 1b):** `security-checklist.md` path-traversal defense no longer rests on `filepath.Base` alone — new 'os.Root scoped file access (Go 1.24+)' block leads with `os.OpenRoot` confinement, gives the `filepath.IsLocal`+`filepath.Rel` lexical fallback for <1.24 (explicitly flagged symlink-blind), and states both negatives: Clean+HasPrefix is NOT robust confinement; os.Root is NOT a full sandbox (bind mounts, /proc, device files). Also: stdlib CSRF via `http.CrossOriginProtection` (1.25+) in Web Security, bcrypt 72-byte cap returns `ErrPasswordTooLong` (handle it — no silent-truncate guard), stdlib-KDF note.
- **Fix (Go refs — shipped-defect sweep, upstream-adoption batch 0):** `testing-patterns.md` + `modernize-guide.md` no longer teach the superseded `synctest.Run` — migrated to the Go 1.25+ stable `synctest.Test(t, func(t *testing.T))` signature (go-doc-verified on 1.26.4) with a 1.24-experimental/1.25-stable caveat in both files. `di-frameworks.md` fx example no longer models the blocking-OnStart anti-pattern fx itself warns against (accept loop moved to a goroutine, OnStop honors ctx/StopTimeout); fx/wire sections gained review notes (descendant-scoped decorators, 15s lifecycle timeouts, `fx.New(...).Err()` CI graph validation; wire cleanup reverse-chaining + nil-guard, missing `wire.Bind` = compile break); google/wire's Aug 25 2025 archival now flagged in the section, the recommendation table, and `stay-updated.md`.
- **Docs (README restructure):** the README is now a funnel instead of a reference dump (502 → 367 lines): hero → Fable story → the `/dev` SVG moved up as the centerpiece → a slimmed What's Inside table (name enumerations moved to a "Full component list" collapsible; also fixed a phantom `writing-skills` mention — the kit ships 3 writing-* skills) → What's New → install → 9 flagship commands (full list in guide ch.1) → security → two compact frontend-package pitches (−65 lines; full references stay in docs/FRONTEND-*.md) → one "Documentation, Showcase & Ecosystem" region (the guide-chapters collapsible no longer nests under Showcase). The 65-line Ecosystem mini-list moved wholesale into `docs/recommendations.md`; the 4-cell hero table trades the weak SkillsMP cell for the GAN adversarial loop; standalone Troubleshooting section folded into links. All counts-verify contracts intact (row labels, badge, Codex "82 skills").
- **Docs (README):** added the "🧬 Hardened by a Stronger Model" story — the v1.5.0 rework was authored and adversarially verified by **Claude Fable 5** (Anthropic's Mythos-class tier above Opus), with the failure-mode → countermeasure table; new `prompts hardened by Claude Fable 5` badge; tagline and What's New lead updated accordingly. What's New trimmed to the current release only — older release summaries replaced by a "Previous releases" links line (history lives in CHANGELOG + GitHub Releases). GitHub About extended with the Fable mention (format spec in CLAUDE.md synced).

## [1.5.0] — 2026-07-04

**The Opus 4.8 reliability rework.** Every prompt surface of the kit — 56 agents, 16 commands,
22 skills, 20 rules (117 files) — was audited against a failure-mode playbook for weaker
executors and rebuilt: Hard Rules at the top + Recap at the bottom (lost-in-the-middle guard),
exact fenced Output Contracts with filled examples, Evidence Gates for reviewers / Done-gates
for generators, one canonical severity+confidence vocabulary with LOW routed to Open Questions
(never dropped), linear numbering everywhere (incl. `/dev` renumbered to phases 0–15 matching
the dev-flow SVGs), ripgrep-safe greps, and real-API honesty (invented flags and stdlib calls
removed). Every rewrite was adversarially verified by an independent model instance —
~200 subagents, 0 unresolved escalations — then a kit-wide consistency sweep came back clean.
Counts unchanged; no breaking changes. Codex mirrors beyond the /dev trio + GAN are scheduled
for the next release.

- **Fix (hooks + wiring coherence, pre-release):** `subagent-stop-validate.sh` no longer validates ghost agents — `playwright-test-generator` → `e2e-test-generator` (its generated-but-not-run guard now actually fires) and the nonexistent `audit-security` dropped; the security branch now matches the severity token `CRITICAL` only, so confidence "HIGH" in the new `[WARNING/HIGH]` finding format no longer false-triggers the do-not-merge warning (all 11 hook test suites pass). **/security-scan auto-triggers realigned to capability** in auto-commands.md: the command audits `.claude/` configuration, so its triggers now fire on config/MCP/install events — application-code security (auth files, new deps, CI/CD) is explicitly routed to the **security-scanner** agent via /review and /dev. **ui-reviewer name collision documented as intended precedence**: on a fresh install with both packages the frontend-ui umbrella (richer superset) overwrites the core agent, merge mode keeps the pre-existing file — noted in the core agent, the frontend-ui README, and verified against `copyFile` semantics.
- **Final sweep (Opus 4.8 rework, batch 7 — kit-wide consistency + authoring docs):** post-rework consistency greps came back clean across all packages — zero fractional /dev phase references, zero confidence-band or severity-enum drift, zero TGApp leaks in core, every `references/*.md` pointer and dispatch-table agent name resolves, every "N-point" label matches its actual item count, `superkit-counts-verify` passes. The authoring surfaces were the last carriers of the old conventions and are now synced to the reworked meta-skills: **guide ch.3** teaches the full new agent format (body skeleton with Hard Rules/Phase 0/Output Contract/Recap, canonical confidence bands with LOW → Open Questions, Evidence Gate + Done-gate section, opus-only, complete rewritten Dockerfile-reviewer example); **guide ch.4** teaches the command contract ($ARGUMENTS exactly once, Done-when per phase, gated report, destructive-action gates — /deploy example updated); **examples/agent-from-scratch** rebuilt around the new format with the sample output moved to the exact contract sections and checklist severity tags remapped to canonical enums; **guide ch.5 + examples/hook-pipeline** Stop-hook model corrected haiku → opus (matches settings.json since v1.4.2).
- **Rules (Opus 4.8 reliability rework, batch 6 — all 20 rules, rewritten + verified, 0 escalations):** the always-loaded layer is now compact, generic, and hook-accurate. **documentation.md** — the "15-Point" checklist that actually had 19 rows and DISAGREED with the enforcement hook's own path→doc map is now ONE canonical 11-row table verified against `doc-check-on-commit.sh`'s case statements; TGApp-specific rows moved to a marked "Project-Specific Example Map — ADAPT" block; config-exemption contradiction resolved with a precedence rule; the historical-bug section moved out of the every-session context. **dev-workflow.md** — fractional skip list replaced by the new /dev Skip Matrix; tgapp reference leak removed; verifier reconciled the rule with the real hook wiring (no MultiEdit matcher, correct [hotfix:] reason logic, exempt commits don't reset the edit counter). **superkit-integrity.md** — ghost "README mermaid diagram" → the real dev-flow.svg artifacts; count commands now cover all packages and reproduce the documented totals with internal-file subtraction. **auto-commands.md** — /security-scan wording aligned to AgentShield's verbatim scale; /dev phases by name. **git-workflow.md** — hardcoded TGApp commit scopes → derive-from-structure guidance. **Frontend rules (10)** reworked under binding cross-file decisions and a cluster consistency pass: reflex-audit unified at "3+ checked → ONE CRITICAL" AND 11-item granularity matching the reworked agents (the rule had 12 boxes — cluster fixed the rule, agents untouched); a single canonical `reflex_fonts_to_reject` list lives in ui-anti-patterns.md (union of the two old diverging copies) with by-name pointers from typography/design-aesthetics; the gsap-vs-motion ease-in conflict resolved by explicit mutual scoping (2D UI transitions vs scroll-scrub/3D viewport exits); `tl.set({},{},1.0)` scoped to normalized scrub timelines with a negative branch; bounce ban always restated with its drag/playful exception; 2px joined the canonical spatial scale; typography pinned at 1.25x; color/typography validation got no-web/no-render fallback branches (computed contrast caps confidence at MEDIUM); both heading anchors that impeccable-craft depends on preserved verbatim; absolute bans clarified as absolute (the 3+ threshold governs only the aggregated reflex finding).
- **Skills (batches 5a+5b verification, 18/18, 0 escalations):** adversarial verify pass over all reworked skills (Fable verifiers for the Opus-written core portion + both meta-skills; cross-tier Opus verifiers for the Fable-written frontend portion). 8 files received inline fixes — the standouts are copy-paste-breaking code bugs: redis-patterns' duplicate `const results` redeclaration and `Promise<User>` that actually returns null, telegram-bot-builder's undefined `items` in the pagination handler, drizzle-orm-expert's undefined `pool`/`orders` tables and non-type-only Infer imports, threejs-color-management's undefined `texture` variable in the final pattern comment; plus dated advice corrected (PostgreSQL 12+ inlines plain CTEs — `AS MATERIALIZED` is the real optimization fence) and the meta-skills tightened to their own rules (writing-agents' example now carries the Evidence Gate it mandates; writing-commands' example gained the else-branch its Hard Rule 5 demands; ru-text's checklist no longer implies an NBSP between quote marks).
- **Skills (Opus 4.8 reliability rework, batch 5b — frontend-3d ×6 + impeccable-craft, verify deferred):** `r3f-scroll-driven-3d` — the four load-bearing MUSTs (numeric `scrub`, `invalidateOnRefresh: true`, `tl.set({}, {}, 1)` timeline extension, store `getState()` in per-frame callbacks) promoted from code comments into a top Hard Rules block with reasons, and the placeholder "Dynamic Texture Swapping" section replaced with real working code; `html-to-3d-texture` — the 10fps-demo-under-a-1-2fps-warning contradiction fixed (named `FPS = 2` constant, demo value labeled) plus a 4-row method decision table with a default; `threejs-color-management` — bare `toneMapping: 0` normalized to `THREE.NoToneMapping`, "MacBook Landing Pattern" renamed descriptively, ACESFilmic "(default)" scoped to R3F Canvas; `gltf-debugging` — replaceTexture's sRGB/toneMapped tail now scoped to color maps only (data textures stay linear), linear 4-step workflow with inspect-before-fix rule; `product-3d-lighting` — recipe dispatch step with default + numeric constraints surfaced as Hard Rules; `output-enforcement` — explicit rewrite-and-recheck failure branch, `/* ... */` ban qualified to omitted-code stand-ins; `impeccable-craft` — both broken rule cross-refs fixed to exact current headings ("Before writing any UI: gather design context"; "The 4-question framework…"), Stages 3–4 re-nested under "The four stages", Done-gate + final-summary template added. All 7 rewritten on Fable per the owner's quality-first tiering.
- **Skills (Opus 4.8 reliability rework, batch 5a — 11 core skills, verify deferred):** the two **meta-skills now encode the new kit conventions** so every future component inherits them: `writing-agents` teaches the full playbook skeleton (Hard Rules → Phase 0 → Process → fenced Output Contract with a complete, placeholder-free example — the audited "[standard format]" anti-pattern is gone), canonical enums (confidence HIGH ≥80 / MEDIUM 60–79 / LOW <60 replacing the overlapping 90%+/60–90 bands it used to teach), copy-paste Evidence Gate and Done-gate blocks, opus-only model template; `writing-commands` encodes the batch-4 command contract ($ARGUMENTS exactly once, per-step Done-when, report gated on all steps, destructive-action gates, linear numbering) with test.md/benchmark.md as living references. Fixes elsewhere: `writing-hooks` timeout units corrected to SECONDS (copying the old text yielded 5000-second timeouts) and the 3-vs-4 profile contradiction reconciled (fast/standard/strict runtime values + `always` header label); `ru-text` TGApp section removed from core and the file no longer violates its own quote rule (all canonical examples now end with „лапки“ U+201C, hexdump-verified; invisible NBSPs replaced with visible ␣ markers + legend); `postgresql-optimization` dual Workflow/Phase-1-7 procedures merged into one (and "Phase" vocabulary dropped to avoid /dev collision) + ghost `postgresql`-skill pointer removed; `redis-patterns` triple-stated rules deduplicated, description no longer promises absent Python coverage, locks-without-TTL contradiction resolved (locks always expire); `telegram-bot-builder` ghost "Mini App skills" pointer replaced with an honest not-covered note; `drizzle-orm-expert` schema example now defines every column its queries use; `nextjs-supabase-auth` gained the standard Use-when/Workflow sections; `project-architecture` scaffolds the UI-components/styling section visual-reviewer expects and drops shell-executable `!`-placeholders; `project-scanner` stale "used by /superkit-init and /superkit-evolve" claim removed (verified: neither references it).
- **Commands (Opus 4.8 reliability rework, batch 4a — /dev cluster + 7 commands, verify deferred):** the `/dev` orchestrator rewritten by hand to **linear phases 0–15** matching the dev-flow SVGs exactly (fractional 1.5/1.7/2.1/… numbering retired; single Skip Matrix — Simple skips 2,3,5,6,8,11,13, Standard skips 2,3,13; per-phase Done-when; Hard Rules + Recap; canonical gate enums consumed verbatim; ghost "--quick mode" and the report's PASS-instead-of-PROCEED fixed). `/review` rewritten by hand: goal-verifier moved to a verdict track that bypasses finding-validation, Step 2/Step 3 dispatch synced (silent-failure-hunter, comment-rot-analyzer, api-contract-sync now actually dispatched), database-reviewer added for parity with /dev, DOWNGRADE naming unified. Doc ripple landed atomically: `docs/guide/08-orchestration.md` renumbered to 0–15; Codex mirrors synced — `dev-orchestrator` SKILL rebuilt from 13 actual phases to the full 16 (adding Pseudocode/Contract/Evaluate-ITERATE, no-subagent inline framing), `critic` mirror dropped the BLOCK/CONCERN/NOTE severity list, `evaluator` mirror re-confirmed. Command rework: **/migrate** got a destructive-action gate (`prisma migrate reset` no longer sold as rollback — honest "no true down" + `migrate diff` alternative; Drizzle apply corrected from `drizzle-kit push` to `drizzle-kit migrate`; Knex rollback contradiction fixed); **/audit** now states the two-way PASS/WARN/FAIL contract with the audit trio + Grand Summary aggregation table; **/benchmark** --compare got a guaranteed git-restore epilogue and benchstat pre-check with raw fallback; **/new-migration** de-PostgreSQL-ified (per-dialect conventions, ask-don't-invent default branch); **/commit** stray `$ARGUMENTS` + fractional step fixed, TGApp example genericized; **/docs-init** no longer references a superkit-repo path absent from installed projects (inline skeleton embedded); **/lint** scope/fix orthogonality + "—" cell handling. Verified in batch 4b below.
- **Commands (Opus 4.8 reliability rework, batch 4b — second half + full-batch verification):** remaining 7 commands reworked: **/superkit-init** (Russian scaffold leak → English, fractional Phase 1.5 → linear steps with a scaffold skip-matrix, generated doc names pinned to the shipped docs-templates filenames) and **/superkit-evolve** (expected-docs table now uses the same canonical names — kills the permanent false [MISSING]; find-precedence bug fixed with grouped `\( \)`; GNU-only `grep -oP` / BSD-only `stat -f` replaced with POSIX-portable constructs, snippets executed to verify); **/capture-screen** — nonexistent `--device-scale-factor` CLI flag removed, commands rebuilt on flags verified against `npx playwright screenshot --help`, 2x capture via device descriptor or a labeled script fallback that also implements the previously-fictional `data-screen-id` element capture; **/pair** (Hard Rules consolidation, TDD ping-pong default), **/security-scan** (AgentShield's own critical/high/medium/low scale relayed verbatim — never remapped to kit enums; real availability branches), **/test** (empty-scope fallback, Cypress/pytest-e2e detection rows), **/workflow** ("CRITICAL and HIGH" enum misuse → "CRITICAL and WARNING (HIGH/MEDIUM confidence)"; done-when on all 22 phases); plus a targeted `packages/codex/AGENTS.md` sync (docs-reviewer Phase 7 → Phase 14, `spawn_agent` → inline-skill framing). **Full-batch adversarial verification (18 units, 0 escalations)** including the hand-written dev.md/review.md: verifiers restored dev.md's Sprint-Contract Threshold column + evaluator pass-N report handoff + test-generator availability guard, review.md's Confidence Distribution table + Done-gate + goal-verifier prompt exception, fixed migrate.md's Hard-Rule-vs-Prisma-branch contradiction and Knex batch-rollback caveat, docs-init's tree filename, lint's TOML-section grep bug, and the guide-08 "Phases 10–14" range slip. Owner decision recorded: remaining Codex skill mirrors will NOT be reworked in this pass (owner will sync them later with GPT directly).
- **Agents (Opus 4.8 reliability rework, batch 3 — frontend-ui, 6 files):** all 6 frontend-ui agents rewritten and adversarially verified in one pipeline (12 agents, 0 escalations). **Frontmatter repaired**: the pre-fix inject-tokens bug had inserted `tokens:` mid-description in every agent, making all Dispatch/Do-NOT-dispatch conditions invisible to Claude Code's dispatcher — descriptions reconstructed as single-line YAML (parse-verified with PyYAML by each verifier) with dispatch conditions restored. The umbrella ui-reviewer no longer claims to "dispatch" specialists (subagents can't spawn subagents) — it RECOMMENDS them by name for the caller to dispatch. Specialists (typography/color/interaction) gained their own standalone Output Contracts instead of pointing at "the umbrella's format". Cross-file threshold unification: reflex-audit CRITICAL at 3+ checked boxes in both ui-reviewer and ui-design-critic (was >2 vs 5+); motion duration-table rows now win over the generic >300ms rule ("standard UI element" = element without a table row), with Severity + file:line columns added to the Before/After/Why table; typography scale threshold aligned to the rules' 1.25x minimum (was 1.2x). Verifiers restored two drops (ligatures check; Times New Roman + system-ui in the reflex-reject list).
- **Agents (Opus 4.8 reliability rework, batch 2 — stack/frontend-3d/GAN/extras, 25 files):** same playbook treatment as batch 1 for the 9 stack reviewers (go×6, ts, py, rs), 4 frontend-3d reviewers, 4 extras, and the whole GAN package. Highlights: **stack** — dead `references/` pointers fixed for the installed layout (`.claude/agents/references/` + Glob fallback + SKIPPED note), go-reviewer's index now lists all v1.4.0 references, nonexistent `maps.NewWithSize()` → `make(map[K]V, n)`, "Sub-Agent 1..5" leftovers → single-agent Areas, discover-vs-emit tension resolved kit-wide (Discover collects broadly, Evidence Gate applies at Triage); **frontend-3d** — INFO severity → SUGGESTION, percentage confidence → canonical bands, presentation-reviewer's 440×956 mandate demoted to a default that project-detected dimensions override; **GAN** — the planner→evaluator rubric handoff redesigned end-to-end (plan carries a mandatory `## Rubric` section naming rubric files + applicable N; evaluator scores X/N with a both-rubrics default; rubric "Total criteria" lines fixed to real row counts 21/15; BLOCKED reserved for un-runnable evaluations only; generator fix-loop capped at 3 attempts) with the 3 Codex skill mirrors synced; **extras** — red-blue-auditor's scan.sh invocation fixed (`--path=` equals form, `--exit-on-critical` documented, Glob discovery + NOT FOUND branch), bot-reviewer gained the missing Open Questions section, skillsmp-search gained explicit key/401/429/zero-result branches. Adversarially verified 25/25 (tiered Fable/Opus verifiers; 0 escalations): 4 verify-units applied inline fixes — ts-reviewer got its dropped "no prop drilling" check restored, red-blue-auditor's Risk Score example math corrected (2-CRITICAL case) and phase-count recap aligned, skillsmp-search's 429 branch de-contradicted ("act per Error Branches table", envelope-agnostic zero-results wording), and the GAN package had its last agent↔mirror drift removed plus the `toHaveScreenshot()` visual-regression capability restored in evaluator + mirror.
- **Agents (Opus 4.8 reliability rework, batch 1):** all **31 core agents** rewritten against a failure-mode playbook for weaker executors (audited first: 117 kit files, 16-agent sweep). Every agent now carries: a top **Hard Rules** block (≤7 bullets) + bottom **Recap** (lost-in-the-middle guard), an **exact fenced Output Contract** with a filled mini-example, an **Evidence Gate** (reviewers: findings only with `file:line` actually read, concrete failure mode, `NOT FOUND` instead of invented content) or a **Done-gate** (generators: artifacts verified on disk, tests actually run, VERIFIED vs ASSUMED separated), canonical enums (severity CRITICAL/WARNING/SUGGESTION; confidence HIGH ≥80 / MEDIUM 60–79 / LOW <60 with LOW routed to Open Questions — never dropped), linear integer numbering, `/dev` phases referenced by name, and ripgrep-safe two-pass greps (no PCRE lookaheads). Contradictions fixed include: code-reviewer's drop-vs-route LOW conflict, critic's ghost "/dev Phase 8.5", plan-checker's overlapping REVISE/BLOCK thresholds, security-scanner's triple severity vocabulary, visual-reviewer's impossible scoring math, debug-observer's read-only-but-edits conflict, behavioral-nudge-engine's dual escalation policy, comment-rot-analyzer's file-age-instead-of-TODO-age command. Deterministic rules replace "sample/random" selections; generator agents (test-generator, e2e-test-generator, scaffold-endpoint) gained output contracts and must run what they generate. Adversarially verified 31/31 (23 clean, 8 minor inline fixes, 0 escalations).
- **Fix (tooling):** `bin/inject-tokens.js` no longer corrupts YAML frontmatter of files with multi-paragraph block descriptions — blank lines inside a `description:` block scalar are now treated as continuations, so `tokens:` is inserted after the block instead of mid-description (this bug had broken the dispatch conditions of all 6 frontend-ui agents).

- **Docs:** the 5 `/dev` flow SVGs (main `dev-flow.svg` + 4 gallery variants) + the gallery README now label the pipeline 16-phase (was 15). The diagrams visualize the 15 working phases; Phase 0 (`read-docs` — load project context) is the entry preamble, now explained in the gallery README. Resolves the diagram/text phase-count mismatch flagged in v1.4.2.
- **Docs:** richer "What's New" for v1.4.2 in the README — full emoji-bulleted highlights (matching the v1.4.0 style) instead of a one-line summary.
- **Fix:** GAN rubrics (`ui-quality`, `functionality`) still used the retired "NEEDS REWORK" tiers — aligned to the 3-state verdict (NEEDS-ATTENTION / NEEDS-REMEDIATION) the gan-evaluator now emits.
- **Fix:** dropped a leftover "181k stars" figure from a `gateguard-pre-edit.sh` comment.

## [1.4.2] — 2026-05-29

Adapts the kit to **Claude Opus 4.8** (released 2026-05-28) and lands an audit-driven hardening pass.
The `opus` alias auto-routed to 4.8 with **zero agent changes** — this release catches up the
human-readable surfaces and tunes agents/hooks to 4.8's behavior: more literal instruction-following
(reviewers shifted to *coverage-not-filtering* so low-severity findings aren't dropped), improved honesty
(verifier discipline + Evidence Gate), and the new effort dial (per-role `xhigh`/`max` convention +
escalation on retry). Also fixes **three verified hook defects** (`[wip]`-on-main dead code, bare-`$PPID`
state keys that silently never accumulated, global audit-trail hash chain), reframes reviewer audit-mode
for the no-nested-subagents reality (Claude Code 2.1.x), syncs every **Codex + showcase** mirror, and
reworks the README. Component counts unchanged. 30+ commits since v1.4.1.

- **Docs:** corrected remaining stale `/dev` phase-count references (8→16) in the rules guide, the core getting-started stub, and the writing-commands skill. (The 5 hand-drawn `/dev` flow SVGs still render 15 nodes — a pre-existing diagram/text mismatch tracked as a separate re-authoring follow-up.)

- **Docs:** fixed stale counts surfaced by the audit — `docs/INSTALL-CLAUDE-CODE.md` (27→31 core agents), README docs index (13→15 chapters, added rows for ch.14 Frontend UI + ch.15 Env Vars), dropped the volatile "181k stars" figure, and pointed the GSD ecosystem row at the active `open-gsd/gsd-pi` (gsd-2 archived).
- **Docs:** corrected stale counts/config across guides + INSTALL + Codex docs (Codex skills 72→82, core hooks 23→26 / skills 5→11, /dev "15 Phases"→16, config.toml gpt-5.4→5.5 / extra_high→xhigh, architecture agent count + Stop-hook model→opus, showcase 3→6 rules, Codex review-orchestrator/goal-verifier descriptions).
- **Docs:** propagated v1.4.2 behavior into docs — dropped the "think step by step" idiom from authoring templates (CONTRIBUTING, guide ch.3, example), moved GAN README to the 3-state verdict + dropped "181k stars" + fixed its non-existent installer-prompt claim, removed the phantom Agent tool from FRONTEND-3D docs, corrected the FRONTEND-UI hook path + umbrella-reviewer dispatch wording, removed the stale frontend-ui "being built" note, fixed the TROUBLESHOOTING guide path.

- **Fix (agents):** dropped the unusable `Agent` tool from 4 frontend-3d leaf reviewers (presentation/r3f-scene/ui-design/frontend-perf) — subagents can't spawn sub-agents on Claude Code 2.1.x; matches the Go-specialist cleanup. (showcase `health-checker` retained `Agent`: its body genuinely instructs parallel sub-agent dispatch.)
- **Fix (statusline):** live payload effort now takes precedence over the `CLAUDE_EFFORT` env var (was inverted), so a stale env value no longer masks the real per-turn effort.
- **Fix (hooks):** guarded `superkit_session_key` calls in the 4 discipline hooks + audit-trail (fall back to the inline key if profile.sh is missing); routed audit-trail through the shared helper (DRY); registered the orphan `profile-helper_test.sh` in run-all.sh (now 11 suites); corrected the audit-trail-chain test comment.
- **Fix:** completed the 3-state goal-verifier verdict migration — `/dev` Phase 5.5 still branched on the old VERIFIED/PARTIAL/FAILED tokens (broken gate logic), and the Codex + showcase goal-verifier mirrors were unsynced. All now use PASS/NEEDS-ATTENTION/NEEDS-REMEDIATION + Verification Discipline.
- **Fix (Codex sync):** reframed Codex Go-specialist mirrors off unexecutable self-spawn wording; added Review Discipline + Evidence Gate to the Codex silent-failure-hunter mirror and Verification Discipline to the Codex reality-checker mirror (matching core).
- **Token metadata:** regenerated `tokens:` for behavioral-nudge-engine, codebase-onboarding-engineer, and ru-text skill (cleared standing drift via `node bin/inject-tokens.js`).

- **Hooks (Claude Code 2.1.141+):** audited for raw ANSI/`/dev/tty` output now that hooks run without a controlling terminal — confirmed none emit terminal escapes (no migration needed; all hooks already communicate exclusively via JSON `hookSpecificOutput` or plain stderr text).
- **statusline.cjs:** additively surfaces Opus 4.8 effort level + a context-budget indicator when the CLI provides them (defensively gated; unchanged on older CLIs). Reads optional JSON payload from stdin (Claude Code 2.1.x), falls back gracefully when absent or on a TTY. `context_window` interpreted as CURRENT usage per 2.1.x semantics. Also honours `CLAUDE_EFFORT` env var.
- **Advisory hooks:** warn-only PreToolUse messages could be swallowed by Claude Code; now also emitted via `hookSpecificOutput.additionalContext` (new `superkit_advise` helper) so reminders reach the model (ECC-inspired).
- **Advisory hooks (Opus 4.8):** added per-session dedup/throttling (default 10-min window, `CLAUDE_NUDGE_WINDOW_MIN` to tune) so nudges don't spam — 4.8 self-flags (OMC-inspired). Throttles nudge frequency only; reviewer coverage is unaffected.
- **superkit-counts-verify:** label-anchored README parsing (was positional `sed`), single-source internal-file exclusions (was magic `-2`/`-1`), and gated the network `gh repo view` behind `--check-remote`.
- **Effort convention (Opus 4.8):** documented per-role effort guidance (xhigh/max for deep specialists, high default) in the CLAUDE.md template + repo conventions + Codex AGENTS.md.
- **reality-checker / goal-verifier:** added "no approval without fresh evidence" + hedge-word auto-reject + separate-pass discipline (OMC verifier + GSD), leaning into Opus 4.8's improved honesty.
- **gan-evaluator + /dev goal-verifier:** standardized a 3-state verdict (PASS / NEEDS-ATTENTION / NEEDS-REMEDIATION) so the workflow knows fix-in-place vs re-plan vs ship (GSD validate-milestone). Codex GAN mirror updated.
- **/dev + /workflow:** escalate effort to `max` on a failed gate/retry instead of re-running at the same level (leverages the Opus 4.8 effort dial; GSD-inspired).
- **/dev:** added a fast inline self-review checkpoint (placeholders / type-consistency / spec-coverage) before the expensive subagent review gates (superpowers-inspired).
- **Reviewers (Opus 4.8):** shifted from conservative filtering to a two-stage discovery→triage discipline with an "Open Questions" bucket, so 4.8's literal instruction-following no longer drops real low-severity findings. Applied across the reviewers + /review + /dev gates.
- **Reviewers (Opus 4.8):** replaced the legacy "think step by step / show your reasoning" idiom (pre-adaptive-thinking) with a results-oriented instruction across the affected agents.
- **Codex mirrors + showcase + authoring guide:** removed the legacy "think step by step / show your reasoning" idiom to match the core reviewer agents (kept Codex/showcase in sync).
- **Codex mirrors + showcase reviewers:** synced the two-stage discovery→triage discipline + Evidence Gate from the core reviewers, so all surfaces share one review protocol.
- **Reviewers:** added a shared Evidence Gate (cite-line / concrete-trigger / context-checked / defensible-severity + skip-list + "clean review is valid") — inspired by everything-claude-code.
- **README:** added a one-line value wedge, unified the install flow, surfaced dual Claude-Code+Codex support up top, and demoted v1.4.1 bugfix detail below the fold.
- **README:** added a "which command" decision table, a concrete /dev walkthrough, an all-Opus rationale with third-party validation, and consolidated the ecosystem accordions.
- **Fix:** Go specialist reviewers (error/concurrency/performance/observability) claimed to dispatch parallel sub-agents and declared the `Agent` tool, but subagents cannot spawn sub-agents on Claude Code 2.1.x. Reframed audit mode as orchestrator-driven fan-out and removed the unusable `Agent` tool (matching `go-reviewer`).
- **Fix:** py/ts/rust/go/ui reviewers described spawning parallel sub-agents but lacked the `Agent` tool (unexecutable on Claude Code 2.1.x). Reframed audit mode as orchestrator-driven fan-out. Relevant on Opus 4.8, which is literal about granted tools.
- **Opus 4.8 version refresh** — badge + CLAUDE.md templates + docs guide + showcase trailers bumped 4.7 → 4.8. The opus alias already auto-routed; this is the human-readable catch-up.
- **Fix:** `[wip]`-on-main protection in `dev-required-on-commit.sh` was dead code (`$GIT_CMD_PREFIX` used before definition); hoisted the prefix resolution + added a regression test.
- **`lib/profile.sh`** — added shared `superkit_session_key()` (SESSION_ID → CLAUDE_HOOK_PID → PPID) to standardize per-session hook state.
- **Fix:** `loop-guard`, `edit-streak-check`, and both `gateguard` hooks keyed state on bare `$PPID`; migrated to the shared `superkit_session_key()` so per-session state accumulates reliably (matching `audit-trail`).
- **Fix:** `audit-trail.sh` hash chain was a single global `.last-hash`; made it per-session (`.last-hash-<session>`) so parallel subagents no longer cross-link the chain.

## [1.4.1] — 2026-05-14

Bugfix patch on top of v1.4.0 — no new features. Closes **20 defects** across
7 review passes (internal audit + Codex CLI gpt-5.5 + four follow-up sweeps +
a real-world cross-project sync scenario). v1.4.0 release announcement and
feature set stay intact; this release ships only correctness fixes so a fresh
`git clone … && bash setup.sh`, `--codex` setup, and SessionStart auto-update
all actually deliver what the README promised.

### Added — convenience wrapper

- **`bin/superkit-counts-verify.sh`** — thin wrapper around the canonical `packages/core/hooks/superkit-counts-verify.sh` so contributors can run the count/version check manually from the repo root without remembering the full hook path. Synthesises an empty git-commit payload when invoked interactively (no stdin) so the hook actually runs its checks instead of early-exiting. Forwards both stdin payload and exit code transparently when invoked from a pipe.
- **CLAUDE.md Self-Audit Rule section** updated to list both the canonical hook path and the wrapper, so neither human contributors nor automated reviewers (e.g. Codex CLI) confuse "no `bin/...` path" for "no verification mechanism".

### Fixed — install method documentation (npm registry deferred)

- **README, docs/INSTALL-CLAUDE-CODE.md, docs/guide/01/13/14, packages/codex/INSTALL.md** — every `npx claude-code-superkit` invocation replaced with `git clone … && bash setup.sh`. `claude-code-superkit` is not yet published to the public npm registry (`npm view claude-code-superkit version` → 404). All "install in one command" wording rewritten around `bash setup.sh`. A README note explicitly states the npm publish is deferred and will become the one-liner when ready.

### Fixed — Codex approval rules (round 2)

- **`git filter-repo` / `git filter-branch`** — history-rewriting tools were uncovered. Added `prompt` rules, plus `git rebase -i`, `git rebase --root`, `git update-ref -d`, `git reflog expire`.
- **`psql -c "DROP TABLE x"` matching** — `prefix_rule(["psql","-c","DROP"])` never matched because the SQL is delivered as a single argv token (`"DROP TABLE x"`), not as separate words. Codex's rule engine does not support substring/regex on argv tails. Replaced with broader `["psql","-c"]` and `["psql","--command"]` → `prompt`, so the full SQL is shown to the user before execution. Same caveat documented for `psql -f`, `psql --file`, `mysql -e`, `mysql --execute`. Read-only interactive `psql` sessions (without -c) keep the broader `allow` rule.

### Fixed — superkit-update.sh (sync logic + .py hooks)

- **Install-version drift never detected when source clone matched remote.** The hook compared only `git rev-parse HEAD` vs `@{u}` in the source clone. If a user manually pulled the clone (or another project synced first), `LOCAL == REMOTE` returned true and the hook exited immediately — even when `.superkit-meta`'s `SUPERKIT_VERSION` lagged the source `VERSION` file. Real-world scenario: user upgraded clone to 1.4.1 from CLI, then ran a different project's SessionStart hook expecting auto-sync; install stayed at 1.3.10 silently. Fix: cheap version-string compare (`INSTALL_VERSION` vs `SOURCE_VERSION`) now runs FIRST, independently of the git ref check. Version mismatch alone triggers re-sync. Rate limit bypassed when install lags source (no point delaying a known-stale install).
- **`.py` hooks were not copied during update.** Only the `*.sh` glob was iterated. v1.4.0 introduced `intake-classifier.py` and v1.4.1's `installer.js` fix accepted both extensions, but the update path stayed `.sh`-only. Now mirrors the installer: copies `.sh` and `.py` from `packages/core/hooks/` (and stack-hooks).
- **Skill auxiliary files (scripts/, references/) were not copied during update.** Only `SKILL.md` was synced. If a skill ships supporting files in its directory, they would be missing after an update even though present after a fresh install. Now copies the full skill directory contents.
- **`chmod +x` on `.py` hooks added** in update path (was `.sh` only).

### Fixed — install / packaging (BLOCKER level for fresh installs)

- **npm pack shipped 0 GAN files** — `package.json` `files[]` array did not include `packages/gan/`. Anyone running `npm publish` would have produced an artifact without the advertised GAN package. Added.
- **`intake-classifier.py` silently dropped during install** — `lib/installer.js` copied only `.sh` hooks. `settings.json` then referenced a missing file on every `UserPromptSubmit`. Now accepts both `.sh` and `.py`.
- **`default.rules` never copied for Codex CLI installs** — `lib/codex.js` never read `packages/codex/rules/default.rules`. README promised it, install didn't deliver it. Added copy to `.codex/rules/default.rules`.
- **`superkit-counts-verify.sh` blocked legitimate commits** — under-counted core hooks (missed `.py`), missed the GAN package, didn't see `extras/*/agent.md` subdirectory layout. Reported `agents=52` vs actual 56, and emitted false BLOCKED on `git commit`. All three counters fixed.

### Fixed — Codex approval rules (MAJOR — safety theater)

- **Force-push bypass via argv position** — `pattern=["git","push","--force"]` only matches when `--force` lands at argv[2]. `git push origin main --force` placed it at argv[4] and went straight through `git push` allow rule. Downgraded `git push` to `prompt`, same for `git reset` (covers `git reset HEAD --hard`). Documented WHY in a comment so a future "more permissive" rewrite won't reintroduce the hole.
- **`curl | bash` was never matchable** — pipes aren't argv tokens; rule engine sees two separate executions. Dropped misleading "forbidden" rule, moved `curl` / `wget` to `prompt` so the user sees the URL, added `bash -c` / `sh -c` to `prompt`.
- **Missing destructive ops** — `psql -c DROP`, `psql -c TRUNCATE`, `kubectl drain`, `terraform destroy`, `terraform apply` had no rules. Added to `prompt`.

### Fixed — documentation drift

- **Codex `AGENTS.md` Agent skills list** was frozen at v1.3.11 — missed 4 new core roles and the 6 TGApp / production skills. Refreshed alphabetically + added "Production skills" and "GAN harness skills" subsections.
- **README hook/rule totals** were stuck at "28 + 16 stack" and "8 + 12 stack" (pre-superkit-counts-verify fix). Now reflect actual `42 shipped + 2 internal` hooks and `19 shipped + 1 internal` rules.
- **README Codex arithmetic** — `82 (... + 3 GAN)` read as 85. Re-spelled to make clear 82 live in `packages/codex/skills/` and 3 GAN mirrors live in `packages/gan/skills/` (optional install).
- **`packages/codex/INSTALL.md` Total summary** — 72 → 82 skills, 32 → 36 agent skills, v1.4.0 additions called out, `default.rules` + 3 GAN disclosed.
- **GitHub About description** updated via `gh repo edit`: hooks 28 → 42, rules 10 → 19 (matches actual after counts-verify fix).
- **`CLAUDE.md`** Current Counts table split into "Hooks shipped" / "Hooks internal" / "Rules shipped" / "Rules internal" so the public number is unambiguous.

### Fixed — content defects

- **`test/codex.test.js` was red on main** — `packages/codex/skills/silent-failure-hunter/SKILL.md` had a leftover `` `/review` `` slash-command reference banned by the v1.3.11 regression test. Replaced with "the review workflow".
- **`drizzle-orm-expert` SKILL.md** — relational query example used `const users = await db.query.users.findMany({ where: eq(users.role, 'user') })` which shadows the imported `users` table. Renamed result variable + switched to modern callback RQB form (`where: (user, { eq }) => eq(user.role, 'user')`).
- **`silent-failure-hunter.md`** — declared `tokens: 1280` but actual body was ≈2218 tokens. Updated for honest transparency.

### Fixed — GateGuard hooks robustness

- **Non-atomic state writes** — `echo > $STATE_FILE` could interleave bytes under concurrent invocation. Now writes to `${STATE_FILE}.$$.$now` then `mv -f` for a single-rename atomic commit.
- **Clock skew false-OK** — a stored future timestamp pretended facts were fresh forever. Explicit `[ "$last_facts" -gt "$now" ]` resets to defaults.
- **Strict mode noise on read-only commands** — `sed -n`, `awk`, `nl`, `tree`, `git grep`, `git stash list`, `git reflog`, `git describe`, `git tag --list`, `node --version`, `stat`, `realpath`, `readlink`, `basename`, `dirname`, `cut`, `sort`, `uniq`, `locate`, `more`, `id` are now in the read-only whitelist.

## [1.4.0] — 2026-05-14

A substantial expansion across both Claude Code and Codex CLI surfaces. Three primary themes: **VKirill/codex-starter-kit adaptations** (3 cross-CLI specialist roles + Codex approval policy DSL + intake classifier), **TGApp / general production skills** (Telegram bots, Next.js + Supabase, Drizzle, Russian typography, PostgreSQL optimization, Redis patterns, behavioral nudge engine), **competitor patterns** (GateGuard hooks from everything-claude-code, expanded silent-failure-hunter), and a brand-new **GAN harness package** for adversarial verification of UI features.

### Added — Agents (Core)

- **`minimal-change-engineer`** — surgical implementation specialist. Value measured in lines NOT written. Refuses scope creep, prefers three similar lines over a premature abstraction. Use after a feature impl or during code review to prune what isn't strictly required.
- **`reality-checker`** — evidence-based readiness assessor. Defaults to NEEDS WORK, refuses fantasy A+ ratings. Demands screenshots, logs, test outputs before declaring anything production-ready.
- **`codebase-onboarding-engineer`** — first-pass analyst for unfamiliar codebases. Produces a concise 30-60 min brief covering tech stack, architecture layers, conventions, hot paths, and known constraints.
- **`behavioral-nudge-engine`** — behavioral psychology for retention. Cadence personalization, cognitive load reduction, momentum building. Fogg Behavior Model + onboarding/re-engagement templates + streak mechanics. Useful for social products.

### Added — GAN package (new, optional)

- **`packages/gan/`** — three-agent adversarial verification loop (`gan-planner` → `gan-generator` → `gan-evaluator`) with Playwright + anti-AI-slop rubrics. Inspired by GAN pattern from `affaan-m/everything-claude-code` (Anthropic Hackathon Winner, 181k stars).
- Two rubric files: `rubrics/ui-quality.md` (17 binary criteria) and `rubrics/functionality.md` (15 criteria for non-UI features). Auto-fails on `console.log`, "something went wrong", placeholder text, or no empty state.
- Codex SKILL.md mirrors. **Optional install** via CLI prompt (Playwright ~150 MB).

### Added — Hooks (Core)

- **`intake-classifier.py`** — UserPromptSubmit hook. Deterministic scorer (0-15) on RU+EN keywords + optional `gpt-5.5-nano` LLM fallback when confidence < 0.78. Emits intent + flags (`should_edit`, `should_plan`, `should_use_task_ledger`, `subagents_authorized`). Fail-open. Opt-out: `CLAUDE_DISABLE_INTAKE_CLASSIFIER=1`.
- **`gateguard-pre-edit.sh`** + **`gateguard-record-facts.sh`** — pair of hooks. Pre-edit emits a stderr nudge when no `Grep`/`Read` recorded in last 10 min. Read-only Bash exempt. Strict mode (`CLAUDE_GATEGUARD_STRICT=1`) blocks. Forces "establish facts before action."

### Added — Codex Approval Rules (new)

- **`packages/codex/rules/default.rules`** — Starlark-like DSL (~380 lines). Forbids `rm -rf /`, `sudo`, `dd`, `mkfs`, `shutdown`. Allows git/gh/npm/pnpm/yarn/pip/cargo/go/docker/kubectl reads. Prompts on force-push, hard reset, chmod, docker prune, kubectl delete. New "Approval Rules" section in `packages/codex/AGENTS.md`.

### Added — Skills (dual-format, core + codex)

- **`telegram-bot-builder`** — Telegraf, grammY, aiogram patterns. Bot architecture, inline keyboards, monetization (ads/per-use/freemium/subscription), error handling, webhook vs long polling tradeoff.
- **`nextjs-supabase-auth`** — Next.js 14+ App Router. `@supabase/ssr` browser/server/middleware setup, OAuth callback route, Server Action login, RLS policies, common production issues. Replaces a thin source skill with substantive content.
- **`drizzle-orm-expert`** — TypeScript-first ORM. SQL-like + relational APIs, schema/migrations/transactions, adapter table for Neon/Turso/PlanetScale, performance patterns.
- **`ru-text`** — Russian typography. Quotes (« »), em dash (—), en dash (–), NBSP, ellipsis, digit groups, decimal comma, № sign, ₽ symbol. 14 stop-words. UX writing rules for microcopy.
- **`postgresql-optimization`** — 7-phase workflow (assess → EXPLAIN → index → query → config → maintenance → monitor). EXPLAIN node interpretation, index selection guide, config cheatsheet, anti-patterns.
- **`redis-patterns`** — Cache-aside, pub/sub, BLPOP wake queue, data structures, distributed locks with Lua, pipeline vs multi/exec, TTL strategy, eviction policies.

### Changed — Agents

- **`silent-failure-hunter`** expanded 109 → 250 lines. 6-category taxonomy (A: empty handlers, B: promise suppression, C: fallback masking, D: log-and-forget, E: generic catch-all, F: linter/type suppression) + per-language BEFORE/AFTER fix examples (TS, Python, Go, JS floating promise, Bash) + acceptable-silence disclosure table + severity rules tied to data/auth/payment paths.

### Added — Go References (5 new files: 24 → 29)

- `di-frameworks.md` — uber-fx, uber-dig, google-wire comparison table + choice matrix
- `graphql-patterns.md` — gqlgen schema-first workflow, N+1 prevention via DataLoader
- `module-management.md` — go.mod/go.sum/workspaces/replace, govulncheck, CI checklist
- `stay-updated.md` — tracking Go releases (1.21/1.22/1.23 highlights), modernize tool
- `standard-stdlib-now.md` — what stdlib now replaces (slices, maps, errors, log/slog, math/rand/v2, net/http mux)

### Counts after v1.4.0

| Component | Before (1.3.11) | After (1.4.0) | Δ |
|-----------|------|------|------|
| Core agents | 27 | 31 | +4 |
| Core skills | 5 | 11 | +6 |
| Core hooks | 25 | 28 | +3 |
| Codex skills | 72 | 82 | +10 |
| Codex rules | 0 | 1 file | +1 |
| Go references | 24 | 29 | +5 |
| Packages | 7 | 8 (+gan) | +1 |
| Total agents | 49 | 56 | +7 |

### Source attribution

- 3 cross-CLI roles, `default.rules`, `intake-classifier`, TGApp skills, `behavioral-nudge-engine` — adapted from [VKirill/codex-starter-kit](https://github.com/VKirill/codex-starter-kit) (MIT). Compacted from VKirill's 800-1000 line TOMLs to our ~300-500 line markdown standard.
- GateGuard hooks, GAN harness, silent-failure-hunter expansion — inspired by [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) (181k stars).
- Go references — drawn from [samber/cc-skills-golang](https://github.com/samber/cc-skills-golang) (Apache 2.0).
- Russian typography — based on Arseniy Kamyshev's ru-text reference (https://ru-text.org).

## [1.3.11] — 2026-05-06

### Changed (Codex layer modernization)

The Codex layer was adapted to the latest GPT release and aligned with Codex-native tooling. Claude Code source-of-truth was untouched.

- **Model bump** — `packages/codex/config.toml` now declares `model = "gpt-5.5"` and `model_reasoning_effort = "xhigh"`. Installer summary (`lib/installer.js`), Codex install info (`lib/codex.js`), `packages/codex/AGENTS.md`, `packages/codex/INSTALL.md`, `README.md` (badge + comparison table + install snippet), and `CLAUDE.md` (conventions) all updated in lockstep.
- **`writing-agents` and `writing-commands` rewritten** — both Codex skills are now Codex-native: minimal frontmatter (no `model:` / `allowed-tools:`), explicit Codex tool mapping (`rg`, `exec_command`, `apply_patch`, `update_plan`, `spawn_agent`/`wait_agent`), and Codex-shaped examples.
- **AGENTS.md sharpened** — dispatch guidance reframed around `spawn_agent` only when the user has authorized parallel agent work; new "Local Tool Mapping" section documents `rg`, `exec_command`, `apply_patch`.
- **All 32 reviewer/workflow skills cleaned** — no leftover `Co-Authored-By: Claude` trailers in commit/dev guides; `docs-reviewer` now scans `.codex/skills/*/SKILL.md` instead of `.claude/agents/`; legacy `/dev workflow`, `/review pipeline`, `/docs-init` wording removed; missing `user-invocable: false` added to 6 frontend-3d knowledge skills (`gltf-debugging`, `html-to-3d-texture`, `output-enforcement`, `product-3d-lighting`, `r3f-scroll-driven-3d`, `threejs-color-management`); references to `CLAUDE.md`-only context replaced with `AGENTS.md or CLAUDE.md`.
- **`tools/convert-agents-to-codex-skills.sh` learned `normalize_body_for_codex`** — future conversions from `packages/core/agents/` auto-strip `model:` / `allowed-tools:` frontmatter, rewrite `Agent`/`TodoWrite`/`Read`/`Grep`/`Glob`/`Bash`/`Edit`/`Write` to their Codex equivalents (`spawn_agent`, `update_plan`, `rg`, `rg --files`, `exec_command`, `apply_patch`), and remove `Co-Authored-By: Claude` trailers.

### Added

- **`test/codex.test.js`** — 5 regression assertions guarding Codex package integrity:
  - `config.toml` declares `gpt-5.5` + `xhigh`, no `extra_high` / `gpt-5.4` anywhere.
  - Active Codex docs (`AGENTS.md`, `INSTALL.md`, `README.md`, `lib/codex.js`, `lib/installer.js`) free of legacy model strings.
  - Authoring guides (`writing-agents`, `writing-commands`) mention `spawn_agent` and `exec_command`, never `Agent tool` / `allowed-tools:` / `Claude Code Agents`.
  - Convert script contains `normalize_body_for_codex`, `spawn_agent`, `apply_patch`, `update_plan`.
  - No skill body ships `allowed-tools:`, `model: opus`, `TodoWrite`, `Agent tool`, or `Co-Authored-By: Claude`.

### Tested

- `node --test test/codex.test.js` — 9/9 pass.
- `npm test` — 28/28 pass.
- Manual grep audit across `packages/codex/` finds zero `gpt-5.4` / `extra_high` / `allowed-tools:` / `model: opus` / `TodoWrite` / `.claude/agents` / `.claude/commands`.

## [1.3.10] — 2026-04-18

### Fixed (critical — macOS portability + hook output stream)

Two production bugs discovered in a real tgapp Claude Code session on 2026-04-18. Both hit macOS users with stock system `awk` (BWK 20200816, not gawk). One bug was already hot-patched in tgapp (commit `7d146bca`); this release upstreams that fix plus the companion stream-redirect bug.

- **`packages/core/hooks/dev-required-on-commit.sh`** — `cycles_last_hour()` used the gawk-only 3-argument `match($0, /regex/, array)` form. On BWK awk this is a syntax error, which crashes the hook, leaves the variable empty, and falls through to bash `[ "" -ge 2 ]` — evaluating as restrictive and firing a false BLOCK on commits. Replaced with POSIX 2-arg `match()` + `RSTART`/`RLENGTH`/`substr()` extraction. Portable across gawk, BWK (BSD/macOS), and mawk. *Hot-patched in tgapp commit `7d146bca` on 2026-04-18; upstreamed here.*

- **`packages/core/hooks/doc-check-on-commit.sh`** — error-output block wrote `BLOCKED: Required documentation not staged` and the `Missing docs:` list to **stdout**. Claude Code's hook runner only surfaces **stderr** to the user when a hook exits non-zero — stdout is discarded. Result: users saw the opaque `PreToolUse:Bash hook error: No stderr output` message with no actionable info, retried the same commit, got the same opaque error. All 11 `echo` statements in the MISSING branch (and the post-check advisories) now redirect to `>&2`.

- **`packages/core/hooks/loop-guard.sh`** — same stdout-instead-of-stderr antipattern. Both BLOCK branches (3+ identical-call detection, A→B→A→B alternation) had `echo` going to stdout — 14 lines total now redirect to `>&2`.

- **`packages/core/hooks/superkit-counts-verify.sh`** — same antipattern in the count/version mismatch BLOCK path. 15 echoes now redirect to `>&2` (not wired by default but fix applied for consistency when devs wire it manually).

### Tested

- Bug 1: `awk '/"outcome":"allow-override"/ { match($0, /"ts":"[^"]+"/); substr($0, RSTART+6, RLENGTH-7) }'` verified clean on local BWK `awk version 20200816`.
- Regression suite `packages/core/hooks/tests/dev-required-on-commit_test.sh` — 11/11 pass.
- `npm test` — 19/19 pass (buildSettings 6 + smoke 7 + countFiles 3 + copyFile 2 + isInsideGitRepo 1).
- `bash -n` syntax check on all 4 modified hooks — clean.

### Audit results

Grep `match([^)]*,[^)]*,[^)]*)` across all core + stack + frontend-3d + frontend-ui hooks returned zero other hits after this fix — no other hooks suffered from Bug 1. Audit of `exit 2` / `exit 1` branches for `echo`-without-stderr antipattern hit the 4 files listed above; all fixed. `verify-hooks.sh` is a developer CLI (not a Claude Code hook), so its stdout usage is correct and left untouched.

## [1.3.9] — 2026-04-18

### Amendment (evening 2026-04-18) — correctness, docs parity, features

Seventeen commits amended into v1.3.9 after the initial tag, driven by a 15-agent audit, README quality push, and five competitor-inspired features (samber/cc-skills-golang, everything-claude-code, gsd-2, oh-my-claudecode analysis).

#### Correctness fixes (audit findings)
- **`/dev` phase count reconciled 15 → 16** — dev.md has 16 phase headers (`0, 1, 1.5, 1.7, 2, 2.1, 2.5, 3, 3.5, 4, 5, 5.5, 6, 6.5, 7, 8`); all docs (dev.md frontmatter, CLAUDE.md, README, Codex AGENTS.md, guide chapters) now match reality. Verbal arrow list prepended with `read-docs →` to match 16-step count.
- **Rule frontmatter schema normalized** — 7 rules used legacy `paths:` instead of canonical `applyWhenPaths:` and were likely never scoping correctly. Affected: `packages/core/rules/{security,frontend-aesthetics}.md`, `packages/stack-rules/go/{go-conventions,go-safety}.md`, `packages/frontend-3d/rules/{gsap-conventions,threejs-conventions,frontend-aesthetics-3d}.md`. Glob patterns preserved.
- **Showcase `dev.md:367`** — `Co-Authored-By: Claude <noreply>` bumped to `Claude Opus 4.7 (1M context) <noreply@anthropic.com>` to match sibling `commit.md`.

#### README / docs quality
- **Frontend section restructured** — single `🎨 Frontend Development` umbrella with two parallel subsections: `🖌️ frontend-ui` (6 agents / 7 rules / 3 hooks / impeccable-craft) and `🎬 frontend-3d` (4 agents / 6 skills / 4 hooks / 3 rules / 1 command). Same structure, same depth. frontend-ui previously lived only in counts table.
- **Features grid copy tightened** — removed AI-cadence filler ("Every finding validated…", "False positives eliminated before you see them"). Concrete CVE-2025-59536 mitigation replaced vague "Config protection hook guards your standards".
- **Concrete example added to 4-layer doc enforcement card** — `edit app/api/users.go → commit blocked until docs/architecture/api-reference.md is staged`.
- **Orphaned docs linked** — `CONTRIBUTING.md`, `EVALUATIONS.md`, `docs/recommendations.md` (162 lines of curated tooling) now appear in a new `📚 More` README section. Previously never referenced from README.
- **Install guide counts synced** — `docs/INSTALL-CLAUDE-CODE.md` stack list includes Frontend UI, extras list includes red-blue-auditor, hook/skill counts correct (22 core hooks + 19 stack/package; 67 → 72 Codex skills).

#### New user-facing documentation
- **`docs/FRONTEND-UI.md` (472 lines)** — full reference parallel to `FRONTEND-3D.md`. Agent dispatch matrix for all 6 specialists, per-rule scoping, full `reflex_fonts_to_reject` list, OKLCH + banned-pattern tables, Emil Kowalski's 4-question motion framework + cubic-bezier constants + duration table, hook trigger conditions with opt-out env vars, 4-stage `impeccable-craft` walkthrough, Next.js/Vite/Remix integration notes, 7 common false-positive cases with quiet-down tactics, Apache-2.0 attribution.
- **`docs/guide/14-frontend-ui.md` (241 lines)** — tutorial chapter parallel to Chapter 13. First UI review walkthrough (PricingCard with Inter + purple→blue gradient), auto-dispatch decision tree, `impeccable-craft` flow, troubleshooting with real opt-out env vars.
- **`docs/guide/15-env-vars-and-hook-profiles.md` (195 lines)** — single source of truth for every `CLAUDE_*` env var. Was a real discoverability gap: 9 `CLAUDE_DISABLE_*` opt-outs existed only as in-hook comments. Now documented: profile behavior table, per-hook opt-out table, setter recipes (one-shot / zshrc / direnv / GitHub Actions), scenario→flag mapping.

#### New features (competitor-inspired)
- **`packages/core/hooks/lib/profile.sh` + `CLAUDE_DISABLED_HOOKS`** — shared helper with `should_skip_hook()` function wired into all 37 shipping hooks (3 internal exempted). New env var `CLAUDE_DISABLED_HOOKS=hook1,hook2` disables specific hooks by basename without editing `settings.json`. `CLAUDE_HOOK_PROFILE=fast` now handled consistently (4 critical hooks stay on: `block-dangerous-git`, `security-patterns`, `audit-settings-source`, `doc-check-on-commit`). `lib/installer.js` updated to copy the helper into `.claude/scripts/hooks/lib/` on install. Regression test `profile-helper_test.sh` 5/5 pass. Inspired by affaan-m/everything-claude-code.
- **`packages/core/hooks/edit-streak-check.sh`** — detects 5+ consecutive Edit/Write without a Bash verification run. Advisory only (stderr warning, exit 0). Resets on any Bash call. Opt-out: `CLAUDE_DISABLE_EDIT_STREAK=1`. Regression test `edit-streak-check_test.sh` 6/6 pass. Inspired by gsd-build/gsd-2.
- **`tokens:` metadata in YAML frontmatter** — transparency signal (NOT a budget) across 48 agents + 13 skills + 20 rules = 81 files. Approximates body size at ~4 chars/token. Observed range: 72 (`project-architecture` skill) to 2928 (`interaction-polish` rule); agents median 1347. Kit philosophy preserved: specialist agents stay full-size because quality > brevity. New tooling: `bin/measure-tokens.js`, `bin/inject-tokens.js` for regeneration. Inspired by samber/cc-skills-golang.
- **AgentShield static SAST** — `packages/extras/red-blue-auditor.md` → directory with `agent.md` (prompt-engineered LLM auditor with new Phase 4 that invokes static scan), `scan.sh --exit-on-critical` (Bearer-style grep over 5 pattern files), `README.md` (CI integration examples), and `patterns/`: `secrets.txt` (16 patterns incl. OpenAI / Anthropic / AWS / GitHub / Slack / Telegram / Discord / Stripe / npm / JWT / SSH keys), `hook-injection.txt`, `permission-abuse.txt`, `mcp-risk.txt`, `agent-config.txt`. Exit 2 on CRITICAL for CI gating, 1 on HIGH/MEDIUM, 0 clean. Inspired by affaan-m/everything-claude-code AgentShield.
- **5 new Go references + Codex port** — `samber-do.md` (201 lines, DI container), `samber-oops.md` (200 lines, structured errors), `samber-lo.md` (260 lines, generic collection helpers), `grpc-patterns.md` (373 lines, service/stream/interceptor/TLS/bufconn), `benchmark-methodology.md` (277 lines, `testing.B` + benchstat + profile capture). Wired into `go-reviewer.md` reference-loading section. Ported as 5 self-contained Codex skills (`go-samber-do/oops/lo`, `go-grpc-patterns`, `go-benchmark`) with auto-activation triggers. Counts updated: 19 → 24 Go refs; 67 → 72 Codex skills. Inspired by samber/cc-skills-golang.

#### Contracts

- `CLAUDE_DISABLED_HOOKS` — comma-separated hook basenames (e.g. `CLAUDE_DISABLED_HOOKS=loop-guard,context-monitor`)
- `CLAUDE_DISABLE_EDIT_STREAK=1` — silences the edit-streak advisory
- `tokens: N` — optional YAML frontmatter field on agents/skills/rules; regenerate via `node bin/inject-tokens.js`
- `bash packages/extras/red-blue-auditor/scan.sh --exit-on-critical` — CI-ready SAST scan

---


### Added (Frontend UI package)
- **`packages/frontend-ui/`** — new self-contained package for 2D frontend UI design / polish, sibling to `frontend-3d/`. Philosophy: auto-dispatch agents + auto-loaded rules (no slash commands). Opt-in during install. Brand-context inferred from `CLAUDE.md` + `docs/architecture/` + auto-memory; one targeted mid-review question only when genuinely ambiguous; no upfront questionnaires.
  - **6 agents (all Opus):** `ui-reviewer` umbrella + 5 specialists — `ui-typography-reviewer`, `ui-color-reviewer`, `ui-motion-reviewer`, `ui-interaction-reviewer`, `ui-design-critic` (gestalt narrative critique). Each has explicit dispatch/no-dispatch rules in the `description` field so Claude picks the right specialist and avoids routing UI audits to `go-reviewer`.
  - **7 rules (path-scoped via `applyWhenPaths`):** `frontend-design-aesthetics`, `typography-guidelines` (4-step font-selection procedure + full `reflex_fonts_to_reject` list), `color-and-contrast` (OKLCH, tinted neutrals, theme-by-use-context decision table), `spatial-and-layout` (4pt scale, rhythm, container queries), `motion-and-animation` (4-question framework, custom cubic-bezier constants, duration table), `interaction-polish` (buttons / modals / drawers / forms / focus / loading / empty / microcopy), `ui-anti-patterns` (banned fonts / colors / layouts / motion / interactions).
  - **3 hooks (advisory, never blocking):** `ui-banned-fonts-check` (Inter / DM Sans / Fraunces / etc. detection), `ui-color-check` (pure `#000`/`#fff`, purple→blue gradients, gradient text, 3+ hsl without oklch), `ui-animation-easing-check` (`ease-in` on UI, `transition: all`, `scale(0)` entry, layout-property animation). Regression suites 9+12+13 = 34 tests, all passing.
  - **1 skill (`impeccable-craft`, user-invocable opt-in):** 4-stage shape-then-build flow (Shape → Refine → Implement → Polish) for creating UI from scratch with user check-ins at drift points.
  - **Codex port:** 7 equivalent skills under `packages/codex/skills/` — `frontend-ui-reviewer` (prefixed to avoid collision with existing `ui-reviewer`) + 5 specialists + `impeccable-craft`. Auto-activation rules updated in `packages/codex/AGENTS.md`.
  - **Attribution:** `packages/frontend-ui/NOTICE.md` credits [Impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0) for the rule content and [Emil Kowalski's skill](https://github.com/emilkowalski/skill) for idea-level adoption (prose re-expressed because the source has no LICENSE).
  - **Installer:** `lib/installer.js` adds the `Frontend UI? [y/N]` prompt and the `frontend-ui` entry in `SELF_CONTAINED_PACKAGES`. The existing `collectStackHooks` path handles self-contained hooks automatically; no `lib/settings-builder.js` changes required.
  - **Documentation:** counts table in root `CLAUDE.md` gains a Frontend-UI column; `README.md` badge updated from 43 → 49 agents; Codex count 60 → 67. `packages/codex/INSTALL.md` and `AGENTS.md` updated.
- **`packages/core/hooks/superkit-counts-verify.sh`** — internal counts-verify hook extended to recognise `frontend-ui/` in the self-contained-packages loop alongside `frontend-3d/`. TOTAL_AGENTS / TOTAL_HOOKS / TOTAL_RULES now include both.

### Changed (Opus 4.7 readiness)
- **README badge** — `Opus_4.6` → `Opus_4.7 (1M)`. The kit targets Anthropic's latest frontier model (Opus 4.7) with its 1M-token context window.
- **`packages/showcase/.claude/commands/commit.md`** — `Co-Authored-By` template bumped `Opus 4.6` → `Opus 4.7 (1M context)` so showcase commits reflect the current model.
- **`packages/core/hooks/compact-state-inject.sh`** — rolling window for post-compaction disciplinary summary widened `30 min` → `60 min`. With 1M context sessions run longer between compactions, so a 30-min slice was no longer representative of the active stretch. Message text + cutoff both updated.
- **`packages/core/CLAUDE.md` (user template) — Context Management** — softened: explicitly states Opus 4.7's 1M window makes compaction rare, so `.claude/.task-state.json` save-on-progress is only needed for unusually long sessions, not normal work.
- **`packages/core/CLAUDE.md` (user template) — Parallel Execution** — strengthened with Opus 4.7-specific guidance: aggressive parallelism recommended, added examples (parallel `Bash` for git status/diff/log, file-read + symbol-grep in parallel), explicit callout not to serialize out of caution.
- **`CLAUDE.md` (repo instructions)** — documented that `model: opus` is an alias that auto-routes to the latest Opus release (currently Opus 4.7, 1M context), so the kit picks up new Opus versions automatically without config churn.

### Fixed (critical)
- **Hooks reading `.command` / `.file_path` at the top level of the tool-input JSON** — Claude Code actually sends those fields under `.tool_input.<field>`, so every one of `doc-check-on-commit.sh`, `superkit-counts-verify.sh`, `config-protection.sh`, `security-patterns.sh`, and `loop-guard.sh` silently exited 0 on every invocation since inception. None of them have ever blocked a real commit or warned on a real edit. Every hook now reads `.tool_input.<field>` first with the legacy path as a fallback for defence-in-depth. Covered by `packages/core/hooks/tests/json-path_test.sh`.
- **`superkit-counts-verify.sh`** — after the JSON-path fix exposed it, the hook itself undercounted: its per-language loop missed the self-contained `packages/frontend-3d/` package (+4 agents / +4 hooks / +3 rules / +1 command) and its CLAUDE.md "Showcase Commands" parser pointed at the wrong column (Codex instead of Showcase). Counts now include self-contained packages, use `TOTAL_COMMANDS` in the GitHub-About comparison, and read Showcase from `sed -n '3p'`. Excludes internal-only hooks (superkit-counts-verify, verify-hooks) and internal rules (superkit-integrity) from the ship-totals so the numbers match what users actually see.

### Added
- **`audit-settings-source.sh` (SessionStart)** — mitigates [CVE-2025-59536](https://research.checkpoint.com/2026/rce-and-api-token-exfiltration-through-claude-code-project-files-cve-2025-59536/). A malicious `.claude/settings.json` committed to an untrusted repo can register a PreToolUse hook that runs arbitrary code the moment you open the project. The hook inspects git history on `.claude/settings.json`: if the last 10 commits contain any author other than your `git config user.email` within the last 7 days, it prints a loud stderr warning naming the offending commits and touches `${TMPDIR:-/tmp}/claude-untrusted-settings-<session>` so downstream hooks can downgrade decisions. Fails open everywhere. Opt-out via `CLAUDE_DISABLE_SETTINGS_AUDIT=1`.
- **`audit-trail.sh` (PostToolUse Bash + Edit|Write)** — hash-chained append-only audit log at `~/.claude/audit/YYYY-MM-DD.jsonl`. Each line carries `{ts, session_id, project, event, tool, field, tag, counter, marker_exists, prev_hash, hash}` where `hash = sha256(prev_hash || canonical_json_of_line_without_hash)`. Genesis hash is 64 zeros. Tamper detection: recomputing the chain exposes the first divergence. Opt-out via `CLAUDE_DISABLE_AUDIT_TRAIL=1`. Rotation of logs older than 30 days is queued for a follow-up.
- **`block-dangerous-git.sh` — stash-commit bypass patterns (Task 18).** Blocks three additional commit-gate bypass patterns proved out in [anthropics/claude-code#40117](https://github.com/anthropics/claude-code/issues/40117): stash-commit-stash-pop sandwich, `-q|--quiet` combined with `--no-verify`, `--amend --no-verify`. Each emits a targeted stderr message pointing at the underlying fix instead of offering a workaround.
- **`block-dangerous-git.sh` — structured "Suggested alternative" block responses (Task 19).** Every existing block message (`--no-verify`, `--force` push, `reset --hard`, `branch -D`) now carries a **Why** line plus concrete **Suggested alternative** commands — `--force-with-lease`, `stash push -u` before reset, `branch -d` for safe delete, etc. Gives Claude a reasoning path forward instead of a dead-end, without weakening any block.
- **`plan-completion-gate.sh` (PostToolUse Skill) + `doc-check-on-commit.sh` extension (Task 14).** When `superpowers:executing-plans` or `superpowers:writing-plans` finishes with a "plan complete" / "✅ done" / "Final report" signal in its output, the gate drops a marker at `${TMPDIR:-/tmp}/claude-plan-docs-pending-<session>`. The next code-changing commit must either stage a `docs/architecture/*` file OR include `[plan-docs-deferred: <plan-id>: <reason ≥15 chars>]` in the commit message. The marker is cleared once consumed so follow-up commits don't re-fire. Opt-out via `CLAUDE_DISABLE_PLAN_GATE=1`.
- **`user-intent-detect.sh` (UserPromptSubmit) + `dev-required-on-commit.sh` exception (Task 15).** When the user explicitly asks for a "quick fix" / "small tweak" / "tiny change" / "hotfix" etc. in chat, the hook drops `${TMPDIR:-/tmp}/claude-user-said-quick-<session>`. `dev-required-on-commit.sh` consumes that marker once to allow a bare `[quick]` tag without the ≥15 char rationale. The marker is single-use so subsequent commits still need rationale. Opt-out via `CLAUDE_DISABLE_INTENT_DETECT=1`.
- **`subagent-stop-validate.sh` (SubagentStop) — per-agent post-run checks (Task 16).** Reads `agent_type` + `last_assistant_message` from the SubagentStop payload. For `{go,ts,py,rs,code}-reviewer` — warns if CRITICAL findings are reported without "acknowledged" / "will fix" / "deferred". For `security-scanner` / `red-blue-auditor` — warns on any HIGH/CRITICAL finding with a "do not merge until resolved" message. For `test-generator` — warns if the message says "Generated N tests" with no evidence they were executed. Advisory only (exit 0) — a hard block requires an acknowledgement workflow (follow-up).
- **`compact-state-inject.sh` (SessionStart matcher "compact") — disciplinary state survives compaction (Task 21).** After the conversation compacts, in-memory counter / marker state is wiped. The hook reads the last 30 minutes of `~/.claude/audit/*.jsonl` filtered by `session_id`, counts override tags and `/dev` marker entries, and emits a `{hookSpecificOutput:{hookEventName:"SessionStart", additionalContext:"…"}}` summary ≤200 chars so Claude knows the budget standing after rehydrating. Silent when there's nothing noteworthy. Opt-out via `CLAUDE_DISABLE_COMPACT_STATE=1`.
- **`packages/core/hooks/CHAIN-SEMANTICS.md` + scaffolding** under `tests/chain-semantics/` — Task 25 prerequisite. Documents Anthropic's "hooks run in parallel" statement, a local sequential-vs-parallel simulation (`run-experiment.sh`), a reproducible procedure to verify the scheduler against real Claude Code, and the defensive design contract every hook now follows (idempotent, decision independent of peer exit codes, atomic writes, cosmetic settings.json order, explicit timeouts).
- **`dev-required-on-commit.sh` — anti-reset cycle detection (Task 11).** New long-lived state at `~/.claude/state/dev-cycles-<session>.jsonl` logs one line per allow path (`allow-under-threshold`, `allow-with-dev`, `allow-override`). Before deciding, the hook queries the last 60 minutes: `≥ 2` override cycles → threshold drops from 3 to 2 (stricter); `≥ 3` consecutive override cycles → override path DISABLED for the remainder of the session; `/dev` required unconditionally until the cycles log is cleared. At cycle #1 a stderr warning nudges toward `/dev`. Closes the "3 edits → `[quick]` → reset → repeat" bad-faith loop.
- **`dev-required-on-commit.sh` — override budget + structured rationale (Task 12).** Overrides now require real justification: `[quick]` / `[no-dev]` / `[trivial]` need a `: <reason ≥15 chars>`; `[hotfix]` needs either a ticket ID (`#123` or `ABC-123`) or `no-ticket: <reason ≥15 chars>`; `[wip]` is forbidden on `main` / `master` / `prod*` branches. A rolling budget of max 2 overrides per 30 min is enforced by querying `~/.claude/audit/*.jsonl` — the third override in the window is blocked with a clear message. Regression suite grew 5 new cases (G..K); 11/11 pass.
- **`/dev` hard-enforcement — three cooperating hooks.** Closes Layer 3 of the docs-enforcement chain, which until now was advisory-only.
  - `dev-edit-counter.sh` (PostToolUse Edit|Write|MultiEdit) — increments `${TMPDIR:-/tmp}/claude-edit-count-<session_id>` on each code-file edit (tests, docs, memory, `.claude/`, configs ignored).
  - `dev-marker-set.sh` (UserPromptSubmit + PreToolUse Skill) — touches `${TMPDIR:-/tmp}/claude-dev-marker-<session_id>` when the user types `/dev …` (word-bounded, so `/develop`, `/device`, `/devops` do NOT trigger) OR Claude invokes `Skill({skill: "dev"})` / any `:dev$` namespace variant.
  - `dev-required-on-commit.sh` (PreToolUse Bash) — blocks `git commit` (including `git -C <path> commit`) with `exit 2` if counter ≥ 3 AND no marker AND no override tag. Overrides: `[quick]`, `[no-dev]`, `[trivial]`, `[hotfix]`, `[wip]`. Docs-only commits are exempt.
  - Wired in `packages/core/settings.json` across PreToolUse (Bash + Skill), PostToolUse (Edit|Write), and UserPromptSubmit.
- **Regression test suites** under `packages/core/hooks/tests/` (`doc-check-on-commit_test.sh` · 7 cases, `dev-required-on-commit_test.sh` · 6 cases, `json-path_test.sh` · 6 checks, plus `run-all.sh` aggregator).

### Changed
- **`doc-check-on-commit.sh`** — explicit exclusion list that can NEVER satisfy an architecture-doc requirement: `docs/superpowers/plans/**`, `docs/superpowers/specs/**`, `docs/superpowers/research/**`, `memory/**`, `CHANGELOG*`, `HISTORY.md`, `docs/active-plans-archive.md`. Checked BEFORE the generic `docs/*|*.md` fallthrough so a plan named `foo-database-schema.md` cannot falsely set `HAS_DB_SCHEMA=true`.
- **`doc-check-on-commit.sh` — adversarial audit fixes:** matcher now catches `git -C <path> commit` (previously the hook ran `git diff --cached` in the shell cwd and saw an empty STAGED); `-a` / `--all` matcher anchored so `--allow-empty` / `--author` no longer mis-trigger; tree-doc requirement for `app/middleware/jobs/workers/cmd/repo` paths now fires only for NEW files (modifications don't change the tree).
- **`doc-check-on-commit.sh` — coverage extension:** `*/jobs/**`, `*/workers/**`, `*/cmd/**` → backend-layers + tree-docs (if new); `*/repo/**` NEW files → tree-docs.
- **`packages/core/rules/documentation.md`** — three new sections: "What CANNOT satisfy the doc requirement", "Historical bug (fixed 2026-04-14)", "Coverage of the path-to-doc map".
- **`packages/core/rules/dev-workflow.md`** — new "Enforcement (hard-block)" section describing the three-hook `/dev` enforcement system, state files, override tags, and exempt paths.
- **Hook counts** — core hooks 13 → 16 user-facing (18 including internal), total hooks 26 → 29. README "What's Inside" and Codex comparison updated; GitHub About description synced.
- **Frontend 3D agents** — replaced ad-hoc `## Before Review` section with the conventional `## Phase 0: Load Project Context` across all four agents (`presentation-reviewer`, `r3f-scene-reviewer`, `ui-design-reviewer`, `frontend-perf-reviewer`). Each agent now explicitly reads `CLAUDE.md`, `docs/architecture/*.md`, and relevant rules before review, matching core-agent conventions.
- **`lib/codex.js`** — guarded `config.toml` copy against a missing source file and unified the call through the `copyFile` utility, so the installer now respects the chosen mode (merge/overwrite/fresh) and prints a clear warning instead of crashing when the Codex package is incomplete.
- **`lib/settings-builder.js`** — dedupes stack hook entries before writing `settings.json`, and refuses to re-add a hook that is already wired in the base settings. Prevents duplicate `PostToolUse` invocations if a hook file ever appears in multiple stack packages. Covered by two new unit tests.
- **`bin/cli.js`** — `main()` invocation now has an explicit `.catch` handler, so any async error bubbling past the inner try/catch prints a clean message (stack in `DEBUG` mode) and exits 1 instead of triggering Node's default `UnhandledPromiseRejection` dump.
- **`lib/installer.js`** — install summary now computes the rules and skills count from the copy results instead of printing the hardcoded `Rules: 7` / `Skills: 5 + packages`, so the line stays accurate when stack rules, frontend-3d rules, or additional core rules ship with the toolkit.
- **`loop-guard.sh`** (core + showcase copy) — log path now honors `$TMPDIR` and falls back to `/tmp`, so the hook works on environments where `/tmp` isn't writable (sandboxed macOS contexts, Windows via WSL where `TMPDIR` points elsewhere).

### Changed
- **README — Frontend 3D section** — replaced the two-column 2×2 tables (Agents/Skills and Hooks/Rules) with single-column bullet lists per category. Much easier to scan on mobile and scales past 4 items per group without breaking the grid.
- **README — External design & asset resources** — new collapsible section (under Frontend 3D) grouping five curated resources: [React Bits](https://reactbits.dev) (open-source React components), [Unicorn.Studio](https://www.unicorn.studio) (no-code WebGL), [Cosmos](https://www.cosmos.so) (visual moodboards), [Free Faces](https://www.freefaces.gallery) (free fonts), and [Pixolite](https://pixolite.ru) (free 3D assets). The existing community skill packs and `gsap-master` MCP server are consolidated into the same block so there's one place to look for frontend resources.
- **README — `/dev` flow diagram** — replaced the mermaid block (which rendered a flat `P→E→Q` graph with empty-string edge labels) with a hand-authored SVG at `docs/dev-flow.svg`. Three pastel phase cards (Planning / Execution / Quality) list all 15 numbered steps with monospaced numbers for alignment, connected by two minimal arrows between phase headers — no per-step arrows, no redundant dashed lines. Subtle drop-shadow, gradient canvas, aligned typography (SF Mono for commands and numbers, system sans for labels).
- **README — resource sections reorganized** — "External Design & Asset Resources" and "Recommended Companion Tools" are now proper `###` headings (not tiny `<summary>` labels). SkillsMP and 21st.dev moved from the generic "Repos & Platforms" table into the design-focused block, and the one-row "Ecosystem & Companions" section (cc-skills-golang) was merged into Companion Tools under "Language-specific skill packs" so the two stray one-item sections no longer exist.

## [1.3.8] — 2026-04-09

### Added
- **`packages/frontend-3d/` package** — self-contained frontend/3D/animation development toolkit
- **`presentation-reviewer` agent** — 16-check review for scroll-driven sections: GSAP ScrollTrigger, phone frame conventions, combined sections, 3D textures
- **`r3f-scene-reviewer` agent** — 15-check review for R3F/Three.js: color management, performance, GLB handling, R3F patterns
- **`ui-design-reviewer` agent** — 16-check anti-slop UI review: typography, color calibration, layout diversity, motion quality, interactive states, glassmorphism
- **`frontend-perf-reviewer` agent** — 12-check performance review: bundle size, lazy loading, CSS containment, web vitals
- **`gsap-pattern-check.sh` hook** — 5 GSAP anti-pattern checks on .tsx files (scrub type, invalidateOnRefresh, tl.set extension, context, imports)
- **`r3f-color-check.sh` hook** — 4 Three.js color management checks (deprecated encoding, colorSpace, material type, toneMapped)
- **`tailwind-version-guard.sh` hook** — Tailwind v3 vs v4 syntax mismatch detection
- **`bundle-size-warn.sh` hook** — heavy package import detection (moment, lodash, THREE, chart.js, MUI, antd, framer-motion)
- **`threejs-color-management` skill** — sRGB vs Linear workflow, toneMapping, texture colorSpace, debug checklist
- **`r3f-scroll-driven-3d` skill** — GSAP ScrollTrigger → Zustand → R3F useFrame bridge pattern
- **`gltf-debugging` skill** — runtime GLB inspection: traverse, UV, material dump, texture replacement
- **`html-to-3d-texture` skill** — capture HTML/React as PNG for 3D (Playwright, html2canvas, CanvasTexture)
- **`product-3d-lighting` skill** — studio lighting setups for dark/light product showcases
- **`output-enforcement` skill** — anti-laziness: bans // ..., TODO, placeholder patterns
- **`gsap-conventions` rule** — scrub number, invalidateOnRefresh, tl.set, context cleanup, phase objects
- **`threejs-conventions` rule** — meshBasicMaterial for screens, UV settings, useFrame performance
- **`frontend-aesthetics-3d` rule** — anti-center bias, spring physics, 3D atmosphere, scroll-driven 3D
- **`/capture-screen` command** — capture React components as PNG textures for 3D model screens
- **`docs/guide/13-frontend-3d.md`** — guide chapter with installation, components, workflows
- **`docs/FRONTEND-3D.md`** — complete reference catalog with all checklists and troubleshooting
- **10 Codex skills** — all frontend-3d agents and skills ported to Codex CLI (50 → 60 total)

### Changed
- **Installer** — "Frontend 3D" added to stack selection, self-contained package support (`packages/{name}/` pattern)
- **`settings-builder.js`** — `collectStackHooks` supports dual path patterns for self-contained packages
- Stack agents: 9 → **13** (+4 frontend-3d)
- Commands: 15 → **16** (+capture-screen)
- Stack hooks: 9 → **13** (+4 frontend-3d)
- Stack rules: 2 → **5** (+3 frontend-3d)
- Skills: 5+1 → **5+6+1** (+6 frontend-3d knowledge skills)
- Codex skills: 50 → **60** (+10 frontend-3d)

## [1.3.7] — 2026-04-07

### Added
- **`/pair` command** — AI pair programming with 5 modes: Driver, Navigator, TDD Ping-Pong, Review, Debug. Session management with switch/pause/resume
- **`statusline.cjs` helper** — Claude Code status bar showing hook profile, stacks, git, migrations, counts. Pure Node.js, no deps
- **`writing-hooks` skill** — comprehensive hook authoring guide: lifecycle events, exit codes, profiles, best practices
- **Pseudocode phase (Phase 1.7)** in `/dev` — validate core algorithm before plan (complex tasks only)
- **Enhanced context persistence** — pre-compact-save captures arch decisions, plans, review findings, issues. session-context-restore injects them
- **`packages/core/helpers/`** — new directory for runtime helper scripts
- **Go Agents:** go-error-reviewer, go-concurrency-reviewer, go-performance-reviewer, go-modernizer, go-observability-reviewer
- **Go Hooks:** go-error-check-on-edit, go-context-check-on-edit, go-safety-check-on-edit, golangci-lint-on-edit
- **Go Rules:** go-conventions, go-safety (new `packages/stack-rules/go/` directory)
- **Commands:** /benchmark for Go benchmarks with benchstat comparison
- **Reference Docs:** 19 Go knowledge documents in `packages/stack-agents/go/references/`
- **EVALUATIONS.md:** Framework for measuring agent effectiveness
- **Ecosystem:** Recommended cc-skills-golang as companion plugin
- **All stack reviewers:** Added `AskUserQuestion` to allowed-tools
- **`superkit-counts-verify.sh`** — rewritten with 15+ comprehensive checks
- **`doc-check-on-commit.sh`** — detects new dependencies, blocks commit without README/CLAUDE.md

### Changed
- **go-reviewer:** Expanded checklist from 12 to 20 points, audit mode, cross-references
- **All stack reviewers:** Persona framing and operating modes (Coding/Review/Audit)
- **security-scanner:** 6 Go-specific security checks
- **security-patterns.sh:** Expanded Go detection
- **database-reviewer, test-generator, dependency-checker, debug-observer, architect:** Go patterns
- `/dev` orchestrator: 14 → **15 phases** (+pseudocode)
- Core commands: 13 → **15** (+benchmark, +pair)
- Core skills: 4 → **5** (+writing-hooks)
- Stack agents: 4 → **9** (+5 Go specialists)
- Stack hooks: 5 → **9** (+4 Go hooks)
- Stack rules: 0 → **2** (+go-conventions, +go-safety)
- Codex skills: 44 → **50** (+6 new Go + benchmark skills)
- `settings.json`: added `statusLine` configuration
- `installer.js`: copies statusline helper, updated skill count display

### Fixed
- **`bin/cli.js`** — version was hardcoded as '1.3.3', now reads from package.json dynamically
- **`settings.json`** — removed fork bomb deny rule that broke JSON parsing
- **`superkit-counts-verify.sh`, `evolve-check.sh`** — replaced `grep -P` (macOS incompatible) with POSIX `grep -oE`
- **`format-on-edit.sh`** — renamed to `go-format-on-edit.sh` to prevent overwriting core hook
- **Showcase counts** — fixed various stale count references

### Removed
- **`user-prompt-context.sh`** — removed UserPromptSubmit hook that duplicated built-in git status, caused timeout errors

---

## [1.3.6] — 2026-03-30

### Added
- **`frontend-aesthetics.md` rule** — path-scoped proactive anti-slop for frontend: typography, color, motion, AI pattern red flags. Activates only for .tsx/.jsx/.vue/.svelte/.css/.scss
- **`security-patterns.sh` hook** — PostToolUse real-time detection of eval(), innerHTML, pickle, os.system, fmt.Sprintf in SQL, GitHub Actions injection. Based on Anthropic official security-guidance plugin
- **`comment-rot-analyzer` agent** — detect stale TODOs (>6mo), lying comments, dead references, outdated API docs
- **`silent-failure-hunter` agent** — find swallowed errors: empty catches, `_ = err`, `2>/dev/null`, `|| true`, bare `except:`, linter suppressions across Go/JS/TS/Python/Bash
- **Confidence scoring formula** in code-reviewer — numerical 0-100 scale (start at 50, adjust per factor), threshold >=80 for high-confidence findings
- **Confidence distribution** in /review report — breakdown by HIGH (80-100) / MEDIUM (60-79) / LOW (<60, filtered)
- **Anti-hallucination rule** in coding-style — investigate before answering, verify packages exist, don't invent APIs
- **Surgical Changes principle** in coding-style — change only what was requested, no drive-by refactoring
- **Parallel Execution guidance** in coding-style — batch independent tool calls
- **Context awareness** in CLAUDE.md template — don't stop early, save progress before compaction
- **Subagent control** in CLAUDE.md template — when to use subagents vs direct work
- **Compaction recovery validation** — pre-compact validates save, session-restore validates JSON
- **Codex skills** — comment-rot-analyzer + silent-failure-hunter (Codex equivalents)

### Changed
- **`security.md` rule** — path-scoped: activates only for code/infra files, not docs
- **`/review` command** — dispatches comment-rot-analyzer + silent-failure-hunter, confidence breakdown in report
- **`code-reviewer` agent** — numerical 0-100 confidence with calculation formula
- Core agents: 25 → **27** (+comment-rot-analyzer, +silent-failure-hunter)
- Core hooks: 13 (+2 internal) → **14** (+security-patterns) (+2 internal)
- Core rules: 6 (+1 internal) → **7** (+frontend-aesthetics) (+1 internal)
- Codex skills: 42 → **44** (+comment-rot-analyzer, +silent-failure-hunter)

---

## [1.3.5] — 2026-03-29

### Added
- **`evaluator` agent** — calibrated QA evaluator: scores implementation against Sprint Contract criteria (0-10 with few-shot anchors), MUST/SHOULD priorities, structured critique with trend tracking across passes
- **Phase 2.1 (Sprint Contract)** in `/dev` — testable acceptance criteria generated BEFORE coding. 5-10 criteria for standard tasks, 10-20 for complex
- **Phase 3.5 (Evaluate + Iterate)** in `/dev` — conditional GAN loop: evaluator checks contract, iterates on FAIL (max 2 passes standard, 3 complex), escalates to architect if scores plateau
- **Design Quality dimension** in visual-reviewer — coherent whole vs assembled parts, calibrated 1-10 with score anchors
- **Originality dimension** in visual-reviewer — custom decisions vs AI template defaults, red flag detection (purple gradients, uniform cards, shadow-everything)
- **AI UI pattern detection** in ai-slop-cleaner — Category 6: detects AI-generated interface patterns in frontend code
- **Task state persistence** — pre-compact-save includes `.claude/.task-state.json`, session-context-restore injects it for multi-session /dev continuity
- **Cost metrics** in Phase 8 Report — agent dispatch count, evaluation passes, sprint contract score
- **Codex evaluator skill** — Codex equivalent of evaluator agent

### Changed
- **`/dev` phases**: 12 → **14** (+Sprint Contract, +Evaluate+Iterate)
- **Phase 1 complexity assessment** — enhanced with novelty, risk, and ambiguity factors (not just file/line count)
- **visual-reviewer** scoring — 8 → **10** dimensions (total stays 100pts, weights redistributed)
- Core agents: 24 → **25** (+evaluator)
- Codex skills: 41 → **42** (+evaluator)
### Added (post-audit)
- **`superkit-integrity.md` rule** — superkit-internal (not installed to user projects): 4-step verification before every commit
- **`superkit-counts-verify.sh` hook** — superkit-internal: blocks commit/push when VERSION != package.json or counts mismatch
- **Installer exclude lists** — superkit-internal rules and hooks are excluded from user installations (`copyDir` exclude parameter)
- **`.claude/settings.json`** for superkit repo — registers superkit-counts-verify.sh locally

### Fixed (post-audit)
- **package.json** version 1.3.3 → 1.3.5 (was out of sync with VERSION)
- **CLAUDE.md** structure comment: 24 → 25 agents
- **docs/guide/02-architecture.md**: 12-phase → 14-phase
- **docs/guide/01-getting-started.md**: jq → Node.js dependency, `bash setup.sh` → `npx`
- **docs/INSTALL-CLAUDE-CODE.md**: 41 → 42 Codex skills
- **docs/guide/10-codex-support.md**: 29 → 30 agent skills
- **packages/codex/INSTALL.md**: dev-orchestrator full 14-phase list

---

## [1.3.4] — 2026-03-29

### Changed
- **`/dev` command** — always-on: triggers automatically for all code tasks. Removed Quick Mode (`--quick`), removed Phase 3.5 (AI Slop Cleanup), removed Ambiguity Gate from Phase 1. Phase 6.5 (Critic) retained as independent evaluator
- **`dev-workflow.md` rule** — simplified to always-on: all code tasks trigger `/dev`, Phase 1 complexity assessment handles depth
- **`/dev` phases**: composition changed — removed Slop Cleanup, surfaced Goals in summary (still 12 phases)
- **Showcase `dev.md`** — synced with core: added Phase 6.5 (Critic)
- **Showcase `dev-workflow.md`** — synced with core: always-on
- **setup.sh → npx** — installer rewritten from 593-line bash to Node.js CLI. Install via `npx claude-code-superkit`. Zero external dependencies (no jq required). Works on macOS (any bash/zsh), Linux, and Windows
- **setup.sh** — now a 5-line POSIX sh wrapper that delegates to Node.js
- **`--defaults` flag** — non-interactive mode for CI/CD (`npx claude-code-superkit --defaults`)
- **CLI flags** — `--stacks=`, `--profile=`, `--extras=`, `--codex`, `--no-docs`, `--no-superpowers`
- **Graceful pipe handling** — if stdin closes during interactive mode, auto-falls back to `--defaults`

### Fixed
- **CRITICAL: `doc-check-on-commit.sh`** — bash `case` doesn't support `**` globs. Patterns like `*/src/**/*.tsx` only matched ONE level, silently skipping deeply nested files. Refactored to `in_dir()` helper using grep — works at ANY nesting depth with no hardcoded level limit. Hook was effectively broken for most project files
- **`user-prompt-context.sh`** — POSIX sh compatible, safe JSON via `node JSON.stringify()`, multiline git output flattened
- **`doc-check-on-commit.sh`** — expanded to 15+ doc category mappings (191→299 lines)
- **`/dev` threshold** — lowered from 100 to 50 changed lines for auto-trigger
- **Hook git-ignore protection** — Added `verify-hooks.sh` script, installer validation, and TROUBLESHOOTING guidance for the critical bug where `.gitignore` blocking `.claude/scripts/` silently disables all enforcement for cloned repos
- **Silent failures on macOS** — Bash 3.2 + `set -euo pipefail` caused script to exit without error message
- **Bash 3.2 incompatibility** — empty arrays + `set -u` triggered unbound variable errors
- **`pipefail` + `ls | wc -l`** — false errors when counting files
- **`cd` in tree fallback** — changed working directory unexpectedly
- **zsh users** — running `zsh setup.sh` crashed on `BASH_VERSINFO`
- **jq dependency removed** — JSON assembly now native in Node.js

### Added
- **`loop-guard.sh` hook** — PreToolUse: detects 3x repeated identical tool calls and A→B→A→B alternating patterns
- **`/workflow` command** — 6 predefined templates: bugfix, hotfix, spike, refactor, dep-upgrade, security-audit
- **`verify-hooks.sh`** — validates hooks are tracked in git, executable, not blocked by .gitignore
- **Codex INSTALL.md** — git-tracking warning for AGENTS.md and config.toml
- `package.json` — npm package for `npx claude-code-superkit`
- `bin/cli.js` — CLI entry point with argument parsing
- `lib/` — modular Node.js installer (installer, prompts, settings-builder, superpowers, docs-scaffold, codex, validator, utils)
- `test/` — unit tests (utils, settings-builder) + smoke test (full --defaults flow)
- Windows support (via Node.js)

---

## [1.3.3] — 2026-03-26

### Added
- **`/superkit-init` command** — 5-phase intelligent project setup: scan codebase → generate filled architecture docs → configure rules with real paths → validate → commit. Supports `--non-interactive` flag and scaffold mode for empty projects
- **`/superkit-evolve` command** — incremental drift detection: migration counter, missing docs, stale trees, broken rule paths. Supports `--fix-all` flag
- **`project-scanner` skill** — codebase introspection patterns for language/framework/database/structure/component detection
- **`evolve-check.sh` hook** — SessionStart advisory: checks documentation drift every 24h, suggests `/superkit-evolve` if issues found
- **`superkit-update.sh` hook** — SessionStart auto-update: pulls latest superkit, re-copies agents/commands/hooks/rules/skills every 6h
- **`.superkit-meta`** — setup.sh saves source path + stacks + profile for auto-updates
- **Scaffold Mode** — `/superkit-init` on empty projects asks for stack, creates minimal CLAUDE.md with smart hints

### Changed
- **`/docs-init`** — now redirects to `/superkit-init` (fallback kept for older versions)
- `setup.sh` — suggests `/superkit-init` after file installation, saves `.superkit-meta` for auto-updates
- Commands: 11 → **13** (+superkit-init, +superkit-evolve)
- Hooks: 11 → **13** (+evolve-check, +superkit-update)
- Skills: 3 → **4** (+project-scanner)

---

## [1.3.2] — 2026-03-26

### Breaking Changes
- **`doc-check-on-commit.sh`** — now **BLOCKS** commits (exit 2) when code changes lack documentation updates. Previously advisory-only (exit 0). Commits with code changes now REQUIRE corresponding docs staged alongside

### Added
- **`auto-commands.md` rule** — "Documentation — Auto Verify Before Commit" as highest priority auto-trigger. Runs 15-point checklist before every git commit
- **Smart file-to-doc mapping** in doc-check hook — analyzes staged files and determines exactly which documentation files must be staged (migrations → database-schema, handlers → API reference, frontend src → frontend docs, new files → tree docs)
- **Subagent delegation template** in documentation rule — explicit instructions for dispatching subagents with complete doc file lists
- **Dual-repo sync advisory** — hook warns when `.claude/` infrastructure changes, reminding to sync upstream

### Changed
- **`doc-check-on-commit.sh`** — rewritten with smart mapping. Generalized for any project (no app-specific paths in core; full TGApp version in showcase)
- **`documentation.md` rule** — upgraded from 8-point checklist to **15-point** trigger-to-doc mapping table with explicit file paths. 3-layer → 4-layer enforcement (+ auto-commands rule)
- **`docs/guide/05-writing-hooks.md`** — updated doc-check description to reflect smart mapping and blocking behavior
- **`docs/guide/07-writing-rules.md`** — "Five Default Rules" → "Six" (+ auto-commands), updated documentation rule to mention 15-point checklist

### Codex CLI Sync
- **4 new skills**: ai-slop-cleaner, critic, visual-reviewer, tree-generator (37 → 41 total)
- **dev-orchestrator**: 8 → 12 phases (+Architect, +Validate, +Slop Cleanup, +Goals, +Critic)
- **commit-helper**: git trailers (Confidence, Scope-risk, Not-tested)
- **AGENTS.md**: 15-point doc checklist + 4-layer enforcement rules
- Codex skills: 37 → **41**
- Dev phases: 8 → **12** (aligned with Claude Code /dev)

---

## [1.3.1] — 2026-03-26

### Added
- **ai-slop-cleaner** agent — detect and fix AI-generated code patterns (redundant comments, unnecessary abstractions, over-engineering, template slop)
- **critic** agent — multi-perspective final quality gate (security, new-hire, ops) with gap analysis and predictions
- **visual-reviewer** agent — UI consistency scoring, design system compliance check (score 0-100)
- **Ambiguity Gate** in /dev Phase 1 — 5-dimension clarity check before planning, asks user if 2+ dimensions unclear
- **Phase 3.5 AI Slop Cleanup** in /dev — automatic cleanup pass after implementation
- **Phase 6.5 Critic** in /dev — final quality gate for complex tasks (5+ files)
- **Git trailers** in /commit — Confidence, Scope-risk, Not-tested metadata for non-trivial commits
- **Phase 0.5 Spec Compliance** in code-reviewer — verify implementation matches requirements before quality review

### Changed
- **debug-observer** — added circuit breaker: 3 failed fixes → escalate to architect
- **code-reviewer** — added Phase 0.5 spec compliance check before code quality review
- **/dev** — now 12 phases (was 10): +Phase 3.5 Slop Cleanup, +Phase 6.5 Critic, +Ambiguity Gate in Phase 1
- Core agents: 21 → **24** (+ai-slop-cleaner, +critic, +visual-reviewer)
- **`doc-check-on-commit.sh`** — now **BLOCKS** commits (exit 2) instead of warning (exit 0) when code changes lack documentation updates
- **`documentation.md` rule** — enforcement upgraded from 3 layers to **4 layers** (+auto-commands.md as highest-priority trigger)
- **`auto-commands.md` rule** — added "Documentation — Auto Verify Before Commit" as highest priority auto-trigger
- **`docs/guide/07-writing-rules.md`** — updated from "Five Default Rules" to **Six** (+auto-commands.md)

---

## [1.3.0] — 2026-03-25

### Added
- **`/workflow` command** — predefined workflow templates: bugfix, hotfix, spike, refactor, dep-upgrade, security-audit
- **`/dev --quick` mode** — lightweight dev cycle skipping architect, plan validation, goal verification, docs phases
- **`/audit --health` mode** — quick health dashboard dispatching only health-checker (~30s vs ~5min)
- **`loop-guard.sh` hook** — PreToolUse detection of repeated identical tool calls and A→B→A→B alternating loops
- **Anti-anchoring scan** in code-reviewer — Phase 1.5: grep anti-patterns before reading code to prevent anchoring bias
- **Forensics phase** in debug-observer — Phase 7: scientific method (hypothesis → experiment → verify) with READ-ONLY investigation
- **Reconnaissance phase** in architect — Phase 0 expanded: codebase scan + structured handoff output for other agents
- **Safe upgrade strategy** in dependency-checker — rollback planning, upgrade ordering, blast radius estimation
- **Mitigation roadmap** in security-scanner — Phase 3: prioritized fix plan (immediate/short/medium/long-term)
- **Auto-fix recommendations** in health-checker — check 10: concrete fix suggestions for each unhealthy check
- **Enhanced config-protection** — .env file warnings + DECISIONS.md append-only enforcement
- **`auto-commands.md` rule** — auto-triggers for /review, /test, /lint, /audit --health, /security-scan based on file count, change type, and sensitivity
- **`superkit-meta-check.sh` hook** (superkit-internal, not distributed) — pre-commit validation of counts consistency across README, CLAUDE.md, setup.sh, docs/INSTALL
- **Plugin auto-configuration** — setup.sh enables 4 base plugins (superpowers, github, context7, code-review) + 3 optional (code-simplifier, playwright, frontend-design)
- **`enabledPlugins`** in core settings.json — base plugins enabled out of the box

### Changed
- `settings.json` — added loop-guard.sh to PreToolUse hooks + enabledPlugins section
- `setup.sh` — 4-step installer (was 3): +Plugin Selection with base/optional split
- `setup.sh` — improved post-install instructions with plugin install reminder

---

## [1.2.0] — 2026-03-25

### Added
- **Phase 1.5 (Architect)** in `/dev` — dispatches architect agent for complex tasks (5+ files)
- **Phase 2.5 (Validate Plan)** in `/dev` — plan-checker validates before execution
- **Phase 5.5 (Verify Goals)** in `/dev` — goal-verifier checks 4-level substantiation
- **database-reviewer** in `/dev` Phase 6 — dispatched for migrations + repo files
- **docs-reviewer** in `/dev` Phase 7 — verifies documentation completeness
- **Complexity routing** — simple tasks skip validation phases, complex tasks get architect

### Changed
- `/dev` now has 10 phases (was 8): +Phase 1.5 Architect, +Phase 2.5 Validate, +Phase 5.5 Goals
- Phase 8 Report now shows all phases with status table
- Phase 6 Review dispatch table: added database-reviewer for SQL + repo files
- Superkit CLAUDE.md added with project structure, counts, conventions

---

## [1.1.0] — 2026-03-25

### Added
- **database-reviewer** agent — PostgreSQL specialist (EXPLAIN ANALYZE, indexes, anti-patterns, schema design)
- **architect** agent — System design advisor (trade-offs, scalability, patterns)
- **docs-reviewer** agent — Merged docs-checker + doc-updater: freshness, accuracy, coverage in one agent
- **plan-checker** agent — 8-dimension plan validation before execution (from GSD research)
- **goal-verifier** agent — 4-level goal substantiation: exists → substantive → wired → data-flow
- **context-monitor** hook — Warns at 75% and 90% context window usage
- **config-protection** hook — Warns when modifying linter/formatter configs
- **doc-check-on-commit** hook — PreToolUse warning before git commit without doc updates
- **SkillsMP search** skill — Search 500K+ community skills (requires API key)
- **Superpowers auto-install** in setup.sh — clones from GitHub, registers in plugin cache
- **Post-install validation** — checks settings.json, hook permissions, CLAUDE.md, agent count
- **Double-verification /review** — findings validated by independent agents
- **--comment flag** for /review — posts inline comments on GitHub PRs
- **3-layer documentation enforcement** — rule + PreToolUse hook + opus Stop hook
- **Plan completion gate** — docs must be updated before any plan is marked complete
- **TROUBLESHOOTING.md** — common issues, platform guidance, FAQ
- **docs/INSTALL-CLAUDE-CODE.md** — detailed installation guide
- **--help / --version** flags in setup.sh
- **Badges** in README (stars, license, model)
- **Phase 0** added to all 21 showcase agents
- **VERSION** and **CHANGELOG.md** files

### Changed
- All agents upgraded to **Opus** model (was sonnet)
- All docs/examples: sonnet references → opus
- Codex model: `o3` → **gpt-5.4** with **extra_high** reasoning
- Codex install: symlink → copy (survives superkit removal)
- /dev workflow threshold: 3+ files → **2+ files or 100+ lines**
- Stop hook: haiku → **opus** (60s timeout)
- Core hooks: 7 → **10** (+doc-check-on-commit, +config-protection, +context-monitor)
- Core agents: 17 → **21** (+database-reviewer, +architect, +docs-reviewer, +plan-checker, +goal-verifier, merged docs-checker+doc-updater)
- Codex skills: 33 → **37**
- Rules count display: 4 → **5**
- README: platform-specific install sections, What's New, badges
- Codex INSTALL.md: 16 agent skills → 21 (total 33 → 36)
- setup.sh: Codex section copies files instead of symlinking
- setup.sh: config.toml always overwritten to ensure latest model

### Fixed
- setup.sh: error handling in copy functions (was silent failure)
- setup.sh: JSON backup/rollback for installed_plugins.json + settings.json
- setup.sh: hooks executable in merge mode (find + chmod)
- README: manual copy paths (added $SUPERKIT variable)
- README: missing commands in Key Commands table
- Showcase: missing documentation.md rule
- Showcase: onyx-ui-standard SKILL.md missing frontmatter
- Codex INSTALL.md: skill count mismatch (16 → 21 actual)
- Codex config.toml: removed stale model_reasoning_effort for o3

## [1.0.0] — 2026-03-24

### Initial Release
- 17 core agents (code-reviewer, security-scanner, test-generator, audit-*, health-checker, etc.)
- 4 stack agents (Go, TypeScript, Python, Rust reviewers)
- 3 extra agents (bot-reviewer, design-system-reviewer, red-blue-auditor)
- 10 commands (/dev, /review, /audit, /test, /lint, /commit, /migrate, /new-migration, /docs-init, /security-scan)
- 7 core hooks + 5 stack hooks + Stop verification
- 5 rules (coding-style, security, git-workflow, documentation, dev-workflow)
- 3 skills (project-architecture, writing-agents, writing-commands)
- Interactive setup.sh installer with stack/profile selection
- Codex CLI support (33 skills, AGENTS.md, config.toml)
- 12-chapter guide + 3 examples
- Production showcase (21 agents, 14 commands from real social app)
- AgentShield security scanning integration
