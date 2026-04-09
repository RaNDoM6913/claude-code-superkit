---
name: html-to-3d-texture
description: Capture HTML/React components as PNG textures for 3D models — html2canvas, CanvasTexture, capture pipeline, resolution settings. Use when you need to display web UI on a 3D surface.
---

# HTML to 3D Texture Pipeline

Capture React components as PNG images for use as textures on 3D model screens.

## Architecture

```
React Component → Capture (Playwright/html2canvas) → PNG → Three.js Texture → 3D Mesh
```

## Method 1: Playwright Capture (recommended for quality)

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

## Method 2: html2canvas (runtime capture)

Best for: dynamic content that changes during session.

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

## Method 3: CanvasTexture from React (live updates)

Best for: real-time UI displayed on 3D surface.

```tsx
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
    }, 1000 / 10); // 10fps refresh

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
