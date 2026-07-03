---
name: gan-planner
description: Plans testable feature implementations with concrete acceptance criteria + Playwright-verifiable test scenarios for the GAN evaluator loop. Step 1 of 3 in GAN harness
user-invocable: false
---

# GAN Planner

Step 1 of 3 in the GAN (Generative Adversarial Network) harness. Turns a feature brief into falsifiable, Playwright-testable scenarios plus a rubric handoff, so `gan-generator` knows exactly what to build and `gan-evaluator` knows exactly how to score it. Codex CLI has no subagents: run this as the first of three skills in sequence — its markdown plan is the literal input to the generator step.

## Hard Rules

- Every scenario MUST carry all four assertion types: visual, state, persistence, timing.
- The plan MUST fill the four fixed scenario slots — happy / empty / error / auth-required. A slot may read `N/A — <reason>` only when it genuinely cannot apply (e.g., auth-required on a fully public page).
- The plan MUST include the `## Rubric` section: rubric file(s), applicable criteria count N per rubric, N/A rows with reasons, extra criteria. `gan-evaluator` scores X / N from this section — omitting it breaks the loop.
- NEVER pause to ask the user mid-run. When the spec leaves a question open, record it under `## Assumptions` with the assumption you proceed on.
- Every scenario states what the user sees on failure as concretely as on success.
- Name the exact Playwright test file path the generator must create.

## Phase 0 — Load Project Context

Read if present, skip silently if absent:
1. `CLAUDE.md` / `AGENTS.md` — project conventions, test setup
2. `playwright.config.*` — what's already wired up
3. Existing tests in `tests/e2e/` or `e2e/` — reuse patterns and helpers
4. Rubric files in `.claude/rubrics/` (if not found: glob `**/rubrics/ui-quality.md`; still missing → note `NOT FOUND: <path>` in the plan and use the default totals in Step 5)
5. The feature spec / brief from the user

Use it to make the plan executable in this project, not a generic template.

## When to Use

- Before `gan-generator` writes code for a UI / interactive feature
- For features where "looks right" matters (UX flows, forms, dashboards, components)
- For changes where a passing unit test is insufficient evidence of correctness

Do NOT use for:
- Pure backend / library work without a UI surface
- Refactors that don't change behavior
- Bug fixes covered by an existing failing test

## Workflow

### Step 1: Disambiguate the goal

From the spec, answer three questions:
- What does the user **see** when this works?
- What does the user **see** when this fails gracefully?
- What does the user **see** when this fails ungracefully (and how do we prevent that)?

If the spec leaves any of these open, do not stall: record the open question under `## Assumptions` with the assumption you chose, and proceed on it.

### Step 2: Decompose into scenarios

Each scenario is a Playwright-testable user journey:

```
SCENARIO 1: Happy path — user creates a post
  GIVEN logged in user on /posts
  WHEN they click "New post", type title + body, click "Publish"
  THEN they see the post in the feed within 2 seconds
  AND the URL is /posts/<id>
  AND the post is persisted (refresh page → still there)
```

Each scenario has:
- Preconditions (auth state, DB state, network state)
- Steps (clicks, typing, navigation)
- Assertions (visual + URL + persistence)

### Step 3: Define falsifiable acceptance criteria

For each scenario, all four assertion types:
- Visual assertion (selector + expected content)
- State assertion (URL, localStorage, cookies)
- Persistence assertion (refresh page → element still present)
- Timing assertion (action completes within N ms)

### Step 4: Identify edge cases that MUST be tested

| Category | Examples |
|----------|----------|
| Empty state | No data; first-time user; no permissions |
| Error state | Network failure; server 500; validation error |
| Slow state | Slow network (Playwright throttle); large dataset |
| Auth state | Logged out; expired session; wrong role |

### Step 5: Select the rubric(s) and fix N

Decision table:

| Feature touches | Rubric file(s) |
|-----------------|----------------|
| UI surface only (pages, components, forms, flows) | `ui-quality.md` |
| API / service / job logic only, no UI surface | `functionality.md` |
| Both UI and backend logic | Both files, scored separately |
| Unclear after reading the brief | Both files (default) |

For each selected rubric:
1. Read the rubric file and use its stated total (ui-quality.md: 21 criteria; functionality.md: 15 criteria).
2. Apply each criterion's `N/A if` condition to this feature/project; list N/A rows with a one-line reason each.
3. Add scenario-specific **extra criteria** only for checks no rubric row covers — each must be binary and evaluator-checkable, and each adds 1 to that rubric's N.
4. N = rubric total − N/A rows + extra criteria. Write it all into the plan's `## Rubric` section.

### Step 6: Mark anti-AI-slop checks

Flag risks the generator might fall into:
- [ ] Placeholder text not replaced
- [ ] `console.log` left in production code
- [ ] Generic Tailwind defaults — no brand color, no spacing system
- [ ] Loading state but no error state
- [ ] "Click me" button text or copy-pasted lorem ipsum
- [ ] TODO comments not addressed

## Output Contract

```markdown
# GAN Plan: <feature name>

## Goal
<1 sentence — what the user can do that they couldn't before>

## Out of scope
<3 things explicitly NOT covered>

## Assumptions
<open questions from the spec + the assumption you proceed on — or "none">

## Scenarios

### Scenario 1 (happy path): <name>
- Given: <preconditions>
- When: <steps>
- Then:
  - [ ] <visual assertion>
  - [ ] <state assertion>
  - [ ] <persistence assertion>
  - [ ] <timing assertion>

### Scenario 2 (empty state): <name>
...

### Scenario 3 (error state): <name>
...

### Scenario 4 (auth-required): <name or "N/A — <reason>">
...

## Rubric
- Files: <ui-quality.md | functionality.md | both>
- <rubric file>: N = <applicable count> (of <rubric total>; N/A: <row # — reason, ... | none>)
- Extra criteria: <E1 — <binary check> ... | none>

## Anti-slop checklist (for evaluator)
- [ ] No placeholder text
- [ ] No console.log
- [ ] Brand colors applied (not Tailwind default)
- [ ] Loading + error + empty states all present
- [ ] No "Lorem ipsum" or "Click me"
- [ ] No unaddressed TODO

## Acceptance criteria (must all be true)
1. All scenarios pass Playwright
2. Anti-slop checklist clean
3. No console errors during scenario runs

## Files to be modified
- <path/to/file> — what changes there

## Test files to be added
- tests/e2e/<feature>.spec.ts
```

Example of a filled `## Rubric` section:

```markdown
## Rubric
- Files: ui-quality.md
- ui-quality.md: N = 21 (of 21; N/A: none)
- Extra criteria: E1 — optimistic update rolls back on 500 (UI returns to pre-submit state) → N = 22
```

## Hand-offs

- **To `gan-generator`** (next skill in sequence): the plan is its input. It must implement every scenario, pass the anti-slop checklist, and write the Playwright tests in the named test file.
- **To `gan-evaluator`** (final skill): it runs Playwright against the scenarios, marks each acceptance criterion ✓/✗, and scores X / N against the `## Rubric` section. Gaps go back to the generator step with specific failures.

## Done ONLY when

- [ ] All four scenario slots are filled (or `N/A — <reason>`), each with all four assertion checkboxes.
- [ ] `## Rubric` names the file(s), N per rubric, N/A rows with reasons, and extra criteria (or "none").
- [ ] Test file path and files-to-be-modified list are named.
- [ ] Open questions recorded under `## Assumptions` (or "none").

Not all boxes checked → the plan is not done; fill the gap, do not emit.

## Recap — non-negotiables

- Four assertion types per scenario; four fixed scenario slots (N/A only with a reason).
- `## Rubric` with N per rubric is mandatory — it is the evaluator's denominator.
- No mid-run questions: assume, record under `## Assumptions`, proceed.
- Failure modes as concrete as success.

*Pattern adapted from `affaan-m/everything-claude-code`.*
