# ADR-0006: Reminder Ownership Split

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-06-10 |
| Last verified | 2026-07-18 |

## Context

Persisting a reminder, deciding it is due, and presenting a toast have different
lifecycles and failure behavior.

## Decision

Repositories own reminder persistence, App owns polling loaded reminders and
deduplicating due events, and toast components own presentation and actions.

## Alternatives

- Treating repository creation as notification delivery was rejected.
- Putting polling inside a presentation component was rejected.

## Consequences

Persistence is testable independently from delivery. Current delivery only works
for loaded reminders while the App is active and is not a native notification.

## Supersedes / Superseded By

None.

## Related Documents

- [Notifications and Reminders](../architecture/notifications.md)
- [Child Resources](../domains/child-resources.md)

## Verification

Reminder repositories persist data, `useTaskDetailResources` owns resource maps,
and `App.tsx` owns due polling and snooze state updates.
