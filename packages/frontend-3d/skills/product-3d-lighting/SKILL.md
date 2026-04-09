---
name: product-3d-lighting
description: Studio lighting setups for 3D product showcases — HDRI, directional/spot/point lights, Environment from drei, shadow config, dark background optimization. Use when setting up lighting for product 3D scenes.
---

# Product 3D Lighting

Studio lighting patterns for product showcases in React Three Fiber.

## Dark Background Setup (Product Hero)

The most common product showcase pattern — dark/black background with dramatic lighting.

```tsx
import { Environment, ContactShadows, Float } from '@react-three/drei';

function ProductScene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
      {/* Base: low ambient so dark areas stay dark */}
      <ambientLight intensity={0.25} />

      {/* Key light: main illumination from upper-right */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.6}
        castShadow
      />

      {/* Fill light: softer, from opposite side */}
      <directionalLight
        position={[-3, 3, -3]}
        intensity={0.25}
      />

      {/* Accent: colored point light for brand feel */}
      <pointLight
        position={[0, -2, 3]}
        color="#6366f1"
        intensity={0.5}
      />

      {/* Environment: very low intensity for subtle reflections */}
      <Environment preset="city" environmentIntensity={0.15} />

      {/* Grounding shadow */}
      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.4}
        blur={2.5}
        far={4}
      />

      {/* Subtle idle animation */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        <ProductModel />
      </Float>
    </Canvas>
  );
}
```

## Light Background Setup (Clean Product)

For white/light product pages — even lighting, minimal shadows.

```tsx
<Canvas>
  <ambientLight intensity={0.8} />
  <directionalLight position={[5, 5, 5]} intensity={0.5} />
  <directionalLight position={[-5, 3, -5]} intensity={0.3} />

  <Environment preset="apartment" environmentIntensity={0.4} />
  <ContactShadows opacity={0.2} blur={3} />
</Canvas>
```

## Studio Lights Pattern (Advanced)

Using drei Lightformer for cinematic studio lighting:

```tsx
import { Lightformer, Environment } from '@react-three/drei';

<Environment resolution={256}>
  {/* Key light — large softbox */}
  <Lightformer
    form="rect"
    intensity={2}
    position={[5, 5, -5]}
    rotation={[0, Math.PI / 2, 0]}
    scale={[5, 3, 1]}
    color="white"
  />

  {/* Fill — subtle warm */}
  <Lightformer
    form="ring"
    intensity={0.5}
    position={[-5, 3, 5]}
    color="#fef3c7"
    scale={3}
  />

  {/* Rim light — defines edge */}
  <Lightformer
    form="rect"
    intensity={1.5}
    position={[0, 5, -8]}
    scale={[10, 1, 1]}
    color="#e0e7ff"
  />
</Environment>
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Too much ambient light | Keep ambient 0.2-0.3 for dark themes. Washes out drama |
| Environment intensity too high | 0.1-0.2 for dark themes, 0.3-0.5 for light |
| No fill light | Always add a softer opposite light. Single light = harsh shadows |
| Shadow too dark | `ContactShadows opacity={0.3-0.5}`, not 1.0 |
| No idle animation | `<Float>` adds life. Static products look like screenshots |
| Colored light too strong | Accent intensity 0.3-0.5. Subtle > obvious |

## Environment Presets

| Preset | Look | Best for |
|--------|------|----------|
| `city` | Urban, neutral | General product |
| `studio` | Clean, white | Minimal product |
| `apartment` | Warm, natural | Lifestyle product |
| `sunset` | Golden, warm | Premium/luxury |
| `dawn` | Cool, blue | Tech/modern |
| `night` | Dark, moody | Gaming/dark UI |
