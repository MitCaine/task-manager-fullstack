# Known Limitations

| Field | Value |
| --- | --- |
| Status | Canonical reference |
| Audience | Product, architecture, and engineering contributors |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This list defines boundaries the current system does not claim to cross. Items are
limitations, not promises or implementation plans.

## Persistence And Data

- REST/MySQL and SQLite contain independent datasets.
- There is no migration, synchronization, dual write, fallback read, or conflict
  resolution between providers.
- SQLite is opt-in on native iOS and is never selected on web.
- Native data has no app-level export, backup, import, restore, or encryption flow.
- MySQL schema updates are manual and have no migration history runner.
- Legacy UI numeric-ID aliases are in-memory and remain migration scaffolding.
- REST task/project PUT operations cannot reliably preserve omitted nullable
  fields; active UI workflows avoid this by sending complete editable state.

## Domain And Workflow

- Recurring completion is a multi-call replacement workflow, not one atomic
  series transaction, and there is no occurrence history.
- Task creation/edit relationship updates can partially succeed across REST calls.
- Child-resource repositories are complete, but their former detail-panel UI is
  not active.
- Notes and attachments cannot be updated through current repository contracts.
- Attachments store metadata/paths only; no file transfer or lifecycle exists.
- REST cannot clear tag color and cannot persist every subtask/attachment field
  represented by the domain/SQLite model.
- Catalog bulk creation is repeated operations and can partially succeed.

## Notifications

- No push, iOS local notification, service worker, or background delivery exists.
- Reminder toasts require the app to be active and reminders already loaded.
- Fired reminder suppression is in-memory.

## Backend And Security

- No authentication, authorization, user isolation, or tenancy exists.
- No production secrets, TLS, rate limiting, audit log, API versioning, pagination,
  or idempotency framework exists.
- Backend orchestration is controller-owned with no service layer.

## Mobile And UI

- Android is unsupported.
- Native focus and viewport behavior requires manual iOS validation.
- `App.tsx` still owns high-blast-radius cross-domain and mobile coordination.
- No end-to-end browser or native UI automation exists.

## Delivery And Operations

- No automated deployment, signing, App Store, rollback, or coordinated versioning
  workflow exists.
- CI runs backend and frontend tests but not frontend build, iOS sync, native smoke,
  or documentation validation.
- There is no operational monitoring, health dashboard, or production runbook.

## Related Documents

- [Roadmap and Pressure Points](roadmap-and-pressure-points.md)
- [Synchronization Boundary](../architecture/synchronization.md)
- [Release Guide](../development/release.md)
