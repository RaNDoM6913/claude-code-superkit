# Harness Improvements v1.3.5 — Design Spec

> Based on Anthropic Engineering article "Harness Design for Long-Running Apps" + superkit gap analysis.

## Goal

Bring Generator-Evaluator separation, Sprint Contracts, iterative QA, calibrated scoring, file-based handoff, and cost tracking to superkit. Every code task benefits automatically via the always-on /dev pipeline.

## Architecture Overview

```
Phase 0: Read Docs
Phase 1: Understand (+ enhanced complexity: novelty/risk/ambiguity)
Phase 1.5: Architect (complex only)
Phase 2: Plan
Phase 2.1: Sprint Contract (NEW — standard + complex)
Phase 2.5: Validate Plan
Phase 3: Implement
Phase 3.5: Evaluate + Iterate (NEW — conditional GAN loop)
Phase 4: Verify
Phase 5: Test
Phase 5.5: Verify Goals
Phase 6: Review
Phase 6.5: Critic (complex only)
Phase 7: Document
Phase 8: Report (+ cost metrics)
```

Key changes:
- Phase 2.1 (Sprint Contract) — testable acceptance criteria BEFORE coding
- Phase 3.5 (Evaluate + Iterate) — conditional GAN loop: evaluator checks contract, iterates if FAIL
- Phase 1 enhanced complexity assessment — novelty/risk/ambiguity, not just file count
- Phase 8 enhanced report — cost metrics (agent dispatches, time, iterations)
- Enhanced pre-compact-save — task state persistence for multi-session work
- Enhanced visual-reviewer — design quality + originality dimensions
- Enhanced ai-slop-cleaner — AI UI pattern detection

---

## Component 1: `evaluator.md` Agent (NEW)

**File:** `packages/core/agents/evaluator.md`

Independent QA evaluator — the "skeptic" from the Anthropic article. Evaluates implementation results against a Sprint Contract. Separate from reviewers (code quality) and critic (security/ops/new-hire).

### Input

```
Sprint Contract: [list of criteria with thresholds]
Changed Files: [list of files created/modified]
Pass Number: N (1 = first evaluation, 2+ = re-evaluation after fixes)
Previous Evaluation: [if pass > 1, the last evaluation report]
```

### Evaluation Protocol

For each criterion in the Sprint Contract:

1. **Verify testability** — can this criterion be checked by reading code, running commands, or querying state?
2. **Execute test** — read the relevant files, run verification commands (curl, grep, compile, test)
3. **Score** — 0-10 with reasoning
4. **Verdict** — PASS (score >= threshold) or FAIL (score < threshold)

### Output Format

```
## Evaluation Report — Pass N

### Overall: PASS / FAIL (X/Y criteria passed)

| # | Criterion | Score | Threshold | Verdict | Reasoning |
|---|-----------|-------|-----------|---------|-----------|
| 1 | ... | 8/10 | 7 | PASS | ... |
| 2 | ... | 4/10 | 7 | FAIL | ... |

### Critique (FAIL items only)
For each FAIL, provide:
- What specifically is wrong
- What the fix should look like
- Which files need changes

### Trend (pass 2+)
| Criterion | Pass N-1 | Pass N | Delta |
|-----------|----------|--------|-------|
| ... | 4/10 | 7/10 | +3 |

### Recommendation
- PROCEED: all criteria PASS
- ITERATE: specific fixes identified, another pass recommended
- ESCALATE: fundamental approach problem, needs architect review
```

### Calibration — Few-Shot Score Anchors

The evaluator MUST use calibrated scoring:

```
Score 9-10: Exceeds expectations. Production-ready. Edge cases handled.
Score 7-8: Meets expectations. Works correctly. Minor improvements possible.
Score 5-6: Partially meets. Core functionality works but gaps exist.
Score 3-4: Below expectations. Significant issues. Needs rework.
Score 1-2: Does not meet. Missing or fundamentally broken.
```

### Skepticism Tuning

The evaluator prompt includes explicit skepticism instructions:
- "Assume the implementation has bugs until proven otherwise"
- "Score conservatively — a 7 means genuinely good, not 'it compiles'"
- "If you can't verify a criterion by reading code or running a command, score it 0"
- "Do NOT praise code quality — that's the reviewer's job. You only check: does it DO what the contract says?"

---

## Component 2: Sprint Contract (Phase 2.1 in /dev)

**File:** Modified `packages/core/commands/dev.md`

After Phase 2 (Plan) generates the implementation checklist, Phase 2.1 generates testable acceptance criteria.

### Contract Generation Rules

- **Simple tasks (1 file, < 100 lines):** 3-5 criteria, skip evaluator dispatch (self-verify)
- **Standard tasks (2-5 files):** 5-10 criteria, 1 evaluator pass
- **Complex tasks (5+ files):** 10-20 criteria, up to 3 evaluator passes

### Contract Format

```markdown
## Sprint Contract

### Deliverables
1. [What will be built — from Phase 2 plan]

### Acceptance Criteria
| # | Criterion | Test Method | Threshold | Priority |
|---|-----------|------------|-----------|----------|
| 1 | Endpoint returns 200 with valid data | `curl -s /api/... \| jq .` | Score >= 7 | MUST |
| 2 | Invalid input returns 400 error | `curl -s -d '{}' /api/...` | Score >= 7 | MUST |
| 3 | Auth required | Request without JWT | Score >= 7 | MUST |
| 4 | Tests pass | `go test ./...` | Score >= 8 | MUST |
| 5 | No N+1 queries | grep for query-in-loop | Score >= 6 | SHOULD |

Priority:
- MUST: Criterion failure = overall FAIL
- SHOULD: Criterion failure = WARNING, doesn't block
```

### What Makes Good Criteria

Good criteria are:
- **Testable** — can be verified by reading code or running a command
- **Specific** — "returns 200 with JSON containing user.id" not "endpoint works"
- **Independent** — each criterion tests one thing
- **Measurable** — clear pass/fail, not subjective

Bad criteria (evaluator should reject):
- "Code is clean" — subjective, reviewer's job
- "Performance is good" — unmeasurable without benchmark
- "Everything works" — too vague

---

## Component 3: Conditional GAN Loop (Phase 3.5 in /dev)

**File:** Modified `packages/core/commands/dev.md`

After Phase 3 (Implement), the evaluator checks the sprint contract. If all criteria PASS — proceed. If any FAIL — iterate.

### Loop Logic

```
Phase 3: Implement
Phase 3.5: Evaluate + Iterate
  dispatch evaluator with sprint contract + changed files

  IF evaluator verdict = PASS:
    proceed to Phase 4

  IF evaluator verdict = ITERATE:
    fix issues identified in critique
    re-dispatch evaluator (pass N+1)

    IF pass count > MAX_PASSES:
      proceed to Phase 4 with warning in report
      "Evaluation budget exhausted after N passes. Remaining issues: [list]"

    IF evaluator verdict = PASS:
      proceed to Phase 4

    IF scores not improving (pass N score <= pass N-1 score):
      ESCALATE: "Scores not improving. Consider architectural change."
      proceed to Phase 4 with escalation note in report

  IF evaluator verdict = ESCALATE:
    dispatch architect agent for design review
    apply architect recommendation
    restart from Phase 3

MAX_PASSES:
  Simple: 0 (skip Phase 3.5 entirely)
  Standard: 2
  Complex: 3
```

### Important: Phase 3.5 replaces the old Phase 3.5 (AI Slop Cleanup) which was removed in v1.3.4. This is a fundamentally different phase — evaluation, not cleanup.

---

## Component 4: Enhanced Complexity Assessment (Phase 1)

**File:** Modified `packages/core/commands/dev.md`

Current assessment uses only file count and line count. Add three new dimensions:

### Enhanced Assessment Table

```
| Factor | Simple | Standard | Complex |
|--------|--------|----------|---------|
| File count | 1 | 2-5 | 6+ |
| Line changes | < 100 | 100-500 | 500+ |
| Novelty | Existing pattern | New pattern in existing area | New subsystem |
| Risk | Internal, no data | API change, DB migration | Auth, payments, security |
| Ambiguity | Clear spec | Some unknowns | Exploratory/open-ended |
```

Scoring: count how many factors are in each column. Majority wins.
- 3+ factors in Simple → Simple
- 3+ factors in Complex → Complex
- Otherwise → Standard

This determines:
- Sprint Contract size (3-5 / 5-10 / 10-20 criteria)
- Max evaluator passes (0 / 2 / 3)
- Which phases to skip (Simple skips 1.5, 2.1, 2.5, 3.5, 5.5, 6.5)

---

## Component 5: Enhanced pre-compact-save (Task State Persistence)

**File:** Modified `packages/core/hooks/pre-compact-save.sh`

Currently saves: git branch, modified files, staged files, recent commits.

Add task state for multi-session continuity:

### New State Fields

```json
{
  "active_task": {
    "description": "Add user authentication endpoint",
    "phase": "3.5",
    "phase_name": "Evaluate + Iterate",
    "pass_number": 2,
    "complexity": "standard"
  },
  "sprint_contract": {
    "criteria_count": 7,
    "passed": 5,
    "failed": 2,
    "criteria": [...]
  },
  "eval_history": [
    {"pass": 1, "score": "5/7 PASS", "timestamp": "..."},
    {"pass": 2, "score": "7/7 PASS", "timestamp": "..."}
  ],
  "plan_progress": {
    "total_tasks": 8,
    "completed": 5,
    "current": 6
  }
}
```

### Implementation

The pre-compact-save hook checks for `.claude/.task-state.json` in the project root. If it exists, includes it in the saved context. The `/dev` orchestrator writes this file at each phase transition.

The session-context-restore hook reads the task state and injects it, allowing the new session to resume from the exact phase.

---

## Component 6: Enhanced visual-reviewer (Design Quality + Originality)

**File:** Modified `packages/core/agents/visual-reviewer.md`

Add two new scoring dimensions from the Anthropic article:

### Dimension 9: Design Quality (weight: 10/100)

```
Does the design feel like a coherent whole rather than a collection of parts?

Score anchors:
  9-10: Distinct visual identity. Colors, typography, layout create a cohesive mood.
        A human designer would recognize deliberate, opinionated choices.
  7-8:  Professional, cohesive. Wouldn't stand out in a portfolio but feels intentional.
  5-6:  Assembled. Individual parts work but don't form a unified whole.
  3-4:  Conflicting signals. Mixed visual languages, unclear identity.
  1-2:  No visual logic. Random elements with no relationship.
```

### Dimension 10: Originality (weight: 10/100)

```
Is there evidence of custom decisions, or template defaults and AI-generated patterns?

Score anchors:
  9-10: Deliberate creative choices. A designer would recognize intent.
  7-8:  Some custom elements over a standard base.
  5-6:  Standard framework defaults with color/font customization.
  3-4:  Unmodified component library. Purple-blue gradients on white cards.
  1-2:  Default template with no customization.

AI pattern red flags (penalize if found):
  - Purple/blue gradient as default accent
  - White cards on gray background with identical spacing
  - Generic hero section with stock imagery
  - Rounded corners on everything with no hierarchy
  - Shadow-everything approach
  - "Clean and modern" that means "bland and default"
```

### Updated Scoring

Current 8 dimensions have 80 points total. Add 20 points for the 2 new dimensions. Total remains 100.

Pass threshold stays at 90+ (PASS), 70-89 (WARN), <70 (FAIL).

---

## Component 7: Enhanced ai-slop-cleaner (AI UI Patterns)

**File:** Modified `packages/core/agents/ai-slop-cleaner.md`

Add Category 6: AI UI Patterns (alongside existing code slop categories).

```
### Category 6: AI-Generated UI Patterns

Scan frontend files for telltale signs of AI-generated interfaces:

| Pattern | Severity | What to look for |
|---------|----------|-----------------|
| Default gradient accent | WARNING | linear-gradient with purple/blue as primary |
| Uniform card grid | SUGGESTION | All cards same size, same spacing, same radius |
| No visual hierarchy | WARNING | All text same weight, no size variation |
| Stock hero layout | SUGGESTION | Full-width image + centered text + CTA button |
| Shadow-everything | SUGGESTION | box-shadow on every interactive element |
| Identical border-radius | SUGGESTION | Same border-radius value on all elements |

Action: flag for design review, suggest specific alternatives from the project's design system.
```

---

## Component 8: Cost Metrics in Phase 8 Report

**File:** Modified `packages/core/commands/dev.md` (Phase 8 section)

Add a "Metrics" section to the development report:

```
### Metrics
| Metric | Value |
|--------|-------|
| Complexity | Standard |
| Phases executed | 10/12 |
| Agent dispatches | 5 (plan-checker, evaluator x2, go-reviewer, critic) |
| Evaluation passes | 2 (FAIL → PASS) |
| Sprint contract | 7/7 criteria PASS |
| Total phases skipped | 2 (1.5 Architect, 6.5 Critic) |
```

This is observational — tracked by the orchestrator during execution, no separate hook needed. The /dev command counts dispatches and records pass results as it runs.

---

## Component 9: Codex Sync

All new components need Codex equivalents:

- **evaluator** → new `packages/codex/skills/evaluator/SKILL.md`
- **dev-orchestrator** SKILL.md → add Phase 2.1 and 3.5
- **AGENTS.md** → update dev-orchestrator description, add evaluator to agent skills list
- **INSTALL.md** → update skill count

---

## Component 10: Documentation Updates

For release v1.3.5:

| File | Update |
|------|--------|
| `VERSION` | 1.3.4 → 1.3.5 |
| `CHANGELOG.md` | New section with all changes |
| `README.md` | What's New v1.3.5, mermaid diagram (add Contract + Evaluate), agent count 24→25 |
| `CLAUDE.md` | Agent count, dev.md description, key files |
| `docs/guide/01-getting-started.md` | Phase list |
| `docs/guide/02-architecture.md` | Agent count |
| `docs/guide/03-writing-agents.md` | If evaluator pattern worth documenting |
| `docs/guide/08-orchestration.md` | /dev pipeline update with new phases |
| `packages/codex/AGENTS.md` | Skill counts, dev-orchestrator description |
| `packages/codex/INSTALL.md` | Skill counts |
| `packages/showcase/.claude/commands/dev.md` | Add Phase 2.1, 3.5 |

---

## What We Are NOT Doing (YAGNI)

1. **No `/superkit-simplify` command** — interesting but premature. We can add when a model upgrade warrants it.
2. **No `/context-reset` command** — pre-compact-save + session-restore already handle this.
3. **No `phase-timer.sh` hook** — cost metrics tracked by orchestrator inline, no separate hook needed.
4. **No `iteration-budget.sh` hook** — MAX_PASSES in the loop logic is sufficient.
5. **No `cost-tracker.sh` hook** — token counting is unreliable from hooks. Dispatch count in report is enough.
6. **No context anxiety detection** — Opus 4.6 handles long context well. Not worth the complexity.
7. **No harness profiles in settings.json** — the complexity assessment already handles this dynamically.

---

## Summary of Changes

| Type | Change | Files |
|------|--------|-------|
| NEW agent | `evaluator.md` | 1 new file |
| NEW codex skill | `evaluator/SKILL.md` | 1 new file |
| MODIFIED command | `dev.md` — Phase 2.1, 3.5, enhanced Phase 1, enhanced Phase 8 | 2 files (core + codex) |
| MODIFIED agent | `visual-reviewer.md` — +2 dimensions | 1 file |
| MODIFIED agent | `ai-slop-cleaner.md` — +Category 6 | 1 file |
| MODIFIED hook | `pre-compact-save.sh` — task state | 1 file |
| MODIFIED showcase | `dev.md` — Phase 2.1, 3.5 | 1 file |
| DOCS | README, CLAUDE.md, CHANGELOG, VERSION, guides, codex | ~12 files |

**New counts:**
- Core agents: 24 → **25** (+evaluator)
- Codex skills: 41 → **42** (+evaluator)
- Commands: 13 (unchanged)
- Hooks: 13 (unchanged, pre-compact-save modified not added)
- /dev phases: 12 → **14** (composition: +Contract, +Evaluate)
