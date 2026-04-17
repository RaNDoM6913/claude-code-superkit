---
name: impeccable-craft
description: |
  Opt-in shape-then-build flow for creating a UI from scratch with maximum intentionality. Gathers brand context, commits to an aesthetic direction, and iterates through a 4-stage craft cycle (sketch → refine → implement → polish). Use this skill when explicitly asked for "craft a UI from scratch" or "use the impeccable approach" — otherwise the auto-dispatched agents (ui-reviewer + specialists) are the primary workflow.
user-invocable: true
license: Apache-2.0 (based on portions of pbakaus/impeccable — see packages/frontend-ui/NOTICE.md)
---

# Impeccable Craft

**When to invoke this skill:**
- User explicitly asks for "craft", "build from scratch", "design
  something new"
- User wants to go through the full impeccable methodology end-to-end
- User wants the sketch-first workflow (instead of jumping straight to
  code)

**When NOT to invoke:**
- For code review (use `ui-reviewer` and specialists — they auto-
  dispatch)
- For polish / audit / critique (use specialists — they auto-dispatch)
- For bug fixes (no need for craft methodology)

## The four stages

### Stage 1 — Shape

Before writing any code:

1. **Gather brand context** per `frontend-design-aesthetics.md` Phase
   0. If `CLAUDE.md` does not provide enough signal and auto-memory
   has no `project_brand_context.md`, ask ONE question: "In one
   sentence, what should this interface feel like?" Then proceed.

2. **Articulate the aesthetic direction in 3 concrete words.** Not
   "modern" or "elegant" — concrete: "warm, mechanical, opinionated";
   "calm, clinical, careful"; "fast, dense, unimpressed"; "expensive,
   quiet, precise". The 3 words must be mutually constraining.

3. **Pick the one memorable thing.** What is the ONE decision that
   makes this interface unforgettable? A distinctive typographic
   choice, a signature interaction, a surprising composition, a
   particular rhythm? Without an answer, the design will drift to
   default.

4. **State constraints explicitly.** Framework, performance budget,
   accessibility requirements, browser support, reduced-motion
   defaults.

5. **Draft the core palette** using `color-and-contrast.md`. Brand
   hue → tinted neutral scale → accent scale → status colors. Check
   chroma at extremes.

6. **Draft the type system** using `typography-guidelines.md`. Run
   the font-selection procedure (4 steps). Reject reflex-list fonts.
   Pair display + body.

Output of Stage 1 before moving on: a short written brief (the user
can see) stating:
- Audience + use context
- 3 concrete brand-voice words
- The one memorable thing
- Constraints
- Palette tokens
- Type choices

Confirm this with the user — "Building on this direction, OK to
proceed?" — before Stage 2.

### Stage 2 — Refine

Translate the brief into component primitives:

1. **Build the design-token file** (CSS custom properties or Tailwind
   config) with everything from Stage 1.
2. **Pick the component library** if applicable (Radix / shadcn /
   Headless UI / custom). For high-craft projects, custom is often
   the right call — shadcn defaults read as shadcn.
3. **Sketch the key layouts** in code at a primitive level — no
   styling polish yet, just structure. Flex/grid boxes labelled with
   what they'll contain. Check the composition and hierarchy BEFORE
   committing to details.

## Stage 3 — Implement

Now write production code with attention to:

1. **Motion decisions.** For each interactive element, run the
   Animation Decision Framework from `motion-and-animation.md`. Use
   the custom `cubic-bezier` constants (`--ease-out`, `--ease-in-out`,
   `--ease-drawer`, `--ease-snappy`) and the duration table.
2. **Interaction polish.** Every button gets `:active`. Every focus
   state uses `:focus-visible` with visible custom styling. Every
   modal/drawer has scroll-lock and focus trap. Every form validates
   on blur / submit, not focus.
3. **Spacing rhythm.** Vary spacing deliberately — tight for related,
   generous for transitional, major breaks at section boundaries.
   Don't `p-4` everything.
4. **Prefers-reduced-motion.** Include the blanket rule from
   `motion-and-animation.md`.

## Stage 4 — Polish

After first implementation, run through every specialist review:

1. Dispatch `ui-typography-reviewer` on the type system.
2. Dispatch `ui-color-reviewer` on the palette.
3. Dispatch `ui-motion-reviewer` on transitions.
4. Dispatch `ui-interaction-reviewer` on components.
5. Dispatch `ui-design-critic` on the whole result.

Fix every CRITICAL. Address every WARNING unless there's a documented
reason not to. SUGGESTIONs are judgment calls.

## Output

At the end of Stage 4, write a one-paragraph summary to the user:

- Stage 1 brief (what was the target)
- What was built
- What was iterated on after specialist reviews
- What was deliberately NOT done (and why)

Save the brief from Stage 1 to auto-memory as
`project_brand_context.md` so future sessions start with context.

## Hard rules

- **Do not skip Stage 1.** Building without a brief is how AI-slop
  happens. The stage takes 3–5 minutes and saves hours later.
- **Do not let Stage 4 slide.** The specialist reviews exist for a
  reason. A "90% done" implementation is almost always shipping
  defaults the specialists would catch.
- **Do** explicitly check in with the user between Stage 1 and Stage
  2 (after the brief) and again between Stage 3 and Stage 4 (before
  specialist reviews). These are the two points where direction can
  drift and user confirmation is cheap.
- **Do** cite the rules you're applying ("per `typography-
  guidelines.md` step 3, I'm looking at Velvetyne for a weird-but-
  grounded display font"). The user should learn the methodology, not
  just receive the output.

---

Attribution: adapted from Impeccable's `craft` flow (Apache-2.0). See
`../../NOTICE.md`.
