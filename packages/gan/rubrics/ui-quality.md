# UI Quality Rubric

Used by `gan-evaluator` to score implementation quality on UI / interactive features. Every criterion is binary (pass / fail); some rows carry an explicit `N/A if` condition.

**How N is computed:** applicable criteria N = 21 table rows − N/A rows + extra criteria from the plan's `## Rubric` section. `gan-planner` states N in the plan; without a planner handoff, `gan-evaluator` applies the `N/A if` conditions itself. Score X = criteria passed.

## 1. Scenarios (aggregate — each row judged once, across ALL planned scenarios)

| # | Criterion | Pass if |
|---|-----------|---------|
| 1.1 | Every scenario has a test | Each scenario in the gan-planner output appears as its own `test()` block in the named spec file |
| 1.2 | All scenario tests pass | `npx playwright test` green for the spec file |
| 1.3 | Persistence verified | The happy-path test includes `page.reload()` and re-asserts the created/changed state |
| 1.4 | Timing verified | Critical assertions use a bounded `{ timeout: <ms> }` |
| 1.5 | URL state verified | Every scenario that changes the URL asserts `expect(page).toHaveURL(...)`. N/A if no scenario changes the URL |

## 2. Anti-slop content

| # | Criterion | Pass if |
|---|-----------|---------|
| 2.1 | No console.log | `grep -rn 'console\.log' src/ app/ components/ \| grep -v test` returns empty (adjust roots to project layout) |
| 2.2 | No placeholder text | `grep -ri 'lorem ipsum\|placeholder text\|click me'` returns empty |
| 2.3 | No TODO in changed lines | git diff shows no new `// TODO` or `# TODO` |
| 2.4 | No commented-out code blocks | git diff doesn't add multi-line comment blocks of code |

## 3. Visual design

| # | Criterion | Pass if |
|---|-----------|---------|
| 3.1 | Brand colors used | Component uses `bg-primary`, `text-brand-*`, or design tokens — not raw Tailwind defaults like `bg-blue-500` |
| 3.2 | Typography hierarchy | Headings + body have distinct sizing; not all same size |
| 3.3 | Spacing system used | Padding / margin uses design tokens (`p-4`, `gap-6`) — not magic values |
| 3.4 | Responsive | Layout renders correctly at 375px width AND 1440px width (test both via Playwright viewport) |

## 4. States

| # | Criterion | Pass if |
|---|-----------|---------|
| 4.1 | Empty state | Empty-data renders specific content with a CTA — not blank, not loading spinner |
| 4.2 | Loading state | Async operations show a loading indicator with clear context |
| 4.3 | Error state | Errors show specific message — never generic "Something went wrong" |
| 4.4 | Auth-required | Protected routes redirect to login or show clear access denial. N/A if the plan marks the auth-required scenario `N/A` (fully public feature) |

## 5. Accessibility

| # | Criterion | Pass if |
|---|-----------|---------|
| 5.1 | Interactive elements have accessible names | All buttons / links found via `getByRole('button', { name: ... })` |
| 5.2 | Form fields have labels | All inputs found via `getByLabel(...)` |
| 5.3 | Color contrast | For key text elements: extract `color` and `background-color` via `page.evaluate(() => getComputedStyle(el))`, compute the WCAG contrast ratio, ratio ≥ 4.5:1 |
| 5.4 | Keyboard navigation | Critical flows complete with only `Tab` + `Enter` |

## Scoring

Total criteria: 21 (5 scenario + 4 anti-slop + 4 visual + 4 states + 4 accessibility). Applicable N = 21 − N/A rows + extra criteria from the plan's `## Rubric` section.

Apply the first matching row, top to bottom:

| Condition | Verdict |
|-----------|---------|
| X = N and zero critical failures | PASS — ship it |
| X ≥ 0.8 × N and zero critical failures | NEEDS-ATTENTION — fix the gaps in place, re-evaluate |
| X < 0.8 × N | NEEDS-REMEDIATION — significant gaps; recommend returning to gan-planner in the report |

With all 21 criteria applicable: PASS = 21, NEEDS-ATTENTION = 17–20, NEEDS-REMEDIATION ≤ 16.

BLOCKED is never a score outcome. `gan-evaluator` reports BLOCKED separately, only when the evaluation itself could not run.

## Critical failures (override any score)

- Any scenario test fails
- console.log in production code path
- Generic "Something went wrong" error
- Placeholder text in the rendered output
- No empty state defined (just shows blank div)

Any critical failure forces the verdict to NEEDS-REMEDIATION — never PASS, never NEEDS-ATTENTION, regardless of X / N.
