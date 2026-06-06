# Task Manager Ownership Map

## Purpose

This document identifies the current owners of application state, mutations,
presentation behavior, and infrastructure concerns. It is intended to answer
two questions for maintainers:

1. Where should an existing behavior be changed?
2. Which nearby responsibilities must remain untouched when making that
   change?

Ownership describes responsibility, not file size. A large owner may be the
correct boundary when its behavior coordinates several domains.

## Ownership Summary

```text
App.tsx
├── owns primary tasks and cross-domain orchestration
├── owns selected task, edit drafts, autosave, focus, and mobile behavior
├── consumes bounded hooks
└── supplies state and callbacks to presentation components

Hooks
├── own bounded stateful concepts
└── do not control global application lifecycle

Components
├── render state
├── own presentation-local behavior
└── emit intent upward

Utilities
└── perform deterministic calculations without state or side effects

Frontend API
└── performs HTTP transport

Backend controllers
├── define endpoints
├── validate requests
└── perform bounded persistence mutations

Repositories
└── provide persistence access
```

## `App.tsx`

`taskmanager-frontend/src/App.tsx` is the frontend composition root and
orchestration owner.

### State Ownership

`App.tsx` owns:

- the primary `tasks` collection;
- loading and top-level error state;
- the locally persisted workspace label;
- create-task draft values;
- edit-task draft values;
- search, filter, sort, and view-tab controls;
- selected-task and detail-panel state;
- expanded detail sections;
- active inline or mobile editor;
- delete confirmation state;
- status-move dialog state;
- settings and statistics visibility;
- dropdown, action-menu, and floating-control state;
- mobile page and mobile-edit layout state;
- reminder toast queue.

It does not own:

- detail-resource collections;
- project/tag catalog collections;
- bulk-selection internals;
- derived list and statistics data;
- calendar-local navigation state.

### Mutation Ownership

`App.tsx` owns task-level and cross-domain workflows:

- task creation;
- task update;
- task deletion;
- completion and status movement;
- recurring-task completion;
- duplication;
- task/tag relationship reconciliation;
- project/tag deletion reconciliation;
- bulk completion and deletion.

These operations remain in `App.tsx` when they require more than one API
resource, update the primary task collection, or affect selection and rendered
application behavior.

### Autosave Ownership

`App.tsx` owns:

- the autosave timer;
- refs that keep delayed callbacks pointed at current task and save state;
- save scheduling;
- save flushing when panels close or switch;
- base task updates;
- tag reconciliation;
- recurrence reconciliation.

Autosave depends on selected-task ownership, edit-draft ownership, and primary
task state. Those responsibilities must remain coordinated.

### Mobile Ownership

`App.tsx` owns:

- active mobile page;
- pager transitions;
- swipe eligibility and thresholds;
- mobile edit-layout detection;
- mobile edit row placement;
- mobile task-card click behavior;
- task-card long-press behavior.

Mobile editing and focus behavior are documented in
`docs/mobile-focus-system.md`.

### Reminder Ownership

Reminder responsibilities are intentionally divided:

| Owner | Responsibility |
| --- | --- |
| `useTaskDetailResources` | Persisted reminder records, reminder form draft, create/delete operations. |
| `App.tsx` | Polling, due-reminder detection, duplicate suppression, toast queue, dismissal, and snoozing. |
| `ToastList` | Toast presentation and confirmation-toast auto-dismiss timers. |

`App.tsx` uses the reminder hook's exposed `setReminders` setter after snoozing
because snoozing crosses the persisted reminder and transient toast domains.

### Focus Ownership

`App.tsx` owns:

- global keyboard shortcuts;
- Escape priority ordering;
- modal and popover focus restoration;
- outside-click coordination;
- edit-entry viewport preparation;
- iOS text-focus guard;
- visual viewport drift detection and correction.

Focus behavior depends on application-wide overlay state and DOM placement. It
must not be distributed among presentation components without transferring the
entire ownership model.

### Cross-Domain Orchestration Ownership

`App.tsx` owns operations for which no narrower domain has enough context:

- creating a task with recurrence and tags;
- editing a task with tag and recurrence reconciliation;
- completing and replacing a recurring task;
- deleting a task and clearing selection and detail resources;
- deleting catalog entries and reconciling tasks, drafts, and filters;
- opening a task from the calendar;
- transitioning between task panels while flushing autosave.

## Hooks

### `useTaskListViewModel`

Source: `taskmanager-frontend/src/hooks/useTaskListViewModel.ts`

| Category | Details |
| --- | --- |
| Owns | Visible task list, calendar task subset, completed/overdue counts, statistics data, empty-state selection, and interpreted filter values. |
| Does not own | Filter controls, task loading, mutations, selection, calendar-local navigation, or presentation. |
| Dependencies | Task collection, list-control values, and pure filtering/statistics/display utilities. |
| Consumer | `App.tsx`. |

The hook is a derived view model. It does not persist or mutate task state.

### `useBulkSelection`

Source: `taskmanager-frontend/src/hooks/useBulkSelection.ts`

| Category | Details |
| --- | --- |
| Owns | Bulk-mode state, selected task IDs, selection toggling, and selection clearing. |
| Does not own | Task collection, bulk mutations, recurrence-aware completion, or error handling. |
| Dependencies | React state only. |
| Consumer | `App.tsx`. |

Bulk mutations remain in `App.tsx` because completing a selected task may
invoke recurring-task orchestration.

### `useProjectTagCatalog`

Source: `taskmanager-frontend/src/hooks/useProjectTagCatalog.ts`

| Category | Details |
| --- | --- |
| Owns | Project collection, tag collection, new project/tag drafts, catalog loading, catalog creation, deletion, and tag-color updates. |
| Does not own | Task assignments, project/tag filters, dropdown state, focus, inline form placement, or task reconciliation after catalog deletion. |
| Dependencies | Project/tag API functions and the top-level error setter. |
| Consumer | `App.tsx`. |

Catalog mutations update catalog state. `App.tsx` updates tasks and active
draft/filter values after successful catalog mutations because the hook does
not own those domains.

### `useTaskDetailResources`

Source: `taskmanager-frontend/src/hooks/useTaskDetailResources.ts`

| Category | Details |
| --- | --- |
| Owns | Subtasks, notes, reminders, and attachments by task ID; resource-specific drafts; resource loading; and resource-level mutations. |
| Does not own | Selected task, panel visibility, expanded section state, reminder polling, toast delivery, task deletion, task editing, autosave, or panel JSX. |
| Dependencies | Detail-resource APIs, time-mode preference for reminder construction, and the top-level error setter. |
| Consumers | `App.tsx`, with resources and actions passed onward to detail components. |

The hook exposes `setReminders` because application-level snoozing updates
persisted reminder state after changing the reminder through the API.

## Frontend Components

### `Calendar`

Source: `taskmanager-frontend/src/components/Calendar.tsx`

| Category | Details |
| --- | --- |
| Presentation responsibilities | Year, month, week, day, and agenda rendering; task display; calendar navigation controls. |
| Behavioral responsibilities | Calendar-local selected date/view state, picker visibility, and desktop-calendar layout detection. |
| External ownership | Task mutations, mobile-page transitions, selected-task state, and task editing. |

Opening a task delegates to `App.tsx`, which coordinates list visibility,
mobile navigation, and task selection.

### Create-Task Components

Directory: `taskmanager-frontend/src/components/create-task/`

These components render:

- task title and description fields;
- schedule controls;
- recurrence controls;
- selected project and tag chips;
- create-task preview.

They receive draft values and callbacks. Create-draft ownership, dropdown
coordination, and task creation remain in `App.tsx`.

### Task-List Components

Directory: `taskmanager-frontend/src/components/task-list/`

These components render:

- search, filter, sort, and view controls;
- task cards;
- status, project, priority, date, tag, and subtask summaries;
- task action menus;
- empty states, date labels, and completed-task divider.

Task-list components emit user intent through callbacks. They do not mutate
tasks or own status movement, selection, editing, duplication, deletion,
long-press orchestration, or mobile edit placement.

### Detail-Panel Components

Directory: `taskmanager-frontend/src/components/detail-panel/`

These components render:

- detail header and description;
- scheduling and quick-shift controls;
- recurrence and status information;
- subtasks, notes, reminders, and links;
- collapsible section shells and badges.

Selected-task state and task autosave remain in `App.tsx`. Resource collections
and resource-level mutations remain in `useTaskDetailResources`.

### Shared Date and Time Controls

Sources:

- `taskmanager-frontend/src/components/shared/DateTimeRow.tsx`
- `taskmanager-frontend/src/components/shared/TimeSelect.tsx`

These components own internal date/time presentation behavior, including the
active internal time selector and scrolling the selected option into view.

Application-wide floating-control state, focus behavior, and task schedule
ownership remain external. Changes to these controls must account for mobile
focus and dropdown behavior.

### Dialogs and Overlays

Components include:

- `StatusMoveDialog`;
- `StatsModal`;
- `SettingsPanel`;
- `ConfirmDelete`;
- `ToastList`.

These components render overlays, controls, and semantic dialog structure.
`ToastList` owns confirmation-toast auto-dismiss timers. Visibility, Escape
ordering, outside-click behavior, and focus restoration remain in `App.tsx`.

### Inline Forms and Color Picker

Components include:

- `InlineProjectForm`;
- `InlineTagForm`;
- `TagColorPicker`.

These components render bounded form controls and emit submission or selection
intent. Catalog drafts and mutations belong to `useProjectTagCatalog`; form
visibility, placement, and focus coordination belong to `App.tsx`.

## Utilities

Utilities are pure ownership boundaries. They must remain free of API calls,
DOM access, focus handling, and React state.

| Utility | Ownership |
| --- | --- |
| `dateTime.ts` | Local date/time parsing, construction, comparison, and formatting. |
| `taskScheduling.ts` | Start/end schedule construction and default end time. |
| `taskForm.ts` | Time-range validation and 12/24-hour conversion. |
| `taskEditDraft.ts` | Persisted-task to edit-draft conversion. |
| `taskRecurrence.ts` | Next-occurrence and duration-preservation calculations. |
| `taskTimeShift.ts` | Quick hour/day shift calculations. |
| `taskFiltering.ts` | List filtering, tabs, and sorting. |
| `taskStatistics.ts` | Task statistics derivation. |
| `taskDisplayHelpers.ts` | Project/tag lookup and display formatting. |
| `taskDisplay.ts` | Status normalization and compact text. |
| `taskEmptyState.ts` | Empty-state selection. |
| `taskCopyTitle.ts` | Duplicate-title numbering. |
| `taskUtils.ts` | Shared task predicates. |

## Frontend API

Source: `taskmanager-frontend/src/api/tasks.ts`

The frontend API module owns HTTP transport for:

- tasks;
- task status;
- recurrence;
- task/tag associations;
- subtasks;
- notes;
- reminders;
- projects;
- tags;
- attachments.

It does not own application state, retries, orchestration, or error
presentation. Callers update the appropriate owner after a request succeeds.

## Backend Ownership

### Controllers

Controllers own REST shape, request validation, bounded mutation logic, and
response status selection.

| Controller | Owned endpoints and behavior |
| --- | --- |
| `TaskController` | Task CRUD, task ordering/querying, time-range validation, status changes, recurrence-rule management, and task/tag associations. |
| `ProjectController` | Project CRUD. |
| `TagController` | Tag listing, creation, color updates, and deletion. |
| `SubtaskController` | Task-scoped subtask listing/creation and subtask update/status/delete operations. |
| `NoteController` | Task-scoped note listing/creation and note deletion. |
| `ReminderController` | Task-scoped reminder listing/creation and reminder due-date/delete operations. |
| `AttachmentController` | Task-scoped link listing/creation and link deletion. |

### Shared Backend Infrastructure

| Owner | Responsibility |
| --- | --- |
| `ParentTaskGuard` | Requires an existing task before task-associated resources are listed or created. |
| `GlobalExceptionHandler` | Converts validation, integrity, and response-status exceptions into structured responses. |
| `DataInitializer` | Ensures expected status rows exist. |
| `CorsConfig` | Configures accepted browser and Capacitor origins. |

### Repositories

Repositories own persistence access only.

| Repository | Additional query ownership |
| --- | --- |
| `TaskRepository` | Orders tasks by schedule and optionally filters by `userID`. |
| `SubtaskRepository` | Finds subtasks by parent task ID. |
| `NoteRepository` | Finds notes by task ID. |
| `ReminderRepository` | Finds reminders by task ID. |
| `AttachmentRepository` | Finds attachments by task ID. |
| Other repositories | Standard Spring Data JPA CRUD operations. |

Repositories do not coordinate workflows across resources.

### Entities

Entities own persisted field mappings and validation annotations.

| Entity | Main persistence responsibility |
| --- | --- |
| `Task` | Primary task data, schedule, status/project/user/recurrence IDs, priority, and eager tag relationship. |
| `Project` | Project metadata. |
| `Tag` | Tag title, color, and optional user ID. |
| `Status` | Status lookup row. |
| `RecurrenceRule` | Frequency and recurrence start/end metadata. |
| `Subtask` | Task-scoped subtask state and optional schedule. |
| `Note` | Task-scoped note content and timestamp. |
| `Reminder` | Task-scoped due date, message, and notification method. |
| `Attachment` | Task-scoped link and metadata. |

Entities do not own application workflows.

## Mutation Ownership Matrix

| Operation | Primary owner | Supporting owners |
| --- | --- | --- |
| Load tasks | `App.tsx` | Frontend API, `TaskController`, `TaskRepository` |
| Create task | `App.tsx` | Scheduling utilities, frontend API, `TaskController` |
| Edit and autosave task | `App.tsx` | Edit/scheduling utilities, frontend API, `TaskController` |
| Complete recurring task | `App.tsx` | Recurrence utilities, frontend API, `TaskController` |
| Bulk select tasks | `useBulkSelection` | Task-list components |
| Bulk mutate tasks | `App.tsx` | `useBulkSelection`, frontend API |
| Load/mutate detail resources | `useTaskDetailResources` | Frontend API, resource controllers/repositories |
| Load/mutate project/tag catalog | `useProjectTagCatalog` | Frontend API, project/tag controllers |
| Reconcile catalog changes into tasks | `App.tsx` | `useProjectTagCatalog` |
| Derive visible task views | `useTaskListViewModel` | Filtering/statistics utilities |
| Render and navigate calendar | `Calendar` | `App.tsx` handles task opening |
| Poll and snooze reminders | `App.tsx` | `useTaskDetailResources`, `ToastList`, frontend API |
| Global focus and keyboard behavior | `App.tsx` | Presentation components provide refs and structure |

## Protected Ownership Boundaries

The following responsibilities must not be relocated solely for code-size
reduction:

- selected-task ownership;
- task edit-draft ownership;
- task mutation orchestration;
- autosave ownership;
- focus restoration;
- dropdown and outside-click ownership;
- reminder polling and snoozing;
- mobile page, swipe, and edit ownership;
- mobile edit row placement;
- iOS text-focus and `visualViewport` behavior;
- root sizing and scroll ownership;
- `renderInlineEditForm`.

Any change to these boundaries must preserve the complete current behavior and
its related tests.
