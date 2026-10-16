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

For Codex, install the three Codex-native skills separately. The standard kit
installer does not install this optional package or its rubric resources. From
your target project, set `SUPERKIT_SOURCE` to the checkout you are copying from.
Inspect existing destination files first and preserve customized copies.

```bash
SUPERKIT_SOURCE=/absolute/path/to/claude-code-superkit
for role in gan-planner gan-generator gan-evaluator; do
  mkdir -p "$HOME/.agents/skills/$role"
  gan_target="$HOME/.agents/skills/$role/SKILL.md"
  if [ -e "$gan_target" ] || [ -L "$gan_target" ]; then
    printf 'Preserved existing %s; compare manually before updating.\n' "$gan_target"
  else
    cp "$SUPERKIT_SOURCE/packages/gan/skills/$role/SKILL.md" "$gan_target"
  fi
done

# Separate, explicit rubric copy; Claude Code is not a prerequisite.
mkdir -p .gan/rubrics
for rubric in ui-quality functionality; do
  gan_target=".gan/rubrics/$rubric.md"
  if [ -e "$gan_target" ] || [ -L "$gan_target" ]; then
    printf 'Preserved existing %s; compare manually before updating.\n' "$gan_target"
  else
    cp "$SUPERKIT_SOURCE/packages/gan/rubrics/$rubric.md" "$gan_target"
  fi
done
```

Alternatively, supply accessible rubric paths without copying them. Pass those
exact paths to the planner, generator and evaluator; the plan binds the actual
contents and approved applicability. Copying only SKILL.md never supplies the
rubrics. Missing required rubric/environment evidence leaves the corresponding
Codex gate incomplete or BLOCKED. The commands above copy local files only;
installing Playwright/browser dependencies or starting an application requires
the task's actual setup authority.

## Structure

```
packages/gan/
├── agents/                    # Claude Code agents (Opus)
│   ├── gan-planner.md
│   ├── gan-generator.md
│   └── gan-evaluator.md
├── skills/                    # Codex-native skills
│   ├── gan-planner/SKILL.md
│   ├── gan-generator/SKILL.md
│   └── gan-evaluator/SKILL.md
├── rubrics/
│   ├── ui-quality.md          # 21-criterion UI rubric
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

In Codex, request the named installed role in the task and provide its inputs:
“Use gan-planner for this feature with these rubric paths”, then “Use
gan-generator with this approved plan”, then “Use gan-evaluator with the plan
and generator hand-off.” Follow the current host's supported skill-selection
mechanism; `skill gan-planner` is not a universal shell/CLI command. These roles
retain `user-invocable: false` and may be selected by the agent for the task.

### Codex contract

The Codex-native SKILL.md instructions govern Codex execution; the Claude agent
files and shared rubric recipes retain their own contracts. Codex binds the
approved plan, stable requirement/scenario IDs, rubric row IDs, N/A rationale,
extras, critical requirements and content version/hash before implementation.
The original selected rubric rows and any approved project adaptations stay
visible. Historical style recipes are not blanket font/framework bans, and
“ship it” in a rubric does not authorize shipping, merge or release.

The generator implements application code plus Playwright tests. Its green run
is not independent acceptance. Use available, authorized independent execution
for the evaluator; an inline fallback must say INLINE SELF-REVIEW and cannot
satisfy mandatory independence. Requested routing and observed runtime identity
are separate; no invented model/agent identity or obsolete claim that Codex has
no subagents.

The evaluator runs required existing checks when authorized and reports actual
scenario coverage, rendered/interaction evidence and rubric results. It cannot
edit implementation, tests or criteria to obtain PASS. Missing required rubric,
runtime or independence evidence blocks acceptance; zero, skipped, truncated or
error-only results cannot establish PASS. Confirmed defects remain reportable
alongside an incomplete gate. Verdicts are PASS, NEEDS-ATTENTION,
NEEDS-REMEDIATION or BLOCKED, with Gate status COMPLETE or INCOMPLETE; an incomplete
gate never yields PASS. Scores do not waive critical failures. Fixture, local
functional and production evidence remain distinct.

Codex handoffs preserve `# GAN Plan`, one `## Rubric`, `## Generator hand-off`
and `EVALUATION REPORT`. Looping is manual unless explicitly authorized: at most
3 corrective generator/evaluator cycles and 3 fix attempts per failing test, or
the stricter task limit. Keep counters across handoffs/re-plans; stop earlier on
user steering or unchanged unavailable evidence. Tool availability does not
authorize dependency/browser installation, app startup, private captures,
network side effects or production changes. Reuse authority already granted;
do not ask again for ordinary implementation/checks inside that scope.

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
- Codex-native SKILL.md roles for Codex users
- Explicit rubric files (ui-quality.md, functionality.md) instead of
  agent-internal scoring
- Optional, manual install (Playwright dependency is heavy)

License: MIT (consistent with rest of the kit).
