---
name: motion-and-animation
description: "UI motion rules — the 4-question animation framework, easing curves, duration tables, springs, reduced motion. Auto-loaded when editing UI files."
tokens: 2655
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

Correct motion in aggregate is why an interface feels "right"; animation
for its own sake is worse than none.

## Hard rules

1. Ask the 4 questions below, in order, before writing any animation.
2. **Scope:** this rule governs 2D UI element transitions.
   3D/scroll-scrub contexts are governed by gsap-conventions
   (frontend-3d package), which allows `power2.in` for viewport-exit
   animations.
3. Easing in 2D UI: `ease-out` for enter/exit, `ease-in-out` for
   on-screen morphing, `linear` for constant motion. No `ease-in` in
   this scope (3D exception in rule 2).
4. Keep UI animations under 300ms unless genuinely explanatory.
5. Animate `transform` and `opacity` by default; never animate layout
   properties (`width`, `height`, `top`, `left`, `margin`). Name exact
   properties — never `transition: all`.
6. Honor `prefers-reduced-motion` (blocks below); skipping it is an
   accessibility bug.
7. Bounce/elastic: none in standard UI transitions; a subtle bounce
   (0.1–0.3) is allowed only for drag-release and playful gestures.

## The 4-question framework (ask in order, before writing any animation)

### Question 1 — Should this animate at all?

Decide by frequency of exposure:

| User exposure | Default |
|---------------|---------|
| 100+ times per day (keyboard shortcuts, command palette toggle, every list navigation) | **No animation.** |
| Tens of times per day (hover effects, tab switches, simple toggles) | Remove or drastically reduce — aim for ≤100ms or none. |
| Occasional (modals, drawers, toasts, navigating between sections) | Standard animation — the meat of UI motion. |
| Rare or first-time (onboarding, celebratory moments, form submission success) | Can be expressive and expansive. |

**Keyboard-initiated actions get no animation** (<kbd>⌘K</kbd> palette
open, shortcut navigation): power users trigger them hundreds of times
daily, and animation delays the exact moment they are trying to be
fast. Raycast's command palette opens with no animation by design.

An animation a user sees 50 times today has to earn its keep — if you
cannot state its purpose (Question 2), remove it.

### Question 2 — What is the purpose?

Every animation must answer "why does this animate?" with one of these
five purposes:

1. **Spatial consistency.** A toast slides in from the right; when the
   user swipes it away to the right, they intuit where it went because
   it entered from there. Entry direction = exit direction.
2. **State indication.** A button morphs shape to signal the state
   change (idle → loading → success). Without motion, the state change
   feels invisible.
3. **Explanation.** A marketing animation that demonstrates a feature's
   workflow in 3 seconds.
4. **Feedback.** A button scales 0.97 on `:active`, confirming the
   interface registered the press before the action completes.
5. **Preventing jarring change.** An element suddenly appearing or
   disappearing without transition reads as a bug. Fade + slight
   scale-from-0.95 avoids that.

If the answer is "it looks cool" and the user sees it often, remove the
animation.

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

**Entries and exits both use `ease-out` in 2D UI.** `ease-out` starts
fast, so the user sees immediate motion; `ease-in` starts slow, so a
300ms dropdown with `ease-in` feels more sluggish than the identical
dropdown with `ease-out`. Do not use `ease-in` for 2D UI element
transitions. 3D/scroll-scrub contexts are governed by gsap-conventions
(frontend-3d package), which allows `power2.in` for viewport-exit
animations — that exception never applies to the UI transitions covered
here.

#### Custom curves (stronger than the CSS defaults)

CSS's built-in `ease-out` / `ease-in-out` are too weak to feel
intentional. Use these four custom `cubic-bezier()` curves by default —
curves built from scratch are almost never better:

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

**Keep UI animations under 300ms** unless they are genuinely
explanatory — a 180ms dropdown feels more responsive than a 400ms one.
Perceived-performance nuance: a faster-spinning spinner makes the app
feel faster even when actual load time is identical.

## Springs vs duration-based

Springs simulate physics — no fixed duration; they settle from
stiffness/damping/mass parameters. Use them for:

- **Drag-with-momentum gestures** — swipe-to-dismiss a sheet, flick a
  card. Springs maintain velocity across release.
- **Decorative mouse-tracking interactions** — a subtle parallax on a
  hero element. Binding visuals directly to mouse position (no spring)
  feels artificial and computery; `useSpring` gives it life.
- **"Alive"-feeling UI elements** — Apple's Dynamic Island, responsive
  icons that subtly settle.
- **Gestures interruptible mid-animation** — springs preserve velocity
  when interrupted; CSS animations restart from zero.

Do not use springs for:

- Simple state transitions (open/close, in/out) — duration-based
  `ease-out` is more predictable and easier to tune.
- Functional contexts where predictability matters more than
  naturalness (trading interface, banking, medical).

### Spring configuration patterns

```js
// Apple-style (easy to reason about):
{ type: "spring", duration: 0.5, bounce: 0.2 }

// Traditional physics:
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

Standard UI transitions use no bounce. When the interaction is a
drag-release or playful gesture (drag-to-dismiss, playful
notification), a subtle `bounce` of 0.1–0.3 is allowed — never higher.

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

This blanket rule is the safe default. For JS-driven motion, check
`window.matchMedia('(prefers-reduced-motion: reduce)')` and
short-circuit the animation. Users with vestibular disorders need this;
skipping it is an accessibility bug.

## Motion rules of execution

**DO:**
- Ask the 4 questions in order before writing any animation.
- Use the four custom `cubic-bezier` curves above (stronger than CSS
  defaults).
- Use `ease-out` for entry/exit, `ease-in-out` for on-screen morph.
- Keep UI animations under 300ms by default.
- Specify exact properties in transitions (`transition: transform
  200ms ease-out`).
- Animate `transform` and `opacity` — they're compositor-accelerated.
  Other properties trigger layout/paint and can stutter.
- Use springs for drag/momentum/interruptible gestures.
- Honor `prefers-reduced-motion`.
- Scale `from 0.95` and fade for entry, not `from 0`. Nothing in the
  real world appears from true zero size.

**DO NOT:**
- Animate keyboard-initiated actions (⌘K open, etc.).
- Use `ease-in` for 2D UI transitions (3D/scroll-scrub viewport exits
  follow gsap-conventions, which allows `power2.in`).
- Use `transition: all` — name exact properties.
- Ship bounce/elastic in standard UI transitions — a subtle bounce
  (0.1–0.3) is allowed only for drag-release/playful gestures.
- Animate for decoration alone if the user sees it 50×/day.
- Animate `width`, `height`, `top`, `left`, `margin` — use `transform`.
- Skip reduced motion.
- Use `scale(0)` as entry — `scale(0.95)` reads as natural.
- Use the same duration everywhere. Duration is a property, not a
  constant.

## Output format for motion review

When reviewing UI motion code, output exactly this markdown table — one
row per issue found, the "Why" column carrying the reasoning. Bulleted
lists with "Before:" and "After:" on separate lines are not accepted.

```markdown
| Before | After | Why |
| --- | --- | --- |
| `<offending code>` | `<replacement code>` | <one-line reason> |
```

Filled example:

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
