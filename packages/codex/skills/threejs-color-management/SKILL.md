---
name: threejs-color-management
description: Three.js color pipeline — sRGB vs Linear, toneMapping (None/ACES/Reinhard), texture colorSpace, when to use NoToneMapping for UI textures. Activate when color issues arise with 3D textures or rendered colors look wrong.
user-invocable: false
---

# Three.js Color Management

Complete guide to the Three.js color pipeline. Use this when colors look wrong in 3D scenes — too bright, too dark, washed out, or distorted.

## The Color Pipeline

```
Texture → Material → Renderer (toneMapping) → Output (outputColorSpace)
```

Every texture goes through this pipeline. Understanding each stage prevents color issues.

## Stage 1: Texture colorSpace

Set on load. Tells Three.js how to interpret the texture data.

| Type | colorSpace | When |
|------|-----------|------|
| Photos, UI screenshots | `THREE.SRGBColorSpace` | Colors created for human eyes |
| Normal maps, roughness | `THREE.LinearSRGBColorSpace` | Data textures (not visual) |
| HDR environment | `THREE.LinearSRGBColorSpace` | Already in linear space |

```tsx
const texture = useTexture('/screen.png');
texture.colorSpace = THREE.SRGBColorSpace; // UI screenshot
```

## Stage 2: Material toneMapped

Controls whether the material goes through the renderer's tone mapping.

| Scenario | toneMapped | Why |
|----------|-----------|-----|
| UI on 3D screen | `false` | Preserve exact pixel colors |
| Realistic objects | `true` (default) | HDR → SDR compression needed |
| Emissive displays | `false` | Screens emit, don't reflect |

```tsx
<meshBasicMaterial map={texture} toneMapped={false} />
```

## Stage 3: Renderer toneMapping

Global setting. Compresses HDR values into displayable range.

| Value | Effect | Use when |
|-------|--------|----------|
| `THREE.ACESFilmicToneMapping` | Cinematic, saturated | Realistic 3D scenes (default) |
| `THREE.NoToneMapping` (0) | No compression | UI textures are primary visual |
| `THREE.ReinhardToneMapping` | Gentle compression | Bright scenes, less contrast |

```tsx
<Canvas gl={{ toneMapping: THREE.NoToneMapping }}>
```

## Stage 4: Output colorSpace

`renderer.outputColorSpace = THREE.SRGBColorSpace` (default). Rarely change this.

## Common Issues & Fixes

### Colors too bright / oversaturated
**Cause:** Tone mapping amplifying already-sRGB colors.
**Fix:** `toneMapped={false}` on the material, or `toneMapping: 0` on Canvas.

### Colors washed out / desaturated
**Cause:** Texture loaded as LinearSRGB but contains sRGB data.
**Fix:** `texture.colorSpace = THREE.SRGBColorSpace`

### Colors too dark
**Cause:** sRGB texture treated as linear (double conversion).
**Fix:** Check `texture.colorSpace` — if it's a photo/UI, must be SRGBColorSpace.

### UI screenshot looks wrong on 3D model
**The MacBook Landing Pattern** (proven solution):
```tsx
<meshBasicMaterial
  map={screenTexture}
  toneMapped={false}
/>
// + texture.colorSpace = THREE.SRGBColorSpace
// + Canvas gl={{ toneMapping: THREE.NoToneMapping }} if UI is primary
```

## Debug Checklist

1. Check `texture.colorSpace` — matches content type?
2. Check material `toneMapped` — false for UI textures?
3. Check Canvas `toneMapping` — 0 if UI-heavy scene?
4. Check material type — `meshBasicMaterial` for screens (no lighting effects)?
5. Check for deprecated `sRGBEncoding` — use `colorSpace` instead (since r152)
