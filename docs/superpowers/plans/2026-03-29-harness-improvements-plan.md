# Harness Improvements v1.3.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Generator-Evaluator separation, Sprint Contracts, conditional GAN loop, enhanced complexity assessment, task state persistence, design quality scoring, and cost metrics to superkit.

**Architecture:** New `evaluator.md` agent dispatched by `/dev` Phase 3.5 against Sprint Contract criteria. Conditional iteration: only re-run if evaluator finds FAIL. Enhanced Phase 1 adds novelty/risk/ambiguity to complexity. Pre-compact-save extended with task state JSON. Visual-reviewer and ai-slop-cleaner get new dimensions.

**Tech Stack:** Markdown (agents, commands), Bash (hooks), GitHub CLI (release)

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| CREATE | `packages/core/agents/evaluator.md` | Independent QA evaluator agent |
| CREATE | `packages/codex/skills/evaluator/SKILL.md` | Codex equivalent of evaluator |
| MODIFY | `packages/core/commands/dev.md` | Add Phase 2.1, 3.5, enhanced Phase 1, Phase 8 |
| MODIFY | `packages/core/agents/visual-reviewer.md` | +2 scoring dimensions |
| MODIFY | `packages/core/agents/ai-slop-cleaner.md` | +Category 6: AI UI patterns |
| MODIFY | `packages/core/hooks/pre-compact-save.sh` | Task state persistence |
| MODIFY | `packages/core/hooks/session-context-restore.sh` | Task state injection |
| MODIFY | `packages/codex/skills/dev-orchestrator/SKILL.md` | Add Phase 2.1, 3.5 |
| MODIFY | `packages/codex/AGENTS.md` | Add evaluator, update dev description |
| MODIFY | `packages/showcase/.claude/commands/dev.md` | Add Phase 2.1, 3.5 |
| MODIFY | `packages/core/rules/dev-workflow.md` | Update skip list for new phases |
| MODIFY | `VERSION` | 1.3.4 → 1.3.5 |
| MODIFY | `CHANGELOG.md` | New [1.3.5] section |
| MODIFY | `README.md` | What's New, mermaid, counts, Key Commands |
| MODIFY | `CLAUDE.md` | Agent count, dev description |
| MODIFY | `docs/guide/01-getting-started.md` | Phase list |
| MODIFY | `docs/guide/08-orchestration.md` | Pipeline description |
| MODIFY | `packages/codex/INSTALL.md` | Skill count |

---

### Task 1: Create `evaluator.md` Agent

**Files:**
- Create: `packages/core/agents/evaluator.md`

- [ ] **Step 1: Create the evaluator agent file**

```markdown
---
name: evaluator
description: Calibrated QA evaluator — scores implementation against Sprint Contract criteria, provides structured critique for conditional iteration loop
model: opus
allowed-tools: Read, Grep, Glob, Bash
---

# Evaluator

Independent QA evaluator — the "skeptic." Scores implementation results against a Sprint Contract. Does NOT review code quality (that's the reviewer's job). Only checks: does the implementation DO what the contract says?

## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` or `AGENTS.md` — project conventions, tech stack
2. `docs/architecture/` — relevant architecture docs
3. The Sprint Contract provided in the prompt

## When to Use

- Phase 3.5 (Evaluate + Iterate) in /dev workflow — after implementation, before verify
- Dispatched by /dev orchestrator with Sprint Contract + changed files
- Can be used standalone for post-implementation validation

## Input

You will receive:
1. **Sprint Contract** — list of criteria with test methods and thresholds
2. **Changed Files** — list of files created/modified during implementation
3. **Pass Number** — 1 = first evaluation, 2+ = re-evaluation after fixes
4. **Previous Evaluation** — if pass > 1, the last evaluation report (for trend tracking)

## Evaluation Protocol

For each criterion in the Sprint Contract:

1. **Verify testability** — can this criterion be checked by reading code, running commands, or querying state? If not, score 0 and explain why.
2. **Execute test** — read the relevant files, run verification commands (grep, compile, test, curl if applicable)
3. **Score** — 0-10 with reasoning (see Calibration below)
4. **Verdict** — PASS (score >= threshold) or FAIL (score < threshold)

## Calibration — Few-Shot Score Anchors

You MUST use calibrated scoring. A 7 means genuinely good, not "it compiles."

```
Score 9-10: Exceeds expectations. Production-ready. Edge cases handled.
            Example: endpoint validates all input, returns proper errors,
            has rate limiting, tests cover happy + error + edge paths.

Score 7-8:  Meets expectations. Works correctly. Minor improvements possible.
            Example: endpoint works, validates input, returns errors,
            tests cover happy + error paths. No edge case tests.

Score 5-6:  Partially meets. Core functionality works but gaps exist.
            Example: endpoint works for happy path, some validation
            missing, error responses inconsistent.

Score 3-4:  Below expectations. Significant issues. Needs rework.
            Example: endpoint exists but returns wrong data structure,
            or has no validation, or doesn't connect to database.

Score 1-2:  Does not meet. Missing or fundamentally broken.
            Example: file exists but function is empty/stub/panics.
```

## Skepticism Rules

- Assume the implementation has bugs until proven otherwise
- Score conservatively — a 7 means genuinely good, not "it compiles"
- If you can't verify a criterion by reading code or running a command, score it 0
- Do NOT praise code quality — that's the reviewer's job
- You only check: does it DO what the contract says?
- Read actual files. Run actual commands. Don't assume.

## Output Format

```
## Evaluation Report — Pass N

### Overall: PASS / FAIL (X/Y criteria passed)

| # | Criterion | Score | Threshold | Verdict | Reasoning |
|---|-----------|-------|-----------|---------|-----------|
| 1 | [criterion text] | N/10 | M | PASS/FAIL | [1-2 sentences] |
| 2 | ... | ... | ... | ... | ... |

### Critique (FAIL items only)
For each FAIL:
- **Criterion N: [name]**
  - What's wrong: [specific issue with file:line references]
  - Expected: [what the criterion requires]
  - Fix: [concrete action — which file to modify, what to change]

### Trend (pass 2+ only)
| Criterion | Pass N-1 | Pass N | Delta |
|-----------|----------|--------|-------|
| [name] | N/10 | M/10 | +/-X |

### Recommendation
- **PROCEED**: all MUST criteria PASS → implementation meets contract
- **ITERATE**: MUST criteria FAIL but fixable → apply fixes, re-evaluate
- **ESCALATE**: fundamental approach problem → needs architect review
```

### Priority Handling

- **MUST** criteria: failure = overall FAIL, blocks progress
- **SHOULD** criteria: failure = WARNING in report, does not block

## Important

This agent ONLY evaluates. It does NOT fix code, refactor, or implement. It provides a structured critique that the /dev orchestrator uses to guide the next iteration.
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/agents/evaluator.md
git commit -m "feat: add evaluator agent — calibrated QA for Sprint Contract evaluation

Independent skeptic that scores implementation against testable criteria.
Few-shot calibrated scoring (0-10), MUST/SHOULD priorities, conditional
iteration support with trend tracking across passes.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Update `dev.md` — Add Phase 2.1 (Sprint Contract), Phase 3.5 (Evaluate + Iterate), Enhanced Phase 1, Enhanced Phase 8

**Files:**
- Modify: `packages/core/commands/dev.md`

- [ ] **Step 1: Update description in frontmatter**

Change:
```
description: Full-stack development orchestrator — always-on, 12 phases: understand → plan → implement → verify → test → goals → review → critic → document → report
```
To:
```
description: Full-stack development orchestrator — always-on, 14 phases: understand → plan → contract → implement → evaluate → verify → test → goals → review → critic → document → report
```

- [ ] **Step 2: Update header description**

Change:
```
Automate the full development cycle: understand → plan → validate → implement → verify → test → verify goals → review → document → report.
```
To:
```
Automate the full development cycle: understand → plan → contract → validate → implement → evaluate → verify → test → verify goals → review → document → report.
```

- [ ] **Step 3: Enhance Phase 1 complexity assessment**

Replace the existing complexity assessment (item 3 in Phase 1):
```
3. **Assess complexity** — this determines the workflow:
   - **Simple** (1 file, < 100 lines) → skip to Phase 3, no plan needed
   - **Standard** (2-5 files) → full workflow with plan
   - **Complex** (5+ files, cross-cutting, architectural decisions) → dispatch **architect** agent first
```

With:
```
3. **Assess complexity** using 5 factors — this determines the workflow:

   | Factor | Simple | Standard | Complex |
   |--------|--------|----------|---------|
   | File count | 1 | 2-5 | 6+ |
   | Line changes | < 100 | 100-500 | 500+ |
   | Novelty | Existing pattern | New pattern in existing area | New subsystem |
   | Risk | Internal, no data changes | API change, DB migration | Auth, payments, security |
   | Ambiguity | Clear spec | Some unknowns | Exploratory/open-ended |

   Count how many factors fall in each column. Majority wins:
   - **Simple** (3+ factors in Simple) → skip Phases 1.5, 2.1, 2.5, 3.5, 5.5, 6.5
   - **Standard** (default) → full workflow, max 2 evaluator passes
   - **Complex** (3+ factors in Complex) → full workflow + architect + critic, max 3 evaluator passes
```

- [ ] **Step 4: Add Phase 2.1 — Sprint Contract after Phase 2 (Plan)**

Insert after the Phase 2.5 section header (before "Dispatch **plan-checker**"):

```markdown
## Phase 2.1 — Sprint Contract (standard and complex tasks)

Generate testable acceptance criteria for the implementation plan. These criteria are what the **evaluator** agent will check in Phase 3.5.

### Contract Size
- **Simple:** skip (no contract needed)
- **Standard:** 5-10 criteria
- **Complex:** 10-20 criteria

### Contract Format

```
## Sprint Contract

### Acceptance Criteria
| # | Criterion | Test Method | Threshold | Priority |
|---|-----------|------------|-----------|----------|
| 1 | [specific, testable outcome] | [how to verify: grep, curl, test, read] | Score >= 7 | MUST |
| 2 | ... | ... | ... | MUST/SHOULD |
```

### Good Criteria
- **Testable** — verifiable by reading code or running a command
- **Specific** — "returns 200 with JSON containing user.id" not "endpoint works"
- **Independent** — each criterion tests one thing
- **Measurable** — clear pass/fail, not subjective

### Bad Criteria (do NOT include)
- "Code is clean" — subjective, reviewer's job
- "Performance is good" — unmeasurable without benchmark
- "Everything works" — too vague

Pass the Sprint Contract to the **plan-checker** in Phase 2.5 for validation alongside the plan.

**Skip for simple tasks.**
```

- [ ] **Step 5: Add Phase 3.5 — Evaluate + Iterate after Phase 3 (Implement)**

Insert after Phase 3 (Implement), before Phase 4 (Verify):

```markdown
## Phase 3.5 — Evaluate + Iterate (standard and complex tasks)

Dispatch the **evaluator** agent with the Sprint Contract and changed files:

```
Evaluate this implementation against the Sprint Contract.
Sprint Contract: {contract from Phase 2.1}
Changed Files: {list from Phase 3}
Pass Number: 1
```

**Conditional iteration (GAN loop):**

1. If evaluator verdict = **PROCEED** → all criteria PASS → proceed to Phase 4
2. If evaluator verdict = **ITERATE**:
   - Fix issues identified in the critique
   - Re-dispatch evaluator (pass N+1)
   - If pass count > MAX_PASSES → proceed to Phase 4 with warning:
     "Evaluation budget exhausted after N passes. Remaining issues: [list]"
   - If scores not improving (pass N score <= pass N-1) → proceed with escalation note
3. If evaluator verdict = **ESCALATE**:
   - Dispatch **architect** agent for design review
   - Apply recommendation, restart from Phase 3

**MAX_PASSES:** Simple: 0 (skip), Standard: 2, Complex: 3

**Skip for simple tasks.**
```

- [ ] **Step 6: Update Phase 8 — Report with metrics and new phases**

Replace the Phase 8 report template table with:

```
### Phases Executed
| Phase | Status | Notes |
|-------|--------|-------|
| 0. Read Docs | ✅ | Read N architecture docs |
| 1. Understand | ✅ | Scope: [components], [complexity] |
| 1.5 Architect | ⏭ skipped | Standard complexity |
| 2. Plan | ✅ | N tasks planned |
| 2.1 Contract | ✅ | N acceptance criteria |
| 2.5 Validate | ✅ PASS | 0 blocking |
| 3. Implement | ✅ | N files created, M modified |
| 3.5 Evaluate | ✅ PASS | Pass 1: X/Y criteria met |
| 4. Verify | ✅ | Compilation clean |
| 5. Test | ✅ | X tests, all passing |
| 5.5 Goals | ✅ VERIFIED | All 4 levels pass |
| 6. Review | ✅ | [agents]: PASS |
| 6.5 Critic | ⏭ skipped | Standard complexity |
| 7. Document | ✅ | Updated [doc files] |

### Metrics
| Metric | Value |
|--------|-------|
| Complexity | Simple / Standard / Complex |
| Agent dispatches | N (list agents) |
| Evaluation passes | N (FAIL → ... → PASS) |
| Sprint contract | X/Y criteria PASS |
```

- [ ] **Step 7: Update Notes section**

Change:
```
- Simple tasks (1 file, < 100 lines) skip Phases 1.5, 2.5, 5.5, 6.5
```
To:
```
- Simple tasks skip Phases 1.5, 2.1, 2.5, 3.5, 5.5, 6.5
```

- [ ] **Step 8: Commit**

```bash
git add packages/core/commands/dev.md
git commit -m "feat: /dev — add Sprint Contract (2.1), Evaluate+Iterate (3.5), enhanced complexity

Phase 2.1: testable acceptance criteria before coding (MUST/SHOULD priorities)
Phase 3.5: conditional GAN loop — evaluator checks contract, iterates on FAIL
Phase 1: enhanced complexity adds novelty/risk/ambiguity to file/line counts
Phase 8: metrics section (agent dispatches, evaluation passes, contract score)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Update `visual-reviewer.md` — Add Design Quality + Originality Dimensions

**Files:**
- Modify: `packages/core/agents/visual-reviewer.md`

- [ ] **Step 1: Add Dimension 9 and 10 to Step 3 (Code-Based Visual Review)**

After item 8 (Dark mode) in the checklist, add:

```markdown
9. **Design quality** — does the design feel like a coherent whole? Distinct mood, identity, intentional choices vs assembled parts
10. **Originality** — evidence of custom decisions vs template defaults and AI-generated patterns (purple gradients, white cards on gray, identical spacing everywhere, shadow-everything)
```

- [ ] **Step 2: Update scoring table**

Replace the scoring table with:

```markdown
| Check | Weight | Pass Criteria |
|-------|--------|---------------|
| Color system compliance | 12 | All colors from theme/design tokens |
| Spacing scale compliance | 12 | All spacing from defined scale |
| Typography compliance | 8 | Font sizes/weights from type scale |
| Z-index discipline | 8 | Values from defined scale |
| Responsive correctness | 12 | All breakpoints covered |
| Animation consistency | 8 | Uses project animation library |
| Accessibility | 12 | Focusable, labeled, contrast OK |
| Dark mode (if applicable) | 8 | Themed correctly |
| Design quality | 10 | Coherent whole, distinct identity (see anchors below) |
| Originality | 10 | Custom decisions, not AI template defaults (see anchors below) |
```

- [ ] **Step 3: Add score anchors section after the scoring table**

```markdown
### Design Quality Score Anchors
- **9-10**: Distinct visual identity. Colors, typography, layout create a cohesive mood. A designer would recognize deliberate choices.
- **7-8**: Professional, cohesive. Wouldn't stand out but feels intentional.
- **5-6**: Assembled. Parts work individually but don't form a unified whole.
- **3-4**: Conflicting signals. Mixed visual languages, unclear identity.
- **1-2**: No visual logic. Random elements with no relationship.

### Originality Score Anchors
- **9-10**: Deliberate creative choices. A designer would recognize intent.
- **7-8**: Some custom elements over a standard base.
- **5-6**: Standard framework defaults with color/font customization.
- **3-4**: Unmodified component library. Purple-blue gradients on white cards.
- **1-2**: Default template with no customization.

**AI pattern red flags** (penalize if found):
- Purple/blue gradient as default accent
- White cards on gray background with identical spacing
- Generic hero section with stock imagery
- Rounded corners on everything with no hierarchy
- Shadow-everything approach
- "Clean and modern" that means "bland and default"
```

- [ ] **Step 4: Commit**

```bash
git add packages/core/agents/visual-reviewer.md
git commit -m "feat: visual-reviewer — add Design Quality + Originality dimensions

Two new scoring dimensions (10pts each, total stays 100):
- Design Quality: coherent whole vs assembled parts, calibrated 1-10
- Originality: custom decisions vs AI template defaults, red flag list
Based on Anthropic harness design article criteria.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Update `ai-slop-cleaner.md` — Add Category 6 (AI UI Patterns)

**Files:**
- Modify: `packages/core/agents/ai-slop-cleaner.md`

- [ ] **Step 1: Add Category 6 after Category 5 (AI Writing Style)**

```markdown
### Category 6: AI-Generated UI Patterns
Scan frontend files (`.tsx`, `.jsx`, `.vue`, `.svelte`, `.css`, `.scss`) for telltale AI interface patterns:

```
Default gradient accent     ← linear-gradient with purple/blue as primary action color
Uniform card grid           ← All cards same size, spacing, radius, no hierarchy
No visual hierarchy         ← All text same weight/size, no emphasis
Stock hero layout           ← Full-width image + centered text + single CTA
Shadow-everything           ← box-shadow on every interactive element
Identical border-radius     ← Same border-radius value across all components
Generic spacing             ← Identical gaps everywhere, no rhythm
```

**Action:** Flag for design review. Suggest using the project's design system tokens. If no design system exists, flag as BORDERLINE with note "consider establishing a design system."
```

- [ ] **Step 2: Update the Summary template**

Add "AI UI patterns" to the Categories list in the summary:
```
Categories:
- Redundant comments: N removed
- Unnecessary abstractions: N inlined
- Over-engineering: N simplified
- Template slop: N cleaned
- AI writing style: N fixed
- AI UI patterns: N flagged
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/agents/ai-slop-cleaner.md
git commit -m "feat: ai-slop-cleaner — add Category 6: AI UI pattern detection

Detects purple gradients, uniform card grids, shadow-everything,
stock hero layouts, and other AI-generated UI telltales in frontend code.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Update `pre-compact-save.sh` — Task State Persistence

**Files:**
- Modify: `packages/core/hooks/pre-compact-save.sh`
- Modify: `packages/core/hooks/session-context-restore.sh`

- [ ] **Step 1: Add task state to pre-compact-save.sh**

After the existing `## Staged Files` section in the heredoc, add:

```bash
## Task State
$(if [ -f ".claude/.task-state.json" ]; then cat .claude/.task-state.json; else echo "no active task"; fi)
```

- [ ] **Step 2: Add task state injection to session-context-restore.sh**

After the existing `cat "$CONTEXT_FILE"` line inside the `if [ "$FILE_AGE" -lt 86400 ]` block, add task state injection:

```bash
    # Inject task state if present in project
    if [ -f ".claude/.task-state.json" ]; then
      echo ""
      echo "<task-state>"
      cat .claude/.task-state.json
      echo "</task-state>"
    fi
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/hooks/pre-compact-save.sh packages/core/hooks/session-context-restore.sh
git commit -m "feat: hooks — task state persistence for multi-session /dev continuity

pre-compact-save: includes .claude/.task-state.json in saved context
session-context-restore: injects task state on session start
Enables resuming /dev pipeline from exact phase after compaction/new session.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Update `dev-workflow.md` Rule — Phase Skip List

**Files:**
- Modify: `packages/core/rules/dev-workflow.md`
- Modify: `packages/showcase/.claude/rules/dev-workflow.md`

- [ ] **Step 1: Update core dev-workflow.md skip list**

Change:
```
  - **Simple** (1 file, < 100 lines) → skip 1.5, 2.5, 5.5, 6.5
```
To:
```
  - **Simple** (1 file, < 100 lines) → skip 1.5, 2.1, 2.5, 3.5, 5.5, 6.5
```

- [ ] **Step 2: Same change in showcase dev-workflow.md**

Same replacement.

- [ ] **Step 3: Commit**

```bash
git add packages/core/rules/dev-workflow.md packages/showcase/.claude/rules/dev-workflow.md
git commit -m "fix: dev-workflow rule — add Phase 2.1, 3.5 to Simple skip list

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Update Showcase `dev.md` — Add Phase 2.1 and 3.5

**Files:**
- Modify: `packages/showcase/.claude/commands/dev.md`

- [ ] **Step 1: Add Phase 2.1 (Sprint Contract)**

Insert the same Phase 2.1 text from Task 2 Step 4 before Phase 2.5.

- [ ] **Step 2: Add Phase 3.5 (Evaluate + Iterate)**

Insert the same Phase 3.5 text from Task 2 Step 5 after Phase 3 (Implement), before Phase 4 (Verify).

- [ ] **Step 3: Update Phase 8 report table**

Add the `2.1 Contract` and `3.5 Evaluate` rows and the Metrics section (same as Task 2 Step 6).

- [ ] **Step 4: Update Notes**

Change skip list to include 2.1 and 3.5.

- [ ] **Step 5: Commit**

```bash
git add packages/showcase/.claude/commands/dev.md
git commit -m "feat: showcase dev.md — sync Phase 2.1 (Sprint Contract), Phase 3.5 (Evaluate)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Create Codex Evaluator Skill + Update dev-orchestrator

**Files:**
- Create: `packages/codex/skills/evaluator/SKILL.md`
- Modify: `packages/codex/skills/dev-orchestrator/SKILL.md`
- Modify: `packages/codex/AGENTS.md`
- Modify: `packages/codex/INSTALL.md`

- [ ] **Step 1: Create Codex evaluator skill**

Create `packages/codex/skills/evaluator/SKILL.md` with the same content as the core `evaluator.md` agent, but adapted for Codex:
- Replace `allowed-tools:` with Codex equivalents in frontmatter
- Replace "Agent tool" references with "spawn_agent"
- Add `user-invocable: false` to frontmatter

The body content (Evaluation Protocol, Calibration, Skepticism Rules, Output Format) stays identical.

- [ ] **Step 2: Update Codex dev-orchestrator SKILL.md**

Add Phase 2.1 (Sprint Contract) and Phase 3.5 (Evaluate + Iterate) sections — same content as core but with Codex adaptations (`spawn_agent` instead of `Agent tool`, `->` instead of `→`). Also update Phase 1 complexity assessment and Phase 8 report template.

- [ ] **Step 3: Update Codex AGENTS.md — dev-orchestrator description**

Change:
```
| `dev-orchestrator` | 12-phase development cycle: understand, architect, plan, validate, implement, verify, test, verify-goals, review, critic, document, report |
```
To:
```
| `dev-orchestrator` | 14-phase development cycle: understand, architect, plan, contract, validate, implement, evaluate, verify, test, verify-goals, review, critic, document, report |
```

- [ ] **Step 4: Update Codex AGENTS.md — add evaluator to agent skills list**

In the "Agent skills (auto-dispatched by orchestrators)" list, add `evaluator` after `goal-verifier`.

- [ ] **Step 5: Update Codex INSTALL.md — skill count**

Update any references to skill counts: 41 → 42.

- [ ] **Step 6: Commit**

```bash
git add packages/codex/skills/evaluator/SKILL.md packages/codex/skills/dev-orchestrator/SKILL.md packages/codex/AGENTS.md packages/codex/INSTALL.md
git commit -m "feat(codex): add evaluator skill, update dev-orchestrator to 14 phases

New evaluator skill (Codex equivalent of evaluator agent).
dev-orchestrator: +Phase 2.1 (Sprint Contract), +Phase 3.5 (Evaluate+Iterate)
AGENTS.md: evaluator in agent skills list, dev description updated
Codex skills: 41 → 42

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Documentation Updates + Release v1.3.5

**Files:**
- Modify: `VERSION`, `CHANGELOG.md`, `README.md`, `CLAUDE.md`
- Modify: `docs/guide/01-getting-started.md`, `docs/guide/08-orchestration.md`

- [ ] **Step 1: Bump VERSION**

Change `1.3.4` to `1.3.5`.

- [ ] **Step 2: Update CHANGELOG.md**

Add new section at top (before [1.3.4]):

```markdown
## [1.3.5] — 2026-03-29

### Added
- **`evaluator` agent** — calibrated QA evaluator: scores implementation against Sprint Contract criteria (0-10 with few-shot anchors), MUST/SHOULD priorities, structured critique with trend tracking
- **Phase 2.1 (Sprint Contract)** in `/dev` — testable acceptance criteria generated BEFORE coding. 5-10 criteria for standard tasks, 10-20 for complex
- **Phase 3.5 (Evaluate + Iterate)** in `/dev` — conditional GAN loop: evaluator checks contract, iterates on FAIL (max 2 passes standard, 3 complex), escalates to architect if scores plateau
- **Design Quality dimension** in visual-reviewer — coherent whole vs assembled parts, calibrated 1-10 with score anchors
- **Originality dimension** in visual-reviewer — custom decisions vs AI template defaults, red flag detection (purple gradients, uniform cards, shadow-everything)
- **AI UI pattern detection** in ai-slop-cleaner — Category 6: detects AI-generated interface patterns in frontend code
- **Task state persistence** — pre-compact-save includes `.claude/.task-state.json`, session-context-restore injects it for multi-session /dev continuity
- **Cost metrics** in Phase 8 Report — agent dispatch count, evaluation passes, sprint contract score
- **Codex evaluator skill** — Codex equivalent of evaluator agent

### Changed
- **`/dev` phases**: 12 → **14** (+Sprint Contract, +Evaluate+Iterate)
- **Phase 1 complexity assessment** — enhanced with novelty, risk, and ambiguity factors (not just file/line count)
- **visual-reviewer** scoring — 8 → **10** dimensions (total stays 100pts, weights redistributed)
- Core agents: 24 → **25** (+evaluator)
- Codex skills: 41 → **42** (+evaluator)
```

- [ ] **Step 3: Update README.md**

3a. Update What's New section:
```markdown
## What's New (v1.3.5)

- **Sprint Contract** (Phase 2.1) — testable acceptance criteria BEFORE coding begins
- **Evaluate + Iterate** (Phase 3.5) — conditional GAN loop: evaluator checks contract, iterates on FAIL
- **`evaluator` agent** — calibrated QA skeptic with few-shot scoring (0-10)
- **Design Quality + Originality** in visual-reviewer — catches AI template patterns
- **Task state persistence** — resume /dev from exact phase across sessions
- 14-phase `/dev` pipeline (was 12)

See [full changelog](CHANGELOG.md) for v1.0.0 → v1.3.5 history.
```

3b. Update agent count badge:
```
![Agents](https://img.shields.io/badge/32_agents-Opus_4.6-8A2BE2?style=for-the-badge&logo=anthropic&logoColor=white)
```

3c. Update Core Agents count in What's Inside table:
```
| **Core Agents** | 25 | Code review, security, testing, audit, debugging, health, tree gen, DB review, architecture, docs review, plan validation, goal verification, **evaluation**, critic, visual review, AI slop cleanup — all on **Opus** |
```

3d. Update mermaid diagram:
```mermaid
    P["Planning<br/><br/>1 · Understand<br/>2 · Architect<br/>3 · Plan<br/>4 · Contract<br/>5 · Validate"]
    E["Execution<br/><br/>6 · Implement<br/>7 · Evaluate<br/>8 · Verify<br/>9 · Test<br/>10 · Goals"]
    Q["Quality<br/><br/>11 · Review ×4<br/>12 · Critic<br/>13 · Docs<br/>14 · Report"]
```

3e. Update Key Commands table `/dev` row:
```
| `/dev <task>` | 14-phase orchestrator: understand → architect → plan → contract → validate → implement → evaluate → verify → test → goals → review → critic → docs → report |
```

3f. Update Codex comparison table — skills count 41 → 42.

- [ ] **Step 4: Update CLAUDE.md**

4a. Agent count in counts table: 24 → 25.

4b. Key Files table dev.md description:
```
| `packages/core/commands/dev.md` | 14-phase always-on dev orchestrator with sprint contract + evaluator + plan-checker + goal-verifier + critic gates |
```

- [ ] **Step 5: Update docs/guide/01-getting-started.md**

Change phase list:
```
| `/dev <task>` | Full 14-phase orchestrator: understand, plan, contract, implement, evaluate, verify, test, goals, review, critic, document, report |
```

- [ ] **Step 6: Update docs/guide/08-orchestration.md**

Update the phase diagram to include Phase 2.1 and 3.5. Update the "Key design decisions" to include Sprint Contract and Evaluator.

- [ ] **Step 7: Commit all docs**

```bash
git add VERSION CHANGELOG.md README.md CLAUDE.md docs/guide/01-getting-started.md docs/guide/08-orchestration.md
git commit -m "docs: update all documentation for v1.3.5 release

Agents: 24→25, Codex skills: 41→42, /dev phases: 12→14
README: What's New, mermaid, counts, Key Commands
CLAUDE.md: agent count, dev description
Guides: phase lists, pipeline description

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 8: Push and create release**

```bash
git push origin main

gh release create v1.3.5 --title "v1.3.5 — Sprint Contracts + Evaluator + Conditional GAN Loop" --notes "$(cat <<'RELEASE_EOF'
## What's Changed

### Generator-Evaluator Separation (from Anthropic Harness Design article)
- **`evaluator` agent** — calibrated QA skeptic that scores implementation against Sprint Contract criteria (0-10 with few-shot anchors). MUST/SHOULD priorities, trend tracking across iterations.
- **Phase 2.1 (Sprint Contract)** — testable acceptance criteria generated BEFORE coding. 5-10 criteria for standard, 10-20 for complex tasks.
- **Phase 3.5 (Evaluate + Iterate)** — conditional GAN loop: evaluator checks contract after implementation, iterates on FAIL (max 2-3 passes), escalates to architect if scores plateau.
- **Enhanced Phase 1** — complexity assessment now includes novelty, risk, and ambiguity alongside file/line count.

### Quality Improvements
- **Design Quality dimension** in visual-reviewer — "coherent whole vs assembled parts" with calibrated score anchors
- **Originality dimension** in visual-reviewer — catches AI template patterns (purple gradients, uniform cards, shadow-everything)
- **AI UI pattern detection** in ai-slop-cleaner — Category 6 for frontend files
- **Cost metrics** in Phase 8 Report — agent dispatches, evaluation passes, contract score

### Infrastructure
- **Task state persistence** — pre-compact-save includes .task-state.json, session-restore injects it. Resume /dev from exact phase across sessions.
- **Codex evaluator skill** — Codex equivalent, total skills: 42

### Numbers
- Core agents: 24 → **25**
- Codex skills: 41 → **42**
- /dev phases: 12 → **14**

**Full Changelog**: https://github.com/RaNDoM6913/claude-code-superkit/blob/main/CHANGELOG.md
RELEASE_EOF
)"
```

---

## Self-Review

**1. Spec coverage:**
- Component 1 (evaluator agent) → Task 1 ✅
- Component 2 (Sprint Contract) → Task 2 Step 4 ✅
- Component 3 (Conditional GAN loop) → Task 2 Step 5 ✅
- Component 4 (Enhanced complexity) → Task 2 Step 3 ✅
- Component 5 (pre-compact-save) → Task 5 ✅
- Component 6 (visual-reviewer) → Task 3 ✅
- Component 7 (ai-slop-cleaner) → Task 4 ✅
- Component 8 (Cost metrics) → Task 2 Step 6 ✅
- Component 9 (Codex sync) → Task 8 ✅
- Component 10 (Documentation) → Task 9 ✅

**2. Placeholder scan:** No TBD/TODO/placeholders found. All steps have concrete content.

**3. Type consistency:** Evaluator output format (PROCEED/ITERATE/ESCALATE) matches Phase 3.5 loop logic in dev.md. Sprint Contract format (MUST/SHOULD) matches evaluator priority handling. Score anchors consistent between evaluator.md and spec.
