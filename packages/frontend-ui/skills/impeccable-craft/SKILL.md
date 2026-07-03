---
name: impeccable-craft
description: Opt-in shape-then-build flow for creating a UI from scratch — gather brand context, commit to an aesthetic direction, then run the 4-stage craft cycle (Shape → Refine → Implement → Polish); invoke only when explicitly asked to craft a UI from scratch or use the impeccable approach.
tokens: 1839
user-invocable: true
license: Apache-2.0 (based on portions of pbakaus/impeccable — see https://github.com/RaNDoM6913/claude-code-superkit/blob/main/packages/frontend-ui/NOTICE.md)
---

# Impeccable Craft

## Purpose

Build a UI from scratch with maximum intentionality: commit to an
aesthetic direction on paper BEFORE writing code, then iterate through
four stages ending in a full specialist review pass.

## Use when

- User explicitly asks for "craft", "build from scratch", "design
  something new"
- User wants the full impeccable methodology end-to-end
- User wants the sketch-first workflow (instead of jumping straight to
  code)

## Do not use

- For code review — `ui-reviewer` and specialists auto-dispatch
- For polish / audit / critique — specialists auto-dispatch
- For bug fixes — no craft methodology needed

## Hard Rules

- **NEVER skip Stage 1 (Shape).** Building without a written brief is
  how AI-slop happens; the brief takes 3–5 minutes and saves hours.
- **NEVER skip Stage 4 (Polish).** All 5 specialist reviewers must run;
  a "90% done" implementation ships defaults they would catch.
- **Two user check-ins, always:** after Stage 1 (confirm the brief
  before Stage 2) and at the end of Stage 3 (confirm before Stage 4).
- **Review triage is fixed:** fix every CRITICAL; address every WARNING
  or document why not; apply a SUGGESTION only if it takes <5 minutes
  AND does not conflict with the Stage 1 brief — otherwise list it as
  deferred in the final summary.
- **Cite the rule section as you apply it** ("per
  `typography-guidelines.md` Step 3, I'm looking at Velvetyne for a
  weird-but-grounded display font") — the user should learn the
  methodology, not just receive output.
- **Save the Stage 1 brief** to auto-memory as
  `project_brand_context.md` so future sessions start with context.

## The four stages

### Stage 1 — Shape

Before writing any code:

1. **Gather brand context** per the "Before writing any UI: gather
   design context" section of `frontend-design-aesthetics.md`
   (audience, use cases, brand tone; source order: prompt →
   `CLAUDE.md`/`README.md` → `docs/architecture/frontend-*.md` →
   auto-memory → one targeted question). If `CLAUDE.md` gives no
   signal and auto-memory has no `project_brand_context.md`, ask ONE
   question: "In one sentence, what should this interface feel like?"
   Then proceed.
2. **Articulate the aesthetic direction in 3 concrete words.** Not
   "modern" or "elegant" — concrete: "warm, mechanical, opinionated";
   "calm, clinical, careful"; "fast, dense, unimpressed"; "expensive,
   quiet, precise". The 3 words must be mutually constraining.
3. **Pick the one memorable thing.** What is the ONE decision that
   makes this interface unforgettable — a distinctive typographic
   choice, a signature interaction, a surprising composition, a
   particular rhythm? Without an answer, the design drifts to default.
4. **State constraints explicitly.** Framework, performance budget,
   accessibility requirements, browser support, reduced-motion
   defaults.
5. **Draft the core palette** per the "Building the palette" section
   of `color-and-contrast.md` (Steps 1–4: brand hue → tinted neutral
   scale → accent scale with reduced chroma at extremes → status
   colors as system, not brand).
6. **Draft the type system** per "The font-selection procedure" in
   `typography-guidelines.md` (Steps 1–4). Reject reflex-list fonts.
   Pair display + body.

Stage 1 output — a short written brief the user can see, stating:

- Audience + use context
- 3 concrete brand-voice words
- The one memorable thing
- Constraints
- Palette tokens
- Type choices

**Check-in 1:** confirm the brief with the user — "Building on this
direction, OK to proceed?" — before Stage 2.

### Stage 2 — Refine

Translate the brief into component primitives:

1. **Build the design-token file** (CSS custom properties or Tailwind
   config) with everything from Stage 1.
2. **Pick the component library** if applicable (Radix / shadcn /
   Headless UI / custom). For high-craft projects, custom is often the
   right call — shadcn defaults read as shadcn.
3. **Sketch the key layouts** in code at a primitive level — no
   styling polish yet, just structure. Flex/grid boxes labelled with
   what they'll contain. Check composition and hierarchy BEFORE
   committing to details.

### Stage 3 — Implement

Write production code with attention to:

1. **Motion decisions.** For each interactive element, run "The
   4-question framework (ask in order, before writing any animation)"
   from `motion-and-animation.md`. Use the custom `cubic-bezier`
   constants (`--ease-out`, `--ease-in-out`, `--ease-drawer`,
   `--ease-snappy`) from its "Custom curves (stronger than the CSS
   defaults)" subsection and the duration table under "Question 4 —
   How long should it take?".
2. **Interaction polish.** Every button gets `:active`. Every focus
   state uses `:focus-visible` with visible custom styling. Every
   modal/drawer has scroll-lock and focus trap. Every form validates
   on blur / submit, not focus.
3. **Spacing rhythm.** Vary spacing deliberately — tight for related,
   generous for transitional, major breaks at section boundaries.
   Don't `p-4` everything.
4. **Prefers-reduced-motion.** Include the blanket rule from the
   "Reduced motion — required, not optional" section of
   `motion-and-animation.md`.

**Check-in 2:** show the user what was built and confirm before
starting the Stage 4 specialist reviews.

### Stage 4 — Polish

Run every specialist review, in order:

1. Dispatch `ui-typography-reviewer` on the type system.
2. Dispatch `ui-color-reviewer` on the palette.
3. Dispatch `ui-motion-reviewer` on transitions.
4. Dispatch `ui-interaction-reviewer` on components.
5. Dispatch `ui-design-critic` on the whole result.

Triage findings per the Hard Rules: CRITICAL → fix; WARNING → address
or document why not; SUGGESTION → apply only if <5 minutes and
brief-compatible, else list as deferred.

## Output

At the end of Stage 4, emit exactly this summary:

```markdown
## Impeccable Craft — final summary
**Stage 1 brief:** <3 words + the one memorable thing + key constraints>
**Built:** <screens/components created>
**Iterated after reviews:** <CRITICALs fixed, WARNINGs addressed>
**Deferred:** <SUGGESTIONs and skipped WARNINGs, each with a one-line reason>
**Deliberately NOT done:** <choices avoided + why>
**Brief saved:** project_brand_context.md → yes/no
```

## Done ONLY when

- [ ] Stage 1 brief written and confirmed by the user before Stage 2.
- [ ] User confirmed the implementation at the end of Stage 3.
- [ ] All 5 specialists dispatched (typography, color, motion,
      interaction, design-critic).
- [ ] Every CRITICAL fixed; every WARNING addressed or its skip reason
      documented.
- [ ] Stage 1 brief saved to auto-memory as `project_brand_context.md`.
- [ ] Final summary emitted in the template above.

Not all boxes checked → say what is missing; do not claim completion.

## Recap — non-negotiables

- Stage 1 brief first, Stage 4 reviews last — neither may be skipped.
- Two user check-ins: after Stage 1 and at the end of Stage 3.
- CRITICAL = fix; WARNING = address or document; SUGGESTION = apply
  only if <5 min and brief-compatible, else defer.
- Cite the exact rule-file sections as you apply them.

---

Attribution: adapted from Impeccable's `craft` flow (Apache-2.0).
See the project's NOTICE.md at
https://github.com/RaNDoM6913/claude-code-superkit/blob/main/packages/frontend-ui/NOTICE.md
