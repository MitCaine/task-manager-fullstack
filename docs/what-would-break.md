# What Would Break

## Purpose

This guide documents current architectural constraints by examining changes
that can look reasonable in isolation but conflict with existing ownership,
state, workflow, lifecycle, or platform assumptions.

The entries describe the current system only. Affected tests are behavioral
evidence for the constraint; a test can remain green while an untested part of
the same architectural assumption breaks.

# Proposed Change

Replace `App.tsx` orchestration with independent feature hooks.

## Why It Looks Attractive

`App.tsx` is large, and feature hooks can make task creation, editing,
recurrence, deletion, and mobile behavior appear easier to navigate.

## What Would Break

The proposed hooks would need shared access to the primary task collection,
selected task, drafts, filters, focus, mobile placement, and several API
domains. Cross-domain mutation ordering would move behind callbacks without
creating a new complete owner. Task creation, editing, recurring replacement,
catalog reconciliation, and task opening could acquire different task
authorities and failure semantics.

## Affected State Categories

- Persisted state: primary task working copy, tags, and recurrence.
- Draft state: create and shared edit drafts.
- Presentation-local state: filters, overlays, and mobile page.
- Transient state: selection, errors, autosave, and workflow progress.
- Platform state: focus, DOM placement, scroll, and viewport conditions.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-002: Shared Edit Draft
- ADR-003: Autosave Ownership
- ADR-006: Reminder Ownership Split
- ADR-007: Recurring Task Replacement

## Affected Sequence Diagrams

- Create Task
- Edit Task and Autosave
- Complete Recurring Task
- Bulk Complete Recurring Tasks
- Reminder Snooze
- Delete Tag and Reconcile Tasks
- Open Task From Calendar
- Mobile Edit Entry and Focus Protection

## Affected Tests

- Broad orchestration cases in `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/api/tasks.test.ts`

# Proposed Change

Give the list, calendar, and detail panel separate task collections.

## Why It Looks Attractive

Each surface could update its own records without receiving the primary task
collection and reconciliation callbacks from `App.tsx`.

## What Would Break

The frontend would gain competing working-copy authorities for persisted
tasks. A successful mutation in one surface could leave the others stale.
Selection, recurrence replacement, deletion, filtering, counts, statistics,
and calendar display would no longer reconcile from one source.

## Affected State Categories

- Persisted state: primary task working copy.
- Derived state: visible tasks, calendar tasks, counts, and statistics.
- Transient state: selected task.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-007: Recurring Task Replacement

## Affected Sequence Diagrams

- Complete Recurring Task
- Open Task From Calendar
- Edit Task and Autosave

## Affected Tests

- `shows task titles after loading`
- `clicking task count badge shows all tasks and updates active styling`
- `completing a recurring task with end time creates the next occurrence with matching duration`
- `taskmanager-frontend/src/utils/taskFiltering.test.ts`
- `taskmanager-frontend/src/utils/taskStatistics.test.ts`

# Proposed Change

Let task-list, calendar, or detail components call task APIs directly.

## Why It Looks Attractive

The mutation call would sit next to the button or field that initiates it and
could reduce callback props.

## What Would Break

Presentation components do not own the primary task collection or the
cross-domain reconciliation after mutations. Direct calls could update the
backend without updating selection, tags, recurrence, filters, detail
resources, scrolling, or local task state. Error presentation and mutation
ordering would also become distributed.

## Affected State Categories

- Persisted state: tasks and related records.
- Transient state: selection, loading, errors, and mutation progress.
- Presentation-local state: the initiating surface.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner

## Affected Sequence Diagrams

- Create Task
- Edit Task and Autosave
- Complete Recurring Task
- Open Task From Calendar

## Affected Tests

- `clicking Add calls createTask and appends task to list`
- `saving mobile edit restores the updated task card`
- `task move menu updates status`
- `clicking delete button then confirming removes the task`

# Proposed Change

Merge the create-task draft and edit-task draft.

## Why It Looks Attractive

Create and edit forms expose many of the same fields and reuse presentation
controls.

## What Would Break

The drafts have different initialization, reset, validation, save, and
selection lifecycles. Opening an editor could overwrite pending create input;
successful creation could clear an active edit; switching tasks could populate
the create form with persisted task values. Create dropdown behavior and
autosave would act on the same field authority.

## Affected State Categories

- Draft state: create-task draft and shared edit draft.
- Transient state: selected task and active editor identity.
- Presentation-local state: create and edit controls.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-002: Shared Edit Draft
- ADR-003: Autosave Ownership

## Affected Sequence Diagrams

- Create Task
- Edit Task and Autosave
- Mobile Edit Entry and Focus Protection

## Affected Tests

- `title input is empty on initial render`
- `clicking Add calls createTask and appends task to list`
- `inline edit form hydrates and saves changed project and tags`
- `saving mobile edit restores the updated task card`

# Proposed Change

Give inline, mobile, and detail editing separate drafts.

## Why It Looks Attractive

Each presentation could own simpler local form state and avoid receiving the
complete shared edit draft.

## What Would Break

The same task could have multiple pending versions. Switching presentations
or unmounting an editor could lose changes. Autosave could persist an older
draft, while project, tag, recurrence, and schedule values diverge across
surfaces. Panel close and task switch would no longer have one draft to flush.

## Affected State Categories

- Draft state: shared edit draft.
- Transient state: active editor, selected task, and autosave timer.
- Platform state: mobile edit DOM and focus lifecycle.

## Affected ADRs

- ADR-002: Shared Edit Draft
- ADR-003: Autosave Ownership
- ADR-004: Mobile Edit Row
- ADR-005: iOS Focus Guard

## Affected Sequence Diagrams

- Edit Task and Autosave
- Mobile Edit Entry and Focus Protection

## Affected Tests

- `inline edit form hydrates and saves changed project and tags`
- `saving mobile edit restores the updated task card`
- `mobile edit panel exposes recurrence project and tag controls`
- `mobile text focus guard covers inline edit title and description fields`

# Proposed Change

Move autosave into a standalone timing hook.

## Why It Looks Attractive

Autosave resembles a reusable debounce concern and could reduce timer and ref
code in `App.tsx`.

## What Would Break

The timer is only one part of autosave. A standalone hook would still need the
current selected task, latest shared draft, complete save function, primary
task setter, tag and recurrence reconciliation, and panel close/switch
signals. Without those lifecycles, delayed work could save stale values or the
wrong task, compete with another timer, or fail to flush.

## Affected State Categories

- Draft state: shared edit draft.
- Persisted state: task, tags, and recurrence.
- Transient state: autosave timer, refs, and selected task.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-002: Shared Edit Draft
- ADR-003: Autosave Ownership

## Affected Sequence Diagrams

- Edit Task and Autosave

## Affected Tests

- `inline edit form hydrates and saves changed project and tags`
- `inline edit can change recurrence`
- `inline edit can remove recurrence`
- `editing a task and clearing end time sends null endDateTimeScheduled`

# Proposed Change

Autosave only the base task record.

## Why It Looks Attractive

One `updateTask` request is simpler than coordinating tag associations,
recurrence, and a task refresh.

## What Would Break

The visible edit experience includes project, tags, recurrence, and schedule.
The base task could save while tags or recurrence remain stale, making the
rendered task disagree with the edit draft. Explicit save and autosave would
also have different semantics.

## Affected State Categories

- Persisted state: task, tag associations, and recurrence.
- Draft state: shared edit draft.
- Transient state: pending save workflow.

## Affected ADRs

- ADR-002: Shared Edit Draft
- ADR-003: Autosave Ownership

## Affected Sequence Diagrams

- Edit Task and Autosave

## Affected Tests

- `inline edit form hydrates and saves changed project and tags`
- `inline edit can change recurrence`
- `inline edit can remove recurrence`
- `taskmanager-frontend/src/api/tasks.test.ts`

# Proposed Change

Stop flushing pending autosave when a panel closes or the selected task changes.

## Why It Looks Attractive

Closing a panel could simply cancel timers and selection transitions could
become faster and easier to reason about.

## What Would Break

The shared edit draft can contain valid unsaved user input when the panel
closes or another task opens. Cancelling the timer would discard that input.
Allowing it to fire later without coordinated selection could update the
wrong task or reconcile state after its panel lifecycle has ended.

## Affected State Categories

- Draft state: shared edit draft.
- Transient state: selected task, panel lifecycle, autosave timer, and refs.
- Persisted state: edited task and associations.

## Affected ADRs

- ADR-002: Shared Edit Draft
- ADR-003: Autosave Ownership

## Affected Sequence Diagrams

- Edit Task and Autosave
- Open Task From Calendar

## Affected Tests

- Edit and selection cases in `taskmanager-frontend/src/App.test.tsx`
- `desktop task selection highlights the task without opening competing edit panels`

# Proposed Change

Move recurrence mutation and replacement logic into recurrence controls.

## Why It Looks Attractive

`RecurrenceControl` and `DetailRepeatRow` render recurrence choices and appear
to be natural feature owners.

## What Would Break

Those components do not own task creation, task deletion, primary task state,
selection, bulk completion, tags, scrolling, or highlighting. They could set a
frequency but could not complete the replacement lifecycle or reconcile all
edit and create paths. Presentation would become a mutation authority.

## Affected State Categories

- Persisted state: tasks, recurrence rules, and tags.
- Draft state: create and edit recurrence selections.
- Derived state: next occurrence and preserved duration.
- Transient state: replacement workflow, selection, and highlight.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-007: Recurring Task Replacement

## Affected Sequence Diagrams

- Create Task
- Edit Task and Autosave
- Complete Recurring Task
- Bulk Complete Recurring Tasks

## Affected Tests

- `create task can select daily recurrence and saves it`
- `inline edit can change recurrence`
- `completing a recurring task with end time creates the next occurrence with matching duration`
- `bulk mark done on a recurring task generates the next occurrence`

# Proposed Change

Complete an active recurring task by marking it done.

## Why It Looks Attractive

It would make recurring and non-recurring completion use the same status patch
endpoint.

## What Would Break

The current recurrence model treats active completion as replacement. Marking
the task done would not generate the next actionable occurrence. It would
change individual and bulk behavior, stop recurrence, and bypass metadata,
tag, duration, selection, scroll, and highlight handling.

## Affected State Categories

- Persisted state: task status and recurrence.
- Derived state: next schedule and duration.
- Transient state: replacement, selection, scroll, and highlight.

## Affected ADRs

- ADR-007: Recurring Task Replacement
- ADR-001: App.tsx Orchestration Owner

## Affected Sequence Diagrams

- Complete Recurring Task
- Bulk Complete Recurring Tasks

## Affected Tests

- `completing a recurring task with end time creates the next occurrence with matching duration`
- `bulk mark done on a recurring task generates the next occurrence`
- `bulk mark done on mixed recurring and non-recurring tasks handles both paths`
- `taskmanager-frontend/src/utils/taskRecurrence.test.ts`

# Proposed Change

Advance the existing recurring task in place instead of replacing it.

## Why It Looks Attractive

Updating one record avoids the create, associate, delete, and local
replacement sequence.

## What Would Break

Task identity and completion semantics would change. The current workflow
creates a new task, copies metadata and tags, attaches recurrence, deletes the
old task, and replaces local state. In-place mutation would invalidate
selection and highlight assumptions and would no longer match current
individual and bulk completion behavior.

## Affected State Categories

- Persisted state: task identity, schedule, tags, and recurrence.
- Derived state: next schedule and duration.
- Transient state: selection, replacement, scroll, and highlight.

## Affected ADRs

- ADR-007: Recurring Task Replacement

## Affected Sequence Diagrams

- Complete Recurring Task
- Bulk Complete Recurring Tasks

## Affected Tests

- `completing a recurring task with end time creates the next occurrence with matching duration`
- `completed recurring task checkbox toggles back to active without generating a next occurrence`
- `bulk mark done probes recurrence when selected task data has no recurrenceRuleID`

# Proposed Change

Move bulk task mutations into `useBulkSelection`.

## Why It Looks Attractive

Selection and bulk action controls are closely related, so one hook could
appear to own the whole feature.

## What Would Break

`useBulkSelection` owns only transient selection state. Bulk completion can
invoke recurring replacement and must update primary tasks, errors, tags,
recurrence, and rendered state. Giving the hook mutation ownership would make
it depend on unrelated application domains and blur the boundary between
selection and task orchestration.

## Affected State Categories

- Transient state: bulk mode and selected IDs.
- Persisted state: task status, deletion, tags, and recurrence.
- Derived state: visible tasks after mutation.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-007: Recurring Task Replacement

## Affected Sequence Diagrams

- Bulk Complete Recurring Tasks
- Complete Recurring Task

## Affected Tests

- `"Mark done" in bulk bar calls patchTaskStatus for each selected task`
- `bulk mark done on a recurring task generates the next occurrence`
- `bulk mark done on mixed recurring and non-recurring tasks handles both paths`
- `"Delete" in bulk bar calls deleteTask for each selected task`

# Proposed Change

Move tag-deletion reconciliation into `useProjectTagCatalog`.

## Why It Looks Attractive

The hook already owns tag deletion and the tag catalog, so removing deleted
tag references can look like catalog cleanup.

## What Would Break

The hook does not own tasks, create/edit drafts, active tag filters, dropdown
placement, or primary task reconciliation. It could remove the catalog record
while leaving stale tag IDs in those other authorities, or it would need broad
access that destroys its bounded catalog ownership.

## Affected State Categories

- Persisted state: tag catalog and task/tag associations.
- Draft state: selected create/edit tag IDs.
- Presentation-local state: active tag filter and dropdown state.
- Derived state: filtered and displayed tasks.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner

## Affected Sequence Diagrams

- Delete Tag and Reconcile Tasks
- Create Task
- Edit Task and Autosave

## Affected Tests

- `inline edit form hydrates and saves changed project and tags`
- `creating a new tag from inline edit applies it on save`
- `task tag chips keep user tag colors as accents instead of foreground text color`
- Tag cases in `taskmanager-frontend/src/api/tasks.test.ts`

# Proposed Change

Move project and tag catalog ownership back into `App.tsx`.

## Why It Looks Attractive

`App.tsx` already consumes catalog records for task forms, filters, and
reconciliation, so colocating all catalog state can reduce hook calls.

## What Would Break

The existing coherent catalog lifecycle would be mixed with task
orchestration, focus, dropdowns, filters, and mobile behavior. Catalog loading,
creation drafts, deletion, and color updates would lose their bounded owner
and become harder to distinguish from cross-domain reconciliation.

## Affected State Categories

- Persisted state: project and tag catalogs.
- Draft state: new project/tag fields.
- Presentation-local state: catalog forms and color picker.
- Transient state: catalog loading and errors.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner

## Affected Sequence Diagrams

- Create Task
- Edit Task and Autosave
- Delete Tag and Reconcile Tasks

## Affected Tests

- `creating a new project from inline edit applies it on save`
- `creating a new tag from inline edit applies it on save`
- Project and tag cases in `taskmanager-frontend/src/api/tasks.test.ts`

# Proposed Change

Eliminate `useTaskDetailResources` and store all detail resources in `App.tsx`.

## Why It Looks Attractive

Task selection and the detail panel are already coordinated by `App.tsx`, and
one owner could appear simpler than passing hook state and actions onward.

## What Would Break

Subtasks, notes, reminders, attachments, their task-keyed caches, drafts,
loading, and resource CRUD form a bounded lifecycle. Folding them into
`App.tsx` would mix coherent resource ownership with task mutations, selected
task, autosave, focus, reminders, and mobile behavior. The distinction between
resource CRUD and cross-domain coordination would disappear.

## Affected State Categories

- Persisted state: subtasks, notes, reminders, and attachments.
- Draft state: resource creation and edit drafts.
- Transient state: resource loading and active subtask edit.
- Presentation-local state: expanded detail sections.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-006: Reminder Ownership Split

## Affected Sequence Diagrams

- Reminder Snooze
- Open Task From Calendar
- Mobile Edit Entry and Focus Protection

## Affected Tests

- Detail-loading and selection cases in `taskmanager-frontend/src/App.test.tsx`
- Detail-resource cases in `taskmanager-frontend/src/api/tasks.test.ts`

# Proposed Change

Let detail-panel components own detail-resource records and CRUD.

## Why It Looks Attractive

Notes, subtasks, reminders, and links are rendered in the detail panel, so
local component state can look like the closest ownership boundary.

## What Would Break

Component unmounts and section collapse could discard drafts or cached
records. Multiple detail surfaces could acquire independent copies. Resource
loading, parent-task deletion cleanup, errors, and reminder snoozing would no
longer reconcile through one task-keyed resource owner.

## Affected State Categories

- Persisted state: detail resources.
- Draft state: detail-resource forms.
- Transient state: resource loading and active edits.
- Presentation-local state: expanded sections.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-006: Reminder Ownership Split

## Affected Sequence Diagrams

- Reminder Snooze
- Mobile Edit Entry and Focus Protection

## Affected Tests

- Detail-resource transport cases in `taskmanager-frontend/src/api/tasks.test.ts`
- Mobile panel and selection cases in `taskmanager-frontend/src/App.test.tsx`

# Proposed Change

Move reminder polling and delivery into `useTaskDetailResources`.

## Why It Looks Attractive

The hook already owns persisted reminders and reminder CRUD.

## What Would Break

Polling and delivery follow the mounted application lifecycle, not one
selected task or resource form. The hook would acquire global timers,
duplicate suppression, toast queues, dismissal, and browser notification
concerns. Persisted reminder records and transient delivery state would become
one ambiguous authority.

## Affected State Categories

- Persisted state: reminder records.
- Draft state: reminder form.
- Transient state: polling, fired IDs, and toast queue.
- Platform state: timers and notification capability.

## Affected ADRs

- ADR-006: Reminder Ownership Split
- ADR-001: App.tsx Orchestration Owner

## Affected Sequence Diagrams

- Reminder Snooze

## Affected Tests

- Reminder cases in `taskmanager-frontend/src/api/tasks.test.ts`
- `src/test/java/com/example/taskmanager/ReminderControllerTest.java`
- Toast lifecycle cases in `taskmanager-frontend/src/App.test.tsx`

# Proposed Change

Let `ToastList` snooze reminders and update reminder records.

## Why It Looks Attractive

The Snooze action is rendered inside the toast, so handling it there reduces
the callback path.

## What Would Break

`ToastList` owns presentation and confirmation auto-dismiss timers, not
persisted reminder state. It cannot reconcile the hook-owned reminder
collection or application-owned fired-reminder suppression without becoming a
cross-domain mutation owner. Toast presentation and reminder persistence would
become coupled.

## Affected State Categories

- Persisted state: reminder due date.
- Transient state: toast queue and fired-reminder suppression.
- Presentation-local state: toast rendering.

## Affected ADRs

- ADR-006: Reminder Ownership Split

## Affected Sequence Diagrams

- Reminder Snooze

## Affected Tests

- Reminder transport cases in `taskmanager-frontend/src/api/tasks.test.ts`
- `src/test/java/com/example/taskmanager/ReminderControllerTest.java`
- `task-created confirmation toast auto-dismisses`

# Proposed Change

Store reminder toasts as persisted reminder fields.

## Why It Looks Attractive

Reminder records and visible reminder notifications are related, and
persistence could appear to prevent notifications from being lost.

## What Would Break

Reminder records and toast delivery have different identities and lifecycles.
Dismissal, duplicate suppression, and running-session delivery would become
durable domain mutations. Confirmation-toast behavior could be confused with
reminder persistence, and snoozed record state could diverge from persisted
toast state.

## Affected State Categories

- Persisted state: reminder records.
- Transient state: toast queue and fired-reminder suppression.
- Platform state: timers and notification capability.

## Affected ADRs

- ADR-006: Reminder Ownership Split

## Affected Sequence Diagrams

- Reminder Snooze

## Affected Tests

- Reminder API and controller tests
- `clicking Add shows a non-disruptive task-created toast`
- `task-created confirmation toast auto-dismisses`

# Proposed Change

Store filtered, sorted, calendar, count, or statistics results as independent state.

## Why It Looks Attractive

Precomputed views can look cheaper to render and easier for each surface to
consume.

## What Would Break

Derived values would become second authorities requiring manual updates after
every task mutation and control change. List, calendar, counts, statistics,
and empty states could drift from the primary tasks or from each other.
Resetting filters would no longer naturally recompute the current result.

## Affected State Categories

- Derived state: visible tasks, calendar tasks, counts, statistics, and empty
  states.
- Persisted state: primary task working copy.
- Presentation-local state: filters, sort, tabs, and hide-completed controls.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner

## Affected Sequence Diagrams

- Open Task From Calendar
- Complete Recurring Task
- Bulk Complete Recurring Tasks

## Affected Tests

- `taskmanager-frontend/src/utils/taskFiltering.test.ts`
- `taskmanager-frontend/src/utils/taskStatistics.test.ts`
- `taskmanager-frontend/src/utils/taskEmptyState.test.ts`
- Task count and filter cases in `taskmanager-frontend/src/App.test.tsx`

# Proposed Change

Let `Calendar` own and mutate its task subset.

## Why It Looks Attractive

The calendar already owns navigation, picker state, grouping, and calendar
presentation.

## What Would Break

Calendar tasks are derived from the primary task collection. Mutating the
subset would create a divergent persisted-state authority and bypass list,
detail, recurrence, selection, and filter reconciliation. Opening a task from
the calendar also requires mobile page and selected-task coordination that
the component does not own.

## Affected State Categories

- Derived state: calendar task subset and grouped entries.
- Persisted state: primary task working copy.
- Presentation-local state: calendar navigation.
- Transient state: selected task and opening workflow.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner

## Affected Sequence Diagrams

- Open Task From Calendar

## Affected Tests

- `taskmanager-frontend/src/components/Calendar.test.tsx`
- `swipe starting on the calendar background changes back to task list`
- `swipe starting on a calendar navigation button does not change mobile view`

# Proposed Change

Move selected-task ownership into the detail panel.

## Why It Looks Attractive

Selection primarily determines which task the detail panel renders.

## What Would Break

Selected task is transient workflow state, not panel-local state. It
coordinates detail-resource loading, autosave flush, task deletion, calendar
opening, mobile page changes, editor identity, focus, and panel close/switch
behavior. A panel-local selection would disappear on unmount and could not
coordinate those external lifecycles.

## Affected State Categories

- Transient state: selected task and active editor.
- Draft state: shared edit draft.
- Persisted state: selected task and detail-resource working copies.
- Platform state: focus restoration and mobile placement.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-002: Shared Edit Draft
- ADR-003: Autosave Ownership

## Affected Sequence Diagrams

- Edit Task and Autosave
- Open Task From Calendar
- Mobile Edit Entry and Focus Protection

## Affected Tests

- `desktop task selection highlights the task without opening competing edit panels`
- `Escape closes settings without closing the task detail panel`
- Mobile edit entry and save cases in `taskmanager-frontend/src/App.test.tsx`

# Proposed Change

Move every dropdown, menu, dialog, and overlay's visibility into its component.

## Why It Looks Attractive

Visibility is presentation-local state, and local ownership can reduce
top-level props.

## What Would Break

Several surfaces participate in application-wide outside-click handling,
conflict closing, Escape priority, placement, and focus restoration. Isolated
components could leave multiple layers active, close in the wrong order,
restore focus over a newer interaction, or require duplicated global
listeners.

## Affected State Categories

- Presentation-local state: dropdown, menu, dialog, and overlay visibility.
- Transient state: close targets and focus restoration.
- Platform state: active element, refs, keyboard, and outside click.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-005: iOS Focus Guard

## Affected Sequence Diagrams

- Create Task
- Edit Task and Autosave
- Mobile Edit Entry and Focus Protection

## Affected Tests

- Create-control switching cases in `taskmanager-frontend/src/App.test.tsx`
- `Escape closes settings without closing the task detail panel`
- `opening the task move menu shows alternate statuses`
- Focus transition cases in `taskmanager-frontend/src/App.test.tsx`

# Proposed Change

Make the frontend API module own application state and workflow retries.

## Why It Looks Attractive

The API module sees every request and response and could centralize updates,
errors, retries, and reconciliation.

## What Would Break

The transport boundary does not know which frontend owner holds tasks,
catalogs, resources, drafts, selection, or toasts. It also cannot observe
rendered placement, panel lifecycle, or mutation intent. State updates would
become hidden side effects, and multi-request workflow ordering would no
longer be visible in the orchestration owner.

## Affected State Categories

- Persisted state: all frontend working copies.
- Draft state: mutation inputs.
- Transient state: loading, errors, retries, and workflow progress.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner

## Affected Sequence Diagrams

- Create Task
- Edit Task and Autosave
- Complete Recurring Task
- Bulk Complete Recurring Tasks
- Reminder Snooze
- Delete Tag and Reconcile Tasks
- Open Task From Calendar
- Mobile Edit Entry and Focus Protection

## Affected Tests

- `taskmanager-frontend/src/api/tasks.test.ts`
- Broad mutation and error cases in `taskmanager-frontend/src/App.test.tsx`

# Proposed Change

Add a service class for every backend controller without transferring workflow ownership.

## Why It Looks Attractive

A controller/service/repository shape is conventional and can make
controllers shorter.

## What Would Break

Bounded validation and mutation logic would be split across nominal layers
without a new coherent business owner or transaction boundary. Request paths
would become harder to trace, mapping and validation could duplicate, and
maintainers would need to search multiple files for the same endpoint
behavior.

## Affected State Categories

- Persisted state: backend records.
- Transient state: request validation and error responses.

## Affected ADRs

- ADR-008: No Backend Service Layer

## Affected Sequence Diagrams

- Create Task
- Edit Task and Autosave
- Complete Recurring Task
- Bulk Complete Recurring Tasks
- Reminder Snooze
- Delete Tag and Reconcile Tasks
- Open Task From Calendar
- Mobile Edit Entry and Focus Protection

## Affected Tests

- All backend controller tests
- `taskmanager-frontend/src/api/tasks.test.ts`

# Proposed Change

Move multi-resource workflows into repositories.

## Why It Looks Attractive

Repositories already access persistence, so coordinating related saves there
can appear to reduce controller or frontend complexity.

## What Would Break

Repositories currently own persistence access only. They do not own HTTP
responses, frontend working-copy reconciliation, selected task, drafts,
toasts, scrolling, or cross-request ordering. Product workflows would become
hidden inside data-access interfaces while non-persistence consequences
remained elsewhere.

## Affected State Categories

- Persisted state: tasks, tags, recurrence, and detail resources.
- Transient state: request and frontend workflow progress.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-007: Recurring Task Replacement
- ADR-008: No Backend Service Layer

## Affected Sequence Diagrams

- Create Task
- Edit Task and Autosave
- Complete Recurring Task
- Bulk Complete Recurring Tasks

## Affected Tests

- Backend controller and repository tests
- Recurrence and orchestration cases in `taskmanager-frontend/src/App.test.tsx`

# Proposed Change

Move the mobile editor back inside the normal task-card row.

## Why It Looks Attractive

Desktop editing already renders inline, and shared markup could reduce
conditional rendering and CSS.

## What Would Break

The dedicated `.mobile-edit-row` and `.mobile-edit-panel` isolate edit
placement from the normal task-card flow while preserving task-list scroll
ownership. Moving it can reintroduce task-list repositioning, caret-driven
layout movement, viewport drift, white gaps, wrong focus scopes, and unstable
keyboard interaction.

## Affected State Categories

- Draft state: shared edit draft.
- Presentation-local state: mobile edit placement.
- Transient state: selected task and active editor.
- Platform state: DOM placement, focus scope, scroll, keyboard, and viewport.

## Affected ADRs

- ADR-002: Shared Edit Draft
- ADR-004: Mobile Edit Row
- ADR-005: iOS Focus Guard

## Affected Sequence Diagrams

- Mobile Edit Entry and Focus Protection
- Edit Task and Autosave

## Affected Tests

- `mobile edit renders in a stable panel outside the task list item flow`
- `mobile edit panel replaces the edited task item in the task list context`
- `mobile edit entry does not reposition the task list`
- `mobile edit panel keeps the edit text focus scope separate from the list card`

# Proposed Change

Make the mobile edit panel sticky or independently scrollable.

## Why It Looks Attractive

A long edit form could remain visible and scroll within a bounded panel.

## What Would Break

The task list is the single mobile task-page vertical scroll owner. Sticky
positioning or `overflow-y: auto` would create competing scroll behavior and
change caret auto-scroll, touchmove, textarea overscroll, focus correction,
and visual viewport assumptions.

## Affected State Categories

- Presentation-local state: mobile edit panel.
- Platform state: scroll ownership, touch behavior, focus, and viewport.

## Affected ADRs

- ADR-004: Mobile Edit Row
- ADR-005: iOS Focus Guard

## Affected Sequence Diagrams

- Mobile Edit Entry and Focus Protection

## Affected Tests

- `mobile edit panel is not sticky or an independent scroll container`
- `mobile task list remains the scroll owner for mobile edit`
- `mobile text focus touch guard prevents textarea overscroll at the top and bottom`

# Proposed Change

Render the mobile edit description as a textarea like desktop editing.

## Why It Looks Attractive

The same field type would support multiline editing and reduce
presentation-specific behavior.

## What Would Break

Mobile edit intentionally avoids another internal scroll surface. A textarea
would add bounded-scroll and overscroll behavior inside the protected task-list
flow, changing touch guards, caret scrolling, visual viewport movement, and
the mobile edit interaction contract.

## Affected State Categories

- Draft state: edit description.
- Presentation-local state: mobile edit control type.
- Platform state: textarea scrolling, touch, focus, and viewport.

## Affected ADRs

- ADR-004: Mobile Edit Row
- ADR-005: iOS Focus Guard

## Affected Sequence Diagrams

- Mobile Edit Entry and Focus Protection

## Affected Tests

- `mobile edit description renders title-style input by default`
- `create description remains textarea with description class on mobile`
- `desktop edit description remains textarea`
- `mobile edit title-style description keeps save semantics`

# Proposed Change

Remove `visualViewport` monitoring and rely on document scroll positions.

## Why It Looks Attractive

Document scroll correction is simpler, broadly supported, and can report zero
after focus or keyboard movement.

## What Would Break

WKWebView can leave the visible viewport offset while document scroll is
already zero. The guard would stop detecting that failure state, allowing
shifted content and white gaps after keyboard interaction. Scroll evidence
would incorrectly report a stable application shell. For mobile inline edit
and catalog rename fields, direct native focus can also pull the page before
post-focus cleanup runs; the shared proxy-input assist is the confirmed
pre-focus fix for that path.

## Affected State Categories

- Platform state: visual viewport offsets, document scroll, focus, and
  keyboard mode.

## Affected ADRs

- ADR-005: iOS Focus Guard

## Affected Sequence Diagrams

- Mobile Edit Entry and Focus Protection

## Affected Tests

- `visual viewport drift is detected after document scroll has been corrected`
- `mobile edit text fields use proxy focus assist before native focus`
- `catalog rename touch focus uses a proxy input and leaves the real input in the row`
- `text focus correction summary emits scalar scroll and viewport evidence behind debug flag`
- Mobile text-focus correction cases in `taskmanager-frontend/src/App.test.tsx`

# Proposed Change

Remove repeated asynchronous scroll corrections and focus sequence tracking.

## Why It Looks Attractive

Repeated animation-frame and timeout work can look redundant after an
immediate correction, and sequence counters add complexity.

## What Would Break

WebKit can move the viewport after the initiating event. Older blur or
scheduled callbacks can also run after a newer field gains focus. Removing the
repeated corrections or sequence protection could let stale work disable the
current guard or leave late viewport drift uncorrected.

## Affected State Categories

- Transient state: scheduled correction work.
- Platform state: focus sequence, active element, scroll, and viewport.

## Affected ADRs

- ADR-005: iOS Focus Guard

## Affected Sequence Diagrams

- Mobile Edit Entry and Focus Protection

## Affected Tests

- `stale edit description blur cannot disable create title scroll correction`
- `delayed blur cannot disable keyboard text mode while another app text field is active`
- `scroll correction follows the current active text field after stale previous blur`
- `edit-entry reset does not clear the active text guard after focusin`

# Proposed Change

Move focus protection into individual inputs and remove shared focus scopes.

## Why It Looks Attractive

Each input could handle its own focus and blur events, reducing global
listeners and `data-text-focus-scope` attributes.

## What Would Break

Individual inputs cannot observe transitions among search, create, inline,
mobile, and detail surfaces, temporary focus through `document.body`, or an
unmounted previous field. Removing scopes would make active editing surfaces
ambiguous and could let stale blur events disable protection for a newer
field.

## Affected State Categories

- Platform state: focus transitions, active element, DOM scopes, scroll, and
  viewport.
- Transient state: active editor and scheduled correction work.

## Affected ADRs

- ADR-004: Mobile Edit Row
- ADR-005: iOS Focus Guard

## Affected Sequence Diagrams

- Mobile Edit Entry and Focus Protection

## Affected Tests

- `mobile edit panel keeps the edit text focus scope separate from the list card`
- `search to inline edit title keeps text mode active and corrects document scroll`
- `opening inline edit after search blur does not inherit the task list text scope`
- Repeated and stale focus-transition cases in `taskmanager-frontend/src/App.test.tsx`

# Proposed Change

Change root, pager, mobile-page, list, or calendar overflow and sizing independently.

## Why It Looks Attractive

A local CSS adjustment can appear limited to layout, spacing, or available
height on one surface.

## What Would Break

These containers jointly define fixed shell sizing and intended vertical
scroll owners. An isolated overflow or height change can move scrolling to the
document, pager, page, or edit panel, invalidating focus correction and touch
guards and allowing keyboard-driven viewport drift.

## Affected State Categories

- Presentation-local state: mobile page and calendar presentation.
- Platform state: sizing, overflow, scroll ownership, keyboard, and viewport.

## Affected ADRs

- ADR-004: Mobile Edit Row
- ADR-005: iOS Focus Guard

## Affected Sequence Diagrams

- Open Task From Calendar
- Mobile Edit Entry and Focus Protection

## Affected Tests

- `mobile task list remains the scroll owner for mobile edit`
- `mobile edit panel is not sticky or an independent scroll container`
- Calendar desktop-layout cases in `taskmanager-frontend/src/components/Calendar.test.tsx`
- Mobile focus and swipe cases in `taskmanager-frontend/src/App.test.tsx`

# Proposed Change

Allow mobile page swipes to begin from controls, task cards, menus, or editors.

## Why It Looks Attractive

Starting a swipe anywhere makes page navigation easier to trigger and reduces
target-exclusion logic.

## What Would Break

Horizontal paging would compete with text selection, date/time controls,
calendar navigation, action menus, task-card interactions, editing, scrolling,
and long press. A user gesture intended for a control could navigate to
another page and disrupt focus or pending workflow state.

## Affected State Categories

- Presentation-local state: active mobile page.
- Transient state: swipe coordinates, long press, selected task, and active
  editor.
- Platform state: touch targets, pointer conditions, focus, and scroll.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-004: Mobile Edit Row
- ADR-005: iOS Focus Guard

## Affected Sequence Diagrams

- Open Task From Calendar
- Mobile Edit Entry and Focus Protection

## Affected Tests

- `swipe starting inside the title input does not change mobile view`
- `swipe starting inside a time dropdown does not change mobile view`
- `swipe starting on a calendar navigation button does not change mobile view`
- `swipe starting inside a task action menu does not change mobile view`

# Proposed Change

Allow touchmove outside the active text field while mobile keyboard mode is active.

## Why It Looks Attractive

Removing the touch guard would simplify event handling and permit more natural
page gestures during text entry.

## What Would Break

Outside movement can drag the visual viewport rather than an intended scroll
owner. Textarea movement at its boundaries can leak into the page. The
document may remain at zero while the visible WKWebView shifts, producing the
failure the focus system guards against.

## Affected State Categories

- Platform state: touch, active field, textarea scroll bounds, visual
  viewport, and document scroll.

## Affected ADRs

- ADR-005: iOS Focus Guard

## Affected Sequence Diagrams

- Mobile Edit Entry and Focus Protection

## Affected Tests

- `mobile text focus prevents touchmove outside the active text field by default`
- `mobile text focus touch guard prevents active textarea touchmove when it has no internal scroll`
- `mobile text focus touch guard allows active textarea scrolling within bounds`
- `mobile text focus touch guard prevents textarea overscroll at the top and bottom`

# Proposed Change

Change Escape ordering or restore focus unconditionally after overlays close.

## Why It Looks Attractive

Each overlay could close itself and return focus to its trigger without
consulting other active layers or the current active element.

## What Would Break

Escape could close a lower-priority surface while a dialog remains active.
Unconditional restoration could steal focus from a newer interaction or a
text field, re-trigger mobile keyboard and viewport behavior, or target a
disconnected element. Overlay visibility and focus lifecycle would diverge.

## Affected State Categories

- Presentation-local state: dialogs, settings, menus, and selected panel.
- Transient state: remembered focus targets and active workflow layers.
- Platform state: active element, keyboard, connected DOM nodes, and focus.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-005: iOS Focus Guard

## Affected Sequence Diagrams

- Mobile Edit Entry and Focus Protection
- Open Task From Calendar

## Affected Tests

- `Escape closes settings without closing the task detail panel`
- Statistics modal open/close cases in `taskmanager-frontend/src/App.test.tsx`
- Focus-transition and mobile text-mode cases in `taskmanager-frontend/src/App.test.tsx`

# Proposed Change

Persist selected task, active editor, bulk selection, filters, or mobile page as task-domain records.

## Why It Looks Attractive

Restoring the exact prior interface state across sessions can look like a
consistent persistence improvement.

## What Would Break

These values have presentation-local or transient lifecycles and can reference
deleted tasks, closed panels, disconnected DOM, obsolete filters, or a mobile
layout that is no longer active. Treating them as domain records would blur
durable product data with session workflow and require invalid-state cleanup
across unrelated owners.

## Affected State Categories

- Presentation-local state: filters, tabs, and active mobile page.
- Transient state: selected task, active editor, and bulk selection.
- Persisted state: incorrectly introduced durable records.
- Platform state: layout and DOM validity.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-002: Shared Edit Draft
- ADR-004: Mobile Edit Row

## Affected Sequence Diagrams

- Edit Task and Autosave
- Bulk Complete Recurring Tasks
- Open Task From Calendar
- Mobile Edit Entry and Focus Protection

## Affected Tests

- Selection, bulk-mode, filter, and mobile-page cases in `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/utils/taskFiltering.test.ts`

# Proposed Change

Put React state, API calls, DOM access, or focus behavior into pure utilities.

## Why It Looks Attractive

Utility files are small, reusable, and already centralize scheduling,
recurrence, filtering, formatting, and draft conversion logic.

## What Would Break

Utilities would stop being deterministic calculation boundaries. Their output
would depend on component lifecycle, network responses, or platform state;
callers could no longer recompute derived values safely; and focused unit
tests would no longer describe complete behavior. Ownership of side effects
would become hidden.

## Affected State Categories

- Derived state: calculations currently owned by utilities.
- Persisted state: records touched by introduced API calls.
- Transient state: React and workflow state.
- Platform state: DOM and focus conditions.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-005: iOS Focus Guard

## Affected Sequence Diagrams

- Create Task
- Edit Task and Autosave
- Complete Recurring Task
- Mobile Edit Entry and Focus Protection

## Affected Tests

- All suites under `taskmanager-frontend/src/utils/`
- Broad orchestration and focus cases in `taskmanager-frontend/src/App.test.tsx`

# Proposed Change

Remove `ParentTaskGuard` and let each child-resource controller implement parent checks independently.

## Why It Looks Attractive

Each controller would contain its complete request path without calling shared
infrastructure.

## What Would Break

The repeated existing-task rule could diverge among subtasks, notes,
reminders, and attachments. Some endpoints could query or create child
resources for missing tasks, return inconsistent statuses, or omit the check
entirely. The current coherent shared rule would lose its owner.

## Affected State Categories

- Persisted state: task-associated resources.
- Transient state: request validation and error responses.

## Affected ADRs

- ADR-008: No Backend Service Layer

## Affected Sequence Diagrams

- Reminder Snooze
- Mobile Edit Entry and Focus Protection

## Affected Tests

- `src/test/java/com/example/taskmanager/SubtaskControllerTest.java`
- `src/test/java/com/example/taskmanager/NoteControllerTest.java`
- `src/test/java/com/example/taskmanager/ReminderControllerTest.java`
- `src/test/java/com/example/taskmanager/AttachmentControllerTest.java`

# Proposed Change

Treat the backend database as directly accessible frontend state.

## Why It Looks Attractive

Direct access could appear to remove API transport and controller boilerplate.

## What Would Break

The REST boundary, controller validation, response semantics, related-record
checks, exception handling, and repository ownership would be bypassed.
Frontend orchestration would become coupled to persistence structure and could
no longer rely on bounded endpoint contracts or successful responses before
reconciling working copies.

## Affected State Categories

- Persisted state: all backend records and frontend working copies.
- Draft state: mutation inputs.
- Transient state: request, validation, loading, and error workflows.

## Affected ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-008: No Backend Service Layer

## Affected Sequence Diagrams

- Create Task
- Edit Task and Autosave
- Complete Recurring Task
- Bulk Complete Recurring Tasks
- Reminder Snooze
- Delete Tag and Reconcile Tasks
- Open Task From Calendar
- Mobile Edit Entry and Focus Protection

## Affected Tests

- `taskmanager-frontend/src/api/tasks.test.ts`
- All backend controller and repository tests
- Mutation and error cases in `taskmanager-frontend/src/App.test.tsx`
