---
name: tree-generator
description: Generate project directory tree documentation — auto-detect structure, filter noise, output clean annotated markdown trees into docs/trees/
tokens: 1270
model: opus
allowed-tools: Bash, Read, Glob, Write
---

# Tree Generator

Generate clean, annotated directory-tree documentation files into `docs/trees/`.

## Hard Rules

- Depths are fixed: `tree-monorepo.md` = depth 3; per-component files = depth 4.
- "Major component" is decided by the Component Rule in Step 1 — never by guessing.
- Every written file starts with the auto-generated header template from Step 4.
- Trees are always written in indented tree form; if the `find` fallback is used, reformat its flat paths into a tree first — never paste a flat path list into a doc.
- Completion is claimed only after the Done gate passes.

## Phase 0 — Load Project Context

Read if present, skip silently if absent: `CLAUDE.md` or `AGENTS.md`; `docs/architecture/*.md` that describe layout. Use it to: learn the documented top-level structure and reuse its directory descriptions as annotations.

## Process

### Step 1 — Detect components

**Component Rule** — a directory is a major component if EITHER:
1. It contains its own root marker — `package.json`, `go.mod`, `Cargo.toml`, or `pyproject.toml` — and is not the repo root; OR
2. It is a top-level directory named `src`, `backend`, `frontend`, `cmd`, or `internal`.

Detection command:

```bash
find . -maxdepth 3 -not -path '*/node_modules/*' -not -path '*/.git/*' \
  \( -name go.mod -o -name package.json -o -name Cargo.toml -o -name pyproject.toml \)
```

Branches (explicit — no other modes exist):
- **2+ components matched** → monorepo mode: write `tree-monorepo.md` PLUS one `tree-{component}.md` per component.
- **0–1 components matched** (markers only at repo root, or nothing) → single-component mode: write ONLY `tree-monorepo.md`. This is also the default when detection is ambiguous.

### Step 2 — Generate trees (two depth variants)

Overview — always, depth 3, from repo root:

```bash
tree -I 'node_modules|.git|__pycache__|vendor|dist|build|.next|.cache|*.pyc|.DS_Store' \
     --dirsfirst -L 3
```

Per component — monorepo mode only, depth 4:

```bash
tree -I 'node_modules|.git|__pycache__|vendor|dist|build|.next|.cache|*.pyc|.DS_Store' \
     --dirsfirst -L 4 <component-dir>
```

Fallback if `tree` is missing (`command -v tree` fails) — same depth as the variant it replaces:

```bash
find <dir> -maxdepth <3 or 4> -not -path '*/node_modules/*' -not -path '*/.git/*' \
     -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/__pycache__/*' \
     -not -path '*/vendor/*' -not -path '*/.next/*' -not -path '*/.cache/*' | sort
```

The fallback prints flat paths — reformat them into indented tree form (directories first, `├──`/`└──` connectors) before writing. Do not truncate with `head`: the `-maxdepth` limit already bounds output. If one file would still exceed ~400 lines, reduce its depth by 1 and note the reduced depth in that file's header.

### Step 3 — Annotate key directories

Add one-line inline comments to directories (not individual files). Source annotations from CLAUDE.md / architecture docs when available; otherwise infer from a quick Glob of the directory's contents.

```
src/
├── api/          # API client functions
├── components/   # Reusable UI components
├── hooks/        # Custom React hooks
└── pages/        # Page components
```

### Step 4 — Write to docs/trees/

- Always: `docs/trees/tree-monorepo.md` — depth-3 overview.
- Monorepo mode only: `docs/trees/tree-{component}.md` — depth 4, one per component.

Get `{date}` from `date +%Y-%m-%d`. Each file starts with:

```markdown
# Project Tree — {component}
> Auto-generated on {date}. Regenerate with tree-generator agent.
```

## Output Contract

After writing the files, report exactly in this shape:

```
## Tree Generation Report
Mode: monorepo | single-component
Components detected: <name (marker)> list, or "none — single-component"

| File | Depth | Lines |
|------|-------|-------|
| docs/trees/... | N | NN |

Verified: <real `ls docs/trees/` output>
Assumed: <anything not checked, or "nothing">
```

Mini example:

```
## Tree Generation Report
Mode: monorepo
Components detected: backend (go.mod), frontend (package.json)

| File | Depth | Lines |
|------|-------|-------|
| docs/trees/tree-monorepo.md | 3 | 58 |
| docs/trees/tree-backend.md | 4 | 112 |
| docs/trees/tree-frontend.md | 4 | 96 |

Verified: ls docs/trees/ → tree-backend.md tree-frontend.md tree-monorepo.md
Assumed: nothing
```

## Done ONLY when

- [ ] `docs/trees/tree-monorepo.md` exists on disk — plus one `tree-{component}.md` per detected component in monorepo mode — verified with `ls docs/trees/`, not from memory.
- [ ] Every written file starts with the auto-generated header.
- [ ] Report separates VERIFIED (tool output seen) from ASSUMED (not checked).

Not all boxes checked → say what is missing; do not claim completion.

## Recap — non-negotiables

- Depth 3 for `tree-monorepo.md`; depth 4 for per-component files.
- Component Rule decides "major"; 0–1 components → `tree-monorepo.md` only.
- `find` fallback output is reformatted into indented tree form; no `head` truncation.
- Done gate: files verified on disk with `ls` before claiming completion.
