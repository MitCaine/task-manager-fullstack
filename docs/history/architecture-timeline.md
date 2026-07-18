# Architecture Timeline

| Field | Value |
| --- | --- |
| Status | Historical |
| Audience | Contributors seeking implementation context |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This timeline records major architecture transitions. Canonical guides, not this
history, define current behavior.

## Original Full-Stack Baseline

The project began as a Spring Boot/JPA/MySQL backend and React frontend whose UI
called shared REST helpers directly. Backend entities and UI models used numeric
IDs shaped by the original relational schema. `App.tsx` accumulated task state,
editing, filtering, recurrence, mobile navigation, and presentation coordination.

## Mobile And Scheduling Expansion

The application added Capacitor iOS packaging, safe-area/mobile layout, calendar
views, start/end scheduling, recurrence intervals, bulk task operations, projects,
tags, subtasks, notes, reminders, attachments, and accessibility/focus behavior.
Native WKWebView keyboard failures led to dedicated mobile edit placement and a
shared focus/visual-viewport protection system.

## Frontend Ownership Extraction

Presentation components and deterministic utilities were extracted first. Bounded
workflow hooks later took ownership of create task, inline editing, catalogs,
child resources, view derivation, bulk selection, floating controls, and modal
focus return. `App.tsx` remained the composition and cross-domain owner.

The legacy task detail panel and its autosave path were removed from active UI.
Explicit Save became the current edit behavior. Child-resource persistence code
remained available and tested.

## Project And Tag Scalability

Catalog management gained search, sort/filter, usage counts, inline rename/color,
bulk creation/deletion, mode exclusion, and task-draft inline creation. Assignment
pickers and management surfaces became distinct concerns.

## Repository Migration

The persistence migration introduced domain models with string IDs and canonical
status strings, split repository interfaces, REST implementations and DTO mappers,
legacy UI adapters, and shared contract tests. `App.tsx` and hooks stopped importing
REST transport directly and began consuming repositories through context.

## SQLite Stages 5A-5E

SQLite foundation work added the driver contract, shared database service,
forward-only `user_version` migrations, canonical status schema, transaction queue,
row/date/ID helpers, and SQL.js tests. Repository implementations were added in
increasing relationship complexity: catalogs, child resources, tasks, then
recurrence. Patch semantics were audited before task persistence.

Task hydration batched tag and recurrence relationships. Recurrence ownership was
resolved through `recurrence_rules.task_id UNIQUE`; task recurrence identity became
derived relationship data.

## Composition And Native Validation

Stage 5F composed all SQLite repositories around one caller-owned service and
proved cross-repository transactions. Stage 5G added the explicit iOS smoke harness
and corrected native connection sequencing, nontransactional pragma execution, and
nested migration transaction behavior against `@capacitor-community/sqlite`.

## Runtime Provider Boundary

Stage 5H added atomic runtime selection. REST remained synchronous/default. SQLite
became opt-in through `REACT_APP_ENABLE_SQLITE_PERSISTENCE=true` on native iOS only.
The provider waits for initialization, surfaces failure without fallback, and
closes only provider-owned selections.

Stage 5I validated App startup against an empty SQL.js-backed SQLite composition,
string UUID-style identity through legacy adapters, persistence across remount,
and native activation expectations. No sync or data migration was added.

## Current Boundary

The repository layer and optional native SQLite runtime are complete. REST remains
default, the UI still uses legacy numeric models, and the two datasets remain
independent.

## Related Documents

- [Architecture Overview](../architecture/overview.md)
- [ADR Index](../adr/README.md)
- [Project Retrospective](project-retrospective.md)
