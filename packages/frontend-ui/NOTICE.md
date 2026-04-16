# Attribution and Third-Party Notices

This package incorporates material from the following sources.

---

## 1. Impeccable (Apache License 2.0)

**Source:** https://github.com/pbakaus/impeccable
**Author:** Paul Bakaus and contributors
**License:** Apache License, Version 2.0

**Copyright notice:**
```
Copyright 2025 Paul Bakaus
Licensed under the Apache License, Version 2.0 (the "License");
you may not use the files derived from this source except in compliance with
the License. You may obtain a copy of the License at:

    http://www.apache.org/licenses/LICENSE-2.0
```

The Impeccable project itself builds upon Anthropic's
[`frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
skill, which is released under the same Apache-2.0 license.

### Material incorporated

The following rule files in `packages/frontend-ui/rules/` contain material
adapted, summarised, or directly ported from Impeccable's reference
documentation:

| File | Adapted from |
|------|--------------|
| `frontend-design-aesthetics.md` | Impeccable `source/skills/impeccable/SKILL.md` (principles sections) |
| `typography-guidelines.md` | Impeccable `source/skills/impeccable/reference/typography.md` |
| `color-and-contrast.md` | Impeccable `source/skills/impeccable/reference/color-and-contrast.md` |
| `spatial-and-layout.md` | Impeccable `source/skills/impeccable/reference/spatial-design.md` + `responsive-design.md` |
| `motion-and-animation.md` | Impeccable `source/skills/impeccable/reference/motion-design.md` (partial) |
| `interaction-polish.md` | Impeccable `source/skills/impeccable/reference/interaction-design.md` + `ux-writing.md` |
| `ui-anti-patterns.md` | Impeccable's `reflex_fonts_to_reject` list and scattered "DO NOT" blocks |

Adaptations include: rephrasing for internal consistency with superkit
conventions, merging with material from other sources, adding
`applyWhenPaths` frontmatter for auto-loading, and removing the
skill-specific `teach` / `craft` flow scaffolding.

### Full Apache-2.0 license text

See https://www.apache.org/licenses/LICENSE-2.0 for the full, canonical
license text. The short notice required by the license is reproduced above;
the full text is not duplicated here to keep this notice concise but applies
in its entirety to all material listed in the "Material incorporated" table.

---

## 2. Emil Kowalski's Design Engineering philosophy (ideas only)

**Source:** https://github.com/emilkowalski/skill and https://emilkowal.ski/skill
**Author:** Emil Kowalski
**License:** No LICENSE file present in the source repository at the time of review

Because the source repository did not include a license at the time this
package was authored, the **prose** from Emil's skill file has NOT been
copied. Only the following categories of material have been incorporated,
and all of it has been re-expressed in our own wording:

1. **Factual content:** easing curve `cubic-bezier` constants; animation
   duration tables (buttons 100-160ms, tooltips 125-200ms, dropdowns
   150-250ms, modals 200-500ms). Technical facts are not copyrightable.
2. **Methodology patterns:** the structure of the "Animation Decision
   Framework" (four sequential questions: should this animate? what is the
   purpose? what easing? how fast?). The structure is a pattern; our
   implementation uses our own explanations and examples.
3. **Output-format convention:** the use of a `| Before | After | Why |`
   markdown table for UI review output. Applied as a formatting pattern in
   our agents, not as copied prose.

Specifically **not** incorporated: Emil's philosophical framing sections
("Taste is trained, not innate", "Unseen details compound", "Beauty is
leverage"), his author's-voice examples, and any quoted passages from other
authors (including the Paul Graham quotation).

If Emil's repository later adds an LICENSE permitting redistribution, this
notice should be updated to reflect that and additional material may be
incorporated directly.

---

## How to update this notice

When adding material from a new source:
1. Add a new numbered section here with source, author, license.
2. If the new source is under a license requiring a NOTICE entry (Apache-2.0
   and similar), reproduce the required notice here.
3. List which files in this package incorporate material from the new
   source.
4. Commit the NOTICE update in the same commit as the first file that
   incorporates the material.
