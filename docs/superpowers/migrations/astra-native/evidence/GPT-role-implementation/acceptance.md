# Four delivery roles — source checkpoint

Date: 2026-10-09. Base: `d96422f`; branch `codex/astra-native-hardening`.
Status: accepted by Astra for source/static/integration after independent Sol
review and one narrow correction. Behavioral acceptance is not claimed.

## Authorized packet and gate boundary

After the complete roadmap, the owner requested exactly four more agents in this
chat. This bounded source-authoring packet covers `minimal-change-engineer`,
`codebase-onboarding-engineer`, `scaffold-endpoint`, and `ai-slop-cleaner`.
It stages A01, A02, and one A03 role together at the authoring/static/integration
level. This source ordering does not pass G01, qualify a runtime/model, promote
later behavioral waves, or close W00B. The original mandatory behavioral and
release gates remain pending. No fifth role, live evaluation, new evaluation
infrastructure, Claude component change, merge, or release is included.

## Authorship and changes

`astra_four_role_author` was dispatched as `gpt-6-astra/high` and authored all
four prompts, their semantic corrections, and the root CLAUDE.md structure-note
update. `sol_four_role_integration` (`gpt-5.6-sol/medium`) owned the native manifest
and preservation-test expectations. `sol_four_role_review` (`gpt-5.6-sol/high`)
provides independent read-only review. The coordinator owns integration,
descriptive documentation, tracker/evidence, verification, and Git. These are
authoring dispatch records, not protected runtime identity from a behavioral run.

| Role | Observed original problem | Changed contract |
|---|---|---|
| minimal-change-engineer | Line/occurrence heuristics, restricted caller inspection, unrelated immediate security fixes | Smallest sufficient correct solution; relevant dependency inspection; explicit review/edit scope; safeguards and public compatibility retained |
| codebase-onboarding-engineer | Fixed timers, broad/unbounded discovery, command/run ambiguity | Task-scoped read-only brief; declared/locked/observed versions; bounded relevant history; RUN/NOT RUN/BLOCKED command evidence |
| scaffold-endpoint | Forced layers and down migrations; incomplete business logic could be reported as scaffold completion | Actual project architecture, explicit API/auth contract, route/business/persistence checks, honest scaffold-only gaps and migration authority |
| ai-slop-cleaner | One-use helper deletion, unsafe dead-code assumptions, behavior changes labeled cleanup | Evidence-backed equivalence; preserve indirect consumers, callbacks, directives and meaningful boundaries; logic fixes remain separate |

All four report requested/configured routing separately from observed runtime
identity or UNVERIFIED, and disclose independent versus inline execution. Missing
runtime identity is a reporting limitation, not an invented delivery gate.

The native manifest now protects ten agent prompts plus two partially adapted
workflow callers. Existing preservation tests use the actual shipped manifest and
verify every protected file byte-for-byte in disposable repositories. Ordinary
conversion remains supported; missing native assets fail before writes. All four
roles already appear in AGENTS.md; no unsolicited caller wiring was added.

## Verification

- `npm test`: exit 0; 275 passed, zero failed/skipped/cancelled/todo. Full local log:
  `/tmp/superkit-four-roles-2026-10-09/npm-test.log`.
- `node --test test/codex-native-preservation.test.js`: 2/2 passed, covering the
  expanded protected set and missing-native preflight.
- Final `node --test test/codex.test.js`: 9/9 passed after the narrow endpoint
  authority correction; full log in the same local directory as
  `final-codex-assets.log`.
- Four role files: name/invocation/frontmatter checks and approximate token
  metadata passed. Stock skill validation passed on temporary copies omitting
  only its unsupported repository-established `tokens`/`user-invocable` keys;
  originals retain these keys. This validates format, not model behavior.
- `bash bin/superkit-counts-verify.sh --check-remote`: passed after correcting
  INSTALL's subset wording from “12 skills” to “12 entries”, which the existing
  parser had mistaken for the total. Actual catalog remains 82 main skills.
- `git diff --check`: passed. No converter was run against the live repository.

## Review and acceptance

The independent Sol reviewer covered all ten implementation/documentation files.
Two narrow findings were resolved: Astra clarified that unsafe shared dependencies
can be changed only within existing authorization, with missing scope/authority
resolved before edits; descriptive documentation now calls this the delivery
group, accurately including read-only onboarding. The role does not request fresh
approval for work the user has already authorized.

The reviewer found no other issue in the four contracts or native protection.
Astra revalidated the endpoint correction, reviewed the actual full-suite summary
and acceptance record, and explicitly accepted this source/static/integration
checkpoint. The coordinator inspected the narrow fix and documentation wording.
No broader executable change followed the full suite; final asset checks cover
the prompt correction. Tracker/handoff and this evidence summary are coordinator-
verified checkpoint additions rather than another implementation review loop.

## Progress and remaining work

Agent authoring/static/integration advances by four, from 6/55 to
10/55. Behavioral acceptance remains 0/55. Workflow completion remains 0/9 with
two partial callers; support completion remains 0/21. A03 still has two untouched
roles. No catalog size or package version changes; release target remains 1.5.3.

G01 needs separately authorized, bounded target-model behavioral checks of the
seven-role critical core and runtime delegation. No capability, eligibility, or
production-readiness claim can be inferred from this source checkpoint or green
repository tests. The four-role stopping boundary is retained.
