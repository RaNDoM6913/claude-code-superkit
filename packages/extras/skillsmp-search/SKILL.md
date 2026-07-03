---
name: skillsmp-search
description: Search 500K+ agent skills on SkillsMP marketplace before writing new agents, commands, or skills. Use when creating new .claude/ components or looking for community solutions.
tokens: 1740
user-invocable: false
---

# SkillsMP Skills Search

Search the SkillsMP marketplace (500K+ SKILL.md files harvested from GitHub) for an existing solution before building a new agent, command, or skill from scratch. Two modes: keyword search and AI semantic search.

## Hard Rules
1. Confirm `SKILLSMP_API_KEY` is set before ANY call: `[ -n "$SKILLSMP_API_KEY" ]`. If empty/unset, do not call the API — show the setup message (Error Branches) and stop. Never fabricate results.
2. At most ONE keyword search + ONE AI search per topic. Never loop, retry, or paginate the same query hoping for better hits.
3. Read a skill's GitHub source (`githubUrl`) before recommending it — never recommend from the search snippet alone.
4. On any non-200 response (401/403, 429, other), stop per the Error Branches table — do not retry-loop, do not invent results.
5. Zero results is a valid outcome — say so and proceed to build from scratch.
6. Present results only in the Output Contract format below.

## Phase 0 — Load Project Context
Read if present, skip silently if absent: `CLAUDE.md` or `AGENTS.md`. Use it to ground the query in the project's real stack (e.g. search `go reviewer`, not `reviewer`, for a Go project). Do not read it more than once per session.

## When to Use
- **Before writing a new agent** — search if someone already built it.
- **Before writing a new skill** — check for community solutions.
- **When exploring patterns** — see how others solved a similar problem.
- **When the user asks** — "find a skill for X", "is there a skill that does Y".

## Process
1. **Preflight** — run the key check (Hard Rule 1). Done-when: key confirmed present, or setup message shown and you stop.
2. **Keyword search** — run the keyword endpoint. Handle any non-200 per Error Branches. Done-when: you have a results list or a handled error.
3. **AI search (conditional)** — run ONLY when keyword results are poor/empty or the query is conceptual (e.g. "review code across multiple models"). Done-when: AI results obtained or keyword results judged sufficient.
4. **Verify** — for each skill you intend to recommend, open its `githubUrl` and read the actual SKILL.md. Done-when: every recommended skill's source was read.
5. **Present** — emit the Output Contract. Done-when: results rendered, or the zero-result / error message shown.

## API Endpoints

### Keyword Search (fast, ~300ms)
```bash
curl -s -X GET "https://skillsmp.com/api/v1/skills/search?q=QUERY&per_page=10&sort=stars" \
  -H "Authorization: Bearer $SKILLSMP_API_KEY"
```

### AI Semantic Search (deeper, vector similarity)
```bash
curl -s -X GET "https://skillsmp.com/api/v1/skills/ai-search?q=QUERY" \
  -H "Authorization: Bearer $SKILLSMP_API_KEY"
```

To see the HTTP status alongside the body when diagnosing an error, append `-w '\nHTTP %{http_code}'` to either command.

## Parameters

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `q` | string | required | Search query |
| `per_page` | 1-100 | 10 | Results per page |
| `page` | 1+ | 1 | Page number |
| `sort` | `stars`, `recent` | `recent` | Sort order |

## Response Fields
Each result contains: `name` (skill name) · `author` (GitHub author) · `description` (what it does) · `githubUrl` (source link) · `stars` (GitHub stars, quality indicator).

## Search Strategy
1. **Keyword first** — fast, best for specific terms ("go reviewer", "migration", "playwright").
2. **AI fallback** — when keyword gives poor results or the query is conceptual.
3. **Rank by stars** — high-star skills are battle-tested.
4. **Read the source** — always open the `githubUrl` SKILL.md before recommending.

## Error Branches
Every fork below has one exact action. Default for any unlisted failure: report it plainly, do not retry-loop, do not fabricate, fall back to local search.

| Condition | How you detect it | Exact action |
|-----------|-------------------|--------------|
| Key unset/empty | `[ -n "$SKILLSMP_API_KEY" ]` is false | Do NOT call the API. Show the setup message (below) and stop. |
| HTTP 401 / 403 | status 401 or 403 | Key is invalid or expired. Show the setup message and tell the user to check/regenerate the key at https://skillsmp.com. Stop. Do not retry. |
| HTTP 429 | status 429 | Rate limit hit (30/min or 500/day). Report "SkillsMP rate limit reached — try again after reset (midnight UTC for the daily cap)." Do NOT retry-loop. Proceed with local search only. |
| Other non-200 / network error | status not 200 | Report "SkillsMP search unavailable (HTTP <code>)." Do not invent results. Proceed with local search only. |
| Zero results | 200 with empty results array | Say "No SkillsMP skills found for '<query>'." Proceed to build from scratch. |

**Setup message (show verbatim when the key is missing or invalid):**
```
SkillsMP search needs an API key.
1. Get a key at https://skillsmp.com
2. Add it to your shell profile: export SKILLSMP_API_KEY="sk_live_your_key"
3. Reload your shell, then re-run the search.
```

## Rate Limits
- **30 requests/minute** per API key.
- **500 requests/day** per API key (resets at midnight UTC).
- No wildcard searches.
- Check headers `x-ratelimit-daily-remaining` and `x-ratelimit-minute-remaining` to see remaining quota.

## Relationship to Search First
This skill is the marketplace layer of the coding-style rule's **Search First** discipline. Escalate in this order before writing anything new:
- Before new code → grep the codebase for an existing pattern.
- Before a new dependency → check npm / Go modules.
- Before a new agent/skill/hook → search SkillsMP.

## Output Contract
On a successful search, present results in exactly this shape:

```
### Found N skills for "<query>"

1. **skill-name** by author (⭐ stars)
   description
   → [GitHub](githubUrl) | [SkillsMP](skillUrl)

2. ...
```

Mini example:
```
### Found 2 skills for "go reviewer"

1. **go-code-reviewer** by alice (⭐ 342)
   Reviews Go code for concurrency, error handling, and idiom violations.
   → [GitHub](https://github.com/alice/go-code-reviewer) | [SkillsMP](https://skillsmp.com/skills/go-code-reviewer)

2. **golang-lint-agent** by bob (⭐ 87)
   Runs golangci-lint and explains each finding in plain language.
   → [GitHub](https://github.com/bob/golang-lint-agent) | [SkillsMP](https://skillsmp.com/skills/golang-lint-agent)
```

For zero results or an error, show the corresponding Error Branches message instead of this template — never emit an empty or invented results list.

## Recap — non-negotiables
- Confirm `SKILLSMP_API_KEY` before any call; if missing or invalid, show the setup message and stop — never fabricate results.
- One keyword + one AI search per topic; never retry-loop or paginate for the same query.
- Read a skill's GitHub source before recommending it.
- On 429/other errors or zero results, report it and fall back to local search / build from scratch — do not invent output.
- Present successful results only in the Output Contract format.
