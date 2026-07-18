# API Reference

| Field | Value |
| --- | --- |
| Status | Reference |
| Audience | Backend, REST adapter, and integration contributors |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This is a concise inventory of the current Spring REST surface. Controller code
and tests remain the executable authority.

## Tasks

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/tasks` | List tasks ordered by scheduled date; optional `userID` query |
| GET | `/tasks/{id}` | Get one task |
| POST | `/tasks` | Create task |
| PUT | `/tasks/{id}` | Replace editable task fields |
| PATCH | `/tasks/{id}/status` | Update numeric status ID |
| DELETE | `/tasks/{id}` | Delete task |
| GET | `/tasks/{id}/recurrence` | Get referenced recurrence rule |
| PATCH | `/tasks/{id}/repeat` | Set/change/clear recurrence interval |
| POST | `/tasks/{id}/tags/{tagId}` | Add tag relationship |
| DELETE | `/tasks/{id}/tags/{tagId}` | Remove tag relationship |

Task time validation rejects an end date-time that is not later than start.
Recurrence accepts canonical interval unit/value input and legacy frequency input.

## Catalogs

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/projects` | List projects |
| GET | `/projects/{id}` | Get project |
| POST | `/projects` | Create project |
| PUT | `/projects/{id}` | Update project |
| DELETE | `/projects/{id}` | Delete project |
| GET | `/tags` | List tags |
| POST | `/tags` | Create tag |
| PATCH | `/tags/{id}` | Update tag |
| DELETE | `/tags/{id}` | Delete tag |

## Child Resources

| Method | Path | Behavior |
| --- | --- | --- |
| GET/POST | `/tasks/{taskId}/subtasks` | List/create subtasks |
| PUT | `/subtasks/{id}` | Update subtask |
| PATCH | `/subtasks/{id}/status` | Update numeric status |
| DELETE | `/subtasks/{id}` | Delete subtask |
| GET/POST | `/tasks/{taskId}/notes` | List/create notes |
| DELETE | `/notes/{id}` | Delete note |
| GET/POST | `/tasks/{taskId}/reminders` | List/create reminders |
| PATCH | `/reminders/{id}` | Update reminder due date |
| DELETE | `/reminders/{id}` | Delete reminder |
| GET/POST | `/tasks/{taskId}/attachments` | List/create attachments |
| DELETE | `/attachments/{id}` | Delete attachment |

## Representation Boundary

REST payloads use historical camel-case ID names such as `taskID`, `statusID`,
and `fileORLink`. Numeric statuses are `1=active`, `2=completed`, and
`3=in progress`. API mappers translate these DTOs to domain models; UI and SQLite
code must not depend directly on the DTO representation.

## Errors

- `400`: bean validation, explicit time/recurrence validation.
- `404`: missing primary or parent resource where controller checks it.
- `409`: database integrity violation.

Error payloads are maps of field messages or an `error` string. There is no
versioned API envelope or generated client.

## Code Map

- Controllers: `src/main/java/com/mitchell/taskmanager/*Controller.java`
- REST transport: `taskmanager-frontend/src/api/tasks.ts`
- Domain mapping: `taskmanager-frontend/src/repositories/api/mappers/`
- REST repositories: `taskmanager-frontend/src/repositories/api/`

## Known Limitations

There is no API version prefix, authentication, pagination, OpenAPI contract,
idempotency key, or multi-request transaction protocol.

## Related Documents

- [Backend Architecture](../architecture/backend.md)
- [Repository Architecture](../architecture/repositories.md)
