---
name: skillsmp-search
description: Search 500K+ agent skills on SkillsMP marketplace before writing new agents, commands, or skills. Use when creating new .claude/ components or looking for community solutions.
---

# SkillsMP Skills Search

Search the SkillsMP marketplace (500K+ SKILL.md files from GitHub) to find existing solutions before building from scratch. Supports keyword and AI semantic search.

**Requires**: `SKILLSMP_API_KEY` environment variable (get key at https://skillsmp.com)

## When to Use

- **Before writing a new agent** — search if someone already built it
- **Before writing a new skill** — check for community solutions
- **When exploring patterns** — see how others solved similar problems
- **When user asks** — "find a skill for X", "is there a skill that does Y"

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

## Search Strategy

1. **Start with keyword search** — fast, good for specific terms ("go reviewer", "migration", "playwright")
2. **Fall back to AI search** — when keyword gives poor results or query is conceptual ("how to review code across multiple models")
3. **Check stars** — high-star skills are battle-tested
4. **Read the GitHub URL** — always check the actual SKILL.md before recommending

## Parameters

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `q` | string | required | Search query |
| `per_page` | 1-100 | 10 | Results per page |
| `page` | 1+ | 1 | Page number |
| `sort` | `stars`, `recent` | `recent` | Sort order |

## Response Format

Each result contains:
- `name` — skill name
- `author` — GitHub author
- `description` — what the skill does
- `githubUrl` — link to source code
- `stars` — GitHub stars (quality indicator)

## How to Present Results

When showing results to the user:

```
### Found N skills for "query"

1. **skill-name** by author (⭐ stars)
   description
   → [GitHub](url) | [SkillsMP](skillUrl)

2. ...
```

## Integration with Search-First Rule

This skill extends the project's "search-first" coding rule:
- Before new code → grep codebase
- Before new dependency → check npm/Go modules
- **Before new agent/skill/hook** → search SkillsMP

## Rate Limits

- 500 requests/day per API key
- Resets at midnight UTC
- No wildcard searches

## Installation

1. Get API key at https://skillsmp.com
2. Add to shell profile: `export SKILLSMP_API_KEY="sk_live_your_key"`
3. Copy this skill to `.claude/skills/skillsmp-search/`
