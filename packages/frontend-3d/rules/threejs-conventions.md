---
alwaysApply: false
applyWhenPaths:
  - "**/components/3d/**"
  - "**/three/**"
  - "**/scene/**"
  - "**/r3f/**"
tokens: 544
---

# Three.js / R3F Conventions

Mandatory rules for React Three Fiber and Three.js code.

## UI Screen Textures

Textures representing UI (screenshots, app screens) on 3D models:

```tsx
<meshBasicMaterial
  map={screenTexture}
  toneMapped={false}
/>
// + texture.colorSpace = THREE.SRGBColorSpace
```

**Rules:**
- Use `meshBasicMaterial` — screens emit light, they don't reflect it
- NEVER `MeshStandardMaterial` for display screens
- Set `toneMapped={false}` — prevents ACES tone mapping from distorting UI colors
- Set `texture.colorSpace = THREE.SRGBColorSpace` for any photo/UI texture
- Canvas `toneMapping: 0` when UI textures are the primary visual element

## UV Settings on Texture Replacement

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

## GLB Preloading

Always preload at module level:

```tsx
useGLTF.preload('/models/phone.glb');
```

**Why:** Without preload, model loads on mount causing visible pop-in.

## useFrame Performance

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

## Zustand in useFrame

```tsx
// WRONG — hook subscription triggers re-renders
const progress = useStore((s) => s.progress);
useFrame(() => { /* use progress */ });

// RIGHT — direct read, no re-renders
useFrame(() => {
  const { progress } = useStore.getState();
});
```

## DPR Settings

```tsx
<Canvas dpr={[1, 2]}>
```

Higher values degrade mobile performance with minimal visual benefit.

## Disposal

```tsx
<group dispose={null}>
  <Model />
</group>
```

Use `dispose={null}` for reusable models to prevent premature Three.js cleanup.
