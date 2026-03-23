---
name: dependency-checker
description: Audit dependencies — npm audit, govulncheck, pip-audit, cargo-audit, outdated packages, update plan
user-invocable: false
---

# Dependency Checker

Audit all project dependencies for outdated packages, security vulnerabilities, and breaking changes. Produce a prioritized update plan. Multi-stack aware.

## Detection Strategy

Scan the project to find all dependency manifests:
- `**/package.json` (not in `node_modules/`) — npm/yarn/pnpm projects
- `**/go.mod` — Go modules
- `**/requirements.txt` / `**/pyproject.toml` / `**/Pipfile` — Python projects
- `**/Cargo.toml` — Rust projects
- `**/pom.xml` / `**/build.gradle` — Java projects
- `**/Gemfile` — Ruby projects

## Audit Process

### Phase 1: Outdated Packages

For each dependency manifest found:

**npm**:
```bash
npm outdated --json 2>/dev/null
```

**Go**:
```bash
go list -m -u all 2>/dev/null | grep '\[.*\]'
```

**Python**:
```bash
pip list --outdated --format=json 2>/dev/null
```

**Rust**:
```bash
cargo outdated 2>/dev/null
```

For each outdated package, note:
- Current version vs latest
- Major/minor/patch bump
- Production or dev dependency

### Phase 2: Security Audit

**npm**:
```bash
npm audit --production 2>/dev/null
```

**Go** (if govulncheck installed):
```bash
govulncheck ./... 2>/dev/null || echo "govulncheck not installed — install with: go install golang.org/x/vuln/cmd/govulncheck@latest"
```

**Python** (if pip-audit installed):
```bash
pip-audit 2>/dev/null || echo "pip-audit not installed — install with: pip install pip-audit"
```

**Rust** (if cargo-audit installed):
```bash
cargo audit 2>/dev/null || echo "cargo-audit not installed — install with: cargo install cargo-audit"
```

### Phase 3: Categorize by Risk

#### CRITICAL — Security vulnerabilities with known exploits
- npm audit `critical` or `high` severity
- govulncheck/pip-audit/cargo-audit findings with CVE
- Dependencies with known RCE, injection, or auth bypass

#### HIGH — Major version updates with breaking changes
- Major version bumps (v2 -> v3)
- Core frameworks and libraries
- Changes that require code modifications

#### MEDIUM — Minor/patch updates for production dependencies
- Minor version bumps with new features
- Patch updates fixing bugs
- Production dependencies only

#### LOW — Dev dependency updates
- Dev-only packages (linters, test tools, build plugins)
- Patch updates for stable libraries

### Phase 4: Check for Breaking Changes (HIGH-risk only)

For HIGH-risk updates:
- Check the package's changelog or GitHub releases for migration guides
- Note specific breaking changes that affect the project
- Estimate effort to migrate

### Phase 5: Build Update Plan

Order updates from safest to riskiest:

1. **Security patches first** (CRITICAL) — apply immediately
2. **Patch updates** (MEDIUM/LOW) — safe to batch
3. **Minor updates** (MEDIUM) — test after applying
4. **Major updates** (HIGH) — one at a time, with thorough testing

For each update group, note:
- Which files need changes (manifest, lock file, source code)
- Post-update verification commands

## Output Format

### Security Findings

| Package | Ecosystem | Severity | CVE | Description | Fix Version |
|---------|-----------|----------|-----|-------------|-------------|

### Outdated Packages

#### [Directory path]

| Package | Current | Latest | Type | Risk |
|---------|---------|--------|------|------|

(Repeat for each directory with dependencies)

### Update Plan

**Step 1 (CRITICAL)**: Security patches
```bash
# Commands to fix critical vulnerabilities
```

**Step 2 (LOW risk)**: Dev dependency patches
```bash
# Commands to update dev dependencies
```

**Step 3 (MEDIUM)**: Production patches
```bash
# Commands to update production dependencies
```

**Step 4 (HIGH)**: Major updates (one at a time)
```
1. Update X to vN — breaking changes: [list]
   Verify: [verification command]
2. Update Y to vM — breaking changes: [list]
   Verify: [verification command]
```

### Risk Summary
**X critical, Y high, Z medium, W low** — total packages needing attention.
