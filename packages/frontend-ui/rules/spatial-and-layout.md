---
name: spatial-and-layout
description: "Spacing, layout, grids, responsive design — 4pt scale, rhythm over uniformity, container queries for components, viewport queries for pages. Auto-loaded when editing UI files."
tokens: 1717
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

# Spatial Design & Layout

## Hard rules (always apply)

1. **Use the canonical spacing scale with semantic token names.** Canonical
   steps in px: **2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128** — 4pt multiples
   plus a single 2px hairline step (`--space-3xs`, for hairline gaps and icon
   nudges). This list and the token block below are the SAME set — use no
   spacing value outside it. Name tokens by size role (`--space-xs`,
   `--space-md`), never by pixel value (`--spacing-8`, `--p-12`) — pixel names
   break the moment the scale changes. 8pt-only is too coarse; 12px between
   two values is common.
2. **Use `gap`, not margins, for sibling spacing** inside flex/grid
   containers — `gap` cannot margin-collapse. Reserve margins for the outside
   of a component.
3. **Vary spacing to create hierarchy.** Different relationships get
   different values — use the mapping in "Visual rhythm" below. A heading
   with extra space above it reads as more important.
4. **Self-adjusting grids over media queries for card content.**
   `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` reflows
   without breakpoints. Add media queries only when the layout must genuinely
   rearrange, not when a grid needs to reflow.
5. **Container queries for components, viewport queries for pages.** A card
   inside a sidebar reacts to the sidebar's width via `@container`; use
   `@media` for page-level layout changes only.

## The spacing scale (canonical)

```css
:root {
  --space-3xs: 0.125rem;  /*  2px */
  --space-2xs: 0.25rem;   /*  4px */
  --space-xs:  0.5rem;    /*  8px */
  --space-sm:  0.75rem;   /* 12px */
  --space-md:  1rem;      /* 16px */
  --space-lg:  1.5rem;    /* 24px */
  --space-xl:  2rem;      /* 32px */
  --space-2xl: 3rem;      /* 48px */
  --space-3xl: 4rem;      /* 64px */
  --space-4xl: 6rem;      /* 96px */
  --space-5xl: 8rem;      /* 128px */
}
```

Fluid spacing variants for responsive marketing pages:

```css
--space-section: clamp(3rem, 8vw, 8rem);
--space-gutter:  clamp(1rem, 4vw, 3rem);
```

Rule of thumb: **fluid spacing for sections, fixed spacing inside
components.** A `Card` gets predictable `--space-md` padding; the gap between
one `Card` and the next can breathe with the viewport.

## Visual rhythm

Rhythm comes from VARIATION, not from uniform application of a single value.
Relationship → token:

- Tight groupings (related items) → `--space-xs` to `--space-sm`
- Heading-to-body gap (related) → `--space-sm`
- Body-to-next-heading gap (transitional) → `--space-xl`
- Section separation → `--space-xl` or `--space-2xl`
- Major breaks → `--space-3xl` or fluid `clamp()` values

## Grid patterns

### The breakpoint-free card grid

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-md);
}
```

Reflows from 4 columns at desktop to 1 at mobile with zero media queries.
Use for homogeneous card collections.

### The broken grid (for emphasis)

Intentionally break the grid for hero content, featured items, or visual
punctuation:

```css
.feature-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  grid-auto-rows: auto;
  gap: var(--space-lg);
}
.feature-grid > :first-child {
  grid-row: span 2;  /* The first cell takes double height */
}
```

Uniform 3-up card grids feel templated; a 2-1-1 pattern with one spanning
cell feels designed.

### The asymmetric hero

Left-aligned text + asymmetric image placement reads as "designed". Centered
text + centered image reads as "template". Default to asymmetric unless
there is a specific reason not to.

## Container queries

For components that appear in multiple layouts (sidebar, main, modal):

```css
.card {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 320px) {
  .card .header { flex-direction: row; }
}

@container card (min-width: 480px) {
  .card .header { font-size: var(--text-lg); }
}
```

The card adapts to its container's width, not the viewport's: a 320px card
in a narrow sidebar stays stacked even on a 1920px viewport.

## Fluid vs fixed — when to choose which

| Context | Strategy |
|---------|----------|
| Marketing page sections | Fluid (`clamp()`) |
| App shell (header, sidebar, footer) | Fixed — predictable interactions |
| Card / component internals | Fixed — consistency matters |
| Text sizes on marketing | Fluid headings, fixed body |
| Text sizes in product UI | Fixed throughout (see `typography-guidelines.md`) |
| Column widths in dashboards | Fixed with `minmax()` and explicit breakpoints |

Rule of thumb: **fluid where the content naturally expands, fixed where
users expect repeatable hit targets and interaction patterns.**

## Breakpoints (when you must use media queries)

Default set — mobile-first:

```css
/* Default: <640px (mobile) */

@media (min-width: 640px)  { /* small tablet */ }
@media (min-width: 768px)  { /* tablet / small laptop */ }
@media (min-width: 1024px) { /* desktop */ }
@media (min-width: 1280px) { /* wide desktop */ }
@media (min-width: 1536px) { /* max-out */ }
```

Prefer **`min-width`** (mobile-first) over `max-width` (desktop-first): each
breakpoint adds features rather than removing them.

## Spatial rules of execution

**DO:**
- Use the canonical spacing scale (2px hairline + 4pt steps) with semantic
  token names.
- Use `gap` for sibling spacing inside flex/grid containers.
- Vary spacing for hierarchy — different values between different
  relationships.
- Use `repeat(auto-fit, minmax(X, 1fr))` for breakpoint-free card grids.
- Use container queries for component-level responsiveness.
- Use viewport queries for page-level layout changes only.
- Use fluid `clamp()` spacing on marketing page sections.
- Break the grid intentionally for hero or featured content.
- Cap body text blocks at `max-width: 65ch`–`75ch` — the same 65–75ch limit
  as `typography-guidelines.md`.

**DO NOT:**
- Wrap everything in cards. Not every section needs a container.
- Nest cards inside cards. Visual noise; flatten.
- Ship the "3 identical cards with icon + heading + body" template. Use a
  broken grid, a single hero card, or a list with visual hierarchy — do
  something more considered.
- Ship the "big number / small label / stat row / gradient accent"
  hero-metrics template. It is the default for AI dashboards. Break it.
- Use identical spacing between every element. Monotony — nothing is
  emphasised when everything sits at the same weight.
- Center everything. Asymmetric left-aligned typically feels more designed.
- Use fluid typography/spacing inside dense product UI. Predictability >
  fluidity when users repeat the same action 100× a day.
- Let body text run wider than 75ch (see the DO cap above).

---

Attribution: adapted from Impeccable's `reference/spatial-design.md` and
`reference/responsive-design.md` (Apache-2.0). See `../NOTICE.md`.
