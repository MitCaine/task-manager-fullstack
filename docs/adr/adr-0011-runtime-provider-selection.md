# ADR-0011: Explicit Atomic Runtime Provider Selection

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-07-03 |
| Last verified | 2026-07-18 |

## Context

The application needs to activate a complete SQLite composition for native
validation without changing existing REST behavior or mixing persistence sources.

## Decision

REST remains default. SQLite requires
`REACT_APP_ENABLE_SQLITE_PERSISTENCE=true`, native Capacitor execution, and iOS.
Selection is centralized, complete, and readiness-gated. Initialization failure is
shown to the user and never falls back to REST.

## Alternatives

- Platform-only automatic SQLite activation was rejected because no data migration
  exists.
- Per-repository selection was rejected because it creates mixed persistence.
- Silent REST fallback was rejected because it obscures which dataset receives
  writes.

## Consequences

Existing users retain REST behavior. Native activation is intentional. Provider
initialization is asynchronous for SQLite, and provider-owned selections require
unmount cleanup.

## Supersedes / Superseded By

None.

## Related Documents

- [Architecture Overview](../architecture/overview.md)
- [Persistence Architecture](../architecture/persistence.md)

## Verification

`runtimeRepositories.ts`, `RepositoryContext.tsx`, their focused tests, and
`App.sqliteRuntime.test.tsx` prove selection, readiness, failure, and cleanup.
