# Frontend UI -- Complete Reference

Complete catalog of all components in the `frontend-ui` package -- the 2D-design-quality sibling of `frontend-3d`. Covers typography, color, spatial layout, motion, interaction polish, and overall aesthetic coherence for React / Vue / Svelte / plain-HTML frontends built on Tailwind, CSS, or CSS-in-JS. For a tour of the 3D / WebGL side of the kit, see [Frontend 3D](FRONTEND-3D.md).

## Summary

| Component | Count |
|-----------|-------|
| Agents | 6 |
| Rules | 7 |
| Hooks | 3 |
| Skills | 1 |
| **Total** | **17** |

---

## When to use frontend-ui

**Use frontend-ui when:**

- You are shipping 2D DOM UI -- layouts, typography, palette, forms, modals, tooltips, drawers, motion that lives in CSS/JS rather than on the GPU.
- You want an automated defence against the AI-default aesthetic (Inter, purple-to-blue gradient, three identical feature cards, centered-everything, pure `#000`/`#fff`, `ease-in` on everything).
- You care about design quality at review time, not only bug count -- things that pass a code review but ship as visibly generated.
- You use Tailwind (v3 or v4), vanilla CSS, CSS-in-JS, design tokens, or any mix of those.

**Do NOT use frontend-ui when:**

- You are writing WebGL / React Three Fiber / Three.js / GSAP-driven 3D scenes. That is `frontend-3d`'s job. The two packages install side-by-side without overlap.
- The project is backend-only (Go / Python / Rust services, CLI tools, data pipelines).
- You only want linting-level checks. frontend-ui focuses on taste-level review; ESLint/Prettier still cover syntax.

Both `frontend-3d` and `frontend-ui` can be installed together -- `frontend-3d` owns the `presentation/`, `three/`, `r3f/` file-paths, `frontend-ui` owns everything else UI-ish.

---

## Philosophy

1. **Auto-dispatch, not slash-commands.** There is no `/impeccable audit` or `/ui check`. The 6 agents fire automatically based on file patterns and user intent ("audit", "review", "polish", "critique"). The umbrella `ui-reviewer` scopes the diff and recommends which specialists to run; the orchestrator dispatches them in parallel. Users never have to remember which reviewer to call.

2. **Path-scoped rules.** Every rule uses `applyWhenPaths` scoped to UI files (`**/*.tsx`, `**/*.jsx`, `**/*.ts`, `**/*.css`, `**/*.scss`, `**/*.html`, `**/*.vue`, `**/tailwind.config.*`, `**/*.tokens.*`). Backend edits never trigger UI rule-loading; UI edits never miss them.

3. **Zero slash commands, one opt-in skill.** The auto-review flow is the default. A single opt-in skill (`impeccable-craft`) covers the other direction -- *building from scratch with maximum intentionality* -- and is invoked only when the user explicitly asks for "craft from scratch" or the impeccable methodology.

4. **Design quality, not syntax quality.** The rules and agents aim at taste-level decisions -- "is this shipping Inter on a luxury product?" -- rather than mechanical defects. ESLint covers the mechanical half; frontend-ui covers the part that makes interfaces feel designed rather than generated.

5. **Reject AI monoculture explicitly.** Every banned font, banned color pattern, and banned layout template is named with citation. The enforcement is not "be distinctive in spirit", it is "do not ship Inter, do not ship `#000`, do not ship three identical cards, do not ship purple-to-blue". The anti-patterns are load-bearing.

---

## Agents

All agents use `model: opus`. Output follows the standard format: `[SEVERITY · CONFIDENCE] short title / file:line / what's wrong / why / concrete suggested change`. Specialists are recommended by `ui-reviewer` and dispatched in parallel by the orchestrator when a concern is non-trivial, or invoked directly by the user.

### Dispatch matrix

| Agent | Dispatches on | Does NOT dispatch on | Key checks | Recommends |
|-------|--------------|---------------------|------------|--------------|
| `ui-reviewer` (umbrella) | "audit/review/polish/critique" + active edits in `.tsx/.jsx/.ts/.css/.scss/.html/.vue`; 3+ UI file edits in one task; pre-commit with ≥2 `.tsx/.jsx/.css` staged | Backend (`.go/.py/.rs/.java/.rb/.cs/.kt`); 3D/WebGL/R3F (owned by `ui-design-reviewer` in `frontend-3d`); tests (`*.test.*`, `*.spec.*`); non-token configs | 11-point reflex audit (reflex fonts, `#000`/`#fff`, purple→blue, identical-card grids, big-number hero, everything-in-Card, centered-everything, identical padding, rounded-icon-above-heading, `ease-in` on UI, grey text on colored bg) | All 5 specialists (orchestrator dispatches them in parallel based on Phase 1 scoping) |
| `ui-typography-reviewer` | `font-family` / `font-weight` / type-scale token changed; Google Fonts import added/changed; user asks about "fonts/type/typography/hierarchy/readability" with UI files active | Backend; 3D; tests/configs without type tokens | Reflex-font grep, type-scale ratios (flag <1.2×), line-height 1.4–1.6 body / +0.05 on light-on-dark, line-length ~65–75ch, weight variance, `font-display` hygiene, OpenType features (`tnum`, `onum`, stylistic sets) | -- (terminal specialist) |
| `ui-color-reviewer` | Palette / theme / color-token changed; dark/light theme introduced or modified; new `oklch/hsl/rgb/hex` values; user asks about "palette/colors/theme/contrast/accessibility/dark mode" | Backend; 3D; tests | OKLCH-first audit, `#000`/`#fff` ban (CRITICAL), tinted neutrals, chroma-peak-in-middle, 60-30-10 weight, purple→blue / cyan-on-black / gradient text (CRITICAL), WCAG AA (APCA where possible), focus-ring contrast ≥3:1, theme-by-use-context justification | -- (terminal specialist) |
| `ui-motion-reviewer` | `transition` / `@keyframes` / `animation` / `useSpring` / `AnimatePresence` / `motion.*` block added or modified; new easing `cubic-bezier`; user asks about "animation/motion/transition/easing/duration/spring" | Backend; 3D (R3F scroll-driven 3D is owned by `frontend-3d`); tests | 4-question framework (should it / why / easing / duration), `ease-in` CRITICAL, `transition: all`, `scale(0)` entry, bounce/elastic on UI, animating `width/height/top/left/margin`, `prefers-reduced-motion` gap, keyboard-action animation | -- (terminal specialist; output is the Before/After/Why table) |
| `ui-interaction-reviewer` | Button/modal/drawer/dialog/sheet/popover/dropdown/tooltip/form/input/select/toast/tab/menu changed; focus states changed; loading/empty/error UI changed; microcopy changed | Backend; 3D; tests | `:active` on buttons, icon-only `aria-label` (CRITICAL), modal vs popover `transform-origin`, tinted modal overlay, body scroll-lock + scrollbar-padding, focus trap (CRITICAL), `:focus-visible` not `:focus`, inline form errors, verb-not-noun button labels, prescriptive empty states, optimistic UI | -- (terminal specialist) |
| `ui-design-critic` | "critique / design review / holistic review / aesthetic audit / impression / does this feel designed"; major new UI surface (page, landing section, component system); 5+ UI files changed | Bug fixes, single-component changes, tiny polish passes; backend; 3D; tests; technical-audit requests (use `ui-reviewer` instead) | Articulate aesthetic direction in ONE sentence; scaled 11-item reflex audit (0 hits = commitment, 5+ = generated); composition & rhythm, hierarchy, conceptual coherence, memorability | -- (gestalt-level; does not produce file:line findings -- narrative format) |

Every agent's Phase 0 reads `CLAUDE.md`, `docs/architecture/frontend-*.md`, and `.claude/rules/*` before reviewing -- findings are citations back to specific rule sections, not edicts.

---

## Rules

All 7 rules share the same `applyWhenPaths` scope (UI files only) and `alwaysApply: false`. They auto-load together when Claude edits any UI file.

### 1. `frontend-design-aesthetics.md` -- top-level principles

**Scope:** UI files. **Purpose:** the umbrella principles that point at all the others. **Enforcement:**

| Principle | What it rejects |
|-----------|----------------|
| Intentionality over intensity | Flat-mediocre middle-ground designs |
| Context over default | "Dark mode because it looks cool", "Light mode to play it safe" |
| Fewer choices, more contrast | 8-step scales at 1.1×; equal-weight palette use |
| Tint everything | `#000` and `#fff` in any form |
| Variation creates rhythm | Identical padding, identical cards |
| Motion has a purpose or does not exist | Decoration-only animation on 100×/day actions |

Also documents the "gather design context" procedure: infer product type / audience / brand voice from `CLAUDE.md` + `docs/architecture/` + auto-memory before writing UI code. Ask ONE targeted mid-task question only if a specific decision is genuinely ambiguous -- never an upfront 5-question survey.

### 2. `typography-guidelines.md` -- fonts, scale, loading

**Scope:** UI files. **Purpose:** modular scale, fluid vs fixed sizing, line-height / line-length, font-loading hygiene, the `reflex_fonts_to_reject` list. **Enforcement:**

| Rule | Why |
|------|-----|
| Modular scale with ≥1.25× between steps | Sub-1.2× reads as flat hierarchy |
| Fluid on marketing, fixed on product UI | `clamp()` in dense dashboards is chaos |
| Line-height 1.4–1.6 body; +0.05–0.1 on light-on-dark | Light type reads as lighter weight |
| Cap body at 65–75ch | Wider is fatiguing |
| Pair display + body | One family loses all hierarchy tools |
| `font-display: swap` body, `optional` display | `block` is a bug |
| `tabular-nums` for data tables | Misaligned numerics |
| Negative tracking (−0.01 to −0.03em) at 40px+ | Display default is too loose |

The 4-step font-selection procedure -- (1) write brief in 3 concrete words; (2) list fonts you'd reach for [these will mostly be on the reject list]; (3) browse a catalog with the brief in mind; (4) cross-check against reflex -- is the rule's core methodology.

### 3. `color-and-contrast.md` -- OKLCH, palette, theme

**Scope:** UI files. **Purpose:** color-space guidance, tinted neutrals, 60-30-10 weight, theme choice by use context, contrast / accessibility. **Enforcement:**

| Rule | Why |
|------|-----|
| Use OKLCH, not HSL | Perceptual uniformity -- equal lightness steps look equal |
| Reduce chroma at extremes | High chroma at 90%+ reads as garish; at <15% as muddy |
| Tint neutrals toward brand hue | Pure neutrals feel disconnected |
| 60-30-10 visual weight | Accent works *because* rare |
| No `#000` / `#fff` | They don't appear in nature |
| Theme picked by use context | Not "dark because cool" / "light to be safe" |
| Status colors are system, not brand-hue-shifted | Brand 500 as warning = no differentiation |
| Gray on colored = washed out | Use a tinted shade of the surface hue |

Ships a canonical neutral scale, accent scale, and modern CSS helpers (`color-mix`, `light-dark`, `oklch(from …)`).

### 4. `spatial-and-layout.md` -- spacing, grids, responsive

**Scope:** UI files. **Purpose:** 4pt spacing scale with semantic names, `gap` over margin, rhythm through variation, container queries for components, viewport queries for pages. **Enforcement:**

| Rule | Why |
|------|-----|
| 4pt scale with `--space-xs…5xl` tokens | 8pt is too coarse; pixel-named tokens lose flexibility |
| `gap`, not margins, for sibling spacing | Eliminates margin-collapse bugs |
| Vary spacing for hierarchy | `p-md` between everything = flat visual weight |
| `repeat(auto-fit, minmax(X, 1fr))` | Breakpoint-free card grid |
| Container queries for components | A card in a sidebar reacts to the sidebar |
| Viewport queries for page-level only | Scope appropriately |
| Break the grid intentionally (2fr 1fr 1fr + row-span) | 3-up card grids feel templated |
| Asymmetric hero; left-aligned text | Centered reads as template |

Explicit bans: nested cards, everything-wrapped-in-cards, identical-card-grid template, hero-metrics template (BIG NUMBER / small label / stat row / gradient bar), centered everything, identical padding, body text >80ch.

### 5. `motion-and-animation.md` -- the 4-question framework

**Scope:** UI files. **Purpose:** the 4-question animation decision framework, custom easing constants, duration table, springs vs duration, reduced motion. **Enforcement:**

The 4 questions in order: (1) should this animate at all? [frequency-of-exposure table]; (2) what is the purpose? [spatial consistency / state indication / explanation / feedback / preventing jarring change -- if none apply, remove it]; (3) what easing? [decision flow: entering/exiting → `ease-out`; on-screen morph → `ease-in-out`; hover → `ease`; marquee → `linear`; `ease-in` is CRITICAL on UI]; (4) how long? [duration table below].

Ships 4 canonical cubic-beziers (see Motion reference section). Springs are for drag/momentum/interruptible; duration is for simple state transitions. `prefers-reduced-motion` is required, not optional.

### 6. `interaction-polish.md` -- buttons, modals, forms, focus

**Scope:** UI files. **Purpose:** the invisible-correctness details. **Enforcement:**

| Rule | Why |
|------|-----|
| `:active` on every button (`scale(0.97)` 100–160ms) | Users can't tell if click registered |
| 5-state button lifecycle (idle/pressed/loading/success/error) | Silent state changes read as bugs |
| Icon-only button has `aria-label` + ≥400ms tooltip | Accessibility |
| Hit target ≥44×44 touch, ≥32×32 desktop | WCAG touch-target |
| Modals scale from center; popovers from trigger | Spatial consistency |
| Entry direction = exit direction | Toast arriving from right exits right |
| Tinted modal overlay (`oklch(.../α)`, not `rgba(0,0,0,α)`) | Consistency |
| Body scroll-lock + scrollbar-padding compensation | Page-jump prevention |
| Focus trap in modals / drawers | Keyboard accessibility |
| Top-aligned labels on forms; no floating labels | Readability + zoom/translate edge cases |
| Validation on blur/submit, never on focus | User hasn't done anything yet |
| Inline form errors, not banner | Proximate, specific |
| `:focus-visible`, not `:focus`; contrast ≥3:1 | Mouse users shouldn't see rings on click |
| Skeletons for content; spinners for mutations | Different affordances |
| Optimistic UI on clearly-optimistic mutations | 10× faster perceived |
| Verb-specific buttons (`Delete project`, not `Confirm`) | Muscle memory on "Confirm" |
| Prescriptive empty states with CTA | Not "No data" in 14px grey |

### 7. `ui-anti-patterns.md` -- the rejection list

**Scope:** UI files. **Purpose:** the "what not to ship" companion to all the positive rules. **Enforcement:** consolidates the bans from all 6 other rules into one reflex-audit list. This is the source for the `ui-reviewer` Phase 2 audit.

Categorical bans: `reflex_fonts_to_reject` list, monospace-as-technical-shorthand, all-caps body, flat hierarchy (<1.1×); pure `#000`/`#fff`, purple→blue / cyan-on-black / neon-on-black / gradient text, gray-on-colored, dark-mode cosplay; nested cards, everything-in-card, identical-card grid, hero-metrics template, centered-everything, identical padding, rounded-icon-above-every-heading; `ease-in`, `transition: all`, `scale(0)` entry, bounce/elastic, keyboard-shortcut animation, animating `width/height/top/left/margin`; no `:active`, default focus rings, OK/Cancel destructive, focus-time validation, generic error messages, bare "No results", corner-to-center modal, floating labels.

---

## Typography reference

The full `reflex_fonts_to_reject` list, as enforced by both `typography-guidelines.md` and `ui-anti-patterns.md` and grepped for by `ui-banned-fonts-check.sh`:

**Display serifs:**

- Fraunces
- Newsreader
- Lora
- Crimson / Crimson Pro / Crimson Text
- Playfair / Playfair Display
- Cormorant / Cormorant Garamond

**Geometric / trendy display sans:**

- Syne
- Outfit
- Plus Jakarta Sans

**Corporate-technical sans/mono pairings:**

- IBM Plex Sans / IBM Plex Serif / IBM Plex Mono
- Space Mono / Space Grotesk

**Default UI sans:**

- Inter
- DM Sans / DM Serif Display / DM Serif Text
- Instrument Sans / Instrument Serif

**System defaults (always rejected for new projects):**

- Arial, Helvetica, Roboto, Open Sans, Times New Roman, `system-ui`

Catalogs to browse as alternatives (from the rule): Google Fonts (filter past the top 20), Pangram Pangram, Future Fonts, Adobe Fonts, ABC Dinamo, Klim Type Foundry, Velvetyne, OH no Type Co, Uncut.

---

## Color reference

### OKLCH is mandatory

HSL in new code is tech debt. OKLCH is perceptually uniform, universally supported in modern browsers, and lets `color-mix()` / `light-dark()` / `oklch(from …)` compose cleanly.

### Banned patterns (hard rejections)

| Pattern | Severity | Correct version |
|---------|----------|-----------------|
| `color: #000` / `color: #fff` / `rgb(0,0,0)` / `rgb(255,255,255)` | CRITICAL | `oklch(15% 0.01 <hue>)` / `oklch(98% 0.005 <hue>)` |
| Tailwind `bg-black` / `text-white` / `border-black` (untinted) | WARNING | Custom tinted tokens |
| `rgba(0,0,0,0.5)` on modal overlays | SUGGESTION (WARNING if consistent) | `oklch(15% 0.01 <hue> / 0.5)` |
| Purple-to-blue gradient | CRITICAL | Solid color or surface gradient with brand-hue chroma |
| Cyan on black | WARNING | Tinted accent on tinted surface |
| Neon on pure black | WARNING | Restrained accent on tinted near-black |
| Gradient text (`background-clip: text` with gradient) | WARNING | Solid color for text |
| Gray text on colored background | WARNING / CRITICAL | Deeper shade of the surface hue |

### Tinted neutrals (canonical scale)

```css
--neutral-0:  oklch(98% 0.005 <hue>);   /* page */
--neutral-10: oklch(94% 0.008 <hue>);   /* subtle surface */
--neutral-20: oklch(88% 0.010 <hue>);   /* hairline border */
--neutral-40: oklch(68% 0.012 <hue>);   /* placeholder / muted icon */
--neutral-60: oklch(50% 0.015 <hue>);   /* secondary text */
--neutral-80: oklch(30% 0.018 <hue>);   /* body text */
--neutral-95: oklch(15% 0.010 <hue>);   /* max-contrast text / deep surface */
```

Chroma peaks in the middle (0.018 at L80) and reduces at the extremes -- matches perception.

### Theme by use context

The theme (dark vs light) follows from the product's actual viewing context, not from default preference:

| Example product | Theme | Reasoning |
|----------------|-------|-----------|
| Perp DEX, long trading sessions, dim rooms | Dark | Reduces eye strain; matches environment |
| Hospital portal, anxious patients, phone at night | Light | Bright = trust/safety in healthcare |
| Children's reading app | Light | Dark = "less safe for kids" perception |
| Vintage motorcycle forum at 9pm in garage | Dark | Subculture + physical env match |
| SRE observability dashboard in dark rooms | Dark | Graph contrast; environment match |
| Wedding planning, Sunday morning | Light | Optimistic mood; bright env |
| Music player, headphones, night | Dark | Cinematic |
| Food magazine homepage over coffee | Light | Food reads appetising on light |

If neither is obviously right, ship light-first with a high-quality dark port (light-first ports to dark cleanly; the reverse often has contrast issues).

---

## Motion reference

### Emil Kowalski's 4-question framework

Ask these in order, before writing any animation:

1. **Should this animate at all?** Keyboard action / 100+×/day → no. Tens×/day → ≤100ms or none. Occasional → standard UI motion. Rare / first-time → can be expressive.
2. **What is the purpose?** One of: spatial consistency / state indication / explanation / feedback / preventing jarring change. No fit → remove.
3. **What easing?** Entering/exiting → `ease-out`. On-screen morph → `ease-in-out`. Hover / color → default `ease`. Marquee / progress / spinner → `linear`. **Never `ease-in`.**
4. **How long?** See duration table.

### Custom cubic-bezier constants (stronger than CSS defaults)

```css
:root {
  /* Strong ease-out for entry / exit */
  --ease-out:    cubic-bezier(0.23, 1, 0.32, 1);

  /* Strong ease-in-out for on-screen morph */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);

  /* iOS-style drawer */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);

  /* Snappy / responsive — tiny UI transitions */
  --ease-snappy: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

### Duration table

| Element | Duration |
|---------|----------|
| Button press (`:active` scale) | 100–160ms |
| Tooltip / small popover | 125–200ms |
| Dropdown / select | 150–250ms |
| Tab / section transition | 180–300ms |
| Modal / drawer open-close | 200–500ms |
| Toast slide in-out | 200–350ms |
| Page transition (SPA) | 300–500ms |
| Marketing explainer / onboarding demo | 500–2000ms+ |

Keep UI animations under 300ms by default. Anything over 500ms on non-marketing UI is CRITICAL. A 180ms dropdown feels faster than a 400ms one even if both complete "in time".

---

## Hook trigger conditions

All 3 hooks are `PostToolUse` handlers on `Edit` / `Write`, emit warnings only (exit 0 always), and respect per-hook opt-out env vars. They scope to UI file extensions: `.css`, `.scss`, `.tsx`, `.jsx`, `.ts`, `.html`, `.vue`, `tailwind.config.*`, `*.tokens.*`.

### ui-banned-fonts-check

**File:** `hooks/ui-banned-fonts-check.sh`
**Trigger:** PostToolUse (Edit, Write) on UI files.
**Opt-out:** `CLAUDE_DISABLE_UI_FONT_CHECK=1`

| What it flags | What it doesn't |
|---------------|-----------------|
| `font-family: Inter` / `font-family: "DM Sans"` declarations | Variable names containing "inter", "outfit" (scoped to `font-family:` context + Tailwind `font-[...]` + Google Fonts URLs) |
| Tailwind `font-[Inter]` / `font-[DM_Sans]` classes | Props / IDs / CSS class names using those strings |
| Google Fonts imports (`fonts.googleapis.com?family=Inter`) | -- |
| Comma-separated reflex-list fonts (`font-family: Fraunces, serif;`) | Files under `*code-block*`, `*codeblock*`, `*prose*`, `*syntax-highlight*`, `*highlighter*` (monospace fonts like Space Mono are legitimately used in those contexts) |

Patterns grepped: Fraunces, Newsreader, Lora (with word-boundary), Crimson (with optional Pro/Text), Playfair Display, Cormorant (with optional Garamond), Syne, IBM Plex Sans/Serif/Mono, Space Mono, Space Grotesk, Inter, DM Sans / DM Serif Display / DM Serif Text, Outfit, Plus Jakarta Sans, Instrument Sans / Instrument Serif.

### ui-color-check

**File:** `hooks/ui-color-check.sh`
**Trigger:** PostToolUse (Edit, Write) on UI files.
**Opt-out:** `CLAUDE_DISABLE_UI_COLOR_CHECK=1`

| What it flags | What it doesn't |
|---------------|-----------------|
| `color: #000` / `background: #fff` / `rgb(0,0,0)` / `rgb(255,255,255)` in `color` / `background` / `background-color` / `fill` / `stroke` contexts | `box-shadow: 0 0 0 #000` (context-scoped to color-producing properties) |
| Tailwind `bg-black` / `text-white` / `border-black` / `fill-white` / `stroke-black` | -- |
| Gradient text: `background-clip: text` combined with `*-gradient` background | Single-color `background-clip: text` (which is a no-op -- harmless) |
| Tailwind `bg-clip-text` + `bg-gradient-to-*` combination | -- |
| Purple→blue `linear-gradient` (`violet`/`indigo`/`#8b5cf6`/`#a855f7`/`#7c3aed` bleeding to `blue`/`cyan`/`#3b82f6`/`#06b6d4`/`#0ea5e9`) | Single-color or non-purple gradients |
| Cyan-on-black: `color: cyan|#0ff|#00ffff` combined with `background: black|#000` in the same file | Legitimate cyan accent on non-black surface |
| 3+ `hsl()` declarations without any `oklch()` in the same edit (WARNING to migrate) | Single one-off HSL, or files that already use OKLCH |

### ui-animation-easing-check

**File:** `hooks/ui-animation-easing-check.sh`
**Trigger:** PostToolUse (Edit, Write) on UI files.
**Opt-out:** `CLAUDE_DISABLE_UI_ANIM_CHECK=1`

| What it flags | What it doesn't |
|---------------|-----------------|
| `transition: …ease-in` or `transition-timing-function: ease-in` (followed by non-hyphen char or EOL) | `ease-in-out` (legitimate -- negative lookahead simulated via `ease-in([^-]|$)`) |
| `transition: all` | `transition: transform`, `transition: opacity` |
| Tailwind `transition-all` | Tailwind `transition-transform`, `transition-opacity` |
| `transform: scale(0)` / `animation: … scale(0)` / `@keyframes` containing `scale(0)` | `scale(0.95)`, `scale(0.5)` (only `scale(0)` exactly) |
| Tailwind `scale-0` (followed by non-digit/period/letter or EOL) | `scale-95`, `scale-0.95`, `scale-01`, etc. |
| `transition` animating `width` / `height` / `top` / `left` / `right` / `bottom` / `margin` / `padding` (with directional variants) | `transition: transform`, `transition: opacity` |

---

## `impeccable-craft` skill walkthrough

**Invocation:** opt-in. Call when the user asks explicitly for "craft a UI from scratch", "use the impeccable methodology", "build this with intentionality", or wants the full sketch-first workflow. For audits / reviews / polish / critique, use the auto-dispatched agents instead -- they handle 95% of the review workload.

**Shape → Refine → Implement → Polish** is 4 stages with explicit user check-ins at the seams.

### Stage 1 -- Shape

Gather brand context (per `frontend-design-aesthetics.md` Phase 0) and produce a written brief before any code:

1. Audience + use context (read from `CLAUDE.md` + `docs/architecture/*` + auto-memory; ask ONE question only if ambiguous).
2. 3 concrete brand-voice words (not "modern" / "elegant" -- concrete: "warm, mechanical, opinionated" / "calm, clinical, careful" / "fast, dense, unimpressed").
3. **The one memorable thing** -- the single decision that makes this interface unforgettable. Without this, the design drifts to default.
4. Constraints: framework, performance, accessibility, browser support, reduced-motion default.
5. Draft palette (OKLCH, tinted neutrals, accent, status mini-palettes).
6. Draft type system (run the 4-step font-selection procedure; reject reflex-list).

**Output:** a short brief, shown to the user, with "OK to proceed?" before Stage 2.

### Stage 2 -- Refine

Translate the brief into primitives without polish:

1. Build the design-token file (CSS custom properties or Tailwind config).
2. Pick the component library (Radix / shadcn / Headless UI / custom). Luxury / high-craft projects often want custom -- shadcn defaults read as shadcn.
3. Sketch layouts in code at a primitive level -- boxes labelled with future contents, no styling yet. Check composition and hierarchy BEFORE detail.

### Stage 3 -- Implement

Production code with attention to:

1. Motion -- run the 4-question framework for every interactive element; use the 4 canonical cubic-beziers and the duration table.
2. Interaction polish -- every button `:active`, every focus `:focus-visible`, every modal/drawer scroll-lock + focus trap, every form validates on blur/submit.
3. Spacing rhythm -- vary spacing (`xs` tight, `md` normal, `xl` transitional, `3xl` major breaks).
4. `prefers-reduced-motion` blanket rule.

### Stage 4 -- Polish

Recommend the 5 specialists; the orchestrator dispatches them in parallel on the first implementation:

1. `ui-typography-reviewer` on type system.
2. `ui-color-reviewer` on palette.
3. `ui-motion-reviewer` on transitions.
4. `ui-interaction-reviewer` on components.
5. `ui-design-critic` on the whole result.

Fix every CRITICAL. Address every WARNING unless documented. SUGGESTIONs are judgment calls.

**Output:** one-paragraph summary (Stage 1 brief / what was built / what iterated after reviews / what was deliberately NOT done). Save the brief to auto-memory as `project_brand_context.md` so future sessions start with context.

---

## Integration examples

The installer (`setup.sh` / `node bin/cli.js`) prompts for frontend-ui opt-in during `Select packages`:

```
Frontend UI? [y/N]
```

When `y`, the installer copies from `packages/frontend-ui/` to the project's `.claude/`:

- `agents/*.md` → `.claude/agents/`
- `rules/*.md` → `.claude/rules/`
- `hooks/*.sh` → `.claude/scripts/hooks/` (with hook entries added to `.claude/settings.json` `PostToolUse` section)
- `skills/impeccable-craft/` → `.claude/skills/`

No framework-specific configuration is needed -- the hooks trigger on file extension, the rules trigger on `applyWhenPaths` globs.

**Next.js:** Drop-in. Works against the `app/`, `components/`, `src/` conventions out of the box.

**Vite + React/Vue/Svelte:** Drop-in. All hooks scope on file extension; rules scope on glob.

**Remix:** Drop-in. The `app/` directory's `.tsx` files are caught by `**/*.tsx` glob.

**Monorepos:** The statusline stack-detector scans the root + one level of subdirs (see `packages/core/helpers/statusline.cjs`), so frontend-ui activates correctly even in `apps/web/` / `packages/ui/` layouts.

---

## Common false positives (and how to quiet them)

The hooks and agents are advisory (exit 0 always). False positives are expected on edge cases -- they are tractable because every hook has an opt-out env var and every agent cites the specific rule being applied (so you can argue back).

| False positive | Why it fires | How to quiet |
|----------------|-------------|--------------|
| `font-family: Inter` in a SaaS product where Inter is the intentional identity | Inter is on the reflex list unconditionally | Downgrade to SUGGESTION in the agent by documenting the decision in `CLAUDE.md`. The agent reads Phase 0 and will respect stated justifications. For the hook, `CLAUDE_DISABLE_UI_FONT_CHECK=1` |
| `bg-black` / `text-white` in a project that has customised those Tailwind tokens to tinted values | The hook can't know your Tailwind config | `CLAUDE_DISABLE_UI_COLOR_CHECK=1`, or rename tokens so the class matches (`bg-ink` / `text-parchment`) |
| Monospace font (e.g., Space Mono) used legitimately in a code-syntax component | Hook matches against `font-family` context | Move the code to a path containing `code-block`, `codeblock`, `prose`, `syntax-highlight`, or `highlighter` -- the hook auto-skips those |
| `transition: all` on a hover with `duration-100` where the performance hit is imperceptible | Hook is pattern-based, not cost-based | Specify `transition-colors` / `transition-transform` explicitly -- usually improves the code anyway. Or `CLAUDE_DISABLE_UI_ANIM_CHECK=1` |
| 3+ `hsl()` declarations in a file that is intentionally kept legacy | Hook flags the pattern to nudge OKLCH migration | Ignore -- the hook is a nudge, not a blocker. Or opt out |
| `ui-design-critic` calls a diff "AI-template default" when the project *is* a deliberate shadcn-flavoured starter | Critic judges the gestalt, not intent | Respond with the stated aesthetic direction -- the critic documents the user's rebuttal and moves on. Don't opt out; use the feedback to decide whether to commit further to the shadcn direction or diverge |
| `ui-typography-reviewer` flags a "reflex font" used intentionally in a downgrade-to-SUGGESTION case | Agent's heuristic: downgrade to SUGGESTION if justified in `CLAUDE.md` and the rest of the design commits to the direction that justifies it | Add a one-line rationale in `CLAUDE.md`. The agent reads Phase 0 and picks it up |

Rule of thumb: **the hooks never block; the agents cite sources**. A false positive costs you one line in `CLAUDE.md` or one env var, not a re-architecture.

---

## Attribution

Rules, anti-pattern lists, and the `craft` methodology in this package are adapted from two sources:

- **[Impeccable](https://github.com/pbakaus/impeccable)** by Paul Bakaus and contributors (Apache License 2.0) -- itself derived from [Anthropic's `frontend-design` skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design). The `reflex_fonts_to_reject` list, banned color patterns, banned layout templates, typography reference, color reference, spatial design, UX writing, and the Shape → Refine → Implement → Polish flow are adapted from Impeccable's reference documents. See `packages/frontend-ui/NOTICE.md` for the table of per-file provenance and the Apache-2.0 notice.

- **[Emil Kowalski's design engineering skill](https://emilkowal.ski/skill)** -- ideas only, all prose independently written. Incorporated: duration tables (buttons 100–160ms, tooltips 125–200ms, dropdowns 150–250ms, modals 200–500ms), the 4 canonical `cubic-bezier` constants, the 4-question Animation Decision Framework structure, the Before/After/Why markdown output convention, and the modal-vs-popover `transform-origin` distinction. Emil's repository had no LICENSE file at the time this package was authored, so his prose has NOT been copied -- only factual content and methodology patterns, which are not copyrightable. If Emil adds a permissive LICENSE later, this attribution can be updated to permit direct prose quotation.

Parent superkit is MIT; Impeccable-derived material is Apache-2.0. See `packages/frontend-ui/NOTICE.md` for the full per-file attribution table.
