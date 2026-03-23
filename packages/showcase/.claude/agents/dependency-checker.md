---
name: dependency-checker
description: Audit npm and Go dependencies for outdated packages, security vulnerabilities, and suggest update plan
model: sonnet
allowed-tools: Bash, Read, Grep, Glob
---

# Dependency Checker — TGApp

Audit all project dependencies (npm + Go modules) for outdated packages, security vulnerabilities, and breaking changes. Produce a prioritized update plan.

## Audit Process

### Phase 1: npm Outdated Packages

Check each frontend project:

```bash
cd frontend && npm outdated --json 2>/dev/null
cd adminpanel/frontend && npm outdated --json 2>/dev/null
```

For each outdated package, note:
- Current version vs latest
- Whether it's a major/minor/patch bump
- Whether it's a production or dev dependency

### Phase 2: Go Module Updates

```bash
cd backend && go list -m -u all 2>/dev/null | grep '\[.*\]'
```

This shows modules with available updates (marked with `[v...]`).

Also check bot modules:
```bash
cd tgbots/bot_moderator && go list -m -u all 2>/dev/null | grep '\[.*\]'
cd tgbots/bot_support && go list -m -u all 2>/dev/null | grep '\[.*\]'
cd adminpanel/backend/login && go list -m -u all 2>/dev/null | grep '\[.*\]'
```

### Phase 3: Security Audit

**npm**:
```bash
cd frontend && npm audit --production 2>/dev/null
cd adminpanel/frontend && npm audit --production 2>/dev/null
```

**Go** (if govulncheck is installed):
```bash
cd backend && govulncheck ./... 2>/dev/null || echo "govulncheck not installed"
```

### Phase 4: Categorize by Risk

Assign each update a risk level:

#### CRITICAL — Security vulnerabilities with known exploits
- npm audit `critical` or `high` severity
- govulncheck findings with CVE
- Dependencies with known RCE, injection, or auth bypass

#### HIGH — Major version updates with breaking changes
- Major version bumps (e.g., v2 -> v3)
- Frameworks and core libraries (React, Vite, chi, pgx)
- Changes that require code modifications

#### MEDIUM — Minor/patch updates for production dependencies
- Minor version bumps with new features
- Patch updates fixing bugs
- Production dependencies only

#### LOW — Dev dependency updates
- Dev-only packages (eslint, typescript, vite plugins, test tools)
- Patch updates for stable libraries

### Phase 5: Check for Breaking Changes

For HIGH-risk updates, read changelogs:
- Read `CHANGELOG.md` or `MIGRATION.md` if available in `node_modules/<package>/`
- Check the package's GitHub releases for migration guides
- Note specific breaking changes that affect TGApp code

### Phase 6: Build Update Plan

Order updates from safest to riskiest:

1. **Security patches first** (CRITICAL) — apply immediately
2. **Patch updates** (MEDIUM/LOW) — safe to batch
3. **Minor updates** (MEDIUM) — test after applying
4. **Major updates** (HIGH) — one at a time, with testing

For each update group, note:
- Which files need changes (`package.json`, `go.mod`, source code)
- Whether a lock file regeneration is needed
- Post-update verification commands

## Output Format

### Security Findings

| Package | Severity | CVE | Description | Fix Version |
|---------|----------|-----|-------------|-------------|
| ... | CRITICAL | CVE-... | ... | x.y.z |

### Outdated Packages

#### Frontend (`frontend/`)

| Package | Current | Latest | Type | Risk |
|---------|---------|--------|------|------|
| react | 18.3.x | 19.x.x | major | HIGH |
| ... | ... | ... | ... | ... |

#### Admin (`adminpanel/frontend/`)

| Package | Current | Latest | Type | Risk |
|---------|---------|--------|------|------|
| ... | ... | ... | ... | ... |

#### Backend (`backend/`)

| Module | Current | Latest | Type | Risk |
|--------|---------|--------|------|------|
| ... | ... | ... | ... | ... |

### Update Plan

**Step 1 (CRITICAL)**: Security patches
```bash
cd frontend && npm audit fix
# or specific: npm install package@version
```

**Step 2 (LOW risk)**: Dev dependency patches
```bash
cd frontend && npm update --save-dev
```

**Step 3 (MEDIUM)**: Production patches
```bash
cd frontend && npm update --save
```

**Step 4 (HIGH)**: Major updates (one at a time)
```
1. Update X to vN — breaking changes: [list]
   Verify: npm run verify
2. Update Y to vM — breaking changes: [list]
   Verify: cd backend && make test
```

### Risk Summary
**X critical, Y high, Z medium, W low** — total packages needing attention.
