# Task Manager Dependency Analysis

## Purpose

This document describes the current source dependency structure of Task
Manager. It records which files coordinate workflows, own domains, provide
shared calculations, render presentation surfaces, expose HTTP endpoints, and
define persistence contracts.

The dependency direction is intentionally direct:

```text
Frontend presentation
    -> App.tsx or bounded hook owner
    -> pure utility and frontend API boundary
    -> backend controller
    -> repository
    -> entity and database
```

Dependencies listed below are architectural dependencies, not only import
statements. For example, presentation components depend on callbacks supplied
by `App.tsx`, and `GlobalExceptionHandler` affects controller responses through
Spring advice rather than constructor injection.

Risk classifications describe the current blast radius:

- **High**: changes can affect several domains, workflows, or layers.
- **Medium**: changes are bounded but shared by multiple consumers or complete
  a persisted workflow.
- **Low**: changes normally remain inside one presentation or infrastructure
  surface.

# Frontend Dependency Graph

## Graph Overview

```text
index.tsx
  -> App.tsx
       -> hooks
            -> api/tasks.ts
            -> types/task.ts
            -> utilities
       -> presentation components
            -> shared controls
            -> types/task.ts
            -> selected utilities
       -> api/tasks.ts
            -> types/task.ts
       -> utilities
            -> types/task.ts
            -> dateTime.ts and small utility dependencies

Calendar.tsx
  -> types/task.ts
  -> dateTime.ts
  -> taskUtils.ts

Backend HTTP API
  <- api/tasks.ts
```

The graph is broadest at `App.tsx`. Hooks and components depend inward on
transport, types, and utilities, while utilities and the API boundary do not
depend on `App.tsx` or feature components.

## Orchestration Nodes

| Major file | Architectural role | Inbound dependencies | Outbound dependencies | Blast radius | Change risk | Why the file exists |
| --- | --- | --- | --- | --- | --- | --- |
| `taskmanager-frontend/src/index.tsx` | Browser entry point and React mount | Browser HTML root and build runtime | `App.tsx`, `index.css`, React DOM | Application startup only; failure prevents all rendering | Medium | Creates the React root and mounts the application composition root |
| `taskmanager-frontend/src/App.tsx` | Composition root, primary task owner, and cross-domain workflow orchestrator | `index.tsx`; user events emitted by nearly every presentation component; results returned by hooks and API calls | All four hooks; frontend API; task types; task/date/form/recurrence/filter/display utilities; Calendar; create, list, detail, form, dialog, settings, and shared components; browser focus, viewport, notification, storage, and scroll APIs | Application-wide: task creation/editing, autosave, recurrence, selection, catalog reconciliation, reminders, mobile behavior, focus, and most rendered surfaces | High | One owner must coordinate workflows that cross primary tasks, bounded domains, drafts, transient state, presentation placement, and platform lifecycles |
| `taskmanager-frontend/src/components/Calendar.tsx` | Calendar presentation owner with calendar-local navigation and picker state | `App.tsx` supplies derived tasks, projects, settings, and task-open intent | `types/task.ts`, `dateTime.ts`, `taskUtils.ts`, `Calendar.css`, React state/effects | Calendar views, date navigation, calendar task rendering, and task-opening intent | Medium | Keeps calendar-local state and rendering together without becoming a second task owner |

## Domain Owners

| Major file | Architectural role | Inbound dependencies | Outbound dependencies | Blast radius | Change risk | Why the file exists |
| --- | --- | --- | --- | --- | --- | --- |
| `src/hooks/useTaskListViewModel.ts` | Owner of derived list, calendar, count, statistics, filter-display, and empty-state data | `App.tsx` supplies primary tasks and current controls | `taskFiltering.ts`, `taskStatistics.ts`, `taskEmptyState.ts`, `taskDisplayHelpers.ts`, `taskUtils.ts`, task types | Every list view, calendar task subset, statistics display, counts, and empty-state selection | High | Provides one derivation path from authoritative task state without storing competing derived state |
| `src/hooks/useBulkSelection.ts` | Owner of transient bulk-mode and selected-ID lifecycle | `App.tsx` and task-list user intent | React state and callbacks only | Bulk selection state and the inputs consumed by bulk mutation orchestration | Low | Encapsulates a complete, bounded selection concept while leaving task mutations in `App.tsx` |
| `src/hooks/useProjectTagCatalog.ts` | Owner of project/tag catalogs, catalog drafts, loading, and catalog CRUD | `App.tsx` supplies shared error reporting and consumes catalog actions/results | Project/tag API functions and project/tag types | Project and tag catalogs, inline catalog forms, filters, task draft choices, and deletion reconciliation inputs | Medium | Keeps bounded catalog persistence and drafts together without owning task assignments or primary task reconciliation |
| `src/hooks/useTaskDetailResources.ts` | Owner of task-keyed subtasks, notes, reminders, attachments, their drafts, and resource CRUD | `App.tsx` supplies time-mode and error handling; detail presentation emits resource intent | Child-resource API functions, child-resource types, `dateTime.ts`, `taskForm.ts`, browser Notification permission | All detail child resources; reminder record state also feeds `App.tsx` delivery/snooze orchestration | High | Gives related task-detail resources one bounded lifecycle while preserving selected-task and reminder-delivery ownership outside the hook |
| `src/types/task.ts` | Shared frontend domain contract | Imported by API, hooks, utilities, Calendar, and many presentation components | No application modules | Every typed task, catalog, recurrence, and child-resource boundary | High | Defines the common frontend representation of backend records |
| `src/api/tasks.ts` | Shared HTTP transport owner for every persisted frontend domain | `App.tsx`, `useProjectTagCatalog`, `useTaskDetailResources`, and API tests | Browser `fetch`, environment API base URL, `types/task.ts`, backend endpoint contracts | All frontend persistence, hydration, task mutations, catalogs, recurrence, tags, and child resources | High | Centralizes URL construction, JSON requests, HTTP error conversion, and typed endpoint functions without owning product workflows |

## Utility Hubs

| Major file or group | Architectural role | Inbound dependencies | Outbound dependencies | Blast radius | Change risk | Why the file exists |
| --- | --- | --- | --- | --- | --- | --- |
| `src/utils/dateTime.ts` | Core local date/time parsing, construction, comparison, and display hub | `App.tsx`, Calendar, detail-resource hook, scheduling/edit/recurrence/filter/statistics/display/task utilities, and tests | JavaScript `Date` only | Nearly every scheduled-task, recurrence, reminder, calendar, filtering, statistics, and display path | High | Gives the application one interpretation of local date/time strings |
| `src/utils/taskScheduling.ts` and `taskForm.ts` | Task schedule construction and form-time validation/conversion | `App.tsx`, task editor workflows, and tests | `dateTime.ts`; shared `Ampm` type | Creation, editing, autosave validation, default end time, and reminder draft typing | High | Separates deterministic schedule and time-form rules from orchestration and JSX |
| `src/utils/taskEditDraft.ts` | Persisted-task to shared-edit-draft conversion | `App.tsx` and tests | Task types, `dateTime.ts`, `taskForm.ts` type | Inline, mobile, and detail editing initialization | Medium | Creates one normalized draft shape for all edit presentations |
| `src/utils/taskRecurrence.ts` and `taskTimeShift.ts` | Recurrence schedule and time-shift calculations | `App.tsx` and tests | `dateTime.ts`; `taskForm.ts` type | Recurring replacement and schedule movement behavior | High | Keeps recurrence and schedule shifting deterministic while `App.tsx` owns mutations |
| `src/utils/taskFiltering.ts`, `taskStatistics.ts`, and `taskEmptyState.ts` | Derived list/statistics/empty-state calculation owners | `useTaskListViewModel` and tests | Task types, `dateTime.ts`, `taskUtils.ts` | Visible task ordering, filters, calendar/list counts, statistics, and empty-state messages | High | Ensures derived views are recomputed from authoritative state and controls |
| `src/utils/taskDisplayHelpers.ts`, `taskDisplay.ts`, and `taskCopyTitle.ts` | Shared display lookup/formatting, status normalization, compact text, and copy-title rules | `App.tsx`, `useTaskListViewModel`, and tests | Task/project/tag types and `dateTime.ts` where needed | Repeated task labels, badges, date ranges, filter display, normalized statuses, and duplicate titles | Medium | Prevents repeated deterministic display rules inside orchestration and presentation |
| `src/utils/taskUtils.ts` | Shared overdue predicate | `App.tsx`, Calendar, filtering, statistics, view-model hook | Task type and `dateTime.ts` | Overdue indicators, counts, filters, statistics, and calendar styling | High | Provides one overdue definition across all consumers |

## Presentation Layers

| Major file or group | Architectural role | Inbound dependencies | Outbound dependencies | Blast radius | Change risk | Why the file exists |
| --- | --- | --- | --- | --- | --- | --- |
| `components/create-task/TaskEditorFields.tsx` | Shared create/edit field composition | `App.tsx` supplies drafts, setters, and intent | `DateTimeRow`, `RecurrenceControl` | Create form plus inline/mobile edit rendering that reuses the field surface | Medium | Keeps repeated task-field JSX consistent while workflow ownership remains in `App.tsx` |
| `components/task-list/TaskListControls.tsx`, `TaskListPresentation.tsx`, `TaskCardMain.tsx` | Task-list controls, structural states, and card content | `App.tsx` supplies derived data, task records, and callbacks | Task/project/tag types; tag/project badge components | Main task list, filters, sorting controls, bulk selection presentation, loading, and empty states | Medium | Splits recognizable list surfaces from task ownership and mutations |
| `components/detail-panel/DetailHeader.tsx`, `DetailDescriptionField.tsx`, `DetailScheduleFields.tsx`, `DetailRepeatRow.tsx`, `DetailStatusBadges.tsx` | Selected-task editor presentation | `App.tsx` supplies shared edit draft and autosave/mutation intent | Shared date/time controls and project badge where needed | Detail editing presentation; schedule fields also share date/time behavior | Medium | Renders the selected task without creating a second draft or selected-task owner |
| `components/detail-panel/DetailAuxiliaryPanels.tsx` and `RemindersSection.tsx` | Child-resource presentation | `App.tsx` supplies hook-owned resources, drafts, and actions | Child-resource types, `DetailSectionShell`, `DateTimeRow` | Notes, subtasks, links, and reminder forms/lists | Medium | Presents the bounded detail-resource domain without owning its persistence |
| `components/shared/DateTimeRow.tsx` and `TimeSelect.tsx` | Shared bounded date/time selector behavior | Create, detail schedule, and reminder presentations | React local state/effects; `taskForm.ts` type; `TimeSelect` from `DateTimeRow` | Every date/time editing surface | Medium | Owns selector-local open state and selected-option scrolling consistently |
| `components/settings/SettingsPanel.tsx`, `StatsModal.tsx`, `dialogs/StatusMoveDialog.tsx` | Bounded settings, statistics, and status-dialog surfaces | `App.tsx` supplies visibility, values, refs, and intent | React types only | One overlay or settings surface each | Low | Keeps bounded overlay and settings markup outside orchestration |
| `components/forms/InlineProjectForm.tsx`, `InlineTagForm.tsx`, `TagColorPicker.tsx` | Inline catalog-entry presentation | `App.tsx` supplies catalog drafts, focus refs, and actions | React types; `InlineTagForm` uses `TagColorPicker` | Project/tag creation surfaces and tag color selection | Low | Renders catalog form intent while catalog persistence remains in its hook |
| `components/shared/ToastList.tsx`, `ConfirmDelete.tsx`, `ErrorBanner.tsx`, `DetailSectionShell.tsx` | Shared feedback and structural presentation | `App.tsx` and detail-resource panels | React effects/types only | Reused feedback, confirmation, and section rendering | Low | Provides small reusable presentation contracts without domain ownership |

# Backend Dependency Graph

## Graph Overview

```text
TaskManagerApplication
  -> Spring component discovery
       -> CorsConfig
       -> DataInitializer -> StatusRepository -> Status
       -> controllers
            -> repositories
            -> entities
            -> ParentTaskGuard -> TaskRepository
       -> GlobalExceptionHandler

TaskController
  -> TaskRepository -> Task
  -> TagRepository -> Tag
  -> RecurrenceRuleRepository -> RecurrenceRule

Child-resource controllers
  -> matching repository -> matching entity
  -> TaskRepository -> Task
  -> ParentTaskGuard
```

Controllers are the backend workflow owners. Repositories expose persistence
operations and derived-query methods. Entities define database mappings,
relationships, defaults, and validation annotations. There is no application
service layer between controllers and repositories.

## Controllers

| Major file | Architectural role | Inbound dependencies | Outbound dependencies | Blast radius | Change risk | Why the file exists |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskController.java` | Primary task, recurrence, and task-tag endpoint owner | Frontend task/recurrence/tag API calls; Spring MVC; global exception advice | `TaskRepository`, `TagRepository`, `RecurrenceRuleRepository`, `Task`, `Tag`, `RecurrenceRule`, validation and HTTP responses | Core task CRUD, ordering, schedule validation, statuses, recurrence attachment, and task-tag associations | High | Owns the current backend rules and persistence ordering for the central task resource |
| `ProjectController.java` | Project CRUD endpoint owner | Frontend project API calls and Spring MVC | `ProjectRepository`, `Project`, bean validation | Project catalog persistence | Medium | Provides direct bounded CRUD for projects |
| `TagController.java` | Tag CRUD and partial-update endpoint owner | Frontend tag API calls and Spring MVC | `TagRepository`, `Tag`, entity and request-record validation | Tag catalog persistence and update validation; task-tag association remains in `TaskController` | Medium | Provides bounded tag catalog CRUD and color/title update rules |
| `SubtaskController.java` | Subtask list/create/update/status/delete owner | Frontend child-resource API calls and Spring MVC | `SubtaskRepository`, `TaskRepository`, `ParentTaskGuard`, `Subtask` | All subtask persistence and parent-existence behavior | Medium | Completes the subtask lifecycle directly against its repository |
| `NoteController.java` | Note list/create/delete owner | Frontend child-resource API calls and Spring MVC | `NoteRepository`, `TaskRepository`, `ParentTaskGuard`, `Note`, system time | All note persistence, timestamps, and parent-existence behavior | Medium | Completes the note lifecycle and assigns server timestamps |
| `ReminderController.java` | Reminder list/create/snooze/delete owner | Frontend reminder API calls and Spring MVC | `ReminderRepository`, `TaskRepository`, `ParentTaskGuard`, `Reminder`, request-record validation | Reminder persistence and due-date changes; frontend delivery behavior is outside this controller | Medium | Owns durable reminder records without owning browser notification delivery |
| `AttachmentController.java` | Link-attachment list/create/delete owner | Frontend attachment API calls and Spring MVC | `AttachmentRepository`, `TaskRepository`, `ParentTaskGuard`, `Attachment` | Link attachment persistence and parent-existence behavior | Medium | Owns the current attachment model of persisted links and metadata |

## Repositories

| Major file or group | Architectural role | Inbound dependencies | Outbound dependencies | Blast radius | Change risk | Why the file exists |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskRepository.java` | Central task persistence and ordered/user-filtered query owner | `TaskController`, all child-resource controllers through `ParentTaskGuard`, and repository tests | Spring Data JPA and `Task` | Primary task persistence, task list ordering, user filtering, and every child-resource parent check | High | Exposes the shared durable task access required by task and child-resource endpoints |
| `TagRepository.java` and `RecurrenceRuleRepository.java` | Related task-domain persistence owners | `TaskController`; `TagController` also uses `TagRepository` | Spring Data JPA and matching entities | Tag catalog plus task-tag associations; recurrence rule lookup/save/delete | Medium | Separates durable related records from task endpoint workflow logic |
| `ProjectRepository.java` | Project persistence owner | `ProjectController` | Spring Data JPA and `Project` | Project catalog only | Low | Supplies standard project CRUD persistence |
| `SubtaskRepository.java`, `NoteRepository.java`, `ReminderRepository.java`, `AttachmentRepository.java` | Child-resource persistence and task-key lookup owners | Matching controllers | Spring Data JPA and matching entities | One child-resource domain each | Medium | Supplies standard CRUD plus the task-keyed queries used by detail loading |
| `StatusRepository.java` | Status seed persistence owner | `DataInitializer` | Spring Data JPA and `Status` | Startup status records | Low | Gives startup initialization access to status records |

## Entities And Shared Validation Owners

| Major file or group | Architectural role | Inbound dependencies | Outbound dependencies | Blast radius | Change risk | Why the file exists |
| --- | --- | --- | --- | --- | --- | --- |
| `Task.java` | Central persisted task schema, validation owner, and task-tag relationship owner | `TaskController`, `TaskRepository`, JSON serialization, database schema | JPA, bean validation, `Tag` relationship | Task API contract, database mapping, task-tag join behavior, and frontend task representation | High | Defines the durable central record and its relationship to tags |
| `Project.java` and `Tag.java` | Catalog entity schemas and validation owners | Matching controllers/repositories; `Tag` also participates in `Task` relationship | JPA and bean validation | Catalog API contracts and database mappings; tag changes also affect task serialization | Medium | Define durable catalog records and their accepted values |
| `RecurrenceRule.java` | Recurrence rule persistence schema | `TaskController` and `RecurrenceRuleRepository` | JPA and local date/time fields | Recurrence endpoint contract and stored recurrence metadata | Medium | Stores the recurrence rule referenced by a task |
| `Subtask.java`, `Note.java`, `Reminder.java`, `Attachment.java` | Child-resource schemas and resource-specific validation owners | Matching controllers/repositories, JSON serialization, database schema | JPA and bean validation | One detail-resource API and table each | Medium | Define durable task-scoped child records and their accepted values |
| `Status.java` | Seeded status schema | `DataInitializer` and `StatusRepository` | JPA | Startup seed records only; task/subtask status fields are scalar IDs | Low | Represents rows initialized for known status identifiers |
| `ParentTaskGuard.java` | Shared parent-existence validation owner | Attachment, note, reminder, and subtask controllers | `TaskRepository`, HTTP response supplier | Listing and creating every child resource under a task | High | Centralizes the repeated rule that task-scoped child endpoints require an existing parent |
| `GlobalExceptionHandler.java` | Shared HTTP error-shape owner | Spring invokes it for validation, data-integrity, and response-status exceptions from all controllers | Spring exception and response APIs | Error status and response body shape across the backend | High | Converts common backend failures into consistent HTTP responses |
| Entity bean-validation annotations plus controller request records | Distributed validation boundary | Spring MVC request binding in all mutation endpoints | `GlobalExceptionHandler` for bean-validation failures | Accepted payloads for tasks, projects, tags, subtasks, notes, reminders, and attachments | High | Keeps persisted-field constraints with entities and endpoint-specific partial-update constraints with request records |

## Backend Infrastructure

| Major file | Architectural role | Inbound dependencies | Outbound dependencies | Blast radius | Change risk | Why the file exists |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskManagerApplication.java` | Spring Boot process entry point | JVM/process startup | Spring Boot component discovery | Entire backend startup | Medium | Starts the backend and discovers its controllers, repositories, entities, and infrastructure |
| `CorsConfig.java` | Shared browser/mobile origin policy | Spring MVC startup and cross-origin requests | Spring MVC CORS registry | Every cross-origin frontend and Capacitor request | High | Allows the current web and mobile application origins to call the backend |
| `DataInitializer.java` | Startup status-data owner | Spring Boot startup | `StatusRepository`, `Status` | Known status rows and any behavior relying on IDs 1, 2, and 3 | Medium | Ensures the database contains the status identifiers used by frontend and backend behavior |

# Architectural Hubs

| Hub | Why it is a hub | Main dependents | Current blast radius |
| --- | --- | --- | --- |
| `App.tsx` | Imports and coordinates almost every frontend domain and presentation boundary | Entire rendered application, four hooks, API, utilities, browser platform APIs | Application-wide |
| `api/tasks.ts` | Every persisted frontend operation passes through one transport module | `App.tsx`, catalog hook, detail-resource hook | All frontend/backend integration |
| `types/task.ts` | Shared shape contract for all frontend persisted records | API, hooks, Calendar, utilities, many components | All typed frontend domains |
| `dateTime.ts` | Base dependency for scheduling, recurrence, filtering, statistics, reminders, calendar, and display | `App.tsx`, Calendar, hook and utility graph | All time-sensitive behavior |
| `useTaskListViewModel.ts` | Aggregates the derived-state utility graph for `App.tsx` | Task list, calendar subset, statistics, counts, empty states | Most read-only task views |
| `useTaskDetailResources.ts` | Aggregates four child-resource APIs and task-keyed working copies | Detail panels and reminder state consumed by `App.tsx` | All task detail child resources |
| `TaskController.java` | Owns the broadest backend resource and depends on three repositories | Frontend task, recurrence, and task-tag APIs | Core backend behavior |
| `TaskRepository.java` | Serves primary task endpoints and parent checks for four child domains | Task controller and child controllers/guard | Most backend request paths |
| `Task.java` | Central entity and task-tag relationship contract | Task repository/controller, serialization, database | Core backend schema and task payloads |
| `ParentTaskGuard.java` | Shared validation dependency of every child-resource controller | Four child-resource controllers | Child-resource list/create paths |
| `GlobalExceptionHandler.java` | Cross-cutting response owner invoked for common controller failures | All controllers indirectly | Backend error contracts |

# Leaf Nodes

Leaf nodes have narrow inbound use and little or no application-module output.
They are not necessarily unimportant; they simply have a contained dependency
surface.

| Leaf node or group | Inbound dependency | Outbound dependency | Current blast radius |
| --- | --- | --- | --- |
| `ErrorBanner.tsx`, `ConfirmDelete.tsx`, `DetailSectionShell.tsx` | `App.tsx` or one detail presentation | React types only | One shared visual pattern |
| `StatsModal.tsx`, `SettingsPanel.tsx`, `StatusMoveDialog.tsx` | `App.tsx` | React types only | One bounded overlay/settings surface |
| `DetailHeader.tsx`, `DetailDescriptionField.tsx`, `DetailRepeatRow.tsx` | `App.tsx` | React event types or a recurrence type | One detail-panel section |
| `TagColorPicker.tsx`, `InlineProjectForm.tsx` | `App.tsx` or `InlineTagForm` | React types only | One catalog-entry control |
| `RecurrenceControl.tsx` | `TaskEditorFields` and `App.tsx` for formatting/type use | React event types only | Recurrence selector presentation |
| `TaskListPresentation.tsx` | `App.tsx` | No application modules | Task-list structural states |
| `ProjectRepository.java`, `StatusRepository.java` | One controller or initializer | Matching entity through Spring Data | One bounded backend domain |
| `Status.java` | `StatusRepository` and initializer | JPA only | Status seed schema |
| `TaskManagerApplication.java` | Process startup | Spring Boot | Startup composition |

# High-Risk Change Areas

- **`App.tsx` orchestration and platform behavior:** it owns the primary task
  working copy, create and shared edit drafts, selected-task lifecycle,
  cross-domain mutation ordering, autosave, recurrence replacement, reminder
  delivery, mobile placement, global focus, viewport, scroll, and dropdown
  coordination. A local change can alter several workflows without changing
  imports elsewhere.
- **Frontend transport and shared contracts:** `api/tasks.ts` and
  `types/task.ts` connect all persisted frontend domains to backend endpoint
  and payload contracts.
- **Date/time utility chain:** `dateTime.ts` feeds schedule construction,
  recurrence, reminders, filtering, overdue calculations, statistics,
  calendar rendering, and display formatting.
- **Derived task view chain:** `useTaskListViewModel.ts` combines filtering,
  sorting, statistics, empty-state, priority-filter, and overdue logic used by
  multiple visible surfaces.
- **Detail-resource and reminder boundary:** `useTaskDetailResources.ts` owns
  durable reminder records and CRUD, while `App.tsx` consumes that state for
  polling, delivery, toast, and snooze workflows.
- **Task backend core:** `TaskController.java`, `TaskRepository.java`, and
  `Task.java` jointly define most backend task behavior, persistence, ordering,
  recurrence references, tag relationships, and serialized task payloads.
- **Shared backend validation/error behavior:** `ParentTaskGuard.java`,
  entity annotations, controller request records, and
  `GlobalExceptionHandler.java` affect multiple endpoints or the shared error
  contract.
- **Status identifiers and CORS:** `DataInitializer.java` establishes scalar
  status IDs used across the application, and `CorsConfig.java` gates every
  browser/mobile cross-origin request.

# Low-Risk Change Areas

- Small presentational leaves such as `ErrorBanner.tsx`,
  `DetailSectionShell.tsx`, `DetailHeader.tsx`, and
  `TaskListPresentation.tsx` have no transport or domain mutation
  dependencies.
- Bounded overlays such as `StatsModal.tsx`, `SettingsPanel.tsx`, and
  `StatusMoveDialog.tsx` consume values and intent supplied by `App.tsx`
  without owning persisted workflows.
- `useBulkSelection.ts` has a narrow React-only dependency surface and owns
  transient selection rather than task mutation.
- `ProjectRepository.java` and `StatusRepository.java` expose only standard
  Spring Data operations to one current consumer each.
- `Status.java` is a small persistence leaf used only by startup status
  initialization.

Low dependency risk does not mean low user visibility. Presentation changes
can still be visible, but their current source dependency blast radius is
contained.

# Dependency Smells Avoided

- **No circular frontend feature dependencies:** components emit intent
  upward; hooks, utilities, and API modules do not import `App.tsx`.
- **No raw transport calls throughout presentation:** HTTP behavior is
  centralized in `api/tasks.ts`.
- **No persisted mutations in leaf components:** presentation receives state
  and callbacks instead of becoming a competing domain owner.
- **No duplicate task authority across list, calendar, and detail surfaces:**
  all consume the primary task working copy owned by `App.tsx`.
- **No stored copies of major derived views:** filtering, sorting, statistics,
  counts, and empty-state selection flow through the derived utility and
  view-model graph.
- **No backend service pass-through layer:** current bounded controllers call
  repositories directly, so request-to-persistence dependencies remain
  visible.
- **No duplicated parent-existence check for child-resource list/create
  paths:** `ParentTaskGuard` owns the shared rule.
- **No repository ownership of HTTP or presentation concerns:** repositories
  expose persistence operations and derived queries only.
- **No entity dependency on controllers or repositories:** entities remain
  persistence and validation contracts.

# Dependency Lessons

- Dependency breadth follows ownership breadth. `App.tsx` has the widest
  frontend dependency surface because it owns cross-domain and platform-aware
  workflows, while bounded hooks depend only on the domains they can complete.
- File size and dependency role are different measures. `Calendar.tsx` is
  large but remains a bounded presentation owner; smaller shared files such as
  `dateTime.ts`, `TaskRepository.java`, and `ParentTaskGuard.java` have wider
  behavioral reach.
- Pure utilities make dependency direction explicit. Scheduling, recurrence,
  filtering, statistics, display, and draft conversion depend on data and
  smaller utilities rather than on React owners or transport.
- Shared types and transport are integration hubs even though they contain no
  product orchestration. Their contracts connect frontend owners to every
  backend resource.
- Backend complexity is concentrated in controllers because current request
  workflows are direct. Repositories and entities remain narrow persistence
  dependencies, with shared rules extracted only where several controllers
  consume the same behavior.
- Child resources form parallel dependency paths: presentation to
  `useTaskDetailResources`, API transport, matching controller, matching
  repository, and matching entity, with `TaskRepository` and
  `ParentTaskGuard` shared at the parent boundary.
- Cross-cutting dependencies are not always imports. Spring advice, bean
  validation, browser focus/viewport APIs, CSS placement, and environment
  configuration can have application-wide effects through framework and
  platform lifecycles.
