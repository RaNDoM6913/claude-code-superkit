---
description: Run AgentShield security scan on .claude/ configurations — detect secrets, permission issues, hook injection, MCP vulnerabilities
argument-hint: "[--fix] [--opus] [--format json|markdown]"
allowed-tools: Bash, Read
---

# Security Scan

Run AgentShield to audit `.claude/` configurations for vulnerabilities (102 rules, 5 categories), then report the score and findings.

## Target

$ARGUMENTS

## Hard Rules

- Report ONLY what the scanner actually output — never invent a score, grade, or finding. If the scan cannot run or exits with an error, report that error and stop.
- AgentShield grades on its own scale `critical / high / medium / low`. Relay it verbatim; do NOT remap it to the kit's CRITICAL / WARNING / SUGGESTION.
- Run the scan at most once, using the single Step 2 command that matches the flags in Target.
- `--opus` needs `ANTHROPIC_API_KEY` set in the environment; if it is unset, run without `--opus` and say so.
- Emit the report only after the scan command has actually returned.

## Step 1 — Check AgentShield availability

```bash
npx ecc-agentshield --version
```

Branch on the result:
- **Prints a version** → installed; go to Step 2.
- **Errors because the package is not cached yet** → `npx` will download `ecc-agentshield` on first run in Step 2; go to Step 2.
- **`npx` unavailable, no network, or download fails** → report `AgentShield unavailable: <error>` and stop. Do not fabricate results.

Done when: you know whether the scan can run.

## Step 2 — Run the scan

Select ONE command by the flags in Target (flags are independent; if Target names more than one, append each form to the single `scan` command):

| Flag in Target | Command |
|----------------|---------|
| (none) | `npx ecc-agentshield scan` |
| `--fix` | `npx ecc-agentshield scan --fix` — auto-remediate safe issues |
| `--opus` | `npx ecc-agentshield scan --opus --stream` — AI deep analysis (needs `ANTHROPIC_API_KEY`) |
| `--format json` | `npx ecc-agentshield scan --format json` — for CI integration |
| `--format markdown` | `npx ecc-agentshield scan --format markdown` — for reports |

If the command exits non-zero for a reason other than findings-present (e.g. a crash), report the exit code and stderr; do not invent a score.

Done when: the scan command has returned output, or its failure has been captured.

## Step 3 — Report results

Extract from the scanner output and fill the Output Contract:
- Security score (0–100) and grade (A–F)
- Findings grouped by AgentShield severity: `critical → high → medium → low`
- Category breakdown (secrets, permissions, hooks, MCP, agents)

Threshold rules:
- Score < 70 → recommend re-running with `--fix`.
- Any `critical` findings → list the specific files and remediation steps.

Done when: score, grade, findings-by-severity, category breakdown, and the recommendation line are all present in the report.

## What it checks (102 rules)

| Category | Rules | Examples |
|----------|:-----:|---------|
| Secrets | 10 | API keys, tokens, passwords in config files |
| Permissions | 10 | Wildcard Bash(*), missing deny lists |
| Hooks | 34 | Command injection, data exfiltration, silent error suppression |
| MCP Servers | 23 | Supply chain (npx -y), shell metacharacters, network exposure |
| Agent Configs | 25 | Prompt injection, hidden instructions, auto-run directives |

## Output Contract

```
## Security Scan — AgentShield

Score: <0-100>   Grade: <A-F>
Command run: <exact command from Step 2>

### Findings by severity (AgentShield scale, not the kit's)
| Severity | Count |
|----------|:-----:|
| critical | <N> |
| high     | <N> |
| medium   | <N> |
| low      | <N> |

### Category breakdown
| Category      | Findings |
|---------------|:--------:|
| Secrets       | <N> |
| Permissions   | <N> |
| Hooks         | <N> |
| MCP Servers   | <N> |
| Agent Configs | <N> |

### Critical findings   (only if any)
- <file> — <issue> → <remediation>

Recommendation: <e.g. "Score 62 < 70 — re-run with --fix" | "No critical findings; score 88 (B)">
```

Mini example:

```
## Security Scan — AgentShield

Score: 62   Grade: D
Command run: npx ecc-agentshield scan

### Findings by severity (AgentShield scale, not the kit's)
| Severity | Count |
|----------|:-----:|
| critical | 1 |
| high     | 3 |
| medium   | 5 |
| low      | 2 |

### Category breakdown
| Category      | Findings |
|---------------|:--------:|
| Secrets       | 1 |
| Permissions   | 4 |
| Hooks         | 3 |
| MCP Servers   | 2 |
| Agent Configs | 1 |

### Critical findings
- .claude/settings.json — hardcoded API key in env block → move to a secret manager / .env not committed

Recommendation: Score 62 < 70 — re-run with --fix.
```

## Recap — non-negotiables

- Never fabricate a score or finding; the scan must actually run first, and a failed scan is reported as an error.
- AgentShield's `critical/high/medium/low` is the tool's own scale — relay it verbatim, do not remap.
- Run the scan at most once, matching the Target flags.
- Score < 70 → recommend `--fix`; any `critical` finding → list the files and their remediation.
