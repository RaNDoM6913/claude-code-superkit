---
name: html-to-3d-texture
description: Capture HTML/React components as PNG or canvas textures for 3D model screens — Playwright, html2canvas, live CanvasTexture, resolution guide, rounded-corner masking.
tokens: 1514
---

# HTML to 3D Texture Pipeline

## Purpose

Display web UI on a 3D surface: render a React component, capture it as a PNG or canvas, apply it as a Three.js texture on the model's screen mesh.

```
React Component → Capture (Playwright/html2canvas) → PNG/Canvas → Three.js Texture → 3D Mesh
```

## Use when / Do not use

- **Use when**: a 3D model (phone, laptop, tablet) must show real web UI on its screen.
- **Do not use when**: the UI must stay clickable/scrollable on the 3D surface — a texture is a flat image. Use `@react-three/drei` `<Html>` instead.

## Hard Rules

- Set `texture.colorSpace = THREE.SRGBColorSpace` on every texture built from a capture — otherwise colors wash out.
- Capture at 2x (`deviceScaleFactor: 2` / `scale: 2`) — 1x textures look blurry on retina screens.
- html2canvas re-parses the entire DOM subtree on every call — this cost applies to Method 2 AND Method 3. In any repeated-capture loop, cap refresh at 1–2 fps for production; higher rates (e.g. 10 fps) are local-dev demos only.

## Workflow

1. Pick the capture method from the decision table below.
2. Capture at 2x using that method's code.
3. Post-process if the screen needs rounded corners (sharp recipe below).
4. Apply as texture with `SRGBColorSpace` set (PNG → `THREE.TextureLoader`; canvas → `THREE.CanvasTexture`).

## Decision table — which method

| Content on the 3D screen | Method |
|--------------------------|--------|
| Static — never changes at runtime | **Method 1** — Playwright PNG (build-time) |
| Changes on discrete events (user action, data loaded) | **Method 2** — one-shot html2canvas per event |
| Changes continuously (timers, animations, live data) | **Method 3** — throttled html2canvas loop |
| Must remain interactive (clicks, scroll, inputs) | Not a texture — drei `<Html>` |

Default when unsure: **Method 1** — best quality, zero runtime cost.

## Method 1: Playwright Capture (build-time, best quality)

Best for: production screenshots, pixel-perfect captures.

```javascript
// scripts/capture-screen.mjs
import { chromium } from 'playwright';

const PORT = process.argv[2] || 3000;
const WIDTH = 440;   // Native screen width
const HEIGHT = 956;  // Native screen height
const SCALE = 2;     // Retina (output: 880x1912)

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: SCALE,
  });

  await page.goto(`http://localhost:${PORT}/capture`);
  await page.waitForLoadState('networkidle');

  // Find target element
  const el = await page.locator('[data-screen-id="main"]');
  await el.screenshot({
    path: 'public/textures/screen.png',
    type: 'png',
  });

  await browser.close();
  console.log(`Captured: ${WIDTH * SCALE}x${HEIGHT * SCALE}px`);
}

capture();
```

## Method 2: One-shot html2canvas (event-driven runtime capture)

Best for: content that changes on discrete events. Call once per change event (button click, data arrival) — do NOT wrap this in an interval; that is Method 3.

```tsx
import html2canvas from 'html2canvas';
import * as THREE from 'three';

async function captureToTexture(element: HTMLElement): Promise<THREE.CanvasTexture> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: null, // transparent
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}
```

## Method 3: Throttled html2canvas loop (continuous updates)

Best for: UI that changes continuously while displayed on the 3D surface. Same capture as Method 2, driven by a timer — so the html2canvas cost from Hard Rules repeats every tick. Keep `FPS` at 1–2 in production.

```tsx
const FPS = 2; // production-safe (1-2 fps). 10 fps = local-dev demo only — CPU-heavy.

function useHTMLTexture(ref: React.RefObject<HTMLDivElement>) {
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!ref.current) return;
      const canvas = await html2canvas(ref.current, { scale: 2 });
      if (textureRef.current) {
        textureRef.current.image = canvas;
        textureRef.current.needsUpdate = true;
      } else {
        textureRef.current = new THREE.CanvasTexture(canvas);
        textureRef.current.colorSpace = THREE.SRGBColorSpace;
      }
    }, 1000 / FPS);

    return () => clearInterval(interval);
  }, [ref]);

  return textureRef;
}
```

## Resolution Guide

| Device | Native (pts) | @2x (px) | Use for |
|--------|-------------|----------|---------|
| iPhone 15 Pro | 393x852 | 786x1704 | Phone model screen |
| iPhone 16 Pro Max | 440x956 | 880x1912 | Large phone model |
| iPad Pro 11" | 834x1194 | 1668x2388 | Tablet model |
| MacBook Pro 14" | 1512x982 | 3024x1964 | Laptop model |

## Applying Rounded Corners

PNG with transparent rounded corners for phone screens:

```javascript
// Using sharp (Node.js)
import sharp from 'sharp';

const RADIUS = 124; // 62pt * 2x scale
const { width, height } = await sharp('screen.png').metadata();

const mask = Buffer.from(
  `<svg width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" 
          rx="${RADIUS}" ry="${RADIUS}" fill="white"/>
  </svg>`
);

await sharp('screen.png')
  .ensureAlpha()
  .composite([{ input: mask, blend: 'dest-in' }])
  .png()
  .toFile('screen-rounded.png');
```

## Tips

- Always capture at 2x for retina quality
- Use `data-screen-id` attribute to find elements reliably
- Remove debug borders/outlines before capture
- Test with `sips -g pixelWidth -g pixelHeight` (macOS) to verify dimensions
- Set `backgroundColor: null` for transparent backgrounds when needed

## Recap — non-negotiables

- `SRGBColorSpace` on every capture-derived texture.
- Capture at 2x, always.
- Repeated html2canvas capture: 1–2 fps in production; 10 fps only as a labeled local-dev demo value.
- Unsure which method: Method 1 (Playwright PNG).
