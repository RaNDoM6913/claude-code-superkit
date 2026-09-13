# Superkit contributor working agreement

Approved by the repository owner on 2026-09-13. These rules govern work on
Superkit itself. They are not an edit to the templates installed into consumers.
This is the repository's durable copy of the approved delivery agreement; the
root AGENTS.md and CLAUDE.md point here rather than duplicating it.

Before tools or edits, state a short user-facing plan. Respect an explicit pause;
a request to update working rules does not resume paused implementation.

User working agreement, established 2026-09-13. These defaults replace optional
skill ceremony; preserve explicit task constraints and mandatory project gates.

1. **Deliver outcomes.** Before each coherent objective, name its user-visible
   result or plan exit criterion, owned scope, short acceptance checklist, and
   non-goals. Reuse the accepted plan; update this packet only when scope or
   acceptance changes. Tie every new helper, abstraction, test,
   or artifact to that result or a concrete observed defect. Defer optional
   hardening that does not unblock the agreed result; do not silently grow scope.

2. **Use checkpoints, not timer-driven work.** A requested 20–30-minute cadence
   means report progress at that interval, unless the user explicitly limits the
   work to one timed batch. Respect the authorized stopping boundary. Never wait
   artificially, split work into trivial predicates to fill batches, or stop a
   coherent authorized task solely because the reporting interval elapsed.

3. **Parallelize implementation.** For independent work, normally use 2–3 workers
   concurrently within available slots. Give each a substantial, bounded deliverable
   and disjoint file ownership or suitable isolation. The coordinator owns shared
   interfaces, integration, ledger/branch state, and final acceptance. Keep true
   dependencies sequential. Do not delegate merely to keep slots occupied.

4. **Route and brief deliberately.** Follow explicit project/session model routing and
   reference its source in the packet; otherwise use the configured default.
   Escalate for a stated critical risk, unresolved uncertainty, or failed approach
   at the approved tier. Never substitute an unproven cheaper tier. Default to clean
   worker context with no inherited conversation history. Packets contain only the
   objective, owned paths, relevant contracts, acceptance checks, and required
   return evidence. Workers do not recursively fan out unless explicitly assigned.

5. **Review coherent changesets.** Low-risk documentation, comments and formatting
   normally need coordinator verification only. Coherent behavioral milestones and changes with meaningful
   contract/regression risk normally get one independent review after related
   worker results are integrated into one testable objective. Narrow, reversible
   fixes with focused tests may be accepted by the coordinator. Security/authority boundaries, data loss, migrations, public
   contracts, and irreversible operations warrant earlier focused review plus the
   required acceptance gate. Split a scope that cannot be completely reviewed;
   never replace complete coverage with arbitrary sampling.

6. **Avoid review loops.** Reviewers receive the exact changed scope and existing
   verification evidence, not the entire history. Findings need a concrete impact
   or binding requirement; preferences are not blockers. Coordinator may accept a
   narrow confirmed fix with targeted tests and diff inspection. Re-review when a
   fix materially changes behavior/architecture/risk or a required gate demands it;
   review the affected change, not the whole unchanged package again. Batch minor
   nits. After two failed correction cycles, reassess root cause/scope instead of
   spawning repeated second opinions.

7. **Test according to risk.** Workers run relevant tests for their owned changes.
   Add tests for real failure modes/contracts, including necessary negative cases;
   avoid assertions that merely mirror implementation, prose, or constants.
   Run the complete required suite once on the stable integrated result. Repeat
   only after relevant changes, failures, or unresolved concerns. Reviewers reuse
   recorded results and run additional checks only for a concrete uncertainty.
   Mutation/adversarial checks serve consequential boundaries, not every predicate.

8. **Keep evidence compact.** Maintain one current concise checkpoint and one
   acceptance report/evidence bundle per meaningful milestone when required.
   Do not generate elaborate duplicate reports/full-log snapshots for every small
   fix. Preserve required immutable evidence and existing records. Keep full logs
   on disk; return summaries and necessary failure excerpts. Read skills once and
   use targeted searches/excerpts instead of repeatedly loading large artifacts.

9. **Measure the actual objective.** Report completed capabilities/accepted exit
   criteria, remaining mandatory work or blockers, verification, and Git state.
   Test/file/commit counts are evidence, not completion percentages. Give a total
   percentage only with stated milestone weights or an explicit estimation basis;
   do not present equally weighted unequal phases as effort progress. Report token
   or cost figures only from appropriate telemetry, with uncertainty; context
   occupancy is not billed usage.

10. **Surface blocked closure.** If an authorization, dependency, unavailable
    capability, or acceptance requirement prevents closing the main goal, say so
    promptly and bound any useful preparatory work. Do not replace a blocked
    milestone with endless tooling. Do not waive mandatory checks or permissions
    to appear faster. Follow the operator's context/handoff policy; a large context limit is an upper
    boundary, not a target session size.


## Project application

For the approved Astra-native migration, Astra/root coordinates architecture,
shared contracts, integration and acceptance; independent Sol workers own bounded
implementation packages. Use at most three workers alongside the coordinator
when slots permit. Terra/Luna production eligibility is still unproven. These
worker choices do not override the shipped Claude asset model conventions.
Other tasks follow their explicitly approved runtime/model routing.

Keep the migration's authorization boundaries: stable checkpoint commit/push on
codex/astra-native-hardening is authorized; merge/release require their existing
approval and acceptance gates. Live model evaluations remain restricted by the
current task instructions. Read the current migration checkpoint on resumption;
first reassess the minimum mandatory W00B exit scope instead of adding another
optional infrastructure layer. This pause applies to the migration, not unrelated
work separately authorized by the owner.

For the owner's Codex sessions, preserve the established 500,000-token context
handoff agreement. Use current-session telemetry with its timestamp, never summed
usage or billed tokens. At the threshold, save a concise handoff and continue in
an authorized clean session on the required checkout, without forking full history.
If telemetry is unavailable or compaction is observed, disclose it and follow the
operator's conservative handoff instructions. This is an agent working rule, not
a promise of an application-level automatic interrupt.
