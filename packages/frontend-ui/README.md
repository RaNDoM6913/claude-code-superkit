# frontend-ui

Self-contained package for **2D frontend UI design & polish**. Sibling to `frontend-3d/` (which covers WebGL / R3F / Three.js). Opt-in — activates only when your project has UI files (`.tsx`, `.jsx`, `.ts`, `.css`, `.html`, `.vue`).

## Philosophy

1. **Auto-dispatch, not slash-commands.** Agents fire automatically based on file patterns and user intent ("audit", "review", "polish", "critique"). You don't call `/impeccable audit` — Claude figures out the right specialist from context.
2. **Auto-loaded knowledge.** Rules scope to UI file paths via `applyWhenPaths` — when you edit `.tsx`, Claude receives typography / color / motion guidelines automatically.
3. **Per-project tailoring from existing docs.** Agents read your `CLAUDE.md` and `docs/architecture/*` in Phase 0 to infer brand / audience / tone. Auto-memory fills gaps over time. One targeted question asked mid-task only when genuinely ambiguous — no upfront questionnaires.
4. **Reject AI monoculture.** Explicit lists of banned fonts (Inter, DM Sans, Fraunces, Plus Jakarta Sans…), banned colors (pure black/white, cyan-on-dark, purple-to-blue gradients), and banned layouts (nested cards, identical card grids, centered everything).

## What's inside

| Type | Count | Files |
|------|-------|-------|
| Agents | 6 | `ui-reviewer`, `ui-typography-reviewer`, `ui-color-reviewer`, `ui-motion-reviewer`, `ui-interaction-reviewer`, `ui-design-critic` |

> **Name precedence:** the core package also ships a (simpler) `ui-reviewer`. On a fresh install with both selected, this package's umbrella copies later and wins — intended, it is the richer superset. In merge mode a pre-existing `ui-reviewer.md` is kept.
| Rules | 7 | `frontend-design-aesthetics`, `typography-guidelines`, `color-and-contrast`, `spatial-and-layout`, `motion-and-animation`, `interaction-polish`, `ui-anti-patterns` |
| Hooks | 3 | `ui-banned-fonts-check`, `ui-color-check`, `ui-animation-easing-check` |
| Skills | 1 | `impeccable-craft` (user-invocable, opt-in) |

## How agents know when to fire

Each agent's `description` field contains explicit dispatch rules. Example from `ui-reviewer`:

```
Dispatch automatically when:
- User asks for audit/review/polish/critique AND active edits are in
  .tsx/.jsx/.ts/.css/.html/.vue files
- 3+ frontend file edits completed in one task

Do NOT dispatch for:
- Backend code (.go/.py/.rs/.java)
- Test files (*.test.*, *.spec.*)
- Non-token config files
```

This is how `/audit` on a frontend change picks `ui-reviewer`, not `go-reviewer` — the agents themselves opt out of mismatched domains.

## Boundary with frontend-3d

- **frontend-3d** — WebGL / React Three Fiber / Three.js / GSAP-driven 3D scenes, shaders, lighting, glTF
- **frontend-ui** — everything else: 2D layouts, typography, color systems, 2D motion (modals, drawers, buttons), forms, responsive, UX writing

Both packages can be installed together without overlap.

## Attribution

Rules and anti-patterns in this package are adapted from:

- [Impeccable](https://github.com/pbakaus/impeccable) by Paul Bakaus (Apache License 2.0) — itself derived from [Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
- [Emil Kowalski's design engineering philosophy](https://emilkowal.ski/skill) — ideas only, re-expressed in our own prose

See `NOTICE.md` for full attribution and the LICENSE text.

## License

This package is licensed under the same terms as the parent superkit (MIT) for the original material, with Apache-2.0 for portions derived from Impeccable. See `NOTICE.md`.
