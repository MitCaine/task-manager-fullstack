# ADR-0002: Shared Edit Draft

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-06-10 |
| Last verified | 2026-07-18 |

## Context

Desktop and mobile use different editor placement, but both edit the same task and
must preserve project, tag, schedule, priority, and recurrence values consistently.

## Decision

Use one edit draft owned by `useInlineEditWorkflow` for both desktop and mobile
presentations.

## Alternatives

- Separate mobile and desktop drafts were rejected because they can diverge.
- Component-local persisted edits were rejected because relationship updates are
  coordinated across fields.

## Consequences

Presentation can change without changing edit authority. Only one task is edited
at a time. Draft changes still require careful reset when switching tasks.

## Supersedes / Superseded By

None.

## Related Documents

- [Frontend Architecture](../architecture/frontend.md)
- [Tasks and Scheduling](../domains/tasks-and-scheduling.md)

## Verification

`useInlineEditWorkflow.ts` owns one set of edit fields consumed by inline and
mobile edit presentation.
