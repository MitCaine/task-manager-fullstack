# ADR-0010: Centralized SQLite Lifecycle

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-07-03 |
| Last verified | 2026-07-18 |

## Context

SQLite repositories require one connection, safe initialization, ordered
migrations, explicit transactions, retry after initialization failure, and clean
native connection release.

## Decision

`SQLiteDatabaseService` owns driver open, pragmas, migration, serialized
transactions, retryable initialization, and close. The repository factory receives
the service and does not own lifecycle.

## Alternatives

- One connection per repository was rejected because it fragments transactions and
  native connection ownership.
- Global active-transaction reuse was rejected because concurrent work could join
  the wrong transaction.
- Plugin-managed migration transactions were rejected because they nest explicit
  service transactions on iOS.

## Consequences

All repositories share one driver and transaction context. Transactions queue.
Migration/pragmas explicitly disable plugin-managed transaction wrapping where
required. Provider-owned selections must close the service.

## Supersedes / Superseded By

None.

## Related Documents

- [SQLite Architecture](../architecture/sqlite.md)
- [iOS Development](../development/ios-development.md)

## Verification

Service, migration, driver, composition, rollback, serialization, retry, and
close/reopen tests cover the lifecycle; the native smoke harness validates iOS.
