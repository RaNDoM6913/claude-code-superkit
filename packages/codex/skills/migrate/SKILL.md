---
name: migrate
description: Inspect, apply, or roll back database migrations with a verified tool, target, and authorized action
user-invocable: true
tokens: 1252
---

# Database Migrations

Inspect or execute the project's configured migration workflow. Read applicable `AGENTS.md` instructions and discover the runtime's command tools before use.

## Target and Authority

Parse the user's request as intent: `up`, `down`, `down N`, or `status`. With no action, prepare a status inspection; never default to applying changes. Before any connection, resolve the exact component, database/environment, migration directory and configuration using non-secret evidence. Do not print credentials, connection URLs, environment dumps or private records. If the target or authorized access is unclear, stop before contacting it and ask for the missing information.

Before mutation, verify existing user authority covers that target, direction, migration set and destructive effects. A known database URL is not permission to modify it. Present the concrete pending/rollback set and its data impact; retain an already authorized bounded action without repeatedly asking. For destructive or shared/production operations, verify the project's required backup/recovery and approval conditions. Missing authority or recovery evidence blocks execution, not local inspection. Do not start infrastructure or change connection configuration implicitly.

## Step 1 — Detect Migration Tool

Inspect actual configuration, dependencies, installed version, command help and existing migrations. Markers only select candidates. Inspect wrapper/Make targets for side effects before preferring them. Use installed binaries or existing package-manager scripts; never install a missing tool implicitly.

| Tool | Apply path to verify | Rollback semantics to verify |
|------|----------------------|------------------------------|
| golang-migrate | Configured migration path/database, `up` | Explicit `down N`; bare `down` may revert all migrations |
| dbmate | Configured `migrate` or project wrapper; `up` may also create the database | Installed `rollback` / `down` alias reverts the latest migration; confirm each selected step |
| Alembic | Configured upgrade revision, commonly `head` | Explicit revision or relative count; account for multiple heads |
| Prisma | Installed version's migration deployment command | No generic down command; `migrate reset` is a destructive reset, not rollback |
| Rails | Configured `db:migrate` | `db:rollback STEP=N` with the selected migration set |
| Drizzle | Configured generated-migration apply command | Project-specific rollback/recovery; `push` directly changes schema and is not an interchangeable migration apply |
| Knex | Configured `migrate:latest` | `migrate:rollback` reverts a batch, not necessarily one migration; use verified single-migration down or exact project procedure |

Do not substitute reset, schema push, force-version, resolve, rollback-all, or a sequence of undo/redo commands for an unsupported requested action.

## Step 2 — Inspect and Execute

### status / empty request

After target and read access are established, use the installed tool's supported status/version/history operation. Verify whether it connects or creates metadata before use; select a non-mutating operation or report the limitation. Local migration files alone do not establish the database's applied version.

### up

Inspect pending migrations and apply only the authorized set to the verified target with the configured command. Stop on drift, dirty/failed migration state, unexpected reset prompts or changed target; do not repair or force progress automatically.

### down / down N

Interpret `down` as one migration only when the tool supports that meaning. Require N to be a positive integer and resolve the exact reverse migration set/target revision before execution. Do not translate N into batch count or `--all`. If the tool cannot express the requested bounded rollback safely, report the unsupported operation and the project's required alternative.

For each command, pass validated arguments safely and keep credentials out of displayed command text. Preserve the original exit code and appropriately redacted evidence. After failure or timeout, inspect status within authorized read access before any retry; partial application is possible. Never retry an irreversible action blindly.

## Step 3 — Verify and Report

After execution, read back migration state on the same verified target with an authorized status operation. A zero command exit without state verification is not confirmed application. Report:

- Tool/version, component and redacted target identity.
- Requested action and exact migration identifiers/revision range.
- Command with secrets omitted, exit/status and safe evidence references.
- Before/after state, actual result: APPLIED / ROLLED-BACK / STATUS-ONLY / FAILED / UNVERIFIED / BLOCKED.
- Any partial application, unresolved drift, recovery dependency or next authorized action.

Do not claim a backup exists, a rollback restored lost data, or the live application is healthy without corresponding evidence.
