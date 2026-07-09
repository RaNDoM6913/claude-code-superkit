---
name: impeccable-craft
description: "Opt-in shape-then-build flow for creating UI from scratch with maximum intentionality. 4-stage cycle: shape → refine → implement → polish. Invoke only when explicitly asked for \"craft a UI\" or \"impeccable approach\"."
user-invocable: true
---

# Impeccable Craft

**When to invoke:**
- User explicitly asks for "craft", "build from scratch", "design something new"
- User wants the full impeccable methodology end-to-end
- User wants sketch-first workflow instead of jumping to code

**When NOT to invoke:**
- For code review (use `frontend-ui-reviewer` and specialists)
- For polish / audit / critique (use specialists — they auto-activate)
- For bug fixes

## Stage 1 — Shape (before any code)

1. **Gather brand context**: read `AGENTS.md` or `CLAUDE.md`, check available project memory. If context thin, ask ONE question: "In one sentence, what should this interface feel like?"

2. **Articulate the aesthetic direction in 3 concrete words.** Not "modern" or "elegant". Concrete: "warm, mechanical, opinionated" / "calm, clinical, careful" / "fast, dense, unimpressed" / "expensive, quiet, precise".

3. **Pick the one memorable thing.** What makes this UI unforgettable? Distinctive typographic choice · signature interaction · surprising composition · signature color? Without an answer, design drifts to default.

4. **State constraints explicitly**: framework, performance budget, accessibility, browser support, reduced-motion defaults.

5. **Draft the core palette** (per color-and-contrast practices): brand hue → tinted neutrals (chroma 0.005–0.02) → accent scale (chroma peaks middle, reduced at extremes) → status colors as separate mini-palettes.

6. **Draft the type system**: run the font-selection procedure (4 steps), reject reflex-list fonts (Inter / DM Sans / Fraunces / etc.), pair display + body.

**Output of Stage 1** — a written brief the user confirms:
- Audience + use context
- 3 concrete brand-voice words
- The one memorable thing
- Constraints
- Palette tokens
- Type choices

**Check in with the user**: "Building on this direction, OK to proceed?" before Stage 2.

## Stage 2 — Refine

1. **Build the design-token file** (CSS custom properties or Tailwind config) with everything from Stage 1.
2. **Pick the component library** if applicable. Shadcn/Radix defaults read as shadcn — custom is often right for high-craft projects.
3. **Sketch key layouts in code at primitive level** — no styling polish yet, just structure. Flex/grid boxes labelled with what they'll contain. Check composition and hierarchy BEFORE committing to details.

## Stage 3 — Implement

Production code with attention to:

1. **Motion decisions**. For each interactive element, run the Animation Decision Framework (should it animate? purpose? easing? duration?). Use custom cubic-bezier constants, apply the duration table.
2. **Interaction polish**. Every button gets `:active`. Every focus uses `:focus-visible` with custom ring. Every modal/drawer has scroll-lock and focus trap. Forms validate on blur/submit, not focus.
3. **Spacing rhythm**. Vary spacing deliberately — tight for related, generous for transitional, major breaks at section boundaries. Don't `p-4` everything.
4. **Prefers-reduced-motion** blanket rule required.

## Stage 4 — Polish

After first implementation, run through specialist reviews:

1. `frontend-ui-typography-reviewer` on the type system
2. `frontend-ui-color-reviewer` on the palette
3. `frontend-ui-motion-reviewer` on transitions
4. `frontend-ui-interaction-reviewer` on components
5. `frontend-ui-design-critic` on the holistic result

Fix every CRITICAL. Address every WARNING unless documented reason not to. SUGGESTIONs are judgment calls.

**Check in with the user** before Stage 4 specialist reviews — this is the second direction-drift point where confirmation is cheap.

## Output

At end of Stage 4, one-paragraph summary:
- Stage 1 brief (the target)
- What was built
- What was iterated on after reviews
- What was deliberately NOT done (and why)

Save Stage 1 brief to auto-memory as `project_brand_context.md` so future sessions start with context.

## Hard Rules

- Never skip Stage 1. Building without a brief = AI-slop. 3–5 minutes saves hours.
- Never slide past Stage 4. Specialists exist for a reason.
- Check in at Stage 1→2 and Stage 3→4 boundaries. Those are the drift points.
- Cite the rules you're applying so the user learns the methodology.

---

Attribution: Apache-2.0, adapted from pbakaus/impeccable craft flow.
