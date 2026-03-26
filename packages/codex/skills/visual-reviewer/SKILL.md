---
name: visual-reviewer
description: Visual QA — screenshot comparison before/after, UI consistency check, design system compliance scoring
user-invocable: false
---

# Visual Reviewer

Compare UI screenshots before/after changes. Score visual consistency 0-100. Pass threshold: 90+.

## Phase 0: Load Project Context

Read if exists:
1. `AGENTS.md` — design system, UI conventions
2. `.codex/skills/project-architecture/SKILL.md` — UI components, styling approach
3. Frontend config files (tailwind.config, theme files)

## When to Use

- After frontend component changes in dev-orchestrator pipeline
- When touching CSS/styling files
- Before UI-heavy PR merges
- Design system migration validation

## Process

### Step 1: Identify Visual Changes

```bash
git diff --name-only | grep -E '\.(tsx|jsx|vue|svelte|css|scss|less|html)$'
```

If no visual files changed, skip and report "No visual changes detected."

### Step 2: Check for Screenshots

Look for screenshots in common locations:
- `/tmp/screenshots/`
- `tests/screenshots/`
- User-provided paths

If no screenshots available, perform **code-only visual review** (Step 3 alternative).

### Step 3: Code-Based Visual Review

When screenshots are unavailable, review code for visual consistency:

1. **Color consistency** — are colors from the design system/theme, not hardcoded hex?
2. **Spacing consistency** — are spacing values from the scale (4px/8px/12px/16px/24px/32px)?
3. **Typography** — are font sizes/weights from the type scale?
4. **Z-index** — are z-index values from a defined scale, not arbitrary numbers?
5. **Responsive** — are breakpoints using the defined set?
6. **Animation** — are transitions using the project's animation library/conventions?
7. **Accessibility** — are interactive elements focusable? Alt text on images? Aria labels?
8. **Dark mode** — if the project supports it, are new elements themed correctly?

### Step 4: Score

| Check | Weight | Pass Criteria |
|-------|--------|---------------|
| Color system compliance | 15 | All colors from theme/design tokens |
| Spacing scale compliance | 15 | All spacing from defined scale |
| Typography compliance | 10 | Font sizes/weights from type scale |
| Z-index discipline | 10 | Values from defined scale |
| Responsive correctness | 15 | All breakpoints covered |
| Animation consistency | 10 | Uses project animation library |
| Accessibility | 15 | Focusable, labeled, contrast OK |
| Dark mode (if applicable) | 10 | Themed correctly |

Score = weighted sum. **PASS >= 90, WARN 70-89, FAIL < 70.**

## Output Format

```
## Visual Review

### Changed Components
| File | Component | Visual Impact |
|------|-----------|---------------|
| path/to/file | ComponentName | HIGH/MEDIUM/LOW |

### Checks
| Check | Score | Issues |
|-------|-------|--------|
| Color system | 15/15 | None |
| Spacing | 12/15 | 2 hardcoded values |
| ... | ... | ... |

### Total Score: XX/100 — PASS/WARN/FAIL

### Issues
[SEVERITY] file:line — description
  Fix: suggestion
```
