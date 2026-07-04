---
alwaysApply: false
applyWhenPaths:
  - "**/components/3d/**"
  - "**/three/**"
  - "**/scene/**"
  - "**/r3f/**"
tokens: 870
---

# Three.js / R3F Conventions

Mandatory rules for React Three Fiber and Three.js code. For debugging wrong-looking colors (washed out, oversaturated, too dark), load the `threejs-color-management` skill — the settings below match its pipeline.

## 1. UI Screen Textures

Textures representing UI (screenshots, app screens) on 3D models:

```tsx
<meshBasicMaterial
  map={screenTexture}
  toneMapped={false}
/>
// + screenTexture.colorSpace = THREE.SRGBColorSpace
```

**Rules:**
- Use `meshBasicMaterial` — screens emit light, they don't reflect it
- NEVER `MeshStandardMaterial` for display screens
- Set `toneMapped={false}` — prevents ACES tone mapping from distorting UI colors
- Set `texture.colorSpace = THREE.SRGBColorSpace` for any photo/UI texture; data textures (normal, roughness) stay `THREE.LinearSRGBColorSpace`
- Never `sRGBEncoding` / `texture.encoding` — deprecated since r152; use `colorSpace`
- Set Canvas `gl={{ toneMapping: THREE.NoToneMapping }}` when a UI/screen texture occupies the majority of the frame or is the hero object; otherwise keep the R3F default (`THREE.ACESFilmicToneMapping`) for realistic scenes. Always write the named constant, never bare `0`.

## 2. UV Settings on Texture Replacement

When replacing a material's texture map, MUST copy ALL UV settings:

```tsx
newTexture.flipY = oldTexture.flipY;
newTexture.wrapS = oldTexture.wrapS;
newTexture.wrapT = oldTexture.wrapT;
newTexture.offset.copy(oldTexture.offset);
newTexture.repeat.copy(oldTexture.repeat);
newTexture.rotation = oldTexture.rotation;
newTexture.center.copy(oldTexture.center);
```

**Why:** Forgetting any of these causes texture misalignment, stretching, or mirroring.

Also set `newTexture.colorSpace` per Section 1 — the seven lines above do not copy it.

## 3. GLB Preloading

Always preload at module level (outside the component):

```tsx
useGLTF.preload('/models/phone.glb');
```

**Why:** Without preload, model loads on mount causing visible pop-in.

## 4. useFrame Performance

```tsx
// WRONG — allocates on every frame (60fps = 60 allocations/sec)
useFrame(() => {
  const pos = new THREE.Vector3(1, 2, 3);
});

// RIGHT — pre-allocate in ref
const tempVec = useRef(new THREE.Vector3());
useFrame(() => {
  tempVec.current.set(1, 2, 3);
});
```

## 5. Zustand in useFrame

```tsx
// WRONG — hook subscription triggers re-renders
const progress = useStore((s) => s.progress);
useFrame(() => { /* use progress */ });

// RIGHT — direct read, no re-renders
useFrame(() => {
  const { progress } = useStore.getState();
});
```

## 6. DPR Settings

```tsx
<Canvas dpr={[1, 2]}>
```

Higher values degrade mobile performance with minimal visual benefit.

## 7. Disposal

Pick the branch by how the asset is used:

| Asset | Rule |
|-------|------|
| Shared/preloaded GLTF (`useGLTF`, rendered in more than one place or preloaded via `useGLTF.preload`) | Wrap in `<group dispose={null}>` — the loader cache owns the asset; auto-disposal on unmount would break every other consumer |
| One-off geometry/material/texture declared in JSX, used by a single component | No `dispose={null}` — R3F disposes it automatically on unmount |
| Objects created imperatively (`new THREE.CanvasTexture(...)`, render targets) | Call `.dispose()` yourself in the `useEffect` cleanup |

```tsx
// Shared/preloaded model — protect the cached asset:
<group dispose={null}>
  <Model />
</group>
```

Do NOT put `dispose={null}` on one-off scenes — that leaks GPU memory on unmount.
