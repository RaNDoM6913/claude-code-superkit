---
alwaysApply: false
applyWhenPaths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.css"
  - "**/*.scss"
tokens: 425
---

# Frontend Aesthetics

Proactive anti-slop: apply DURING frontend code generation, not after review.

## Typography
- Choose beautiful, unique fonts — never default to Inter, Roboto, Arial, system fonts
- Use distinctive choices that elevate the design's aesthetics
- Establish clear hierarchy: headings, body, captions should feel different

## Color & Theme
- Commit to a cohesive aesthetic — use CSS variables for consistency
- Dominant colors with sharp accents outperform timid, evenly-distributed palettes
- Draw from the project's design system tokens when available

## Motion & Animation
- Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions
- Use the project's animation library (motion/react, framer-motion, CSS transitions)
- Prefer CSS-only solutions when possible

## Backgrounds & Depth
- Create atmosphere — layer CSS gradients, geometric patterns, contextual effects
- Do NOT default to solid white/gray backgrounds

## AI Pattern Red Flags (AVOID these)
- Purple/blue gradient as default accent color
- White cards on gray background with identical spacing everywhere
- Generic hero section with stock imagery
- Rounded corners on everything with no visual hierarchy
- box-shadow on every interactive element
- "Clean and modern" that actually means "bland and default"
- Identical spacing/padding/gap values everywhere — no rhythm

## Design System Compliance
- If a design system exists (Tailwind config, theme file, tokens) — use it
- If no design system — establish consistent tokens before building components
- Every color, spacing value, and font size should come from a defined scale
