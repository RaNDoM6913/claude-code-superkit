---
name: typography-guidelines
description: "Typography rules — modular scales, fluid sizing, pairing, line-height, tracking, font-selection procedure, and the reflex_fonts_to_reject list. Auto-loaded when editing UI files."
tokens: 1775
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

# Typography Guidelines

## Principles (hard rules — apply to every UI edit)

1. **Fluid type on content, fixed type in product UI.** Marketing pages
   and long-form content: size headings with `clamp()` so they flow with
   the viewport. App UIs, dashboards, forms, and dense tables: fixed
   `rem` scales — no major design system uses fluid type in product UI,
   and fluid type inside dense tables is chaos.
2. **Fewer sizes, more contrast.** Use a 5-step scale with a **1.25×
   minimum ratio** between steps. Eight sizes at 1.1× apart produce a
   flat hierarchy that reads as undesigned.
3. **Line-height scales inversely with line length.** Narrow columns:
   1.2–1.35. Wide columns: 1.5–1.6. For light text on dark backgrounds,
   **add 0.05–0.1 to your normal line-height** — light type reads as
   lighter weight and needs more breathing room.
4. **Cap body line-length at 65–75ch.** Put `max-width: 65ch` (up to
   `75ch`) on text blocks. Wider body text is fatiguing.
5. **Pair a distinctive display font with a refined body font.** Never
   use a single font family for an entire page — you lose hierarchy
   tools.

## The font-selection procedure (4 steps, in order)

This procedure exists to break one reflex: "I was told not to use
Inter, so I will pick my next favorite font" — which becomes the new
monoculture.

### Step 1 — Write the brief in 3 concrete words

Stop and write down three concrete brand-voice words. Not "modern" and
not "elegant" — those are dead categories that do not help you decide.
Concrete examples:

- "warm and mechanical and opinionated"
- "calm and clinical and careful"
- "fast and dense and unimpressed"
- "handmade and a little weird"
- "expensive and quiet and precise"
- "loud and angular and young"

The three words will produce mutually exclusive type choices, which is
the point.

### Step 2 — List your reflex picks, then reject them

Write down the 3 fonts you would normally pick given those words. Check
every one against the canonical `reflex_fonts_to_reject` list — it
lives in `ui-anti-patterns.md`, section "The reflex_fonts_to_reject
list" (Inter, Fraunces, Playfair and Playfair Display, Space Grotesk,
and all system defaults are on it; read the full list there — this file
deliberately does not carry a second copy). Most of what you wrote down
will be on it. Reject every font on that list for this project,
including the one you were about to pick.

### Step 3 — Pick candidates from a catalog, brief words in mind

Ordered branches — use the first one that applies:

1. **Web access available (WebFetch/WebSearch):** browse these catalogs
   with the three words held in mind:
   - Google Fonts (filter aggressively — avoid the top 20)
   - Pangram Pangram
   - Future Fonts
   - Adobe Fonts
   - ABC Dinamo
   - Klim Type Foundry
   - Velvetyne
   - OH no Type Co
   - Uncut
2. **No web access:** propose 5–8 candidates recalled from those same
   foundries' catalogs. Verify each candidate is absent from the
   `reflex_fonts_to_reject` list before shortlisting it.
3. **Project cannot load web fonts at all** (offline target, no font
   pipeline): choose the most distinctive face already bundled with the
   project, or compose a deliberate system-safe stack — and state
   explicitly in your summary that the reject list was relaxed for this
   reason only.

In every branch, look for something that fits the brand **as a physical
object**: a museum exhibit caption, a hand-painted shop sign, a 1970s
mainframe terminal manual, a fabric label sewn inside a coat, a
children's book printed on cheap newsprint, a laminated menu from a
highway diner. Reject the first thing that "looks designy" — that is
the trained reflex too. Keep looking.

### Step 4 — Cross-check against reflex

Check your final pick against the type of brief:

- The right font for an **"elegant"** brief is NOT necessarily a serif.
- The right font for a **"technical"** brief is NOT necessarily a sans.
- The right font for a **"warm"** brief is NOT Fraunces.
- The right font for a **"premium"** brief is NOT Playfair.

If your final pick lines up with the reflex pattern (warm → Fraunces,
technical → Space Mono, elegant → Playfair), go back to Step 3.

## Web font loading

- Use `font-display: swap` for body text, `font-display: optional` for
  display headings that should render with the system fallback if the
  web font is late. Never use `font-display: block`.
- Preload only the one or two critical faces; preloading everything
  defeats the point.
- Subset aggressively. A display font used for a 3-word hero text should
  not ship the full 5000-glyph payload.
- Variable fonts save one HTTP request and allow a wider range of
  weights/widths — prefer them when available.
- For icon fonts: don't. Use SVG icons. Icon fonts lose accessibility
  context and scale inconsistently at small sizes.

## OpenType features worth turning on

- `ss01`, `ss02`, … — stylistic sets. Check the type foundry's showings;
  many fonts ship alternate character forms hidden behind these.
- `onum` — old-style figures for body text; `tnum` — tabular figures for
  tables and numeric columns.
- `kern` — usually on by default, confirm.
- `liga`, `calt` — ligatures; confirm appropriate for your audience.
- `case` — case-sensitive forms; turn on for all-caps tracking.

Example:
```css
.body { font-feature-settings: "onum", "kern", "liga"; }
.table-num { font-feature-settings: "tnum", "lnum"; }
```

## Tracking (letter-spacing)

- Display type (large headings, 40px+) often wants **slightly negative**
  tracking (`-0.01em` to `-0.03em`). The optical default at large sizes
  is too loose.
- Body type wants **0** tracking (rely on the type designer).
- Small caps and all-caps labels at <12px want **positive** tracking
  (`+0.05em` to `+0.12em`) for readability.
- Never apply the same tracking value across the whole scale. Tracking
  is optical and must vary with size.

## Typography rules of execution

**DO:**
- Vary font weights and sizes to create clear visual hierarchy.
- Vary font choices across projects. If your last project was a serif
  display with sans body, look at sans display / monospace / slab for
  the next one.
- Pair a distinctive display font with a refined body font.

**DO NOT:**
- Use any font on the canonical `reflex_fonts_to_reject` list
  (`ui-anti-patterns.md`, section "The reflex_fonts_to_reject list") —
  Inter, Roboto, Playfair, system defaults, all of them. Run the 4-step
  procedure above instead.
- Use monospace typography as lazy shorthand for "technical/developer
  vibes".
- Place large rounded-corner icons above every heading. They rarely add
  value and make sites look templated.
- Use one font family for the entire page.
- Let the type scale collapse — step ratios below 1.25× read as flat.
- Set long body passages in all-caps. Reserve all-caps for short labels
  and headings, ≤6 words.
- Use fluid type in product UI (forms, tables, dashboards) — Principle 1:
  fixed `rem` scales there.

---

Attribution: adapted from Impeccable's `reference/typography.md`
(Apache-2.0). See `../NOTICE.md`.
