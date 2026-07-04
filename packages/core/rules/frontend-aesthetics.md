---
alwaysApply: false
applyWhenPaths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.css"
  - "**/*.scss"
tokens: 624
---

# Frontend Aesthetics

Proactive anti-slop: apply DURING frontend code generation, not after review.
Precedence: if the frontend-ui package rules are installed (`typography-guidelines.md`, `ui-anti-patterns.md`, etc. in `.claude/rules/`), follow those — this rule is the minimal fallback.

## Hard Rules
- Tokens first: every color, spacing value, and font size comes from a defined scale (see Design System Compliance).
- NEVER default to Inter, Roboto, Arial, Helvetica, Open Sans, or bare system fonts — run the Typography procedure instead.
- NEVER ship any pattern from the AI Pattern Red Flags list.

## Typography — selection procedure
1. Project already loads fonts (Tailwind/theme config, `@font-face`, `next/font`, `<link>` import)? → use that stack.
2. No stack? → pick one characterful display face for headings + one workhorse body face, from fonts the project can actually load (self-hosted files or a provider it already uses); name both picks in your response.
3. Nothing loadable and no user direction? → propose 2–3 named pairings and ask — do not silently fall back to defaults.

Hierarchy: headings, body, and captions must differ in at least two of size / weight / family.

## Color & Theme
- Commit to one cohesive palette via CSS variables; dominant base + sharp accents beats a timid, evenly-distributed palette.
- Draw from the project's design system tokens when available.

## Motion & Animation
- Concentrate on high-impact moments: one well-orchestrated page load with staggered reveals beats scattered micro-interactions.
- Use the project's existing animation library (motion/react, framer-motion, CSS transitions); prefer CSS-only when it suffices.

## Backgrounds & Depth
- Create atmosphere: layer CSS gradients, geometric patterns, contextual effects — not solid white/gray defaults.

## AI Pattern Red Flags (AVOID these)
- Purple/blue gradient as default accent color
- White cards on gray background with identical spacing everywhere
- Generic hero section with stock imagery
- Rounded corners on everything with no visual hierarchy
- box-shadow on every interactive element
- "Clean and modern" that actually means "bland and default"
- Identical spacing/padding/gap values everywhere — no rhythm

## Design System Compliance
- If a design system exists (Tailwind config, theme file, tokens) — use it.
- If none — establish consistent tokens (CSS variables) before building components.
- Every color, spacing value, and font size comes from a defined scale.
