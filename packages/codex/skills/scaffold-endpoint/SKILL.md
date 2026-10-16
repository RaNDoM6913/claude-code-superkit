---
name: scaffold-endpoint
description: Implement or scaffold a requested API endpoint using verified local architecture and an explicit request, response, error, and authorization contract. Use for endpoint work, not an unrelated framework rewrite.
user-invocable: false
tokens: 1453
---

# Scaffold Endpoint

Deliver the endpoint the user requested using the project's actual patterns. An endpoint implementation includes required wiring and business behavior; an explicitly requested scaffold may leave named gaps but is not a working endpoint. A design or review request remains read-only.

## Context and contract

Read the task, applicable project instructions, relevant architecture/API documentation, manifests, and the closest existing endpoint. Discover the stack from evidence: for example, Go `go.mod`, Node `package.json`, Python requirements/`pyproject.toml`, or Rust `Cargo.toml`. Distinguish declared dependencies from verified installed/runtime versions; do not invent framework capabilities or API versions.

Locate the actual route registration, handlers, schemas/DTOs, middleware, domain logic, data access, tests, and API documentation. Follow the reference endpoint through its wiring and dependencies rather than copying an isolated handler. Document relevant working-tree changes and preserve others' edits.

Establish the method/path, path/query/body shape, validation, response shape/statuses, error cases, authn/authz and resource ownership, business effect, and persistence needs. Use explicit task requirements and verified project conventions; ask a focused question when an unresolved contract changes behavior or access. Do not guess privileged access, destructive semantics, or user-visible business rules.

## Implement within authority

Use only the layers the actual architecture and task require. A direct route handler can be sufficient; handler/service/repository interfaces or dependency injection are not mandatory. Follow suitable constructor, context/cancellation, validation, response, and error-mapping conventions. Preserve established external contracts unless the requested change explicitly includes their revision.

- Parse and validate the required inputs and map domain failures into the agreed response contract. Place domain logic where the project expects it, with real implementations for the requested behavior.
- Wire the route into the correct group and middleware chain, including applicable authentication, authorization/ownership, and rate limits. Verify that the new route is reachable through the actual application registration.
- Implement needed persistence using the verified query/ORM conventions, parameterized inputs, appropriate transaction boundaries, null/not-found handling, and error propagation. A close precedent is evidence of style, not permission to copy an auth bypass, injection flaw, or other known unsafe behavior. Report an unsafe dependency relevant to this endpoint and modify it only within the already authorized scope. Before editing shared code, resolve any genuinely missing scope or authority decision; do not request approval again for work already authorized. Report unrelated defects separately.
- Add or update request/response schemas and the project's actual API spec/documentation location when required. Do not assume a universal documentation filename.
- If schema changes are needed, inspect the project's migration tooling and rollout/recovery convention. Author only the authorized change; do not manufacture down migrations when the project does not support them or data cannot be safely restored. A destructive or ambiguous schema change needs a resolved scope/authority decision before authoring the dependent change. Applying migrations to shared/external systems, deploying, publishing, or other external writes requires task authorization distinct from creating local code.

Do not leave placeholder business logic, SQL, or validation and then report a completed endpoint. If the user requested only scaffolding, keep stubs explicitly identifiable and list the missing implementation and verification. If a prerequisite is unavailable, finish independent authorized work and report the exact dependency; the skill name does not grant further actions.

## Verify the endpoint

Use project-compatible checks to cover the applicable request/response/error contract: valid requests, invalid input, authentication/authorization and ownership denial, and relevant persistence/failure behavior. Check route wiring and business/data flow as well as isolated handler behavior. Tests must avoid unintended external side effects; do not provision or mutate shared services without authorization.

Run relevant type/build/lint checks and mandatory project gates. Reuse evidence only when its command, result, relevant code, inputs, and environment are recorded and unchanged; repeat for a relevant change or concrete uncertainty. Distinguish mocked/local tests from real integration observations. If persistence or route reachability remains unverified, say so rather than treating compilation as end-to-end proof.

Stop when the requested implementation or scaffold scope is satisfied with appropriately bounded evidence, or a named contract, authorization, or capability gap prevents completion. Do not expand into framework reorganization or an unrelated security audit.

## Output

Report the outcome and mode (implemented / scaffold-only / advisory / incomplete), method/path and agreed contract, reference endpoint and evidence paths, changed files and decisions, checks with actual results, and unimplemented/unverified parts with the next action. A scaffold-only result must state that endpoint behavior is incomplete.

State independent worker versus inline/self-review execution. Follow explicit routing; report requested or labeled configured model/effort separately from observed runtime model/effort and evidence. Use UNSPECIFIED for an absent request/default and UNVERIFIED for unavailable runtime evidence. Lack of runtime identity is a reporting limitation, not a new delivery gate.
