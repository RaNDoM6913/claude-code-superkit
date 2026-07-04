---
name: ui-anti-patterns
description: "Explicit rejection list — banned fonts, banned color patterns, banned layout templates, banned motion patterns. The 'what not to do' companion to the positive design rules. Auto-loaded when editing UI files."
tokens: 2604
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

# UI Anti-Patterns

Consolidated rejection list. Every item here is the LLM's training-data
default; the positive rules (typography, color, motion, interaction)
say what TO do — this file catches the reflexes before they ship.

## Hard rules

1. **Every ban in this file is absolute.** ONE occurrence of any banned
   pattern = fix it before shipping. There is no acceptable count of
   banned patterns.
2. **The "3 or more" threshold in the reflex audit below controls only
   how reviewers aggregate findings** (one CRITICAL vs individual
   findings). It never licenses shipping 1–2 banned patterns — rule 1
   still applies to every hit.
3. **This file owns the single canonical `reflex_fonts_to_reject`
   list.** Sibling rules and agents reference it by section name; never
   copy the list into another file.
4. **After rejecting a banned font, run the 4-step font-selection
   procedure in `typography-guidelines.md`.** Do NOT simply pick your
   second-favorite font — that becomes the new monoculture.

## Banned typography

### The reflex_fonts_to_reject list

This is the canonical copy — the only full copy kit-wide.
`typography-guidelines.md` and `frontend-design-aesthetics.md` refer to
this section by name instead of restating it.

```
Fraunces
Newsreader
Lora
Crimson, Crimson Pro, Crimson Text
Playfair, Playfair Display
Cormorant, Cormorant Garamond
Syne
IBM Plex Sans, IBM Plex Serif, IBM Plex Mono
Space Mono, Space Grotesk
Inter
DM Sans, DM Serif Display, DM Serif Text
Outfit
Plus Jakarta Sans
Instrument Sans, Instrument Serif
```

And the system defaults: Arial, Helvetica, Roboto, Open Sans, Times New
Roman, system-ui.

Reject every one of these for every new project — they are the
training-data default and produce visual monoculture. Replacement path:
Hard rule 4 (the `typography-guidelines.md` procedure), never a
second-favorite swap.

### Other typographic bans

- **Monospace typography as "technical" shorthand.** IBM Plex Mono or
  JetBrains Mono on a marketing page to signal "we build technical
  products" is a lazy signal, not a design choice.
- **Single font family for an entire page.** You lose your hierarchy
  tools. Always pair display + body (or display + body + code).
- **All-caps body text.** Reserve all-caps for short labels (≤6 words)
  and headings with strong tracking (+0.05em or more).
- **Flat type hierarchy** (sizes within 1.1× of each other). Keep a
  minimum 1.25× ratio between scale steps.

## Banned color patterns

### Pure black and pure white

```css
/* NEVER */
color: #000;
color: #fff;
background: rgb(0, 0, 0);
background: rgba(0, 0, 0, 0.5);   /* even modal overlays should be tinted */
```

```css
/* INSTEAD */
color: oklch(15% 0.01 260);     /* near-black, tinted toward brand hue */
color: oklch(98% 0.005 260);    /* near-white, tinted toward brand hue */
background: oklch(15% 0.01 260 / 0.5);  /* tinted modal overlay */
```

### The AI palette

Four combinations that scream "I asked the model for something
futuristic" — all banned:

- **Cyan text on black backgrounds.** 1990s IDE nostalgia, not a design
  choice.
- **Purple-to-blue gradient backgrounds.** Deep purple bleeding into
  blue at 45° — every AI-generated landing page has one.
- **Neon accents on pure black.** Hot pink, electric green, neon cyan
  against `#000` reads as lazy "cyber" aesthetic.
- **Gradient text for impact** (`background: linear-gradient(...);
  background-clip: text; color: transparent;` on headlines). Fresh in
  2020; a template now.

Replacement: use solid colors for text; use gradients on surfaces
sparingly and with intention — never as the default hero background.

### Gray text on colored backgrounds

```css
/* NEVER */
.card {
  background: oklch(60% 0.18 280);  /* brand accent */
  color: #666666;                    /* grey body text — looks washed */
}

/* INSTEAD */
.card {
  background: oklch(60% 0.18 280);
  color: oklch(25% 0.10 280);       /* deep shade of the surface hue */
}
```

Always tint text toward a deeper shade of the surface hue.

### Default dark mode with glowing accents

Dark page + glowing neon accent = "dark mode cosplay". Pick dark mode
only when the USE CONTEXT demands it (see the theme-selection table in
`color-and-contrast.md`), and build it from tinted neutrals + a
restrained accent — not `#000` + neon glow.

## Banned layout patterns

### Nested cards

```jsx
// NEVER
<Card>
  <Card>
    <Card>Content</Card>
  </Card>
</Card>
```

Nesting cards means the card pattern is papering over poor hierarchy.
Flatten.

### Everything wrapped in cards

Not every section needs a card container — the page is the container.
Typography + spacing can make sections distinct without any surface
around them.

### The identical-card-grid template

```jsx
// NEVER as a default template
<div className="grid grid-cols-3 gap-4">
  <Card icon={Heart}  title="Feature 1" description="Lorem..." />
  <Card icon={Star}   title="Feature 2" description="Lorem..." />
  <Card icon={Shield} title="Feature 3" description="Lorem..." />
</div>
```

"Three identical cards, each with a rounded icon, heading, and 2-line
description" is the default AI marketing page. Break the pattern: one
feature at double width, asymmetric layout, varied content (not every
item needs an icon), a narrative flow.

Single exception: genuinely homogeneous data collections — pricing
tiers, plan comparisons, spec sheets — may use an identical-card grid,
because the sameness lives in the content, not the template.

### The hero-metrics template

```
[ BIG NUMBER ]
small label text
supporting stat row: 12M users · 4.9 rating · trusted by X
      [ gradient accent bar underneath ]
```

The default AI dashboard hero. Ditch the big number; lead with a real
headline that says what the user can DO.

### Centered everything

Centered text + centered layout + centered CTA reads as "template".
Default to left-aligned text with asymmetric image/element placement;
center only with a strong stated reason.

### Identical padding everywhere

```css
/* NEVER */
* { padding: 16px; }
.section, .card, .button, .modal { padding: 24px; }
```

Every spacing decision is a hierarchy opportunity — uniform spacing
flattens the hierarchy.

### Large rounded-corner icons above every heading

```jsx
// NEVER as a repeated pattern above every heading
<section>
  <div className="rounded-2xl p-3 bg-accent/10">
    <HeartIcon className="size-8" />
  </div>
  <h2>Section title</h2>
  <p>...</p>
</section>
```

Universal on AI-generated marketing pages; pure visual filler. Add an
icon only when it carries information the heading text does not.

## Banned motion patterns

- **`ease-in` on UI animations** — starts slow, feels sluggish. Use
  `ease-out` or the custom curves from `motion-and-animation.md`.
  Scope: this ban covers 2D UI element transitions; 3D/scroll-scrub
  viewport-exit animations are governed by `gsap-conventions`
  (frontend-3d package), which allows `power2.in` there.
- **`transition: all`** — specify exact properties. `all` animates
  layout properties (width, height, margin) that cause stutter.
- **`transform: scale(0)`** as entry animation — nothing in the real
  world appears from true zero. Use `scale(0.95)` + `opacity: 0`.
- **Bounce / elastic easing in standard UI transitions**
  (`cubic-bezier(0.68, -0.55, 0.265, 1.55)`) — reads as 2014 Material.
  Exception: subtle bounce (0.1–0.3) is allowed for drag-release and
  playful gestures — see the spring patterns in
  `motion-and-animation.md`.
- **Animation on keyboard shortcuts** (⌘K, ⌘/, ⌘S toggles). Power
  users hit these 100×/day; the animation is a tax.
- **Page-load splash animations.** Users want to use the product, not
  watch a logo breathe for 600ms on every load.
- **Animating `width`, `height`, `top`, `left`, `margin`.** These
  trigger layout and paint. Use `transform` and `opacity`, which are
  compositor-accelerated.

## Banned interaction patterns

- **No `:active` state on buttons.** Users can't tell if the click
  registered before the action completes.
- **Default browser focus rings on colored surfaces.** They vanish on
  non-white backgrounds — always ship your own focus style.
- **"OK" / "Cancel" on destructive confirmations.** Use specific verbs
  ("Delete project" / "Keep it"). Users muscle-memory-click "Confirm".
- **Validation errors on focus.** The user hasn't done anything yet.
  Validate on blur or submit.
- **Generic error messages** ("Invalid input", "Error: 422"). Tell the
  user what went wrong and how to fix it.
- **Bare "No results" empty states.** Prescribe a next action.
- **Modal animating from a corner when it rests centered.** Spatial
  dissonance. Modal = center-scale; popover = trigger-scale.
- **Floating labels in serious forms.** Accessibility edge cases with
  zoom/translate. Top-aligned labels by default.

## The LLM reflex audit (11 checks)

Before shipping UI, answer every box yes/no:

- [ ] Are you using Inter, DM Sans, or any `reflex_fonts_to_reject`
      entry?
- [ ] Is `#000` or `#fff` anywhere in the code?
- [ ] Does the page include a purple-to-blue gradient?
- [ ] Are there three identical cards with icon + heading + body?
- [ ] Is there a "big number / small label / stat row" hero?
- [ ] Is every section wrapped in a `Card`?
- [ ] Is the layout fully centered?
- [ ] Is the padding the same everywhere?
- [ ] Are rounded-corner icons above every heading?
- [ ] Is `ease-in` used on any UI animation, or `transition: all` anywhere?
- [ ] Is grey text sitting on a colored background?

Verdict — apply both lines:

1. **Any checked box is a banned pattern — fix it before shipping**
   (Hard rule 1). One checked box is not a pass.
2. Reviewer aggregation (same threshold as `ui-reviewer` and
   `ui-design-critic`): **3 or more checked boxes → raise ONE CRITICAL
   finding: "AI-reflex aesthetic — multiple defaults present"**,
   listing the hits inside it. 1–2 checked boxes → report each as an
   individual finding at its own severity.

---

Attribution: the `reflex_fonts_to_reject` list, the banned color
patterns, and the banned layout templates are adapted from Impeccable's
anti-patterns scattered across the reference files (Apache-2.0).
Additional motion bans (transition: all, scale(0)) and interaction bans
are Emil Kowalski's observations, re-expressed. See `../NOTICE.md`.
