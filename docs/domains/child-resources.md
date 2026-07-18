# Child Resources

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Contributors changing subtasks, notes, reminders, or attachments |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

Subtasks, notes, reminders, and attachments are resources owned by one parent task.
Their repository and persistence support is complete even though the former task
detail UI is not part of the active editing path.

## Scope

This guide covers domain relationships, repository behavior, loading, and delete
semantics. Reminder delivery is documented separately.

## Architectural Invariants

- Every child resource requires an existing task.
- Child repositories return domain models and accept domain string IDs.
- Task deletion removes all child resources in SQLite.
- Subtask status uses canonical task status IDs.
- Persistence support must not be described as active UI availability.

## Resource Capabilities

| Resource | Repository operations |
| --- | --- |
| Subtask | List by task, create, update, status update, delete |
| Note | List by task, create, delete |
| Reminder | List by task, create, update due date, delete |
| Attachment | List by task, create, delete |

`useTaskDetailResources` stores each resource in a task-keyed map and exposes
loading and mutation functions. It converts between domain and legacy UI models.

## Parent Enforcement

Backend child controllers use `ParentTaskGuard` before create/list behavior where
applicable. SQLite uses required foreign keys to `tasks` and rejects missing
parents. SQLite task deletion cascades subtasks, notes, reminders, and attachments.

Backend entity mappings store task IDs as scalar numeric fields rather than JPA
object relationships. Backend cascade behavior therefore follows the MySQL schema
and explicit database constraints, not JPA relationship annotations.

The REST subtask adapter reflects older endpoint limits: create sends only title,
update sends only title, and null status is rejected. SQLite persists canonical
status and scheduled date fields with preserve/clear semantics. Attachment REST
creation similarly sends only link and metadata, while SQLite accepts the wider
domain metadata fields.

## Active UI Boundary

The legacy detail-panel resource interface has been removed from the active task
editing path. The hook and repositories remain implemented and tested, and the
native SQLite smoke harness exercises them directly. Documentation must distinguish
that persistence readiness from user-visible feature availability.

## Attachments

Attachments store a file or link plus optional metadata, file size, MIME type, and
local file path. No file upload, file copying, sandbox lifecycle, or remote object
storage service is implemented; the repository stores metadata only.

## Code Map

- Domain/contracts: `src/domain/models.ts`, `repositories/contracts.ts`
- Frontend workflow: `src/hooks/useTaskDetailResources.ts`
- REST adapters: `src/repositories/api/Api*Repository.ts`
- SQLite adapters: `src/repositories/sqlite/SQLite*Repository.ts`
- Backend controllers/entities: `Subtask*`, `Note*`, `Reminder*`, `Attachment*`

## Testing

Shared contracts run against REST and SQLite. SQLite-specific tests cover missing
parents, task cascades, update semantics, and transaction rollback. Hook tests
cover resource map updates and error handling. Native smoke validates the complete
child graph on iOS.

## Known Limitations

- No active detail-resource UI currently invokes the complete load/create/edit
  workflow.
- Notes and attachments have no update method in the public contract.
- Attachment content is not managed.
- Child collections are loaded per task; no pagination exists.

## Related Documents

- [Notifications and Reminders](../architecture/notifications.md)
- [Repository Architecture](../architecture/repositories.md)
- [Known Limitations](../reference/known-limitations.md)
