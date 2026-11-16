# red-blue-auditor — AgentShield

Adversarial security audit for Claude Code / Codex repos. Two complementary modes:

1. **Agent mode** — `agent.md` is an Opus-powered Red/Blue/Auditor prompt (3-phase
   adversarial analysis: attacker perspective, defender perspective, synthesis).
2. **SAST mode** — `scan.sh` runs static grep-based pattern matching against the
   repo's text files (scanned extensions, `.env*`, and extensionless scripts such as
   git hooks). Bearer-inspired, CI-friendly, zero dependencies.

Together they form an AgentShield-style defense-in-depth: the LLM finds multi-step
exploits and logic flaws, while the static scanner catches cheap mistakes
(committed secrets, wildcard permissions, shell injection vectors) before merge.

## Quick start

```bash
# One-shot scan from repo root
bash packages/extras/red-blue-auditor/scan.sh

# Limit scope (a directory or a single file; `--path .claude/` works too)
bash packages/extras/red-blue-auditor/scan.sh --path=.claude/

# Fail the build if anything CRITICAL is found
bash packages/extras/red-blue-auditor/scan.sh --exit-on-critical
```

## Pattern file format

Each `patterns/*.txt` contains lines of the form:

```
SEVERITY|REGEX|DESCRIPTION
```

- `SEVERITY` — `CRITICAL`, `HIGH`, or `MEDIUM`
- `REGEX` — `grep -E` compatible expression (no lookahead/lookbehind); it may
  contain `|`, because a line is split at its first and last `|`
- `DESCRIPTION` — short (< 80 chars) human-readable label, without `|`

Lines starting with `#` are comments. Blank lines are ignored. A regex `grep -E`
rejects is reported as a `pattern error` on stderr and in the summary.

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
| Any finding (default mode) | `1` |
| `--exit-on-critical`, no CRITICAL finding (HIGH / MEDIUM still printed) | `0` |
| `--exit-on-critical`, any CRITICAL finding | `2` |
| Patterns dir not found | `3` |
| Unknown argument, or `--path` not found | `4` |

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
bash packages/extras/red-blue-auditor/scan.sh --exit-on-critical --path=.
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
- **Prompt prose matches too.** On a stock superkit install, `--exit-on-critical` reports a few critical hits from agent prompts that quote `curl … | sh` as an example (security-scanner, red-blue-auditor); triage them, or exclude `.claude/agents/` with `--path=`.
- **False positives happen.** A pattern matching `sk-` will also flag example
  docs and test fixtures. Use `--path` to scope scans, or refine patterns.
- **Complementary, not a replacement.** Run the `agent.md` (LLM) audit for
  multi-step attack chains and architectural flaws; run `scan.sh` on every
  commit for fast regressions. They're additive.

## Also in this package

- `agent.md` — the original 3-phase Red/Blue/Auditor prompt, now enhanced with
  a Phase 3 that runs `scan.sh` (integrity-checked, output masked) before the Phase 4 Auditor synthesis.
