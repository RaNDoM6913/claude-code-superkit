# Superkit Frontend & 3D Extension — Design Spec

> **Цель**: Расширить claude-code-superkit пакетом `packages/frontend-3d/` для качественной frontend/3D/animation разработки. Основано на battle-tested опыте создания ONYX presentation landing (GSAP ScrollTrigger + React Three Fiber + Three.js + Tailwind + Vite).

## Контекст

За 12+ часов разработки презентации выявлены повторяющиеся проблемы:
- 3D текстуры: цвета искажались из-за toneMapping/colorSpace (~3ч потерь)
- GSAP: анимации сжимались в 10% scroll из-за забытого `tl.set({}, {}, 1.0)` (~2ч)
- UV mapping: не совпадали текстуры с экраном 3D модели (~2ч)
- Scrub: `true` вместо числа ломал плавность (повторялось 3 раза)

Все проблемы были решены и задокументированы. Этот опыт нужно превратить в переиспользуемые компоненты суперкита.

## Архитектура пакета

```
packages/frontend-3d/
├── agents/
│   ├── presentation-reviewer.md    # 16 checks: GSAP, phone frame, combined sections, 3D
│   ├── r3f-scene-reviewer.md       # 15 checks: color management, perf, GLB, R3F patterns
│   ├── ui-design-reviewer.md       # anti-slop: taste-skill patterns, typography, colors
│   └── frontend-perf-reviewer.md   # bundle size, lazy loading, CSS containment, web vitals
├── hooks/
│   ├── gsap-pattern-check.sh       # 5 GSAP anti-patterns on Edit/Write *.tsx
│   ├── r3f-color-check.sh          # colorSpace, toneMapping, deprecated encoding
│   ├── tailwind-version-guard.sh   # v3 vs v4 syntax mismatch detection
│   └── bundle-size-warn.sh         # warns on large new imports in frontend files
├── skills/
│   ├── threejs-color-management/SKILL.md   # sRGB vs Linear, toneMapping, texture colorSpace
│   ├── r3f-scroll-driven-3d/SKILL.md       # GSAP→Zustand→useFrame bridge pattern
│   ├── gltf-debugging/SKILL.md             # Runtime GLB inspection, UV debugging, material override
│   ├── html-to-3d-texture/SKILL.md         # html2canvas, CanvasTexture, capture pipeline
│   ├── product-3d-lighting/SKILL.md        # Studio lighting for product showcases
│   └── output-enforcement/SKILL.md         # Anti-laziness: no // ..., no TODO, no placeholders
├── rules/
│   ├── gsap-conventions.md         # scrub number, invalidateOnRefresh, context, set({},{},1.0)
│   ├── threejs-conventions.md      # colorSpace, toneMapping, meshBasicMaterial for screens
│   └── frontend-aesthetics.md      # anti-slop typography, color calibration, layout diversity
├── commands/
│   └── capture-screen.md           # Capture React component as PNG texture for 3D models
└── README.md                       # Package overview, installation, what's included
```

## Детальное описание компонентов

### Agents

#### 1. presentation-reviewer (порт из tgapp)
```yaml
name: presentation-reviewer
description: 16-check review for scroll-driven sections — GSAP, phone frames, combined sections, 3D textures
model: opus
```

**Checklist:**
- GSAP (5): context cleanup, tl.set extension, invalidateOnRefresh, scrub number, phase object
- Phone frame (3): 440×956 dimensions, contentScale formula, useViewportScale
- Combined section (3): phase boundaries sum to 1.0, no overlap, opacity switching
- 3D texture (3): meshBasicMaterial, SRGBColorSpace, toneMapped:false
- General (2): dual ScrollTrigger entrance, layout overflow

#### 2. r3f-scene-reviewer (порт из tgapp)
```yaml
name: r3f-scene-reviewer
description: 15-check review for R3F/Three.js — color management, performance, GLB, patterns
model: opus
```

**Checklist:**
- Color (4): UI texture colorSpace, meshBasicMaterial for screens, toneMapped, Canvas toneMapping
- Performance (4): no useFrame allocations, Zustand getState(), dpr, disposal
- GLB (4): preload, UV preservation, glass handling, type casting
- R3F (3): Suspense, Environment intensity, lighting setup

#### 3. ui-design-reviewer (новый, на базе taste-skill)
```yaml
name: ui-design-reviewer
description: Anti-slop UI review — typography, color calibration, layout diversity, motion quality, interactive states
model: opus
```

**Checklist (из taste-skill + наш опыт):**
- Typography (3): no Inter/Roboto for premium, tracking-tighter headlines, max-w-[65ch] body
- Color (3): max 1 accent, saturation <80%, no purple/blue AI gradient default
- Layout (3): anti-center bias, grid over flex-math, min-h-[100dvh] not h-screen
- Motion (3): spring physics not linear, staggered reveals, no instant state changes
- States (2): loading/empty/error states, tactile feedback on :active
- Glassmorphism (2): inner border + inner shadow for refraction, tinted shadows

#### 4. frontend-perf-reviewer (новый)
```yaml
name: frontend-perf-reviewer
description: Frontend performance review — bundle size, lazy loading, CSS containment, web vitals, image optimization
model: opus
```

**Checklist:**
- Bundle (3): code splitting, dynamic imports, tree shaking
- Images (3): lazy loading, thumbhash/blur placeholders, WebP/AVIF
- CSS (3): containment, will-change for animated elements, no layout thrashing
- Runtime (3): web vitals (LCP/CLS/INP), no forced synchronous layout, requestAnimationFrame

### Hooks

#### 1. gsap-pattern-check.sh (порт из tgapp)
```
Event: PostToolUse(Edit/Write) on **/*.tsx
Checks:
  1. scrub: true → warn (should be number)
  2. ScrollTrigger without invalidateOnRefresh → warn
  3. gsap.timeline without tl.set({},{},1.0) → warn
  4. import from "gsap" instead of setup file → warn
  5. gsap.to/from outside gsap.context() → warn
Exit: 0 always (warnings only)
```

#### 2. r3f-color-check.sh (новый)
```
Event: PostToolUse(Edit/Write) on files importing three or @react-three
Checks:
  1. sRGBEncoding used (deprecated since r152) → warn, suggest colorSpace
  2. texture loaded without explicit colorSpace → warn
  3. MeshStandardMaterial used for screen/display mesh → warn
  4. toneMapped not set on UI texture material → warn
Exit: 0 always
```

#### 3. tailwind-version-guard.sh (новый)
```
Event: PostToolUse(Edit/Write) on **/*.tsx, **/*.css
Checks:
  1. v4 @apply syntax in v3 project → warn
  2. tailwindcss plugin in postcss for v4 project → warn (should be @tailwindcss/postcss)
  3. theme() function usage mismatch → warn
Exit: 0 always
```

### Skills

#### 1. threejs-color-management/SKILL.md
```yaml
name: threejs-color-management
description: Three.js color pipeline — sRGB vs Linear, toneMapping (None/ACES/Reinhard), texture colorSpace, when to use NoToneMapping for UI textures. Activate when color issues arise with 3D textures.
```

**Content:**
- sRGB vs Linear workflow explained
- `renderer.outputColorSpace` (default SRGBColorSpace)
- `renderer.toneMapping` (default ACESFilmicToneMapping) — distorts UI colors
- Per-material `toneMapped: false` — exempts from tone mapping
- `texture.colorSpace` — SRGBColorSpace for photos/UI, LinearSRGBColorSpace for data textures
- Common mistake: double sRGB conversion (texture sRGB + renderer sRGB output)
- The MacBook landing pattern: `meshBasicMaterial` + `toneMapped: false` = perfect UI colors
- Debug checklist: colors too bright → tone mapping; colors washed → wrong colorSpace; colors dark → LinearSRGB on sRGB texture

#### 2. r3f-scroll-driven-3d/SKILL.md
```yaml
name: r3f-scroll-driven-3d
description: Connect GSAP ScrollTrigger to React Three Fiber — Zustand bridge, useFrame animation, scroll progress to 3D transforms. The exact pattern for scroll-driven 3D product showcases.
```

**Content:**
- Architecture: GSAP ScrollTrigger → Zustand store → R3F useFrame
- Why Zustand (not state/context): no React re-renders on every scroll tick
- Store pattern: `{ progress: number, texture: string, setTexture: (t) => void }`
- useFrame pattern: `const p = useStore.getState().progress` (direct, no hook)
- Phase-based animation in useFrame (entry, showcase, shift, rest)
- Dynamic texture swapping via store: `tl.call(() => setTexture('/new.png'))`
- Performance: `getState()` vs hook subscription in render loop

#### 3. gltf-debugging/SKILL.md
```yaml
name: gltf-debugging
description: Runtime GLB/GLTF inspection — traverse nodes, identify screen meshes, inspect UV coordinates, material property dumping, fixing exported materials at runtime. Use when textures don't map correctly.
```

**Content:**
- `scene.traverse()` pattern for listing all meshes and materials
- UV inspection: `geometry.attributes.uv` — check if exists, check range (0-1 = good)
- Material property dumping: map, emissiveMap, normalMap, roughness, metalness
- Cloning materials to override without affecting original: `material.clone()`
- UV settings to copy when replacing texture: flipY, wrapS/T, offset, repeat, rotation, center
- Common issues: GLB from Sketchfab with baked textures (UV mapped to atlas), no UV on screen mesh, wrong flipY

#### 4. output-enforcement/SKILL.md (порт из taste-skill)
```yaml
name: full-output-enforcement
description: Anti-laziness — bans placeholder patterns (// ..., // TODO, // rest of code), enforces complete code generation, handles token-limit splits cleanly
```

**Content** (из taste-skill output-skill):
- Banned patterns: `// ...`, `// rest of code`, `// implement here`, `// TODO`, etc.
- Execution: scope → build → cross-check
- Token limit handling: write to clean breakpoint, `[PAUSED — X of Y complete]`
- Quick check before every response

#### 5. product-3d-lighting/SKILL.md
```yaml
name: product-3d-lighting
description: Studio lighting setups for 3D product showcases — HDRI, directional/spot/point lights, Environment from drei, shadow config, dark background optimization
```

**Content:**
- Dark background setup: ambient 0.25, 2x directional (key + fill), point accent
- Environment: `preset="city"`, `environmentIntensity` 0.1-0.2 for dark themes
- ContactShadows for grounding effect
- StudioLights pattern (from MacBook landing): Lightformer + spotLight combo
- Common mistake: too much ambient light washes out dark theme
- Float component for subtle idle animation

### Rules

#### 1. gsap-conventions.md
```yaml
alwaysApply: false
paths: ["**/presentation/**", "**/src/**/*.tsx"]
```

**Content:**
- `scrub` MUST be a number (1 standard, 0.3-0.5 for snappy)
- `invalidateOnRefresh: true` on EVERY ScrollTrigger
- `tl.set({}, {}, 1.0)` after EVERY timeline creation
- Import GSAP from project setup file, not directly
- All animations inside `gsap.context()` with `ctx.revert()` cleanup
- Phase object (P) for timeline positions — no magic numbers
- Ease standards: power3.out (entrances), power2.inOut (crossfades), sine.in/out (subtle)

#### 2. threejs-conventions.md
```yaml
alwaysApply: false
paths: ["**/components/3d/**", "**/three/**"]
```

**Content:**
- UI screen textures: `meshBasicMaterial` + `toneMapped: false` + `SRGBColorSpace`
- Never `MeshStandardMaterial` for display screens — screens emit, not reflect
- Canvas `toneMapping: 0` when UI textures are primary visual
- Copy ALL UV settings when replacing texture map (flipY, offset, repeat, wrapS/T, center, rotation)
- `useGLTF.preload()` at module level
- No allocations in `useFrame` — pre-allocate in refs
- Zustand in useFrame: `getState()` not hook subscription

#### 3. frontend-aesthetics.md (расширение существующего)
Адаптация taste-skill паттернов:
- No Inter/Roboto/Arial for premium designs
- Max 1 accent color, saturation <80%
- Anti-center bias: split screen, asymmetric layouts when DESIGN_VARIANCE > 4
- Cards only when elevation communicates hierarchy
- `min-h-[100dvh]` not `h-screen` (iOS Safari viewport jumping)
- Grid over flex percentage math
- Staggered reveals, spring physics for interactions

### Commands

#### capture-screen.md
```yaml
description: Capture a React component as PNG texture for 3D model screen
```

**Workflow:**
1. Start dev server
2. Open test-3d.html page
3. Find target screen by data-screen-id
4. Capture at 2x resolution (880×1912)
5. Apply rounded corners mask (optional)
6. Save to `public/textures/`
7. 3D model auto-loads new texture via Zustand store

## External Dependencies (установлены отдельно)

### Skills (npx skills add)
| Source | Skills | Count |
|--------|--------|-------|
| greensock/gsap-skills | gsap-core, timeline, scrolltrigger, plugins, utils, react, performance, frameworks | 8 |
| freshtechbro/claudedesignskills | threejs-webgl, react-three-fiber, modern-web-design + 19 others | 22 |
| Leonxlnx/taste-skill | design-taste-frontend, output-enforcement, soft, minimalist, brutalist, redesign, stitch | 7 |

### MCP Servers
| Server | Package | Purpose |
|--------|---------|---------|
| gsap-master | bruzethegreat-gsap-master-mcp-server@2.2.0 | Full GSAP API, intent analysis, production patterns |

## Как внедрить в суперкит

### Шаг 1: Создать пакет
```bash
cd claude-code-superkit
mkdir -p packages/frontend-3d/{agents,hooks,skills,rules,commands}
```

### Шаг 2: Скопировать battle-tested компоненты из tgapp
```bash
# Agents
cp .claude/agents/presentation-reviewer.md packages/frontend-3d/agents/
cp .claude/agents/r3f-scene-reviewer.md packages/frontend-3d/agents/

# Hooks
cp .claude/scripts/hooks/gsap-pattern-check.sh packages/frontend-3d/hooks/

# Rules (адаптировать из presentation-workflow.md)
# Skills (написать новые на основе этой спеки)
```

### Шаг 3: Написать новые компоненты
По спеке выше создать:
- 6 skills (threejs-color-management, r3f-scroll-driven-3d, gltf-debugging, output-enforcement, product-3d-lighting, html-to-3d-texture)
- 2 новых hooks (r3f-color-check.sh, tailwind-version-guard.sh)
- 2 новых agents (ui-design-reviewer, frontend-perf-reviewer)
- 3 rules (gsap-conventions, threejs-conventions, frontend-aesthetics)
- 1 command (capture-screen)

### Шаг 4: Интеграция с existing superkit
- Добавить в `packages/` structure
- Обновить README.md counts
- Добавить в CLAUDE.md
- Обновить `superkit-counts-verify.sh`

### Шаг 5: Тестирование
- Установить в чистый проект через `npx skills add`
- Проверить авто-активацию skills при работе с GSAP/R3F файлами
- Проверить hooks на известных анти-паттернах
- Запустить agents на существующем коде презентации

## Метрики успеха

| Метрика | До | После |
|---------|-----|-------|
| Время на 3D texture issues | ~3ч | <15мин (skill + hook ловят сразу) |
| GSAP anti-pattern iterations | 3-5 попыток | 0 (hook блокирует) |
| Color management debugging | ~2ч | <5мин (skill объясняет, hook предупреждает) |
| UV mapping issues | ~2ч | <30мин (gltf-debugging skill) |
| AI-generated UI quality | generic | premium (taste-skill + aesthetics rule) |

## Timeline

| Фаза | Что | Оценка |
|------|-----|--------|
| 1 | Порт battle-tested компонентов (agents, hooks) | 30 мин |
| 2 | Написать 6 skills | 2-3ч |
| 3 | Написать hooks + rules | 1ч |
| 4 | Интеграция в superkit structure | 30 мин |
| 5 | README, counts, documentation | 30 мин |
| 6 | Тестирование на чистом проекте | 1ч |
