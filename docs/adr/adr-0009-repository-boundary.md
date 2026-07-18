# ADR-0009: Repository Contracts As The Persistence Boundary

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-07-02 |
| Last verified | 2026-07-18 |

## Context

The frontend originally depended directly on REST helpers and backend-shaped
models. Native SQLite required an alternative persistence implementation without a
broad App rewrite.

## Decision

Define persistence-independent domain models and repository interfaces. Implement
one complete REST set and one complete SQLite set, and expose repositories through
React context.

## Alternatives

- Conditionals in App/hooks were rejected because they mix platform and workflow.
- Reusing REST DTO models as the common contract was rejected because numeric IDs
  and field naming are adapter details.
- Partial provider replacement was rejected because it creates mixed authority.

## Consequences

Workflows are provider-independent and shared contracts test adapter equivalence.
Mapping and composition code increase, and legacy UI adapters remain necessary
until UI models migrate.

## Supersedes / Superseded By

Supersedes the direct UI-to-REST persistence boundary.

## Related Documents

- [Repository Architecture](../architecture/repositories.md)
- [Why This Exists](../reference/why-this-exists.md)

## Verification

`repositories/contracts.ts`, `createRestRepositories.ts`,
`createSQLiteRepositories.ts`, and `RepositoryContext.tsx` implement the boundary.
