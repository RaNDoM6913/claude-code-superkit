---
description: Capture a React component as PNG texture for 3D model screens
argument-hint: "[port] (default: 3000)"
allowed-tools: Bash, Read
---

# Capture Screen PNG

Capture a React component as a high-resolution PNG image for use as a texture on a 3D model.

## What it does

1. Opens a capture page via Playwright (headless Chromium)
2. Screenshots the target element (found by `data-screen-id`)
3. Optionally applies rounded corners with transparent alpha
4. Saves to `public/textures/`

## Prerequisites

- Dev server running (Vite, Next.js, etc.)
- `playwright` installed (`npx playwright install chromium`)
- `sharp` installed (for rounded corners)

## Steps

1. **Check dev server** — verify it's running on the specified port:

```bash
curl -s http://localhost:${ARGUMENTS:-3000} 2>/dev/null || echo "Dev server not running on port ${ARGUMENTS:-3000}"
```

2. **Find the capture target** — look for elements with `data-screen-id`:

```bash
# Check if a capture/test page exists
find . -name "capture*.html" -o -name "test-3d*.html" 2>/dev/null | head -5
```

3. **Capture screenshot** using Playwright:

```bash
npx playwright screenshot \
  --viewport-size="440,956" \
  --device-scale-factor=2 \
  "http://localhost:${ARGUMENTS:-3000}/capture" \
  "public/textures/screen-capture.png"
```

4. **Apply rounded corners** (optional, for phone screens):

```bash
node -e "
const sharp = require('sharp');
const fs = require('fs');
const FILE = 'public/textures/screen-capture.png';
const R = 124; // 62pt * 2x
async function main() {
  const meta = await sharp(FILE).metadata();
  const w = meta.width, h = meta.height;
  const mask = Buffer.from('<svg width=\"'+w+'\" height=\"'+h+'\"><rect x=\"0\" y=\"0\" width=\"'+w+'\" height=\"'+h+'\" rx=\"'+R+'\" ry=\"'+R+'\" fill=\"white\"/></svg>');
  await sharp(FILE).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toFile(FILE+'.tmp');
  fs.renameSync(FILE+'.tmp', FILE);
  const m2 = await sharp(FILE).metadata();
  console.log('Done:', m2.width, 'x', m2.height, 'alpha:', m2.hasAlpha);
}
main();
"
```

5. **Verify output:**

```bash
# macOS
sips -g pixelWidth -g pixelHeight public/textures/screen-capture.png
# Linux
identify public/textures/screen-capture.png
```

## Resolution Guide

| Device | Viewport | @2x Output |
|--------|----------|------------|
| iPhone 15 Pro | 393x852 | 786x1704 |
| iPhone 16 Pro Max | 440x956 | 880x1912 |
| iPad Pro 11" | 834x1194 | 1668x2388 |
| MacBook Pro 14" | 1512x982 | 3024x1964 |
