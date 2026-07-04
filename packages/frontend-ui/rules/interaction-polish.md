---
name: interaction-polish
description: "Interactive element polish — buttons, modals, drawers, forms, focus states, loading, UX writing. The invisible details that compound into 'feels right'. Auto-loaded when editing UI files."
tokens: 2837
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

# Interaction Polish

Users never consciously notice these details — their aggregate is the
difference between interfaces that feel right and interfaces that feel
cheap.

**Token note:** CSS custom properties used below are defined in the
sibling frontend-ui rules — `--ease-snappy` and `--ease-drawer` in
`motion-and-animation.md`, `--accent-500` in `color-and-contrast.md`,
`--space-*` in `spatial-and-layout.md`. `--text-sm`/`--text-md` are
illustrative names for steps of the 5-step type scale in
`typography-guidelines.md` (which fixes the scale, not token names).
If the project defines its own tokens, substitute those names; never
emit a variable the project does not define.

## Hard requirements (7)

1. Every button has an `:active` state.
2. Every interactive element has a `:focus-visible` ring at ≥3:1
   contrast against both the element and its background.
3. Touch hit targets are at least 44×44px.
4. Elements exit in the reverse of their entry direction (spatial
   consistency).
5. Form errors render inline under the field; validate on blur or on
   submit — never on focus.
6. Disabled controls look disabled: opacity 0.5 + `cursor: not-allowed`.
7. Opening a modal locks body scroll with `padding-right` compensation
   for the removed scrollbar.

## Buttons

### Must respond to press

Without an `:active` state users cannot tell whether the click
registered before the action completes.

```css
.button:active {
  transform: scale(0.97);
  transition: transform 120ms var(--ease-snappy);
}
```

`0.97` reads as "pressed"; `0.90` reads as "broken"; anything above
`0.98` is imperceptible. Duration 100–160ms.

### State lifecycle (5 states)

A submit button must not look identical before, during, and after
submission:

- **Idle** — shows the action text ("Sign up").
- **Pressed** — `:active` scale feedback (100ms).
- **Loading** — spinner + disabled; optionally text changes to
  "Signing up…". Disable pointer events but keep visual identity —
  don't grey out into invisibility.
- **Success** — brief affirmative state (checkmark + "Done!"), 1s max.
  Then: if the action navigates, redirect; otherwise return to idle.
- **Error** — shake or subtle red flash + inline error message; keep
  the button enabled so the user can retry.

### Size and hit target

- Minimum hit target: 44×44px (touch). Desktop-only dense tools may use
  32×32 — an explicit tradeoff against accessibility.
- Primary button text one step below body size to body size
  (`--text-sm` to `--text-md`); secondary/tertiary often one step
  smaller.
- Padding: `--space-sm --space-md` is the canonical sane default.
- Icon-only buttons: accessible name via `aria-label` + hover tooltip
  with delay ≥400ms.

### Disabled state

Reduce opacity to 0.5, `cursor: not-allowed` — disabled must be obvious
from 20 feet away. A button that looks identical when disabled gets
clicked repeatedly while nothing happens.

## Modals & drawers

### Spatial consistency

| Component | Entry | Exit |
|-----------|-------|------|
| Toast (bottom-right) | Slide in from right + fade | Slide out to right OR dismiss gesture direction |
| Modal (centered dialog) | Fade + scale from 0.95 | Fade + scale back to 0.95 |
| Drawer (side panel) | Slide in from the edge it's anchored to | Slide out to the same edge |
| Popover/dropdown | Scale-in from `transform-origin: <trigger>` | Scale-out to trigger point |

### Transform origin: modals from center, popovers from trigger

Modals are interruptions arriving at screen center; popovers are
extensions of their trigger and must visually grow from it.

```css
/* Modal — scales from center */
.modal { transform-origin: center; }

/* Popover — scales from trigger (Radix example) */
.popover {
  transform-origin: var(--radix-popover-content-transform-origin);
}
```

### Drawer physics

iOS-style drawer uses `--ease-drawer` (defined in
`motion-and-animation.md`):

```css
.drawer {
  transition: transform 400ms cubic-bezier(0.32, 0.72, 0, 1);
}
```

Draggable drawers use a spring, not a duration, so the drawer keeps
velocity when the user flicks it.

### Overlay and scroll-lock

- Overlay behind modals/drawers: a semi-transparent surface derived
  from the page neutral (e.g. `oklch(15% 0.01 <hue> / 0.5)`), not pure
  `rgba(0,0,0,0.5)`. Tint even the overlay.
- Lock body scroll when a modal opens, with `padding-right`
  compensation for the scrollbar — otherwise the page visibly jumps.

## Forms

### Label placement

- Top-aligned above the input — the default; best readability, easiest
  on mobile.
- Left-aligned beside the input — only for dense desktop forms
  completed repeatedly (internal tools).
- Floating labels — skip for serious forms: they hide context and have
  known accessibility issues with zoom/translate.

### Validation timing

- **On submit:** most forms.
- **On blur:** email, phone, username — users expect feedback right
  after finishing the field.
- **On typing:** password strength, slug fields — live feedback
  actively helps.
- **Never on focus:** the user hasn't done anything yet.

### Error messages

- Inline, directly under the offending field — not in a banner at the
  top of the form.
- Specific: "This looks like a phone number — did you mean to enter an
  email?" beats generic "Please enter an email address". Never bare
  "Invalid input" — say what is invalid and how to fix it. (More in UX
  writing below.)

### Success

Small forms: redirect or toast — not a two-paragraph confirmation.

## Focus states

Required on every interactive element — missing focus styles is an
accessibility blocker for keyboard users.

```css
:focus-visible {
  outline: 2px solid var(--accent-500);
  outline-offset: 2px;
  border-radius: inherit;
}
```

- Use `:focus-visible`, not `:focus`, so mouse clicks don't show rings
  — only keyboard focus does.
- Ring contrast ≥3:1 against both the element and its surrounding
  background. Default browser rings disappear on colored surfaces —
  always ship your own.

## Loading patterns

### What to show

| Wait duration | Pattern |
|---------------|---------|
| < 300ms | Nothing. Users don't perceive this as a wait. |
| 300ms – 1s | Spinner or skeleton (spinner for actions, skeleton for content loading) |
| 1s – 10s | Skeleton with shimmer; informative progress if estimatable. |
| > 10s | Progress bar with percentage + explanation; option to cancel. |

### Skeletons for content, spinners for actions

Skeletons preview the layout before content arrives, reducing perceived
load time; spinners only say "it's working".

- Skeletons: lists · cards/card grids · article/post content ·
  dashboards.
- Spinners: button-triggered mutations (save, delete) · full-page
  navigation · quick <1s loads where a skeleton would flash.

### Perceived performance tricks

- **Skeletons match the real content's shape.** Headline + 3 paragraphs
  + image — not one generic grey box, or the swap feels jarring.
- **Optimistic UI for mutations:** show the new state immediately;
  revert with a toast if the mutation fails.
- **Speed up the spinner:** 0.8s/rev feels faster than 1.2s/rev — same
  load time, different perception.
- **Instant tooltips after the first** in the same toolbar (Radix
  pattern) — skip both delay and animation; the whole toolbar feels
  faster.

## Empty states

Empty states are opportunities — never a bare "No data" in 14px grey
text.

- **Prescriptive:** show the next step — "Create your first project" +
  call-to-action button.
- **Contextual:** if a filter caused it, say so — "No items match
  `status: archived`" + a "Clear filter" button.
- **Visual:** a small illustration or icon in your design language —
  generic "sad cloud" icons are a cliché.

## UX writing

### Button labels

- Verbs with objects: "Save changes", "Create project". `[Verb Object]`
  is the default; a bare verb ("Save", "Delete") only when context
  makes it obvious.
- First-person for commitment language: "I'll decide later" reads
  warmer than "Decide later".
- Replace "OK"/"Cancel" pairs with self-describing actions: "Save
  changes" / "Discard"; "Delete project" / "Keep it" — a button that
  describes its own action reduces mis-clicks.
- Destructive confirmations use the specific destructive verb
  ("Delete", "Archive", "Remove from team") — never "Confirm"; the
  user's finger is muscle-memoried to "Confirm".

### Error messages

Lead with what went wrong from the user's point of view; offer a path
forward.

| ✗ | ✓ |
|---|---|
| `Error: 422 Unprocessable Entity` | `Email is already registered. Sign in, or use a different address.` |
| `Network error` | `We lost the connection. Retrying…` (+ retry button) |
| `Invalid input` | `Phone number should be in international format (+1 555…)` |

### Empty-state copy

- "You haven't created any projects yet." + `[Create your first
  project]` — not "No projects found."

### Confirmations

- Be specific, not "Are you sure?": "Delete this project and its 24
  files? This cannot be undone."
- Irrecoverable actions require typing the resource name, not just
  clicking a button.

## Tooltips

- Delay on first hover: 400–700ms — no instant flashing when the
  cursor enters.
- Subsequent tooltips in the same toolbar open instantly (Radix
  pattern).
- Critical information never lives only in a tooltip — mobile and
  keyboard users may never trigger it.
- Short: "Save changes (⌘S)" — not a sentence.

## Responsiveness (the UI feel, not layout)

- **Optimistic updates** for user mutations (likes, bookmarks,
  toggles); revert quietly on failure.
- **Debounce, don't throttle,** user-initiated input (search, filter)
  at 150–300ms.
- **Prefetch on hover** for links the user is likely to click —
  Next.js and similar frameworks expose this.
- **Warm the cache** for expected next screens (after a list opens,
  prefetch the top 3 detail views).

## Interaction rules of execution

**DO:**
- Give every button an `:active` state.
- Use `:focus-visible` for keyboard focus rings; contrast ≥3:1.
- Match entry direction to exit direction (spatial consistency).
- Scale modals from center, popovers from trigger.
- Inline form errors directly under the field.
- Use skeletons for content loading; spinners for action loading.
- Label buttons with the specific action (`[Delete project]`, not
  `[Confirm]`).
- Provide prescriptive empty states with a call-to-action.
- Implement optimistic UI for user-initiated mutations.

**DO NOT:**
- Ship a button with no `:active` state.
- Rely on browser default focus rings (they disappear on colored
  surfaces).
- Animate a modal from a corner if it's centered at rest — spatial
  dissonance.
- Use "OK" / "Cancel" for destructive actions — use the specific verb.
- Show a generic spinner when you can show a shaped skeleton.
- Show validation errors on focus. Validate on blur or on submit.
- Let dark-mode modals ship with `rgba(0,0,0,0.5)` overlays — tint the
  overlay.
- Forget body scroll-lock (with padding compensation) when a modal
  opens.

---

Attribution: interaction patterns (button `:active`, modal/popover
transform-origin conventions, drawer easing, optimistic UI) draw from
Emil Kowalski's design-engineering skill (ideas only, prose independent).
UX writing material adapted from Impeccable's `reference/ux-writing.md`
+ `reference/interaction-design.md` (Apache-2.0). See `../NOTICE.md`.
