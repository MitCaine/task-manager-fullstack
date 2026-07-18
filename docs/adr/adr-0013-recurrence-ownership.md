# ADR-0013: SQLite Recurrence Ownership

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-07-03 |
| Last verified | 2026-07-18 |

## Context

The domain exposes `Task.recurrenceRuleId`, REST stores a task-side numeric rule ID,
and the SQLite schema represents a one-to-zero-or-one child relationship. Storing
both task-side and recurrence-side foreign keys would create conflicting authority.

## Decision

SQLite owns recurrence through `recurrence_rules.task_id UNIQUE`. Task hydration
derives `recurrenceRuleId` in a bounded relationship query. Recurrence mutation
belongs to `RecurrenceRepository`; task update rejects recurrence ID mutation.

## Alternatives

- Adding `tasks.recurrence_rule_id` was rejected as duplicate ownership.
- Embedding recurrence CRUD in `SQLiteTaskRepository` was rejected because the
  public recurrence boundary already exists.
- Omitting task recurrence hydration was rejected because the domain task exposes
  relationship identity.

## Consequences

The relationship cannot disagree within SQLite. Task hydration needs one additional
batched query. REST and SQLite may store the relation differently while exposing
the same domain behavior.

## Supersedes / Superseded By

None.

## Related Documents

- [Recurrence](../domains/recurrence.md)
- [SQLite Architecture](../architecture/sqlite.md)

## Verification

Migration schema, `SQLiteRecurrenceRepository`, `SQLiteTaskRepository` hydration,
N+1 tests, and cascade tests enforce the decision.
