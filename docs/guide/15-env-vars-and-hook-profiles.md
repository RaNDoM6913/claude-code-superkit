# Chapter 15 — Environment Variables & Hook Profiles

Single source of truth for every `CLAUDE_*` environment variable the superkit responds to. Use this page to tune the kit to your machine, your CI, or a specific task without editing hook scripts.

If a hook has an opt-out flag, it is listed here. If it is not listed here, it has no opt-out — you disable it by removing it from `.claude/settings.json`.

---

## 1. Hook profile — `CLAUDE_HOOK_PROFILE`

Coarse-grained selector that every profile-aware hook reads at the top of its script. Default is `standard`.

| Profile    | What runs                                                                                                   | Typical use              |
|------------|-------------------------------------------------------------------------------------------------------------|--------------------------|
| `fast`     | Only the critical-safety allowlist: `block-dangerous-git`, `security-patterns`, `audit-settings-source`, `doc-check-on-commit`. Every other profile-aware hook exits early. | CI, scripted runs, quick scratch sessions |
| `standard` | Everything from `fast` **plus** the full core enforcement suite: audit trail, compact-state injection, plan-completion gate, user-intent detect, subagent-stop validation, loop-guard, migration-safety, evolve-check, dev-edit-counter, dev-required-on-commit, bundle-import-check, stack formatters (go/ts/py/rust), frontend-3d lint hooks. | Day-to-day local development (default) |
| `strict`   | Everything in `standard` **plus** stricter go toolchain (`go-vet-on-edit`, `golangci-lint-on-edit` run on every edit instead of on commit). | Pre-release, hardening passes, reviewing external contributions |

### How to set a profile

```bash
# One session
CLAUDE_HOOK_PROFILE=fast claude

# Persistent (zsh)
echo 'export CLAUDE_HOOK_PROFILE=standard' >> ~/.zshrc

# Per-project (with direnv)
echo 'export CLAUDE_HOOK_PROFILE=strict' >> .envrc && direnv allow

# CI (GitHub Actions)
env:
  CLAUDE_HOOK_PROFILE: fast
```

The profile is shown in the statusline (`packages/core/helpers/statusline.cjs`). If nothing is set, it reads `standard`.

---

## 2. Per-hook opt-out flags

Every flag below is a hook-level kill switch. Set it to `1` to skip that single hook while leaving every other hook running. Preferred over flipping the whole profile to `fast`.

Convention: **set = `1` disables the hook. Unset or any other value = hook runs normally.**

### Shortcut — `CLAUDE_DISABLED_HOOKS` (multi-hook disable)

Instead of setting individual opt-out flags, you can pass a comma-separated list of hook basenames to disable several at once:

```bash
export CLAUDE_DISABLED_HOOKS=loop-guard,edit-streak-check,context-monitor
```

This is handled by the shared helper `packages/core/hooks/lib/profile.sh` that every shipping hook sources on entry. Works for every shipping hook that sources the shared profile lib. Takes precedence over `CLAUDE_HOOK_PROFILE=fast` (a hook listed here is always skipped regardless of profile). The hook's own `CLAUDE_DISABLE_<NAME>` flag is still honoured when set — `CLAUDE_DISABLED_HOOKS` is just a terser superset syntax.

When to use which:
- **`CLAUDE_DISABLED_HOOKS=a,b,c`** — CI/CD one-off, testing a single scenario, cross-environment diff
- **`CLAUDE_DISABLE_<NAME>=1`** — persistent preference in your `~/.zshrc` for a single hook

### 2.1 Core hooks

| Env var                           | Hook                                  | What the hook does                                                                  | Why you'd turn it off                                         |
|-----------------------------------|---------------------------------------|-------------------------------------------------------------------------------------|---------------------------------------------------------------|
| `CLAUDE_DISABLE_AUDIT_TRAIL`      | `audit-trail.sh` (PostToolUse)        | Appends a hash-chained JSONL line per tool call to `~/.claude/audit/YYYY-MM-DD.jsonl` | Audit log filling disk; running in ephemeral container; privacy |
| `CLAUDE_DISABLE_SETTINGS_AUDIT`   | `audit-settings-source.sh` (SessionStart) | Inspects `.claude/settings.json` git history to warn about unreviewed upstream hook changes (CVE-2025-59536 mitigation) | You fully trust the repo and don't want the warning on every session |
| `CLAUDE_DISABLE_COMPACT_STATE`    | `compact-state-inject.sh` (PreCompact) | Injects in-flight plan/state into the compacted context so nothing is lost           | Running with abundant context (Opus 4.8 / 1M) — compaction is rare |
| `CLAUDE_DISABLE_PLAN_GATE`        | `plan-completion-gate.sh` (Stop)      | Blocks `Stop` if an active plan has unchecked tasks                                  | Doing throw-away work outside the `/dev` flow                 |
| `CLAUDE_DISABLE_INTENT_DETECT`    | `user-intent-detect.sh` (UserPromptSubmit) | Classifies user prompt (commit, plan, question, etc.) to hint downstream hooks       | Intent classifier misfires on your domain; you want silence    |
| `CLAUDE_DISABLE_SUBAGENT_VALIDATE`| `subagent-stop-validate.sh` (SubagentStop) | Validates that a dispatched subagent actually produced output matching its contract  | Subagent is exploratory / free-form and the check is noisy    |
| `CLAUDE_DISABLE_EDIT_STREAK`      | `edit-streak-check.sh` (PostToolUse)  | Warns at 5+ consecutive Edit/Write without a Bash verification run (any Bash call resets the counter) | You know you're editing extensively before testing on purpose |

### 2.2 Frontend-UI hooks

| Env var                      | Hook                             | What the hook does                                                                 | Why you'd turn it off                                      |
|------------------------------|----------------------------------|------------------------------------------------------------------------------------|------------------------------------------------------------|
| `CLAUDE_DISABLE_UI_FONT_CHECK`  | `ui-banned-fonts-check.sh` (PostToolUse) | Warns when generic fonts (Inter, Roboto, etc.) are added to CSS / Tailwind config  | Your design system legitimately uses one of the flagged fonts |
| `CLAUDE_DISABLE_UI_COLOR_CHECK` | `ui-color-check.sh` (PostToolUse) | Warns about raw hex / pure black / flat color choices outside a token system       | Early prototyping where a palette isn't set yet            |
| `CLAUDE_DISABLE_UI_ANIM_CHECK`  | `ui-animation-easing-check.sh` (PostToolUse) | Warns about linear easing / missing duration on transitions                       | Intentional non-eased motion (e.g. physics-driven component) |

### 2.3 Hooks without an opt-out flag

These have no dedicated opt-out flag and must be disabled by editing `.claude/settings.json` (or via `CLAUDE_DISABLED_HOOKS`) instead. Most run in every non-`fast` session; `block-dangerous-git`, `security-patterns`, and `doc-check-on-commit` run even in `fast`:

- `block-dangerous-git.sh` (safety)
- `security-patterns.sh` (secret-leak detection)
- `context-monitor.sh` (context usage warnings)
- `console-log-warning.sh`
- `config-protection.sh`
- `evolve-check.sh`, `loop-guard.sh`, `migration-safety.sh`
- `doc-check-on-commit.sh`, `dev-required-on-commit.sh`, `dev-edit-counter.sh`, `dev-marker-set.sh`
- `bundle-import-check.sh`
- `superkit-counts-verify.sh`, `superkit-update.sh`
- Stack hooks: `go-format-on-edit`, `go-vet-on-edit`, `go-error-check`, `go-safety-check`, `go-context-check`, `golangci-lint-on-edit`, `typecheck-on-edit` (TS), `ruff-on-edit` (Py), `cargo-check-on-edit` (Rust)
- Frontend-3D hooks: `gsap-pattern-check`, `r3f-color-check`, `tailwind-version-guard`, `bundle-size-warn`

All stack and 3D hooks honour `CLAUDE_HOOK_PROFILE=fast` as a global kill switch.

---

## 3. Context-monitor & statusline variables

Read by `packages/core/hooks/context-monitor.sh` (PostToolUse warnings) and — for `CLAUDE_CONTEXT_TOKENS_MAX` — by the statusline's `ctx%` readout.

| Env var                       | Default     | Meaning                                                              |
|-------------------------------|-------------|----------------------------------------------------------------------|
| `CLAUDE_CONTEXT_TOKENS_USED`  | `0`         | Current tokens in the context window. Injected by the harness.       |
| `CLAUDE_CONTEXT_TOKENS_MAX`   | `1000000`   | Upper bound used to compute the percentage. Defaults to Opus 4.8 1M. Also read by the statusline — see the note below. |

The hook prints a warning at 75% and a stronger warning at 90% usage. If `CLAUDE_CONTEXT_TOKENS_USED=0` (the harness is not passing it), the hook exits silently.

Override only if you're running a smaller model or want artificially earlier warnings:

```bash
CLAUDE_CONTEXT_TOKENS_MAX=200000 claude   # warn as if using a 200k model
```

**Also consumed by the statusline.** `packages/core/helpers/statusline.cjs` reads `CLAUDE_CONTEXT_TOKENS_MAX` when resolving the window for its `ctx` heat-bar segment (`ctx ██████░░░░ 62%` — percent-only). On CLIs that pass no native `context_window`, the statusline reconstructs current usage by summing the latest usage record in the session transcript, then resolves the window by precedence: `CLAUDE_CONTEXT_TOKENS_MAX` → a `[1m]` marker in the model id → a >200k-tokens-used heuristic → 200k default. Set this var if that fallback mis-scales your reading (e.g. a 1M-context model whose id carries no `[1m]` marker). The whole path is fail-open — a bad or missing value never breaks the statusline; it just falls back. The statusline also renders real 5-hour/weekly rate-limit bars straight from the CLI's `rate_limits` stdin payload (subscription sessions; no env var involved — the percentages arrive pre-computed), plus the current model, a heat-graded effort level, and the active task from `.claude/.task-state.json`. `CLAUDE_STATUSLINE_THEME=light` flips the active-task text from bright white to black for light terminals (Claude Code paints uncoloured statusline text in its own muted gray, so the task carries an explicit colour).

---

## 4. Project-discovery variables

| Env var              | Who sets it                | Used for                                                                                   |
|----------------------|----------------------------|--------------------------------------------------------------------------------------------|
| `CLAUDE_PROJECT_DIR` | Harness (Claude Code CLI)  | Every path-aware hook resolves repo root from here (with `pwd` fallback). Also used in `.claude/settings.json` templated hook commands. |

You normally never set this yourself. Only override when you're testing a hook outside the harness:

```bash
echo '{"tool_name":"Edit"}' | CLAUDE_PROJECT_DIR="$PWD" bash packages/core/hooks/audit-trail.sh
```

---

## 5. Internal / framework variables

Auto-populated by the harness or by the kit's own scripts. **Do not set these manually** — they're documented here so you recognise them in logs and settings files.

| Env var                 | Source                         | Purpose                                                                              |
|-------------------------|--------------------------------|--------------------------------------------------------------------------------------|
| `CLAUDE_HOOK_PID`       | Harness                        | Stable per-session key when the payload lacks `session_id`. Hooks use it to correlate state. |
| `CLAUDE_DIR`            | Installer (`lib/installer.js`) | Resolved path to `.claude/`; used during install to stage files.                     |
| `CLAUDE_MD`             | Installer                      | Path to the freshly-generated `CLAUDE.md` template.                                  |
| `CLAUDE_CORE_AGENTS`    | Installer                      | Internal list of core agent files being copied.                                      |
| `CLAUDE_STACK_AGENTS`   | Installer                      | Internal list of stack agent files being copied.                                     |
| `CLAUDE_COMMANDS`       | Installer                      | Internal list of commands being copied.                                              |
| `CLAUDE_CODEX`          | Installer                      | Flag marking Codex CLI install paths.                                                |
| `CLAUDE_SHOWCASE_CMD`   | Installer                      | Internal marker for showcase command install.                                        |

---

## 6. Setting variables — recipes

```bash
# One-shot: fast profile for a quick fix
CLAUDE_HOOK_PROFILE=fast claude

# Persistent default (add to ~/.zshrc or ~/.bashrc)
export CLAUDE_HOOK_PROFILE=standard

# Per-project with direnv (.envrc in repo root)
export CLAUDE_HOOK_PROFILE=strict
export CLAUDE_DISABLE_UI_FONT_CHECK=1

# CI — GitHub Actions
jobs:
  review:
    runs-on: ubuntu-latest
    env:
      CLAUDE_HOOK_PROFILE: fast
      CLAUDE_DISABLE_AUDIT_TRAIL: 1
    steps:
      - uses: actions/checkout@v4
      - run: npx claude-code ...

# Combine kill switches for a silent session
export CLAUDE_HOOK_PROFILE=standard
export CLAUDE_DISABLE_INTENT_DETECT=1
export CLAUDE_DISABLE_SUBAGENT_VALIDATE=1
```

---

## 7. When to turn things off — scenario table

| Scenario                                                 | Set this                                                     |
|----------------------------------------------------------|--------------------------------------------------------------|
| CI run is too slow / doesn't need enforcement            | `CLAUDE_HOOK_PROFILE=fast`                                   |
| Going for maximum rigor before a release                 | `CLAUDE_HOOK_PROFILE=strict`                                 |
| You trust the repo and want silent session starts        | `CLAUDE_DISABLE_SETTINGS_AUDIT=1`                            |
| `~/.claude/audit/` filling disk / ephemeral container    | `CLAUDE_DISABLE_AUDIT_TRAIL=1`                               |
| Working without a `/dev` plan, plan-gate is noisy        | `CLAUDE_DISABLE_PLAN_GATE=1`                                 |
| Intent classifier misfires on your prompts               | `CLAUDE_DISABLE_INTENT_DETECT=1`                             |
| Long context, Opus 4.8, no need for compact state        | `CLAUDE_DISABLE_COMPACT_STATE=1`                             |
| Exploratory subagent runs, output contract not enforced  | `CLAUDE_DISABLE_SUBAGENT_VALIDATE=1`                         |
| Design system legitimately uses Inter / Roboto / etc.    | `CLAUDE_DISABLE_UI_FONT_CHECK=1`                             |
| Prototyping without a color token palette yet            | `CLAUDE_DISABLE_UI_COLOR_CHECK=1`                            |
| Intentional linear / physics-driven motion               | `CLAUDE_DISABLE_UI_ANIM_CHECK=1`                             |
| Simulating a smaller context window                      | `CLAUDE_CONTEXT_TOKENS_MAX=200000`                           |
| Testing a hook outside the harness                       | `CLAUDE_PROJECT_DIR=$PWD` piped into the hook                |

---

## 8. Discovery & audit

- Every hook's source of truth for its flag is a single-line check near the top of the script (`if [ "${CLAUDE_DISABLE_X:-}" = "1" ]; then exit 0; fi`). Grep to confirm:
  ```bash
  grep -rn "CLAUDE_DISABLE" packages/ | grep -v tests/
  ```
- Wire-up lives in `packages/core/settings.json` (core + stack hooks) and each self-contained package's `settings.json`.
- Profile default (`standard`) is set by `packages/core/helpers/statusline.cjs` when none is exported — the statusline shows the active profile next to the model name.
- Internal `CLAUDE_HOOK_PID` and `CLAUDE_PROJECT_DIR` are set by Claude Code itself; if they're missing, check you're launching via the harness and not piping into a hook manually.
