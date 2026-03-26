---
name: ai-slop-cleaner
description: Clean AI-generated code patterns — redundant comments, unnecessary abstractions, over-engineering, template code
user-invocable: false
---

# AI Slop Cleaner

Detect and fix common AI-generated code anti-patterns. Behavior-preserving cleanup — no logic changes, only readability and quality improvements.

## Phase 0: Load Project Context

Read if exists:
1. `AGENTS.md` — project conventions, coding style
2. `.editorconfig` or linter configs — formatting rules

**Use this context to:** distinguish project conventions from AI slop (e.g., the project MAY want verbose comments).

## When to Use

- After AI-assisted implementation (post Phase 3 in dev-orchestrator)
- Before code review (catch slop before reviewers waste time on it)
- Standalone cleanup pass on existing codebase

## Detection Checklist

### Category 1: Redundant Comments (MOST COMMON)
```
// This function returns the user      <- states the obvious
// Import the http package             <- describes the import
// Create a new instance               <- describes the constructor
// Check if the value is nil           <- restates the code
// TODO: implement this                <- left by AI, not real TODO
```

**Action:** Remove comments that restate what the code already says. Keep comments that explain WHY, not WHAT.

### Category 2: Unnecessary Abstractions
```
// One-use helper wrapping a single call
func getUserByID(db *sql.DB, id string) (*User, error) {
    return db.QueryRow("SELECT ...").Scan(...)
}
// Called exactly ONCE
```

**Action:** Inline one-use helpers. If a function is called once and its name matches what it does, it's noise.

### Category 3: Over-Engineering
- Feature flags for non-configurable behavior
- Backwards-compatibility shims with zero consumers
- Strategy/factory patterns for 1 implementation
- Generic types where concrete types suffice
- Interface for a single implementation (no testing need)

**Action:** Replace with direct, simple code. YAGNI.

### Category 4: Template/Boilerplate Slop
- Empty error handlers (`catch (e) {}`)
- Unused function parameters (especially `_` placeholders)
- Default switch/match cases that can't be reached
- Unnecessary type assertions on already-typed values
- Re-exporting types that are never imported from the re-export

**Action:** Remove dead code. Trust the type system.

### Category 5: AI Writing Style
- Overly formal variable names (`retrievedUserData` vs `user`)
- Unnecessary prefixes (`strName`, `bIsActive`)
- Method chains wrapped in meaningless variables
- `return true` / `return false` instead of `return condition`
- Ternary wrapping a boolean (`x ? true : false`)

**Action:** Simplify to idiomatic style for the language.

## Process

1. **Scan** — Grep for patterns from each category across changed files
2. **Classify** — Group findings by category
3. **Filter** — Remove false positives (comments that DO add value, abstractions that ARE reused)
4. **Fix** — Apply fixes. ONE category at a time to keep diffs reviewable
5. **Verify** — Run compiler/linter after each category to ensure no breakage

## Output Format

### Severity
- **SLOP** — AI-generated noise. Safe to remove.
- **BORDERLINE** — Could go either way. Flag for human decision.

### Format:
```
[SLOP] file:line — description
  Pattern: <what was found>
  Fix: <what to change>

[BORDERLINE] file:line — description
  Pattern: <what was found>
  Reason it might be intentional: <explanation>
```

### Summary:
```
## AI Slop Cleanup Report

Scanned: N files
Found: X patterns (Y SLOP, Z BORDERLINE)
Fixed: W patterns
Skipped: V (borderline, left for human review)

Categories:
- Redundant comments: N removed
- Unnecessary abstractions: N inlined
- Over-engineering: N simplified
- Template slop: N cleaned
- AI writing style: N fixed
```

IMPORTANT: This agent ONLY cleans. It does NOT refactor logic, add features, or change behavior. Every fix must be provably behavior-preserving.
