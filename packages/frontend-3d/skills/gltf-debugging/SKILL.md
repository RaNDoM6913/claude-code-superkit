---
name: gltf-debugging
description: Runtime GLB/GLTF inspection — traverse nodes, identify screen meshes, inspect UV coordinates, material property dumping, fixing exported materials at runtime. Use when textures don't map correctly to 3D models.
tokens: 917
---

# GLTF/GLB Debugging

Runtime inspection techniques for when textures don't map correctly to 3D models.

## Traverse All Meshes

First step: see what's in the model.

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

## Inspect UV Coordinates

UV coordinates map 2D textures onto 3D geometry. Range 0-1 = good.

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

## Dump Material Properties

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

## Replace Texture Safely

When replacing a material's map, MUST copy UV settings from original:

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

  newTexture.colorSpace = THREE.SRGBColorSpace;
  newTexture.needsUpdate = true;

  newMat.map = newTexture;
  newMat.toneMapped = false;
  newMat.needsUpdate = true;
}
```

## Common Issues

### Texture stretched/squished
**Cause:** UV coordinates don't match texture aspect ratio.
**Fix:** Check UV range. If model uses UV atlas, you may need custom UV mapping.

### Texture appears on wrong mesh
**Cause:** Multiple meshes share a material.
**Fix:** Clone material before modifying: `mesh.material = mat.clone()`

### Texture flipped/mirrored
**Cause:** `flipY` mismatch between old and new texture.
**Fix:** Copy `flipY` from original texture, or try toggling it.

### Black/invisible texture
**Cause:** `needsUpdate` not called, or wrong colorSpace.
**Fix:** Set `texture.needsUpdate = true` and `material.needsUpdate = true`.

### Sketchfab model with baked textures
**Cause:** Model uses texture atlas — UVs map to specific regions of a combined image.
**Fix:** Either use the original atlas texture, or re-UV the screen mesh in Blender.

### Glass mesh hiding screen content
**Cause:** Front glass mesh occludes screen texture.
**Fix:** Set glass mesh `visible={false}` or `material.transparent = true` with low opacity.
