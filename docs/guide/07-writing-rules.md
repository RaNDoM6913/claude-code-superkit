# Chapter 7: Writing Rules

Rules are short Markdown files that are loaded into every Claude Code conversation. They act as persistent instructions that shape Claude's behavior across all interactions.

## Rule Format

Rules live in `.claude/rules/` as `.md` files with a single frontmatter field:

```yaml
---
alwaysApply: true
---
```

The `alwaysApply: true` flag ensures the rule is injected into Claude's context at the start of every conversation.

## The Cardinal Rule: Keep Rules Short

Rules consume context window space in **every single message**. A 100-line rule file wastes tokens on every interaction, whether or not it is relevant.

**Target: under 50 lines per rule file, under 150 lines total across all rules.**

If your rule needs more than 50 lines of explanation, it belongs in a skill (loaded on demand) or an agent (runs independently).

## What Rules Are Good For

Rules work best for universal constraints that apply to every interaction:

**Security rules** -- things that must never happen:
```markdown
- SQL: parameterized queries only. NEVER string interpolation.
- Secrets: no hardcoded tokens/passwords/keys. Use env vars.
- Auth: all API endpoints require auth middleware.
```

**Style rules** -- conventions that apply everywhere:
```markdown
- No magic numbers -- use named constants
- No commented-out code -- delete it
- Early returns over deep nesting
```

**Workflow rules** -- how Claude should behave:
```markdown
- Commits: conventional format `type(scope): description`
- No --no-verify: fix hook issues, don't skip them
- No force push to main
```

## Rules vs Hooks

Both rules and hooks influence behavior, but they work differently:

| Aspect | Rules | Hooks |
|--------|-------|-------|
| **Mechanism** | Advisory text in Claude's context | Shell scripts with exit codes |
| **Enforcement** | Claude follows them (soft) | Scripts block or warn (hard) |
| **Scope** | Every conversation | Specific tool events |
| **Cost** | Context window tokens | Script execution time |
| **Bypassing** | Claude could theoretically ignore | Exit code 2 physically prevents the action |

Use **rules** for guidelines Claude should follow. Use **hooks** for constraints that must be enforced mechanically. Often you want both: a rule saying "never force push" and a hook that blocks `git push --force`.

## The Six Default Rules

The superkit ships with six rules:

### coding-style.md (22 lines)
```markdown
---
alwaysApply: true
---

# Coding Style

## General
- Use language-standard formatter
- No magic numbers -- named constants
- No commented-out code
- Early returns over nesting
- Max ~50 lines per function
- No global state -- DI via constructors

## Testing
- Tests required for: new endpoints, bug fixes, business logic
- Tests optional for: pure UI, config, docs

## Search First
- Check codebase for existing patterns before writing new code
- Check packages before reimplementing
```

### security.md (13 lines)
Covers SQL injection, XSS, secrets, auth, input validation, file uploads, CORS.

### git-workflow.md (9 lines)
Covers conventional commits, no --no-verify, no force push, branch naming.

### documentation.md (70 lines)
Enforces documentation updates in the same response as code changes. Features a 15-point trigger-to-doc mapping table (e.g., "migrations staged? update database-schema.md"), subagent delegation template for explicit doc instructions, and a 4-layer enforcement stack (rule + blocking hook + dev-workflow gate + Stop hook).

### dev-workflow.md (30 lines)
Auto-triggers the full `/dev` orchestration (8 phases) for substantial tasks — new features, multi-file bug fixes, full-stack work. Skips orchestration for simple edits, docs-only, config changes, or questions. Claude follows the workflow naturally without the user calling `/dev` explicitly.

### auto-commands.md (102 lines)
Auto-triggers individual commands (`/review`, `/test`, `/lint`, `/audit --health`, `/security-scan`) when specific conditions are met — without the user explicitly calling them. Includes the **highest priority trigger**: documentation verification before every commit. Works with the `doc-check-on-commit` hook which BLOCKS commits if docs are missing.

## Full Example: "no-orm" Rule

For a project that uses raw SQL (pgx, database/sql) and forbids ORMs:

Create `.claude/rules/no-orm.md`:

```markdown
---
alwaysApply: true
---

# No ORM

This project uses raw SQL via pgx. Do not introduce GORM, ent, sqlc code generation,
or any other ORM/query builder. Write parameterized SQL directly in repository methods.
Pattern: `pool.QueryRow(ctx, "SELECT ... WHERE id = $1", id)`.
```

Five lines. Loaded in every conversation. Clear and unambiguous.

## Tips

- **One concern per rule file** -- security in one, style in another, workflow in a third
- **Use bullet points** -- Claude parses them reliably
- **Be specific** -- "no `fmt.Sprintf` in SQL" is better than "be careful with SQL"
- **Include the why** -- "use env vars (secrets leak into git history)" helps Claude make correct judgment calls in edge cases
- **Test your rules** -- start a conversation and ask Claude to explain the active rules; verify it mentions yours
- **Prune regularly** -- if a rule has never prevented a real mistake, consider removing it to save context space
