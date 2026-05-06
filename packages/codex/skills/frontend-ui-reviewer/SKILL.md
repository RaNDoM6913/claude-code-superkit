---
name: frontend-ui-reviewer
description: 2D frontend UI umbrella review — typography, color, layout, motion, interaction. Runs a quick reflex audit, dispatches specialist sub-skills when a domain needs deep attention, consolidates findings.
user-invocable: false
---

# Frontend UI Reviewer (Umbrella)

Auto-activates when:
- User asks for audit/review/polish/critique AND active edits are in `.tsx/.jsx/.ts/.css/.scss/.html/.vue`
- 3+ UI file edits completed in a task
- Before a commit staging ≥2 UI files

Do NOT activate for `.go/.py/.rs/.java` backend, 3D/WebGL/R3F (use frontend-3d skills), tests, non-token configs.

## Phase 0: Load Context

1. Read `AGENTS.md` or `CLAUDE.md` — product, brand cues, tech stack
2. Read `docs/architecture/frontend-*.md` if present
3. Derive brand voice in 3 concrete words ("expensive, quiet, precise" / "fast, dense, unimpressed" etc.)
4. If context unclear, ask ONE targeted question mid-review — never an upfront questionnaire

## Phase 1: Reflex Audit (the 11 AI defaults)

Quick scan the diff. Check off any that apply:

- [ ] Reflex-list font (Inter / DM Sans / Fraunces / Playfair / IBM Plex / Space Grotesk / Plus Jakarta Sans / Instrument / Cormorant / Newsreader / Outfit / Syne / Lora / Crimson)
- [ ] `#000` / `#fff` / `rgb(0,0,0)` / `rgb(255,255,255)` anywhere
- [ ] Purple→blue gradient
- [ ] Cyan-on-black
- [ ] Three-identical-card grid
- [ ] Big-number hero template
- [ ] Every section in a Card (or nested cards)
- [ ] Centered-everything
- [ ] Identical padding throughout
- [ ] Rounded-icon-above-every-heading
- [ ] `ease-in` on UI animation OR `transition: all`
- [ ] Gray text on colored background

**Scoring:** 0 hits = solid. 1–2 = some defaults. 3+ = reflex aesthetic dominates (CRITICAL). 5+ = generated-looking.

## Phase 2: Dispatch Specialists (parallel where possible)

| Domain with non-trivial change | Dispatch |
|-------------------------------|----------|
| Font / type / hierarchy | `frontend-ui-typography-reviewer` |
| Palette / theme / OKLCH | `frontend-ui-color-reviewer` |
| Transitions / animation / motion | `frontend-ui-motion-reviewer` |
| Button / modal / form / focus | `frontend-ui-interaction-reviewer` |
| Holistic "does it feel designed" | `frontend-ui-design-critic` |

## Phase 3: Consolidate

Format each finding:

```
[SEVERITY · CONFIDENCE] <title>
<file>:<line>
<what's wrong · 1-2 sentences>
<why it matters · 1-2 sentences, cite rule if possible>
Suggested change: <concrete code>
```

- SEVERITY: CRITICAL (ships broken UX) / WARNING (degrades quality) / SUGGESTION (could improve)
- CONFIDENCE: HIGH / MEDIUM / LOW

Group by severity; within severity, sort by file path.

## Phase 4: Summary

One paragraph: severity counts, top-line assessment ("shipping AI reflex" / "good adherence, minor polish" / "solid execution"), one concrete next step.

## Hard Rules

- Never review backend or 3D files — check the extension, opt out silently
- Never pad findings — terse accurate beats verbose speculative
- Always say "I cannot determine X without Y" when that's true
- Always cite the rule a finding leans on, when applicable
- Never suggest a different reflex font to replace one — both are on the list
