# GAN Harness — packages/gan/

Three-agent loop for **adversarial verification** of UI / interactive features.

Inspired by the GAN (Generator-Adversarial-Network) pattern from
[affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)
(Anthropic Hackathon Winner).

## What it does

Most "this is done" claims fail under real-world conditions because the
implementor never asked "what does failure look like?" GAN forces that
question by structurally separating planning from implementation from
verification.

```
gan-planner → gan-generator → gan-evaluator
   ↑                              │
   └─ (NEEDS-ATTENTION / NEEDS-REMEDIATION) ─┘
```

- **gan-planner** writes a plan with falsifiable scenarios (happy + empty
  + error + auth) and a rubric.
- **gan-generator** implements the code AND the Playwright tests against
  the plan.
- **gan-evaluator** runs Playwright, checks anti-slop, scores against
  the rubric. Adversarial — defaults to NEEDS-REMEDIATION. (A blocked
  run — environment broken, can't even execute — is surfaced separately
  as BLOCKED.)

If the evaluator rejects, the generator gets specific failures back and
iterates. Loop closes when verdict = PASS, or escalates after 3 iterations
without progress (→ human escalation).

## When to use

- UI features where "looks right" matters
- Forms, dashboards, components, interactive flows
- Bug-fix verification where unit tests aren't enough evidence
- Any change where passing tests + visible polish are both required

## When NOT to use

- Pure backend / library work without a UI surface (use `reality-checker` instead)
- Refactors with no behavior change
- Bug fixes covered by a single failing test

## Installation

GAN is an **optional** package and is **not wired into the installer** — copy it
in manually. It requires Playwright (~150 MB), so install it only if you'll
actually use it.

```bash
# From your project root
cp packages/gan/agents/*.md .claude/agents/
cp -r packages/gan/skills/* .claude/skills/
mkdir -p .claude/rubrics && cp packages/gan/rubrics/*.md .claude/rubrics/

# Playwright is required for gan-evaluator to run the tests
npx playwright install
```

For Codex CLI, copy the skill mirrors into your skills dir instead:

```bash
cp -r packages/gan/skills/* ~/.agents/skills/
```

## Structure

```
packages/gan/
├── agents/                    # Claude Code agents (Opus)
│   ├── gan-planner.md
│   ├── gan-generator.md
│   └── gan-evaluator.md
├── skills/                    # Codex CLI mirrors
│   ├── gan-planner/SKILL.md
│   ├── gan-generator/SKILL.md
│   └── gan-evaluator/SKILL.md
├── rubrics/
│   ├── ui-quality.md          # 17-criterion UI rubric
│   └── functionality.md       # 15-criterion API/backend rubric
└── README.md
```

## How to invoke

In Claude Code:

```
/agent gan-planner
Plan a feature: add a "create post" form with title + body, optimistic
update, and graceful error recovery.
```

After planner outputs the plan:

```
/agent gan-generator
Implement the plan above. Run Playwright when done.
```

After generator hand-off:

```
/agent gan-evaluator
Evaluate the implementation against the plan's rubric.
```

In Codex CLI: the same flow, just using `skill gan-planner` / `gan-generator` / `gan-evaluator`.

## Loop control

The loop is human-driven by default — you decide when to re-dispatch.

For autopilot:
- Run gan-planner → save plan
- Run gan-generator → save hand-off
- Run gan-evaluator → if NEEDS-ATTENTION or NEEDS-REMEDIATION, re-run generator with the failure list as input
- Repeat up to 3 times; if no progress → escalate

## Anti-slop checks

The rubrics include explicit anti-slop criteria the evaluator enforces:

- No `console.log` left in production code
- No "Lorem ipsum" / "Click me" / placeholder text
- No generic Tailwind defaults — brand colors required
- Empty state has specific content + CTA (not blank, not spinner)
- Error state is specific (not "Something went wrong")
- All `// TODO` in changed lines addressed

## Cost / time

- A typical GAN loop takes 3-8× the time of a single-agent implementation
- Use it when correctness + polish are worth that cost (production features)
- Don't use it for quick fixes or experiments

## Comparison to other agents

| Pattern | Best for |
|---------|----------|
| Single agent | Simple feature, you'll review yourself |
| `architect` + impl | Complex feature with structural design decisions |
| `architect` → impl → `reality-checker` | Production feature, you want a single verification pass |
| **GAN loop** | Production UI feature, you want iterative adversarial verification |
| `silent-failure-hunter` | Final quality pass for error handling |

## Source

Adapted from `affaan-m/everything-claude-code` GAN pattern. Original
reports +2.25 quality score gain. Our adaptation differs:
- Codex SKILL.md mirrors for Codex CLI users
- Explicit rubric files (ui-quality.md, functionality.md) instead of
  agent-internal scoring
- Optional, manual install (Playwright dependency is heavy)

License: MIT (consistent with rest of the kit).
