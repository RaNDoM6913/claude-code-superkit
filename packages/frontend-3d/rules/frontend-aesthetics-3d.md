---
alwaysApply: false
applyWhenPaths:
  - "**/presentation/**/*.tsx"
  - "**/presentation/**/*.jsx"
  - "**/landing/**/*.tsx"
  - "**/landing/**/*.jsx"
tokens: 477
---

# Frontend Aesthetics — 3D & Presentation

Extended aesthetics rules for 3D-enhanced presentation/landing pages. Supplements the core `frontend-aesthetics` rule with animation and 3D-specific patterns.

## Anti-Center Bias

Not everything centered. When a section contains more than 4 visual elements (cards, CTAs, images, 3D objects), use:
- Split screen: content left, 3D right (or vice versa)
- Asymmetric layouts with intentional negative space
- Offset 3D elements from center for visual interest

## Cards Only When Earned

Cards only when elevation communicates hierarchy — not as default container.
If every section is a card, nothing has emphasis.

## Viewport Units

```tsx
// WRONG — iOS Safari address bar causes jumping
h-screen

// RIGHT — dynamic viewport height
min-h-[100dvh]
```

## Grid Over Flex Math

```tsx
// WRONG — fragile percentage calculations
<div className="flex">
  <div className="w-[calc(50%-12px)]">

// RIGHT — explicit grid
<div className="grid grid-cols-2 gap-6">
```

## Staggered Reveals

List/grid items MUST use staggered entrance:

```tsx
// 0.05-0.1s delay between items
stagger: { each: 0.08, from: 'start' }
```

Batch pop-in (all items appear simultaneously) looks cheap.

## Spring Physics for Interactions

```tsx
// WRONG — robotic
transition: { duration: 0.3, ease: 'linear' }

// RIGHT — natural feel
transition: { type: 'spring', stiffness: 300, damping: 20 }
```

## 3D Scene Atmosphere

- Dark backgrounds: ambient < 0.3, dramatic key light
- Light backgrounds: ambient 0.7-0.8, soft even lighting
- Always add `<Float>` for idle animation — static 3D looks dead
- `ContactShadows` for grounding — floating objects feel disconnected

## Scroll-Driven 3D

- 3D model should respond to scroll — rotation, scale, material changes
- Use phase-based animation (entry → showcase → transition → exit)
- Each phase has clear visual purpose — no random motion
