# UI Quality Rubric

Used by `gan-evaluator` to score implementation quality on UI / interactive features. Each criterion is binary (pass / fail). Total score is # criteria passed.

## Scenarios (from plan)

For each scenario in the gan-planner output:

| # | Criterion | Pass if |
|---|-----------|---------|
| 1.1 | Test exists | Playwright test file has the scenario |
| 1.2 | Test passes | `npx playwright test` green |
| 1.3 | Persistence verified | Test includes `page.reload()` and re-asserts |
| 1.4 | Timing verified | Test has `{ timeout: <bounded> }` on critical assertions |
| 1.5 | URL state verified | Test asserts `expect(page).toHaveURL(...)` where relevant |

## Anti-slop content

| # | Criterion | Pass if |
|---|-----------|---------|
| 2.1 | No console.log | `grep -rn 'console\.log' src/ \| grep -v test` returns empty |
| 2.2 | No placeholder text | `grep -ri 'lorem ipsum\|placeholder text\|click me'` returns empty |
| 2.3 | No TODO in changed lines | git diff shows no new `// TODO` or `# TODO` |
| 2.4 | No commented-out code blocks | git diff doesn't add multi-line comment blocks of code |

## Visual design

| # | Criterion | Pass if |
|---|-----------|---------|
| 3.1 | Brand colors used | Component uses `bg-primary`, `text-brand-*`, or design tokens — not raw Tailwind defaults like `bg-blue-500` |
| 3.2 | Typography hierarchy | Headings + body have distinct sizing; not all same size |
| 3.3 | Spacing system used | Padding / margin uses design tokens (`p-4`, `gap-6`) — not magic values |
| 3.4 | Responsive | Layout renders correctly at 375px width AND 1440px width (test both via Playwright viewport) |

## States

| # | Criterion | Pass if |
|---|-----------|---------|
| 4.1 | Empty state | Empty-data renders specific content with a CTA — not blank, not loading spinner |
| 4.2 | Loading state | Async operations show a loading indicator with clear context |
| 4.3 | Error state | Errors show specific message — never generic "Something went wrong" |
| 4.4 | Auth-required | Protected routes redirect to login or show clear access denial |

## Accessibility

| # | Criterion | Pass if |
|---|-----------|---------|
| 5.1 | Interactive elements have accessible names | All buttons / links found via `getByRole('button', { name: ... })` |
| 5.2 | Form fields have labels | All inputs found via `getByLabel(...)` |
| 5.3 | Color contrast | Text meets WCAG AA (4.5:1) — verify with Playwright `toHaveCSS` for key elements |
| 5.4 | Keyboard navigation | Critical flows complete with only `Tab` + `Enter` |

## Scoring

Total criteria: 17

| Score | Verdict |
|-------|---------|
| 17 / 17 | PASS — ship it |
| 14-16 / 17 | NEEDS-ATTENTION — fix the gaps in place, re-evaluate |
| 11-13 / 17 | NEEDS-REMEDIATION — significant gaps, regenerate sections |
| ≤ 10 / 17 | BLOCKED — back to planner |

## Critical failures (auto-fail regardless of score)

- Any scenario test fails
- console.log in production code path
- Generic "Something went wrong" error
- Placeholder text in the rendered output
- No empty state defined (just shows blank div)

If ANY critical failure → verdict is at most NEEDS-REMEDIATION, never PASS.
