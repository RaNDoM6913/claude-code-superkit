# red-blue-auditor — AgentShield

Adversarial security audit for Claude Code / Codex repos. Two complementary modes:

1. **Agent mode** — `agent.md` is an Opus-powered Red/Blue/Auditor prompt (3-phase
   adversarial analysis: attacker perspective, defender perspective, synthesis).
2. **SAST mode** — `scan.sh` runs static grep-based pattern matching against every
   file in the repo. Bearer-inspired, CI-friendly, zero dependencies.

Together they form an AgentShield-style defense-in-depth: the LLM finds multi-step
exploits and logic flaws, while the static scanner catches cheap mistakes
(committed secrets, wildcard permissions, shell injection vectors) before merge.

## Quick start

```bash
# One-shot scan from repo root
bash packages/extras/red-blue-auditor/scan.sh

# Limit scope
bash packages/extras/red-blue-auditor/scan.sh --path .claude/

# Fail the build if anything CRITICAL is found
bash packages/extras/red-blue-auditor/scan.sh --exit-on-critical
```

## Pattern file format

Each `patterns/*.txt` contains lines of the form:

```
SEVERITY|REGEX|DESCRIPTION
```

- `SEVERITY` — `CRITICAL`, `HIGH`, or `MEDIUM`
- `REGEX` — `grep -E` compatible expression
- `DESCRIPTION` — short (< 80 chars) human-readable label

Lines starting with `#` are comments. Blank lines are ignored.

Shipped pattern bundles:

| File | What it catches |
|------|-----------------|
| `secrets.txt` | 16 secret formats — OpenAI, Anthropic, AWS, GitHub, Slack, Stripe, Telegram, Discord, npm, Google, JWT |
| `hook-injection.txt` | curl/wget piped to shell, eval, unquoted `$VAR` in `bash -c`, reverse-shell gadgets |
| `permission-abuse.txt` | `Bash(*)`, `Write(*)`, `dangerouslyAllow*`, `dangerouslyDisable*`, wildcard `allowed-tools` |
| `mcp-risk.txt` | MCP commands running `rm` or `curl`, unvetted remote URLs, `"unsafe": true` |
| `agent-config.txt` | Wildcard `allowed-tools`, non-Opus models (policy violation) |

## Severity & exit codes

| Condition | Exit code |
|-----------|-----------|
| No findings | `0` |
| Only HIGH / MEDIUM findings | `1` |
| Any CRITICAL finding + `--exit-on-critical` | `2` |
| Patterns dir not found | `3` |

Default (no `--exit-on-critical`) returns `1` for any finding — good for
information-only runs. `--exit-on-critical` is the canonical CI gate: only block
on CRITICAL so HIGH/MEDIUM findings remain visible but non-blocking.

## CI integration

### GitHub Actions

```yaml
- name: AgentShield security scan
  run: bash packages/extras/red-blue-auditor/scan.sh --exit-on-critical
```

### GitLab CI

```yaml
security:
  script:
    - bash packages/extras/red-blue-auditor/scan.sh --exit-on-critical
  allow_failure: false
```

### Pre-commit hook

```bash
#!/bin/bash
bash packages/extras/red-blue-auditor/scan.sh --exit-on-critical --path .
```

## Adding custom patterns

Drop a new `*.txt` file into `patterns/`. The scanner picks it up automatically
on the next run — no code changes required. Example:

```bash
cat > packages/extras/red-blue-auditor/patterns/company-secrets.txt <<'EOF'
# Internal secrets specific to acme-corp
CRITICAL|ACME_[A-Z0-9]{40}|Acme Corp internal API key
HIGH|acme-prod\..*\.internal|production internal hostname leak
EOF
```

## Limitations

- **Regex SAST isn't comprehensive.** This scanner catches _cheap_ mistakes:
  hardcoded secrets, wildcard permissions, obvious shell injection. It will
  miss data-flow vulnerabilities, logic bugs, and anything that requires
  semantic reasoning.
- **False positives happen.** A pattern matching `sk-` will also flag example
  docs and test fixtures. Use `--path` to scope scans, or refine patterns.
- **Complementary, not a replacement.** Run the `agent.md` (LLM) audit for
  multi-step attack chains and architectural flaws; run `scan.sh` on every
  commit for fast regressions. They're additive.

## Also in this package

- `agent.md` — the original 3-phase Red/Blue/Auditor prompt, now enhanced with
  a Phase 4 that invokes `scan.sh` as part of the LLM workflow.
