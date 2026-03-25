# Website Design Tools Setup — Implementation Plan (Plan 5, v2)

> Install UI/UX skills, MCP servers, and prepare the full design toolchain for the ONYX website.

**Goal:** Install ui-ux-pro-max + app-store-preflight skills, configure 21st.dev magic + shadcn MCP servers, create onyx-website skill, optionally set up 21st.dev AI chat agent for the landing page.

**Context:** We're building a marketing/showcase website for the ONYX dating mini app. The site will use Next.js 15 + Tailwind 4 + shadcn/ui + 21st.dev community components.

**Full reference:** `docs/website-design/toolchain-reference.md`

**Working directory:** `/Users/ivankudzin/cursor/tgapp/`

---

## Task 1: Install ui-ux-pro-max skill

**What:** AI design system generator — 161 reasoning rules, 71 styles, 161 palettes, 73 font pairings.

- [ ] **Step 1: Clone the repo**
```bash
cd /Users/ivankudzin/cursor
git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git
```

- [ ] **Step 2: Symlink into TGApp project**
```bash
ln -s /Users/ivankudzin/cursor/ui-ux-pro-max-skill/src/ui-ux-pro-max \
      /Users/ivankudzin/cursor/tgapp/.claude/skills/ui-ux-pro-max
```

- [ ] **Step 3: Verify skill detected in Claude Code**

---

## Task 2: Install app-store-preflight skill

**What:** iOS/macOS App Store pre-submission validator. For when we wrap ONYX as a native app.

- [ ] **Step 1: Clone the repo**
```bash
cd /Users/ivankudzin/cursor
git clone https://github.com/truongduy2611/app-store-preflight-skills.git
```

- [ ] **Step 2: Symlink into TGApp project**
```bash
ln -s /Users/ivankudzin/cursor/app-store-preflight-skills \
      /Users/ivankudzin/cursor/tgapp/.claude/skills/app-store-preflight
```

---

## Task 3: Configure 21st.dev Magic MCP server

**What:** Programmatic access to 21st.dev community component library — search, generate, and adapt React+Tailwind components.

- [ ] **Step 1: Get API key**
  - Sign up at https://21st.dev
  - Get API key from dashboard
  - Add to environment: `export TWENTY_FIRST_API_KEY="your-key"`

- [ ] **Step 2: Add to .claude/settings.json**

Add `mcpServers` section:
```json
{
  "mcpServers": {
    "magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/magic@latest"],
      "env": {
        "TWENTY_FIRST_API_KEY": "${TWENTY_FIRST_API_KEY}"
      }
    }
  }
}
```

- [ ] **Step 3: Verify MCP connection**

Start Claude Code → check magic MCP server connects.

### How to use with components

**Workflow:**
1. Browse https://21st.dev/community/components visually
2. Find a component you like (hero, features, CTA, testimonials, etc.)
3. Tell Claude: "Use this hero section from 21st.dev" or describe what you want
4. Claude uses magic MCP to fetch/generate component code
5. Component gets adapted to ONYX design system (#060609 bg, #6A5CFF accent, glass effects)

**Component categories available:**
- Heros — landing page hero sections
- Features — feature showcase blocks
- Calls to Action — CTA buttons/sections
- Testimonials — social proof
- Pricing — pricing tables
- Buttons — styled button variants
- Shaders — visual effects (gradients, glass)
- AI Chat — chat interface components
- Text Components — animated typography

---

## Task 4: Configure shadcn MCP server

**What:** Access to shadcn/ui component library — base React+Tailwind components.

- [ ] **Step 1: Add to .claude/settings.json**
```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["-y", "shadcn-mcp@latest"]
    }
  }
}
```

- [ ] **Step 2: Verify MCP connection**

### shadcn components for ONYX site
- NavigationMenu → header
- Card → feature/testimonial cards
- Button → CTAs (styled with ONYX violet)
- Dialog → modals (QR code, cookie consent)
- Accordion → FAQ
- Tabs → content switching
- Form + Input → contact form / newsletter
- Avatar → testimonial photos
- Badge → feature tags
- Separator, ScrollArea, Skeleton, Toast

---

## Task 5: Create onyx-website design skill

**Files:**
- Create: `.claude/skills/onyx-website/SKILL.md`

- [ ] **Step 1: Create skill with ONYX brand guide + page structure**

Content:
- ONYX color palette (#060609, #6A5CFF, glass effects)
- Page structure (Hero → Features → How It Works → Screenshots → PLUS → Testimonials → FAQ → CTA → Footer)
- Tech stack (Next.js 15, Tailwind 4, shadcn, motion/react)
- Performance targets (LCP <2.5s, Lighthouse 90+)
- SEO checklist (meta tags, OG, structured data)
- Component sources (shadcn MCP → base, magic MCP → marketing blocks)
- Brand guidelines (fonts, border-radius, spacing)

- [ ] **Step 2: Commit**
```bash
git add .claude/skills/onyx-website/
git commit -m "feat(claude): add onyx-website design skill for marketing site"
```

---

## Task 6: Set up 21st.dev AI chat agent (optional)

**What:** AI assistant widget on the ONYX landing page. Visitors can ask about the app.

- [ ] **Step 1: Create agent project**
```bash
mkdir -p website/agents/onyx-assistant
```

- [ ] **Step 2: Write agent definition**

File: `website/agents/onyx-assistant/index.ts`
```typescript
import { agent } from "@21st-sdk/agent"

export default agent({
  model: "claude-sonnet-4-6",
  runtime: "claude-code",
  systemPrompt: `You are ONYX — AI assistant for a Telegram dating app.
    Answer questions about features, pricing (PLUS subscription via Telegram Stars),
    privacy, verification, and how to get started.
    Be friendly, concise, professional.
    Respond in the same language as the user's message.`,
  maxTurns: 10,
})
```

- [ ] **Step 3: Deploy**
```bash
npx @21st-sdk/cli login
npx @21st-sdk/cli deploy
```

- [ ] **Step 4: Add chat widget to landing page**

```tsx
import { AgentChat, createAgentChat } from "@21st-sdk/nextjs"
import { useChat } from "@ai-sdk/react"

const chat = createAgentChat({
  agent: "onyx-assistant",
  tokenUrl: "/api/an-token",
})
```

---

## Task 7: Enhance superkit ui-reviewer with UX Pro Max checks

**Files:**
- Modify: `/Users/ivankudzin/cursor/claude-code-superkit/packages/core/agents/ui-reviewer.md`

- [ ] **Step 1: Add these checks to the checklist:**
- Touch targets ≥ 44x44px on mobile
- Color contrast WCAG AAA (4.5:1 text, 3:1 large text)
- `prefers-reduced-motion` support
- No horizontal scrolling on mobile (375px min)
- Loading states for all async operations
- Error recovery UX (retry, back, clear)
- Empty states for lists/feeds
- No emojis as icons (SVG: Heroicons/Lucide)
- All clickable → `cursor-pointer`
- Hover transitions avoid layout shifts
- Fixed navbar → content visibility check (no overlap)

- [ ] **Step 2: Commit in superkit repo**

---

## Task 8: Update superkit README — recommended tools

**Files:**
- Modify: `/Users/ivankudzin/cursor/claude-code-superkit/README.md`

- [ ] **Step 1: Add "Recommended Companion Tools" section**

```markdown
## Recommended Companion Tools

### Skills (install separately)
| Skill | What | Link |
|-------|------|------|
| ui-ux-pro-max | Design system generation (161 rules, 71 styles, 73 fonts) | [GitHub](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| app-store-preflight | iOS/macOS App Store review validator | [GitHub](https://github.com/truongduy2611/app-store-preflight-skills) |

### MCP Servers (add to settings.json)
| Server | What | Package |
|--------|------|---------|
| 21st.dev magic | UI component search/generation | `@21st-dev/magic@latest` |
| shadcn | shadcn/ui component library | `shadcn-mcp@latest` |
| playwright | Browser automation/screenshots | Plugin (built-in) |
| context7 | Library docs lookup | Plugin (built-in) |

### Platforms
| Platform | What | Link |
|----------|------|------|
| 21st.dev | AI agent deployment + community components | [21st.dev](https://21st.dev) |
```

- [ ] **Step 2: Commit in superkit repo**

---

## Task 9: Verify everything

- [ ] **Step 1: Check skills installed**
```bash
ls -la .claude/skills/ | grep -E "ui-ux|app-store|onyx-website"
```

- [ ] **Step 2: Check MCP servers in settings.json**
```bash
cat .claude/settings.json | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('mcpServers',{}), indent=2))"
```

- [ ] **Step 3: Check docs exist**
```bash
ls docs/website-design/
```

- [ ] **Step 4: Push**
```bash
git push origin main
```

---

## Execution Order

| Task | Зависимости | Время |
|------|------------|-------|
| 1 (ui-ux-pro-max) | None | 2 min |
| 2 (app-store-preflight) | None | 2 min |
| 3 (magic MCP) | Нужен API key от 21st.dev | 5 min + signup |
| 4 (shadcn MCP) | None | 2 min |
| 5 (onyx-website skill) | None | 5 min |
| 6 (AI chat agent) | Task 3 done + 21st.dev account | 15 min |
| 7-8 (superkit updates) | None | 5 min |
| 9 (verify) | All done | 2 min |

Tasks 1-2, 4-5, 7-8 можно выполнить сразу. Task 3 и 6 требуют API key от 21st.dev.
