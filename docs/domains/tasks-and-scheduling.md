# Tasks And Scheduling

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Contributors changing task lifecycle, dates, filters, or calendar behavior |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

Tasks are the central domain object. This guide defines their lifecycle,
scheduling rules, status semantics, creation/edit workflows, and derived views.

## Scope

Recurrence, catalogs, and child resources have separate guides. This document
covers their task-facing relationships without duplicating their internals.

## Architectural Invariants

- Domain task IDs are strings regardless of provider.
- Canonical statuses are `not_started`, `in_progress`, and `completed`.
- A non-null end date-time must be later than its start date-time.
- Active editors save explicitly; field changes are not autosaved.
- Filters, calendar views, and statistics derive from the shared task collection.
- Completing a recurring task follows recurrence replacement behavior rather than
  a normal status-only update.

## Task Model

A task has a required title and description plus optional start/end schedule,
project, priority, recurrence relationship, and tags. `scheduleId` exists in the
domain model for compatibility but is not an active scheduling subsystem.

Priorities are `LOW`, `MEDIUM`, and `HIGH`. Backend REST statuses are translated
from numeric values; SQLite stores canonical strings directly.

## Creation

`useCreateTaskWorkflow` owns the draft and validates the title and time range.
It creates the base task, optionally sets recurrence, adds selected tags, updates
App task state, resets the draft, and queues creation feedback. Project assignment
is part of base task creation. Inline project/tag creation can select the newly
created catalog item for the draft.

These are multiple repository calls, not one cross-adapter transaction contract.
The UI reports failure, but rollback of an already-created base task is not
guaranteed across REST requests.

## Editing

`useInlineEditWorkflow` builds one shared draft for desktop and mobile editing.
Save validates the schedule, updates base fields, reconciles tags, and updates
recurrence through its repository. Cancel discards draft state. There is no active
detail-panel autosave path.

Patch behavior at the domain repository boundary distinguishes omitted nullable
fields from explicit null. SQLite preserves this distinction. REST maps updates
to the backend's full task update endpoint; omitted optional values can therefore
arrive as null. Active edit workflows send the complete editable task state, but
callers must not assume REST provides general PATCH behavior.

## Status And Completion

Normal status movement calls `TaskRepository.updateStatus`. Null status normalizes
to `not_started` at the domain adapters. Bulk completion loads tasks as needed so
recurring tasks still use replacement logic.

For recurring completion, App creates the next occurrence with the calculated
schedule, copies relationships, applies recurrence, then deletes the completed
occurrence. See the recurrence guide for consequences.

## Scheduling

`taskScheduling.ts` constructs validated start and end timestamps.
`taskForm.ts` handles time-entry conversion and validation.
`dateTime.ts` handles formatting and locale/time-mode display.
`taskTimeShift.ts` calculates quick schedule shifts.

Start may be absent. End may be absent. When both exist, frontend validation,
backend validation, and SQLite checks require end > start.

## Derived Views

`useTaskListViewModel` derives visible task lists, calendar tasks, counts,
statistics, and empty-state content. `taskFiltering.ts` owns filter/sort logic;
`Calendar.tsx` renders day, week, month, and quarter views from the shared tasks.
These views do not query persistence independently.

## Code Map

- Domain model: `src/domain/models.ts`
- Legacy UI model: `src/types/task.ts`
- Creation/editing: `src/hooks/useCreateTaskWorkflow.ts`, `useInlineEditWorkflow.ts`
- Cross-domain completion/bulk actions: `src/App.tsx`
- Scheduling/filtering: `src/utils/task*.ts`, `src/utils/dateTime.ts`
- Presentation: `src/components/create-task/`, `src/components/task-list/`, `Calendar.tsx`

## Testing

Utility tests cover schedules, filtering, formatting, recurrence calculations,
empty states, and statistics. Hook tests cover creation and Save workflows. App
tests cover integrated status, bulk, calendar, pager, and feedback behavior.
Repository contracts verify task persistence across both adapters.

## Known Limitations

- Task creation and edit relationship updates are not one transaction across the
  public repository contract.
- The UI model still exposes backend-shaped numeric statuses and IDs internally.
- `userID` and `scheduleID` remain backend schema fields without active user or
  schedule-domain workflows.

## Related ADRs

- [ADR-0002: Shared Edit Draft](../adr/adr-0002-shared-edit-draft.md)
- [ADR-0007: Recurring Task Replacement](../adr/adr-0007-recurring-task-replacement.md)

## Related Documents

- [Recurrence](recurrence.md)
- [Projects and Tags](projects-and-tags.md)
- [Frontend Architecture](../architecture/frontend.md)
