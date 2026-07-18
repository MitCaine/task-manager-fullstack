# Notifications And Reminders

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Contributors changing reminders or user feedback |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This guide separates reminder persistence, due-time detection, and visual toast
presentation so their current capabilities are not confused with native push or
background notifications.

## Scope

It covers persisted reminders and reminder-triggered in-app toasts. General task
creation and catalog feedback use the same toast presentation component but are
not persisted reminders.

## Architectural Invariants

- Reminder repositories own persistence only.
- App state owns due-reminder polling and duplicate-delivery suppression.
- Toast components own presentation and actions.
- A persisted reminder is not proof that a system notification was scheduled.
- SQLite and REST expose the same reminder repository contract.

## Responsibilities

| Concern | Owner |
| --- | --- |
| Reminder CRUD and snooze due-date update | `ReminderRepository` implementations |
| Child-resource reminder map | `useTaskDetailResources` |
| Due-time polling and fired-ID suppression | `App.tsx` |
| Dismiss and snooze presentation | `ToastList` and App callbacks |
| Native/background delivery | Not implemented |

## Runtime Flow

When reminder data is loaded, App periodically flattens the reminder map, compares
due dates to the current time, and queues an in-app toast once per reminder ID.
Snooze updates the persisted due date, removes the fired marker, and updates local
reminder state. Dismissal affects toast presentation, not the reminder record.

## Current Activation Boundary

`useTaskDetailResources` can load reminders with subtasks, notes, and attachments.
The legacy detail-panel UI that previously initiated this load is not part of the
active task-editing path. Therefore persisted reminders are supported by the
repository layer, but automatic due-reminder loading/delivery is not a complete
active end-user workflow in the current UI.

## Code Map

- Domain contract: `src/domain/models.ts`, `repositories/contracts.ts`
- Child-resource hook: `src/hooks/useTaskDetailResources.ts`
- Polling and snooze: `src/App.tsx`
- Presentation: `src/components/shared/ToastList.tsx`
- REST backend: `ReminderController.java`, `Reminder.java`
- SQLite: `SQLiteReminderRepository.ts`, `reminders` table

## Testing

Shared repository contracts cover list/create/update/delete. SQLite-specific tests
cover foreign keys, cascades, and rollback. App tests cover toast queueing,
dismissal, and snooze behavior with loaded reminder state.

## Known Limitations

- No iOS local notification, push notification, service worker, or background
  scheduler exists.
- Delivery depends on the App being active and reminder data already being loaded.
- Fired reminder IDs are in-memory and reset on application restart.
- `notificationMethod` is stored but does not select a delivery implementation.

## Related ADRs

- [ADR-0006: Reminder Ownership Split](../adr/adr-0006-reminder-ownership-split.md)

## Related Documents

- [Child Resources](../domains/child-resources.md)
- [Known Limitations](../reference/known-limitations.md)
