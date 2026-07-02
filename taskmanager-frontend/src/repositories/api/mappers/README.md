# REST DTO to Domain Mapping Notes

The REST API currently returns DTOs shaped for the Spring/MySQL backend. Stage 2
repositories map those DTOs into the Stage 1 domain model, but the mapping is
not perfectly symmetric.

Known mismatches:

- REST IDs are numeric and named per entity (`taskID`, `projectID`, `tagID`,
  etc.). Domain IDs are string `id` values. API mappers stringify REST IDs and
  parse string IDs back to numbers when calling REST endpoints.
- REST uses backend field names such as `statusID`, `projectID`,
  `recurrenceRuleID`, and `fileORLink`. Domain models use `statusId`,
  `projectId`, `recurrenceRuleId`, and `fileOrLink`.
- Domain entities allow nullable `createdAt` and `updatedAt`. Most REST DTOs do
  not expose `updatedAt`, and only task/note-like data may expose a useful
  creation or timestamp field. Mappers return `null` for unavailable REST
  timestamp data rather than inventing a date.
- Required REST entity IDs throw mapper errors when absent. Optional relation
  IDs map to `null`.
- REST DTOs may include `userID`. The Stage 1 domain model intentionally omits
  user ownership because the current frontend does not own multi-user behavior.
- Domain attachments include future local fields (`mimeType`, `localFilePath`)
  that REST does not expose. API mappers return those as `null`.
- Existing REST task-tag mutation endpoints return no task body. API
  repositories fetch the task after adding or removing a tag to satisfy the
  domain repository contract.
- Existing REST subtask status patching expects a numeric status. The API
  repository rejects `null` subtask statuses because the current endpoint cannot
  represent them safely.
