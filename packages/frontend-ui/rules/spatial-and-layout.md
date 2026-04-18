---
name: spatial-and-layout
description: "Spacing, layout, grids, responsive design — 4pt scale, rhythm over uniformity, container queries for components, viewport queries for pages. Auto-loaded when editing UI files."
tokens: 1735
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

## Principles (always apply)

1. **4pt spacing scale, semantic names.** Use `--space-xs`, `--space-sm`,
   `--space-md`, `--space-lg`, `--space-xl` — not `--spacing-8` or
   `--p-12`. Pixel-named tokens lose all flexibility the moment a
   designer changes the scale. Canonical 4pt steps: **4, 8, 12, 16, 24,
   32, 48, 64, 96, 128**. 8pt is too coarse — you will often want 12px
   between two values.
2. **Use `gap`, not margins, for sibling spacing.** Flexbox and Grid
   `gap` eliminates margin-collapse bugs and the cleanup hacks that come
   with them. Reserve margins for the outside of a component.
3. **Vary spacing to create hierarchy.** A heading with extra space
   above it reads as more important — make use of that. Identical
   padding everywhere makes interfaces feel monotonous and templated.
4. **Self-adjusting grids over media queries for card content.**
   `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` is a
   breakpoint-free responsive grid. Reach for media queries only when
   the layout genuinely needs to rearrange, not when a grid needs to
   reflow.
5. **Container queries for components, viewport queries for pages.**
   A card inside a sidebar should react to the sidebar's width, not
   the viewport's. Use `@container` for component responsiveness,
   `@media` for page-level layout changes.

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

Alternatively, fluid spacing for responsive marketing pages:

```css
--space-section: clamp(3rem, 8vw, 8rem);
--space-gutter:  clamp(1rem, 4vw, 3rem);
```

Rule of thumb: **fluid spacing for sections, fixed spacing inside
components.** A `Card` should have predictable `--space-md` padding;
the gap between the `Card` and the next `Card` can breathe with
viewport.

## Visual rhythm

Rhythm comes from VARIATION, not from uniform application of a single
value.

- Tight groupings → `--space-xs` to `--space-sm` between related items
- Section separation → `--space-xl` or `--space-2xl`
- Major breaks → `--space-3xl` or fluid `clamp()` values
- Heading-to-body gap (related) → `--space-sm`
- Body-to-next-heading gap (transitional) → `--space-xl`

A common mistake is to use `--space-md` between everything because it
"looks fine." It looks uniformly fine. Nothing is emphasised, because
everything is at the same weight.

## Grid patterns

### The breakpoint-free card grid

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-md);
}
```

This grid naturally reflows from 4 columns at desktop to 1 column at
mobile, without any media queries. Use it for homogeneous card
collections.

### The broken grid (for emphasis)

Intentionally break the grid for hero content, featured items, or
visual punctuation:

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

This is how editorial/magazine layouts get their rhythm. Uniform 3-up
card grids feel templated; a 2-1-1 pattern with one cell spanning
feels designed.

### The asymmetric hero

Left-aligned text + asymmetric image placement reads as "designed".
Centered text + centered image reads as "template". Default to
asymmetric unless there's a reason not to.

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

The card adapts to its container's width, not the viewport's. A 320px
card in a narrow sidebar stays stacked even if the viewport is 1920px
wide.

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

Prefer **`min-width`** (mobile-first) over `max-width` (desktop-first).
It composes better — each breakpoint adds features rather than removing
them.

## Spatial rules of execution

**DO:**
- Use a 4pt spacing scale with semantic token names.
- Use `gap` for sibling spacing inside flex/grid containers.
- Vary spacing for hierarchy — different values between different
  relationships.
- Use `repeat(auto-fit, minmax(X, 1fr))` for breakpoint-free card grids.
- Use container queries for component-level responsiveness.
- Use viewport queries for page-level layout changes only.
- Use fluid `clamp()` spacing on marketing page sections.
- Break the grid intentionally for hero or featured content.

**DO NOT:**
- Wrap everything in cards. Not every section needs a container.
- Nest cards inside cards. Visual noise; flatten.
- Ship the "3 identical cards with icon + heading + body" template.
  Use a broken grid, use a single hero card, use an unordered list with
  visual hierarchy — do something more considered.
- Ship the "big number / small label / stat row / gradient accent"
  hero-metrics template. It is the default for AI dashboards. Break it.
- Use identical spacing between every element. Introduces monotony.
- Center everything. Asymmetric left-aligned typically feels more
  designed.
- Use fluid typography/spacing inside dense product UI. Predictability
  > fluidity when users repeat the same action 100× a day.
- Let body text wrap beyond ~80 characters. `max-width: 65–75ch` on
  text blocks.

---

Attribution: adapted from Impeccable's `reference/spatial-design.md` and
`reference/responsive-design.md` (Apache-2.0). See `../NOTICE.md`.
