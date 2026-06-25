# Task Manager Architecture

## Purpose

This document explains how the current Task Manager system is structured, how
requests and state move through it, and why several responsibilities remain
centralized.

The architecture reflects implementation constraints that are important to the
working application:

- task mutations often cross multiple API resources;
- task editing is shared by inline and mobile interfaces;
- explicit edit saves coordinate task fields, tags, and recurrence;
- mobile editing must preserve iOS WKWebView focus and viewport stability;
- dropdowns, dialogs, keyboard behavior, and focus restoration interact;
- reminder records and reminder-toast delivery have different owners.

File size alone is not an architectural boundary. Responsibilities are
extracted when they have a coherent owner and a stable interface.

## System Overview

The application consists of:

- a React and TypeScript frontend under `taskmanager-frontend/`;
- a Spring Boot REST backend under `src/main/java/com/example/taskmanager/`;
- MySQL persistence for local runtime data;
- H2-backed backend tests;
- a Capacitor iOS wrapper around the frontend.

The frontend treats the task collection as the primary application state.
Projects and tags are loaded as shared catalogs. Task-associated resource API
contracts remain available for subtasks, notes, reminders, and attachments, but
the legacy detail-panel resource UI is no longer part of the active task-editing
path.

```text
User interaction
    |
    v
Presentation component emits a callback
    |
    v
App.tsx or a bounded domain hook handles the intent
    |
    v
taskmanager-frontend/src/api/tasks.ts sends a REST request
    |
    v
Spring controller validates and performs the mutation
    |
    v
Spring Data repository persists the entity
    |
    v
Frontend updates local state from the response
```

## Frontend Architecture

### Application Composition and Orchestration

`taskmanager-frontend/src/App.tsx` is the frontend composition root and
orchestration owner. It combines the major screens, supplies state and
callbacks to presentation components, and coordinates behavior that crosses
multiple domains.

`App.tsx` owns:

- the primary task collection;
- top-level loading and error state;
- create-task and edit-task drafts;
- selected-task highlighting;
- task creation, editing, deletion, duplication, completion, and status moves;
- recurring-task completion and next-occurrence replacement;
- task/project/tag reconciliation;
- explicit task edit saves;
- global dropdown, dialog, outside-click, and keyboard coordination;
- reminder polling, duplicate-toast suppression, and snoozing;
- mobile page navigation, swipe behavior, and mobile edit placement;
- iOS text-focus and visual viewport protection.

These responsibilities remain together because their behavior depends on
shared state, mutation ordering, or the rendered application structure.

### Hooks

Hooks own bounded concepts that can operate without controlling the entire
application lifecycle.

| Hook | Responsibility |
| --- | --- |
| `useTaskListViewModel` | Derives visible list tasks, calendar tasks, counts, statistics, filter state, and empty-state presentation data. |
| `useBulkSelection` | Owns bulk mode and the set of selected task IDs. |
| `useProjectTagCatalog` | Owns project/tag catalog records, creation drafts, loading, and catalog-level mutations. |
| `useTaskDetailResources` | Owns task-associated resources, their drafts, loading, and resource-level mutations. |

Hooks do not own task selection, task-level mutation orchestration, autosave,
focus, dropdown placement, mobile edit placement, or the iOS focus guard.
Detailed boundaries are documented in `docs/ownership-map.md`.

### Components

Components primarily form presentation boundaries. They receive state and
callbacks from `App.tsx` or a hook, render the corresponding interface, and
emit user intent upward.

Major component groups are:

- `components/create-task/`: create and edit field presentation, recurrence
  controls, and project/tag chips;
- `components/task-list/`: task-list toolbar, list controls, task cards, list
  labels, dividers, and empty states;
- `components/shared/`: reusable date/time controls, section shells, banners,
  confirmations, and toasts;
- `components/dialogs/` and `components/settings/`: status movement, settings,
  and statistics overlays;
- `Calendar.tsx`: calendar presentation and calendar-local navigation state.

Components may own behavior strictly internal to their presentation boundary.
For example:

- `Calendar` owns its selected year, month, week, day, view, and picker state;
- `DateTimeRow` owns which internal time selector is open;
- `TimeSelect` scrolls its selected option into view;
- `ToastList` owns confirmation-toast auto-dismiss timers.

Components do not independently mutate the primary task collection or assume
ownership of cross-domain application state.

### Utilities

Utilities contain deterministic calculations and transformations. They do not
own React state, API requests, focus, or DOM behavior.

| Utility | Responsibility |
| --- | --- |
| `dateTime.ts` | Local date/time parsing, construction, comparison, and formatting. |
| `taskScheduling.ts` | Builds task start/end schedules and default end times. |
| `taskForm.ts` | Validates task time ranges and converts 12/24-hour values. |
| `taskEditDraft.ts` | Converts a persisted task into edit-draft values. |
| `taskRecurrence.ts` | Calculates next occurrences and preserves task duration. |
| `taskTimeShift.ts` | Calculates quick hour/day schedule shifts. |
| `taskFiltering.ts` | Filters and sorts task lists. |
| `taskStatistics.ts` | Derives task statistics. |
| `taskDisplayHelpers.ts` | Performs project/tag lookup and display formatting. |
| `taskEmptyState.ts` | Selects list empty-state content. |
| `taskCopyTitle.ts` | Produces numbered duplicate-task titles. |
| `taskUtils.ts` | Provides shared task predicates. |

### Frontend API Boundary

`taskmanager-frontend/src/api/tasks.ts` is the frontend REST boundary. It
contains:

- shared fetch and delete wrappers;
- optional `REACT_APP_API_BASE_URL` handling;
- endpoint functions for tasks, recurrence, tags, projects, subtasks, notes,
  reminders, and attachments.

The API module performs HTTP transport only. It does not own application state,
mutation orchestration, or error presentation.

## Backend Architecture

The backend uses a direct controller/repository structure. There is no
dedicated service layer in the current implementation.

```text
HTTP request
    |
    v
Controller
  - validates input
  - checks related records
  - performs bounded mutation logic
  - selects response status
    |
    v
Spring Data JPA repository
    |
    v
MySQL or H2
```

### Controllers

Controllers own endpoint definitions, request validation, basic mutation
logic, related-record checks, and HTTP responses.

| Controller | Responsibility |
| --- | --- |
| `TaskController` | Task CRUD, status changes, recurrence-rule attachment, and task/tag associations. |
| `ProjectController` | Project CRUD. |
| `TagController` | Tag creation, color updates, listing, and deletion. |
| `SubtaskController` | Task-scoped subtask CRUD and status changes. |
| `NoteController` | Task-scoped note listing, creation, and deletion. |
| `ReminderController` | Task-scoped reminder CRUD and due-date updates. |
| `AttachmentController` | Task-scoped link attachment CRUD. |

`ParentTaskGuard` centralizes the rule that child-resource operations require
an existing parent task.

`GlobalExceptionHandler` converts validation, data-integrity, and explicit
response-status failures into structured HTTP responses.

`DataInitializer` ensures the expected status records exist.

`CorsConfig` allows the configured browser and Capacitor origins.

### Repositories

Repositories are Spring Data JPA interfaces. They own persistence access and a
small number of query methods, such as task ordering and task-resource lookup.
They do not own workflows or frontend-facing orchestration.

### Entities

The active backend entities are:

- `Task`;
- `Project`;
- `Tag`;
- `Status`;
- `RecurrenceRule`;
- `Subtask`;
- `Note`;
- `Reminder`;
- `Attachment`.

Entities primarily define persisted fields, relationships, and validation
annotations. They are not rich domain-service objects.

`Task` stores direct foreign-key IDs for status, project, user, schedule, and
recurrence rule. Tags are represented as a JPA many-to-many relationship.

### Service-Layer Boundary

No backend service layer currently exists. Bounded operations remain in their
controllers. This keeps the current request path direct and visible.

A future operation that requires reusable business rules or transactions
across several repositories would need an explicit service owner. Existing
controller behavior should not be moved merely to create an additional layer.

## Database Architecture

The backend uses MySQL for local runtime persistence. Backend tests use H2.

Hibernate schema mutation is disabled:

```properties
spring.jpa.hibernate.ddl-auto=none
```

Schema changes are controlled manually rather than generated by Hibernate.
The active runtime entity model is smaller than the original database design;
tables without active entities or application behavior are not part of the
current request flow.

The database is accessed only through backend repositories. Frontend code
communicates through the REST API.

## Request and Data Flows

### Initial Hydration

```text
App mounts
    |
    +--> App.tsx requests tasks
    |
    +--> useProjectTagCatalog requests projects and tags
    |
    v
Collections are stored locally
    |
    v
useTaskListViewModel derives list, calendar, count, and statistics data
```

### Task Creation

1. `App.tsx` owns the create-task draft.
2. Schedule utilities construct start and optional end timestamps.
3. The base task is created.
4. Recurrence is applied through the recurrence endpoint when selected.
5. Tag relationships are applied through task/tag endpoints.
6. The composed task is added to local task state.
7. Create-form state is reset and a confirmation toast is queued.

Creation remains in `App.tsx` because it crosses task, recurrence, tag,
project, validation, draft-reset, and toast responsibilities.

### Task Editing and Autosave

1. `startEdit` derives edit values from the selected task.
2. Current tag ordering and recurrence data are loaded.
3. The same edit draft drives inline and mobile editing.
4. The active editors save explicitly through `saveEdit`.
5. `saveEdit` updates the base task.
6. Tag relationships are reconciled.
7. Recurrence changes are saved through their separate endpoint.

Legacy detail-panel autosave has been removed from the active UX. Edit-draft
ownership remains colocated with task mutation ownership in `App.tsx`.

### Recurring Task Completion

Completing an active recurring task is a replacement workflow:

```text
Load recurrence rule
    |
    v
Calculate next schedule
    |
    v
Create next task occurrence
    |
    +--> copy task tags
    +--> attach recurrence
    |
    v
Delete completed occurrence
    |
    v
Replace task in local state
    |
    v
Scroll to and highlight next occurrence
```

This remains centralized because it coordinates several APIs, primary task
state, selected-task state, and rendered list behavior.

### Detail Resources

1. `useTaskDetailResources` owns retained resource state for subtasks, notes,
   reminders, and attachments.
2. Resources are cached by task ID when a resource entry point loads them.
3. The old task detail side panel and its resource UI are not part of the
   current active UX.
4. The hook still contains resource-level mutation helpers for future or
   ambiguous resource functionality.

### Recurrence Model and Display

Recurrence is stored and transported as `intervalValue` plus `intervalUnit`.
Supported units are `day`, `week`, `month`, and `year`; allowed values are
1-7 days, 1-4 weeks, 1-12 months, and 1-5 years. Backend validation and
frontend recurrence controls use the same limits.

Legacy `daily`, `weekly`, and `monthly` frequency values remain accepted for
old rows and old clients. The backend normalizes those values into interval
records, and frontend helpers normalize old recurrence responses before display
or scheduling. Labels such as `Every day`, `Every 2 weeks`, and `Every 3
months` are derived from the shared recurrence display helper. Task-card repeat
indicators load the recurrence rule on demand and show the formatted label in a
tooltip/popover.

Recurrence UI components own presentation only. `RecurrenceControl` renders the
create, inline-edit, and mobile-edit recurrence picker. Recurrence scheduling
remains in the pure recurrence utility, while `App.tsx` owns mutation workflows
that attach, clear, copy, or replace recurrence rules.

### Reminders

Reminder ownership is intentionally split:

- `useTaskDetailResources` owns persisted reminder records and reminder form
  drafts;
- `App.tsx` polls loaded reminders, suppresses duplicate notifications, queues
  reminder toasts, and performs snoozing;
- `ToastList` renders toasts and owns confirmation-toast auto-dismiss timers.

Snoozing updates the persisted reminder through the API and then updates the
hook-owned reminder collection exposed through `setReminders`.

### Catalog Mutations

`useProjectTagCatalog` owns catalog-level API mutations and catalog state. The
catalog-management modal layers project/tag search, name and usage sort modes,
used/unused filtering, usage counts, newline-based bulk creation, single delete
confirmation, and bulk selection/deletion over that catalog state.

The modal keeps catalog interaction modes exclusive: entering edit mode clears
bulk selection and pending bulk deletion; selecting rows exits edit/search/delete
confirmation flows; search and sort/filter controls clear edit and selection
state; and single-delete and bulk-delete confirmations clear each other.

`App.tsx` reconciles successful catalog mutations into task state and active
draft/filter values because the catalog hook does not own tasks, selected-task
state, draft fields, filters, recurrence-related task references, or list
controls. After project deletion, App clears project assignments from affected
tasks, selected task state, drafts, and filters; after tag deletion, App removes
those tag relationships from affected tasks, selected task state, drafts, and
filters.

## Ownership Principles

A responsibility belongs in a hook, utility, or component when it has:

- a coherent concept;
- a stable input/output boundary;
- minimal knowledge of unrelated state;
- no need to control rendered placement;
- no need to coordinate focus, dropdowns, autosave, or cross-domain mutations.

A responsibility remains centralized when it:

- mutates several domains;
- coordinates state owned by multiple hooks;
- depends on selected-task lifecycle;
- requires knowledge of current DOM structure;
- controls focus restoration or outside-click behavior;
- coordinates mobile and desktop behavior;
- must preserve mutation ordering;
- owns autosave or reminder delivery.

## Why `App.tsx` Remains the Orchestration Layer

Several sections of `App.tsx` appear individually extractable but share
important ownership:

- Edit state is shared by inline and mobile editors.
- Explicit saves depend on current task references and edit drafts.
- Dropdown closing follows application-wide Escape and outside-click rules.
- Recurring completion crosses task creation, deletion/replacement, recurrence-rule loading and attachment, tag copying, bulk selection, selected-task state, scrolling, and highlighting.
- Mobile editing placement is part of the iOS focus-stability system.
- Reminder snoozing crosses persisted reminder state and transient toast state.

Splitting these responsibilities without transferring full ownership would
hide the mutation flow and replace direct orchestration with callback-heavy
interfaces.

## Extraction Guidance

### Current `App.tsx` Extraction Boundary

A follow-up architecture audit after the `TaskListToolbar`, `TaskListItems`,
`CreateTaskCard`, and `PrioritySelector` extractions identified the legacy
detail side panel as cleanup work rather than an active presentation boundary.
State ownership stays in `App.tsx`; the active extracted components do not move
protected mobile or focus behavior.

Further extraction should be deferred until a specific feature or bug requires
touching the affected region. Large JSX alone is not sufficient justification.
Extract presentation islands only when state ownership remains in `App.tsx`, the
prop surface is bounded, and protected mobile/focus behavior is untouched.

The following regions remain in `App.tsx` intentionally:

- iOS focus, `visualViewport`, and text-focus debug infrastructure;
- Escape, outside-click, and focus restoration coordination;
- add, update, complete, delete, and duplicate task flows;
- recurrence handling;
- selected-task open/close lifecycle;
- autosave ownership;
- project/tag deletion reconciliation;
- bulk task actions;
- swipe and pager handlers;
- mobile edit row placement.

The following large regions are medium- or high-risk extraction targets and
should not be extracted casually:

- `renderInlineEditForm`;
- the create-task panel;
- the task-list row shell;
- task-list metadata and editor controls.

### Appropriate Boundaries

Appropriate boundaries include:

- pure calculations;
- derived view models;
- resource-specific CRUD state;
- catalog-specific CRUD state;
- self-contained presentation sections;
- component-local interaction state.

Existing examples include the four frontend hooks and the scheduling,
recurrence, filtering, display, and statistics utilities. Recurrence utilities
normalize old `daily`/`weekly`/`monthly` values into the current interval shape,
clamp values to unit-specific ranges, advance dates by interval, preserve task
duration, and format user-facing labels such as `Every week` or `Every 3 months`.

### Protected Centralized Responsibilities

Do not extract or relocate these responsibilities solely to reduce file size:

- focus ownership;
- dropdown and outside-click ownership;
- autosave ownership;
- selected-task ownership;
- mobile edit ownership;
- reminder polling and snooze ownership;
- pager and swipe behavior;
- cross-domain task mutations;
- `renderInlineEditForm`;
- iOS text-focus guard;
- `visualViewport` handling;
- root sizing and scroll ownership.

The protected mobile and focus behavior is documented in
`docs/mobile-focus-system.md`.

## Tests as Architecture Evidence

The test suite documents and protects the active architecture:

- `App.test.tsx` covers application orchestration, mobile interaction, focus
  behavior, task editing, recurrence, filters, and accessibility behavior;
- utility tests protect deterministic scheduling, recurrence, filtering,
  formatting, and draft transformations;
- `Calendar.test.tsx` protects calendar-local behavior;
- `api/tasks.test.ts` protects the frontend REST boundary;
- backend controller tests protect endpoints, validation, and child-resource
  behavior;
- backend repository tests protect task query behavior.

When changing ownership, update tests only when the intended behavior changes.
Moving code without changing behavior should preserve the existing behavioral
test contract.
