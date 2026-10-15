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

### Re-run the same command to update

Refresh your Superkit checkout to the desired reviewed version, then run
`--codex-only` again. Updates are explicit; no scheduler or Claude SessionStart
hook is installed for Codex.

| Target state | Behavior |
| --- | --- |
| No `.codex` | Fresh install; preserve any existing root instructions/discovery entries. |
| Existing, unrecognized skills | Merge: add missing skills, preserve/report differing existing skills. |
| Recorded Superkit skill hashes | Upgrade: update only files still matching their recorded installed hash. |
| Stock v1.5.2 installation without a manifest | Recognize pristine skills using the bundled SHA-256 baseline, then upgrade safely. |
| Custom skill differs from both baseline and incoming content | `CONFLICT`: retain local bytes and report the upstream source for manual comparison. |
| Existing skill exactly matches incoming content | Adopt it as managed without rewriting it. |

The installer maintains `.codex/.superkit-manifest.json` (schema 1, installed
skill hashes). Preserve this file with the installed skills. The legacy baseline
in `packages/codex/legacy-baseline.json` is pinned to v1.5.2 commit
`cbb0565f4d4868fe77f4bd7e8fdd46dada3e52ab`; it requires no network access.
Other unknown versions are merged conservatively. Missing shipped skills are
recreated; removed upstream roles and unrelated/support files are not deleted.
To disable a skill, use Codex's skill configuration rather than deleting its file.

Before replacing pristine skills, the installer writes their old bytes and the
previous manifest (if present) into a new, unique directory under
`.codex/.superkit-backups/`, printing its absolute path. Existing backups are never
deleted or reused. For rollback, stop installers, inspect the printed backup, and
restore the selected `skills/<name>/SKILL.md` files under `.codex/skills/`; restore
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

The archive includes the installer, skill sources, templates, and legacy baseline.
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
| `new-migration` | Scaffold migration file pair with auto-numbering |
| `migrate` | Apply or rollback database migrations |
| `benchmark` | Run Go benchmarks with benchstat comparison |

### 36 Agent Skills (available roles)

These include converted core/extras roles and native GPT roles with Astra-authored instructions. `native-skills.txt` lists the protected role sources and partially adapted workflow callers; the converter preserves them and rejects missing declared native assets before writing. The [roadmap](../../docs/superpowers/plans/2026-10-09-gpt-agent-roadmap-1.5.3.md) tracks accepted role packets separately from target-model behavioral acceptance. Source ownership is not proof of model quality. Use depends on the task, user authorization, and available runtime tools; automatic dispatch applies only where an existing caller selects the role. `behavioral-nudge-engine` is available for product nudge-design tasks and has no automatic Codex orchestrator caller. **v1.4.0 added 4 specialist roles:**

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
| `audit-frontend` | Audit — frontend code quality (15 checks) |
| `audit-backend` | Audit — backend code quality (15 checks) |
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
| `plan-checker` | Quality — 8-dimension plan validation |
| `goal-verifier` | Quality — 4-level goal substantiation, 3-state verdict (PASS / NEEDS-ATTENTION / NEEDS-REMEDIATION) |
| `evaluator` | Quality — calibrated QA scoring against Sprint Contract |
| `project-architecture` | Knowledge — project architecture reference |
| `ai-slop-cleaner` | Quality — detect and fix AI-generated code patterns |
| `critic` | Quality — multi-perspective final quality gate |
| `visual-reviewer` | Quality — UI consistency scoring, design system compliance |
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

Plus 1 Codex approval rules file (`packages/codex/rules/default.rules`) + 3 GAN agents (optional, requires Playwright).

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

## Claude hook behaviors not installed by this route

This installation does not reproduce the following Claude hook behaviors. Native
Codex hook mapping and broader workflow compatibility remain a separate product
package; this table describes the installer, not all runtime capabilities:

| Feature | Claude Code | Codex | Workaround |
|---------|-------------|-------|------------|
| **Hooks** | Pre/PostToolUse, Stop, UserPromptSubmit | Not installed | Inline checks in AGENTS.md rules |
| **Session continuity** | SessionStart hook restores context | Not installed | Rely on AGENTS.md for context |
| **Stop verification** | Auto-verifies compile + docs before end | Not installed | Manually run lint/test skills |
| **Format-on-edit** | Auto-formats after file edits | Not installed | Run lint-runner with --fix |
| **Doc-check-on-commit** | Warns when committing without docs | Not installed | Documentation rule in AGENTS.md |
| **Migration safety hook** | Auto-validates migration naming | Not installed | migration-reviewer skill checks post-hoc |
| **Bundle import check** | Warns on missing package.json deps | Not installed | dependency-checker skill |
| **Hook profiles** | fast/standard/strict profiles | Not installed | Single configuration via AGENTS.md |

## Verification

Inspect `.codex/skills/`, `.agents/skills/`, root `AGENTS.md` and the installed
config/rules. In Codex, use `/skills` or `$` to verify discovery. The installer
reports conflicts explicitly; a successful run does not imply every upstream
change replaced a local customization.

## Updating

Use the [safe re-run procedure](#re-run-the-same-command-to-update) above.
Do not recursively copy over installed skills to update them: that bypasses
customization checks and backups. For manual linked installations, review the
source-checkout changes before refreshing it.
