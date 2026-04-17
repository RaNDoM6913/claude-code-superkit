---
name: interaction-polish
description: "Interactive element polish — buttons, modals, drawers, forms, focus states, loading, UX writing. The invisible details that compound into 'feels right'. Auto-loaded when editing UI files."
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

Most of these details are ones users never consciously notice. That is
the point. When a feature works exactly as someone assumes it should,
they proceed without thinking about it — that is the goal. The aggregate
of these invisible-correctness decisions is the difference between
interfaces that feel right and interfaces that feel cheap.

## Buttons

### Must respond to press

Every button needs a `:active` state. Without one, users cannot tell
whether the interface registered their click before the action
completes.

```css
.button:active {
  transform: scale(0.97);
  transition: transform 120ms var(--ease-snappy);
}
```

The scale value matters: `0.97` reads as "pressed"; `0.90` reads as
"broken"; anything above `0.98` is imperceptible. Duration 100–160ms.

### Must indicate state

A submit button that posts a form should NOT look identical before,
during, and after submission. Transition the button through states:

- **Idle** → shows the action text ("Sign up")
- **Pressed** → `:active` scale feedback (100ms)
- **Loading** → spinner + disabled; optionally the text changes to
  "Signing up…". Disable pointer events but keep visual identity —
  don't grey out into invisibility.
- **Success** → brief affirmative state (checkmark + "Done!"), 1s max,
  then return to idle OR redirect.
- **Error** → shake or subtle red flash, inline error message, remain
  enabled so user can retry.

### Size and hit target

- Minimum hit target: 44×44px (touch). On desktop 32×32 may be
  acceptable for dense tools, but it's a tradeoff against accessibility.
- Primary button text at `--text-sm` to `--text-md`; secondary/tertiary
  buttons often one step smaller.
- Padding: `--space-sm --space-md` is the canonical sane default.
- Buttons with only an icon (no label): provide an accessible name via
  `aria-label`; add a tooltip on hover with a delay ≥400ms.

### Disabled state

A disabled button should look disabled from 20 feet away. Common
pattern: reduce opacity to 0.5, cursor: not-allowed. **Never** ship
a button that looks identical when disabled — users will click it
repeatedly and wonder why nothing happens.

## Modals & drawers

### Spatial consistency

An element entering from a direction should exit in the reverse of that
direction — it's why swipe-to-dismiss feels natural on toasts that
arrived from the same edge.

| Component | Entry | Exit |
|-----------|-------|------|
| Toast (bottom-right) | Slide in from right + fade | Slide out to right OR dismiss gesture direction |
| Modal (centered dialog) | Fade + scale from 0.95 | Fade + scale back to 0.95 |
| Drawer (side panel) | Slide in from the edge it's anchored to | Slide out to the same edge |
| Popover/dropdown | Scale-in from `transform-origin: <trigger>` | Scale-out to trigger point |

### Modals scale from center; popovers scale from trigger

This is a common mistake. Modals are spatial events — they arrive at
the center of the screen as an interruption. Popovers are spatial
extensions of the trigger — they should visually "grow from" the
element that triggered them.

```css
/* Modal — scales from center */
.modal { transform-origin: center; }

/* Popover — scales from trigger (Radix example) */
.popover {
  transform-origin: var(--radix-popover-content-transform-origin);
}
```

### Drawer physics

iOS-style drawer uses `--ease-drawer` (from `motion-and-animation.md`):

```css
.drawer {
  transition: transform 400ms cubic-bezier(0.32, 0.72, 0, 1);
}
```

For draggable drawers, use a spring (not duration-based) so the drawer
maintains velocity if the user flicks it.

### Overlay and scroll-lock

- Overlay behind modals/drawers should be a semi-transparent surface
  derived from the page neutral (e.g., `oklch(15% 0.01 <hue> / 0.5)`),
  not pure `rgba(0,0,0,0.5)`. Tint even the overlay.
- Lock body scroll when a modal opens. Don't forget `padding-right`
  compensation for the scrollbar, or the page will visibly jump.

## Forms

### Label placement

- Top-aligned labels above inputs: best readability, easiest on mobile.
  Use this by default.
- Left-aligned labels beside inputs: only appropriate for dense desktop
  forms where users complete the form repeatedly (internal tools).
- Floating labels: skip them for serious forms. They hide context and
  have known accessibility issues with zoom/translate.

### Validation timing

- **On submit:** most forms.
- **On blur:** email, phone, username — where users expect immediate
  feedback after finishing a field.
- **On typing:** passwords (strength), slug fields — where live feedback
  actively helps.
- **Never:** on focus. Users haven't done anything yet.

### Error messages

- Place errors INLINE, directly under the offending field. Not in a
  banner at the top of the form.
- Be specific: "Please enter an email address" is generic. "This looks
  like a phone number — did you mean to enter an email?" is helpful.
- Don't say "Invalid input" — tell the user what's invalid and how to
  fix it.

See the UX writing section below for more.

### Success

Small forms: redirect or toast. Don't force the user to read a
two-paragraph confirmation.

## Focus states

**Required on every interactive element.** Focus is how keyboard users
navigate; missing focus styles is an accessibility blocker.

```css
:focus-visible {
  outline: 2px solid var(--accent-500);
  outline-offset: 2px;
  border-radius: inherit;
}
```

Use `:focus-visible` (not `:focus`) so mouse users don't see focus
rings on click — only keyboard users will.

**Contrast:** the focus ring must be ≥3:1 against both the element and
its surrounding background. Default browser rings disappear on colored
surfaces; always ship your own.

## Loading patterns

### What to show

| Wait duration | Pattern |
|---------------|---------|
| < 300ms | Nothing. Users don't perceive this as a wait. |
| 300ms – 1s | Spinner or skeleton (spinner is fine for actions, skeleton for content loading) |
| 1s – 10s | Skeleton with shimmer; informative progress if estimatable. |
| > 10s | Progress bar with percentage + explanation; option to cancel. |

### Skeletons over spinners for content

Skeletons give users an idea of the layout before content arrives,
reducing perceived load time. Spinners give no information beyond "it's
working". Use skeletons for:
- Lists
- Cards / card grids
- Article/post content
- Dashboards

Use spinners for:
- Button-triggered mutations (save, delete)
- Full-page navigation
- Quick <1s loads where a skeleton would flash

### Perceived performance tricks

- **Skeletons that match the real content's layout closely.** If your
  skeleton is a generic grey box and the content is a headline + 3
  paragraphs + image, the transition feels jarring. Match the shape.
- **Optimistic UI for mutations.** Show the new state immediately;
  revert with a toast if the mutation fails. This feels 10× faster
  than an honest spinner.
- **Speed up the spinner.** A spinner rotating at 1.2s/rev feels slower
  than one at 0.8s/rev. Same load time, different perception.
- **Instant tooltips after the first.** Radix and similar libraries
  skip both the delay and the animation for subsequent tooltips in the
  same toolbar. This makes the whole toolbar feel faster.

## Empty states

Empty states are opportunities, not failures. Don't just show "No
results."

- **Prescriptive:** show what the user should do next. "Create your
  first project" + a call-to-action button.
- **Contextual:** if it's empty because of a filter, say so: "No items
  match `status: archived`" + a "Clear filter" button.
- **Visual:** a small illustration or icon anchors the empty state and
  makes it feel designed. Generic "sad cloud" icons are a cliché —
  match your design language.
- **Never:** ship a bare "No data" message in 14px grey text.

## UX writing

### Button labels

- **Verbs, not nouns.** "Save changes", not "Save". "Create project",
  not "Create". If the action is obvious from context, a verb alone is
  fine ("Save", "Delete"), but `[Verb Object]` is the default.
- **First-person is occasionally appropriate** for commitment language:
  "I'll decide later" reads warmer than "Decide later".
- **Avoid "OK" and "Cancel" as primary button labels.** Instead: "Save
  changes" / "Discard". "Delete project" / "Keep it". Making the button
  describe its own action reduces the risk of a mis-click.
- **Destructive actions:** label the confirmation button with the
  specific destructive verb ("Delete", "Archive", "Remove from team"),
  not "Confirm". The user's finger is muscle-memoried to "Confirm".

### Error messages

- Lead with what went wrong from the user's point of view, not from the
  system's.
- Offer a path forward.

Examples:

| ✗ | ✓ |
|---|---|
| `Error: 422 Unprocessable Entity` | `Email is already registered. Sign in, or use a different address.` |
| `Network error` | `We lost the connection. Retrying…` (+ retry button) |
| `Invalid input` | `Phone number should be in international format (+1 555…)` |

### Empty states (copy)

- "You haven't created any projects yet." + `[Create your first project]`
- Not: "No projects found."

### Confirmations

- "Are you sure?" is lazy. Be specific: "Delete this project and its 24
  files? This cannot be undone."
- Irrecoverable actions should require typing the resource name, not
  just clicking a button.

## Tooltips

- Delay on first hover: 400–700ms. Don't flash tooltips the instant the
  cursor enters.
- After the first tooltip opens in a toolbar, subsequent tooltips in
  the same toolbar should open instantly (Radix pattern).
- Never put critical information only in a tooltip — mobile users and
  keyboard users may not trigger it.
- Short. "Save changes (⌘S)" — not a sentence.

## Responsiveness (the UI feel, not layout)

- **Optimistic updates** for user mutations (likes, bookmarks,
  toggles). Revert quietly on failure.
- **Debounce, don't throttle, user-initiated input** (search, filter).
  Debounce at 150–300ms.
- **Prefetch** on hover for links the user is likely to click.
  Next.js and similar frameworks expose this — use it.
- **Warm the cache** for expected next screens (e.g., after user opens
  a list, prefetch the top 3 detail views).

## Interaction rules of execution

**DO:**
- Give every button a `:active` state.
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
