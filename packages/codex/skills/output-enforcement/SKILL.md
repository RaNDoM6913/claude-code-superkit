---
name: output-enforcement
description: Use when generating or modifying code, reviewing a proposed patch, or reporting implementation completion, especially when omitted work, placeholders, verification gaps, or output limits may affect the deliverable.
user-invocable: false
tokens: 920
---

# Scope-Bound Completeness

Complete the authorized deliverable and report its actual state. Completeness is
judged against the requested result and applicable acceptance criteria, not the
number of files printed or the presence of particular comment strings.

## Before Writing

1. Identify the requested outcome, allowed scope, delivery form, and required
   verification. Reuse an accepted plan; resolve only ambiguities that materially
   affect the result.
2. Inspect the affected code and local contracts before changing them. Identify
   required callers, imports, types, configuration, and tests within the change's
   dependency path. Preserve unrelated files, behavior, and existing user edits.
3. Choose a suitable artifact. A scoped patch may be complete in its existing
   project context. A requested standalone program must include its required
   pieces and setup. A read-only review, explanation, or plan may be prose and
   does not authorize implementation.

## Implement the Required Change

- Supply all logic needed for the authorized result, including its required error
  paths and integration. Do not replace required behavior with empty bodies,
  canned success, dummy data, or comments promising later implementation.
- Use focused edits and preserve surrounding code. A patch need not reproduce
  unchanged file contents. A full replacement file must retain all required
  content; omission markers must not stand in for code that the replacement needs.
- Assess TODOs, comments, ellipses, stubs, and fixtures by their role. Legitimate
  syntax, explanatory comments, existing deferred work, and explicitly requested
  scaffolds or examples are allowed. Label illustrative or intentionally partial
  output clearly; do not pass it off as the requested working implementation.
- Do not fix unrelated TODOs or expand the task merely to make a file appear
  finished. If a newly discovered dependency exceeds authorization, report the
  concrete gap and its effect on completion.

## Verify and Report

Inspect the resulting diff for scope, accidental omissions, and unintended
changes. Check affected imports, types, calls, and interfaces against the project
and its toolchain. Run the applicable focused checks and mandatory acceptance
gates; inspect their results. Reading code does not establish a passing build,
test, runtime, or deployment result.

In the delivery report, state what was produced or changed, the checks actually
performed and their outcomes, and remaining work or uncertainty. For read-only
work, report the inspected scope and evidence limits. Match claims to evidence:
implemented, checked, and accepted are distinct states.

If required behavior or a required acceptance gate remains unresolved, mark the
overall deliverable **INCOMPLETE**, name the missing work or verification and its
blocker, and give the next concrete step. Implementation may be finished while
verification is still pending; say both. Never infer success from an unrun check
or conceal a failed check with a completion claim.

## Output and Context Limits

Use available file-editing tools for substantial changes and return concise file
references or a patch in the requested format. If a real limit prevents finishing,
stop at a coherent boundary when feasible and record **INCOMPLETE** with the exact
file or unit reached, saved changes, remaining work, and verification status. If
an artifact is partial or unusable, identify it explicitly. Resume from that
checkpoint when continuation is available, checking current state before editing;
do not overwrite intervening work, repeat completed edits, or claim continuation
has happened before it does.
