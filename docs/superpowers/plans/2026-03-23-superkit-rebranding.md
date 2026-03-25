# Superkit Rebranding — Implementation Plan (Plan 9)

> Remove all TGApp/ONYX/Telegram Dating references from superkit. Make it look like an independent project.

**Goal:** grep the entire superkit repo for TGApp-specific references, replace with generic alternatives. Showcase becomes "SocialApp" example.

**Working directory:** `/Users/ivankudzin/cursor/claude-code-superkit/`

---

## Naming Map

| Before | After |
|--------|-------|
| TGApp | SocialApp (or just "the project") |
| ONYX | — remove or "the app" |
| Telegram Dating Mini App | production social app |
| Telegram dating app | social app |
| onyxdate | example.com |
| dating app | social app |
| dating-app | social-app |
| ONYX Liquid Glass | — remove (design-specific) |
| #060609, #6A5CFF | — remove from core (keep in showcase only if needed) |
| Telegram Mini App with 60+ endpoints | production app with 60+ endpoints |
| moderator bot / support bot | moderation bot / support bot (already generic) |

---

## Task 1: Find all references

- [ ] **Step 1: Grep entire repo**

```bash
cd /Users/ivankudzin/cursor/claude-code-superkit
grep -ri "tgapp\|TGApp" --include="*.md" --include="*.sh" --include="*.json" --include="*.toml" -l
grep -ri "onyx\|ONYX" --include="*.md" -l
grep -ri "telegram dating\|dating app\|dating mini" --include="*.md" -l
grep -ri "onyxdate" --include="*.md" --include="*.sh" -l
grep -ri "telegram mini app" --include="*.md" -l
```

- [ ] **Step 2: Categorize files**

Split into:
- **Core/stack/extras** — MUST be clean (these ship to users)
- **Showcase** — rename to SocialApp but keep architecture
- **Docs/guide** — generalize examples
- **README/CONTRIBUTING** — update marketing copy

---

## Task 2: Clean core package

**Files:** `packages/core/**`

- [ ] **Step 1: Verify core is clean**

Core agents, commands, hooks, rules, skills should already be generic. Grep to confirm:
```bash
grep -ri "tgapp\|onyx\|telegram dating\|onyxdate" packages/core/ -l
```

If any found — replace with generic terms.

- [ ] **Step 2: Commit if changes**

---

## Task 3: Clean stack-agents and extras

**Files:** `packages/stack-agents/**`, `packages/extras/**`

- [ ] **Step 1: Grep and fix**
```bash
grep -ri "tgapp\|onyx\|telegram dating" packages/stack-agents/ packages/extras/ -l
```

- [ ] **Step 2: Commit if changes**

---

## Task 4: Rebrand showcase

**Files:** `packages/showcase/**`

- [ ] **Step 1: Rename all TGApp references**

In `packages/showcase/CLAUDE.md`:
- "TGApp — Telegram Dating Mini App" → "SocialApp — Social Discovery Platform"
- "dating-приложение для Telegram" → "social discovery application"
- "ONYX" references → remove or replace with "the app"
- "onyxdate.pro" → already replaced with "example.com"
- Bot names → "moderation-bot", "support-bot" (generic)

- [ ] **Step 2: Update showcase/README.md**

- "TGApp — Production Showcase" → "SocialApp — Production Showcase"
- "Telegram dating mini app" → "production social app"
- Keep stats (21 agents, 14 commands...) — they're impressive

- [ ] **Step 3: Clean showcase agents**

Grep `packages/showcase/.claude/agents/` for TGApp/ONYX references. Replace:
- "TGApp backend" → "the backend"
- "TGApp project" → "the project"
- "ONYX Liquid Glass" → "project design system"

- [ ] **Step 4: Clean showcase commands**

Same grep and replace in `packages/showcase/.claude/commands/`.

- [ ] **Step 5: Clean showcase skills**

Same for `packages/showcase/.claude/skills/`. The skill `onyx-ui-standard` can stay as an example of a design system skill, but rename:
- "ONYX UI Standard" → "App UI Standard"
- Or keep "ONYX" here since it's clearly a showcase example with its own branding

Decision: **keep ONYX in showcase skills** — it's obviously a project-specific skill, demonstrates customization.

- [ ] **Step 6: Commit**
```bash
git add packages/showcase/
git commit -m "refactor(showcase): rebrand TGApp → SocialApp, remove identifying references"
```

---

## Task 5: Update README.md

**Files:** `README.md`

- [ ] **Step 1: Replace origin story**

Before:
> "Extracted and generalized from a real Telegram Mini App with 60+ endpoints, 21 agents, and 48 database migrations."

After:
> "Battle-tested in production apps with 60+ endpoints, 21 agents, and 48 database migrations. Generalized for any project."

- [ ] **Step 2: Update showcase description**

Before:
> "a Telegram dating app with 21 agents..."

After:
> "a production social app with 21 agents..."

- [ ] **Step 3: Commit**
```bash
git add README.md
git commit -m "docs: remove project-specific references from README"
```

---

## Task 6: Update docs/guide/

**Files:** `docs/guide/*.md`

- [ ] **Step 1: Grep all chapters**
```bash
grep -ri "tgapp\|onyx\|telegram dating\|onyxdate" docs/guide/ -l
```

- [ ] **Step 2: Replace found references**

Generic replacements:
- "TGApp project" → "your project" or "the project"
- "Telegram dating app" → "social app" or "production app"
- Specific examples → keep if illustrative, just anonymize

- [ ] **Step 3: Commit**
```bash
git add docs/guide/
git commit -m "docs: generalize guide references"
```

---

## Task 7: Update docs/examples/

**Files:** `docs/examples/*.md`

- [ ] **Step 1: Grep and fix**
```bash
grep -ri "tgapp\|onyx\|telegram dating" docs/examples/ -l
```

- [ ] **Step 2: Replace if found**

- [ ] **Step 3: Commit**
```bash
git add docs/examples/
git commit -m "docs: generalize example references"
```

---

## Task 8: Update Codex package

**Files:** `packages/codex/**`

- [ ] **Step 1: Grep and fix**
```bash
grep -ri "tgapp\|onyx\|telegram dating" packages/codex/ -l
```

- [ ] **Step 2: Replace in AGENTS.md, INSTALL.md, skills**

- [ ] **Step 3: Commit**
```bash
git add packages/codex/
git commit -m "refactor(codex): remove project-specific references"
```

---

## Task 9: Final verification and push

- [ ] **Step 1: Final grep — zero matches expected**
```bash
grep -ri "tgapp" --include="*.md" --include="*.sh" --include="*.json" --include="*.toml" | grep -v "showcase/.claude/skills/tg-miniapp"
```

Allowed exceptions:
- `packages/showcase/.claude/skills/tg-miniapp/` — Telegram Mini App skill is a valid showcase example
- Commit messages in git history — can't change

- [ ] **Step 2: Push**
```bash
git push origin main
```

---

## Summary

| Scope | Action |
|-------|--------|
| Core/stack/extras | Verify clean (should already be generic) |
| Showcase | TGApp → SocialApp, ONYX → remove/generalize |
| README | "Telegram Mini App" → "production apps" |
| Docs/guide | Generalize any specific references |
| Examples | Generalize if found |
| Codex | Same cleanup |

**Time estimate:** Quick — mostly grep + sed replacements. ~20 minutes.

### Full plan map

| # | План | Задач | Статус |
|---|------|:-----:|--------|
| 1 | Superkit Core | 16 | **Выполнен** |
| 2 | TGApp Refactor | 10 | **Выполнен** |
| 3 | Docs & Showcase | 11 | **Выполнен** |
| 4 | Codex Support | 8 | **Выполнен** |
| 5 | Website Design Tools | 9 | Готов |
| 6 | Docs Architecture | 9 | Готов |
| 7 | Context-Aware Agents | 14 | Готов |
| 8 | AgentShield Integration | 8 | Готов |
| 9 | Rebranding | 9 | Готов |
