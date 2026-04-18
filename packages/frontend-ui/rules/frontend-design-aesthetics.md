---
name: frontend-design-aesthetics
description: "Top-level principles for producing distinctive, production-grade frontend UI. Points at deeper rules (typography, color, motion, etc.). Auto-loaded when editing UI files."
tokens: 1352
alwaysApply: false
applyWhenPaths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.ts"
  - "**/*.css"
  - "**/*.scss"
  - "**/*.html"
  - "**/*.vue"
  - "**/tailwind.config.*"
  - "**/*.tokens.*"
---

# Frontend Design Aesthetics — Principles

The default aesthetic LLMs reach for when asked to "build a nice UI" is a
monoculture: Inter, purple-to-blue gradients on dark backgrounds, cards
inside cards, centered layouts, gray body text on colored surfaces.
This rule and its siblings explicitly reject that default and give you a
path to a distinctive, production-grade result.

## Core principles (always apply)

1. **Intentionality over intensity.** Bold maximalism and refined minimalism
   both work. Flat mediocrity does not. Commit to a clear conceptual
   direction — brutally minimal, editorial/magazine, retro-futuristic,
   organic, luxury/refined, playful/toy-like, brutalist/raw, etc. — and
   execute it with precision.

2. **Context over default.** The decisions that matter (dark vs light,
   serif vs sans, tight vs airy spacing, sharp vs soft motion) follow from
   the product's audience and use context, not from a safe default.
   See `color-and-contrast.md` for the theme-by-context decision table and
   `typography-guidelines.md` for font selection procedure.

3. **Fewer choices, more contrast.** A 5-step type scale with at least a
   1.25 ratio between steps beats an 8-step scale at 1.1×. A 3-color
   palette with one dominant / one secondary / one accent at 60/30/10
   weight beats a palette where everything shows up in equal amounts.

4. **Tint everything.** Pure black and pure white never appear in nature
   and never look designed. Neutrals should carry a faint chroma nudge
   toward the brand hue. See `color-and-contrast.md`.

5. **Variation creates rhythm.** Identical padding everywhere and
   identical card grids make interfaces feel templated. Tight groupings,
   generous separations, and intentional asymmetry make them feel
   designed. See `spatial-and-layout.md`.

6. **Motion has a purpose or does not exist.** An animation on a keyboard
   shortcut toggled 100× a day is a tax, not a delight. Animations on
   rare/first-time interactions can be expressive. Everything in between
   needs a clear "why". See `motion-and-animation.md`.

## The five rejections (applied without exception)

These are in `ui-anti-patterns.md` in detail. In short:

- **Reject the reflex fonts** (Inter, DM Sans, Fraunces, Newsreader, Lora,
  IBM Plex, Space Grotesk, Plus Jakarta Sans, Instrument Sans, Cormorant,
  Playfair, Syne, Outfit, Space Mono, and the full `reflex_fonts_to_reject`
  list). They are training-data defaults and they produce monoculture.
- **Reject pure black/white** (`#000`, `#fff`). Tint toward the brand hue.
- **Reject gray-on-colored.** Gray body text on a colored surface looks
  washed out. Use a shade of the surface color instead.
- **Reject the AI palette.** Cyan-on-black, purple-to-blue gradients, neon
  glows on dark backgrounds. These scream "I asked the model to make
  something futuristic."
- **Reject nested cards and the identical-card-grid template.** Not
  everything needs a container. Not every section needs three identical
  cards with icon + heading + body.

## Before writing any UI: gather design context

Design skills produce generic output without project context. Before
touching UI code, confirm these three things. **Do not infer from code —
code tells you what was built, not who it's for or how it should feel.**

1. **Target audience:** who uses this product and in what context?
2. **Use cases:** what jobs are they trying to get done?
3. **Brand personality / tone:** how should the interface feel?

### Where to find this context (in order)

1. **The user's prompt for this task.** Sometimes the answer is there.
2. **`CLAUDE.md` and `README.md` at project root.** Product description,
   name of the frontend, tech stack. An app called "ONYX" with a
   glassmorphism design system and luxury product vocabulary is not the
   same as a "corp-dashboard" for ops engineers.
3. **`docs/architecture/frontend-*.md`** if present — screen structure,
   navigation model, design token system.
4. **Auto-memory.** Prior sessions may have recorded brand context in
   a `project_brand_context.md` memory entry.
5. **Ask the user ONE targeted question** when sources 1–4 leave a
   specific decision ambiguous. Ask it at the moment the decision is
   being made, not upfront as a questionnaire. Example: "I'm about to
   pick motion durations — is this product used in rapid trading-style
   sessions, or contemplatively (reading, browsing)?"

After the user answers, persist the answer to auto-memory so future
sessions do not re-ask.

**Do not:** run a 5-question upfront survey before starting work. Do not
block on unknowable context — for information you cannot derive and the
user has not supplied, make a clear choice, state the assumption out loud,
and keep moving.

## How the specialist rules fit together

| If you are working on… | Consult |
|------------------------|---------|
| Choosing fonts, setting hierarchy | `typography-guidelines.md` |
| Palette, contrast, dark vs light | `color-and-contrast.md` |
| Grids, spacing, responsive | `spatial-and-layout.md` |
| Transitions, easings, durations, springs | `motion-and-animation.md` |
| Buttons, modals, drawers, forms, focus | `interaction-polish.md` |
| Anything the model wants to reach for | `ui-anti-patterns.md` (as a guard) |

Each rule is auto-loaded on the same file-path matchers as this one. If
you are reading this rule, you have all seven.
