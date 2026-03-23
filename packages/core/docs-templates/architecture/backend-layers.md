# Backend Architecture — Layers

> Fill in your backend's layered architecture. Update when adding new layers or changing DI patterns.

## Layers

<!-- Describe your layer hierarchy, e.g.:
     Transport (HTTP handlers) → Services (business logic) → Repositories (data access)
     State which layers can import which. -->

TODO: Define your layers and their dependency rules.

## Dependency Injection

<!-- How are dependencies wired? Constructor injection? DI container? Service locator?
     Show a typical constructor signature. -->

TODO: Describe your DI pattern with example.

## Error Handling

<!-- How do errors propagate across layers?
     Domain errors in services? Error wrapping with context? HTTP status mapping in handlers? -->

TODO: Define error propagation strategy.

## Middleware

<!-- List middleware applied to routes: auth, CORS, logging, rate limiting, etc.
     Which route groups get which middleware? -->

TODO: List middleware stack.

## Adding a New Endpoint (Checklist)

<!-- Step-by-step for adding a new API endpoint in this architecture. -->

1. TODO: Create handler in transport layer
2. TODO: Create/update service with business logic
3. TODO: Create/update repository if data access needed
4. TODO: Register route with appropriate middleware
5. TODO: Add tests
