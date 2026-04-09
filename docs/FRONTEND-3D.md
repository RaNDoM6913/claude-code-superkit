# Frontend 3D -- Complete Reference

Complete catalog of all components in the Frontend 3D package. For a getting-started guide, see [Chapter 13: Frontend 3D](guide/13-frontend-3d.md).

## Summary

| Component | Count |
|-----------|-------|
| Agents | 4 |
| Hooks | 4 |
| Skills | 6 |
| Rules | 3 |
| Commands | 1 |
| **Total** | **18** |

---

## Agents

All agents use `model: opus`. Output follows the standard format: `[SEVERITY/CONFIDENCE] file:line -- description`.

### presentation-reviewer

**Description:** Review scroll-driven presentation sections using GSAP ScrollTrigger, phone frame components, and 3D textures.

**Allowed tools:** Read, Grep, Glob, Agent

**Activate when:** Editing scroll-driven presentation sections.

**Checklist (16 checks):**

| # | Check | Severity | Category |
|---|-------|----------|----------|
| 1 | `gsap.context()` cleanup | CRITICAL | GSAP ScrollTrigger |
| 2 | Timeline extension `tl.set({}, {}, 1.0)` | CRITICAL | GSAP ScrollTrigger |
| 3 | `invalidateOnRefresh: true` | WARNING | GSAP ScrollTrigger |
| 4 | `scrub` is a number (not boolean) | WARNING | GSAP ScrollTrigger |
| 5 | Phase object (P.xxx) for positions | WARNING | GSAP ScrollTrigger |
| 6 | Screen dimensions SCREEN_W=440, SCREEN_H=956 | CRITICAL | Phone Frame |
| 7 | Content scale formula | WARNING | Phone Frame |
| 8 | `useViewportScale()` hook | INFO | Phone Frame |
| 9 | Phase boundaries reach 1.0 | CRITICAL | Combined Section |
| 10 | No phase overlap | WARNING | Combined Section |
| 11 | Screen layers use opacity switching | INFO | Combined Section |
| 12 | `meshBasicMaterial` for screen textures | CRITICAL | 3D / Texture |
| 13 | `colorSpace = THREE.SRGBColorSpace` | CRITICAL | 3D / Texture |
| 14 | `toneMapped: false` on screen materials | WARNING | 3D / Texture |
| 15 | Dual ScrollTrigger entrance pattern | INFO | General |
| 16 | No `justify-center` on tall content | WARNING | General |

---

### r3f-scene-reviewer

**Description:** Review React Three Fiber and Three.js code -- color management, tone mapping, texture pipeline, GLB handling, useFrame performance, disposal patterns.

**Allowed tools:** Read, Grep, Glob, Agent

**Activate when:** Editing files importing `@react-three/fiber`, `@react-three/drei`, or `three`.

**Checklist (15 checks):**

| # | Check | Severity | Category |
|---|-------|----------|----------|
| 1 | UI texture `colorSpace = SRGBColorSpace` | CRITICAL | Color Management |
| 2 | Screen mesh uses `meshBasicMaterial` | CRITICAL | Color Management |
| 3 | `toneMapped={false}` on UI materials | CRITICAL | Color Management |
| 4 | Canvas `toneMapping` setting | WARNING | Color Management |
| 5 | No allocations in `useFrame` | WARNING | Performance |
| 6 | Zustand `getState()` in `useFrame` | WARNING | Performance |
| 7 | `dpr={[1, 2]}` standard | INFO | Performance |
| 8 | `dispose={null}` on reusable groups | INFO | Performance |
| 9 | `useGLTF.preload()` at module level | WARNING | GLB / GLTF |
| 10 | UV preservation on texture replacement | CRITICAL | GLB / GLTF |
| 11 | Glass mesh `visible={false}` for screens | WARNING | GLB / GLTF |
| 12 | GLTF type casting | INFO | GLB / GLTF |
| 13 | `<Suspense>` wraps lazy 3D components | WARNING | R3F Patterns |
| 14 | `<Environment>` intensity 0.15-0.25 for dark | INFO | R3F Patterns |
| 15 | Product lighting setup | INFO | R3F Patterns |

---

### ui-design-reviewer

**Description:** Anti-slop UI review -- typography, color calibration, layout diversity, motion quality, interactive states.

**Allowed tools:** Read, Grep, Glob, Agent

**Activate when:** Reviewing frontend components for design quality.

**Checklist (16 checks):**

| # | Check | Severity | Category |
|---|-------|----------|----------|
| 1 | Distinctive font choice (no Inter/Roboto) | WARNING | Typography |
| 2 | Headline `tracking-tighter`/`tracking-tight` | WARNING | Typography |
| 3 | Body text `max-w-[65ch]` | INFO | Typography |
| 4 | Max 1 accent color | WARNING | Color |
| 5 | Accent saturation < 80% | WARNING | Color |
| 6 | No purple-to-blue gradient default | CRITICAL | Color |
| 7 | Anti-center bias | WARNING | Layout |
| 8 | CSS Grid over flex math | INFO | Layout |
| 9 | `min-h-[100dvh]` not `h-screen` | CRITICAL | Layout |
| 10 | Spring/ease-out for interactions | WARNING | Motion |
| 11 | Staggered reveals on lists/grids | INFO | Motion |
| 12 | No instant state transitions | WARNING | Motion |
| 13 | Loading/empty/error states | CRITICAL | Interactive States |
| 14 | `:active` feedback on buttons | WARNING | Interactive States |
| 15 | Glass border + inner shadow | INFO | Glassmorphism |
| 16 | Tinted shadows (not pure black) | INFO | Glassmorphism |

---

### frontend-perf-reviewer

**Description:** Frontend performance review -- bundle size, lazy loading, CSS containment, web vitals, image optimization.

**Allowed tools:** Read, Grep, Glob, Bash, Agent

**Activate when:** Reviewing frontend code for performance.

**Checklist (12 checks):**

| # | Check | Severity | Category |
|---|-------|----------|----------|
| 1 | Routes use dynamic `import()` | CRITICAL | Bundle Size |
| 2 | Named imports for tree shaking | WARNING | Bundle Size |
| 3 | Heavy libraries code-split | WARNING | Bundle Size |
| 4 | Below-fold images lazy loaded | WARNING | Images & Media |
| 5 | Blur/skeleton placeholders | INFO | Images & Media |
| 6 | WebP/AVIF format | INFO | Images & Media |
| 7 | CSS `contain` on complex components | INFO | CSS & Rendering |
| 8 | `will-change` only on animated elements | WARNING | CSS & Rendering |
| 9 | No read-then-write DOM loop | CRITICAL | CSS & Rendering |
| 10 | LCP element loads fast | CRITICAL | Runtime Performance |
| 11 | Images/embeds have width/height | WARNING | Runtime Performance |
| 12 | Event handlers < 200ms | WARNING | Runtime Performance |

---

## Hooks

All hooks run as `PostToolUse` handlers on Edit/Write operations. They emit warnings only and never block execution (exit 0 always). All skip on `CLAUDE_HOOK_PROFILE=fast`.

### gsap-pattern-check

**File:** `hooks/gsap-pattern-check.sh`

**Trigger:** PostToolUse (Edit, Write) on `.tsx` files

**Profile:** standard, strict

| # | Pattern | What it detects |
|---|---------|----------------|
| 1 | `scrub: true` | Boolean scrub instead of number (`scrub: 1`) -- causes jerky scrolling |
| 2 | ScrollTrigger without `invalidateOnRefresh` | Missing `invalidateOnRefresh: true` -- layout breaks on resize |
| 3 | Timeline without `tl.set({}, {}, 1.0)` | Missing timeline extension -- animations compress into first 10% |
| 4 | `from "gsap"` | Direct GSAP import instead of centralized setup file |
| 5 | GSAP animations without `gsap.context()` | Missing context wrapper -- memory leaks on unmount |

---

### r3f-color-check

**File:** `hooks/r3f-color-check.sh`

**Trigger:** PostToolUse (Edit, Write) on `.tsx`, `.jsx`, `.ts` files importing `@react-three/` or `three`

**Profile:** standard, strict

| # | Pattern | What it detects |
|---|---------|----------------|
| 1 | `sRGBEncoding` / `LinearEncoding` | Deprecated encoding constants (since Three.js r152) -- use `colorSpace` |
| 2 | `useTexture` / `TextureLoader` without `.colorSpace` | Texture loaded without explicit colorSpace -- incorrect gamma |
| 3 | `MeshStandardMaterial` + screen/display keywords | Wrong material on screen meshes -- should use `meshBasicMaterial` |
| 4 | Material with `map` but no `toneMapped` | Missing `toneMapped` prop -- ACES tone mapping distorts UI colors |

---

### tailwind-version-guard

**File:** `hooks/tailwind-version-guard.sh`

**Trigger:** PostToolUse (Edit, Write) on `.tsx`, `.jsx`, `.css`, `.scss` files

**Profile:** standard, strict

Detects Tailwind major version from nearest `package.json`, then warns on syntax mismatch:

**v4 project with v3 syntax:**

| Pattern | Issue |
|---------|-------|
| `require('tailwindcss')` | v3 PostCSS plugin syntax -- v4 uses `@tailwindcss/postcss` |
| `@tailwind base/components/utilities` | v3 directives -- v4 uses `@import "tailwindcss"` |
| `tailwind.config` reference | v3 config -- v4 uses `@theme` in CSS |

**v3 project with v4 syntax:**

| Pattern | Issue |
|---------|-------|
| `@import "tailwindcss"` | v4 import syntax -- v3 uses `@tailwind` directives |
| `@theme {}` | v4 directive -- v3 uses `tailwind.config.js` |

---

### bundle-size-warn

**File:** `hooks/bundle-size-warn.sh`

**Trigger:** PostToolUse (Edit, Write) on `.tsx`, `.jsx`, `.ts` files (checks written/edited content)

**Profile:** standard, strict

| # | Package | Size | Alternative |
|---|---------|------|-------------|
| 1 | moment | 67kb gzipped | date-fns, dayjs |
| 2 | lodash (full import) | 71kb gzipped | lodash-es with named imports |
| 3 | `import * as THREE` | 600kb+ | Named imports from 'three' |
| 4 | chart.js (barrel import) | 200kb+ | Tree-shaking: `import { Chart, LineController }` |
| 5 | @mui/material (barrel) | 300kb+ | Deep imports: `import Button from '@mui/material/Button'` |
| 6 | antd (barrel) | 350kb+ | babel-plugin-import or named imports |
| 7 | framer-motion | 140kb | motion/react or CSS animations |
| 8 | `import * as` (any) | varies | Named imports for tree shaking |

---

## Skills

### threejs-color-management

**Description:** Three.js color pipeline -- sRGB vs Linear, toneMapping, texture colorSpace, debug checklist.

**Key topics:**

- The 4-stage color pipeline: Texture colorSpace, Material toneMapped, Renderer toneMapping, Output colorSpace
- `THREE.SRGBColorSpace` for photos/UI vs `THREE.LinearSRGBColorSpace` for data textures
- `toneMapped={false}` for UI content on 3D surfaces
- `toneMapping: 0` (NoToneMapping) for UI-heavy scenes vs ACESFilmic for realistic scenes
- The "MacBook Landing Pattern" for UI textures on 3D models
- Common issue diagnosis: colors too bright, washed out, too dark, distorted
- 5-step debug checklist

---

### r3f-scroll-driven-3d

**Description:** GSAP ScrollTrigger to React Three Fiber bridge pattern via Zustand store.

**Key topics:**

- Architecture: `[GSAP ScrollTrigger] -> [Zustand Store] -> [R3F useFrame]`
- Why Zustand over React state/context (60 re-renders/sec problem)
- `useStore.getState()` for zero-rerender reads in useFrame
- Complete Zustand store setup for scroll progress and texture state
- GSAP timeline writing progress to store with `onUpdate`
- R3F reading store in useFrame for rotation, scale, phase-based animation
- Dynamic texture swapping via `tl.call()` at scroll positions
- Performance tips: pre-allocate, getState, DPR, dispose

---

### gltf-debugging

**Description:** Runtime GLB/GLTF inspection -- traverse nodes, inspect UVs, dump materials, fix textures.

**Key topics:**

- `scene.traverse()` to discover all meshes and their properties
- UV coordinate inspection: range check (0-1 = good), atlas detection
- Material property dumping: type, maps, roughness, metalness, color, toneMapped
- Safe texture replacement with UV setting preservation (flipY, wrapS/T, offset, repeat, rotation, center)
- Common issues: stretched/squished textures, wrong mesh, flipped textures, black textures, Sketchfab atlas models, glass mesh occlusion

---

### html-to-3d-texture

**Description:** Capture HTML/React components as PNG textures for 3D models.

**Key topics:**

- Method 1: Playwright capture (pixel-perfect, production quality)
- Method 2: html2canvas (runtime capture, dynamic content)
- Method 3: CanvasTexture with live updates (configurable refresh rate)
- Resolution guide: iPhone 15 Pro (786x1704), iPhone 16 Pro Max (880x1912), iPad Pro (1668x2388), MacBook Pro (3024x1964)
- Rounded corner application via sharp SVG mask
- Tips: 2x scale for retina, `data-screen-id` attribute, transparent backgrounds

---

### product-3d-lighting

**Description:** Studio lighting setups for 3D product showcases.

**Key topics:**

- Dark background setup: ambient (0.25) + key directional (0.6) + fill directional (0.25) + accent point light + Environment (0.15)
- Light background setup: ambient (0.8) + dual directional + Environment (0.4)
- Advanced Lightformer studio: key softbox, warm fill ring, rim edge light
- Common mistakes: too much ambient, high environment intensity, no fill light, dark shadows, no idle animation, strong colored light
- Environment presets: city (general), studio (minimal), apartment (warm), sunset (luxury), dawn (tech), night (gaming)
- ContactShadows for grounding, Float for idle animation

---

### output-enforcement

**Description:** Anti-laziness -- bans placeholders, enforces complete code generation, handles token-limit splits.

**Key topics:**

- Banned patterns: `// ...`, `// rest of code`, `// TODO`, `// implement here`, `/* ... */`, `# ... rest`
- Execution protocol: scope (count files), build (write completely), cross-check (verify imports/types)
- Pre-response quick check: search for banned patterns, verify import/export pairs, verify type definitions
- Token limit handling: finish current function, add pause marker with progress, continue in next response
- Core rule: incomplete code is worse than no code

---

## Rules

### gsap-conventions

**File:** `rules/gsap-conventions.md`

**Path scope:** `**/presentation/**`, `**/src/**/*.tsx`, `**/src/**/*.jsx`

**alwaysApply:** false

**Enforcement points:**

| Rule | Why |
|------|-----|
| `tl.set({}, {}, 1.0)` after every `gsap.timeline()` | Without it, animations compress into first 10% of scroll |
| `scrub` must be a number | `scrub: true` causes jerky scrolling |
| `invalidateOnRefresh: true` on every ScrollTrigger | Missing = layout breaks on resize |
| All animations inside `gsap.context()` + `ctx.revert()` | Prevents memory leaks on React unmount |
| Import from centralized GSAP setup, not `from 'gsap'` | Ensures plugins are registered once |
| Phase object (P.xxx) for timeline positions | No magic numbers |
| Standard eases: `power3.out` (entrance), `power2.inOut` (crossfade), `sine.in/out` (subtle), `power2.in` (exit) | Consistent motion feel |

---

### threejs-conventions

**File:** `rules/threejs-conventions.md`

**Path scope:** `**/components/3d/**`, `**/three/**`, `**/scene/**`, `**/r3f/**`

**alwaysApply:** false

**Enforcement points:**

| Rule | Why |
|------|-----|
| `meshBasicMaterial` for UI screen textures | Screens emit light, they don't reflect it |
| `toneMapped={false}` on screen materials | ACES tone mapping distorts UI colors |
| `texture.colorSpace = THREE.SRGBColorSpace` for photo/UI | Correct gamma interpretation |
| Copy ALL UV settings on texture replacement | Missing flipY/wrapS/offset causes misalignment |
| `useGLTF.preload()` at module level | Prevents visible pop-in on mount |
| No `new Vector3()` inside `useFrame` | 60 allocations/sec at 60fps |
| `useStore.getState()` in `useFrame` | Hook subscription causes re-renders |
| `dpr={[1, 2]}` | Higher values degrade mobile performance |
| `dispose={null}` on reusable groups | Prevents premature Three.js cleanup |

---

### frontend-aesthetics-3d

**File:** `rules/frontend-aesthetics-3d.md`

**Path scope:** `**/presentation/**/*.tsx`, `**/presentation/**/*.jsx`, `**/landing/**/*.tsx`, `**/landing/**/*.jsx`

**alwaysApply:** false

**Enforcement points:**

| Rule | Why |
|------|-----|
| Anti-center bias -- split screen, asymmetric layouts | Center-everything is generic AI pattern |
| Cards only when elevation communicates hierarchy | If everything is a card, nothing has emphasis |
| `min-h-[100dvh]` not `h-screen` | iOS Safari address bar causes viewport jumping |
| CSS Grid over flex percentage math | Grid is more intentional, less fragile |
| Staggered reveals (0.05-0.1s delay) | Batch pop-in looks cheap |
| Spring physics for interactions | Linear motion feels robotic |
| Dark BG: ambient < 0.3, dramatic key light | Preserves drama |
| `<Float>` for idle animation | Static 3D looks dead |
| `ContactShadows` for grounding | Floating objects feel disconnected |
| Phase-based scroll animation (entry, showcase, transition, exit) | No random motion |

---

## Commands

### /capture-screen

**File:** `commands/capture-screen.md`

**Description:** Capture a React component as PNG texture for 3D model screens.

**Usage:** `/capture-screen [port]` (default: 3000)

**Allowed tools:** Bash, Read

**Prerequisites:**

- Dev server running on the specified port
- `playwright` installed (`npx playwright install chromium`)
- `sharp` installed (for rounded corners)

**Steps performed:**

1. Verify dev server is running on the port
2. Find capture target element (by `data-screen-id` attribute)
3. Screenshot via Playwright at 440x956 viewport, 2x device scale
4. Apply rounded corners with transparent alpha via sharp (optional)
5. Save to `public/textures/screen-capture.png`
6. Verify output dimensions

**Resolution guide:**

| Device | Viewport | @2x Output |
|--------|----------|------------|
| iPhone 15 Pro | 393x852 | 786x1704 |
| iPhone 16 Pro Max | 440x956 | 880x1912 |
| iPad Pro 11" | 834x1194 | 1668x2388 |
| MacBook Pro 14" | 1512x982 | 3024x1964 |

---

## External Recommendations

### Skills Marketplace

Install via `npx skills add`:

| Source | Skills | Count |
|--------|--------|-------|
| greensock/gsap-skills | gsap-core, timeline, scrolltrigger, plugins, utils, react, performance, frameworks | 8 |
| freshtechbro/claudedesignskills | threejs-webgl, react-three-fiber, modern-web-design + 19 others | 22 |
| Leonxlnx/taste-skill | design-taste-frontend, output-enforcement, soft, minimalist, brutalist, redesign, stitch | 7 |

### MCP Servers

| Server | Package | Purpose |
|--------|---------|---------|
| gsap-master | bruzethegreat-gsap-master-mcp-server@2.2.0 | Full GSAP API, intent analysis, production patterns |

---

## Troubleshooting

| Problem | Time Lost Before | Solution | Time After |
|---------|-----------------|----------|------------|
| 3D texture color distortion (washed out, too bright) | ~3h | threejs-color-management skill (5-step debug checklist) + r3f-color-check hook (catches on every edit) | <15min |
| GSAP timeline compression (animations in first 10% of scroll) | ~2h | gsap-pattern-check hook catches missing `tl.set({}, {}, 1.0)` immediately | 0 |
| UV mapping mismatch (stretched/flipped texture on model) | ~2h | gltf-debugging skill (traverse, inspect UVs, safe replacement) | <30min |
| Tailwind v3/v4 syntax mix (styles don't apply) | ~1h | tailwind-version-guard hook detects version mismatch on edit | 0 |
| AI-generated generic UI ("slop" patterns) | ongoing | ui-design-reviewer agent (16 checks) + frontend-aesthetics-3d rule | caught in review |
| Heavy imports bloating bundle | varies | bundle-size-warn hook warns on moment/lodash/THREE/MUI/antd | caught on edit |
| GSAP animations leak on unmount | ~1h debug | gsap-pattern-check hook warns on missing `gsap.context()` | 0 |
| 3D scene looks flat/lifeless | ~1h tweaking | product-3d-lighting skill (studio presets, common mistakes) | <15min |
| Screen texture on wrong mesh / glass occlusion | ~2h | gltf-debugging skill (traverse + glass visibility fix) | <30min |
| Need HTML rendered on 3D surface | ~3h first time | html-to-3d-texture skill (3 methods) + /capture-screen command | <30min |
