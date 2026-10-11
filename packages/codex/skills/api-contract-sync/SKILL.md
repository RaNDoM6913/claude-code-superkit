---
name: api-contract-sync
description: Compare the selected API specification with actual route, handler, validation, and serialization contracts. Report verified drift, complete scoped agreement, or unverified coverage without changing code or specs.
user-invocable: false
tokens: 2632
---

# API Contract Sync

Review whether the API contract matches its implementation for the declared scope. Use for selected route, handler, DTO/schema, or specification changes and requested API audits. A code-level comparison does not establish deployed behavior. The role name does not authorize editing either side to make them agree.

## Scope, context, and authority

Read applicable `AGENTS.md` first, then the relevant API/documentation map and project conventions. Establish the requested base/head, working-tree diff, or explicit API/version scope. Identify the authoritative specification, generated sources/artifacts, route registrations, handler/DTO code, and expected target configuration. Resolve ambiguous scope or conflicting sources before claiming complete coverage.

Review only. Propose corrections to the appropriate source owner; do not edit code/specs, regenerate tracked files, post comments, or call credentialed/live endpoints without task authority. Do not infer access from a URL, connection string, or installed client. Use safe local checks only within scope and existing authority; importing an app or running a spec generator can start services or write files, so inspect its behavior first. Redact secrets and private payloads.

Honor explicit task/project routing and acceptance ownership. Disclose INDEPENDENT versus INLINE SELF-REVIEW. Keep requested/configured model and effort separate from runtime-observed values with evidence or UNVERIFIED. Identity reporting alone adds no acceptance gate; an explicitly required independent/Astra gate still applies.

## Discover the actual contract sources

Use the project's map rather than selecting the first file named `openapi.yaml`. Relevant sources may include OpenAPI/Swagger YAML/JSON, generated artifacts, annotations, schema modules, or a versioned external contract supplied by the user. Confirm the declared OpenAPI/Swagger version before interpreting schema semantics, references, and nullability. Do not fetch remote references without authorized access; unresolved `$ref` content remains unverified.

Identify framework/version from manifests and actual imports/configuration. Search patterns locate candidates; they do not extract a complete runtime router:

| Stack examples | Follow registrations through |
|---|---|
| Go chi/mux/gin/echo/fiber | Router constructors, nested groups/mounts, method registrations, middleware, conditional startup paths |
| Node Express or another verified router | Imported routers, mount prefixes, route methods, middleware order, generated/file-based registrations where used |
| Python FastAPI/Django | Included routers/URL configurations, decorators, prefixes, converters, generated schemas and view behavior |
| Rails | Route declarations, namespaces/scopes, resource expansion, constraints and controller actions |

Use a framework-native listing or local generated specification when already available and safe; confirm its version/configuration and what it excludes. For unsupported extraction or dynamic registrations, inspect the source manually where bounded and feasible. If coverage remains unresolved, report it rather than treating grep results as an exhaustive route table.

If the selected contract is GraphQL, compare its actual schema and resolvers instead of pretending fields are REST routes: root operations, argument/default/nullability/list semantics, output types, authorization/context, and specified error behavior. Do not assume OpenAPI extraction covers GraphQL. For a selected protocol that cannot be checked with available sources, return UNVERIFIED with the precise missing capability.

## Build and compare the scoped inventory

Cover every operation and relevant contract dimension in the declared scope; never pick random endpoints. A changed-scope review includes affected shared schemas, middleware, and consumers needed to assess those changes. If the request is too broad for complete review, define a bounded segment transparently and leave the rest unreviewed; do not silently narrow the requested acceptance scope.

For HTTP APIs, record method, composed path, handler, target version/configuration, and effective middleware. Compose nested/versioned router prefixes and relevant documented base/server paths correctly. Preserve meaningful trailing-slash, case, parameter-name, converter, and method distinctions according to the actual framework. Match a route like `/users/:id` to `/users/{id}` by verified routing semantics while separately checking documented parameter names/bindings; normalization must not hide a mismatch.

Compare both directions:
- **Registered but undocumented:** establish whether this operation belongs in the maintained contract. Internal/admin/health endpoints are not automatically exempt or automatically failures; use explicit project requirements and target audience. Cite any justified exclusion.
- **Documented but not registered:** check target API version, feature flags, conditional routes, generated registrations, proxy/delegated implementation, and checkout completeness before declaring drift. Disabled routes can be correctly documented for a supported configuration. Missing runtime/config access is UNVERIFIED where necessary, not evidence of an absent implementation.
- **Matched operations:** compare the full relevant request, response, error, and access contract below. A matching method/path alone is not IN_SYNC.

### Request, response, and middleware consistency

Trace from boundary parsing/validation through actual handler output and serializer behavior, including shared definitions and middleware:

- Path/query/header/cookie parameters, content types, body shape, field names/aliases, defaults, coercion, allowed values, and validation constraints.
- Required versus optional versus nullable, absent versus explicit null, arrays/items, nested objects, enums, unions, numeric/date formats, and read-only/write-only fields where the spec supports them. A language's nullable pointer/type is not proof of serialized null or accepted input; inspect tags, validators, custom serializers, omission/default rules, and the relevant schema version.
- Success codes, response bodies/envelopes, headers, pagination, empty/no-content responses, and content negotiation when part of the selected contract.
- Documented error statuses and shapes against realistic handler and middleware paths, including validation, authentication/authorization, rate limiting, exception mapping, and dependency errors. Do not require each handler to return an error already owned by a global boundary, or every runtime failure to expose internal details publicly.
- Effective access rules/security schemes after router and middleware composition. Compare intended public/protected behavior to actual wiring; infer neither from a path name.

Generated output may be stale even if its source is correct. Identify the authoritative source and generation path before proposing an update; do not recommend hand-editing generated output when the project requires regeneration. Reuse existing checks only with recorded command/results and unchanged relevant code, specification, inputs, configuration, and environment. Mark an unrun runtime check explicitly; source agreement is not a live endpoint result.

## Findings, unknowns, and status

Each confirmed mismatch needs exact source/spec locations actually read, a concrete operation/input/configuration, and consumer/operator impact. For absent content, cite the requirement and checked inventory/scope rather than inventing a line. Retain prior unresolved findings by reference. Unavailable access, unsupported extraction, missing source, and uncertain applicability go to Open Questions with the needed check/owner.

For caller triage, use **CRITICAL / WARNING / SUGGESTION** and **HIGH / MEDIUM / LOW** confidence with evidence, not percentages. CRITICAL requires a supported severe security/data-integrity consequence; WARNING is a concrete contract incompatibility; SUGGESTION is an optional grounded improvement. MEDIUM identifies a supported issue with a bounded residual assumption; LOW or an unproved mismatch remains an Open Question, not a defect. Do not use an internal/admin label as a severity shortcut.

Preserve these sync verdicts and distinguish unknowns:
- **IN_SYNC:** all declared operations and relevant dimensions are covered, applicable mandatory evidence is sufficient, and no confirmed drift or prior unresolved mismatch remains. State the target and whether this is source-only verification. Optional suggestions may remain.
- **DRIFT:** at least one mismatch is confirmed. Also report any incomplete coverage/unknowns; DRIFT does not mean everything else was checked.
- **UNVERIFIED:** no drift is established, but a required comparison remains unsupported or unreviewed. It is neither a defect nor a clean pass.

If a caller assigned only unrelated configuration or a protocol absent from scope, state N/A with the reason and no API verdict; do not manufacture an API requirement. A mandatory unknown blocks progression even with zero findings or a DRIFT finding judged non-blocking. Optional uncertainty may remain explicitly non-blocking.

## Report and stop

```text
API Contract Review
Scope: <diff/version, spec sources, operations/configuration, justified exclusions>
Coverage: COMPLETE | PARTIAL | UNAVAILABLE — <covered dimensions and unreviewed scope>
Execution: INDEPENDENT | INLINE SELF-REVIEW
Requested model/effort: <explicit route or labeled configured default; UNSPECIFIED if absent>
Observed model/effort: <values + runtime evidence, or UNVERIFIED>

Operation/field | Spec reference | Implementation reference | Match/drift/unverified
[SEVERITY/CONFIDENCE] file:line — <verified mismatch>
  Trigger/impact: <consumer path and consequence>
  Evidence: <both sides, relevant serializer/middleware/configuration>
  Fix: <proposed source-owner correction>

Verification: <actual commands/results, source-only limits, reused evidence binding>
Prior findings: <unresolved references/disposition, or none>
Open Questions: <missing evidence, next check/owner, acceptance effect, or none>
Sync Status: IN_SYNC | DRIFT (confirmed issue count) | UNVERIFIED
Progression: ALLOWED | BLOCKED — <mandatory criteria and remaining conditions>
```

Stop after the bounded comparison or at an unavailable required input. Do not retry inaccessible endpoints, force random samples into complete coverage, invent findings, or execute repairs to earn IN_SYNC.
