---
name: r3f-scroll-driven-3d
description: Connect GSAP ScrollTrigger to React Three Fiber — Zustand bridge, useFrame animation, scroll progress to 3D transforms. The pattern for scroll-driven 3D product showcases.
tokens: 1677
---

# Scroll-Driven 3D with GSAP + R3F

## Purpose

GSAP ScrollTrigger runs in the DOM; R3F runs in WebGL — they cannot talk directly. Bridge them with a Zustand store: GSAP writes scroll progress, R3F reads it in `useFrame`.

```
[GSAP ScrollTrigger] → writes → [Zustand Store] → reads → [R3F useFrame]
       (DOM)                      (shared state)              (WebGL)
```

## Use when / Do not use

- **Use when:** scroll position drives a 3D scene — product showcases, scrollytelling, camera/model/material state tied to scroll progress.
- **Do not use:** DOM-only scroll animation (plain ScrollTrigger, no store needed) or one-shot 3D intros with no scroll link (animate directly in `useFrame`).

## Hard Rules

1. `scrub` MUST be a number (e.g. `scrub: 1`), never `true` — the number adds catch-up smoothing; `true` locks 1:1 to the wheel and looks janky in 3D.
2. Every ScrollTrigger in this pattern MUST set `invalidateOnRefresh: true` — start/end values recalculate on resize/refresh so the pinned section stays aligned.
3. When normalizing timeline progress to 0–1, MUST extend the timeline with `tl.set({}, {}, 1)` — without it the timeline ends at the last tween and `tl.call()` positions after that point never fire.
4. Inside `useFrame` (or any per-frame callback), read the store with `useScrollStore.getState()` — never the hook subscription, which re-renders React on every scroll tick.

## Why Zustand (Not React State/Context)?

- React state/context triggers re-renders on every scroll tick (60fps = 60 re-renders/sec)
- Zustand `getState()` reads directly without subscribing — zero re-renders
- `useFrame` already runs at 60fps — just read the latest value

## Workflow

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

  useEffect(() => {
    // getState(), not the hook — stable setters, no 60fps re-renders of this component
    const { setProgress, setTexture } = useScrollStore.getState();

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ref.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,                    // Hard Rule 1: number, NOT true
          invalidateOnRefresh: true,   // Hard Rule 2: MUST have
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

      // Hard Rule 3: extend timeline to full duration — otherwise it ends at
      // the last tween and tl.call() positions after that never fire
      tl.set({}, {}, 1.0);

    }, ref);

    return () => ctx.revert();
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

    // Hard Rule 4: getState() not hook — no re-renders
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

Preload every texture up front (never load inside `useFrame`), then swap `material.map` when the store value changes. Step 2's `tl.call(...)` is what drives `currentTexture`.

```tsx
// components/3d/ScreenMaterial.tsx
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useScrollStore } from '@/stores/useScrollStore';

export function ScreenMaterial() {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const [screen1, screen2] = useTexture([
    '/textures/screen-1.png',
    '/textures/screen-2.png',
  ]);
  const byPath: Record<string, THREE.Texture> = {
    '/textures/screen-1.png': screen1,
    '/textures/screen-2.png': screen2,
  };

  useFrame(() => {
    // Hard Rule 4: getState() not hook
    const { currentTexture } = useScrollStore.getState();
    const next = byPath[currentTexture];
    if (matRef.current && next && matRef.current.map !== next) {
      matRef.current.map = next;
      matRef.current.needsUpdate = true;
    }
  });

  // toneMapped=false: screen UI textures should not be tone-mapped
  return <meshBasicMaterial ref={matRef} map={screen1} toneMapped={false} />;
}
```

For correct color space on screen textures, see the `threejs-color-management` skill.

## Recap — non-negotiables

- `scrub: <number>`, never `scrub: true`.
- `invalidateOnRefresh: true` on every ScrollTrigger.
- `tl.set({}, {}, 1)` to extend the timeline to full duration when normalizing 0–1.
- `useScrollStore.getState()` inside `useFrame` and callbacks — never the hook subscription.
