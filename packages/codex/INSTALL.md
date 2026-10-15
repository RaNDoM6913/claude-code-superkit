# Codex CLI — Installation Guide

## Standalone install and update

From the **target project's Git directory**, run the installer from your Superkit
checkout (Node.js 18+ and Git required):

```bash
cd /path/to/your-project
bash /path/to/claude-code-superkit/setup.sh --codex-only
```

This noninteractive route installs only Codex assets. It does not require or call
Claude, install Claude plugins, write `.claude` or `CLAUDE.md`, or scaffold Claude
documentation. It works from a subdirectory and targets the Git repository root.
The Codex executable is optional for file setup; install it separately to use the
skills. Existing `.claude` files do not influence Codex install/update decisions.

The installer supplies 82 skills at `.codex/skills/<name>/SKILL.md` and relative
links at `.agents/skills/<name>` for current Codex discovery. The retained storage
path keeps older installations and references compatible. Codex documents
repository discovery under `.agents/skills` and supports linked skill folders:
[official skill documentation](https://learn.chatgpt.com/docs/build-skills).
Existing discovery entries are preserved and reported as `DISCOVERY CONFLICT`;
you choose which skill to expose. The installer never replaces those entries or
follows an external link to update it. Creating directory symlinks requires OS
support/permission (on Windows, typically Developer Mode); failure is reported,
not silently treated as a complete installation.

It creates root `AGENTS.md`, `.codex/config.toml`, and
`.codex/rules/default.rules` only when absent. Existing copies are **always
preserved**, including prior stock templates. Review new template defaults and
merge any desired changes yourself. Default coordinator configuration is
**gpt-6-astra / high**, with **gpt-5.6-sol / medium** subagent fallback;
configuration is not proof of model availability or behavioral quality.

It also installs two native hook handlers in `.codex/hooks/superkit.mjs` and
the merge template `.codex/superkit-hooks.json`. A new `.codex/hooks.json` is
created only when absent, the project config is absent or exactly the shipped
config, and neither managed hook asset conflicts. Existing hook definitions and
arbitrary config are preserved; review and merge the template manually when
needed. The installer never grants project trust or hook trust. Review both
the definition and script, then use `/hooks` in a supporting Codex runtime.
See [native hook setup and limits](#native-hooks-and-trust).

### Re-run the same command to update

Refresh your Superkit checkout to the desired reviewed version, then run
`--codex-only` again. Updates are explicit; no scheduler or Claude SessionStart
hook is installed for Codex.

| Target state | Behavior |
| --- | --- |
| No `.codex` | Fresh install; preserve any existing root instructions/discovery entries. |
| Existing, unrecognized skills | Merge: add missing skills, preserve/report differing existing skills. |
| Recorded Superkit hashes | Upgrade skills and hook assets only when still matching their recorded installed hash. |
| Stock v1.5.2 installation without a manifest | Recognize pristine skills using the bundled SHA-256 baseline, then upgrade safely. |
| Custom skill or hook asset differs from its baseline and incoming content | `CONFLICT`: retain local bytes and report the upstream source for manual comparison. |
| Existing managed-path file exactly matches incoming content | Adopt it as managed without rewriting it. |

The installer maintains `.codex/.superkit-manifest.json` (schema 1, installed
`skills` hashes and an optional `assets` map for the hook script/template).
Older schema-1 manifests without `assets` remain valid. Active `hooks.json` is
preserved configuration, not a managed update asset. Preserve the manifest with
the installed files. The legacy baseline
in `packages/codex/legacy-baseline.json` is pinned to v1.5.2 commit
`cbb0565f4d4868fe77f4bd7e8fdd46dada3e52ab`; it requires no network access.
Other unknown versions are merged conservatively. Missing shipped skills are
recreated; removed upstream roles and unrelated/support files are not deleted.
To disable a skill, use Codex's skill configuration rather than deleting its file.

Before replacing pristine skills or hook assets, the installer writes old bytes and the
previous manifest (if present) into a new, unique directory under
`.codex/.superkit-backups/`, printing its absolute path. Existing backups are never
deleted or reused. For rollback, stop installers, inspect the printed backup, and
restore selected `skills/<name>/SKILL.md`, `hooks/superkit.mjs` and/or
`superkit-hooks.json` files to their corresponding paths under `.codex/`; restore
the backed-up manifest as well for a full rollback of that update. New files from
that run remain until you explicitly remove them. A legacy first upgrade has no
old manifest; restored legacy bytes will be preserved as conflicts on subsequent
runs, so compare and resolve them manually.

A conflicting file is a successful **preserving** install, not a fully applied
upstream update. Read the summary. Corrupt manifests, incomplete packages,
symbolic links in managed write paths, and non-regular files stop installation
with an error. Known discovery links are the intentional exception; discovery
parents must be real directories. `.codex/.superkit-install.lock` prevents
concurrent installer runs. After an interrupted run, verify no installer is
active before removing a stale lock and rerunning. Individual replacements are
atomic, but the whole install is not a transaction; backups cover replacements
and a rerun preserves unrecognized partial-update bytes. Do not edit target files
concurrently with installation. This is not a hostile-filesystem sandbox.

### Existing combined installer

`--codex` keeps its additive meaning: Claude + Codex. For example:

```bash
bash /path/to/claude-code-superkit/setup.sh --defaults --codex
```

The Codex portion uses the same independent update policy even when the Claude
portion is fresh, merged, or overwritten. `--codex-only` rejects `--codex`,
`--stacks`, `--extras`, `--profile`, and `--plugins` together. `--defaults`,
`--no-docs`, and `--no-superpowers` are accepted but unnecessary in standalone mode.

### Local package artifact (no publication required)

The existing npm artifact includes both installers; the selector controls what
is installed into the target. No separate service or distribution channel is
required. From the Superkit checkout:

```bash
npm pack --ignore-scripts --pack-destination /path/to/artifacts
```

Extract the resulting archive to a separate directory, then run from your target
project:

```bash
node /path/to/extracted/package/bin/cli.js --codex-only
```

The archive includes the installer, skill sources, hook script/template, and legacy baseline.
Its version remains 1.5.2 until a separately approved release; a local candidate
archive is not the published v1.5.2 release. npm publication remains deferred.

### Use and manual installations

Start Codex in the target project, open `/skills` or type `$` and select a role,
for example `$code-reviewer`. Customize `AGENTS.md` with actual project facts.
If new skills do not appear, restart Codex and check reported discovery conflicts.
Discovery proves loading, not successful execution of a workflow or model quality.

For selective/manual setup, place chosen skill folders (or links to them) under
project `.agents/skills/`; copy the templates only when absent and merge existing
configurations manually. Manual linked-source skills follow their source checkout
and do not receive installer-managed backups. Global installations are manual;
this installer never writes to `~/.codex` or `~/.agents`.

## What Gets Installed

Automated installation includes all 82 skills below. For manual selection only,
create `.agents/skills/` before copying and preserve any existing same-name folders.

### 9 Command Skills (user-invocable)

| Skill | Description |
|-------|-------------|
| `dev-orchestrator` | 16-phase development cycle: read-docs, understand, architect, pseudocode, plan, contract, validate, implement, evaluate, verify, test, verify-goals, review, critic, document, report |
| `review-orchestrator` | Detect changes, gather git context, dispatch reviewer agents in parallel, collect and deduplicate findings |
| `audit-orchestrator` | Parallel audit across frontend, backend, infra, security |
| `test-runner` | Auto-detect project test runner and execute tests |
| `lint-runner` | Auto-detect linters, run with optional --fix mode |
| `commit-helper` | Conventional commit with secret detection |
| `new-migration` | Discover the migration tool/dialect and scaffold its native format without applying it |
| `migrate` | Inspect status by default; apply or roll back an explicitly authorized, bounded set |
| `benchmark` | Run available Go benchmarks; compare an isolated baseline with installed tools |

### 36 Agent Skills (available roles)

These include converted core/extras roles and native GPT roles with Astra-authored instructions. `native-skills.txt` lists protected native roles, adapted workflows and support sources; the converter preserves them and rejects missing declared native assets before writing. The [roadmap](../../docs/superpowers/plans/2026-10-09-gpt-agent-roadmap-1.5.3.md) tracks accepted role packets separately from target-model behavioral acceptance. Source ownership is not proof of model quality. Use depends on the task, user authorization, and available runtime tools; automatic dispatch applies only where an existing caller selects the role. `behavioral-nudge-engine` is available for product nudge-design tasks and has no automatic Codex orchestrator caller. **v1.4.0 added 4 specialist roles:**

- `minimal-change-engineer` — surgical implementation, refuses scope creep
- `reality-checker` — checks readiness claims against applicable evidence and reports external blockers
- `codebase-onboarding-engineer` — task-focused repository brief with verified facts and explicit unknowns
- `behavioral-nudge-engine` — retention psychology, habit loops

| Skill | Category |
|-------|----------|
| `code-reviewer` | Quality — generic code review |
| `comment-rot-analyzer` | Quality |
| `security-scanner` | Security — OWASP top-10 + 18 generic checks |
| `silent-failure-hunter` | Quality |
| `audit-frontend` | Audit — 12 frontend checks against assigned product, data and toolchain contracts; evidence gaps explicit |
| `audit-backend` | Audit — 12 backend domains against assigned API, data-access and operational contracts; evidence gaps explicit |
| `audit-infra` | Audit — infrastructure security (12 checks) |
| `migration-reviewer` | Quality — SQL migration review |
| `test-generator` | Productivity — generate tests |
| `e2e-test-generator` | Productivity — Playwright/Cypress tests |
| `health-checker` | DevOps — compilation checks |
| `pre-deploy-validator` | DevOps — pre-deploy checklist (9 points) |
| `dependency-checker` | DevOps — dependency audit |
| `debug-observer` | Observability — debug analysis |
| `docs-reviewer` | Quality — documentation freshness, accuracy, coverage |
| `api-contract-sync` | Quality — API spec ↔ routes sync |
| `scaffold-endpoint` | Productivity — new endpoint scaffolding |
| `ui-reviewer` | Quality — UI/UX design system review |
| `bot-reviewer` | Quality — bot code review (Telegram/Discord/Slack) |
| `design-system-reviewer` | Quality — design system compliance |
| `database-reviewer` | Quality — PostgreSQL specialist |
| `architect` | Quality — system design advisor |
| `plan-checker` | Quality — requirement coverage, repository facts, dependencies, authority and feasible verification; PASS / REVISE / BLOCK |
| `goal-verifier` | Quality — 4-level goal substantiation, 3-state verdict (PASS / NEEDS-ATTENTION / NEEDS-REMEDIATION) |
| `evaluator` | Quality — calibrated QA scoring against Sprint Contract |
| `project-architecture` | Knowledge — project architecture reference |
| `ai-slop-cleaner` | Quality — detect and fix AI-generated code patterns |
| `critic` | Quality — multi-perspective final quality gate |
| `visual-reviewer` | Quality — visual/design-system review with separate source, rendered and interaction evidence; scoring only with an approved rubric |
| `tree-generator` | Productivity — generate project tree files |
| `writing-agents` | Knowledge — how to write agents |
| `writing-commands` | Knowledge — how to write command orchestrators |

### Frontend UI Skills (included; manual selection for 2D UI projects)

- `frontend-ui-reviewer` — umbrella reviewer
- `frontend-ui-typography-reviewer`, `frontend-ui-color-reviewer`,
  `frontend-ui-motion-reviewer`, `frontend-ui-interaction-reviewer`,
  `frontend-ui-design-critic` — five specialists
- `impeccable-craft` — opt-in craft skill

### Frontend 3D Skills (included; manual selection for 3D projects)

- Reviewers: `presentation-reviewer`, `r3f-scene-reviewer`,
  `ui-design-reviewer`, `frontend-perf-reviewer`
- Knowledge: `threejs-color-management`, `r3f-scroll-driven-3d`, `gltf-debugging`,
  `html-to-3d-texture`, `product-3d-lighting`, `output-enforcement`

### Stack-Specific Reviewers (included; manual selection per language)

- Go reviewers: `go-reviewer`, `go-error-reviewer`, `go-concurrency-reviewer`,
  `go-performance-reviewer`, `go-modernizer`, `go-observability-reviewer`
- Go knowledge: `go-samber-do`, `go-samber-oops`, `go-samber-lo`,
  `go-grpc-patterns`, `go-benchmark`
- Other languages: `ts-reviewer`, `py-reviewer`, `rs-reviewer`

For selective manual setup, each source folder is under `packages/codex/skills/`.
Confirm its destination under `.agents/skills/` is absent before copying or linking.
If it exists, compare and merge manually; copying over it bypasses all installer
preservation and backup checks. Prefer the automated route for managed updates.

### Total: 82 skills

- 9 command skills (user-invocable, including benchmark)
- 36 agent + knowledge skills (task-specific use or existing caller dispatch) — incl. v1.4.0: minimal-change-engineer, reality-checker, codebase-onboarding-engineer, behavioral-nudge-engine
- 10 frontend 3D skills (optional, for R3F/Three.js/GSAP projects)
- 7 frontend UI skills (optional, for 2D UI / landing-page / dashboard projects)
- 9 stack-specific reviewer skills (optional, per language)
- 5 Go knowledge skills (optional, samber-do/oops/lo, grpc-patterns, benchmark-methodology)
- 6 TGApp / production skills (telegram-bot-builder, nextjs-supabase-auth, drizzle-orm-expert, ru-text, postgresql-optimization, redis-patterns)

Plus 1 Codex approval rules file (`packages/codex/rules/default.rules`), 2 hook handlers in 1 script, and 3 GAN agents (separate optional package, requires Playwright).

## Model Configuration

The default `config.toml` separates coordinator and subagent models:

```toml
model = "gpt-6-astra"
model_reasoning_effort = "high"
web_search = "live"

[features]
multi_agent = true

[agents]
default_subagent_model = "gpt-5.6-sol"
default_subagent_reasoning_effort = "medium"
```

Skills are instructions used by the agent that loads them; skill frontmatter does not select the execution model. The agent defaults apply when a dispatch omits model or effort. Explicit task routing should select the intended model and effort, with substantive Sol review at `high` and critical decisions accepted by Astra. The supported effort levels and model availability depend on the installed runtime and account.

These settings were checked against Codex CLI `0.162.0-alpha.17.2` and the [official configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference). They declare routing; they do not prove a live task ran on that model. Model behavioral acceptance remains pending. The owner-required Astra authorship rule for Superkit contributors is documented in [WORKING_AGREEMENT.md](../../docs/WORKING_AGREEMENT.md).

## Native hooks and trust

Codex supports lifecycle hooks in `hooks.json` beside active config layers;
project-local hooks also require project trust. See the [official hooks and
trust documentation](https://learn.chatgpt.com/docs/hooks) and
[configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).
Superkit ships this bounded mapping:

| Handler | Check | Limit |
| --- | --- | --- |
| `PreToolUse` (`Bash`) | Rejects recognized static destructive Git commands | Never returns permission allow; opaque shell syntax is unassessed. It is not a complete shell parser/security boundary. |
| `Stop` | Filter-free repositories: read-only tracked/staged `git diff --check`; at most one continuation | Any configured clean/process filter skips both diffs with UNVERIFIED. Does not prove tests/builds passed or check untracked file behavior. |

Git diff checks can execute clean/process conversion programs. Before either
diff, Stop enumerates config keys only and conservatively skips both checks when
any `filter.*.clean` or `filter.*.process` is configured, including unused drivers
and global Git LFS configuration. No filter values are captured or Git config
changed. This availability limit remains UNVERIFIED, never a whitespace pass;
run the applicable verification explicitly under its own task authority.

The handlers run no project scripts, read no transcripts and contact no external
services. Wiring resolves the Git root through a POSIX shell; Windows and cloud
runtime execution are unqualified. Keep task authority, approvals and real
verification gates in force even when a hook returns no block.

After installation, inspect `.codex/hooks.json` or manually merge
`.codex/superkit-hooks.json` into your existing hook configuration. Other active
sources can also contribute hooks; avoid duplicate registrations. Review the
referenced `.codex/hooks/superkit.mjs`, trust the project when appropriate and
use `/hooks` to review the exact definition. The installer writes no trust
settings and never bypasses trust. An existing active hook definition is preserved
on updates. Definition-hash trust does not fully attest the referenced script:
review managed script changes separately, including backup/conflict reports.

A copied definition is not proof of trust, handler execution or native event
firing. Check each separately in the intended runtime. Direct script fixtures
qualify handler behavior only; file installation/discovery checks do not establish
native firing, consumer workflow execution or model quality.

### Claude behaviors without a shipped Codex mapping

| Feature | Claude Code | Codex route |
| --- | --- | --- |
| Session continuity | SessionStart restore / pre-compact save | Not mapped; maintain authorized project notes. |
| Full Stop verification | Compilation/documentation checks | Not mapped; run applicable test/lint/docs gates. |
| Format/typecheck-on-edit | Language-specific PostToolUse checks | Not mapped; use editor checks or authorized lint-runner fixes. |
| Doc-check-on-commit | Documentation commit gate | Not mapped; follow AGENTS.md and docs-reviewer. |
| Migration validation | Migration naming/safety hooks | Not mapped; use applicable migration skills and task authority. |
| Bundle import check | Dependency warning | Not mapped; use dependency-checker. |
| Hook profiles | fast/standard/strict | Not mapped; review the two native handler definitions directly. |

## Verification

Inspect `.codex/skills/`, `.agents/skills/`, root `AGENTS.md` and the installed
config/rules and managed hook script/template. In Codex, use `/skills` or `$`
to verify discovery and `/hooks` to inspect hook review/trust status. The installer
reports conflicts explicitly; a successful run does not imply every upstream
change replaced a local customization.

## Updating

Use the [safe re-run procedure](#re-run-the-same-command-to-update) above.
Do not recursively copy over installed skills to update them: that bypasses
customization checks and backups. For manual linked installations, review the
source-checkout changes before refreshing it.
