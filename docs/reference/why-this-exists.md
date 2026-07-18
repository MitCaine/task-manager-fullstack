# Why This Exists

| Field | Value |
| --- | --- |
| Status | Canonical rationale |
| Audience | Contributors evaluating architectural changes |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This guide preserves the motivation behind boundaries that are easy to remove when
looking only at one implementation.

## Why Repositories Exist

The original UI called REST helpers directly and used backend-shaped models. The
repository boundary creates a persistence-independent application contract so the
same workflows can use REST or SQLite. It also gives adapter differences a named
home and supports shared behavior tests.

## Why REST And SQLite Share Contracts

Provider choice should not change task semantics or require UI conditionals.
Equivalent contracts allow one complete composition to replace another while
keeping workflows stable. Adapter-specific constraints remain in focused tests
rather than leaking into App code.

## Why SQLite Is Optional

SQLite was introduced and native-smoke-qualified without data migration or sync.
Making it unconditional would present an empty independent dataset to existing
REST users and could imply offline synchronization that does not exist. Explicit
flagging keeps activation intentional.

## Why Provider Selection Is Centralized

Scattered platform checks could mix repositories, expose an uninitialized database,
or create duplicate native connections. The provider selects one complete set,
waits for SQLite readiness, surfaces failure, and closes only what it owns.

## Why Initialization Does Not Fall Back

Once SQLite initialization starts, falling back to REST would make a failure look
like an empty or different dataset and could route later writes to an unexpected
store. An explicit error preserves data-source clarity.

## Why Domain IDs Are Strings

Backend IDs are numeric while SQLite IDs are generated text. String identity is
the stable common representation. Backend numeric IDs are translated at the REST
adapter, not encoded in application contracts.

## Why Legacy Adapters Exist

The active UI still assumes numeric IDs and REST-shaped fields. Rewriting it while
building persistence would have combined two high-risk migrations. Legacy adapters
allow repository migration first and map SQLite UUIDs to stable in-memory negative
aliases. They are compatibility scaffolding, not a domain standard.

## Why Status IDs Are Canonical Strings

Backend seed numbers are database-specific and historically surprising
(`2=completed`, `3=in progress`). Canonical strings make meaning explicit and keep
SQLite from copying legacy numbering. Each adapter owns its translation.

## Why SQLite Transactions Are Caller-Owned

A transaction spanning several repositories must have one explicit owner.
Repositories reuse a supplied transaction context; they do not infer nested
transactions. The service serializes independent transactions so concurrent work
cannot accidentally join another transaction.

## Why Recurrence Has One SQLite Owner

`recurrence_rules.task_id UNIQUE` expresses the one-to-zero-or-one relationship.
Adding a task-side recurrence column would create two values that could disagree.
Task hydration derives the recurrence ID, while recurrence mutation remains at the
recurrence repository boundary.

## Why Reminder Concerns Are Separated

Persisting a due date, deciding that it is due, and presenting or delivering a
notification have different lifecycles. Repositories persist; App currently polls
loaded data; toasts present. This separation prevents a stored reminder from being
misrepresented as native or background delivery.

## Why Mobile Focus Logic Is Isolated And Protected

WKWebView viewport drift is not ordinary form behavior. Shared focus scopes,
scroll ownership, viewport observation, and proxy focus exist because simple local
CSS/focus fixes failed on iOS. Changes require system-level and native validation.

## Related Documents

- [Architecture Overview](../architecture/overview.md)
- [ADR Index](../adr/README.md)
- [Known Limitations](known-limitations.md)
