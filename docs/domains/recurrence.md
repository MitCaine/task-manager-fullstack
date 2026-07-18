# Recurrence

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Contributors changing recurring tasks |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

Recurrence is a separate relationship and repository capability that defines how
the next task occurrence is scheduled when a recurring task is completed.

## Scope

This guide covers interval representation, persistence ownership, editing, and
completion. It does not describe a background scheduler; none exists.

## Architectural Invariants

- Recurrence mutation belongs to `RecurrenceRepository`, not task scalar updates.
- A task has at most one recurrence rule.
- `Task.recurrenceRuleId` is relationship data, not an independently editable
  SQLite task column.
- SQLite owns the relationship through `recurrence_rules.task_id UNIQUE` only.
- Completing a recurring task creates its successor and removes the completed
  occurrence.

## Interval Model

The canonical input is `{intervalUnit, intervalValue}` or `null`. Units are day,
week, month, and year. UI/backend validation applies these current maximums:

| Unit | Allowed value |
| --- | --- |
| day | 1-7 |
| week | 1-4 |
| month | 1-12 |
| year | 1-5 |

The backend also accepts legacy daily/weekly/monthly frequency values. A
single-unit interval may retain a matching legacy frequency for compatibility.

## Persistence Ownership

The REST backend stores a numeric `recurrenceRuleID` on `Task` and manages rule
creation, update, detachment, and deletion in `TaskController`.

SQLite stores `task_id` on `recurrence_rules`. Task hydration performs one batched
relationship query and derives `recurrenceRuleId`. `SQLiteTaskRepository.update`
rejects supplied recurrence IDs and directs callers to `RecurrenceRepository`.
No redundant `tasks.recurrence_rule_id` exists.

## Set, Change, And Clear

`setForTask(taskId, interval)` creates or updates the task's rule and returns the
hydrated task. Passing `null` clears recurrence. SQLite deletes the child rule;
REST detaches the task before deleting the old rule. Both expose the result through
the same contract.

SQLite initializes a rule's start from the task schedule or current time and its
end ten years later. Schema checks require a positive interval and end > start.

## Recurring Completion

`taskRecurrence.ts` calculates the next date while preserving task duration when
both start and end exist. `App.tsx` then:

1. creates the successor task;
2. copies task tags;
3. applies the recurrence interval;
4. refreshes the successor relationship data;
5. deletes the completed occurrence.

This models an occurrence as a task, not as history rows beneath one permanent
task. The sequence spans several repository calls and is not atomic across REST.

## Code Map

- Domain contract: `src/domain/models.ts`, `repositories/contracts.ts`
- UI calculation: `src/utils/taskRecurrence.ts`
- Completion orchestration: `src/App.tsx`
- Editing: `src/hooks/useCreateTaskWorkflow.ts`, `useInlineEditWorkflow.ts`
- REST: `TaskController.java`, `ApiRecurrenceRepository.ts`
- SQLite: `SQLiteRecurrenceRepository.ts`, task hydration, migration schema

## Testing

Tests cover interval validation, scheduling calculations, duration preservation,
set/change/clear behavior, missing parents, uniqueness, constraints, transactions,
cascades, task hydration, and bounded relationship queries.

## Known Limitations

- There is no occurrence history or stable series entity.
- Replacement is not atomic across the public repository contract.
- `timesOfRecurrence` is stored but not an active completion counter.
- No background job creates tasks before completion.

## Related ADRs

- [ADR-0007: Recurring Task Replacement](../adr/adr-0007-recurring-task-replacement.md)
- [ADR-0013: Recurrence Ownership](../adr/adr-0013-recurrence-ownership.md)

## Related Documents

- [Tasks and Scheduling](tasks-and-scheduling.md)
- [SQLite Architecture](../architecture/sqlite.md)
