---
name: motion-and-animation
description: "UI motion rules — the 4-question animation framework, easing curves, duration tables, springs, reduced motion. Auto-loaded when editing UI files."
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

# Motion & Animation

Motion is the detail users don't consciously notice, but the aggregate
of correct motion is why some interfaces feel "right" and others feel
cheap. The opposite — animation for animation's sake, everywhere — is
worse than no animation at all.

## The 4-question framework (ask in order, before writing any animation)

### Question 1 — Should this animate at all?

Answer first by frequency of exposure:

| User exposure | Default |
|---------------|---------|
| 100+ times per day (keyboard shortcuts, command palette toggle, every list navigation) | **No animation.** |
| Tens of times per day (hover effects, tab switches, simple toggles) | Remove or drastically reduce — aim for ≤100ms or none. |
| Occasional (modals, drawers, toasts, navigating between sections) | Standard animation — the meat of UI motion. |
| Rare or first-time (onboarding, celebratory moments, form submission success) | Can be expressive and expansive. |

**Never animate keyboard-initiated actions.** Keyboard shortcuts are
used by power users hundreds of times daily. An animation on
<kbd>⌘K</kbd> command palette open adds delay to the exact moment the
user is trying to be fast. Raycast's command palette has no open/close
animation, and that is not an oversight — it is the right call for
something used that often.

Applied corollary: **an animation a user will see 50 times today has
to earn its keep.** If you cannot clearly state what purpose it serves,
remove it.

### Question 2 — What is the purpose?

Every animation should answer "why does this animate?" with one of these:

- **Spatial consistency.** A toast slides in from the right; when the
  user swipes it away to the right, they intuit where it went because
  it entered from there. Entry direction = exit direction.
- **State indication.** A button morphs shape to signal the state
  change (idle → loading → success). Without motion, the state change
  feels invisible.
- **Explanation.** A marketing animation that demonstrates a feature's
  workflow in 3 seconds.
- **Feedback.** A button scales 0.97 on `:active`, confirming the
  interface registered the press before the action completes.
- **Preventing jarring change.** An element suddenly appearing or
  disappearing without transition reads as a bug. Fade + slight
  scale-from-0.95 avoids that.

If the answer is "it looks cool" and the user sees it often, don't do
it.

### Question 3 — What easing should it use?

Decision flow:

```
Is the element entering or exiting the screen?
  Yes → ease-out   (starts fast; feels responsive; user sees immediate motion)

  No →
    Is it moving or morphing on-screen (not entering/exiting)?
      Yes → ease-in-out   (natural accel/decel; movement feels organic)

    Is it a hover, color change, or opacity-only transition?
      Yes → ease   (gentle; the default cubic is fine here)

    Is it constant motion (marquee, progress bar, spinner)?
      Yes → linear

    Default fallback → ease-out
```

**Never use `ease-in` for UI animations.** `ease-in` starts slow, which
makes the interface feel sluggish at the exact moment the user is
watching most closely. A dropdown with `ease-in` at 300ms *feels*
slower than the same dropdown with `ease-out` at 300ms, because
`ease-in` delays the initial movement. `ease-in` is for elements
*leaving* the screen in a way that should feel heavy (rarely
appropriate in UI).

#### Custom curves (stronger than the CSS defaults)

CSS's built-in `ease-out` / `ease-in-out` are too weak to feel
intentional. Use custom `cubic-bezier()` curves:

```css
:root {
  /* Strong ease-out for UI element entry */
  --ease-out:    cubic-bezier(0.23, 1, 0.32, 1);

  /* Strong ease-in-out for on-screen morphing/moving */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);

  /* iOS-style drawer curve */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);

  /* Snappy / responsive — for tiny UI transitions (hovers, buttons) */
  --ease-snappy: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

Use these by default. Built from scratch curves are almost never better
than these four.

### Question 4 — How long should it take?

| Element | Duration |
|---------|----------|
| Button press feedback (`:active` scale) | 100–160ms |
| Tooltip / small popover open | 125–200ms |
| Dropdown / select open | 150–250ms |
| Tab / section transition | 180–300ms |
| Modal / drawer open-close | 200–500ms |
| Toast slide in-out | 200–350ms |
| Page transition (SPA) | 300–500ms |
| Marketing explainer / onboarding demo | Can be 500–2000ms+ |

**Keep UI animations under 300ms** unless they're genuinely
explanatory. A 180ms dropdown feels more responsive than a 400ms one;
the shorter duration is almost always better.

**Perceived-performance nuance:** a faster-spinning spinner makes the
app feel faster even when the actual load time is identical. Speed
signal > truth signal for loading affordance.

## Springs vs duration-based

Springs simulate physics — they don't have fixed durations; they settle
based on stiffness/damping/mass parameters. Use them when:

- **Drag-with-momentum gestures** — swipe-to-dismiss a sheet, flick a
  card. Springs maintain velocity across release.
- **Decorative mouse-tracking interactions** — a subtle parallax on a
  hero element. Tying visuals directly to mouse position (no spring)
  feels artificial and computery. `useSpring` gives it life.
- **"Alive"-feeling UI elements** — Apple's Dynamic Island, responsive
  icons that subtly settle.
- **Gestures that can be interrupted mid-animation.** Springs preserve
  velocity when interrupted; CSS animations restart from zero.

Don't use them for:
- Simple state transitions (open/close, in/out). Duration-based
  ease-out is more predictable and easier to tune.
- Anything functional where predictability matters more than
  naturalness (trading interface, banking, medical).

### Spring configuration patterns

```js
// Apple-style (easy to reason about):
{ type: "spring", duration: 0.5, bounce: 0.2 }

// Traditional physics:
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

Keep `bounce` subtle (0.1–0.3) when you use it. Avoid bounce in UI
unless the interaction genuinely asks for it (drag-to-dismiss, playful
notification).

### Mouse-tracking springs — example

```jsx
// Without spring — feels artificial, instant, computery
const rotation = mouseX * 0.1;

// With spring — feels natural, has settle
import { useSpring } from 'framer-motion'; // or 'motion/react'
const rotation = useSpring(mouseX * 0.1, {
  stiffness: 100,
  damping: 10,
});
```

## Reduced motion — required, not optional

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This blanket rule is the safe default. For app-specific motion (JS-
driven), check `window.matchMedia('(prefers-reduced-motion: reduce)')`
and short-circuit the animation. Users with vestibular disorders need
this; skipping it is an accessibility bug.

## Motion rules of execution

**DO:**
- Ask the 4 questions before writing any animation.
- Use custom `cubic-bezier` curves (stronger than CSS defaults).
- Use `ease-out` for entry/exit, `ease-in-out` for on-screen morph.
- Keep UI animations under 300ms by default.
- Specify exact properties in transitions (`transition: transform
  200ms ease-out`), not `transition: all`.
- Animate `transform` and `opacity` — they're compositor-accelerated.
  Other properties trigger layout/paint and can stutter.
- Use springs for drag/momentum/interruptible gestures.
- Honor `prefers-reduced-motion`.
- Scale `from 0.95` and fade for entry, not `from 0`. Nothing in the
  real world appears from true zero size.

**DO NOT:**
- Animate keyboard-initiated actions (⌘K open, etc.).
- Use `ease-in` for UI animations.
- Use `transition: all` — specify exact properties.
- Ship bounce/elastic easing in UI (feels dated, 2014 Material).
- Animate for decoration alone if the user sees it 50×/day.
- Animate `width`, `height`, `top`, `left`, `margin` — use `transform`.
- Forget reduced motion.
- Use scale(0) as entry — scale(0.95) reads as natural.
- Use the same duration everywhere. Duration is a property, not a
  constant.

## Output format for motion review

When reviewing UI motion code, output a `| Before | After | Why |`
markdown table — one row per issue found, the "Why" column carrying the
reasoning. Do not use bulleted lists with "Before:" and "After:" on
separate lines. Example:

| Before | After | Why |
| --- | --- | --- |
| `transition: all 300ms` | `transition: transform 200ms ease-out` | Specify exact properties; `all` animates layout props that cause stutter. |
| `transform: scale(0)` | `transform: scale(0.95); opacity: 0` | Nothing appears from true zero. |
| `ease-in` on dropdown | `ease-out` with `--ease-snappy` | `ease-in` delays the initial motion, making it feel sluggish. |
| No `:active` state on button | `transform: scale(0.97)` for 100ms | Buttons must confirm the press. |
| `transform-origin: center` on popover | `transform-origin: var(--radix-popover-content-transform-origin)` | Popovers should scale from their trigger point (modals stay centered). |

---

Attribution: duration tables, easing `cubic-bezier` constants, spring
configurations, and the 4-question framework structure are adapted from
Emil Kowalski's design-engineering skill (https://emilkowal.ski/skill).
Prose has been written independently for this package. Remaining
material draws from Impeccable's `reference/motion-design.md` (Apache-
2.0). See `../NOTICE.md`.
