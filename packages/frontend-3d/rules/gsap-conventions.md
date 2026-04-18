---
alwaysApply: false
applyWhenPaths:
  - "**/presentation/**"
  - "**/src/**/*.tsx"
  - "**/src/**/*.jsx"
---

# GSAP ScrollTrigger Conventions

Mandatory rules for GSAP ScrollTrigger animations. Violations cause visual bugs.

## Timeline Extension (CRITICAL)

After EVERY `gsap.timeline()` creation, add:

```tsx
tl.set({}, {}, 1.0); // no-op keyframe at position 1.0 — forces timeline to span full duration
```

**Why:** Without this, animations compress into the first 10% of scroll range. The empty `set()` creates a no-op keyframe that tells GSAP the timeline extends to position 1.0.

## Scrub Must Be a Number

```tsx
// WRONG
scrub: true

// RIGHT
scrub: 1       // standard smoothness
scrub: 0.5     // snappier
scrub: 0.3     // very responsive
```

**Why:** `scrub: true` (boolean) causes jerky, non-smooth scrolling behavior.

## invalidateOnRefresh

Every ScrollTrigger config MUST include:

```tsx
scrollTrigger: {
  invalidateOnRefresh: true,
  // ... other config
}
```

**Why:** Without it, calculated positions break on window resize.

## Context Cleanup

All animations MUST be inside `gsap.context()` with cleanup:

```tsx
useEffect(() => {
  const ctx = gsap.context(() => {
    // all animations here
  }, containerRef);

  return () => ctx.revert();
}, []);
```

**Why:** Without context, animations leak memory and break on React re-renders.

## Centralized GSAP Import

Import GSAP from your project's setup file, not directly:

```tsx
// WRONG
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// RIGHT
import { gsap, ScrollTrigger } from '@/lib/gsap-setup';
```

**Why:** Ensures plugins are registered once, consistently.

## Phase Object for Timeline Positions

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

## Ease Standards

| Use Case | Ease | Why |
|----------|------|-----|
| Entrances | `power3.out` | Fast start, gentle stop |
| Crossfades | `power2.inOut` | Smooth both directions |
| Subtle motion | `sine.in` / `sine.out` | Barely perceptible |
| Exits | `power2.in` | Gentle start, fast finish |
