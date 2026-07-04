---
alwaysApply: false
applyWhenPaths:
  - "**/presentation/**"
  - "**/src/**/*.tsx"
  - "**/src/**/*.jsx"
tokens: 827
---

# GSAP ScrollTrigger Conventions

Mandatory rules for GSAP scroll-driven animation code. Violations cause visual bugs.

**Scope:** this rule governs scroll-scrubbed presentation timelines and 3D scene motion. Interactive 2D UI element transitions (buttons, dropdowns, modals, hovers) follow `motion-and-animation.md` (frontend-ui package) instead — including its ease rules.

## 1. Timeline Extension — normalized scrub timelines ONLY

Precondition — apply this rule only when BOTH hold:

- the timeline is driven by ScrollTrigger `scrub`, AND
- its positions are normalized to the 0–1 range (the Phase Object pattern, rule 6).

Then, immediately after creating the timeline, add:

```tsx
tl.set({}, {}, 1.0); // no-op keyframe at position 1.0 — forces timeline to span the full 0–1 range
```

**Why:** without it, animations compress into the first ~10% of the scroll range.

Duration-based (non-scrub) timelines: do NOT add this line — position `1.0` is meaningless there and inserts a stray keyframe.

## 2. Scrub Must Be a Number

```tsx
// WRONG
scrub: true

// RIGHT
scrub: 1       // standard smoothness
scrub: 0.5     // snappier
scrub: 0.3     // very responsive
```

**Why:** `scrub: true` (boolean) causes jerky, non-smooth scrolling behavior.

## 3. invalidateOnRefresh

Every ScrollTrigger config MUST include:

```tsx
scrollTrigger: {
  invalidateOnRefresh: true,
  // ... other config
}
```

**Why:** without it, calculated positions break on window resize.

## 4. Context Cleanup

All animations MUST be inside `gsap.context()` with cleanup:

```tsx
useEffect(() => {
  const ctx = gsap.context(() => {
    // all animations here
  }, containerRef);

  return () => ctx.revert();
}, []);
```

**Why:** without context, animations leak memory and break on React re-renders.

## 5. Centralized GSAP Import

Import GSAP from the project's setup module, never directly:

```tsx
// WRONG
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// RIGHT
import { gsap, ScrollTrigger } from '@/lib/gsap-setup';
```

If no setup module exists yet, create one first (adjust the path to the project's alias):

```tsx
// lib/gsap-setup.ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
```

**Why:** ensures plugins are registered exactly once, consistently.

## 6. Phase Object for Timeline Positions

Use named constants, not magic numbers:

```tsx
const P = {
  entryStart: 0,
  entryEnd: 0.25,
  showcaseStart: 0.25,
  showcaseEnd: 0.7,
  exitStart: 0.7,
  exitEnd: 1.0,
};

tl.fromTo(element, { opacity: 0 }, { opacity: 1, duration: P.entryEnd - P.entryStart }, P.entryStart);
```

## 7. Ease Standards — scroll/3D contexts only

This table applies to scroll-scrubbed timelines and 3D scene motion. For 2D UI element transitions, use the ease rules in `motion-and-animation.md` (frontend-ui package): ease-out there, never ease-in.

| Use Case | Ease | Why |
|----------|------|-----|
| Entrances | `power3.out` | Fast start, gentle stop |
| Crossfades | `power2.inOut` | Smooth both directions |
| Subtle motion | `sine.in` / `sine.out` | Barely perceptible |
| Viewport exits | `power2.in` | Gentle start, fast finish — allowed for scroll/3D exits only |
