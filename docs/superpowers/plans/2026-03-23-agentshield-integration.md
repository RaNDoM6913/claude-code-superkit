# AgentShield Integration — Implementation Plan (Plan 8)

> Integrate AgentShield security scanner into TGApp and superkit — CI pipeline, local scanning, and security patterns.

**Goal:** Add automated security scanning of `.claude/` configurations to both projects. Protect against hardcoded secrets, permission misconfigs, hook injection, MCP vulnerabilities, and prompt injection.

**Tool:** [AgentShield](https://github.com/affaan-m/agentshield) — 102 rules, 5 categories, MIT license.

**What it scans:** secrets (14 patterns), permissions (10 rules), hooks (34 rules), MCP servers (23 rules), agent configs (25 rules).

---

## Task 1: Run initial scan on TGApp

**Working directory:** `/Users/ivankudzin/cursor/tgapp/`

- [ ] **Step 1: Run scan**
```bash
npx ecc-agentshield scan
```

- [ ] **Step 2: Run with detailed output**
```bash
npx ecc-agentshield scan --format markdown > docs/security-scan-report.md
```

- [ ] **Step 3: Review findings**

Expected issues to check:
- `settings.json` has `"allow": ["Bash"]` — likely flagged as wildcard permission
- Hooks use `$(cat)` and `$INPUT` — potential injection surface
- Any hardcoded paths or tokens in settings.local.json
- MCP server configs (currently none, clean)

- [ ] **Step 4: Fix critical/high findings**

Apply `--fix` for auto-fixable issues:
```bash
npx ecc-agentshield scan --fix
```

Review remaining manual fixes.

- [ ] **Step 5: Re-scan and verify score**
```bash
npx ecc-agentshield scan
```

Target: score ≥ 80 (grade A or B).

- [ ] **Step 6: Commit fixes**
```bash
git add .claude/
git commit -m "security(claude): fix AgentShield findings in .claude/ configs"
```

---

## Task 2: Run initial scan on superkit

**Working directory:** `/Users/ivankudzin/cursor/claude-code-superkit/`

- [ ] **Step 1: Scan core package**
```bash
npx ecc-agentshield scan --path packages/core/
```

- [ ] **Step 2: Scan showcase**
```bash
npx ecc-agentshield scan --path packages/showcase/.claude/
```

- [ ] **Step 3: Fix findings in core (these ship to every user!)**

Core findings are critical — every user who installs superkit inherits these configs.
- Tighten permissions in `settings.json`
- Harden hooks against injection
- Remove any accidental secrets

- [ ] **Step 4: Fix findings in showcase**

Showcase is sanitized TGApp — should be clean, but verify.

- [ ] **Step 5: Commit**
```bash
git add packages/
git commit -m "security: fix AgentShield findings in core and showcase"
```

---

## Task 3: Add GitHub Action to superkit

**Files:**
- Create: `.github/workflows/security.yml`

- [ ] **Step 1: Create workflow**

```yaml
name: AgentShield Security Scan

on:
  push:
    paths:
      - 'packages/core/**'
      - 'packages/codex/**'
      - 'packages/extras/**'
      - 'packages/stack-agents/**'
      - 'packages/stack-hooks/**'
      - 'packages/showcase/**'
      - 'setup.sh'
  pull_request:
    paths:
      - 'packages/**'
      - 'setup.sh'

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan core package
        uses: affaan-m/agentshield@v1
        with:
          path: "packages/core"
          min-severity: "medium"
          fail-on-findings: "true"

      - name: Scan showcase
        uses: affaan-m/agentshield@v1
        with:
          path: "packages/showcase/.claude"
          min-severity: "high"
          fail-on-findings: "false"
```

- [ ] **Step 2: Commit**
```bash
git add .github/workflows/security.yml
git commit -m "ci: add AgentShield security scan on push/PR"
```

---

## Task 4: Add GitHub Action to TGApp

**Files:**
- Create: `.github/workflows/claude-security.yml`

- [ ] **Step 1: Create workflow**

```yaml
name: Claude Config Security

on:
  push:
    paths:
      - '.claude/**'
  pull_request:
    paths:
      - '.claude/**'

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: AgentShield Scan
        uses: affaan-m/agentshield@v1
        with:
          path: ".claude"
          min-severity: "high"
          fail-on-findings: "true"
```

- [ ] **Step 2: Commit**
```bash
git add .github/workflows/claude-security.yml
git commit -m "ci: add AgentShield scan for .claude/ configs"
```

---

## Task 5: Add /security-scan command to superkit

**Files:**
- Create: `packages/core/commands/security-scan.md`

- [ ] **Step 1: Create command**

```markdown
---
description: Run AgentShield security scan on .claude/ configurations
argument-hint: "[--fix] [--opus]"
allowed-tools: Bash, Read
---

# Security Scan

Run AgentShield to audit .claude/ configurations for vulnerabilities.

## Steps

### 1. Check AgentShield is available
```bash
command -v agentshield || npx ecc-agentshield --version
```

### 2. Run scan

Parse $ARGUMENTS:
- Default: `npx ecc-agentshield scan`
- `--fix`: `npx ecc-agentshield scan --fix` (auto-remediate)
- `--opus`: `npx ecc-agentshield scan --opus --stream` (AI deep analysis, needs ANTHROPIC_API_KEY)

### 3. Report results

Show score, grade, and critical findings.
If score < 70: recommend running with `--fix`.

$ARGUMENTS
```

- [ ] **Step 2: Commit in superkit**
```bash
git add packages/core/commands/security-scan.md
git commit -m "feat(core): add /security-scan command (AgentShield integration)"
```

---

## Task 6: Enhance security-scanner agent with AgentShield patterns

**Files:**
- Modify: `packages/core/agents/security-scanner.md`

- [ ] **Step 1: Add Claude Code config checks (inspired by AgentShield)**

Add new section `## Claude Code Configuration Security` with checks:

1. **Secrets in settings** — grep `.claude/settings.json` and `settings.local.json` for API keys, tokens
2. **Wildcard permissions** — `Bash(*)`, `Write(*)` without deny lists
3. **Hook injection** — `$(...)` or backtick interpolation in hooks with unsanitized input
4. **Silent error suppression** — `2>/dev/null` or `|| true` hiding failures in hooks
5. **MCP supply chain** — `npx -y` auto-installing unvetted packages
6. **Agent prompt injection** — hidden instructions (zero-width chars, base64) in agent .md files
7. **Permission escalation** — `--dangerously-skip-permissions` in any script

These 7 checks complement our existing 18 OWASP checks — total becomes 25.

- [ ] **Step 2: Commit**
```bash
git add packages/core/agents/security-scanner.md
git commit -m "feat(core): add 7 Claude Code config security checks to security-scanner"
```

---

## Task 7: Add Red Team / Blue Team pattern as advanced agent

**Files:**
- Create: `packages/extras/red-blue-auditor.md`

- [ ] **Step 1: Create 3-phase adversarial security agent**

Inspired by AgentShield's Opus pipeline:

```markdown
---
name: red-blue-auditor
description: Adversarial security audit — Red Team (attack), Blue Team (defend), Auditor (synthesize)
model: opus
allowed-tools: Read, Grep, Glob, Bash
---

# Red Team / Blue Team Security Audit

3-phase adversarial security analysis. Deeper than standard security-scanner.

## Phase 1: Red Team (Attacker Perspective)

Think like an attacker. For each finding:
- What's the attack vector?
- Can findings be CHAINED? (e.g., hook injection + wildcard permission = RCE)
- What's the blast radius?
- How would you exploit this in practice?

## Phase 2: Blue Team (Defender Perspective)

For each Red Team finding:
- What existing protections are in place?
- What's missing?
- Recommend specific hardening measures
- Prioritize by effort vs impact

## Phase 3: Auditor (Synthesis)

Combine perspectives:
- Prioritized risk assessment (CRITICAL → LOW)
- Attack chain analysis (multi-step exploits)
- Actionable recommendations with specific code fixes
- Overall security posture rating

## Output Format
### Attack Chains (Red Team)
### Defenses (Blue Team)
### Recommendations (Auditor)
### Risk Score: X/100
```

- [ ] **Step 2: Commit**
```bash
git add packages/extras/red-blue-auditor.md
git commit -m "feat(extras): add red-blue-auditor adversarial security agent"
```

---

## Task 8: Update docs and README

**Files:**
- Modify: superkit `README.md` — add AgentShield to Recommended Tools
- Create: `docs/guide/12-security-scanning.md` — new guide chapter

- [ ] **Step 1: Add to README Recommended Tools section**

```markdown
### Security
| Tool | What | Install |
|------|------|---------|
| [AgentShield](https://github.com/affaan-m/agentshield) | Scan .claude/ configs for vulnerabilities (102 rules) | `npx ecc-agentshield scan` |
```

- [ ] **Step 2: Write guide chapter 12**

Content:
- Why scan .claude/ configs (hooks = code execution, permissions = access control)
- Running AgentShield locally (`npx ecc-agentshield scan`)
- Auto-fix (`--fix`)
- Opus deep analysis (`--opus`)
- CI integration (GitHub Action)
- /security-scan command
- Red Team / Blue Team pattern
- Common findings and how to fix them

- [ ] **Step 3: Commit**
```bash
git add README.md docs/guide/12-security-scanning.md
git commit -m "docs: add security scanning guide (chapter 12) and AgentShield to README"
```

---

## Summary

| Deliverable | Where | Description |
|-------------|-------|-------------|
| Initial scan + fixes | TGApp | Fix AgentShield findings in our .claude/ |
| Initial scan + fixes | superkit | Fix findings in core (ships to all users!) |
| GitHub Action CI | superkit | Auto-scan on push/PR to packages/ |
| GitHub Action CI | TGApp | Auto-scan on push/PR to .claude/ |
| /security-scan command | superkit core | Run AgentShield from Claude Code |
| security-scanner enhancement | superkit core | +7 Claude Code config checks (total 25) |
| red-blue-auditor | superkit extras | Adversarial 3-phase security agent |
| Guide chapter 12 | superkit docs | Security scanning documentation |

### Updated superkit totals (after Plan 8)

| Component | Before | After |
|-----------|:------:|:-----:|
| Core commands | 9 (after Plan 6) | **10** (+security-scan) |
| Extras agents | 2 | **3** (+red-blue-auditor) |
| Guide chapters | 11 (after Plans 6-7) | **12** (+security-scanning) |
| CI workflows | 0 | **1** (security.yml) |

### Full plan map

| # | План | Задач | Статус |
|---|------|:-----:|--------|
| 1 | Superkit Core | 16 | **Выполнен** |
| 2 | TGApp Refactor | 10 | **Выполнен** |
| 3 | Docs & Showcase | 11 | **Выполнен** |
| 4 | Codex Support | 8 | **Выполнен** |
| 5 | Website Design Tools | 9 | Готов |
| 6 | Docs Architecture | 9 | Готов |
| 7 | Context-Aware Agents | 14 | Готов |
| 8 | AgentShield Integration | 8 | Готов |
