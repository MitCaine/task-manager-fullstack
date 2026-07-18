# ADR-0007: Recurring Task Replacement

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-06-10 |
| Last verified | 2026-07-18 |

## Context

The model represents a scheduled task occurrence as a task and has no separate
series/occurrence history tables.

## Decision

Completing a recurring task creates the next scheduled task, copies applicable
relationships, applies recurrence, and deletes the completed occurrence.

## Alternatives

- Marking the same task complete and rescheduling it was rejected because it would
  leave no clear current occurrence semantics.
- Introducing a series/history model was outside current scope.

## Consequences

The task list contains the next actionable occurrence. Completion is a multi-write
workflow and does not retain occurrence history.

## Supersedes / Superseded By

None.

## Related Documents

- [Recurrence](../domains/recurrence.md)
- [Tasks and Scheduling](../domains/tasks-and-scheduling.md)

## Verification

`completeRecurringTask` in `App.tsx` and `taskRecurrence.ts` implement and test
replacement and schedule calculation.
