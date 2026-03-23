# Chapter 12 — Security Scanning

## Why Scan .claude/ Configurations?

Your `.claude/` directory contains executable infrastructure:

- **Hooks** run shell scripts on every edit, commit, and session event — they are code execution vectors
- **Permissions** control what tools Claude can use — wildcards mean unrestricted access
- **MCP servers** are external processes with network access — supply chain risk
- **Agent prompts** guide AI behavior — injection can override safety guardrails

A misconfigured `.claude/` directory can leak secrets, allow command injection, or grant unintended file system access. Scanning catches these issues before they reach production.

## AgentShield

[AgentShield](https://github.com/affaan-m/agentshield) is a purpose-built scanner for AI agent configurations. It checks 102 rules across 5 categories: secrets, permissions, hooks, MCP servers, and agent configs.

### Running Locally

```bash
# Quick scan — checks 102 rules, outputs findings and score
npx ecc-agentshield scan

# Auto-fix safe issues (quoting variables, removing wildcards)
npx ecc-agentshield scan --fix

# Deep analysis with Opus (requires ANTHROPIC_API_KEY)
npx ecc-agentshield scan --opus --stream

# Output formats for CI
npx ecc-agentshield scan --format json
npx ecc-agentshield scan --format markdown
```

### Using the /security-scan Command

Inside Claude Code, run:

```
/security-scan            # Default scan
/security-scan --fix      # Auto-remediate
/security-scan --opus     # AI deep analysis
```

The command wraps AgentShield with contextual reporting — score, grade, findings by severity, and remediation steps.

## CI Integration

Add a GitHub Action to scan on every push to `.claude/` or `packages/`:

```yaml
name: AgentShield Security Scan

on:
  push:
    paths: ['.claude/**', 'packages/**']
  pull_request:
    paths: ['.claude/**', 'packages/**']

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

Set `fail-on-findings: "true"` to block PRs with high/critical issues. Use `"false"` for advisory-only scans on experimental directories.

## Red Team / Blue Team Pattern

For deeper analysis, use the `red-blue-auditor` agent (in `packages/extras/`). It runs a 3-phase adversarial audit:

1. **Red Team** — thinks like an attacker, explores injection vectors, identifies attack chains
2. **Blue Team** — evaluates existing defenses, identifies gaps, recommends hardening
3. **Auditor** — synthesizes both into a prioritized defense matrix with risk score

This is more thorough than automated scanning — it finds multi-step exploits where individual findings chain together (e.g., hook injection + wildcard permissions = remote code execution).

## Common Findings and Fixes

### Wildcard Bash Permissions

```json
// Bad — allows any shell command
"allow": ["Bash"]

// Good — restrict to specific command prefixes
"allow": ["Bash(git *)", "Bash(npm *)", "Bash(go *)"]
```

### Hardcoded Secrets

```json
// Bad — literal API key in settings
"env": { "API_KEY": "sk-abc123..." }

// Good — reference environment variable
"env": { "API_KEY": "${ANTHROPIC_API_KEY}" }
```

### Unquoted Variables in Hooks

```bash
# Bad — command injection via crafted filename
FILE_PATH=$1
echo $FILE_PATH

# Good — always double-quote
FILE_PATH="$1"
echo "$FILE_PATH"
```

### Unpinned MCP Packages

```json
// Bad — auto-installs latest, supply chain risk
"command": "npx", "args": ["-y", "some-mcp-server"]

// Good — pin specific version
"command": "npx", "args": ["-y", "some-mcp-server@1.2.3"]
```

## Security Score Targets

| Grade | Score | Meaning |
|-------|-------|---------|
| A | 90-100 | Production-ready, no critical/high findings |
| B | 80-89 | Good, minor hardening opportunities |
| C | 70-79 | Acceptable, should fix before sharing configs |
| D | 60-69 | Needs work, multiple high-severity findings |
| F | 0-59 | Unsafe, critical vulnerabilities present |

Target **A (90+)** for shared/published configurations. **B (80+)** is acceptable for internal projects.
