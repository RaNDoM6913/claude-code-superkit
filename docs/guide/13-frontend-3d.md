# Chapter 13: Frontend 3D

## Overview

The Frontend 3D package provides production-tested agents, hooks, skills, rules, and commands for developers building scroll-driven 3D product showcases, presentation landings, or any frontend project using GSAP ScrollTrigger, React Three Fiber (R3F), and Three.js.

It was extracted from 12+ hours of battle-tested experience building real 3D product landings, where common pitfalls (color distortion on 3D textures, GSAP timeline compression, UV mapping mismatches) cost hours each time. Every component in this package catches or prevents a specific problem that has been encountered in production.

**Who it's for:**

- Frontend developers adding 3D product showcases to landing pages
- Teams building scroll-driven presentations with GSAP + Three.js
- Anyone using React Three Fiber who wants automated quality checks
- Developers who want to avoid AI-generated "slop" in their UI

## Installation

### Via superkit installer (recommended)

```bash
bash setup.sh
# Select "Frontend 3D" when prompted for stacks
```

The installer copies all agents, hooks, skills, rules, and commands into your `.claude/` directory and wires hooks into `settings.json`.

### Manual

```bash
PROJECT=.claude
SUPERKIT=~/claude-code-superkit/packages

# Frontend 3D components
cp $SUPERKIT/frontend-3d/agents/*.md      $PROJECT/agents/
cp $SUPERKIT/frontend-3d/hooks/*.sh       $PROJECT/scripts/hooks/
cp -r $SUPERKIT/frontend-3d/skills/*      $PROJECT/skills/
cp $SUPERKIT/frontend-3d/rules/*.md       $PROJECT/rules/
cp $SUPERKIT/frontend-3d/commands/*.md    $PROJECT/commands/

# Make hooks executable
chmod +x $PROJECT/scripts/hooks/*.sh
```

After manual install, add the four hooks to the `PostToolUse` array in `settings.json` (see Chapter 5 for the format).

## Agents

The package includes 4 review agents. All use `model: opus`.

### presentation-reviewer

**When to activate:** Editing scroll-driven presentation sections built on GSAP ScrollTrigger (with or without a device-frame mockup or 3D textures).

Read-only review in 7 areas, source evidence only (it cannot scroll or play a timeline; GSAP defaults are read from the installed package):

- **Timeline extent** -- computed total length vs the 0-1 phase plan, `tl.set` padding, overlapping tweens
- **Scrub and snap** -- `scrub` value, snap points vs phase rests
- **Refresh and pinning** -- `invalidateOnRefresh`, late layout changes, scroll distance, pin spacing
- **Lifecycle and duplicates** -- `gsap.context()` / `useGSAP` teardown, stacked or globally killed triggers
- **Breakpoints and reduced motion** -- `gsap.matchMedia()`, a gate that actually stops GSAP
- **SSR and mobile** -- unguarded browser globals on server-rendered routes
- **Device frame and layers** -- consistent dimensions, hidden-but-focusable layers, layer/texture switch timing

Materials, color space and tone mapping are routed to `r3f-scene-reviewer`, overlay UI to `ui-design-reviewer`, performance to `frontend-perf-reviewer`.

### r3f-scene-reviewer

**When to activate:** Editing files that import `@react-three/fiber`, `@react-three/drei`, or `three`.

Read-only review, 15 checks across 4 categories, source evidence only (it cannot render WebGL; Three.js, R3F and drei behavior is read from the installed packages):

- **Color Management (4)** -- texture color space, screen material, `toneMapped`, renderer output (tone mapping and output color space)
- **Performance (4)** -- `useFrame` hot path, store reads, DPR and frameloop, disposal
- **GLB / GLTF (4)** -- loading and decoders, texture replacement (`flipY`, UV settings), glass and transparency, node structure
- **R3F Patterns (3)** -- Suspense and error boundaries, Environment presets, lighting

Overlay UI, reduced-motion gates and loading UI are routed to `ui-design-reviewer`, ScrollTrigger to `presentation-reviewer`, bundle, measured FPS and memory to `frontend-perf-reviewer`.

### ui-design-reviewer

**When to activate:** Reviewing the UI layer of a page that composes UI with a 3D scene (DOM overlay or HUD over a canvas, text in 3D, scroll-driven 3D sections). Pure 2D UI goes to `ui-reviewer` (core, or the frontend-ui umbrella when installed).

Read-only review in 7 areas, source evidence only (it cannot render WebGL; screenshots count only when you supply them). There is no score:

- **Composition and viewport** -- which layer gets the pointer over the canvas, canvas host height, `100vh`/`h-screen` vs `dvh`, safe-area insets
- **Legibility and contrast** -- computed only for static, resolvable pairs; text over the moving canvas goes to Open Questions
- **Input parity** -- keyboard and assistive-technology path for actions on 3D objects, hover-only information, wheel/touch capture
- **Accessible alternatives** -- an equivalent for informative canvas content
- **Reduced motion** -- a gate wired to the scene's loops (`useFrame`, GSAP, `autoRotate`, `<Float>`), not just a CSS block
- **Loading, failure, fallback** -- blank Suspense fallbacks, essential content inside the scene's Suspense subtree, no-WebGL path
- **Aesthetics rule** -- lines of `frontend-aesthetics-3d.md` (installed), SUGGESTION at most

Scene internals, ScrollTrigger mechanics and performance are routed to `r3f-scene-reviewer`, `presentation-reviewer` and `frontend-perf-reviewer`.

### frontend-perf-reviewer

**When to activate:** Reviewing frontend code for performance.

Read-only review, 12 checks across 4 categories, source evidence only (it does not build, run or measure; sizes and timings appear only from a report you supply; package and bundler behavior is read from the installed packages):

- **Bundle Size (3)** -- code splitting, tree shaking, heavy imports
- **Images & Media (3)** -- lazy loading, placeholders, format
- **CSS & Rendering (3)** -- CSS containment, `will-change` and animated properties, layout thrashing
- **Runtime -- Core Web Vitals risks (3)** -- LCP, CLS, INP and main-thread work

`useFrame` work, disposal, DPR, frameloop, GLB and textures are routed to `r3f-scene-reviewer`, ScrollTrigger to `presentation-reviewer`, fallback UI and reduced motion to `ui-design-reviewer`, measured bundle size to `health-checker`.

## Hooks

All 4 hooks run on `PostToolUse` (after Edit/Write). They produce warnings but never block -- exit 0 always. Skipped on `CLAUDE_HOOK_PROFILE=fast`.

### gsap-pattern-check

**Triggers on:** `.tsx` files.

Catches 5 GSAP anti-patterns:

| # | Check | What it catches |
|---|-------|----------------|
| 1 | `scrub: true` | Should be a number (`scrub: 1`) for smooth animation |
| 2 | Missing `invalidateOnRefresh` | Layout breaks on window resize |
| 3 | Missing `tl.set({}, {}, 1.0)` | Animations compress into first 10% of scroll |
| 4 | Direct `import from "gsap"` | Should use centralized GSAP setup file |
| 5 | Animations outside `gsap.context()` | Memory leaks on React unmount |

### r3f-color-check

**Triggers on:** `.tsx`, `.jsx`, `.ts` files that import from `@react-three/` or `three`.

Catches 4 color management issues:

| # | Check | What it catches |
|---|-------|----------------|
| 1 | Deprecated encoding | `sRGBEncoding`/`LinearEncoding` deprecated since r152 |
| 2 | Missing colorSpace | Texture loaded without explicit `colorSpace` assignment |
| 3 | Wrong material for screens | `MeshStandardMaterial` on screen/display meshes |
| 4 | Missing toneMapped | Material with texture but no `toneMapped` prop |

### tailwind-version-guard

**Triggers on:** `.tsx`, `.jsx`, `.css`, `.scss` files.

Detects Tailwind version from the nearest `package.json` and warns when v3 syntax is used in a v4 project (or vice versa):

- **v4 project with v3 syntax:** `require('tailwindcss')` plugin, `@tailwind` directives, `tailwind.config` references
- **v3 project with v4 syntax:** `@import "tailwindcss"`, `@theme {}` directive

### bundle-size-warn

**Triggers on:** `.tsx`, `.jsx`, `.ts` files (checks the content being written/edited).

Warns on heavy package imports:

| Package | Size | Suggested Alternative |
|---------|------|-----------------------|
| moment | 67kb gzipped | date-fns, dayjs |
| lodash (full) | 71kb gzipped | lodash-es with named imports |
| `import * as THREE` | 600kb+ | Named imports from 'three' |
| chart.js | 200kb+ | Tree-shaking imports |
| @mui/material | 300kb+ | Deep imports |
| antd | 350kb+ | babel-plugin-import |
| framer-motion | 140kb | motion/react, CSS animations |
| `import * as` (any) | varies | Named imports |

## Skills

Skills provide reference knowledge that Claude can consult during development. They activate on demand or when Claude detects a relevant context.

### threejs-color-management

The complete Three.js color pipeline: texture colorSpace (sRGB vs Linear), material `toneMapped`, renderer `toneMapping` (None/ACES/Reinhard), and output colorSpace. Includes common issue diagnosis (colors too bright, washed out, too dark) and the "MacBook Landing Pattern" for UI textures on 3D models. Has a 5-step debug checklist.

**Activate when:** Colors look wrong in 3D scenes -- too bright, washed out, or distorted.

### r3f-scroll-driven-3d

The architecture pattern for connecting GSAP ScrollTrigger to React Three Fiber via Zustand store. Explains why React state/context causes 60 re-renders/sec and how `getState()` avoids this. Includes full implementation with store creation, GSAP writing to store, and R3F reading in useFrame.

**Activate when:** Building scroll-driven 3D product showcases.

### gltf-debugging

Runtime GLB/GLTF inspection techniques: traversing meshes, inspecting UV coordinates, dumping material properties, safely replacing textures with UV setting preservation. Covers common issues: stretched textures, wrong mesh, flipped textures, black textures, texture atlas handling, glass mesh occlusion.

**Activate when:** Textures don't map correctly to 3D models.

### html-to-3d-texture

Three capture methods for rendering HTML/React components as PNG textures for 3D models:

1. **Playwright** -- production-quality pixel-perfect screenshots
2. **html2canvas** -- runtime capture for dynamic content
3. **CanvasTexture** -- live updates at configurable refresh rate

Includes resolution guide for iPhone/iPad/MacBook screens and rounded corner application via sharp.

**Activate when:** You need to display web UI on a 3D surface.

### product-3d-lighting

Studio lighting setups for product showcases: dark background (dramatic key/fill/accent), light background (even, minimal shadows), and advanced Lightformer studio patterns. Covers common mistakes (too much ambient, harsh shadows, no idle animation) and Environment preset selection.

**Activate when:** Setting up lighting for product 3D scenes.

### output-enforcement

Anti-laziness enforcement. Bans placeholder patterns (`// ...`, `// TODO`, `// rest of code`), enforces complete code generation from first line to last, and handles token-limit splits with explicit progress markers. Includes a pre-response quick check protocol.

**Activate when:** Every code generation task (prevents incomplete output).

## Rules

Rules are always-apply or path-scoped Markdown files that Claude follows automatically when editing matching files.

### gsap-conventions

**Path scope:** `**/presentation/**`, `**/src/**/*.tsx`, `**/src/**/*.jsx`

Key enforcement points:

- Timeline extension (`tl.set({}, {}, 1.0)`) after every `gsap.timeline()`
- `scrub` must be a number, never boolean
- `invalidateOnRefresh: true` on every ScrollTrigger
- All animations inside `gsap.context()` with `ctx.revert()` cleanup
- Centralized GSAP import (not direct `import from 'gsap'`)
- Phase object (`P.xxx`) for timeline positions, never magic numbers
- Standard ease functions: `power3.out` for entrances, `power2.inOut` for crossfades

### threejs-conventions

**Path scope:** `**/components/3d/**`, `**/three/**`, `**/scene/**`, `**/r3f/**`

Key enforcement points:

- `meshBasicMaterial` for UI screen textures (screens emit light)
- `toneMapped={false}` on screen materials
- `texture.colorSpace = THREE.SRGBColorSpace` for photo/UI textures
- Copy ALL UV settings when replacing texture maps (flipY, wrapS/T, offset, repeat, rotation, center)
- `useGLTF.preload()` at module level
- No allocations inside `useFrame` -- pre-allocate in refs
- `useStore.getState()` in useFrame, not hook subscription
- `dpr={[1, 2]}` as standard
- `dispose={null}` for reusable models

### frontend-aesthetics-3d

**Path scope:** `**/presentation/**/*.tsx`, `**/landing/**/*.tsx` (and `.jsx` equivalents)

Key enforcement points:

- Anti-center bias -- use split screen, asymmetric layouts
- Cards only when elevation communicates hierarchy
- `min-h-[100dvh]` not `h-screen` (iOS Safari address bar)
- Grid over flex percentage math
- Staggered reveals for list/grid items (0.05-0.1s delay)
- Spring physics for interactions, never linear
- 3D scene atmosphere: low ambient for dark backgrounds, `<Float>` for idle animation, `ContactShadows` for grounding
- Phase-based scroll-driven 3D (entry, showcase, transition, exit)

## Command

### /capture-screen

Captures a React component as a high-resolution PNG texture for use on 3D model screens.

**Usage:** `/capture-screen [port]` (default: 3000)

**What it does:**

1. Checks the dev server is running on the specified port
2. Finds the capture target (element with `data-screen-id`)
3. Screenshots via Playwright at 2x device scale (880x1912 default for iPhone 16 Pro Max)
4. Optionally applies rounded corners with transparent alpha via sharp
5. Saves to `public/textures/`

**Prerequisites:**

- Dev server running (Vite, Next.js, etc.)
- `playwright` installed (`npx playwright install chromium`)
- `sharp` installed for rounded corners

## Recommended External Tools

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

## Common Workflows

### Building a scroll-driven product landing

You're creating a landing page where a 3D phone model rotates and changes screen content as the user scrolls.

**What activates:**

- **Rules:** gsap-conventions (enforces `tl.set`, `scrub` numbers, context cleanup), threejs-conventions (enforces meshBasicMaterial, colorSpace, UV settings), frontend-aesthetics-3d (anti-center bias, spring physics, staggered reveals)
- **Skills:** r3f-scroll-driven-3d (GSAP-Zustand-R3F bridge pattern), product-3d-lighting (studio lighting setup), html-to-3d-texture (capture pipeline for screen textures)
- **Hooks:** gsap-pattern-check (catches anti-patterns on every edit), r3f-color-check (ensures correct color management), bundle-size-warn (warns on heavy imports)
- **Agents:** presentation-reviewer (seven-area scroll-mechanics review), r3f-scene-reviewer (15-check 3D review)

### Debugging 3D color issues

Your UI texture on a 3D phone model looks washed out, too bright, or distorted.

**What to use:**

1. **Skill:** threejs-color-management -- follow the 5-step debug checklist: check texture colorSpace, check toneMapped, check Canvas toneMapping, check material type, check for deprecated sRGBEncoding
2. **Hook:** r3f-color-check -- catches the 4 most common color mistakes automatically on every edit
3. **Agent:** r3f-scene-reviewer -- run for a comprehensive 15-check review including all color management checks

Typical resolution: set `colorSpace = THREE.SRGBColorSpace` on the texture, switch to `meshBasicMaterial`, add `toneMapped={false}`. Time saved: ~3 hours.

### Adding a phone model with screen texture

You have a GLB phone model and want to display a captured React component on its screen.

**What to use:**

1. **Skill:** gltf-debugging -- traverse the model to find the screen mesh name, inspect UV coordinates, dump material properties
2. **Skill:** html-to-3d-texture -- choose capture method (Playwright for production, html2canvas for dynamic), set correct resolution (@2x)
3. **Command:** `/capture-screen 3000` -- automates the Playwright capture pipeline
4. **Rule:** threejs-conventions -- enforces correct material (meshBasicMaterial), UV copying, colorSpace setting
5. **Hook:** r3f-color-check -- catches missing toneMapped or wrong colorSpace on every edit

The workflow: capture HTML as PNG, load as Three.js texture, find screen mesh in GLB, replace material with meshBasicMaterial + captured texture, copy UV settings from original.
