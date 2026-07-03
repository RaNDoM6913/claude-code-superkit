---
description: Apply or rollback database migrations — auto-detects migration tool
argument-hint: "[up|down|down N|status]"
allowed-tools: Bash, Read, Glob
---

# Database Migrations

Role: apply, roll back, or report the status of database migrations, auto-detecting the project's migration tool. Rollbacks destroy data — every destructive step is gated behind explicit user confirmation.

## Hard Rules

1. **Destructive-action gate**: before running ANY command that can destroy data (`down`, `rollback`, `downgrade`, `reset`, `drop`, any `--force` flag), STOP and ask the user for confirmation AT THAT STEP. Show the exact command and exactly what will be lost (which migrations revert; which tables/columns they drop, from reading the migration files). Run only after the user explicitly agrees.
2. NEVER run `npx prisma migrate reset` (or any tool's reset/drop-and-recreate) as a routine rollback — it drops the ENTIRE database. Offer it only as a clearly labeled last resort, and only run it after the user explicitly accepts total data loss.
3. NEVER guess a database connection string. Locate it (Step 2) or report where you looked and ask the user.
4. Run the tool's read-only `status` command before any `up` or `down`, whenever the tool has one.
5. If no migration tool is detected, report that and stop. If the detected tool has no true rollback (Prisma, Drizzle), follow its down branch in Step 4 — present only the options listed there, auto-run none of them, and do not improvise a workaround.
6. For `down N` with N > 1: in the confirmation (Rule 1), restate N and list the N migrations that will be reverted; if the user's answer does not clearly cover N migrations, do not run.
7. Prefer Makefile migration targets over raw tool commands — they may include environment setup.

## Arguments

Requested action: $ARGUMENTS

| Argument | Action |
|----------|--------|
| (empty) | `up` |
| `up` | apply all pending migrations |
| `down` | rollback 1 migration (confirmation-gated) |
| `down N` | rollback N migrations (confirmation-gated, Rule 6) |
| `status` | read-only status report |
| anything else | report `Unknown action: <arg>` with the list above, stop |

## Step 1 — Detect Migration Tool

Check markers top to bottom; first match wins (Makefile first, per Rule 7):

| Marker | Tool | Apply Command |
|--------|------|---------------|
| `Makefile` with `migrate-up` target | Make | `make migrate-up` |
| `Makefile` with `migrate` target | Make | `make migrate` |
| `golang-migrate` in deps, or numbered `.sql` up/down pairs | golang-migrate | `migrate -path <dir> -database <url> up` |
| `dbmate` in deps or PATH | dbmate | `dbmate up` |
| `alembic.ini` or `alembic/` | Alembic | `alembic upgrade head` |
| `prisma/` + `package.json` | Prisma | `npx prisma migrate deploy` |
| `db/migrate/` + `Rakefile` | Rails | `rails db:migrate` |
| `drizzle.config.ts` | Drizzle | `npx drizzle-kit migrate` |
| `knexfile.js` / `knexfile.ts` | Knex | `npx knex migrate:latest` |

Done when: exactly one tool selected — or no marker matched and you reported `No migration tool detected — checked: [list of markers]` and stopped.

## Step 2 — Locate Connection & Check Infra

Skip for tools that read their own config automatically when it is already present (Alembic `alembic.ini`, Prisma `schema.prisma` datasource, Knex `knexfile.*`, Rails). For tools needing an explicit URL or env (golang-migrate `-database`, dbmate/`DATABASE_URL`), find the real value — check in order:

1. Makefile variables used by the migrate target
2. `.env` / `.env.local`
3. `docker-compose*.yml` environment blocks
4. Tool config files (`alembic.ini` `sqlalchemy.url`, `prisma/schema.prisma`, `knexfile.*`)

Not found in any of these → apply Rule 3: report the four places checked, ask the user, stop.

Migrations require a running database. If the connection points at local infra (docker-compose service, localhost), verify it is reachable (e.g. the compose service is up); if not, tell the user to start infrastructure first and stop.

Done when: connection source identified (never guessed) and DB assumed reachable — or you stopped and asked.

## Step 3 — Status First

If the action is `status`, or before executing `up`/`down` (Rule 4): run the status command and capture its output.

| Tool | Status Command |
|------|----------------|
| Make | `migrate-status`/`status` target if the Makefile has one; else use the underlying tool's row if identifiable; else note "no status command" |
| golang-migrate | `migrate -path <dir> -database <url> version` |
| dbmate | `dbmate status` |
| Alembic | `alembic current` + `alembic history` |
| Prisma | `npx prisma migrate status` |
| Rails | `rails db:migrate:status` |
| Drizzle | none — note "status not supported by drizzle-kit"; for `status` action, list local migration files instead |
| Knex | `npx knex migrate:list` |

If the action is `status`, go straight to Step 5 after this.

Done when: status output captured, or "no status command for [tool]" noted.

## Step 4 — Execute Action

### up

Run the Apply Command from Step 1. No confirmation gate — applying pending migrations is the normal forward path.

### down / down N

1. From Step 3 status output (or the migration directory), identify by name the migration(s) that will be reverted; read them to state what schema/data is lost.
2. Apply Rule 1 (and Rule 6 if N > 1): show the exact rollback command, the migration names, and the concrete loss. Wait for explicit user agreement.
3. User declined or did not clearly agree → record "user declined", go to Step 5.
4. User agreed → run the rollback command:

| Tool | Rollback 1 | Rollback N |
|------|-----------|------------|
| Make | `make migrate-down` (or `make migrate-rollback`) | run the target N times, unless it accepts a count |
| golang-migrate | `migrate -path <dir> -database <url> down 1` | `migrate ... down N` |
| dbmate | `dbmate down` | run `dbmate down` N times |
| Alembic | `alembic downgrade -1` | `alembic downgrade -N` |
| Prisma | **no true down** — see Prisma branch below | same |
| Rails | `rails db:rollback` | `rails db:rollback STEP=N` |
| Drizzle | **not supported** — see Drizzle branch below | same |
| Knex | `npx knex migrate:rollback` — reverts the last **batch**, which may contain more than one migration; list every migration in that batch in the confirmation | run `npx knex migrate:rollback` N times (each run reverts one batch) |

### Prisma down branch

Prisma has no down command. Present exactly these options to the user and wait — never auto-run any of them:

1. **Generate a down script**: use `npx prisma migrate diff` (check `--help` for the flag set in the installed version) to produce reverse SQL from the current schema vs. the target state; the user reviews and applies it manually.
2. **Restore from a database backup** taken before the migration.
3. **LAST RESORT — `npx prisma migrate reset`**: drops the ENTIRE database and replays all migrations. ALL data is lost. Runs only under Rules 1–2: the user must explicitly accept total data loss in response to a message that says so in those words.

### Drizzle down branch

drizzle-kit has no rollback command. Report: "Drizzle does not support rollback via drizzle-kit. Options: write a reverse SQL migration and apply it forward, or restore from backup." Stop (Rule 5).

Done when: `up` — apply command ran, exit code and output captured; `down` — rollback ran after confirmation, or you stopped with "user declined" / "unsupported" recorded.

## Step 5 — Report

Emit exactly this template:

```
## Migration Result

- Tool: [detected tool]
- Action: [up/down/down N/status]
- Command: `[exact command run]` — or "not run: [user declined | unsupported for this tool | no tool detected | connection not found]"
- Confirmation: [not required (up/status) | user confirmed: "<quoted answer>" | user declined]
- Result: [success/failure — paste the real command output, not a summary]
- Current version: [from status output, if available]
```

Done when: the report matches the template, with `Result` taken from actual command output.

## Recap

- Destructive commands run only after explicit user confirmation at that step, with the exact command and concrete data loss spelled out.
- `prisma migrate reset` is never a routine rollback — last resort, explicit total-data-loss consent only.
- Connection strings are located (Makefile/.env/compose/tool config) or asked for — never guessed.
- Status first where supported; no tool detected → report and stop; no true down (Prisma/Drizzle) → only the Step 4 branch options, nothing auto-run.
