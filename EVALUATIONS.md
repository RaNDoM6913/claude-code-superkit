# Evaluations

Measuring agent effectiveness with adversarial assertions. Inspired by [cc-skills-golang](https://github.com/samber/cc-skills-golang) evaluation methodology (3,141 assertions, +44pp improvement).

## Methodology

- **Adversarial design:** Test unique agent value, not common knowledge. Frame tasks so the natural approach is wrong; the agent steers to correct.
- **Minimum assertions:** 10 per agent
- **Comparison:** With agent loaded vs without agent (baseline)
- **Grading:** LLM-as-judge or deterministic match

## Results

| Agent | Assertions | With Agent | Without | Delta | Uplift |
|-------|-----------|-----------|---------|-------|--------|
| go-reviewer | — | — | — | — | — |
| go-error-reviewer | — | — | — | — | — |
| go-concurrency-reviewer | — | — | — | — | — |
| go-performance-reviewer | — | — | — | — | — |
| go-modernizer | — | — | — | — | — |
| go-observability-reviewer | — | — | — | — | — |
| ts-reviewer | — | — | — | — | — |
| py-reviewer | — | — | — | — | — |
| rs-reviewer | — | — | — | — | — |
| security-scanner | — | — | — | — | — |
| database-reviewer | — | — | — | — | — |
| code-reviewer | — | — | — | — | — |

*To be filled as agents are tested. Dashes indicate pending evaluation.*

## Cross-Reference System

Agents reference each other using this format:

```
-> See go-error-reviewer for detailed error handling patterns
-> See security-scanner for injection and crypto checks
```

Each concept lives in ONE canonical agent. Others reference it.

### Canonical Ownership

| Concept | Canonical Agent | Referenced By |
|---------|----------------|---------------|
| Error handling (Go) | go-error-reviewer | go-reviewer, database-reviewer |
| Concurrency (Go) | go-concurrency-reviewer | go-reviewer, go-performance-reviewer |
| Performance (Go) | go-performance-reviewer | go-reviewer |
| Modernization (Go) | go-modernizer | go-reviewer |
| Observability (Go) | go-observability-reviewer | go-reviewer |
| SQL safety | database-reviewer | go-reviewer, security-scanner |
| Security | security-scanner | go-reviewer, all stack reviewers |
