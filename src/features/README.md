# Feature modules

Business code is organized by feature in this directory. A feature may own its components, schemas, server-side data access, actions, and tests. Cross-feature UI primitives belong in `src/components/ui`; framework-agnostic shared utilities belong in `src/lib`.

No business feature is implemented in Phase 0. Phase 1 may introduce presentation-only modules without database access.
