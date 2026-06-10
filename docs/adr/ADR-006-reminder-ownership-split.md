# ADR-006: Split Reminder Persistence, Delivery, and Presentation Ownership

## Status

Accepted

## Context

Persisted reminders and visible reminder notifications have different
lifecycles.

A reminder record belongs to a task and supports creation, deletion, and
due-date updates. Reminder delivery in the current application depends on the
running frontend polling loaded reminders, detecting due reminders,
suppressing duplicate notifications, managing transient toast state, and
snoozing. Toast presentation has its own rendering and confirmation
auto-dismiss behavior.

No single bounded reminder owner naturally owns all three lifecycles.

## Decision

Reminder responsibilities are divided among three owners:

| Owner | Responsibility |
| --- | --- |
| `useTaskDetailResources` | Persisted reminder records, reminder form draft, and reminder CRUD |
| `App.tsx` | Polling, due detection, duplicate suppression, reminder toast queue, dismissal, and snoozing |
| `ToastList` | Toast presentation and confirmation-toast auto-dismiss timers |

Snoozing remains in `App.tsx` because it crosses persisted reminder state and
transient toast state. The detail-resource hook exposes `setReminders` so the
orchestration owner can reconcile the persisted due-date update.

## Alternatives Considered

### Put Polling and Delivery in `useTaskDetailResources`

This would group reminder-related code, but the hook would then own
application-lifecycle polling and transient delivery behavior in addition to
task-detail resource persistence.

### Let `ToastList` Own Snoozing

This would place the action near the toast control, but the presentation
component would need to mutate persisted reminders and coordinate external
resource state.

### Store Toasts With Persisted Reminder Records

This would combine related data by name, but transient notifications and
persisted reminder records have different identities and lifecycles.

### Deliver Reminders Entirely From the Backend

The current implementation has no background delivery service, device
registration, or push-notification infrastructure. This would be a different
architecture rather than a refactor of current ownership.

## Consequences

### Benefits

- Persisted resource CRUD remains bounded in the detail-resource hook.
- Application-lifecycle polling and snoozing remain with the orchestration
  owner.
- Toast presentation remains independent from persistence.
- Each owner has a distinct and explainable lifecycle.

### Costs

- Reminder behavior spans multiple owners.
- Snoozing requires `App.tsx` to update hook-owned reminder state.
- Future push or multi-device delivery would require revisiting the current
  frontend delivery authority.

## What Would Break If Changed

Collapsing or moving reminder ownership could:

- make a detail-resource hook responsible for global polling lifecycle;
- let a presentation component mutate persisted reminder records;
- duplicate or lose reminder toasts;
- desynchronize snoozed toast state from the persisted reminder due date;
- confuse confirmation-toast timers with reminder delivery state;
- obscure the boundary between persisted reminders and transient
  notifications.

## Related Docs

- [Architecture](../architecture.md)
- [Ownership Map](../ownership-map.md)
- [Lessons Learned](../Lessons%20Learned.md)
- [Future Architecture Pressure Points](../Future%20Architecture%20Pressure%20Points.md)
- [Architectural Assumptions and Refactoring](../Architectural%20Assumptions%20and%20Refactoring.md)

