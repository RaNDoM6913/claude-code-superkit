---
name: tree-generator
description: Generate project directory tree documentation — auto-detect structure, filter noise, output clean markdown trees
user-invocable: false
---

# Tree Generator

Generate clean, annotated project tree files for documentation.

## Phase 0: Load Project Context

Read if exists:
1. `AGENTS.md` — know project structure, key directories

## Process

### Step 1: Detect project structure
- Find root markers: go.mod, package.json, Cargo.toml, pyproject.toml
- Identify major directories (src/, backend/, frontend/, cmd/, internal/, etc.)
- Detect monorepo structure (multiple package.json, go.mod in subdirs)

### Step 2: Generate tree for each component

Run tree command with smart exclusions:

```bash
tree -I 'node_modules|.git|__pycache__|vendor|dist|build|.next|.cache|*.pyc|.DS_Store' \
     --dirsfirst -L 4
```

If `tree` not available, use:
```bash
find . -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' \
       -not -path '*/__pycache__/*' -not -path '*/vendor/*' -not -path '*/.next/*' \
       | head -200 | sort
```

### Step 3: Annotate key directories

Add inline comments for important directories:
```
src/
├── api/          # API client functions
├── components/   # Reusable UI components
├── hooks/        # Custom React hooks
└── pages/        # Page components
```

### Step 4: Write to docs/trees/

Create these files:
- `docs/trees/tree-monorepo.md` — full project overview (depth 2-3)
- `docs/trees/tree-{component}.md` — per major component (depth 4)

Each file starts with:
```markdown
# Project Tree — {component}
> Auto-generated on {date}. Regenerate with tree-generator agent.
```

## Output Format

Use markdown code blocks with annotations. One file per major component.
