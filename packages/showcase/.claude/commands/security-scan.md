---
description: Run AgentShield security scan on .claude/ configurations — detect secrets, permission issues, hook injection, MCP vulnerabilities
argument-hint: "[--fix] [--opus]"
allowed-tools: Bash, Read
---

# Security Scan

Run AgentShield to audit .claude/ configurations for vulnerabilities (102 rules, 5 categories).

## Steps

### 1. Check AgentShield is available

```bash
npx ecc-agentshield --version 2>/dev/null || echo "AgentShield not found — will use npx"
```

### 2. Run scan

Parse $ARGUMENTS:
- **Default:** `npx ecc-agentshield scan`
- **`--fix`:** `npx ecc-agentshield scan --fix` (auto-remediate safe issues)
- **`--opus`:** `npx ecc-agentshield scan --opus --stream` (AI deep analysis — needs ANTHROPIC_API_KEY)
- **`--format json`:** `npx ecc-agentshield scan --format json` (for CI integration)
- **`--format markdown`:** `npx ecc-agentshield scan --format markdown` (for reports)

### 3. Report results

Show:
- Security score (0-100) and grade (A-F)
- Findings grouped by severity (critical -> high -> medium -> low)
- Category breakdown (secrets, permissions, hooks, MCP, agents)

If score < 70: recommend running with `--fix`.
If critical findings: list specific files and remediation steps.

### What it checks (102 rules)

| Category | Rules | Examples |
|----------|:-----:|---------|
| Secrets | 10 | API keys, tokens, passwords in config files |
| Permissions | 10 | Wildcard Bash(*), missing deny lists |
| Hooks | 34 | Command injection, data exfiltration, silent error suppression |
| MCP Servers | 23 | Supply chain (npx -y), shell metacharacters, network exposure |
| Agent Configs | 25 | Prompt injection, hidden instructions, auto-run directives |

$ARGUMENTS
