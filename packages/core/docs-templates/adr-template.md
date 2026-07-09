# ADR-NNNN: <decision title>

> **When to write one.** Copy this file to `docs/adr/NNNN-<slug>.md` (zero-padded
> sequence, e.g. `0007-postgres-over-mongo.md`) and fill it in. Write an ADR only
> for decisions with **real alternatives and lasting consequences** — a framework
> or library choice, a data-model shape, a protocol/API style, a security model.
> Never write one for trivial or easily-reversible choices (formatting, naming, a
> local helper's signature): an ADR for everything is ceremony that kills the
> habit. The point of the record is the WHY and the rejected alternatives — the
> context that stops a future session from re-litigating or silently violating
> this decision.

## Status

`proposed` → `accepted` → `deprecated` | `superseded-by-NNNN`

- **Status:** proposed
- **Date:** YYYY-MM-DD

Start at `proposed`; move to `accepted` once the decision is in effect. When a
later ADR overrides this one, set the status here to `superseded-by-NNNN` and
link the replacement so the trail stays intact.

## Context

<!-- The forces at play: the constraints, requirements, and trade-offs that make
this a real decision. 3-6 lines. State the problem, not the solution. -->

TODO: What situation forces a decision? What technical, product, or team
constraints bound the choice? What is non-negotiable, and what is flexible?

## Decision

<!-- What was chosen. Active voice: "We use X." One clear statement, then the
few reasons that made it win over the alternatives below. -->

TODO: We <verb> <choice>, because <the decisive reasons>.

## Alternatives Considered

<!-- The whole point of the record. For each serious alternative, name it and
say WHY it was rejected — that rejection rationale is what future readers need. -->

### Alternative A — <name>
- **What it was:** TODO: one line.
- **Why rejected:** TODO: the specific reason it lost (cost, risk, complexity,
  missing capability, team unfamiliarity, lock-in).

### Alternative B — <name>
- **What it was:** TODO: one line.
- **Why rejected:** TODO: the specific reason it lost.

<!-- Add a third only if a third option was genuinely on the table. -->

## Consequences

<!-- What this decision makes easier AND harder. Include the negative ones
honestly — a decision with no downsides usually means one wasn't recorded. -->

- **Easier:** TODO: what this unlocks or simplifies.
- **Harder / accepted cost:** TODO: the downside you are knowingly taking on.
- **Follow-ups:** TODO: any migration, guardrail, or revisit-trigger this implies.
