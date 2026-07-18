# Original Database Design Study

| Field | Value |
| --- | --- |
| Status | Historical |
| Audience | Contributors investigating schema ancestry |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 for historical classification |

## Purpose

This record summarizes how the original MySQL-centered design shaped the current
application. It replaces a long point-in-time study that mixed current guidance,
future proposals, and machine-specific links.

## Original Model

The baseline schema defined numeric IDs and relational tables for users, statuses,
tasks, schedules, recurrence, projects, tags, task-tag relationships, subtasks,
notes, reminders, and attachments. The implemented application selected the task
management subset and retained many original column names, including `taskID`,
`statusID`, and `fileORLink`.

The backend JPA model remains close to this schema. Some relationships are scalar
ID fields rather than mapped entity relationships. Task/tag is the notable JPA
many-to-many relationship.

## Implementation Divergence

- The active application has no authentication or user-management workflow even
  though `userID` fields remain.
- `scheduleID` remains a compatibility field; scheduling is represented directly
  by task start/end date-times.
- Recurrence is managed by the task controller in REST and by a task-owned child
  row in SQLite.
- Status meaning is normalized to string IDs at the frontend domain boundary.
- Frontend filters, calendar views, statistics, and recurrence date calculation
  are application behavior rather than database features.
- Child-resource persistence exists, but its former detail UI is inactive.

## Later Persistence Architecture

The repository migration deliberately stopped treating the original numeric schema
as the application model. Domain IDs became strings, status meanings became named,
and REST DTO translation moved behind mappers. SQLite then implemented the same
contracts with text IDs, real foreign keys, cascades, and versioned migrations.

## Durable Lesson

The baseline schema is useful ancestry and remains operationally relevant to MySQL,
but it is not the canonical source for frontend domain semantics. New behavior must
start at current domain/repository contracts and then map to each store.

## Source Records

- MySQL baseline: `../../database/mysql/schema.sql`
- Backend entities: `../../src/main/java/com/mitchell/taskmanager/`
- SQLite schema: `../../taskmanager-frontend/src/repositories/sqlite/migrations.ts`

## Related Documents

- [Persistence Architecture](../architecture/persistence.md)
- [Backend Architecture](../architecture/backend.md)
- [Canonical Domain IDs ADR](../adr/adr-0012-canonical-domain-ids.md)
