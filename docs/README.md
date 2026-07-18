# Documentation Index

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | All contributors |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This index organizes documentation by the work a reader intends to do. Canonical
guides describe the current implementation. Records under `history/` preserve
context but are not implementation authority.

## Choose a Reading Path

### Returning to the project

1. Read the [Repository Tour](repository-tour.md).
2. Read the [Architecture Overview](architecture/overview.md).
3. Read the domain guide for the feature being changed.
4. Use the [Development Workflow](development/workflow.md) and
   [Testing Guide](development/testing.md) before submitting changes.

### Changing frontend behavior

- [Frontend Architecture](architecture/frontend.md)
- [Tasks and Scheduling](domains/tasks-and-scheduling.md)
- [Mobile and iOS Architecture](architecture/mobile-ios.md) for touch, focus, or
  native-runtime changes
- [Change Impact Guide](reference/change-impact-guide.md)

### Changing persistence or API behavior

- [Repository Architecture](architecture/repositories.md)
- [Persistence Architecture](architecture/persistence.md)
- [SQLite Architecture](architecture/sqlite.md)
- [Backend Architecture](architecture/backend.md)
- [API Reference](reference/api.md)

### Working on a domain

| Domain | Canonical guide |
| --- | --- |
| Task lifecycle and schedules | [Tasks and Scheduling](domains/tasks-and-scheduling.md) |
| Recurring tasks | [Recurrence](domains/recurrence.md) |
| Projects and tags | [Projects and Tags](domains/projects-and-tags.md) |
| Subtasks, notes, reminders, and attachments | [Child Resources](domains/child-resources.md) |
| Reminder delivery and toasts | [Notifications](architecture/notifications.md) |

### Setting up or operating the project

- [Setup](development/setup.md)
- [Configuration Reference](reference/configuration.md)
- [iOS Development](development/ios-development.md)
- [Troubleshooting](development/troubleshooting.md)
- [Release Guide](development/release.md)

## Guide Map

| Guide | Question it answers |
| --- | --- |
| [Repository Tour](repository-tour.md) | Where is code located, and where should a change begin? |
| [Architecture Overview](architecture/overview.md) | Which layer owns each responsibility? |
| [Why This Exists](reference/why-this-exists.md) | Why do the main boundaries and invariants exist? |
| [Architecture Glossary](reference/glossary.md) | What does a recurring architecture term mean here? |
| [Known Limitations](reference/known-limitations.md) | What does the system deliberately not claim to support? |
| [ADR Index](adr/README.md) | Which stable decisions constrain a change? |
| [Documentation Guide](development/documentation.md) | How are these documents kept authoritative? |

## Canonical Versus Historical Material

Canonical guides use `Status: Canonical` and must match production code.
Historical records use `Status: Historical`; they explain how the system evolved
and may describe superseded behavior. A canonical guide links to a historical
record only when that context is useful.

## Related Documents

- [Project README](../README.md)
- [Architecture Decision Index](adr/README.md)
- [Architecture Timeline](history/architecture-timeline.md)
- [Architecture Glossary](reference/glossary.md)
