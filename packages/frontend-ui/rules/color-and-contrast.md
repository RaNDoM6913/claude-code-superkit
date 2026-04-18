---
name: color-and-contrast
description: "Color system rules — OKLCH over HSL, tinted neutrals, 60-30-10 weight, contrast, dark/light theme selection by use context. Auto-loaded when editing UI files."
tokens: 2033
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

# Color & Contrast

## Principles (always apply)

1. **Use OKLCH, not HSL.** OKLCH is perceptually uniform — equal steps
   in lightness *look* equal, which HSL does not deliver. Modern browsers
   all support `oklch()`; there is no reason to ship HSL in new code.
2. **Reduce chroma at the extremes of lightness.** High chroma at 90%+
   lightness or below 15% lightness reads as garish or muddy. A light
   blue at 85% lightness wants ~0.08 chroma, not the 0.15 of your base
   color. Similarly for deep shades — a near-black surface wants
   ~0.02 chroma, not 0.15.
3. **Tint your neutrals toward the brand hue.** Even a chroma of
   0.005–0.01 is perceptible and creates subconscious cohesion between
   brand color and UI surfaces. Pure neutrals feel disconnected.
4. **60-30-10 is about visual weight, not pixel count.** 60% neutrals
   and surfaces, 30% secondary text and borders, 10% accent. The accent
   works *because* it is rare; overuse destroys its power.
5. **No pure black or pure white.** `#000` and `#fff` never appear in
   nature. Always tint. A "near-black" surface at `oklch(15% 0.01 260)`
   is categorically different from `#000` even though the difference is
   subtle on first glance.

## Theme selection — by USE context

Theme (light vs dark) is DERIVED from the audience and physical viewing
context, not picked from a default. Read the brief and ask: when is this
product used, by whom, in what physical setting?

| Product | Theme | Reasoning |
|---------|-------|-----------|
| Perp DEX consumed during fast trading sessions | Dark | Reduces eye strain over long sessions; trading rooms often dim. |
| Hospital portal consumed by anxious patients on phones late at night | Light | Bright environment perception = trust/safety; dark feels ominous in healthcare. |
| Children's reading app | Light | Parents view dark interfaces as "less safe for kids"; content needs to feel open. |
| Vintage motorcycle forum (users in their garage at 9pm) | Dark | Matches the physical environment and enthusiast subculture. |
| Observability dashboard for SREs in dark rooms | Dark | Physical environment match; graph contrast against dark is clearer. |
| Wedding planning checklist on Sunday morning | Light | Bright/optimistic mood; physical environment bright. |
| Music player for headphone listening at night | Dark | Cinematic; physical environment dark. |
| Food magazine homepage browsed over coffee | Light | Food imagery reads as more appetising on light surfaces. |

**Do not default to light "to play it safe." Do not default to dark "to
look cool."** Both defaults are the lazy reflex. The correct theme is
the one the actual user wants in their actual context.

If neither dark nor light is obviously right, ship **light with a
high-quality dark mode**. (Not the other way around — light-first
designs tend to port to dark cleanly; dark-first designs often have
contrast issues in their light port.)

## Building the palette

### Step 1 — Pick the brand hue first

Every other decision follows from one anchor color. This is usually the
brand's actual hue (existing logo, product identity). If truly
greenfield, pick based on the three-word brief from
`typography-guidelines.md`:

- "warm, mechanical, opinionated" → oklch hue 30–60 (orange/brown)
- "calm, clinical, careful" → oklch hue 200–240 (cool blue-green)
- "expensive, quiet, precise" → oklch hue 20–40 with very low chroma
- "fast, dense, unimpressed" → oklch hue 120–160 with moderate chroma
  (mint/green) or a desaturated near-grey

### Step 2 — Build neutrals tinted toward the brand hue

```css
--neutral-0:  oklch(98% 0.005 <hue>);   /* page */
--neutral-10: oklch(94% 0.008 <hue>);   /* subtle surface */
--neutral-20: oklch(88% 0.010 <hue>);   /* hairline border */
--neutral-40: oklch(68% 0.012 <hue>);   /* placeholder / muted icon */
--neutral-60: oklch(50% 0.015 <hue>);   /* secondary text */
--neutral-80: oklch(30% 0.018 <hue>);   /* body text */
--neutral-95: oklch(15% 0.010 <hue>);   /* max-contrast text / deep surface */
```

Note: chroma INCREASES slightly into the middle of the scale and
DECREASES at both extremes. This matches perception.

### Step 3 — Accent scale with reduced chroma at extremes

```css
--accent-50:  oklch(95% 0.05 <hue>);
--accent-300: oklch(78% 0.12 <hue>);
--accent-500: oklch(60% 0.18 <hue>);   /* base brand color */
--accent-700: oklch(42% 0.14 <hue>);
--accent-900: oklch(22% 0.08 <hue>);
```

Compare chromas: `0.05 → 0.12 → 0.18 → 0.14 → 0.08`. The peak is in the
middle, not at either end. A 500 color at chroma 0.18 would be
overbearing at 900 lightness.

### Step 4 — Status colors, but treat them as system, not brand

Success, warning, error, info — these should NOT be your brand color
with a hue shift. They should be their own mini-palettes. An e-commerce
brand at hue 40 (orange) cannot use its accent 500 as a warning color —
there is no differentiation between brand and warning.

Use hue 140 (green) for success, hue 60–80 for warning, hue 25 (red-orange)
for error, hue 250 (blue) for info. Apply the same lightness/chroma
scaling as the accent scale.

## Contrast and accessibility

- **Text on background:** WCAG AA requires 4.5:1 for body text, 3:1 for
  18px+ or 14px+ bold. Use APCA where you can; it correlates better with
  readability than WCAG's formulas.
- **Do NOT use gray text on colored backgrounds.** Gray on a colored
  surface reads as washed out. Instead, use a shade of the background
  color — for an accent-tinted card, the body text should be a deep
  shade of the same hue, not neutral gray.
- **Borders:** a 1px border at `neutral-20` on a `neutral-0` background
  is the right starting point. If you need more separation, prefer a
  slight shadow over a heavier border.
- **Focus rings:** 2px minimum, contrast ≥3:1 against both the element
  and the background. Don't rely on default browser rings; they hide on
  colored surfaces.

## Modern CSS color tools

Use them. They are well-supported in 2025.

```css
/* Perceptually uniform lightness scale */
--surface: oklch(from var(--brand) 98% c h);

/* Mix between brand and neutral for hover states */
--brand-hover: color-mix(in oklch, var(--brand) 92%, black);

/* Auto light/dark */
color: light-dark(var(--neutral-80), var(--neutral-0));
background: light-dark(var(--neutral-0), var(--neutral-95));
```

## Color rules of execution

**DO:**
- Use `oklch()` everywhere. HSL in new code is tech debt.
- Tint your neutrals toward the brand hue. Check by viewing them beside
  pure gray — if they don't look different, increase chroma by 0.002.
- Use `color-mix()` for hover/pressed states instead of hand-picked shades.
- Use `light-dark()` for theme-aware colors; it is simpler than dual
  CSS variable sets.
- Pick a theme based on use context; document the reasoning in one line
  at the top of the palette file.

**DO NOT:**
- Use HSL for new palettes. (OK for small legacy patches, not for new
  systems.)
- Use pure `#000` / `#fff` / `rgb(0,0,0)` anywhere.
- Use gray text on a colored background. Tint the text.
- Ship the AI palette: cyan-on-dark, purple-to-blue gradient text,
  neon accents on a black page.
- Use gradient text for impact. Solid colors for text; see
  `ui-anti-patterns.md` for the strict definition.
- Default to dark mode with glowing accents "because it looks cool."
- Default to light mode "to play it safe."
- Use the same accent color for brand and for system colors (success,
  warning, error).

## Validation procedure (before shipping a palette)

1. Render the full neutral scale beside `#808080`. If any step looks
   identical to pure gray, increase its chroma by 0.002.
2. Render accent 500 on neutral 0, neutral 95, and a competitor
   accent. If it feels chromatic-stable across all three, proceed.
3. Run the palette through a deuteranopia / protanopia simulator
   (e.g., Sim Daltonism, Stark). If status colors collapse onto each
   other, re-hue them.
4. Check text on every background used — minimum 4.5:1 for body,
   3:1 for large.

---

Attribution: adapted from Impeccable's `reference/color-and-contrast.md`
(Apache-2.0). See `../NOTICE.md`.
