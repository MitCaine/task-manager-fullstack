# Task Manager Code Reading Guide

## Purpose

This guide provides targeted reading paths for understanding how Task Manager
actually works. It is organized around user-visible workflows and technical
subsystems rather than source-directory order.

Use it when:

- joining the project;
- investigating an unfamiliar behavior;
- tracing a user action through frontend and backend layers;
- learning why a responsibility has its current owner;
- preparing to review an architecture-sensitive change.

Each path starts with the most useful entry point and then follows ownership
through orchestration, bounded hooks, utilities, transport, persistence, and
tests. Read only the paths relevant to the question you are investigating.

## Reading Conventions

The normal end-to-end path is:

```text
Presentation component
    -> App.tsx or bounded hook owner
    -> pure utility when calculation is required
    -> frontend API transport
    -> backend controller
    -> repository and entity
    -> frontend local-state reconciliation
    -> behavioral tests
```

Not every subsystem uses every layer. Derived views do not reach the backend.
Mobile focus protection operates on platform state rather than persisted
records. Hooks own bounded concepts, while `App.tsx` remains the owner of
cross-domain workflows.

---

# Fastest Path To Understanding The Project

## 4-Hour Path

This path establishes the ownership model and follows the two workflows that
explain most of the frontend architecture.

1. Read [architecture.md](architecture.md), especially frontend architecture,
   ownership principles, and request/data flows.
2. Read [ownership-map.md](ownership-map.md), focusing on `App.tsx` and the
   four hooks.
3. Read [state-taxonomy.md](state-taxonomy.md), focusing on draft, transient,
   and platform state.
4. Read `taskmanager-frontend/src/App.tsx` around hook initialization,
   `addTask`, `startEdit`, `saveEdit`, and `scheduleAutoSave`.
5. Follow the **Task Creation**, **Task Editing**, and **Autosave** reading
   paths below.
6. Read [ADR-001](adr/ADR-001-app-tsx-orchestration-owner.md),
   [ADR-002](adr/ADR-002-shared-edit-draft.md), and
   [ADR-003](adr/ADR-003-autosave-ownership.md).
7. Read the matching task creation and edit/autosave diagrams in
   [sequence-diagrams.md](sequence-diagrams.md).
8. Skim the corresponding `App.test.tsx`, `api/tasks.test.ts`, and
   `TaskControllerTest.java` cases.

At the end of four hours, a maintainer should understand why `App.tsx` is an
orchestration owner, how state categories affect ownership, and how a task
mutation crosses the system.

## 8-Hour Path

Complete the 4-hour path, then add the bounded domains and recurrence model.

1. Follow the **Recurrence** and **Bulk Selection** paths.
2. Follow the **Projects and Tags** path.
3. Follow the **Task Detail Resources** path.
4. Follow the **Calendar Integration** and **Statistics and Derived Views**
   paths.
5. Read [ADR-006](adr/ADR-006-reminder-ownership-split.md) and
   [ADR-007](adr/ADR-007-recurring-task-replacement.md).
6. Compare `useProjectTagCatalog`, `useTaskDetailResources`,
   `useBulkSelection`, and `useTaskListViewModel` to their exclusions in
   [ownership-map.md](ownership-map.md).
7. Trace one frontend API function into its controller, repository, entity,
   and controller test.

At the end of eight hours, a maintainer should recognize the difference
between bounded hook ownership and cross-domain orchestration.

## 20-Hour Path

Complete the 8-hour path, then study platform behavior and persistence in
depth.

1. Follow the **Reminder Detection and Toast Delivery** path.
2. Follow the **Mobile Editing** and **iOS Focus Protection** paths.
3. Read [mobile-focus-system.md](mobile-focus-system.md) completely.
4. Read [ADR-004](adr/ADR-004-mobile-edit-row.md) and
   [ADR-005](adr/ADR-005-ios-focus-guard.md).
5. Follow the **Frontend API Layer**, **Backend Request Lifecycle**, and
   **Database Persistence Model** paths.
6. Read [ADR-008](adr/ADR-008-no-backend-service-layer.md).
7. Read representative controller and repository tests, then compare them to
   frontend orchestration tests.
8. Work through every reverse engineering exercise at the end of this guide.
9. Use [architecture-signals.md](architecture-signals.md) to explain which
   boundaries are healthy and which responsibilities remain intentionally
   centralized.

At the end of twenty hours, a maintainer should be able to trace persisted,
draft, derived, transient, presentation-local, and platform state through
their complete lifecycles.

---

# Subsystem Reading Paths

## 1. Task Creation

### What This Subsystem Does

Task creation collects a create draft, validates its schedule, creates the
base task, optionally attaches recurrence and tags, appends the composed task
to local state, resets the draft, and queues a confirmation toast.

### Why It Exists

Creation remains in `App.tsx` because it coordinates several persisted
resources plus draft reset and transient toast state. This follows
[ADR-001](adr/ADR-001-app-tsx-orchestration-owner.md).

### Read In This Order

1. `taskmanager-frontend/src/components/create-task/TaskEditorFields.tsx`
2. `taskmanager-frontend/src/components/create-task/RecurrenceControl.tsx`
3. `taskmanager-frontend/src/components/create-task/TaskTags.tsx`
4. `taskmanager-frontend/src/App.tsx`: create-draft state and `addTask`
5. `taskmanager-frontend/src/utils/taskScheduling.ts`
6. `taskmanager-frontend/src/utils/taskForm.ts`
7. `taskmanager-frontend/src/api/tasks.ts`: `createTask`, `setRepeat`,
   `addTagToTask`
8. `src/main/java/com/example/taskmanager/TaskController.java`
9. `src/main/java/com/example/taskmanager/TaskRepository.java`,
   `Task.java`, `RecurrenceRule.java`, and `Tag.java`
10. `taskmanager-frontend/src/App.test.tsx`,
    `taskmanager-frontend/src/api/tasks.test.ts`, and
    `src/test/java/com/example/taskmanager/TaskControllerTest.java`

### Key Concepts To Watch For

- The create draft is draft state owned by `App.tsx`.
- Schedule construction and validation are pure utility responsibilities.
- Base task creation happens before optional recurrence and tag association.
- Local task state is updated only after the composed workflow succeeds.
- The frontend API transports requests but does not own creation.

### Common Misunderstandings

- The create-task components do not own the create draft or mutation.
- A task with tags and recurrence is not created through one backend request.
- `useProjectTagCatalog` supplies catalog records but does not assign them to
  the new task.

### Related Documentation

- [Task Creation Sequence](sequence-diagrams.md#1-create-task)
- [App.tsx Mutation Ownership](ownership-map.md#mutation-ownership)
- [Draft State](state-taxonomy.md#draft-state)
- [Healthy Orchestration Signals](architecture-signals.md#5-healthy-orchestration-signals)

---

## 2. Task Editing

### What This Subsystem Does

Task editing initializes one shared draft from a persisted task, refreshes
task/tag and recurrence data, renders the draft through inline or mobile
editors, saves base fields, reconciles tags and recurrence, and updates the
primary task collection.

### Why It Exists

All task editors use one authoritative draft so changing presentation does not
create competing edit state. `App.tsx` owns the lifecycle because editing
crosses selection, task state, recurrence, tags, and autosave.

### Read In This Order

1. `taskmanager-frontend/src/App.tsx`: `renderInlineEditForm`
2. `taskmanager-frontend/src/components/create-task/TaskEditorFields.tsx`
3. `taskmanager-frontend/src/App.tsx`: `startEdit`, edit-draft state, and
   `saveEdit`
4. `taskmanager-frontend/src/utils/taskEditDraft.ts`
5. `taskmanager-frontend/src/utils/taskScheduling.ts` and `taskForm.ts`
6. `taskmanager-frontend/src/api/tasks.ts`: `getTask`, `getRecurrence`,
   `updateTask`, tag association functions, and `setRepeat`
7. `src/main/java/com/example/taskmanager/TaskController.java`
8. `src/main/java/com/example/taskmanager/Task.java`,
   `TaskRepository.java`, `TagRepository.java`, and
   `RecurrenceRuleRepository.java`
9. Edit-related cases in `App.test.tsx`, `api/tasks.test.ts`, and
    `TaskControllerTest.java`

### Key Concepts To Watch For

- Persisted task state and edit draft state are different authorities.
- `deriveTaskEditDraft` is a pure conversion, not an edit owner.
- Inline and mobile editors consume the same draft.
- Saving reconciles base fields, tags, and recurrence as separate operations.
- Selected-task lifecycle affects when edits initialize and flush.

### Common Misunderstandings

- Each editor does not have its own draft.
- Moving edit JSX does not transfer edit ownership.
- Updating the base task alone does not complete an edit when tags or
  recurrence changed.

### Related Documentation

- [Edit Task and Autosave Sequence](sequence-diagrams.md#2-edit-task-and-autosave)
- [ADR-002: Shared Edit Draft](adr/ADR-002-shared-edit-draft.md)
- [Shared Edit Draft State](state-taxonomy.md#major-state-mapping)
- [Unhealthy Component Extraction Signals](architecture-signals.md#4-unhealthy-component-extraction-signals)

---

## 3. Autosave

### What This Subsystem Does

Autosave remains documented as the legacy detail-panel save lifecycle. The
active inline and mobile editors use explicit Save while still relying on the
same complete save workflow.

### Why It Exists

Autosave is colocated with selected-task and shared-edit-draft ownership. This
prevents stale saves, wrong-task updates, competing timers, and partial
reconciliation. The decision is recorded in
[ADR-003](adr/ADR-003-autosave-ownership.md).

### Read In This Order

1. `taskmanager-frontend/src/App.tsx`: autosave refs and timer state
2. `taskmanager-frontend/src/App.tsx`: `scheduleAutoSave`, `saveEdit`,
   panel-close, and task-switch handling
3. `taskmanager-frontend/src/utils/taskEditDraft.ts`,
   `taskScheduling.ts`, and `taskForm.ts`
4. `taskmanager-frontend/src/api/tasks.ts`: edit-related API functions
5. `src/main/java/com/example/taskmanager/TaskController.java`
6. Autosave, edit switching, and panel lifecycle cases in
   `taskmanager-frontend/src/App.test.tsx`

### Key Concepts To Watch For

- The timer and current-save refs are transient workflow state.
- Autosave needs the complete save workflow, not only `updateTask`.
- Inline and mobile editors use explicit Save.
- Switching edit contexts must not discard pending draft values.

### Common Misunderstandings

- Autosave is not a reusable timing helper independent of edit ownership.
- Presentation components do not own save timers.
- A successful base-task update does not mean tag and recurrence
  reconciliation is complete.

### Related Documentation

- [ADR-003: Autosave Ownership](adr/ADR-003-autosave-ownership.md)
- [Autosave Ownership Map](ownership-map.md#autosave-ownership)
- [Transient State](state-taxonomy.md#transient-state)
- [Unhealthy Hook Extraction Signals](architecture-signals.md#2-unhealthy-hook-extraction-signals)

---

## 4. Recurrence

### What This Subsystem Does

Recurrence supports selecting a repeat frequency, attaching or clearing a
recurrence rule, and completing a recurring task by replacing it with the
next occurrence while preserving duration and task metadata.

### Why It Exists

The current model treats recurring completion as task replacement rather than
an ordinary status update. Pure recurrence calculation is separated from the
cross-domain replacement workflow. See
[ADR-007](adr/ADR-007-recurring-task-replacement.md).

### Read In This Order

1. `taskmanager-frontend/src/components/create-task/RecurrenceControl.tsx`
2. `taskmanager-frontend/src/App.tsx`: `toggleComplete`,
   `completeRecurringTask`, `addTask`, and recurrence handling in `saveEdit`
3. `taskmanager-frontend/src/utils/taskRecurrence.ts`
4. `taskmanager-frontend/src/api/tasks.ts`: `getRecurrence`, `setRepeat`,
   `createTask`, `deleteTask`, and `addTagToTask`
5. `src/main/java/com/example/taskmanager/TaskController.java`: recurrence
   endpoints
7. `src/main/java/com/example/taskmanager/RecurrenceRule.java`,
   `RecurrenceRuleRepository.java`, `Task.java`, and `TaskRepository.java`
8. `taskmanager-frontend/src/utils/taskRecurrence.test.ts`
9. Recurrence cases in `App.test.tsx`, `api/tasks.test.ts`, and
   `TaskControllerTest.java`

### Key Concepts To Watch For

- The recurrence utility calculates schedules but does not perform mutations.
- Completing a recurring task creates a new identity and deletes the old one.
- Tags, project, priority, duration, and recurrence metadata must survive the
  replacement.
- Individual and bulk completion converge on the same replacement behavior.

### Common Misunderstandings

- A recurring task is not completed by patching its status to done.
- The database does not currently preserve occurrence history.
- `useBulkSelection` does not own recurring completion.

### Related Documentation

- [Complete Recurring Task Sequence](sequence-diagrams.md#3-complete-recurring-task)
- [Bulk Complete Recurring Tasks Sequence](sequence-diagrams.md#4-bulk-complete-recurring-tasks)
- [ADR-007: Recurring Task Replacement](adr/ADR-007-recurring-task-replacement.md)
- [Healthy Orchestration Signals](architecture-signals.md#5-healthy-orchestration-signals)

---

## 5. Bulk Selection

### What This Subsystem Does

Bulk selection owns entry into bulk mode and the selected task ID set.
`App.tsx` consumes that selection to perform bulk deletion or recurrence-aware
bulk completion.

### Why It Exists

Selection is a coherent transient state boundary, while bulk mutation crosses
primary task state, recurrence, APIs, and error handling. The split makes
selection reusable without hiding mutation orchestration.

### Read In This Order

1. `taskmanager-frontend/src/components/task-list/TaskListPresentation.tsx`
2. `taskmanager-frontend/src/components/task-list/TaskCardMain.tsx`
3. `taskmanager-frontend/src/hooks/useBulkSelection.ts`
4. `taskmanager-frontend/src/App.tsx`: hook consumption, `bulkMarkDone`, and
   bulk deletion
5. `taskmanager-frontend/src/App.tsx`: `completeRecurringTask`
6. `taskmanager-frontend/src/api/tasks.ts`: task status, recurrence, and
   deletion functions
7. `src/main/java/com/example/taskmanager/TaskController.java`
8. Bulk-selection and bulk-completion cases in `App.test.tsx`

### Key Concepts To Watch For

- Bulk mode and selected IDs are transient selection state.
- The hook clears and toggles selection but does not mutate tasks.
- Recurrence probing may be required before completing a selected task.
- The primary task collection remains in `App.tsx`.

### Common Misunderstandings

- A hook named `useBulkSelection` is not expected to own bulk mutations.
- Selected IDs are not persisted domain state.
- Bulk completion cannot be implemented as one uniform status patch because
  recurring tasks use replacement.

### Related Documentation

- [Bulk Selection Ownership](ownership-map.md#usebulkselection)
- [Bulk Selection State](state-taxonomy.md#major-state-mapping)
- [Bulk Complete Sequence](sequence-diagrams.md#4-bulk-complete-recurring-tasks)
- [Healthy Hook Extraction Signals](architecture-signals.md#1-healthy-hook-extraction-signals)

---

## 6. Projects and Tags

### What This Subsystem Does

Projects and tags provide catalogs used by task drafts, task display,
filtering, and task associations. The catalog hook loads and mutates catalog
records; `App.tsx` reconciles successful catalog deletion into tasks, drafts,
and filters.

### Why It Exists

Catalog CRUD is a bounded persisted-state domain, but task reconciliation
belongs to the primary task owner. This split prevents the catalog hook from
acquiring task, filter, dropdown, or focus ownership.

### Read In This Order

1. `taskmanager-frontend/src/components/create-task/TagProjectChips.tsx`
2. `taskmanager-frontend/src/components/create-task/TaskTags.tsx`
3. `taskmanager-frontend/src/components/forms/InlineProjectForm.tsx`,
   `InlineTagForm.tsx`, and `TagColorPicker.tsx`
4. `taskmanager-frontend/src/hooks/useProjectTagCatalog.ts`
5. `taskmanager-frontend/src/App.tsx`: catalog hook consumption,
   `removeTag`, project deletion, and task/tag handlers
6. `taskmanager-frontend/src/utils/taskDisplayHelpers.ts`
7. `taskmanager-frontend/src/api/tasks.ts`: project, tag, and task/tag
   association functions
8. `src/main/java/com/example/taskmanager/ProjectController.java` and
   `TagController.java`
9. `ProjectRepository.java`, `TagRepository.java`, `Project.java`, `Tag.java`,
   and the tag relationship in `Task.java`
10. API, controller, and relevant `App.test.tsx` cases

### Key Concepts To Watch For

- Catalog records are persisted state owned by `useProjectTagCatalog`.
- Inline catalog forms are presentation; their visibility and focus remain
  coordinated by `App.tsx`.
- Deleting a tag or project requires local reconciliation outside the catalog
  hook.
- Task/tag associations are task mutations even though tags come from the
  catalog.

### Common Misunderstandings

- The catalog hook does not own every use of projects and tags.
- Deleting a catalog record is not complete when the catalog array updates.
- Color-picker behavior and dropdown placement are not catalog persistence.

### Related Documentation

- [Delete Tag and Reconcile Tasks Sequence](sequence-diagrams.md#6-delete-tag-and-reconcile-tasks)
- [useProjectTagCatalog Ownership](ownership-map.md#useprojecttagcatalog)
- [Persisted State](state-taxonomy.md#persisted-state)
- [Healthy and Unhealthy Hook Signals](architecture-signals.md#1-healthy-hook-extraction-signals)

---

## 7. Task Detail Resources

### What This Subsystem Does

Task detail resources retain APIs and hook-owned state for task-scoped notes,
subtasks, reminders, and link attachments. Resources and their drafts are cached
by task ID in `useTaskDetailResources` when a resource entry point loads them.

### Why It Exists

These resources retain a bounded API and state lifecycle for future or ambiguous
resource functionality. They can own CRUD helpers without owning task selection,
task editing, or reminder delivery.

### Read In This Order

1. `taskmanager-frontend/src/hooks/useTaskDetailResources.ts`:
   `loadTaskSections`, resource drafts, and resource mutation handlers
2. `taskmanager-frontend/src/App.tsx`: retained reminder/subtask hook
   consumption
3. `taskmanager-frontend/src/api/tasks.ts`: note, subtask, reminder, and
   attachment functions
4. `src/main/java/com/example/taskmanager/ParentTaskGuard.java`
5. `NoteController.java`, `SubtaskController.java`,
   `ReminderController.java`, and `AttachmentController.java`
6. Matching repositories and entities: `Note`, `Subtask`, `Reminder`, and
   `Attachment`
7. `api/tasks.test.ts` and matching backend controller tests

### Key Concepts To Watch For

- Resource collections are persisted frontend working copies keyed by task ID.
- Resource form values are draft state owned by the same hook.
- `ParentTaskGuard` protects child-resource creation/listing against missing
  parent tasks.
- Opening a task and selecting it remain `App.tsx` responsibilities.
- Reminder persistence and reminder delivery have different owners.

### Common Misunderstandings

- The hook does not own the selected task.
- Attachments are persisted links and metadata, not uploaded binary files.
- Reminder CRUD in the hook does not include global polling, toast delivery,
  or snoozing orchestration.

### Related Documentation

- [Detail Resources Flow](architecture.md#detail-resources)
- [useTaskDetailResources Ownership](ownership-map.md#usetaskdetailresources)
- [Reminder State Boundary](state-taxonomy.md#reminder-state)
- [ADR-006: Reminder Ownership Split](adr/ADR-006-reminder-ownership-split.md)

---

## 8. Calendar Integration

### What This Subsystem Does

The calendar renders a derived subset of tasks across calendar views and owns
calendar-local navigation and picker state. Selecting a task delegates to
`App.tsx`, which makes the task visible, handles mobile navigation, and opens
the appropriate task presentation.

### Why It Exists

`Calendar` is a presentation owner rather than a task owner. The split keeps
calendar navigation local while preserving one authority for task selection,
editing, and primary task state.

### Read In This Order

1. `taskmanager-frontend/src/components/Calendar.tsx`
2. `taskmanager-frontend/src/components/Calendar.css`
3. `taskmanager-frontend/src/hooks/useTaskListViewModel.ts`: calendar subset
4. `taskmanager-frontend/src/App.tsx`: calendar props and
   `openTaskFromCalendar`
5. `taskmanager-frontend/src/App.tsx`: `focusTaskById`, `openPanel`, and mobile
   page state
6. `taskmanager-frontend/src/components/Calendar.test.tsx`
7. Calendar-opening and mobile navigation cases in `App.test.tsx`

### Key Concepts To Watch For

- Calendar tasks are derived state, not an independent task collection.
- Calendar view/date/picker state is presentation-local.
- Opening a task may require clearing filters and changing the mobile page.
- Desktop and mobile opening paths differ after the calendar emits intent.

### Common Misunderstandings

- `Calendar` does not fetch or mutate tasks.
- Selecting a calendar item is not only a local calendar action.
- The calendar task subset should not be synchronized manually.

### Related Documentation

- [Open Task From Calendar Sequence](sequence-diagrams.md#7-open-task-from-calendar)
- [Calendar Ownership](ownership-map.md#calendar)
- [Derived State](state-taxonomy.md#derived-state)
- [Healthy Component Extraction Signals](architecture-signals.md#3-healthy-component-extraction-signals)

---

## 9. Statistics and Derived Views

### What This Subsystem Does

The list view model derives visible list tasks, calendar tasks, completed and
overdue counts, statistics data, interpreted filters, and empty-state
presentation data from primary tasks and list controls.

### Why It Exists

These values have no independent lifecycle or persistence. They are grouped in
`useTaskListViewModel` so the app has one derived-data path without creating a
second task authority.

### Read In This Order

1. `taskmanager-frontend/src/components/task-list/TaskListControls.tsx`
2. `taskmanager-frontend/src/components/task-list/TaskListPresentation.tsx`
3. `taskmanager-frontend/src/components/settings/StatsModal.tsx`
4. `taskmanager-frontend/src/hooks/useTaskListViewModel.ts`
5. `taskmanager-frontend/src/utils/taskFiltering.ts`
6. `taskmanager-frontend/src/utils/taskStatistics.ts`
7. `taskmanager-frontend/src/utils/taskEmptyState.ts`
8. `taskmanager-frontend/src/utils/taskDisplayHelpers.ts`
9. `taskmanager-frontend/src/App.tsx`: source tasks, controls, and hook
   consumption
10. Hook-supporting utility tests and relevant `App.test.tsx` cases

### Key Concepts To Watch For

- Primary tasks are persisted working-copy state; filtered/statistical results
  are derived state.
- Filter controls remain owned by `App.tsx`.
- The hook interprets source state but does not mutate it.
- Statistics modal visibility is separate from statistics calculation.

### Common Misunderstandings

- Derived task arrays are not task authorities.
- The view-model hook does not own filters merely because it consumes them.
- Statistics do not require backend persistence in the current architecture.

### Related Documentation

- [useTaskListViewModel Ownership](ownership-map.md#usetasklistviewmodel)
- [Derived State](state-taxonomy.md#derived-state)
- [Healthy Hook Extraction Signals](architecture-signals.md#1-healthy-hook-extraction-signals)

---

## 10. Reminder Detection and Toast Delivery

### What This Subsystem Does

Reminder persistence is handled as a task-detail resource. Separately,
`App.tsx` polls loaded reminders, detects due reminders, suppresses duplicate
delivery, queues reminder toasts, dismisses them, and snoozes reminders.
`ToastList` renders toasts and owns confirmation-toast auto-dismiss timers.

### Why It Exists

Reminder records, reminder drafts, delivery state, and toast presentation have
different lifecycles and state categories. Their split ownership is recorded
in [ADR-006](adr/ADR-006-reminder-ownership-split.md).

### Read In This Order

1. `taskmanager-frontend/src/components/shared/ToastList.tsx`
2. `taskmanager-frontend/src/hooks/useTaskDetailResources.ts`: reminder state,
   draft, creation, and deletion
3. `taskmanager-frontend/src/App.tsx`: reminder polling, fired-reminder
   suppression, toast queue, dismissal, and `snoozeToast`
5. `taskmanager-frontend/src/utils/dateTime.ts`
6. `taskmanager-frontend/src/api/tasks.ts`: reminder functions and
   `patchReminderDate`
7. `src/main/java/com/example/taskmanager/ReminderController.java`
8. `src/main/java/com/example/taskmanager/ReminderRepository.java` and
   `Reminder.java`
9. Reminder API and controller tests plus relevant `App.test.tsx` toast cases

### Key Concepts To Watch For

- Persisted reminders, reminder drafts, toast queue, duplicate-suppression
  state, and browser notification capability are different state categories.
- Snoozing crosses `App.tsx` and hook ownership.
- A snooze failure still dismisses the transient toast.
- The hook exposes `setReminders` so application orchestration can reconcile a
  successful snooze.

### Common Misunderstandings

- `ToastList` does not own reminder persistence or snoozing.
- `useTaskDetailResources` does not own global polling.
- Reminder toasts are not persisted reminder records.

### Related Documentation

- [Reminder Snooze Sequence](sequence-diagrams.md#5-reminder-snooze)
- [ADR-006: Reminder Ownership Split](adr/ADR-006-reminder-ownership-split.md)
- [Reminder Ownership](ownership-map.md#reminder-ownership)
- [Reminder State](state-taxonomy.md#reminder-state)

---

## 11. Mobile Editing

### What This Subsystem Does

Mobile task-card interaction opens a task, initializes the shared edit draft,
loads detail resources, and renders editing through a dedicated mobile edit
row in the task-list context. The list remains the vertical scroll owner.

### Why It Exists

The dedicated row and shared draft preserve mobile focus stability, scroll
ownership, and consistent editing across presentations. The placement
decision is recorded in [ADR-004](adr/ADR-004-mobile-edit-row.md).

### Read In This Order

1. [mobile-focus-system.md](mobile-focus-system.md): mobile page, editing,
   shared draft, and scroll ownership sections
2. `taskmanager-frontend/src/components/task-list/TaskCardMain.tsx`
3. `taskmanager-frontend/src/components/task-list/TaskListPresentation.tsx`
4. `taskmanager-frontend/src/App.tsx`: `handleTaskCardClick`, `openPanel`,
   `startEdit`, mobile page state, and `renderInlineEditForm`
5. `taskmanager-frontend/src/App.tsx`: `.mobile-edit-row` placement
6. `taskmanager-frontend/src/App.css`: `.mobile-edit-row`,
   `.mobile-edit-panel`, list, pager, and page sizing
7. Mobile-edit and mobile-list cases in `App.test.tsx`

### Key Concepts To Watch For

- Mobile editing is a presentation of the shared edit draft.
- The mobile edit row replaces the edited task item in list context.
- `.app__list` remains the scroll owner; the edit panel has no independent
  vertical scroll.
- Mobile page, swipe, selection, and edit placement are coordinated by
  `App.tsx`.

### Common Misunderstandings

- The mobile edit row is not merely a styling choice.
- Mobile editing does not own a separate draft.
- Moving edit JSX inside the task card can affect focus and viewport behavior.

### Related Documentation

- [Mobile Edit Entry and Focus Sequence](sequence-diagrams.md#8-mobile-edit-entry-and-focus-protection)
- [ADR-004: Mobile Edit Row](adr/ADR-004-mobile-edit-row.md)
- [Mobile Ownership](ownership-map.md#mobile-ownership)
- [Mobile and Platform Signals](architecture-signals.md#9-mobile-and-platform-signals)

---

## 12. iOS Focus Protection

### What This Subsystem Does

The global focus guard protects text entry in iOS/WKWebView by coordinating
focus transitions, text-focus scopes, `visualViewport` monitoring,
document-scroll correction, touch guards, bounded textarea scrolling, edit
entry preparation, and focus restoration.

### Why It Exists

No individual input can observe the complete browser and DOM lifecycle across
create, search, inline, mobile, detail, dialogs, scroll containers, and
keyboard transitions. The centralized design is recorded in
[ADR-005](adr/ADR-005-ios-focus-guard.md).

### Read In This Order

1. [mobile-focus-system.md](mobile-focus-system.md) completely
2. [ADR-005](adr/ADR-005-ios-focus-guard.md)
3. `taskmanager-frontend/src/App.tsx`: text-focus refs, helpers, listeners,
   edit-entry preparation, keyboard handling, and focus restoration
4. `taskmanager-frontend/src/App.tsx`: `data-text-focus-scope` placement
5. `taskmanager-frontend/src/App.css`: root, app, pager, page, list, mobile
   edit, and textarea scroll rules
6. Focus, `visualViewport`, touchmove, textarea, swipe, and restoration cases
   in `taskmanager-frontend/src/App.test.tsx`

### Key Concepts To Watch For

- `visualViewport`, active element, scroll positions, touch sequences, and DOM
  refs are platform state.
- Repeated asynchronous corrections are intentional.
- Zero document scroll does not prove the visual viewport is stable.
- Focus sequence tracking prevents stale blur events from disabling the active
  guard.
- Automated tests protect behavior; simulator/device checks protect
  WKWebView-specific visual results.

### Common Misunderstandings

- This is not ordinary field-level focus management.
- Repeated corrections are not automatically redundant.
- CSS sizing, mobile edit placement, scroll ownership, swipe guards, and focus
  listeners are one interacting subsystem.

### Related Documentation

- [Mobile Focus System](mobile-focus-system.md)
- [ADR-005: iOS Focus Guard](adr/ADR-005-ios-focus-guard.md)
- [Platform State](state-taxonomy.md#platform-state)
- [Mobile and Platform Signals](architecture-signals.md#9-mobile-and-platform-signals)

---

## 13. Frontend API Layer

### What This Subsystem Does

The frontend API module maps typed frontend operations to REST requests for
tasks, recurrence, task/tag associations, catalogs, and task-detail
resources. It handles transport and response parsing.

### Why It Exists

Transport is separated from state and workflow ownership so callers express
product intent and reconcile the correct local owner after success.

### Read In This Order

1. `taskmanager-frontend/src/types/task.ts`
2. `taskmanager-frontend/src/api/tasks.ts`: shared fetch/delete helpers and
   API base URL handling
3. Read one complete function group, starting with task functions
4. Read its caller in `App.tsx` or a bounded hook
5. Read the matching backend controller endpoint
6. Read `taskmanager-frontend/src/api/tasks.test.ts`
7. Read the matching backend controller test

### Key Concepts To Watch For

- API functions transport records but do not own state.
- Endpoint groups share one module even though their frontend owners differ.
- Error presentation and retries are not owned by the API module.
- A successful response still requires caller-owned local reconciliation.

### Common Misunderstandings

- The API module is not a frontend service layer or domain store.
- Calling an API function directly from a presentation component would bypass
  the current ownership flow.
- API tests protect request shape, not complete user workflows.

### Related Documentation

- [Frontend API Boundary](architecture.md#frontend-api-boundary)
- [Frontend API Ownership](ownership-map.md#frontend-api)
- [Backend Request Lifecycle](#14-backend-request-lifecycle)

---

## 14. Backend Request Lifecycle

### What This Subsystem Does

Spring controllers define REST endpoints, validate requests, check related
records, perform bounded mutations, call Spring Data repositories, and select
HTTP responses. Shared infrastructure handles parent-task existence,
exceptions, statuses, and CORS.

### Why It Exists

The current backend workflows are sufficiently bounded for direct
controller/repository ownership. A service layer is not present because an
additional forwarding layer would not create meaningful ownership. See
[ADR-008](adr/ADR-008-no-backend-service-layer.md).

### Read In This Order

1. `src/main/java/com/example/taskmanager/TaskManagerApplication.java`
2. `src/main/java/com/example/taskmanager/TaskController.java`
3. `src/main/java/com/example/taskmanager/TaskRepository.java`
4. `src/main/java/com/example/taskmanager/Task.java`
5. `src/test/java/com/example/taskmanager/TaskControllerTest.java`
6. `src/test/java/com/example/taskmanager/TaskRepositoryTest.java`
7. `src/main/java/com/example/taskmanager/ParentTaskGuard.java`
8. One child-resource controller, repository, entity, and controller test
9. `src/main/java/com/example/taskmanager/GlobalExceptionHandler.java`
10. `src/main/java/com/example/taskmanager/DataInitializer.java` and
    `CorsConfig.java`

### Key Concepts To Watch For

- Controllers own HTTP shape, validation, bounded mutation logic, and response
  status.
- Repositories own persistence access, not workflows.
- Entities are persistence mappings and validation carriers rather than rich
  domain-service objects.
- `ParentTaskGuard` is a reusable rule with a clear owner.
- Backend controller tests protect request and persistence behavior, while
  frontend tests protect application orchestration.

### Common Misunderstandings

- The absence of a service layer is intentional, not an omitted file.
- Frontend multi-request orchestration is not hidden in backend services.
- Repositories should not become workflow owners.

### Related Documentation

- [Backend Architecture](architecture.md#backend-architecture)
- [Backend Ownership](ownership-map.md#backend-ownership)
- [ADR-008: No Backend Service Layer](adr/ADR-008-no-backend-service-layer.md)
- [Backend Layering Signals](architecture-signals.md#7-backend-layering-signals)

---

## 15. Database Persistence Model

### What This Subsystem Does

The persistence model stores tasks, projects, tags, statuses, recurrence
rules, subtasks, notes, reminders, and attachments. Spring Data repositories
access those records through JPA entity mappings. MySQL is used for local
runtime persistence and H2 is used in backend tests.

### Why It Exists

The active entity model supports the implemented product rather than every
table from the original academic design. Schema mutation is managed manually,
with Hibernate generation disabled.

### Read In This Order

1. `src/main/resources/application.properties`
2. `src/test/resources/application.properties`
3. `src/main/java/com/example/taskmanager/Task.java`
4. `src/main/java/com/example/taskmanager/Project.java`,
   `Tag.java`, `Status.java`, and `RecurrenceRule.java`
5. `src/main/java/com/example/taskmanager/Subtask.java`, `Note.java`,
   `Reminder.java`, and `Attachment.java`
6. Repository interfaces in `src/main/java/com/example/taskmanager/`
7. `src/main/java/com/example/taskmanager/DataInitializer.java`
8. `SQL Files/databasemodel.sql`
9. `src/test/java/com/example/taskmanager/TaskRepositoryTest.java`
10. Controller tests that demonstrate persistence relationships

### Key Concepts To Watch For

- The database is the durable authority for persisted domain records.
- Frontend collections are working copies reconciled after requests.
- `Task` stores several direct foreign-key IDs and an eager many-to-many tag
  relationship.
- Child resources are task-scoped through parent IDs.
- `spring.jpa.hibernate.ddl-auto=none` means entity changes do not
  automatically update the schema.
- The SQL file reflects the broader database design and should be compared
  carefully with active entities and behavior.

### Common Misunderstandings

- The active application does not use every concept from the original schema.
- JPA entities do not own application workflows.
- Frontend task identity and recurring-occurrence lifecycle are not equivalent
  to recurrence history in the database.

### Related Documentation

- [Database Architecture](architecture.md#database-architecture)
- [Persisted State](state-taxonomy.md#persisted-state)
- [Backend Request Lifecycle](#14-backend-request-lifecycle)
- [ADR-008: No Backend Service Layer](adr/ADR-008-no-backend-service-layer.md)

---

# Reverse Engineering Exercises

Use these exercises to test whether the ownership and lifecycle model is
understood. The goal is to explain the current system, not propose changes.

## Workflow Tracing

1. Trace recurring completion from the user's completion action to creation of
   the replacement database record and deletion of the old task. Identify
   every local-state update after the backend operations.
2. Trace task creation with a project, two tags, and weekly recurrence. Explain
   why the frontend performs several requests and when the create draft resets.
3. Follow a reminder from retained hook state to toast display, then through
   snoozing. Classify every state value encountered.
4. Identify every owner involved in opening a task from the calendar on
   desktop and on mobile.
5. Follow a tag deletion from the inline catalog action through backend
   deletion and frontend reconciliation of tasks, drafts, and filters.
6. Trace bulk completion for a mixed selection containing recurring and
   non-recurring tasks.

## Ownership Explanation

1. Explain why autosave remains in `App.tsx` even though timers can be placed
   in a custom hook.
2. Explain why `useBulkSelection` owns selected IDs but not bulk task
   mutations.
3. Explain why `useProjectTagCatalog` deletes tags but does not reconcile task
   assignments.
4. Explain why `Calendar` owns date/view navigation but not task selection.
5. Explain why `useTaskDetailResources` owns persisted reminders but not
   reminder polling and delivery.
6. Explain why `renderInlineEditForm` is not treated as an independent edit
   owner.

## State Classification

1. Classify tasks, the shared edit draft, filtered tasks, selected task,
   dropdown visibility, reminder toasts, and `visualViewport` observations.
2. For each value above, describe its reset conditions and the failure likely
   if ownership moves.
3. Explain why calendar tasks and list tasks are derived views rather than
   persisted collections.
4. Explain why selected task is transient workflow state rather than only
   presentation-local state.

## Platform and Persistence

1. Determine which ADR protects mobile edit placement and list the invariants
   that depend on it.
2. Explain why document scroll at zero does not prove iOS visual viewport
   stability.
3. Find the tests that protect bounded textarea scrolling and stale focus
   transitions.
4. Trace one child-resource request through `ParentTaskGuard`, controller,
   repository, entity, and controller test.
5. Compare `Task.java` with `SQL Files/databasemodel.sql` and identify which
   persistence model is active in current application behavior.

---

# Architectural Milestones

These milestones usually represent major breakthroughs in understanding the
project.

## App.tsx Is Orchestration, Not Merely a Large File

The important realization is that `App.tsx` owns workflows that cross primary
task state, bounded hooks, drafts, selection, mutation ordering, focus, and
mobile behavior. Its size is less important than whether those workflows have
one visible owner.

## State Categories Explain Ownership

Persisted, draft, derived, presentation-local, transient, and platform state
can all use React state while requiring different owners and lifecycles.
Understanding the category prevents accidental duplicate authorities.

## Hooks Own Concepts, Not Arbitrary Code Blocks

The four hooks are useful because each owns a coherent concept and clearly
excludes cross-domain orchestration. The breakthrough is recognizing that a
hook can support a workflow without owning the workflow.

## Shared Edit Drafts Unify Multiple Presentations

Inline and mobile editing are different presentations of one draft. Once this
is understood, task switching and mobile edit behavior become easier to trace.

## Autosave Is a Workflow Lifecycle

Autosave is not only a debounce timer. It includes current-task identity,
current draft values, flush conditions, complete save behavior, and local
reconciliation.

## Recurring Completion Is Replacement

Recurring completion creates a next occurrence and removes the current one.
This explains why completion crosses recurrence utilities, several API calls,
task identity, selection, local replacement, scrolling, and highlighting.

## Reminder Ownership Is Intentionally Split

Persisted reminder records, reminder drafts, due detection, duplicate
suppression, toast queues, snoozing, and toast presentation have distinct
lifecycles. Their multiple owners are deliberate rather than inconsistent.

## Calendar Is a Presentation Owner

Calendar navigation belongs to `Calendar`; task identity and opening belong to
`App.tsx`; calendar task data is derived by `useTaskListViewModel`. This is a
compact example of healthy ownership separation.

## Platform State Is Not Application State

Focus, DOM refs, viewport offsets, scroll positions, touches, and keyboard
transitions are controlled by the runtime platform. They require lifecycle
observation and invariants rather than persistence or ordinary component
state.

## Mobile Focus Behavior Is a Cross-Cutting System

Mobile edit placement, CSS sizing, scroll ownership, focus scopes,
`visualViewport`, touch guards, swipe rules, and tests jointly preserve the
current behavior. Reading any one part in isolation gives an incomplete model.

## Backend Layers Reflect Current Workflow Complexity

Controllers and repositories are sufficient for the current bounded backend
operations. The absence of a service layer becomes understandable once
frontend orchestration and direct controller ownership are traced end to end.

## Tests Are Executable Ownership Evidence

Utility tests protect pure rules, API tests protect transport, controller and
repository tests protect persistence behavior, `Calendar.test.tsx` protects
calendar-local behavior, and `App.test.tsx` protects orchestration and
platform-sensitive behavior.

---

# Documentation Index

Use these documents alongside the reading paths:

- [Architecture](architecture.md): system layers and current request/data flow
- [Ownership Map](ownership-map.md): explicit owners and exclusions
- [State Taxonomy](state-taxonomy.md): state categories, lifecycles, and risks
- [Sequence Diagrams](sequence-diagrams.md): end-to-end workflow traces
- [Architecture Signals](architecture-signals.md): healthy and unhealthy
  ownership signals
- [Mobile Focus System](mobile-focus-system.md): mobile and iOS invariants
- [ADR Directory](adr/): current architecture decisions and consequences
