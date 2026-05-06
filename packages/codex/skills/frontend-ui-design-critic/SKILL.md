---
name: frontend-ui-design-critic
description: Holistic design critique — NOT a code review. Judges aesthetic coherence, composition, hierarchy, intentionality. "Does this feel designed or generated?"
user-invocable: false
---

# Frontend UI Design Critic

Activates on: user asks for critique / design-review / holistic-review / aesthetic-audit / "does this feel designed" · new UI surface built · 5+ UI files changed in one task.

Do NOT activate for bug fixes / single-component changes / tiny polish passes (use specialists instead).

## Phase 0: Context

1. Read `AGENTS.md` or `CLAUDE.md` + `docs/architecture/frontend-*.md`
2. Before critiquing, articulate in ONE SENTENCE what the design is going for. Examples:
   - "Quiet, editorial, confident — publication with a point of view."
   - "Maximalist, organic, handmade — warm independent shop."
   - "Brutal, utilitarian, fast — tool for people who know what they want."
   - "AI-template default — three cards with icons, purple gradient, big number hero, centered everything."

**If the direction reads as "AI-template default", that IS the finding.** Lead with it.

## Phase 1: The Reflex Audit (scaled across whole diff)

Count the 11 defaults across the ENTIRE diff:

- Reflex fonts (Inter / DM Sans / Fraunces / Playfair / IBM Plex / Space Grotesk / Plus Jakarta Sans / Instrument / Cormorant / Newsreader / Outfit)
- `#000` / `#fff` anywhere
- Purple→blue gradient · cyan-on-black · neon on pure black
- Three-identical-card grid
- Big-number hero template
- Every section in a Card
- Centered-everything
- Identical padding throughout
- Rounded-icon-above-every-heading
- `ease-in` on UI
- Gray text on colored background

**Scoring:** 0 = solid commitment · 1–2 = some defaults · 3+ = reflex aesthetic dominates · 5+ = CRITICAL generated-looking.

## Phase 2: Composition & Rhythm

- All-centered → WARNING (template reading)
- Uniform spacing `space-md` everywhere → WARNING
- Perfect equal-grid everywhere → SUGGESTION (break grid for emphasis)
- Dense-everywhere / no whitespace breathing room → SUGGESTION
- All text centered → WARNING (left-aligned reads as designed)

## Phase 3: Hierarchy

- Eye doesn't land anywhere → CRITICAL (hierarchy broken)
- Typography hierarchy flat (sizes within 1.2×) → WARNING
- Competing emphasis (multiple elements fighting for attention) → WARNING

## Phase 4: Conceptual Coherence

- Multiple conflicting aesthetic directions (minimal next to maximalist) → WARNING
- Details contradict direction (luxury UI using default shadcn buttons) → SUGGESTION
- AI-slop tells (generic stock illustrations, ChatGPT-voice copy like "Unlock your potential with…", template vector icons) → WARNING

## Phase 5: Memorability

Ask: would someone remember this? What's the one thing they'd tell a friend?

- Nothing memorable → SUGGESTION: propose concrete "one memorable thing" (distinctive interaction / type choice / surprising layout / signature color)
- Memorable thing is a cliché (purple-blue gradient) → SUGGESTION to replace
- Memorable thing works and fits → call it out as STRENGTH

## Output — Narrative Format

Do NOT produce a bulleted finding list. Use:

```
## Aesthetic direction
<one sentence naming what the design goes for>

## Reflex audit
<N/11 AI defaults present, one line>

## The problem (if there is one)
<one paragraph, concrete failures named>

## The strengths (if any)
<one paragraph, specific things that work>

## One concrete change that would move the needle
<single prescription, not a list, naming highest-impact shift>
```

End with severity counts if useful; narrative > counts.

## Hard Rules

- Do NOT produce a code review (file:line findings belong to specialists)
- Do NOT moralise. "Ugly" is not a critique. Name specific decisions that aren't working
- Compare to concrete references ("reads like default Next.js starter with Inter + cyan accent")
- Acknowledge strengths when they exist; a purely negative review is less useful
- Lead with the honest verdict if design is AI-default. Don't dance around it.
