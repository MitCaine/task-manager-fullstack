# Architecture Decision Index

| Field | Value |
| --- | --- |
| Status | Canonical index |
| Audience | Contributors evaluating architecture changes |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

ADRs record stable decisions already implemented. Canonical guides explain the
current system; ADRs explain why a decision was taken and what alternatives were
rejected.

## Decisions

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](adr-0001-app-orchestration-owner.md) | Amended | Keep App as cross-domain composition owner while extracting bounded workflows |
| [0002](adr-0002-shared-edit-draft.md) | Accepted | Share one edit draft across desktop and mobile editors |
| [0003](adr-0003-autosave-ownership.md) | Superseded | Historical autosave ownership decision; active editing uses explicit Save |
| [0004](adr-0004-mobile-edit-row.md) | Accepted | Render mobile editing in a dedicated task-list row |
| [0005](adr-0005-ios-focus-guard.md) | Accepted | Protect iOS text entry with shared focus and viewport guards |
| [0006](adr-0006-reminder-ownership-split.md) | Accepted | Separate reminder persistence, due detection, and presentation |
| [0007](adr-0007-recurring-task-replacement.md) | Accepted | Complete recurring tasks by creating the next occurrence and deleting the old |
| [0008](adr-0008-no-backend-service-layer.md) | Accepted | Keep current backend orchestration in controllers |
| [0009](adr-0009-repository-boundary.md) | Accepted | Make repository contracts the frontend persistence boundary |
| [0010](adr-0010-sqlite-lifecycle.md) | Accepted | Centralize SQLite initialization, migrations, transactions, and close lifecycle |
| [0011](adr-0011-runtime-provider-selection.md) | Accepted | Select one complete provider; REST default, SQLite explicit native opt-in |
| [0012](adr-0012-canonical-domain-ids.md) | Accepted | Use string entity/status identity at the domain boundary |
| [0013](adr-0013-recurrence-ownership.md) | Accepted | Own SQLite recurrence through `recurrence_rules.task_id` and derive task relation |

## Status Rules

- **Accepted:** implemented and binding.
- **Amended:** core decision remains, but a later implementation narrows it.
- **Superseded:** retained for history; do not use as current guidance.
- **Proposed:** not used for future ideas in this index; planning belongs in the
  roadmap until a decision is implemented.

## Related Documents

- [Architecture Overview](../architecture/overview.md)
- [Why This Exists](../reference/why-this-exists.md)
- [Documentation Guide](../development/documentation.md)
