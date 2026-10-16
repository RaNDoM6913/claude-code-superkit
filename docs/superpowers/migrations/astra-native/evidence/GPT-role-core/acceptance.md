# GPT role core — authoring and integration checkpoint

Date: 2026-10-09. Base: `f5c6cc1`, branch `codex/astra-native-hardening`.
Status: accepted by Astra as an authoring/static/integration checkpoint after
independent Sol review and correction. Live behavioral acceptance is pending and
is not claimed by this checkpoint.

## Authorized outcome and authorship

The owner prioritized direct improvement of `packages/codex` over the additional
W00B evaluation-infrastructure queue, then required Astra involvement in every
agent prompt and behavioral rule. Claude shipped assets, live baselines, merge,
and release are outside this packet. Existing baseline/evidence is preserved.

| Responsibility | Dispatched model | Owned result |
|---|---|---|
| `astra_prompt_author` | `gpt-6-astra`, high | Six role prompts; dev/review caller semantics; Codex AGENTS and rules; contributor authorship rule and Codex references in root CLAUDE.md |
| `sol_native_protection` | `gpt-5.6-sol`, medium | Converter, native ownership manifest, preservation regression tests |
| `sol_codex_runtime` | `gpt-5.6-sol`, medium | Model configuration, installer preservation/logging, focused tests |
| `sol_integrated_review` | `gpt-5.6-sol`, high | Independent read-only review of the combined changed scope |
| Coordinator | Current chat | Integration, descriptive documentation, repository verification, checkpoint/Git state |

These are authoring dispatch records, not protected runtime-identity evidence
from a behavioral evaluation. Sol did not independently rewrite shipped prompts.
Semantic corrections are returned to Astra.

## Delivered scope

- `architect` and `plan-checker` assess feasible outcomes, consequential
  assumptions, requirements, and dependencies without arbitrary count gates.
- `evaluator` and `goal-verifier` distinguish observed failures, unavailable
  evidence, and justified inapplicability. Mandatory unknowns cannot pass.
- `critic` and `reality-checker` assess scope-specific risk and evidence without
  mandatory predictions, manufactured findings, or universal production checks.
- Existing top-level verdict enums are retained. Dev/review callers preserve
  evidence gaps, bounded retries, read-only review authority, and pending
  independence/Astra acceptance. Retry exhaustion cannot bypass a gate.
- Configuration declares `gpt-6-astra/high` coordination and
  `gpt-5.6-sol/medium` subagent defaults. Web search uses its top-level setting.
  Existing consumer configuration and approval-rule files are preserved, with
  accurate copied/skipped messages and clearly labeled template defaults.
- `native-skills.txt` protects the six roles and two callers from conversion.
  Missing native files fail before conversion writes; other agents still convert.
- The invalid `dd` prefix was corrected to forbid `dd`. Previously its own match
  examples prevented the entire policy from loading. Matching/approval comments
  now describe restrictive precedence and limits of prefix checking accurately.

## Verification

| Check | Observed result |
|---|---|
| `npm test` | Exit 0; 275 tests passed, zero failures, skips, cancellations, or todos |
| Native converter regression | Original behavior failed both cases; changed behavior passed both. Fixtures use the shipped manifest and disposable repositories |
| Codex asset/installer focused suite | 11 passed; clean copy and preservation of consumer config/rules covered |
| Final `node --test test/codex.test.js` | 9 passed after the six narrow provenance-reporting corrections; no executable integration code changed after the full suite |
| `bash bin/superkit-counts-verify.sh --check-remote` | Exit 0; count/version and remote About checks passed |
| `git diff --check` | Passed |
| Phase-count / old model-capability references | Relevant phase documentation remains 16 phases; no old gpt-5.5/no-subagent claims in changed active scope |
| Eight edited skills | Valid frontmatter, preserved invocation flags, updated approximate token metadata; normalized stock validator passed |
| Full policy through installed Codex CLI | `git status`: allow; `git push --force`: prompt; `dd if=/dev/zero of=/dev/sda`: forbidden; `curl https://example.com`: prompt; `psql -c 'SELECT 1'`: prompt |
| CLI configuration | Worker checked supported keys/model efforts in installed `0.162.0-alpha.17.2`; strict configuration accepted without a provider request |

Policy checks evaluate argv only; they did not execute the listed commands.
Stock skill-creator validation does not accept this repository's established
`tokens` and `user-invocable` keys. Astra validated temporary copies omitting only
those keys; the shipped files retain them. This checks format, not behavior.

Full local test output is in
`/tmp/superkit-gpt-role-core-2026-10-09/npm-test.log`; policy-check JSON is in
`/tmp/superkit-gpt-role-core-2026-10-09/execpolicy-checks.json`. Temporary logs are
local supporting evidence; the observed results above are the durable summary.

## Review and acceptance

The independent Sol reviewer covered all 24 implementation/documentation files
presented, reusing the recorded verification. Three narrow findings were resolved:

1. Astra changed all six role reports to separate requested/configured routing
   from observed runtime model/effort, with an evidence reference or explicit
   `UNVERIFIED`. Independence versus inline self-review is explicit. Unknown
   runtime identity is a reporting limitation, not a new verification framework.
2. README's historical Fable attribution now refers to the Claude layer and is
   separate from current Astra-authored GPT prompts.
3. The installation guide example now shows project-local skill copies rather
   than global symlinks.

The reviewer found no other defect in verdict compatibility, retry handling,
mandatory-unknown gating, native preservation, consumer configuration preservation,
or the policy fix. The coordinator inspected the narrow corrections; Astra
revalidated the six changed prompts and reviewed the integrated technical diff,
test summary, policy evidence, and corrected documentation. Astra explicitly
accepted this checkpoint with no mandatory issue remaining inside the packet.
The report and current handoff are descriptive checkpoint additions outside the
reviewer's 24-file implementation scope.

## Remaining gates and boundaries

No live role evaluations, baseline comparisons, account-entitlement checks, or
provider executions were performed. The changed prompts have not demonstrated
behavioral quality or production eligibility on the target models. W00B and the
affected migration waves remain incomplete; their existing acceptance gates are
preserved. `minimal-change-engineer`, other role clusters, and broad orchestrator
or approval-policy redesign are outside this packet. No release or Claude asset
change is included.

## Sources checked

- [OpenAI Astra prompt guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra): precise skill triggers, selective context, proportional instructions.
- [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference): model/effort, web search, subagent defaults.
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents): explicit routing and inheritance.
- [Codex rules](https://learn.chatgpt.com/docs/agent-configuration/rules): literal prefixes, most-restrictive decisions, shell handling.
