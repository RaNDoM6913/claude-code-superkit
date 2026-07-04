---
alwaysApply: false
applyWhenPaths:
  - "**/presentation/**/*.tsx"
  - "**/presentation/**/*.jsx"
  - "**/landing/**/*.tsx"
  - "**/landing/**/*.jsx"
tokens: 685
---

# Frontend Aesthetics — 3D & Presentation

Aesthetics rules for 3D-enhanced presentation/landing pages. If the core `frontend-aesthetics` rule is installed, this extends it with animation and 3D-specific patterns; every rule below also stands on its own.

## 1. Anti-Center Bias

When a section contains more than 4 visual elements (cards, CTAs, images, 3D objects), do not center everything — pick one of:
- Split screen: content left, 3D right (or vice versa)
- Asymmetric layout with intentional negative space
- 3D element offset from center for visual interest

## 2. Cards Only When Earned

Use a card only when elevation communicates hierarchy — never as the default container. If every section is a card, nothing has emphasis.

## 3. Viewport Units

```tsx
// WRONG — iOS Safari address bar causes jumping
h-screen

// RIGHT — dynamic viewport height
min-h-[100dvh]
```

## 4. Grid Over Flex Math

```tsx
// WRONG — fragile percentage calculations
<div className="flex">
  <div className="w-[calc(50%-12px)]">

// RIGHT — explicit grid
<div className="grid grid-cols-2 gap-6">
```

## 5. Staggered Reveals

List/grid items MUST use staggered entrance — batch pop-in (all items appearing simultaneously) looks cheap.

```tsx
// 0.05-0.1s delay between items (GSAP)
stagger: { each: 0.08, from: 'start' }
```

## 6. Spring Physics for Interactions

For interactive presentation elements (hover cards, draggable 3D, mouse-tracking) on Framer Motion stacks (`framer-motion` / `motion`):

```tsx
// WRONG — robotic
transition={{ duration: 0.3, ease: 'linear' }}

// RIGHT — natural feel
transition={{ type: 'spring', stiffness: 300, damping: 20 }}
```

GSAP has no `type: 'spring'` — never paste these props into a GSAP tween. On GSAP-only stacks use an ease instead (`ease: 'back.out(1.7)'` for interactive pops; for scroll/3D ease choices see the Ease Standards table in `gsap-conventions.md`). Simple open/close state transitions in plain 2D UI follow the frontend-ui `motion-and-animation.md` rule when installed: duration-based ease-out, not springs.

## 7. 3D Scene Atmosphere

- Dark backgrounds: ambient < 0.3, dramatic key light
- Light backgrounds: ambient 0.7–0.8, soft even lighting
- Add `<Float>` for idle animation (static 3D looks dead) — EXCEPT when `window.matchMedia('(prefers-reduced-motion: reduce)')` matches: render the scene without idle motion
- `ContactShadows` for grounding — floating objects feel disconnected

## 8. Scroll-Driven 3D

- The 3D model MUST respond to scroll — rotation, scale, material changes
- Use phase-based animation (entry → showcase → transition → exit); each phase has a clear visual purpose — no random motion
- Timeline and scrub mechanics follow `gsap-conventions.md`
