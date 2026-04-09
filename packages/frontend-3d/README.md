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
