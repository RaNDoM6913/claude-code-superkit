---
name: product-3d-lighting
description: Studio lighting setups for 3D product showcases — HDRI, directional/spot/point lights, Environment from drei, shadow config, dark background optimization. Use when setting up lighting for product 3D scenes.
tokens: 1279
---

# Product 3D Lighting

## Purpose

Studio lighting recipes for product showcases in React Three Fiber: three copy-paste scenes plus numeric ranges that keep results dramatic instead of washed out.

## Use when / Do not use

- USE when lighting a single-subject product scene in R3F (hero section, product page, showcase).
- Do NOT use for full environments (landscapes, interiors, game levels) — these recipes assume one centered subject.

## Hard Rules

- Ambient intensity 0.2–0.3 on dark themes — higher washes out the drama.
- `environmentIntensity` 0.1–0.2 for dark themes, 0.3–0.5 for light themes.
- Every key light gets a softer fill from the opposite side — a single light means harsh shadows.
- `ContactShadows` opacity 0.3–0.5, never 1.0.
- Colored accent lights stay at intensity 0.3–0.5 — subtle beats obvious.
- Wrap the product in `<Float>` — static products read as screenshots.

## Workflow

1. Pick a recipe: dark/black background hero → Recipe 1 · white/light page, even light → Recipe 2 · cinematic reflections on a glossy product → Recipe 3 · unsure → Recipe 1 (most common product pattern).
2. Paste the recipe, replace `<ProductModel />` with your model, adjust positions/intensities only within the Hard Rules ranges.
3. Check the result against the Common Mistakes table before shipping.

## Recipe 1 — Dark Background (Product Hero)

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

      {/* Environment: very low intensity for subtle reflections (drei v9.88+) */}
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

## Recipe 2 — Light Background (Clean Product)

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

## Recipe 3 — Lightformer Studio (Advanced)

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

| Mistake | Fix | Why |
|---------|-----|-----|
| Ambient above 0.3 on dark theme | Set ambient intensity 0.2–0.3 | High ambient washes out the drama |
| `environmentIntensity` too high | 0.1–0.2 dark themes, 0.3–0.5 light | Strong reflections flatten the shading |
| Single light, no fill | Add a softer light from the opposite side | One light source means harsh shadows |
| `ContactShadows` opacity 1.0 | Use opacity 0.3–0.5 | Full-black shadow looks pasted on |
| Static product, no idle motion | Wrap the model in `<Float>` | Static products look like screenshots |
| Colored accent too strong | Keep accent intensity 0.3–0.5 | Subtle brand tint beats an obvious color cast |

## Environment Presets

| Preset | Look | Best for |
|--------|------|----------|
| `city` | Urban, neutral | General product |
| `studio` | Clean, white | Minimal product |
| `apartment` | Warm, natural | Lifestyle product |
| `sunset` | Golden, warm | Premium/luxury |
| `dawn` | Cool, blue | Tech/modern |
| `night` | Dark, moody | Gaming/dark UI |

## Recap — non-negotiables

- Dark theme: ambient 0.2–0.3, `environmentIntensity` 0.1–0.2.
- Always pair the key light with a softer fill from the opposite side.
- `ContactShadows` opacity 0.3–0.5; colored accents 0.3–0.5.
- Give the product `<Float>` idle motion.
