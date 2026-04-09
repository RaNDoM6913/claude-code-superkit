# Frontend 3D Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `packages/frontend-3d/` package to claude-code-superkit with 4 agents, 4 hooks, 6 skills, 3 rules, 1 command for quality frontend/3D/animation development. Release as v1.3.8.

**Architecture:** Self-contained package at `packages/frontend-3d/` with internal `agents/`, `hooks/`, `skills/`, `rules/`, `commands/` subdirectories. Installer updated to treat `frontend-3d` as a selectable stack. 2 agents ported from tgapp (generified), 2 new. 1 hook ported, 3 new. All 6 skills new. Documentation: new guide chapter + reference page.

**Tech Stack:** Node.js CLI, POSIX shell hooks, Markdown agents/skills/rules

**Source for porting:** `/Users/ivankudzin/cursor/tgapp/.claude/`

---

## Updated Counts (v1.3.8)

| Component | Before | After | Delta |
|-----------|--------|-------|-------|
| Stack Agents | 9 | 13 | +4 frontend-3d |
| Total Agents | 39 | 43 | +4 |
| Commands | 15 | 16 | +1 |
| Stack Hooks | 9 | 13 | +4 |
| Stack Rules | 2 | 5 | +3 |
| Frontend-3D Skills | 0 | 6 | +6 (new category) |
| Codex Skills | 50 | 60 | +10 |

---

## File Map

### New files to create:

```
packages/frontend-3d/
  agents/
    presentation-reviewer.md      # Port from tgapp, generify
    r3f-scene-reviewer.md          # Port from tgapp, generify
    ui-design-reviewer.md          # New
    frontend-perf-reviewer.md      # New
  hooks/
    gsap-pattern-check.sh          # Port from tgapp, generify
    r3f-color-check.sh             # New
    tailwind-version-guard.sh      # New
    bundle-size-warn.sh            # New
  skills/
    threejs-color-management/SKILL.md
    r3f-scroll-driven-3d/SKILL.md
    gltf-debugging/SKILL.md
    html-to-3d-texture/SKILL.md
    product-3d-lighting/SKILL.md
    output-enforcement/SKILL.md
  rules/
    gsap-conventions.md
    threejs-conventions.md
    frontend-aesthetics-3d.md
  commands/
    capture-screen.md
  README.md

docs/guide/13-frontend-3d.md       # Guide chapter
docs/FRONTEND-3D.md                # Full reference catalog

packages/codex/skills/              # 10 new SKILL.md files
  presentation-reviewer/SKILL.md
  r3f-scene-reviewer/SKILL.md
  ui-design-reviewer/SKILL.md
  frontend-perf-reviewer/SKILL.md
  threejs-color-management/SKILL.md
  r3f-scroll-driven-3d/SKILL.md
  gltf-debugging/SKILL.md
  html-to-3d-texture/SKILL.md
  product-3d-lighting/SKILL.md
  output-enforcement/SKILL.md
```

### Files to modify:

```
lib/installer.js                    # Add frontend-3d to stack selection + copy logic
lib/settings-builder.js             # Support packages/{stack}/hooks/ path
package.json                        # Version 1.3.7 → 1.3.8
VERSION                             # 1.3.7 → 1.3.8
README.md                           # Counts, What's New, What's Inside, badge
CLAUDE.md                           # Counts table, project structure
CHANGELOG.md                        # Add [1.3.8] section
packages/codex/AGENTS.md            # Add frontend-3d skills
packages/codex/INSTALL.md           # Update counts
docs/INSTALL-CLAUDE-CODE.md         # Update counts
```

---

## Task 1: Create directory structure

**Files:**
- Create: `packages/frontend-3d/agents/` (directory)
- Create: `packages/frontend-3d/hooks/` (directory)
- Create: `packages/frontend-3d/skills/threejs-color-management/` (directory)
- Create: `packages/frontend-3d/skills/r3f-scroll-driven-3d/` (directory)
- Create: `packages/frontend-3d/skills/gltf-debugging/` (directory)
- Create: `packages/frontend-3d/skills/html-to-3d-texture/` (directory)
- Create: `packages/frontend-3d/skills/product-3d-lighting/` (directory)
- Create: `packages/frontend-3d/skills/output-enforcement/` (directory)
- Create: `packages/frontend-3d/rules/` (directory)
- Create: `packages/frontend-3d/commands/` (directory)

- [ ] **Step 1: Create all directories**

```bash
cd /Users/ivankudzin/cursor/claude-code-superkit
mkdir -p packages/frontend-3d/{agents,hooks,rules,commands}
mkdir -p packages/frontend-3d/skills/{threejs-color-management,r3f-scroll-driven-3d,gltf-debugging,html-to-3d-texture,product-3d-lighting,output-enforcement}
```

- [ ] **Step 2: Verify structure**

```bash
find packages/frontend-3d -type d | sort
```

Expected: 12 directories listed.

- [ ] **Step 3: Commit**

```bash
git add packages/frontend-3d/
git commit -m "chore: create packages/frontend-3d/ directory structure"
```

---

## Task 2: Create agents (4 files)

**Files:**
- Create: `packages/frontend-3d/agents/presentation-reviewer.md`
- Create: `packages/frontend-3d/agents/r3f-scene-reviewer.md`
- Create: `packages/frontend-3d/agents/ui-design-reviewer.md`
- Create: `packages/frontend-3d/agents/frontend-perf-reviewer.md`

### 2a: Port presentation-reviewer.md

- [ ] **Step 1: Read source from tgapp**

Read `/Users/ivankudzin/cursor/tgapp/.claude/agents/presentation-reviewer.md`

- [ ] **Step 2: Create generified version**

Write to `packages/frontend-3d/agents/presentation-reviewer.md` with these changes from the tgapp original:
- Replace `presentation/src/components/sections/*.tsx` in description with `scroll-driven presentation sections using GSAP ScrollTrigger, phone frame components, and 3D textures`
- Remove the "Before Review" section that references `presentation/CLAUDE.md` and `.claude/rules/presentation-workflow.md` — replace with: `Read project CLAUDE.md and any GSAP/3D rules for authoritative conventions.`
- Keep ALL 16 checks exactly as-is (they are generic enough)
- Keep the output format exactly as-is

- [ ] **Step 3: Verify file**

```bash
head -5 packages/frontend-3d/agents/presentation-reviewer.md
grep -c "Check" packages/frontend-3d/agents/presentation-reviewer.md
```

Expected: YAML frontmatter with `model: opus`, 16+ check lines.

### 2b: Port r3f-scene-reviewer.md

- [ ] **Step 4: Read source from tgapp**

Read `/Users/ivankudzin/cursor/tgapp/.claude/agents/r3f-scene-reviewer.md`

- [ ] **Step 5: Create generified version**

Write to `packages/frontend-3d/agents/r3f-scene-reviewer.md` with these changes:
- Replace `presentation/src/components/3d/` in body with `any file importing @react-three/fiber, @react-three/drei, or three`
- Remove "Before Review" section referencing `presentation/CLAUDE.md` — replace with: `Read project CLAUDE.md for 3D conventions and installed skills.`
- Check 6: Replace `usePhoneScroll.getState()` with generic `useStore.getState()` — the pattern is universal
- Check 11: Replace `Object_53` reference with generic "front glass mesh" — project-specific mesh name
- Keep ALL 15 checks structure, keep output format

- [ ] **Step 6: Verify file**

```bash
grep -c "Check" packages/frontend-3d/agents/r3f-scene-reviewer.md
grep "presentation/" packages/frontend-3d/agents/r3f-scene-reviewer.md || echo "OK: no tgapp paths"
```

### 2c: Create ui-design-reviewer.md (NEW)

- [ ] **Step 7: Write ui-design-reviewer.md**

```markdown
---
name: ui-design-reviewer
description: Anti-slop UI review — typography, color calibration, layout diversity, motion quality, interactive states. Activate when reviewing frontend components for design quality.
model: opus
allowed-tools: Read, Grep, Glob, Agent
---

# UI Design Reviewer

You review frontend code for design quality, catching AI-generated slop patterns and enforcing premium aesthetics.

## Before Review

Read project CLAUDE.md for design system tokens, brand guidelines, and UI conventions.

## Review Checklist (16 checks)

### Typography (3 checks)

| # | Check | Severity | What to look for |
|---|-------|----------|------------------|
| 1 | Font choice | WARNING | No Inter/Roboto/Arial for premium designs — use distinctive fonts. System fonts OK for body text in utility apps |
| 2 | Headline tracking | WARNING | Headlines should use `tracking-tighter` or `tracking-tight`. Default tracking looks AI-generated |
| 3 | Body width | INFO | Body text constrained to `max-w-[65ch]` or similar. Full-width paragraphs are hard to read |

### Color (3 checks)

| # | Check | Severity | What to look for |
|---|-------|----------|------------------|
| 4 | Accent count | WARNING | Max 1 accent color. Multiple accents = visual noise. Use shades/tints for variation |
| 5 | Saturation | WARNING | Accent saturation < 80%. Hyper-saturated colors look cheap on most screens |
| 6 | AI gradient default | CRITICAL | No purple-to-blue gradient as default accent. This is the #1 AI-generated pattern red flag |

### Layout (3 checks)

| # | Check | Severity | What to look for |
|---|-------|----------|------------------|
| 7 | Center bias | WARNING | Not everything centered. Use split screen, asymmetric layouts when content permits |
| 8 | Grid over flex | INFO | CSS Grid for page layout over flex percentage math. Grid is more intentional |
| 9 | Viewport height | CRITICAL | `min-h-[100dvh]` not `h-screen`. iOS Safari address bar causes viewport jumping with `h-screen` |

### Motion (3 checks)

| # | Check | Severity | What to look for |
|---|-------|----------|------------------|
| 10 | Spring physics | WARNING | Use spring/ease-out for interactions, not `linear`. Linear motion feels robotic |
| 11 | Staggered reveals | INFO | List/grid items use staggered entrance (0.05-0.1s delay between items). Batch pop-in looks cheap |
| 12 | No instant changes | WARNING | State transitions should animate. Instant opacity/display toggle breaks flow |

### Interactive States (2 checks)

| # | Check | Severity | What to look for |
|---|-------|----------|------------------|
| 13 | Loading/empty/error | CRITICAL | All async states have explicit UI: loading skeleton, empty state message, error fallback |
| 14 | Active feedback | WARNING | `:active` state on buttons/cards — `scale-[0.98]` or similar for tactile feel |

### Glassmorphism (2 checks)

| # | Check | Severity | What to look for |
|---|-------|----------|------------------|
| 15 | Glass border | INFO | Glassmorphic elements have inner `border border-white/10` + `shadow-inner` for refraction effect |
| 16 | Tinted shadow | INFO | Shadows should be tinted (not pure black) — `shadow-accent/10` matches the element's context |

## Output Format

```
## UI Design Review: [filename]

| # | Check | Severity | Status | Confidence | Detail |
|---|-------|----------|--------|------------|--------|
| 1 | Font choice | WARNING | PASS | 85% | Using Space Grotesk — distinctive choice |
| 6 | AI gradient | CRITICAL | FAIL | 95% | Purple-to-blue gradient on hero — replace with brand accent |
...

### Summary
- X passed, Y failed, Z info
- Critical issues: [list]
- Design quality score: [0-100]
- Recommendations: [list]
```
```

### 2d: Create frontend-perf-reviewer.md (NEW)

- [ ] **Step 8: Write frontend-perf-reviewer.md**

```markdown
---
name: frontend-perf-reviewer
description: Frontend performance review — bundle size, lazy loading, CSS containment, web vitals, image optimization. Activate when reviewing frontend code for performance.
model: opus
allowed-tools: Read, Grep, Glob, Bash, Agent
---

# Frontend Performance Reviewer

You review frontend code for performance, focusing on bundle size, rendering efficiency, and Core Web Vitals.

## Before Review

Read project CLAUDE.md and package.json for framework, bundler, and dependency context.

## Review Checklist (12 checks)

### Bundle Size (3 checks)

| # | Check | Severity | What to look for |
|---|-------|----------|------------------|
| 1 | Code splitting | CRITICAL | Routes use dynamic `import()` or framework lazy loading. No single monolithic bundle |
| 2 | Tree shaking | WARNING | Named imports (`import { x } from 'lib'`) not namespace (`import * as lib`). Barrel files re-exporting everything defeat tree shaking |
| 3 | Heavy imports | WARNING | Large libraries (moment, lodash full, three.js) imported in main bundle instead of code-split. Use `date-fns`, `lodash-es`, or dynamic import for 3D |

### Images & Media (3 checks)

| # | Check | Severity | What to look for |
|---|-------|----------|------------------|
| 4 | Lazy loading | WARNING | Images below the fold use `loading="lazy"` or framework Image component with lazy default |
| 5 | Placeholders | INFO | Large images have blur/thumbhash/skeleton placeholder during load. No layout shift |
| 6 | Format | INFO | Images served as WebP/AVIF where possible. PNGs for transparency only, never for photos |

### CSS & Rendering (3 checks)

| # | Check | Severity | What to look for |
|---|-------|----------|------------------|
| 7 | CSS containment | INFO | Complex components use `contain: content` or `contain: layout paint`. Limits browser repaint scope |
| 8 | will-change | WARNING | Only on elements that actually animate. `will-change: transform` on static elements wastes GPU memory |
| 9 | Layout thrashing | CRITICAL | No read-then-write DOM pattern in loops (`el.offsetHeight` then `el.style.height`). Batch reads, then writes |

### Runtime Performance (3 checks)

| # | Check | Severity | What to look for |
|---|-------|----------|------------------|
| 10 | LCP optimization | CRITICAL | Largest Contentful Paint element loads fast — no unnecessary JS blocking, preload critical images/fonts |
| 11 | CLS prevention | WARNING | Images/embeds have explicit width/height or aspect-ratio. No layout shift during load |
| 12 | INP optimization | WARNING | Event handlers are fast (< 200ms). Heavy work deferred to `requestIdleCallback` or Web Worker |

## Output Format

```
## Performance Review: [filename/component]

| # | Check | Severity | Status | Confidence | Detail |
|---|-------|----------|--------|------------|--------|
| 1 | Code splitting | CRITICAL | PASS | 90% | Routes lazy-loaded via React.lazy |
| 9 | Layout thrashing | CRITICAL | FAIL | 95% | Lines 45-52: reading offsetHeight in loop then setting style |
...

### Summary
- X passed, Y failed, Z info
- Critical issues: [list]
- Estimated impact: [LCP/CLS/INP predictions]
- Recommendations: [list]
```
```

- [ ] **Step 9: Verify all 4 agents**

```bash
ls -la packages/frontend-3d/agents/
grep -l "model: opus" packages/frontend-3d/agents/*.md | wc -l
```

Expected: 4 files, all with `model: opus`.

- [ ] **Step 10: Commit**

```bash
git add packages/frontend-3d/agents/
git commit -m "feat(frontend-3d): add 4 agents — presentation-reviewer, r3f-scene-reviewer, ui-design-reviewer, frontend-perf-reviewer"
```

---

## Task 3: Create hooks (4 shell scripts)

**Files:**
- Create: `packages/frontend-3d/hooks/gsap-pattern-check.sh`
- Create: `packages/frontend-3d/hooks/r3f-color-check.sh`
- Create: `packages/frontend-3d/hooks/tailwind-version-guard.sh`
- Create: `packages/frontend-3d/hooks/bundle-size-warn.sh`

### 3a: Port gsap-pattern-check.sh

- [ ] **Step 1: Read source from tgapp**

Read `/Users/ivankudzin/cursor/tgapp/.claude/scripts/hooks/gsap-pattern-check.sh`

- [ ] **Step 2: Create generified version**

Write to `packages/frontend-3d/hooks/gsap-pattern-check.sh` with these changes:
- Change the path filter from `presentation/.*\.tsx$` to `\.tsx$` (any .tsx file, not just presentation/)
- Keep all 5 checks exactly as-is (they are generic GSAP patterns)
- Check 4 (import from "gsap" instead of setup file): change the warning message from `@/lib/gsap-setup` to `a centralized GSAP setup file` — generic advice
- Keep the profile/fast skip logic
- Keep `exit 0` always (warnings only)
- Make executable: `chmod +x`

### 3b: Create r3f-color-check.sh (NEW)

- [ ] **Step 3: Write r3f-color-check.sh**

```bash
#!/bin/bash
# r3f-color-check.sh — PostToolUse hook for Edit/Write
# Checks for common Three.js/R3F color management anti-patterns.
# Warnings only (exit 0 always) — never blocks.
# Profile: standard, strict (skip on fast)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only process files that likely import three/R3F
if [[ ! "$FILE_PATH" =~ \.(tsx?|jsx?)$ ]]; then
  exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Check if file imports three or @react-three
if ! grep -qE "(from ['\"]three['\"]|from ['\"]@react-three)" "$FILE_PATH" 2>/dev/null; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")
WARNINGS=""

# 1. sRGBEncoding used (deprecated since r152) — suggest colorSpace
if grep -qnE 'sRGBEncoding|LinearEncoding' "$FILE_PATH" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n  ⚠ THREE: sRGBEncoding/LinearEncoding deprecated since r152 — use texture.colorSpace = THREE.SRGBColorSpace in ${BASENAME}"
fi

# 2. texture loaded without explicit colorSpace setting
if grep -qE 'useTexture|TextureLoader|useLoader.*TextureLoader' "$FILE_PATH" 2>/dev/null; then
  if ! grep -q 'colorSpace' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ THREE: texture loaded without explicit colorSpace — set SRGBColorSpace for photos/UI, LinearSRGBColorSpace for data in ${BASENAME}"
  fi
fi

# 3. MeshStandardMaterial used for screen/display mesh
if grep -qE 'meshStandardMaterial|MeshStandardMaterial' "$FILE_PATH" 2>/dev/null; then
  if grep -qiE 'screen|display|monitor|phone|device' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ THREE: MeshStandardMaterial on screen/display mesh — use meshBasicMaterial (screens emit light, don't reflect) in ${BASENAME}"
  fi
fi

# 4. toneMapped not set on UI texture material
if grep -qE 'meshBasicMaterial|MeshBasicMaterial' "$FILE_PATH" 2>/dev/null; then
  if grep -qiE 'texture|map\s*=' "$FILE_PATH" 2>/dev/null; then
    if ! grep -q 'toneMapped' "$FILE_PATH" 2>/dev/null; then
      WARNINGS="${WARNINGS}\n  ⚠ THREE: material with texture but no toneMapped prop — add toneMapped={false} for accurate UI colors in ${BASENAME}"
    fi
  fi
fi

if [ -n "$WARNINGS" ]; then
  echo -e "\nR3F color check:${WARNINGS}"
  echo ""
fi

exit 0
```

### 3c: Create tailwind-version-guard.sh (NEW)

- [ ] **Step 4: Write tailwind-version-guard.sh**

```bash
#!/bin/bash
# tailwind-version-guard.sh — PostToolUse hook for Edit/Write
# Detects Tailwind v3 vs v4 syntax mismatches.
# Warnings only (exit 0 always) — never blocks.
# Profile: standard, strict (skip on fast)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.(tsx?|jsx?|css|scss)$ ]]; then
  exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")
WARNINGS=""

# Detect Tailwind version from nearest package.json
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
TW_VERSION=""
SEARCH_DIR=$(dirname "$FILE_PATH")
while [ "$SEARCH_DIR" != "/" ] && [ "$SEARCH_DIR" != "." ]; do
  if [ -f "$SEARCH_DIR/package.json" ]; then
    TW_VERSION=$(grep -oE '"tailwindcss":\s*"[^"]*"' "$SEARCH_DIR/package.json" 2>/dev/null | head -1 | grep -oE '[0-9]+' | head -1)
    break
  fi
  SEARCH_DIR=$(dirname "$SEARCH_DIR")
done

if [ -z "$TW_VERSION" ]; then
  exit 0
fi

if [ "$TW_VERSION" = "4" ]; then
  # v4 project checks
  # 1. Old postcss plugin name in v4 project
  if [[ "$FILE_PATH" =~ postcss ]]; then
    if grep -q '"tailwindcss"' "$FILE_PATH" 2>/dev/null; then
      if ! grep -q '@tailwindcss/postcss' "$FILE_PATH" 2>/dev/null; then
        WARNINGS="${WARNINGS}\n  ⚠ Tailwind v4: use @tailwindcss/postcss instead of tailwindcss in PostCSS config in ${BASENAME}"
      fi
    fi
  fi

  # 2. @tailwind directives (v3 syntax) in v4 project
  if grep -qE '@tailwind\s+(base|components|utilities)' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ Tailwind v4: @tailwind directives are v3 syntax — use @import \"tailwindcss\" instead in ${BASENAME}"
  fi

  # 3. tailwind.config.js referenced in v4 project (v4 uses CSS-based config)
  if grep -qE "require.*tailwind\.config|tailwind\.config\.(js|ts|cjs)" "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ Tailwind v4: tailwind.config.js is v3 pattern — v4 uses CSS-based configuration (@theme) in ${BASENAME}"
  fi
else
  # v3 project checks
  # 1. @import "tailwindcss" (v4 syntax) in v3 project
  if grep -qE '@import\s+["\x27]tailwindcss["\x27]' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ Tailwind v3: @import \"tailwindcss\" is v4 syntax — use @tailwind base/components/utilities in ${BASENAME}"
  fi

  # 2. @theme directive (v4 only) in v3 project
  if grep -q '@theme' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ Tailwind v3: @theme is v4 syntax — use tailwind.config.js theme.extend in ${BASENAME}"
  fi
fi

if [ -n "$WARNINGS" ]; then
  echo -e "\nTailwind version guard:${WARNINGS}"
  echo ""
fi

exit 0
```

### 3d: Create bundle-size-warn.sh (NEW)

- [ ] **Step 5: Write bundle-size-warn.sh**

```bash
#!/bin/bash
# bundle-size-warn.sh — PostToolUse hook for Edit/Write
# Warns when importing known heavy packages in frontend files.
# Warnings only (exit 0 always) — never blocks.
# Profile: standard, strict (skip on fast)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.(tsx?|jsx?)$ ]]; then
  exit 0
fi

NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // empty')
if [ -z "$NEW_STRING" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")
WARNINGS=""

# Known heavy packages and their lighter alternatives
# Format: "pattern|size|alternative"
HEAVY_PACKAGES=(
  "from ['\"]moment['\"]|67kb gzipped|date-fns or dayjs (2-7kb)"
  "from ['\"]lodash['\"]|71kb gzipped|lodash-es with named imports or native JS"
  "import \* as THREE|600kb+|import { specific } from 'three' or dynamic import"
  "from ['\"]chart.js['\"]|200kb+|chart.js/auto with tree shaking or lightweight alternative"
  "from ['\"]@mui/material['\"]|300kb+|check that only needed components are imported"
  "from ['\"]antd['\"]|350kb+|use babel-plugin-import for on-demand loading"
  "from ['\"]framer-motion['\"]|140kb|motion/react (lighter) or CSS animations for simple cases"
)

for entry in "${HEAVY_PACKAGES[@]}"; do
  IFS='|' read -r pattern size alternative <<< "$entry"
  if echo "$NEW_STRING" | grep -qE "$pattern" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ Bundle: heavy import detected (~${size}) — consider ${alternative} in ${BASENAME}"
  fi
done

# Warn on wildcard imports from large packages
if echo "$NEW_STRING" | grep -qE "import \* as .+ from" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n  ⚠ Bundle: namespace import (import *) defeats tree shaking — use named imports in ${BASENAME}"
fi

if [ -n "$WARNINGS" ]; then
  echo -e "\nBundle size check:${WARNINGS}"
  echo ""
fi

exit 0
```

- [ ] **Step 6: Make all hooks executable**

```bash
chmod +x packages/frontend-3d/hooks/*.sh
```

- [ ] **Step 7: Verify all 4 hooks**

```bash
ls -la packages/frontend-3d/hooks/
for f in packages/frontend-3d/hooks/*.sh; do head -2 "$f"; echo "---"; done
```

Expected: 4 executable .sh files, each starting with `#!/bin/bash`.

- [ ] **Step 8: Commit**

```bash
git add packages/frontend-3d/hooks/
git commit -m "feat(frontend-3d): add 4 hooks — gsap-pattern-check, r3f-color-check, tailwind-version-guard, bundle-size-warn"
```

---

## Task 4: Create skills (6 SKILL.md files)

**Files:**
- Create: `packages/frontend-3d/skills/threejs-color-management/SKILL.md`
- Create: `packages/frontend-3d/skills/r3f-scroll-driven-3d/SKILL.md`
- Create: `packages/frontend-3d/skills/gltf-debugging/SKILL.md`
- Create: `packages/frontend-3d/skills/html-to-3d-texture/SKILL.md`
- Create: `packages/frontend-3d/skills/product-3d-lighting/SKILL.md`
- Create: `packages/frontend-3d/skills/output-enforcement/SKILL.md`

### 4a: threejs-color-management

- [ ] **Step 1: Write threejs-color-management/SKILL.md**

```markdown
---
name: threejs-color-management
description: Three.js color pipeline — sRGB vs Linear, toneMapping (None/ACES/Reinhard), texture colorSpace, when to use NoToneMapping for UI textures. Activate when color issues arise with 3D textures or rendered colors look wrong.
---

# Three.js Color Management

Complete guide to the Three.js color pipeline. Use this when colors look wrong in 3D scenes — too bright, too dark, washed out, or distorted.

## The Color Pipeline

```
Texture → Material → Renderer (toneMapping) → Output (outputColorSpace)
```

Every texture goes through this pipeline. Understanding each stage prevents color issues.

## Stage 1: Texture colorSpace

Set on load. Tells Three.js how to interpret the texture data.

| Type | colorSpace | When |
|------|-----------|------|
| Photos, UI screenshots | `THREE.SRGBColorSpace` | Colors created for human eyes |
| Normal maps, roughness | `THREE.LinearSRGBColorSpace` | Data textures (not visual) |
| HDR environment | `THREE.LinearSRGBColorSpace` | Already in linear space |

```tsx
const texture = useTexture('/screen.png');
texture.colorSpace = THREE.SRGBColorSpace; // UI screenshot
```

## Stage 2: Material toneMapped

Controls whether the material goes through the renderer's tone mapping.

| Scenario | toneMapped | Why |
|----------|-----------|-----|
| UI on 3D screen | `false` | Preserve exact pixel colors |
| Realistic objects | `true` (default) | HDR → SDR compression needed |
| Emissive displays | `false` | Screens emit, don't reflect |

```tsx
<meshBasicMaterial map={texture} toneMapped={false} />
```

## Stage 3: Renderer toneMapping

Global setting. Compresses HDR values into displayable range.

| Value | Effect | Use when |
|-------|--------|----------|
| `THREE.ACESFilmicToneMapping` | Cinematic, saturated | Realistic 3D scenes (default) |
| `THREE.NoToneMapping` (0) | No compression | UI textures are primary visual |
| `THREE.ReinhardToneMapping` | Gentle compression | Bright scenes, less contrast |

```tsx
<Canvas gl={{ toneMapping: THREE.NoToneMapping }}>
```

## Stage 4: Output colorSpace

`renderer.outputColorSpace = THREE.SRGBColorSpace` (default). Rarely change this.

## Common Issues & Fixes

### Colors too bright / oversaturated
**Cause:** Tone mapping amplifying already-sRGB colors.
**Fix:** `toneMapped={false}` on the material, or `toneMapping: 0` on Canvas.

### Colors washed out / desaturated
**Cause:** Texture loaded as LinearSRGB but contains sRGB data.
**Fix:** `texture.colorSpace = THREE.SRGBColorSpace`

### Colors too dark
**Cause:** sRGB texture treated as linear (double conversion).
**Fix:** Check `texture.colorSpace` — if it's a photo/UI, must be SRGBColorSpace.

### UI screenshot looks wrong on 3D model
**The MacBook Landing Pattern** (proven solution):
```tsx
<meshBasicMaterial
  map={screenTexture}
  toneMapped={false}
/>
// + texture.colorSpace = THREE.SRGBColorSpace
// + Canvas gl={{ toneMapping: THREE.NoToneMapping }} if UI is primary
```

## Debug Checklist

1. Check `texture.colorSpace` — matches content type?
2. Check material `toneMapped` — false for UI textures?
3. Check Canvas `toneMapping` — 0 if UI-heavy scene?
4. Check material type — `meshBasicMaterial` for screens (no lighting effects)?
5. Check for deprecated `sRGBEncoding` — use `colorSpace` instead (since r152)
```

### 4b: r3f-scroll-driven-3d

- [ ] **Step 2: Write r3f-scroll-driven-3d/SKILL.md**

```markdown
---
name: r3f-scroll-driven-3d
description: Connect GSAP ScrollTrigger to React Three Fiber — Zustand bridge, useFrame animation, scroll progress to 3D transforms. The pattern for scroll-driven 3D product showcases.
---

# Scroll-Driven 3D with GSAP + R3F

Architecture pattern for connecting GSAP ScrollTrigger to React Three Fiber scenes via Zustand store.

## Why This Pattern?

**Problem:** GSAP runs in the DOM. R3F runs in WebGL. They can't communicate directly.

**Solution:** Zustand store as a bridge — GSAP writes scroll progress, R3F reads it in useFrame.

```
[GSAP ScrollTrigger] → writes → [Zustand Store] → reads → [R3F useFrame]
       (DOM)                      (shared state)              (WebGL)
```

## Why Zustand (Not React State/Context)?

- React state/context triggers re-renders on every scroll tick (60fps = 60 re-renders/sec)
- Zustand `getState()` reads directly without subscribing — zero re-renders
- useFrame already runs at 60fps — just read the latest value

## Implementation

### Step 1: Create the store

```tsx
// stores/useScrollStore.ts
import { create } from 'zustand';

interface ScrollStore {
  progress: number;          // 0-1 scroll progress
  currentTexture: string;    // active screen texture path
  setProgress: (p: number) => void;
  setTexture: (t: string) => void;
}

export const useScrollStore = create<ScrollStore>((set) => ({
  progress: 0,
  currentTexture: '/textures/screen-1.png',
  setProgress: (p) => set({ progress: p }),
  setTexture: (t) => set({ currentTexture: t }),
}));
```

### Step 2: GSAP writes to store

```tsx
// components/ScrollSection.tsx
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useScrollStore } from '@/stores/useScrollStore';

gsap.registerPlugin(ScrollTrigger);

export function ScrollSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { setProgress, setTexture } = useScrollStore();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ref.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,                    // number, NOT true
          invalidateOnRefresh: true,   // MUST have
          pin: true,
        },
      });

      // Animate progress 0 → 1
      tl.to({}, {
        duration: 1,
        onUpdate: function() {
          setProgress(this.progress());
        },
      });

      // Swap texture at 50% scroll
      tl.call(() => setTexture('/textures/screen-2.png'), [], 0.5);

      // CRITICAL: extend timeline to full duration
      tl.set({}, {}, 1.0);

    }, ref);

    return () => ctx.revert();
  }, []);

  return <div ref={ref} style={{ height: '300vh' }} />;
}
```

### Step 3: R3F reads in useFrame

```tsx
// components/3d/PhoneModel.tsx
import { useFrame } from '@react-three/fiber';
import { useScrollStore } from '@/stores/useScrollStore';
import { useRef } from 'react';
import * as THREE from 'three';

export function PhoneModel() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    // CRITICAL: getState() not hook — no re-renders
    const { progress } = useScrollStore.getState();

    // Rotate based on scroll
    groupRef.current.rotation.y = progress * Math.PI * 2;

    // Phase-based animation
    if (progress < 0.3) {
      // Entry: scale up
      const t = progress / 0.3;
      groupRef.current.scale.setScalar(0.5 + t * 0.5);
    } else if (progress < 0.7) {
      // Showcase: full size, rotate
      groupRef.current.scale.setScalar(1);
    } else {
      // Exit: scale down
      const t = (progress - 0.7) / 0.3;
      groupRef.current.scale.setScalar(1 - t * 0.3);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Your 3D model here */}
    </group>
  );
}
```

## Performance Tips

- **Pre-allocate:** No `new THREE.Vector3()` inside useFrame — use refs
- **getState():** Always in useFrame, never hook subscription
- **DPR:** `dpr={[1, 2]}` — higher wastes mobile GPU
- **Dispose:** `dispose={null}` on reusable groups

## Dynamic Texture Swapping

```tsx
useFrame(() => {
  const { currentTexture } = useScrollStore.getState();
  // Load and apply texture based on store value
});
```

Use `tl.call(() => setTexture('/new.png'), [], timePosition)` in GSAP timeline to trigger swaps at specific scroll positions.
```

### 4c: gltf-debugging

- [ ] **Step 3: Write gltf-debugging/SKILL.md**

```markdown
---
name: gltf-debugging
description: Runtime GLB/GLTF inspection — traverse nodes, identify screen meshes, inspect UV coordinates, material property dumping, fixing exported materials at runtime. Use when textures don't map correctly to 3D models.
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
```

### 4d: html-to-3d-texture

- [ ] **Step 4: Write html-to-3d-texture/SKILL.md**

```markdown
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
```

### 4e: product-3d-lighting

- [ ] **Step 5: Write product-3d-lighting/SKILL.md**

```markdown
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
```

### 4f: output-enforcement

- [ ] **Step 6: Write output-enforcement/SKILL.md**

```markdown
---
name: full-output-enforcement
description: Anti-laziness enforcement — bans placeholder patterns (// ..., // TODO, // rest of code), enforces complete code generation, handles token-limit splits cleanly. Activate for every code generation task.
---

# Full Output Enforcement

Never produce incomplete code. Every response must contain complete, runnable code.

## Banned Patterns

These MUST NEVER appear in generated code:

```
// ...
// rest of code
// rest of the implementation
// implement here
// TODO: implement
// TODO
// existing code...
// previous code remains
// ... (other methods)
// similar to above
/* ... */
# ... rest
# TODO
```

## Execution Protocol

### Before Writing Code

1. **Scope:** Count files and functions to generate
2. **Build:** Write every file completely — no shortcuts
3. **Cross-check:** Verify every import resolves, every type exists, every function is defined

### During Writing

- Write complete file from first line to last
- If a file is too long for one response, write to a clean breakpoint (complete function/class)
- Mark pause point: `[PAUSED — 3 of 7 files complete. Continuing with AuthService.ts]`

### Quick Check (Run Before Every Response)

1. Search for banned patterns in your response
2. Verify every `import` has a matching `export`
3. Verify every type reference has a definition
4. Verify no function calls reference undefined functions

## Token Limit Handling

If approaching token limit mid-file:

1. Finish the current function/class completely
2. Add pause marker with progress tracking
3. In next response, continue from the marker — don't repeat completed code

**Format:**
```
[PAUSED — AuthController.ts: 4 of 6 methods complete]
[Completed: login, logout, refresh, validate]
[Remaining: resetPassword, changeEmail]
```

## The Rule

**Incomplete code is worse than no code.** A placeholder `// TODO` becomes invisible tech debt. A complete implementation can be reviewed, tested, and shipped.
```

- [ ] **Step 7: Verify all 6 skills**

```bash
find packages/frontend-3d/skills -name "SKILL.md" | wc -l
```

Expected: 6

- [ ] **Step 8: Commit**

```bash
git add packages/frontend-3d/skills/
git commit -m "feat(frontend-3d): add 6 skills — threejs-color-management, r3f-scroll-driven-3d, gltf-debugging, html-to-3d-texture, product-3d-lighting, output-enforcement"
```

---

## Task 5: Create rules, command, and package README

**Files:**
- Create: `packages/frontend-3d/rules/gsap-conventions.md`
- Create: `packages/frontend-3d/rules/threejs-conventions.md`
- Create: `packages/frontend-3d/rules/frontend-aesthetics-3d.md`
- Create: `packages/frontend-3d/commands/capture-screen.md`
- Create: `packages/frontend-3d/README.md`

### 5a: gsap-conventions.md

- [ ] **Step 1: Write gsap-conventions.md**

```markdown
---
alwaysApply: false
paths:
  - "**/presentation/**"
  - "**/src/**/*.tsx"
  - "**/src/**/*.jsx"
---

# GSAP ScrollTrigger Conventions

Mandatory rules for GSAP ScrollTrigger animations. Violations cause visual bugs.

## Timeline Extension (CRITICAL)

After EVERY `gsap.timeline()` creation, add:

```tsx
tl.set({}, {}, 1.0);
```

**Why:** Without this, animations compress into the first 10% of scroll range. The timeline needs a marker at 1.0 to know its full duration.

## Scrub Must Be a Number

```tsx
// WRONG
scrub: true

// RIGHT
scrub: 1       // standard smoothness
scrub: 0.5     // snappier
scrub: 0.3     // very responsive
```

**Why:** `scrub: true` (boolean) causes jerky, non-smooth scrolling behavior.

## invalidateOnRefresh

Every ScrollTrigger config MUST include:

```tsx
scrollTrigger: {
  invalidateOnRefresh: true,
  // ... other config
}
```

**Why:** Without it, calculated positions break on window resize.

## Context Cleanup

All animations MUST be inside `gsap.context()` with cleanup:

```tsx
useEffect(() => {
  const ctx = gsap.context(() => {
    // all animations here
  }, containerRef);

  return () => ctx.revert();
}, []);
```

**Why:** Without context, animations leak memory and break on React re-renders.

## Centralized GSAP Import

Import GSAP from your project's setup file, not directly:

```tsx
// WRONG
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// RIGHT
import { gsap, ScrollTrigger } from '@/lib/gsap-setup';
```

**Why:** Ensures plugins are registered once, consistently.

## Phase Object for Timeline Positions

Use named constants, not magic numbers:

```tsx
const P = {
  entryStart: 0,
  entryEnd: 0.25,
  showcaseStart: 0.25,
  showcaseEnd: 0.7,
  exitStart: 0.7,
  exitEnd: 1.0,
};

tl.fromTo(element, { opacity: 0 }, { opacity: 1, duration: P.entryEnd - P.entryStart }, P.entryStart);
```

## Ease Standards

| Use Case | Ease | Why |
|----------|------|-----|
| Entrances | `power3.out` | Fast start, gentle stop |
| Crossfades | `power2.inOut` | Smooth both directions |
| Subtle motion | `sine.in` / `sine.out` | Barely perceptible |
| Exits | `power2.in` | Gentle start, fast finish |
```

### 5b: threejs-conventions.md

- [ ] **Step 2: Write threejs-conventions.md**

```markdown
---
alwaysApply: false
paths:
  - "**/components/3d/**"
  - "**/three/**"
  - "**/scene/**"
  - "**/r3f/**"
---

# Three.js / R3F Conventions

Mandatory rules for React Three Fiber and Three.js code.

## UI Screen Textures

Textures representing UI (screenshots, app screens) on 3D models:

```tsx
<meshBasicMaterial
  map={screenTexture}
  toneMapped={false}
/>
// + texture.colorSpace = THREE.SRGBColorSpace
```

**Rules:**
- Use `meshBasicMaterial` — screens emit light, they don't reflect it
- NEVER `MeshStandardMaterial` for display screens
- Set `toneMapped={false}` — prevents ACES tone mapping from distorting UI colors
- Set `texture.colorSpace = THREE.SRGBColorSpace` for any photo/UI texture
- Canvas `toneMapping: 0` when UI textures are the primary visual element

## UV Settings on Texture Replacement

When replacing a material's texture map, MUST copy ALL UV settings:

```tsx
newTexture.flipY = oldTexture.flipY;
newTexture.wrapS = oldTexture.wrapS;
newTexture.wrapT = oldTexture.wrapT;
newTexture.offset.copy(oldTexture.offset);
newTexture.repeat.copy(oldTexture.repeat);
newTexture.rotation = oldTexture.rotation;
newTexture.center.copy(oldTexture.center);
```

**Why:** Forgetting any of these causes texture misalignment, stretching, or mirroring.

## GLB Preloading

Always preload at module level:

```tsx
useGLTF.preload('/models/phone.glb');
```

**Why:** Without preload, model loads on mount causing visible pop-in.

## useFrame Performance

```tsx
// WRONG — allocates on every frame (60fps = 60 allocations/sec)
useFrame(() => {
  const pos = new THREE.Vector3(1, 2, 3);
});

// RIGHT — pre-allocate in ref
const tempVec = useRef(new THREE.Vector3());
useFrame(() => {
  tempVec.current.set(1, 2, 3);
});
```

## Zustand in useFrame

```tsx
// WRONG — hook subscription triggers re-renders
const progress = useStore((s) => s.progress);
useFrame(() => { /* use progress */ });

// RIGHT — direct read, no re-renders
useFrame(() => {
  const { progress } = useStore.getState();
});
```

## DPR Settings

```tsx
<Canvas dpr={[1, 2]}>
```

Higher values degrade mobile performance with minimal visual benefit.

## Disposal

```tsx
<group dispose={null}>
  <Model />
</group>
```

Use `dispose={null}` for reusable models to prevent premature Three.js cleanup.
```

### 5c: frontend-aesthetics-3d.md

- [ ] **Step 3: Write frontend-aesthetics-3d.md**

```markdown
---
alwaysApply: false
paths:
  - "**/presentation/**/*.tsx"
  - "**/presentation/**/*.jsx"
  - "**/landing/**/*.tsx"
  - "**/landing/**/*.jsx"
---

# Frontend Aesthetics — 3D & Presentation

Extended aesthetics rules for 3D-enhanced presentation/landing pages. Supplements the core `frontend-aesthetics` rule with animation and 3D-specific patterns.

## Anti-Center Bias

Not everything centered. For DESIGN_VARIANCE > 4 elements, use:
- Split screen: content left, 3D right (or vice versa)
- Asymmetric layouts with intentional negative space
- Offset 3D elements from center for visual interest

## Cards Only When Earned

Cards only when elevation communicates hierarchy — not as default container.
If every section is a card, nothing has emphasis.

## Viewport Units

```tsx
// WRONG — iOS Safari address bar causes jumping
h-screen

// RIGHT — dynamic viewport height
min-h-[100dvh]
```

## Grid Over Flex Math

```tsx
// WRONG — fragile percentage calculations
<div className="flex">
  <div className="w-[calc(50%-12px)]">

// RIGHT — explicit grid
<div className="grid grid-cols-2 gap-6">
```

## Staggered Reveals

List/grid items MUST use staggered entrance:

```tsx
// 0.05-0.1s delay between items
stagger: { each: 0.08, from: 'start' }
```

Batch pop-in (all items appear simultaneously) looks cheap.

## Spring Physics for Interactions

```tsx
// WRONG — robotic
transition: { duration: 0.3, ease: 'linear' }

// RIGHT — natural feel
transition: { type: 'spring', stiffness: 300, damping: 20 }
```

## 3D Scene Atmosphere

- Dark backgrounds: ambient < 0.3, dramatic key light
- Light backgrounds: ambient 0.7-0.8, soft even lighting
- Always add `<Float>` for idle animation — static 3D looks dead
- `ContactShadows` for grounding — floating objects feel disconnected

## Scroll-Driven 3D

- 3D model should respond to scroll — rotation, scale, material changes
- Use phase-based animation (entry → showcase → transition → exit)
- Each phase has clear visual purpose — no random motion
```

### 5d: capture-screen.md (generified command)

- [ ] **Step 4: Read tgapp source, then write generified version**

Read `/Users/ivankudzin/cursor/tgapp/.claude/commands/capture-screen.md`

Write to `packages/frontend-3d/commands/capture-screen.md`:

```markdown
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
curl -s http://localhost:$ARGUMENTS 2>/dev/null || echo "Dev server not running on port $ARGUMENTS"
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
```

### 5e: Package README.md

- [ ] **Step 5: Write packages/frontend-3d/README.md**

```markdown
# Frontend 3D Package

Production-tested agents, hooks, skills, rules, and commands for quality frontend, 3D, and animation development.

Built from 12+ hours of battle-tested experience building scroll-driven 3D product showcases with GSAP ScrollTrigger, React Three Fiber, and Three.js.

## What's Inside

| Component | Count | Description |
|-----------|-------|-------------|
| **Agents** | 4 | presentation-reviewer, r3f-scene-reviewer, ui-design-reviewer, frontend-perf-reviewer |
| **Hooks** | 4 | gsap-pattern-check, r3f-color-check, tailwind-version-guard, bundle-size-warn |
| **Skills** | 6 | threejs-color-management, r3f-scroll-driven-3d, gltf-debugging, html-to-3d-texture, product-3d-lighting, output-enforcement |
| **Rules** | 3 | gsap-conventions, threejs-conventions, frontend-aesthetics-3d |
| **Commands** | 1 | /capture-screen |

## Installation

### Via superkit installer (recommended)

```bash
npx claude-code-superkit
# Select "Frontend 3D" when prompted for stacks
```

### Manual

```bash
# From your project root
cp -r packages/frontend-3d/agents/*.md .claude/agents/
cp -r packages/frontend-3d/hooks/*.sh .claude/scripts/hooks/
cp -r packages/frontend-3d/skills/* .claude/skills/
cp -r packages/frontend-3d/rules/*.md .claude/rules/
cp -r packages/frontend-3d/commands/*.md .claude/commands/
chmod +x .claude/scripts/hooks/*.sh
```

## Recommended External Skills

Install via `npx skills add`:

| Source | Skills | Count |
|--------|--------|-------|
| greensock/gsap-skills | gsap-core, timeline, scrolltrigger, plugins, utils, react, performance, frameworks | 8 |
| freshtechbro/claudedesignskills | threejs-webgl, react-three-fiber, modern-web-design + 19 others | 22 |
| Leonxlnx/taste-skill | design-taste-frontend, output-enforcement, soft, minimalist, brutalist, redesign, stitch | 7 |

## Recommended MCP Servers

| Server | Package | Purpose |
|--------|---------|---------|
| gsap-master | bruzethegreat-gsap-master-mcp-server@2.2.0 | Full GSAP API, intent analysis, production patterns |

## Problems This Solves

| Problem | Time Lost | Solution |
|---------|-----------|----------|
| 3D texture color distortion | ~3h | threejs-color-management skill + r3f-color-check hook |
| GSAP timeline compression | ~2h | gsap-pattern-check hook catches immediately |
| UV mapping mismatch | ~2h | gltf-debugging skill |
| Tailwind v3/v4 syntax mix | ~1h | tailwind-version-guard hook |
| AI-generated generic UI | ongoing | ui-design-reviewer agent + frontend-aesthetics-3d rule |
```

- [ ] **Step 6: Verify all files in task**

```bash
ls packages/frontend-3d/rules/
ls packages/frontend-3d/commands/
cat packages/frontend-3d/README.md | head -3
```

- [ ] **Step 7: Commit**

```bash
git add packages/frontend-3d/rules/ packages/frontend-3d/commands/ packages/frontend-3d/README.md
git commit -m "feat(frontend-3d): add 3 rules, capture-screen command, and package README"
```

---

## Task 6: Update installer and settings-builder

**Files:**
- Modify: `lib/installer.js`
- Modify: `lib/settings-builder.js`
- Modify: `package.json` (add `packages/frontend-3d/` to files array)

- [ ] **Step 1: Update lib/installer.js — add Frontend 3D to stack selection**

In the `multiConfirm` call at line 81-86, add after the Rust entry:

```javascript
{ label: 'Frontend 3D? [y/N]', value: 'frontend-3d' }
```

- [ ] **Step 2: Update lib/installer.js — add frontend-3d copy logic**

After the existing stack rules section (after line 234), add a new section for self-contained packages:

```javascript
  // Self-contained packages (frontend-3d has agents, hooks, skills, rules, commands in one dir)
  const SELF_CONTAINED_PACKAGES = ['frontend-3d'];
  let packageSkillCount = 0;
  let packageCmdCount = 0;
  for (const stack of stacks) {
    if (!SELF_CONTAINED_PACKAGES.includes(stack)) continue;
    const pkgDir = join(PACKAGES_DIR, stack);
    if (!existsSync(pkgDir)) continue;

    // Package agents
    const pkgAgentDir = join(pkgDir, 'agents');
    if (existsSync(pkgAgentDir)) {
      stackAgentCount += copyDir(pkgAgentDir, join(claudeDir, 'agents'), mode, '.md');
    }

    // Package hooks (handled by collectStackHooks via settings-builder)

    // Package skills
    const pkgSkillDir = join(pkgDir, 'skills');
    if (existsSync(pkgSkillDir)) {
      packageSkillCount += copySkills(pkgSkillDir, join(claudeDir, 'skills'), mode);
    }

    // Package rules
    const pkgRuleDir = join(pkgDir, 'rules');
    if (existsSync(pkgRuleDir)) {
      stackRuleCount += copyDir(pkgRuleDir, join(claudeDir, 'rules'), mode, '.md');
    }

    // Package commands
    const pkgCmdDir = join(pkgDir, 'commands');
    if (existsSync(pkgCmdDir)) {
      packageCmdCount += copyDir(pkgCmdDir, join(claudeDir, 'commands'), mode, '.md');
    }
  }
  if (packageSkillCount > 0) info(`Copied ${packageSkillCount} package skills → .claude/skills/`);
  if (packageCmdCount > 0) info(`Copied ${packageCmdCount} package commands → .claude/commands/`);
```

- [ ] **Step 3: Update lib/installer.js — fix summary counts**

Update the summary section to include package skills and commands:

Change:
```javascript
console.log(`    Commands: ${cmdCount}`);
```
To:
```javascript
console.log(`    Commands: ${cmdCount + packageCmdCount}`);
```

And add after the Skills line:
```javascript
console.log(`    Skills:   ${5 + packageSkillCount}`);
```

- [ ] **Step 4: Update lib/settings-builder.js — support packages/{stack}/hooks/ path**

In the `collectStackHooks` function, add a second directory to check:

```javascript
export function collectStackHooks(packagesDir, stacks) {
  const hooks = [];
  for (const stack of stacks) {
    // Standard pattern: packages/stack-hooks/{stack}/
    const standardDir = join(packagesDir, 'stack-hooks', stack);
    // Self-contained pattern: packages/{stack}/hooks/
    const packageDir = join(packagesDir, stack, 'hooks');

    for (const hookDir of [standardDir, packageDir]) {
      if (!existsSync(hookDir)) continue;
      for (const file of readdirSync(hookDir)) {
        if (file.endsWith('.sh')) hooks.push(file);
      }
    }
  }
  return hooks;
}
```

- [ ] **Step 5: Update package.json — add frontend-3d to files array**

Add `"packages/frontend-3d/"` to the `files` array so it's included in npm package.

- [ ] **Step 6: Run existing tests**

```bash
cd /Users/ivankudzin/cursor/claude-code-superkit && npm test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/installer.js lib/settings-builder.js package.json
git commit -m "feat(installer): add Frontend 3D stack selection and self-contained package support"
```

---

## Task 7: Documentation — guide chapter + reference page

**Files:**
- Create: `docs/guide/13-frontend-3d.md`
- Create: `docs/FRONTEND-3D.md`

- [ ] **Step 1: Write docs/guide/13-frontend-3d.md**

Guide chapter explaining the frontend-3d package — what it does, when to use each component, how to get started. Keep it concise and practical:

Sections:
1. **Overview** — what the package solves, who it's for (developers building scroll-driven 3D product showcases, presentation landings, or any frontend with GSAP/Three.js)
2. **Getting Started** — install via `npx claude-code-superkit` selecting Frontend 3D, or manual copy
3. **Agents** — brief description of each agent with when to use it
4. **Hooks** — what each hook catches and when it activates
5. **Skills** — what knowledge each skill provides
6. **Rules** — what each rule enforces
7. **Commands** — /capture-screen usage
8. **Recommended External Tools** — skills marketplace + MCP servers table
9. **Common Workflows** — "Building a product landing", "Adding a 3D phone model", "Debugging color issues"

- [ ] **Step 2: Write docs/FRONTEND-3D.md**

Full reference catalog. For each component, include:
- Name, type, description
- What it checks/provides (bullet list)
- Activation (when does it trigger)

This is the "separate full information about frontend skills and agents" the user requested.

Structure:
- **Title: Frontend 3D — Complete Reference**
- **Agents section** — each agent with full checklist summary
- **Hooks section** — each hook with all checks listed
- **Skills section** — each skill with topics covered
- **Rules section** — each rule with key points
- **Commands section** — usage and prerequisites
- **External Recommendations** — skills and MCP servers tables
- **Troubleshooting** — common issues table from spec (color distortion, timeline compression, UV mapping, etc.)

- [ ] **Step 3: Commit**

```bash
git add docs/guide/13-frontend-3d.md docs/FRONTEND-3D.md
git commit -m "docs: add Frontend 3D guide chapter and complete reference catalog"
```

---

## Task 8: Codex CLI equivalents

**Files:**
- Create: 10 new SKILL.md files in `packages/codex/skills/`
- Modify: `packages/codex/AGENTS.md`
- Modify: `packages/codex/INSTALL.md`

Each Codex skill wraps a Claude Code agent or skill into a single SKILL.md with the full content embedded (Codex has no agents/hooks/rules — everything is a skill).

- [ ] **Step 1: Create agent-equivalent skills**

Create 4 directories + SKILL.md files:
- `packages/codex/skills/presentation-reviewer/SKILL.md` — embed the full 16-check agent
- `packages/codex/skills/r3f-scene-reviewer/SKILL.md` — embed the full 15-check agent
- `packages/codex/skills/ui-design-reviewer/SKILL.md` — embed the full 16-check agent
- `packages/codex/skills/frontend-perf-reviewer/SKILL.md` — embed the full 12-check agent

Each SKILL.md follows the Codex skill format:
```markdown
---
name: <skill-name>
description: <description>. Activate when <trigger condition>.
---

# <Title>

<Full agent content embedded as skill body>
```

- [ ] **Step 2: Create knowledge-equivalent skills**

Create 6 directories + SKILL.md files, one for each frontend-3d skill:
- `packages/codex/skills/threejs-color-management/SKILL.md`
- `packages/codex/skills/r3f-scroll-driven-3d/SKILL.md`
- `packages/codex/skills/gltf-debugging/SKILL.md`
- `packages/codex/skills/html-to-3d-texture/SKILL.md`
- `packages/codex/skills/product-3d-lighting/SKILL.md`
- `packages/codex/skills/output-enforcement/SKILL.md`

Copy the content directly from the Claude Code skills (same SKILL.md format works for Codex).

**IMPORTANT:** Check if `output-enforcement` already exists in Codex skills before creating. If it does, skip it and adjust count accordingly.

- [ ] **Step 3: Update packages/codex/AGENTS.md**

Add a new "Frontend 3D Skills" section to the Available Skills lists. Include all 10 new skills with descriptions and activation triggers.

- [ ] **Step 4: Update packages/codex/INSTALL.md**

Update the skill count: 50 → 60. Update any tables or descriptions referencing total skill count.

- [ ] **Step 5: Verify Codex skill count**

```bash
find packages/codex/skills -name "SKILL.md" | wc -l
```

Expected: 60

- [ ] **Step 6: Commit**

```bash
git add packages/codex/
git commit -m "feat(codex): add 10 Frontend 3D skills (4 agents + 6 knowledge)"
```

---

## Task 9: Update counts everywhere

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/INSTALL-CLAUDE-CODE.md`

- [ ] **Step 1: Verify actual counts**

```bash
echo "=== Core agents ==="
ls packages/core/agents/*.md | wc -l

echo "=== Stack agents ==="
ls packages/stack-agents/go/*.md packages/stack-agents/typescript/*.md packages/stack-agents/python/*.md packages/stack-agents/rust/*.md packages/frontend-3d/agents/*.md 2>/dev/null | wc -l

echo "=== Extra agents ==="
ls packages/extras/*.md | wc -l

echo "=== Commands ==="
ls packages/core/commands/*.md packages/frontend-3d/commands/*.md 2>/dev/null | wc -l

echo "=== Core hooks ==="
ls packages/core/hooks/*.sh | wc -l

echo "=== Stack hooks ==="
ls packages/stack-hooks/go/*.sh packages/stack-hooks/typescript/*.sh packages/stack-hooks/python/*.sh packages/stack-hooks/rust/*.sh packages/frontend-3d/hooks/*.sh 2>/dev/null | wc -l

echo "=== Core rules ==="
ls packages/core/rules/*.md | wc -l

echo "=== Stack rules ==="
ls packages/stack-rules/go/*.md packages/frontend-3d/rules/*.md 2>/dev/null | wc -l

echo "=== Core skills ==="
find packages/core/skills -name "SKILL.md" | wc -l

echo "=== Frontend-3D skills ==="
find packages/frontend-3d/skills -name "SKILL.md" | wc -l

echo "=== Codex skills ==="
find packages/codex/skills -name "SKILL.md" | wc -l
```

- [ ] **Step 2: Update README.md**

Changes:
1. Badge: `39_agents` → `43_agents`
2. What's Inside table: update all counts
3. What's New: replace v1.3.7 content with v1.3.8 content
4. Add Frontend 3D to Stack Agents description
5. Update any other count references

New What's New section:
```markdown
## What's New (v1.3.8)

- **Frontend 3D package** — 4 agents, 4 hooks, 6 skills, 3 rules, 1 command for GSAP/Three.js/R3F development
- **presentation-reviewer** — 16-check review for scroll-driven sections (GSAP, phone frames, 3D textures)
- **r3f-scene-reviewer** — 15-check review for R3F/Three.js (color management, performance, GLB)
- **ui-design-reviewer** — anti-slop UI review (typography, color, layout, motion, interactive states)
- **frontend-perf-reviewer** — bundle size, lazy loading, CSS containment, web vitals
- **6 knowledge skills** — threejs-color-management, r3f-scroll-driven-3d, gltf-debugging, html-to-3d-texture, product-3d-lighting, output-enforcement
- **/capture-screen command** — capture React components as PNG textures for 3D models
- **4 hooks** — gsap-pattern-check, r3f-color-check, tailwind-version-guard, bundle-size-warn
- **3 rules** — gsap-conventions, threejs-conventions, frontend-aesthetics-3d
- **Frontend 3D reference** — full catalog at docs/FRONTEND-3D.md
```

- [ ] **Step 3: Update CLAUDE.md**

Changes:
1. Project structure: add `packages/frontend-3d/` section
2. Counts table: update all changed rows
3. Add Frontend-3D to component descriptions

- [ ] **Step 4: Update CHANGELOG.md**

Replace `_No unreleased changes._` under `## [Unreleased]` with full v1.3.8 changelog.

- [ ] **Step 5: Update docs/INSTALL-CLAUDE-CODE.md**

Update any count references for agents, hooks, skills, Codex skills.

- [ ] **Step 6: Run count verification**

```bash
# Check README badge matches actual
grep -o '[0-9]*_agents' README.md
echo "Actual: $(ls packages/core/agents/*.md packages/stack-agents/*/*.md packages/frontend-3d/agents/*.md packages/extras/*.md 2>/dev/null | wc -l | tr -d ' ')"
```

- [ ] **Step 7: Commit**

```bash
git add README.md CLAUDE.md CHANGELOG.md docs/INSTALL-CLAUDE-CODE.md
git commit -m "docs: update all counts and documentation for v1.3.8 Frontend 3D release"
```

---

## Task 10: Release 1.3.8

**Files:**
- Modify: `VERSION`
- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Modify: `README.md`

- [ ] **Step 1: Bump VERSION**

```bash
echo "1.3.8" > VERSION
```

- [ ] **Step 2: Bump package.json version**

Change `"version": "1.3.7"` to `"version": "1.3.8"` in package.json.

- [ ] **Step 3: Finalize CHANGELOG**

Move `## [Unreleased]` content to `## [1.3.8] — 2026-04-09`. Add new empty `## [Unreleased]` section above.

- [ ] **Step 4: Update README "See full changelog" link**

Change `v1.0.0 → v1.3.7` to `v1.0.0 → v1.3.8`.

- [ ] **Step 5: Update GitHub repository description**

```bash
gh repo edit --description "Production-tested agents (43), commands (16), hooks (26+), skills (12), and rules (12) for Claude Code and Codex CLI. All agents on Opus."
```

- [ ] **Step 6: Final verification**

```bash
# VERSION matches package.json
cat VERSION
node -e "console.log(require('./package.json').version)"

# All counts consistent
node -e "
const fs = require('fs');
const readme = fs.readFileSync('README.md','utf8');
const badge = readme.match(/(\d+)_agents/)?.[1];
console.log('README badge agents:', badge);
console.log('Expected: 43');
"
```

- [ ] **Step 7: Commit release**

```bash
git add VERSION package.json CHANGELOG.md README.md
git commit -m "release: v1.3.8 — Frontend 3D package"
```

- [ ] **Step 8: Push and create GitHub release**

```bash
git push origin main
gh release create v1.3.8 --title "v1.3.8 — Frontend 3D Package" --notes-file - <<'EOF'
## Frontend 3D Package

New self-contained package at `packages/frontend-3d/` for quality frontend, 3D, and animation development.

### New Components
- **4 agents:** presentation-reviewer (16 checks), r3f-scene-reviewer (15 checks), ui-design-reviewer (16 checks), frontend-perf-reviewer (12 checks)
- **4 hooks:** gsap-pattern-check, r3f-color-check, tailwind-version-guard, bundle-size-warn
- **6 skills:** threejs-color-management, r3f-scroll-driven-3d, gltf-debugging, html-to-3d-texture, product-3d-lighting, output-enforcement
- **3 rules:** gsap-conventions, threejs-conventions, frontend-aesthetics-3d
- **1 command:** /capture-screen

### Documentation
- New guide chapter: `docs/guide/13-frontend-3d.md`
- Complete reference: `docs/FRONTEND-3D.md`
- 10 Codex skill equivalents (50 → 60 total)

### Installer
- "Frontend 3D" added to stack selection
- Self-contained package support (`packages/{name}/` pattern)

Install: `npx claude-code-superkit` → select "Frontend 3D"

Full changelog: CHANGELOG.md
EOF
```

---

## Dependency Graph

```
Task 1 (dirs) ──┬──→ Task 2 (agents)   ──┐
                ├──→ Task 3 (hooks)     ──┤
                ├──→ Task 4 (skills)    ──├──→ Task 6 (installer) ──┐
                └──→ Task 5 (rules+cmd) ──┤                         │
                                          ├──→ Task 7 (docs)      ──├──→ Task 9 (counts) ──→ Task 10 (release)
                                          └──→ Task 8 (codex)     ──┘
```

**Parallelization:** Tasks 2-5 can run simultaneously. Tasks 6-8 can run simultaneously after 2-5.
