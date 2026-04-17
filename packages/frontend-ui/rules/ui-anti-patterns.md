---
name: ui-anti-patterns
description: "Explicit rejection list — banned fonts, banned color patterns, banned layout templates, banned motion patterns. The 'what not to do' companion to the positive design rules. Auto-loaded when editing UI files."
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

A consolidated list of what NOT to ship. Every item here is the LLM's
training-data default. The positive rules (typography, color, motion,
interaction) tell you what TO do; this one catches the reflexes before
they reach production.

## Banned typography

### The reflex_fonts_to_reject list

Every model reaches for the same fonts when asked to "make it look
nice". These are them:

```
Fraunces
Newsreader
Lora
Crimson, Crimson Pro, Crimson Text
Playfair Display
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

**Reject every one of these for every new project.** They are the
training-data default and they create visual monoculture. When you
avoid them, do NOT simply pick your second-favorite font — that becomes
the new monoculture. Run the full font-selection procedure from
`typography-guidelines.md`.

### Other typographic bans

- **Monospace typography as "technical" shorthand.** Shipping IBM Plex
  Mono or JetBrains Mono on a marketing page to signal "we build
  technical products" is the visual equivalent of a t-shirt with a
  rocket emoji. Lazy.
- **Single font family for an entire page.** You lose your hierarchy
  tools. Always pair display + body (or display + body + code).
- **All-caps body text.** Reserve all-caps for short labels (≤6 words)
  and headings that have strong tracking (+0.05em+).
- **Flat type hierarchy** (sizes within 1.1× of each other). Aim for
  ≥1.25× between scale steps.

## Banned color patterns

### Pure black and pure white

```css
/* NEVER */
color: #000;
color: #fff;
background: rgb(0, 0, 0);
background: rgba(0, 0, 0, 0.5);   /* even modal overlays should be tinted */
```

Use tinted near-black and near-white:

```css
/* INSTEAD */
color: oklch(15% 0.01 260);     /* near-black, tinted toward brand hue */
color: oklch(98% 0.005 260);    /* near-white, tinted toward brand hue */
background: oklch(15% 0.01 260 / 0.5);  /* tinted modal overlay */
```

### The AI palette

These color combinations scream "I asked the model to make something
futuristic":

- **Cyan text on black backgrounds.** Nostalgic for 1990s IDE themes.
  Not a design choice.
- **Purple-to-blue gradient backgrounds.** Deep purple bleeding into
  blue at 45°. Every AI-generated landing page has one.
- **Neon accents on pure black.** Hot pink, electric green, neon cyan
  against `#000`. Reads as lazy "cyber" aesthetic.
- **Gradient text for impact.** `background: linear-gradient(...);
  background-clip: text; color: transparent;` applied to headlines.
  It was fresh in 2020. Now it's a template.

All four are reflexes. Use solid colors for text. Use gradients on
surfaces sparingly and with intention (never as the default hero
background).

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

Gray on a colored surface is a paint-by-numbers choice. Always tint the
text toward a deeper shade of the surface.

### Default dark mode with glowing accents

A dark page + glowing neon accent is "dark mode cosplay" — it looks
deliberately cool without requiring design decisions. If you pick dark
mode, pick it because the USE CONTEXT demands it (see
`color-and-contrast.md` theme-selection table), and use tinted neutrals
+ a restrained accent, not `#000` + neon glow.

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

Cards are a pattern for grouping related content that isn't already
grouped by position. Nesting cards means you are using the card pattern
to solve a problem the card pattern wasn't built for — usually poor
hierarchy. Flatten.

### Everything wrapped in cards

Not every section of a page needs a card container. The page is the
container. Pure typography + spacing can make sections feel distinct
without any surface around them.

### The identical-card-grid template

```jsx
// NEVER (unless the content genuinely warrants it)
<div className="grid grid-cols-3 gap-4">
  <Card icon={Heart}  title="Feature 1" description="Lorem..." />
  <Card icon={Star}   title="Feature 2" description="Lorem..." />
  <Card icon={Shield} title="Feature 3" description="Lorem..." />
</div>
```

"Three identical cards, each with a rounded-corner icon, heading, and
2-line description, centered on a section" is the default AI marketing
page. Break the pattern: one feature at double width, asymmetric
layout, varied content (not every item needs an icon), a narrative
flow.

### The hero-metrics template

```
[ BIG NUMBER ]
small label text
supporting stat row: 12M users · 4.9 rating · trusted by X
      [ gradient accent bar underneath ]
```

This is the default AI dashboard hero. It tells users nothing
interesting about the product. Ditch the big number; lead with a real
headline that says what the user can DO.

### Centered everything

Centered text + centered layout + centered CTA reads as "template".
Left-aligned text with asymmetric image/element placement reads as
"designed". Default to left-aligned/asymmetric unless there's a strong
reason to center.

### Identical padding everywhere

```css
/* NEVER */
* { padding: 16px; }
.section, .card, .button, .modal { padding: 24px; }
```

Every spacing decision is an opportunity for hierarchy. A heading with
extra space above it reads as more important. Uniform spacing
flattens the hierarchy.

### Large rounded-corner icons above every heading

```jsx
// Usually unnecessary
<section>
  <div className="rounded-2xl p-3 bg-accent/10">
    <HeartIcon className="size-8" />
  </div>
  <h2>Section title</h2>
  <p>...</p>
</section>
```

This pattern is used so universally on AI-generated marketing pages
that it has become visual filler. Icons rarely add meaning to a
heading; the heading already says what the section is about. Skip the
icon unless it earns its pixels.

## Banned motion patterns

- **`ease-in` on UI animations** — starts slow, feels sluggish. Use
  `ease-out` or custom curves.
- **`transition: all`** — specify exact properties. `all` animates
  layout properties (width, height, margin) that cause stutter.
- **`transform: scale(0)`** as entry animation — nothing in the real
  world appears from true zero. Use `scale(0.95)` + `opacity: 0`.
- **Bounce / elastic easing on UI** (`cubic-bezier(0.68, -0.55, 0.265,
  1.55)`). Dated. Reserve for playful interactions only.
- **Animation on keyboard shortcuts** (⌘K, ⌘/, ⌘S toggles). Power
  users hit these 100×/day; the animation is a tax.
- **Page-load splash animations.** Users want to use your product, not
  watch your logo breathe for 600ms on every load.
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

## The LLM reflex audit

Before shipping UI, run this mental checklist. Any "yes" answer is
probably a reflex to reject:

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
- [ ] Is `ease-in` used on any UI animation?
- [ ] Is `transition: all` used anywhere?
- [ ] Is grey text sitting on a colored background?

If more than two boxes are checked, the design has fallen into AI
defaults. Rewrite the offending pieces.

---

Attribution: the `reflex_fonts_to_reject` list, the banned color
patterns, and the banned layout templates are adapted from Impeccable's
anti-patterns scattered across the reference files (Apache-2.0).
Additional motion bans (transition: all, scale(0)) and interaction bans
are Emil Kowalski's observations, re-expressed. See `../NOTICE.md`.
