---
description: Capture a React component as PNG texture for 3D model screens
argument-hint: "[port] (default: 3000)"
allowed-tools: Bash, Read
---

# Capture Screen PNG

## Role

Capture a running app screen as a high-resolution PNG in `public/textures/` for use as a texture on a 3D model: a full-viewport screenshot of a URL/route, or a single element marked `data-screen-id` (element capture runs through the Step 5 script).

## Hard Rules

1. Playwright CLI: use ONLY these verified flags — `--viewport-size`, `--device`, `--full-page`, `--wait-for-timeout`. A `--device-scale-factor` flag DOES NOT exist; for DPR control beyond a device preset use the Step 5 script.
2. Dev server not responding → STOP and tell the user to start it. Never screenshot a dead server.
3. No capture route found → ASK the user for the route. Never assume `/capture` exists.
4. Defaults: iPhone 16 Pro Max — viewport 440x956, scale 2x (expected output 880x1912), corner radius R=124 (62pt × 2). Another device → use its Resolution Guide row; non-iPhone corner radius → ask the user or skip rounding, never guess.
5. Before reporting done, verify the PNG's real dimensions (Step 7); if they differ from expected, report Status: MISMATCH — do not claim OK.

## Prerequisites

- Dev server running (Vite, Next.js, etc.)
- `playwright` installed (`npx playwright install chromium`)
- `sharp` installed (only for rounded corners, Step 6)

## Resolution Guide

| Device | Viewport | @2x Output |
|--------|----------|------------|
| iPhone 15 Pro | 393x852 | 786x1704 |
| iPhone 16 Pro Max | 440x956 | 880x1912 |
| iPad Pro 11" | 834x1194 | 1668x2388 |
| MacBook Pro 14" | 1512x982 | 3024x1964 |

## Steps

### 1. Resolve inputs

- `<PORT>` = $ARGUMENTS if a port number was given, else `3000`. Substitute this value everywhere `<PORT>` appears below.
- Target device: the default from Hard Rule 4, unless the user named another Resolution Guide device.
- Done when: `<PORT>`, viewport, and expected output size are fixed.

### 2. Check dev server

```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:<PORT>"
```

- Status 200–399 → continue. Anything else, or no output → STOP (Hard Rule 2): "Dev server not responding on port <PORT> — start it and re-run /capture-screen."
- Done when: a 2xx/3xx status was actually observed.

### 3. Find the capture route

```bash
find . -name "capture*.html" -o -name "test-3d*.html" 2>/dev/null | head -5
grep -rln "data-screen-id" src/ app/ pages/ 2>/dev/null | head -5
```

- Capture/test page found → `<ROUTE>` = its route (e.g. `/capture`).
- `data-screen-id` found in a component → note it: capture that element in Step 5.
- Neither found → ASK the user which route renders the screen (Hard Rule 3), then set `<ROUTE>` from the answer.
- Done when: `<ROUTE>` is set and you know whether element capture applies.

### 4. Capture — CLI path

Pick exactly ONE:

- **1x at exact viewport** (quick preview, any device row):

```bash
npx playwright screenshot \
  --viewport-size "440,956" \
  --wait-for-timeout 3000 \
  "http://localhost:<PORT><ROUTE>" \
  public/textures/screen-capture.png
```

- **@2x via device preset — iPad Pro 11" only** (its Playwright descriptor is 2x DPR: 834x1194 → 1668x2388). iPhone presets are 3x DPR with smaller viewports and do NOT produce the table's @2x sizes:

```bash
npx playwright screenshot --device "iPad Pro 11" --wait-for-timeout 3000 \
  "http://localhost:<PORT><ROUTE>" public/textures/screen-capture.png
```

- **Neither fits** (exact @2x at iPhone/MacBook sizes, or element capture) → go to Step 5.

- Done when: PNG written, or Step 5 chosen.

### 5. Capture — script fallback (exact @2x / element by data-screen-id)

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:<PORT><ROUTE>', { waitUntil: 'networkidle' });
  const el = page.locator('[data-screen-id]');
  if (await el.count() > 0) { await el.first().screenshot({ path: 'public/textures/screen-capture.png' }); }
  else { await page.screenshot({ path: 'public/textures/screen-capture.png' }); }
  await browser.close();
})();
"
```

- Replace width/height with the chosen Resolution Guide viewport; narrow the selector to `[data-screen-id="<id>"]` if a specific id is known.
- Done when: PNG written.

### 6. Apply rounded corners (optional, for phone screens)

R=124 is the Hard Rule 4 default; for other devices follow Hard Rule 4.

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

- Done when: script printed `Done: <w> x <h> alpha: true` (skipped entirely if corners not wanted).

### 7. Verify output

```bash
# macOS (built-in)
sips -g pixelWidth -g pixelHeight public/textures/screen-capture.png
# Linux (requires ImageMagick: apt install imagemagick)
identify public/textures/screen-capture.png
# Universal (Node.js)
node -e "const s=require('sharp');s('public/textures/screen-capture.png').metadata().then(m=>console.log(m.width+'x'+m.height,'alpha:',m.hasAlpha))"
```

- Expected dimensions: @2x table value for the Step 5 full-viewport path or the iPad preset; the viewport size for the 1x CLI path. Element capture (`data-screen-id`): expected = the element's rendered box × 2 — the device table does not apply.
- Done when: real dimensions compared against expected, and `alpha: true` confirmed if Step 6 ran.

## Output

```
## Capture Result
- URL: http://localhost:<PORT><ROUTE>
- Method: [CLI 1x | CLI --device "iPad Pro 11" @2x | script @2x full-viewport | script element <data-screen-id>]
- File: public/textures/screen-capture.png
- Dimensions: <W>x<H> (expected: <EW>x<EH>)
- Corners: [applied R=<R>, alpha: yes | skipped]
- Status: [OK | MISMATCH: <what differs>]
```

## Recap

- Only verified CLI flags — `--device-scale-factor` does not exist; DPR beyond a preset means the Step 5 script.
- Server down → STOP; no route found → ASK. Never assume `/capture`.
- Default target: iPhone 16 Pro Max 440x956 @2x → 880x1912, R=124; other devices come from the Resolution Guide.
- Verify real PNG dimensions before reporting; a size mismatch is reported, never hidden.
