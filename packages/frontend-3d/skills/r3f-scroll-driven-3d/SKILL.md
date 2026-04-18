---
name: r3f-scroll-driven-3d
description: Connect GSAP ScrollTrigger to React Three Fiber — Zustand bridge, useFrame animation, scroll progress to 3D transforms. The pattern for scroll-driven 3D product showcases.
tokens: 1081
---

# Scroll-Driven 3D with GSAP + R3F

Architecture pattern for connecting GSAP ScrollTrigger to React Three Fiber scenes via Zustand store.

## Why This Pattern?

**Problem:** GSAP runs in the DOM. R3F runs in WebGL. They can't communicate directly.

**Solution:** Zustand store as a bridge — GSAP writes scroll progress, R3F reads it in useFrame.

```
[GSAP ScrollTrigger] → writes → [Zustand Store] → reads → [R3F useFrame]
       (DOM)                      (shared state)              (WebGL)
```

## Why Zustand (Not React State/Context)?

- React state/context triggers re-renders on every scroll tick (60fps = 60 re-renders/sec)
- Zustand `getState()` reads directly without subscribing — zero re-renders
- useFrame already runs at 60fps — just read the latest value

## Implementation

### Step 1: Create the store

```tsx
// stores/useScrollStore.ts
import { create } from 'zustand';

interface ScrollStore {
  progress: number;          // 0-1 scroll progress
  currentTexture: string;    // active screen texture path
  setProgress: (p: number) => void;
  setTexture: (t: string) => void;
}

export const useScrollStore = create<ScrollStore>((set) => ({
  progress: 0,
  currentTexture: '/textures/screen-1.png',
  setProgress: (p) => set({ progress: p }),
  setTexture: (t) => set({ currentTexture: t }),
}));
```

### Step 2: GSAP writes to store

```tsx
// components/ScrollSection.tsx
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useScrollStore } from '@/stores/useScrollStore';

gsap.registerPlugin(ScrollTrigger);

export function ScrollSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { setProgress, setTexture } = useScrollStore();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ref.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,                    // number, NOT true
          invalidateOnRefresh: true,   // MUST have
          pin: true,
        },
      });

      // Animate progress 0 → 1
      tl.to({}, {
        duration: 1,
        onUpdate: function() {
          setProgress(this.progress());
        },
      });

      // Swap texture at 50% scroll
      tl.call(() => setTexture('/textures/screen-2.png'), [], 0.5);

      // CRITICAL: extend timeline to full duration
      tl.set({}, {}, 1.0);

    }, ref);

    return () => ctx.revert();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Zustand setters are stable references
  }, []);

  return <div ref={ref} style={{ height: '300vh' }} />;
}
```

### Step 3: R3F reads in useFrame

```tsx
// components/3d/PhoneModel.tsx
import { useFrame } from '@react-three/fiber';
import { useScrollStore } from '@/stores/useScrollStore';
import { useRef } from 'react';
import * as THREE from 'three';

export function PhoneModel() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    // CRITICAL: getState() not hook — no re-renders
    const { progress } = useScrollStore.getState();

    // Rotate based on scroll
    groupRef.current.rotation.y = progress * Math.PI * 2;

    // Phase-based animation
    if (progress < 0.3) {
      // Entry: scale up
      const t = progress / 0.3;
      groupRef.current.scale.setScalar(0.5 + t * 0.5);
    } else if (progress < 0.7) {
      // Showcase: full size, rotate
      groupRef.current.scale.setScalar(1);
    } else {
      // Exit: scale down
      const t = (progress - 0.7) / 0.3;
      groupRef.current.scale.setScalar(1 - t * 0.3);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Your 3D model here */}
    </group>
  );
}
```

## Performance Tips

- **Pre-allocate:** No `new THREE.Vector3()` inside useFrame — use refs
- **getState():** Always in useFrame, never hook subscription
- **DPR:** `dpr={[1, 2]}` — higher wastes mobile GPU
- **Dispose:** `dispose={null}` on reusable groups

## Dynamic Texture Swapping

```tsx
useFrame(() => {
  const { currentTexture } = useScrollStore.getState();
  // Load and apply texture based on store value
});
```

Use `tl.call(() => setTexture('/new.png'), [], timePosition)` in GSAP timeline to trigger swaps at specific scroll positions.
