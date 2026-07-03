---
name: gltf-debugging
description: Runtime GLB/GLTF inspection — traverse nodes, identify screen meshes, inspect UV coordinates, material property dumping, fixing exported materials at runtime. Use when textures don't map correctly to 3D models.
tokens: 1419
---

# GLTF/GLB Debugging

## Purpose

Runtime inspection recipes for when textures don't map correctly onto a loaded GLB/GLTF model: traverse meshes, check UV coordinates, dump material properties, replace textures without breaking UV mapping.

## Use when / Do not use

**Use when:** a texture renders wrong on a GLB/GLTF (stretched, black, mirrored, on the wrong mesh), or you need to find which mesh is the "screen"/target surface in a model.
**Do not use for:** general color-space pipeline setup (see `threejs-color-management`) or scroll/animation issues (see `r3f-scroll-driven-3d`).

## Hard Rules

1. Run Steps 1→4 in order. Inspect before fixing — never guess at a fix without traversal + UV + material data.
2. NEVER modify a mesh's material in place. Clone first (`mesh.material = mat.clone()`) — exported materials are often shared across meshes.
3. When replacing a texture, copy ALL 7 UV settings from the old map: `flipY`, `wrapS`, `wrapT`, `offset`, `repeat`, `rotation`, `center`. Missing even one causes flipped/offset textures.
4. After any texture or material change, set both `texture.needsUpdate = true` AND `material.needsUpdate = true`.
5. `colorSpace = THREE.SRGBColorSpace` + `toneMapped = false` applies to color/UI/photo maps (`.map`) ONLY. Data textures (`normalMap`, `roughnessMap`, `metalnessMap`, `aoMap`) use `THREE.LinearSRGBColorSpace` and keep `toneMapped` as exported.

## Workflow

Optional pre-check (offline, before touching runtime code) — list scenes, meshes, materials, and textures of the file:

```bash
npx @gltf-transform/cli inspect model.glb
```

### Step 1 — Traverse All Meshes

See what's in the model; find the target mesh by name.

```tsx
useEffect(() => {
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      console.log(`Mesh: ${mesh.name}`, {
        geometry: mesh.geometry.attributes,
        material: (mesh.material as THREE.Material).type,
        visible: mesh.visible,
      });
    }
  });
}, [scene]);
```

### Step 2 — Inspect UV Coordinates

UV coordinates map 2D textures onto 3D geometry. Range 0–1 = good.

```tsx
const geo = mesh.geometry;
const uvAttr = geo.attributes.uv;

if (!uvAttr) {
  console.error(`${mesh.name}: NO UV coordinates!`);
  // Fix: re-export from Blender with UV map
} else {
  // Check UV range
  let minU = Infinity, maxU = -Infinity;
  let minV = Infinity, maxV = -Infinity;
  for (let i = 0; i < uvAttr.count; i++) {
    const u = uvAttr.getX(i), v = uvAttr.getY(i);
    minU = Math.min(minU, u); maxU = Math.max(maxU, u);
    minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  }
  console.log(`${mesh.name} UV range: U[${minU},${maxU}] V[${minV},${maxV}]`);
  // [0,1] = single texture fill. [0,0.5] = uses half the texture (atlas)
}
```

### Step 3 — Dump Material Properties

```tsx
const mat = mesh.material as THREE.MeshStandardMaterial;
console.log(`${mesh.name} material:`, {
  type: mat.type,
  map: mat.map ? 'yes' : 'no',
  emissiveMap: mat.emissiveMap ? 'yes' : 'no',
  normalMap: mat.normalMap ? 'yes' : 'no',
  roughness: mat.roughness,
  metalness: mat.metalness,
  color: mat.color?.getHexString(),
  toneMapped: mat.toneMapped,
});
```

### Step 4 — Replace Texture Safely

Apply Hard Rules 2–5: clone the material, copy all 7 UV settings, flag updates.

```tsx
function replaceTexture(mesh: THREE.Mesh, newTexture: THREE.Texture) {
  const mat = mesh.material as THREE.MeshBasicMaterial;
  const oldMap = mat.map;

  // Clone material to not affect other meshes sharing it
  mesh.material = mat.clone();
  const newMat = mesh.material as THREE.MeshBasicMaterial;

  // Copy ALL UV settings from original texture
  if (oldMap) {
    newTexture.flipY = oldMap.flipY;
    newTexture.wrapS = oldMap.wrapS;
    newTexture.wrapT = oldMap.wrapT;
    newTexture.offset.copy(oldMap.offset);
    newTexture.repeat.copy(oldMap.repeat);
    newTexture.rotation = oldMap.rotation;
    newTexture.center.copy(oldMap.center);
  }

  // Color/UI/photo texture tail. For data textures (normalMap, roughnessMap,
  // metalnessMap, aoMap): use THREE.LinearSRGBColorSpace and keep toneMapped.
  newTexture.colorSpace = THREE.SRGBColorSpace;
  newTexture.needsUpdate = true;

  newMat.map = newTexture;
  newMat.toneMapped = false;
  newMat.needsUpdate = true;
}
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Texture stretched/squished | UV coordinates don't match texture aspect ratio | Check UV range (Step 2). If model uses a UV atlas, you may need custom UV mapping |
| Texture appears on wrong mesh | Multiple meshes share a material | Clone material before modifying: `mesh.material = mat.clone()` |
| Texture flipped/mirrored | `flipY` mismatch between old and new texture | Copy `flipY` from original texture, or try toggling it |
| Black/invisible texture | `needsUpdate` not called, or wrong `colorSpace` | Set `texture.needsUpdate = true` and `material.needsUpdate = true`; check Hard Rule 5 |
| Sketchfab model with baked textures | Texture atlas — UVs map to specific regions of a combined image | Use the original atlas texture, or re-UV the screen mesh in Blender |
| Glass mesh hiding screen content | Front glass mesh occludes screen texture | Set glass mesh `visible={false}`, or `material.transparent = true` with low opacity |

## Recap — non-negotiables

- Inspect in order (traverse → UV → material dump) before applying any fix.
- Clone shared materials; never mutate in place.
- Copy all 7 UV settings when swapping a texture; then `needsUpdate = true` on both texture and material.
- `SRGBColorSpace`/`toneMapped = false` for color maps only — data maps stay linear.
