# Recommended Tools & Skills

Curated list of external tools and AI skills that complement claude-code-superkit.

## App Store & Marketing

### [ParthJadhav/app-store-screenshots](https://github.com/ParthJadhav/app-store-screenshots)

**Type:** AI Agent Skill (MIT)
**Stars:** 3.2K+ | **Weekly installs:** 2,600+
**Compatibility:** Claude Code, Cursor, Windsurf, Codex, 40+ agents

**What it does:** AI generates production-ready App Store screenshots — device frames + marketing copy + backgrounds. Outputs a Next.js project that exports PNGs in all Apple-required sizes (4 iPhone + 2 iPad).

**Install:**
```bash
npx skills add ParthJadhav/app-store-screenshots
```

**Use cases:**
- App Store screenshot generation (primary)
- Marketing website hero images (phone mockups)
- Pitch deck / presentation slides
- Portfolio showcase materials

**Strengths:**
- Zero cost, MIT license
- AI generates both design AND marketing copy
- Proven with Apple App Store approval (Bloom Coffee app)
- Supports multi-language, themes, bulk export

**Limitations:**
- Export bugs: black screens (Issue #13), alpha channel rejection (Issue #14)
- iPhone/iPad only (no Android)
- Not headless (requires browser for export)
- Young project (Mar 2026), single maintainer

**Alternatives:** fastlane frameit (CI/CD, free), AppLaunchpad ($29/mo, 400+ templates), AppMockUp Studio (free, web)

---

## 3D & WebGL

### [mrdoob/three.js](https://github.com/mrdoob/three.js)

**Type:** JavaScript 3D Library (MIT)
**Stars:** 112K+ | **npm:** `three`

**What it does:** The foundational 3D library for the web — renders interactive 3D graphics using WebGL and WebGPU. Provides scene graph, cameras, geometries, materials, lights, animations, and loaders.

**Install:**
```bash
npm install three
```

**Use cases:**
- Interactive 3D visualizations and product configurators
- Games and immersive web experiences
- Data visualization in 3D
- AR/VR web applications

**Strengths:**
- Industry standard, massive ecosystem (112K+ stars)
- WebGL + WebGPU support
- Extensive documentation and examples
- Cross-browser, lightweight

---

### [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber)

**Type:** React Renderer for Three.js (MIT)
**Stars:** 30.5K+ | **npm:** `@react-three/fiber`

**What it does:** Wraps Three.js in a declarative React API — build 3D scenes with JSX, React hooks, and component architecture. Zero overhead over raw Three.js.

**Install:**
```bash
npm install three @types/three @react-three/fiber
```

**Use cases:**
- React apps with embedded 3D (product viewers, dashboards)
- Interactive 3D UI components
- Declarative scene composition with reusable 3D components
- Games and creative coding in React

**Strengths:**
- Full React ecosystem integration (hooks, state, suspense)
- Automatic render loop management
- Rich ecosystem: `@react-three/drei` (helpers), `@react-three/postprocessing`, `@react-three/xr`
- Supports React 18+ and React 19+

**Limitations:**
- Requires React knowledge
- Debugging 3D through React abstractions can be tricky
- Performance tuning needs understanding of both React and Three.js

---

### [Sketchfab](https://sketchfab.com)

**Type:** 3D Model Platform (Free + Paid tiers)
**Creators:** 1M+ | **Categories:** 19+

**What it does:** The world's largest platform to publish, share, and discover 3D content. Interactive 3D viewer embeddable anywhere, with a marketplace (Fab) for buying/selling models.

**Use cases:**
- Source 3D models for prototyping and production
- Embed interactive 3D viewers in web apps
- AR/VR-ready asset discovery
- Inspiration and reference for 3D projects

**Strengths:**
- Massive library across 19+ categories (characters, architecture, vehicles, nature, etc.)
- Market-leading interactive 3D web player
- Physics-based rendering, animation, lighting editor
- AR/VR ready, cross-platform
- Free tier available

**Limitations:**
- Premium models require purchase
- Licensing varies per model
- AI-generated content mixed in (filterable)

---

## Animation

### [GSAP](https://gsap.com)

**Type:** JavaScript Animation Library (Free, by Webflow)
**npm:** `gsap`

**What it does:** Professional-grade animation library — animates anything JS can touch with silky-smooth performance. Works with UI elements, SVG, WebGL, and Canvas.

**Install:**
```bash
npm install gsap
```

**Use cases:**
- Scroll-driven animations and storytelling
- Complex UI transitions and micro-interactions
- SVG morphing, drawing, and text effects
- Interactive draggable interfaces
- Physics-based motion

**Strengths:**
- Now fully free (backed by Webflow)
- Rich plugin ecosystem: ScrollTrigger, Draggable, SplitText, MorphSVG, DrawSVG, Flip, Physics2D
- Works with any framework (React, Vue, vanilla JS)
- Battle-tested, used on millions of sites
- Customizable easing and timeline sequencing

**Limitations:**
- Learning curve for complex timelines
- Plugin-heavy for advanced features (ScrollTrigger, MorphSVG, etc.)

---

*Add recommendations via PR or issue.*
