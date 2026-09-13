# Deterministic Astra-native fixtures

The corpus contains clean, defect, noise, ambiguous, and unavailable-tool cases.
Run the fixture and recovery checks from the repository root:

```sh
node --test test/behavioral-eval.test.js test/review-eval.test.js test/recovery-eval.test.js
```

The lookup harness materializes the three review cases in separate temporary
workspaces, adds the shared public lookup.test.js and TASK.md, then runs Node.
Clean exits 0 with two passing tests; defect and noise exit 1 with the expected
null TypeError. Normalized review scoring accepts the correct finding while
implementation scoring still rejects the failing command. Extra noise findings
are out of scope. The declared noise context-file budget is not measured yet.

The recovery harness materializes the ambiguity and unavailable-tool cases.
Its Node policy test proves the two null behaviors differ. Its missing-compiler
probe produces a real ENOENT. Correct normalized recovery asks the exact open
question or reports unavailable tooling; it does not invent a decision, build
result, finding, or edit. Completed reporting or blocked status may describe this
safe reaction, but neither implies successful implementation.

Literal source, public tests and task instructions enter the worker workspace.
Case metadata, golden findings/questions, and expected command evidence remain
outside it. Collector-owned input and before-review tree snapshots also stay
outside worker control. Evidence record v4 and verification payload v2 bind run,
case, command argv and input digest; file hashes and audit comparisons reject
stale inputs, altered artifacts, and observed workspace writes. Capture never
overwrites the original expectation. Temporary trees are cleaned up.

The scorer checks normalized facts, exact locations, recorded commands and
explicit outcome fields; it does not parse native Markdown or semantically judge
arbitrary prose. Runtime identity tests use synthetic internal collector traces,
not real provider observations or model evaluations. Collector authentication,
complete selection/provenance, restored transient writes and actual worker read
measurement remain outside these partial guarantees.

Full remaining corpus/role coverage, provider adapters, live steering, model
baselines, and the generic runner remain pending. No live model evaluation is
implied by a green deterministic fixture suite.
