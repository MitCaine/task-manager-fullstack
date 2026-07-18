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

- **Benefits:** Workflows are storage-independent, adapter differences are
  isolated, and shared contract tests can compare implementations.
- **Tradeoffs:** The boundary adds interfaces, factories, mapping, and integration
  work whenever persistence capabilities change.
- **Why preferred:** This structure costs less over time than embedding REST and
  SQLite conditionals throughout App and hooks.

## Why REST And SQLite Share Contracts

Provider choice should not change task semantics or require UI conditionals.
Equivalent contracts allow one complete composition to replace another while
keeping workflows stable. Adapter-specific constraints remain in focused tests
rather than leaking into App code.

- **Benefits:** Provider changes preserve application semantics and avoid separate
  REST and SQLite workflow branches.
- **Tradeoffs:** The common contract cannot expose every stronger SQLite guarantee
  or hide every REST limitation.
- **Why preferred:** A stable behavioral core is more maintainable than maximizing
  one adapter at the expense of application portability.

## Why SQLite Is Optional

SQLite was introduced and native-smoke-qualified without data migration or sync.
Making it unconditional would present an empty independent dataset to existing
REST users and could imply offline synchronization that does not exist. Explicit
flagging keeps activation intentional.

- **Benefits:** Existing REST behavior remains stable while native SQLite can be
  qualified in real application flows.
- **Tradeoffs:** Activation requires configuration, and each mode has an independent
  dataset.
- **Why preferred:** Automatic activation would imply migration or synchronization
  guarantees that the project does not provide.

## Why Provider Selection Is Centralized

Scattered platform checks could mix repositories, expose an uninitialized database,
or create duplicate native connections. The provider selects one complete set,
waits for SQLite readiness, surfaces failure, and closes only what it owns.

- **Benefits:** Selection is atomic, initialization is testable, and connection
  ownership has one lifecycle boundary.
- **Tradeoffs:** SQLite startup is asynchronous, so the provider must represent
  pending and failed initialization before rendering App.
- **Why preferred:** Central lifecycle complexity is safer than scattered platform
  checks and partially initialized repository sets.

## Why Initialization Does Not Fall Back

Once SQLite initialization starts, falling back to REST would make a failure look
like an empty or different dataset and could route later writes to an unexpected
store. An explicit error preserves data-source clarity.

- **Benefits:** A failure cannot silently redirect reads or writes to another
  dataset.
- **Tradeoffs:** The application remains unavailable until the selected runtime is
  corrected or intentionally reconfigured.
- **Why preferred:** Data-source certainty is more important than appearing
  available with ambiguous persistence behavior.

## Why Domain IDs Are Strings

Backend IDs are numeric while SQLite IDs are generated text. String identity is
the stable common representation. Backend numeric IDs are translated at the REST
adapter, not encoded in application contracts.

- **Benefits:** One identity type represents backend numbers and SQLite UUID-style
  values.
- **Tradeoffs:** REST IDs require conversion, and application code cannot assume
  numeric ordering or arithmetic.
- **Why preferred:** String identity avoids constraining new storage to a legacy
  backend representation.

## Why Legacy Adapters Exist

The active UI still assumes numeric IDs and REST-shaped fields. Rewriting it while
building persistence would have combined two high-risk migrations. Legacy adapters
allow repository migration first and map SQLite UUIDs to stable in-memory negative
aliases. They are compatibility scaffolding, not a domain standard.

- **Benefits:** Persistence could migrate without simultaneously rewriting task,
  filter, calendar, selection, and mobile UI state.
- **Tradeoffs:** Mapping is stateful, synthetic negative IDs are temporary, and
  contributors must distinguish domain from legacy models.
- **Why preferred:** A bounded adapter made the persistence migration testable while
  preserving existing UI behavior.

## Why Status IDs Are Canonical Strings

Backend seed numbers are database-specific and historically surprising
(`2=completed`, `3=in progress`). Canonical strings make meaning explicit and keep
SQLite from copying legacy numbering. Each adapter owns its translation.

- **Benefits:** Status meaning is readable and independent of backend seed order.
- **Tradeoffs:** Every adapter and legacy boundary must translate status identity.
- **Why preferred:** Explicit translation is safer than treating numeric storage
  conventions as application semantics.

## Why SQLite Transactions Are Caller-Owned

A transaction spanning several repositories must have one explicit owner.
Repositories reuse a supplied transaction context; they do not infer nested
transactions. The service serializes independent transactions so concurrent work
cannot accidentally join another transaction.

- **Benefits:** Multi-repository atomic work has an explicit owner, and unrelated
  transactions cannot share ambient state.
- **Tradeoffs:** Callers must deliberately open and pass a transaction; repositories
  cannot infer a larger atomic workflow.
- **Why preferred:** Explicit scope avoids hidden nesting, deadlocks, and global
  active-transaction state.

## Why Recurrence Has One SQLite Owner

`recurrence_rules.task_id UNIQUE` expresses the one-to-zero-or-one relationship.
Adding a task-side recurrence column would create two values that could disagree.
Task hydration derives the recurrence ID, while recurrence mutation remains at the
recurrence repository boundary.

- **Benefits:** SQLite has one source of truth for recurrence ownership.
- **Tradeoffs:** Task reads need a batched relationship query, and task update cannot
  assign recurrence IDs directly.
- **Why preferred:** Derived relationship data is safer than maintaining two foreign
  keys that can disagree.

## Why Reminder Concerns Are Separated

Persisting a due date, deciding that it is due, and presenting or delivering a
notification have different lifecycles. Repositories persist; App currently polls
loaded data; toasts present. This separation prevents a stored reminder from being
misrepresented as native or background delivery.

- **Benefits:** Persistence, due-time policy, and presentation can evolve and be
  tested independently.
- **Tradeoffs:** Current in-app polling works only for loaded reminders while App is
  active and does not provide background delivery.
- **Why preferred:** The separation prevents stored data from being mistaken for a
  delivered notification.

## Why Platform Behavior Stays Behind Boundaries

Capacitor detection, native connection lifecycle, and WKWebView workarounds have
different constraints from ordinary feature code. Keeping them at runtime, driver,
or focused helper boundaries prevents every component and repository from becoming
platform-aware.

- **Benefits:** Domain workflows remain portable, native behavior has focused test
  seams, and unsupported platforms cannot activate partial persistence.
- **Tradeoffs:** Platform boundaries add adapters and require explicit handoff
  between browser-testable logic and manual native validation.
- **Why preferred:** Localized platform complexity is easier to reason about than
  conditionals spread through otherwise platform-independent features.

## Why Mobile Focus Logic Is Isolated And Protected

WKWebView viewport drift is not ordinary form behavior. Shared focus scopes,
scroll ownership, viewport observation, and proxy focus exist because simple local
CSS/focus fixes failed on iOS. Changes require system-level and native validation.

- **Benefits:** One coordinated system protects multiple text-entry surfaces from
  known WKWebView failures.
- **Tradeoffs:** Global focus, touch, scroll, and viewport logic is complex and
  requires native verification.
- **Why preferred:** Local fixes were unreliable because the failure spans layout,
  timing, focus transitions, and native viewport state.

## Related Documents

- [Architecture Overview](../architecture/overview.md)
- [ADR Index](../adr/README.md)
- [Known Limitations](known-limitations.md)
- [Glossary](glossary.md)
