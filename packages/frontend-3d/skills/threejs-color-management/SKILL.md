---
name: threejs-color-management
description: Three.js color pipeline — sRGB vs Linear, toneMapping (None/ACES/Reinhard), texture colorSpace, when to use NoToneMapping for UI textures. Activate when color issues arise with 3D textures or rendered colors look wrong.
tokens: 1098
---

# Three.js Color Management

## Purpose
Fix wrong-looking colors in Three.js/R3F scenes — too bright, too dark, washed out, or distorted — by setting each stage of the color pipeline correctly.

## Use when / Do not use
- **Use when:** rendered colors do not match the source asset; a UI screenshot looks wrong on a 3D screen; textures look oversaturated, washed out, or too dark.
- **Do not use for:** brightness problems caused by light intensity/setup, or CSS/DOM color issues outside the Canvas.

## Hard Rules
- Visual textures (photos, UI screenshots) MUST set `texture.colorSpace = THREE.SRGBColorSpace`; data textures (normal, roughness) stay `THREE.LinearSRGBColorSpace`.
- Materials showing UI/screen content MUST set `toneMapped={false}`.
- Always write the named constant `THREE.NoToneMapping` — never the bare number `0`.
- NEVER use deprecated `sRGBEncoding` / `texture.encoding` — replaced by `colorSpace` since r152.
- Keep `renderer.outputColorSpace = THREE.SRGBColorSpace` (the default) unless there is a documented reason to change it.

## Debug Workflow
Diagnose in pipeline order:
1. Check `texture.colorSpace` — matches content type (Stage 1 table)?
2. Check material `toneMapped` — `false` for UI textures (Stage 2 table)?
3. Check Canvas `toneMapping` — `THREE.NoToneMapping` if the scene is UI-heavy (Stage 3 table)?
4. Check material type — `meshBasicMaterial` for screens (no lighting effects)?
5. Grep for deprecated `sRGBEncoding` — replace with `colorSpace` (since r152).

## The Color Pipeline

```
Texture → Material → Renderer (toneMapping) → Output (outputColorSpace)
```

Every texture goes through all four stages.

### Stage 1: Texture colorSpace
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

### Stage 2: Material toneMapped
Controls whether the material goes through the renderer's tone mapping.

| Scenario | toneMapped | Why |
|----------|-----------|-----|
| UI on 3D screen | `false` | Preserve exact pixel colors |
| Realistic objects | `true` (default) | HDR → SDR compression needed |
| Emissive displays | `false` | Screens emit, don't reflect |

```tsx
<meshBasicMaterial map={texture} toneMapped={false} />
```

### Stage 3: Renderer toneMapping
Global setting. Compresses HDR values into displayable range.

| Value | Effect | Use when |
|-------|--------|----------|
| `THREE.ACESFilmicToneMapping` | Cinematic, saturated | Realistic 3D scenes (R3F Canvas default) |
| `THREE.NoToneMapping` (=0) | No compression | UI textures are primary visual |
| `THREE.ReinhardToneMapping` | Gentle compression | Bright scenes, less contrast |

```tsx
<Canvas gl={{ toneMapping: THREE.NoToneMapping }}>
```

### Stage 4: Output colorSpace
`renderer.outputColorSpace = THREE.SRGBColorSpace` (default). Rarely change this.

## Common Issues & Fixes

### Colors too bright / oversaturated
**Cause:** Tone mapping amplifying already-sRGB colors.
**Fix:** `toneMapped={false}` on the material, or `gl={{ toneMapping: THREE.NoToneMapping }}` on Canvas.

### Colors washed out / desaturated
**Cause:** Texture loaded as LinearSRGB but contains sRGB data.
**Fix:** `texture.colorSpace = THREE.SRGBColorSpace`

### Colors too dark
**Cause:** sRGB texture treated as linear (double conversion).
**Fix:** Check `texture.colorSpace` — if it's a photo/UI, must be `THREE.SRGBColorSpace`.

### UI screenshot looks wrong on a 3D model
**UI-screenshot-on-3D-screen pattern** — apply all three settings together:
```tsx
<meshBasicMaterial
  map={screenTexture}
  toneMapped={false}
/>
// + screenTexture.colorSpace = THREE.SRGBColorSpace
// + Canvas gl={{ toneMapping: THREE.NoToneMapping }} if UI is the primary visual
```

## Recap — non-negotiables
- Photos/UI screenshots → `THREE.SRGBColorSpace`; data textures → `THREE.LinearSRGBColorSpace`.
- UI/screen materials → `toneMapped={false}` (use `meshBasicMaterial` for screens).
- Named constant `THREE.NoToneMapping`, never bare `0`.
- No `sRGBEncoding` — use `colorSpace` (r152+).
