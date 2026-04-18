# Chapter 14: Frontend UI

## Overview

The Frontend UI package is the 2D sibling to Frontend 3D. Where Frontend 3D handles WebGL, React Three Fiber, and scroll-driven 3D scenes, Frontend UI handles everything else that ships in a product-facing web interface: typography, color systems, spacing, layouts, 2D motion (modals, drawers, buttons), interaction states, and the overall aesthetic. It is opinionated, opt-in, and wired to activate automatically the moment you start editing UI files.

The package is built around one thesis: **AI-generated UIs converge on the same small set of defaults** — Inter on pure black, purple-to-blue gradients, three identical icon-above-heading cards, centered everything, `ease-in` on entrances. Frontend UI rejects these defaults explicitly via banned lists, auto-loaded rules, and advisory hooks that catch the patterns before they settle into your design system.

**Who this chapter is for:**

- Developers shipping 2D product UIs — dashboards, admin panels, landing pages
- Teams building Next.js / Remix / SvelteKit applications with Tailwind or CSS-in-JS
- Anyone who wants automated pushback against AI-monoculture aesthetics
- Designers paired with Claude who want typography / color / motion reviewers on every edit

If you are building a scroll-driven 3D product showcase, see Chapter 13 (Frontend 3D) instead. Both packages can be installed side-by-side — they do not overlap.

## What `frontend-ui` does

The package ships **6 agents, 7 rules, 3 hooks, and 1 opt-in skill**. Every component is designed around auto-dispatch — you almost never call these agents by name.

**The agents** form an umbrella + specialists pattern. `ui-reviewer` is the top-level umbrella that scans your diff, runs a reflex audit against the AI-slop list, and dispatches specialists in parallel: `ui-typography-reviewer` for font-family or type-scale changes, `ui-color-reviewer` for palette work, `ui-motion-reviewer` for transitions and animations, `ui-interaction-reviewer` for buttons, modals, drawers, and forms, and `ui-design-critic` for gestalt-level critique ("does this feel designed, or does it feel generated?"). Each specialist has its own dispatch rules — you can also invoke them directly by asking about their domain, and the umbrella steps aside.

**The rules** use `applyWhenPaths` scoping so they auto-load only when you are editing UI files. `frontend-design-aesthetics` is the principles umbrella; `typography-guidelines`, `color-and-contrast`, `spatial-and-layout`, `motion-and-animation`, and `interaction-polish` are deep specialist rules; `ui-anti-patterns` is the rejection list (reflex fonts, banned colors, banned layouts). When you edit a `.tsx` file, Claude silently receives the four or five rules relevant to your change — no manual prompting required.

**The hooks** run on `PostToolUse` and are advisory-only (never block). `ui-banned-fonts-check` flags reflex-list fonts the moment you write `font-family: Inter`. `ui-color-check` catches pure `#000`/`#fff`, purple-to-blue gradients, gradient text, and cyan-on-black. `ui-animation-easing-check` catches `ease-in` on entrance animations, `transition: all`, and `scale(0)` entrances. Every hook has a `CLAUDE_DISABLE_*` opt-out environment variable for when you know better than the hook does.

**The skill** is `impeccable-craft` — a user-invoked, opt-in shape-then-build flow for creating a UI from scratch. It is explicitly not the primary workflow; the auto-dispatch agents cover the 90% case. `impeccable-craft` is for the green-field moment when you want to slow down and commit to an aesthetic direction before writing code.

## Installation

### Via superkit installer (recommended)

```bash
npx claude-code-superkit
# Select "Frontend UI" when prompted for stacks
```

The installer copies all agents, rules, hooks, and the skill into your `.claude/` directory and wires the three hooks into `settings.json` on `PostToolUse`.

### Non-interactive install

```bash
npx claude-code-superkit --stacks=frontend-ui
```

This is useful for CI, Dockerfiles, or teammate onboarding scripts.

### Installing alongside Frontend 3D

```bash
npx claude-code-superkit --stacks=frontend-ui,frontend-3d
```

Both packages coexist cleanly — `frontend-ui` opts out of 3D/WebGL files, `frontend-3d` opts out of pure 2D files. No overlap, no double-review.

## Your first UI review — walkthrough

Let's walk through a concrete scenario. You are adding a new pricing card to a landing page. You open `src/components/PricingCard.tsx` and write:

```tsx
export function PricingCard({ plan }: Props) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #a855f7, #3b82f6)",
        fontFamily: "Inter, sans-serif",
        color: "#fff",
        padding: "24px",
      }}
    >
      <h3>{plan.name}</h3>
      <p>{plan.description}</p>
    </div>
  );
}
```

As soon as the `Edit` tool completes, three things happen in sequence.

**First**, the hooks fire. `ui-banned-fonts-check` writes a stderr warning:

```
⚠ UI: reflex-list font detected in src/components/PricingCard.tsx
  • Inter
  These fonts are the LLM's training-data defaults and create visual
  monoculture. Consider running the font-selection procedure in
  .claude/rules/typography-guidelines.md (Step 1-4).
  Opt out: export CLAUDE_DISABLE_UI_FONT_CHECK=1
```

`ui-color-check` writes a second warning:

```
⚠ UI: color anti-patterns in src/components/PricingCard.tsx
  • Pure #fff in color/background — tint toward brand hue (oklch)
  • Purple→blue gradient detected — a trademark AI-palette pattern, reconsider
  See .claude/rules/color-and-contrast.md and ui-anti-patterns.md
```

**Second**, because the file path matches `applyWhenPaths` globs, the `typography-guidelines`, `color-and-contrast`, and `ui-anti-patterns` rules are now loaded in Claude's context. Claude sees both the stderr warnings and the rule text simultaneously.

**Third**, if you ask "review this" or "polish this," the `ui-reviewer` umbrella auto-dispatches. It runs its reflex audit, sees the font + color hits, and dispatches `ui-typography-reviewer` and `ui-color-reviewer` in parallel. They return findings in the standard format:

```
[CRITICAL · HIGH] Using Inter — reflex-list font
src/components/PricingCard.tsx:5

`font-family: Inter` is in .claude/rules/ui-anti-patterns.md
reflex_fonts_to_reject list.

This is a training-data default; every AI-generated UI reaches for it.
Projects lose visual differentiation.

Suggested change:
Run the font-selection procedure in typography-guidelines.md. Based on
your CLAUDE.md brand-voice ("calm, clinical, careful"), start with
Söhne, Unica77, or Neue Haas Grotesk as display.
```

```
[CRITICAL · HIGH] Purple-to-blue gradient — trademark AI palette
src/components/PricingCard.tsx:4

`linear-gradient(135deg, #a855f7, #3b82f6)` matches the AI-palette
reflex pattern documented in color-and-contrast.md and ui-anti-
patterns.md. This gradient appears on roughly every AI-generated
marketing page from 2023 onward.

Suggested change:
Pick a single accent color tied to your brand hue, or use a tonal
shift instead of a hue shift:
  background: oklch(0.55 0.15 265);
  /* or a tonal gradient within one hue: */
  background: linear-gradient(135deg, oklch(0.55 0.15 265), oklch(0.40 0.10 265));
```

Every finding carries a **severity** (`CRITICAL` / `WARNING` / `SUGGESTION`) and a **confidence** (`HIGH` / `MEDIUM` / `LOW`). Severity tells you how much this hurts the UI; confidence tells you how certain the reviewer is that it is wrong. A `[WARNING · LOW]` finding is a judgment call you can dismiss; a `[CRITICAL · HIGH]` finding is almost always shipping broken UX.

The review ends with a one-paragraph summary counting findings by severity and a top-line assessment like "This diff is shipping the AI reflex aesthetic — two CRITICAL findings block the commit."

## How auto-dispatch picks the right specialist

You never say "call `ui-color-reviewer`." You say "review this" or edit a file. Auto-dispatch takes over. Here is the decision tree in prose.

**The entry point is almost always `ui-reviewer`.** It dispatches when the user asks for `audit`, `review`, `polish`, or `critique` AND active edits are in `.tsx/.jsx/.ts/.css/.scss/.html/.vue` files, or when 3+ frontend file edits have completed in a single task. On backend files (`.go`, `.py`, `.rs`) it explicitly opts out — no double-review with the wrong specialist.

Inside `ui-reviewer`, Phase 1 is "scope the diff." It reads `git diff --name-only` and groups files by concern: typography-touching (anything with `font-family`, `font-weight`, type-scale tokens), color-touching (palette files, new `oklch`/`hsl`/`#hex` values, `bg-*`/`text-*` Tailwind classes), motion-touching (anything importing `motion/react` or touching `transition`/`animation`), interaction-touching (buttons, modals, drawers, forms), layout-touching (grid, flex, spacing tokens).

**If a concern has 2+ files or a large single-file change,** `ui-reviewer` dispatches the specialist in parallel. If you changed `font-family` in `Hero.tsx` and added a new type-scale step in `tokens.css`, that's the typography specialist. If you introduced a new `--brand-primary` token and swapped six `bg-slate-*` classes, that's the color specialist. Multiple specialists fire simultaneously (all `Agent` calls in one message) — they don't wait on each other.

**You can also invoke specialists directly.** If you say "check my palette for contrast issues," `ui-color-reviewer` fires without the umbrella running first. Same for "critique these fonts" (typography) or "do my modal transitions feel right" (motion). The specialist's own dispatch rules handle the routing.

**`ui-design-critic` is the odd one out.** It is not a technical reviewer — it is a gestalt-level critic that asks "does this feel designed, or does it feel generated?" Invoke it when you want subjective pushback, not code-level findings. The umbrella dispatches it when you ask for "critique" or "holistic review" specifically.

One more nuance: the umbrella **skips** dispatching specialists when a concern is trivial (one line touched, no tokens added). It notes "no specialist needed — single typography edit doesn't warrant deep review" in its output and proceeds. This keeps review cost proportional to the change.

## The `impeccable-craft` flow — when to opt in

`impeccable-craft` is the one skill in this package and the only component that is not auto-dispatched. You invoke it explicitly with "use the impeccable approach" or "craft this UI from scratch." It runs a 4-stage shape-then-build flow.

**Stage 1 — Shape.** Before any code. The skill gathers brand context (reads `CLAUDE.md`, `docs/architecture/`, asks one targeted question if signal is thin), then commits to three concrete brand-voice words (not "modern" or "elegant" — "warm, mechanical, opinionated" / "calm, clinical, careful" / "fast, dense, unimpressed"). It picks the "one memorable thing" — the single decision that makes this interface unforgettable. It drafts the palette and the type system using the rules. Output: a short written brief you approve before moving on.

**Stage 2 — Refine.** Build the design-token file (CSS variables or Tailwind config). Pick the component library. Sketch key layouts at a primitive level — no styling polish, just structure. Check composition and hierarchy before committing to details.

**Stage 3 — Implement.** Production code. Each interactive element runs through the Animation Decision Framework. Every button gets `:active`. Every focus state uses `:focus-visible`. Every modal has scroll-lock + focus trap. Spacing is varied deliberately (tight for related, generous for transitional). `prefers-reduced-motion` rule is included.

**Stage 4 — Polish.** Dispatch every specialist in parallel: typography, color, motion, interaction, design critic. Fix every CRITICAL. Address every WARNING unless documented. SUGGESTIONs are judgment calls. End with a summary of what was built, what was iterated on, and what was deliberately NOT done.

**When to trigger it:** a new product, a new landing page, a redesign from scratch, a green-field component library. Any moment when you want to slow down and commit to a direction before shipping.

**When NOT to trigger it:** fixing bugs in existing UI, reviewing a diff, polishing an existing component, catching up on design-system debt. For all of those, the auto-dispatch specialists are faster and more precise. `impeccable-craft` is deliberate overhead for the rare moment when the overhead is worth it.

## Troubleshooting common false positives

The hooks are advisory and will sometimes warn on patterns that are correct in your context. Every hook has an opt-out. Here are the three most common friction points.

### "Fraunces is banned but I need a serif for editorial work"

`ui-banned-fonts-check` flags Fraunces because it is one of the reflex-list serifs every AI-generated editorial landing reaches for. If you have genuinely evaluated alternatives and Fraunces is the right choice — you are publishing a book review site, you ran the font-selection procedure and Fraunces matched the brief — override the hook for this project:

```bash
# In your shell or .envrc
export CLAUDE_DISABLE_UI_FONT_CHECK=1
```

Then document the decision in `CLAUDE.md` ("Fraunces is an intentional choice per the font-selection procedure run on 2026-02") so the reviewers see the rationale and downgrade findings to SUGGESTION instead of WARNING.

Better alternative: keep the hook on but customize the banned list. Edit `.claude/scripts/hooks/ui-banned-fonts-check.sh` and remove `Fraunces` from the `BANNED_PATTERNS` array for this project only. The hook still catches Inter / DM Sans / the other 15 defaults.

### "ui-color-check flagged my purple→blue gradient but it's intentional"

This is the trademark AI-palette pattern, and the hook is aggressive for good reason. If your brand genuinely lives in purple-and-blue space (you are a web3 project called `indigo.xyz`, or your logo is literally a purple-to-blue gradient), you have two options:

**Option 1 — disable the hook for this project:**

```bash
export CLAUDE_DISABLE_UI_COLOR_CHECK=1
```

**Option 2 — document the brand context in `CLAUDE.md` and let the reviewer adjudicate.** The hook will still warn, but `ui-color-reviewer` reads your brand context in Phase 0 and downgrades the finding to SUGGESTION when the gradient matches the documented brand. You get the hook's catch on new instances and the reviewer's judgment on existing brand elements.

The third option — rewriting the gradient using tonal shifts within one hue (`oklch(0.55 0.15 265) → oklch(0.40 0.10 265)`) — is usually the right answer. Pure purple-to-blue rainbow gradients read as AI-default even when they are your brand.

### "animation easing hook warns but I need ease-in for exit animation"

`ui-animation-easing-check` flags `ease-in` because it is almost always wrong on UI — entrances should be `ease-out` (starts fast, feels responsive). But exits are a legitimate case for `ease-in` (material leaving the viewport should accelerate away). The hook does not distinguish entrance from exit — it flags any `ease-in` that is not `ease-in-out`.

Quiet it one of two ways:

**One-off override in code** — wrap the legitimate `ease-in` in a comment the hook will not read (it only scans CSS values):

```tsx
// Intentional: exit animation accelerates away
<motion.div exit={{ opacity: 0, transition: { ease: [0.4, 0, 1, 1] } }}>
```

Using the raw cubic-bezier instead of the `ease-in` keyword sidesteps the hook entirely and is arguably better practice — the named keyword is a 50-year-old CSS shorthand; cubic-beziers let you pick exact curves.

**Project-wide disable:**

```bash
export CLAUDE_DISABLE_UI_ANIM_CHECK=1
```

Only do this if you have a genuine reason to ship `ease-in` on entrances (rare, almost never the right call).

### General pattern for hook false positives

Every hook writes its opt-out instruction in the warning itself (`Opt out: export CLAUDE_DISABLE_UI_*_CHECK=1`). If you find yourself hitting the same false positive repeatedly, that is a signal — either the hook is mis-calibrated for your project (consider disabling or editing the patterns) or you are doing something the rules consider anti-pattern and you have a real case for the exception. Either way, the hook is advisory, not blocking; it never stops your work.

## Next steps

- Full package reference: `packages/frontend-ui/README.md`
- All 6 agent contracts: `packages/frontend-ui/agents/`
- All 7 rule files: `packages/frontend-ui/rules/`
- Hook sources (and their opt-out env vars): `packages/frontend-ui/hooks/`
- The `impeccable-craft` skill: `packages/frontend-ui/skills/impeccable-craft/SKILL.md`
- Attribution and licensing: `packages/frontend-ui/NOTICE.md`

If you also build 3D product showcases, pair this with Chapter 13 (Frontend 3D). The two packages were designed to coexist — install both with `npx claude-code-superkit --stacks=frontend-ui,frontend-3d`.
