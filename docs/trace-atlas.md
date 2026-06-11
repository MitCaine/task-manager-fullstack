# Task Manager Trace Atlas

## Purpose

This atlas answers: **When a user performs action X, what code executes?**

Each trace follows the current implementation from the user-facing entry
point through frontend ownership, pure calculations, transport, backend
persistence, and local-state reconciliation. Conditional branches are
included where the same action takes different paths.

Backend request paths are direct:

```text
Component -> App.tsx or bounded hook -> utility -> api/tasks.ts
          -> controller -> repository -> entity/database
```

Not every workflow uses every layer. Frontend-only presentation and platform
workflows stop before the API boundary.

# Create Task

## User Intent

Create a task from the create form, optionally with a schedule, project,
priority, recurrence, and tags.

## Entry Point

`TaskEditorFields` title Enter handling or the `Add Task` button in `App.tsx`
invokes `addTask`.

## Execution Path

`addTask` rejects a blank title, builds and validates the schedule, creates
the base task, then attaches recurrence and tags as separate requests. Only
after the composed workflow succeeds does it append the task, reset the draft,
and queue a confirmation toast.

```text
TaskEditorFields / Add Task button
  -> App.tsx addTask
  -> taskScheduling.buildTaskSchedule
  -> taskForm.validateTaskTimeRange
  -> api.createTask -> TaskController.createTask -> TaskRepository.save -> Task
  -> optional api.setRepeat -> TaskController.setRepeat
       -> RecurrenceRuleRepository.save -> RecurrenceRule
       -> TaskRepository.save -> Task
  -> optional api.addTagToTask -> TaskController.addTag
       -> TagRepository.findById -> TaskRepository.save -> Task / TaskTag
  -> App tasks + create draft + toast queue
```

## State Categories Involved

- **Persisted:** task, recurrence rule, task/tag associations.
- **Draft:** create-task fields.
- **Derived:** constructed schedule and validation result.
- **Transient:** title feedback, error, confirmation toast.
- **Presentation-local:** create controls and dropdown visibility.
- **Platform:** form focus and confirmation-toast timer.

## Ownership Boundaries

`App.tsx` owns the workflow and primary tasks; create components render the
draft; `useProjectTagCatalog` supplies catalogs; utilities calculate; the API
transports; `TaskController` owns bounded backend mutations.

## ADRs

- ADR-001: App.tsx Orchestration Owner

## Tests

- `App.test.tsx`: add, Enter submission, toast, recurrence, metadata/tags,
  blank title, schedule validation, and request-failure cases.
- `api/tasks.test.ts`: `createTask`, `setRepeat`, `addTagToTask`.
- `taskScheduling.test.ts`, `taskForm.test.ts`.
- `TaskControllerTest.java`: create, validation, recurrence, and tag paths.

## Failure Boundaries

Blank title and invalid range stop before transport. Any request failure enters
the outer `catch`, sets `Failed to create task.`, and leaves the local task
list and draft unreconciled. Because recurrence and tags follow base creation,
a later failure can occur after the base task already exists in the database.

# Edit Task

## User Intent

Open an inline, mobile, or detail editor, change task data, and persist it.

## Entry Point

The task action-menu `Edit` button calls `handleEditTaskAction`; mobile task
opening calls `handleTaskCardClick` then `openPanel`; detail fields edit the
same draft. Explicit Save calls `saveEdit`.

## Execution Path

`startEdit` derives the shared draft, refreshes tag ordering, and loads the
recurrence frequency. `saveEdit` validates the schedule, saves base fields,
reconciles tag associations, updates local tasks, then reconciles recurrence
when it changed.

```text
TaskCardMain Edit / mobile task card / detail editor
  -> App.tsx handleEditTaskAction or openPanel
  -> App.tsx startEdit
  -> taskEditDraft.deriveTaskEditDraft
  -> api.getTask -> TaskController.getTask -> TaskRepository.findById -> Task
  -> optional api.getRecurrence -> TaskController.getRecurrence
       -> TaskRepository + RecurrenceRuleRepository -> RecurrenceRule
  -> shared edit draft
  -> App.tsx saveEdit
  -> taskScheduling.buildTaskSchedule + taskForm.validateTaskTimeRange
  -> api.updateTask -> TaskController.updateTask -> TaskRepository.save -> Task
  -> api.addTagToTask / removeTagFromTask -> TaskController -> TagRepository / TaskRepository
  -> optional api.setRepeat + api.getTask -> TaskController -> recurrence/task repositories
  -> App tasks
```

## State Categories Involved

- **Persisted:** task, tags, recurrence.
- **Draft:** one shared edit draft.
- **Derived:** draft conversion, schedule, validation.
- **Transient:** active editor, selected task, error.
- **Presentation-local:** inline/mobile/detail surfaces and dropdowns.
- **Platform:** focus, viewport preparation, mobile row placement.

## Ownership Boundaries

`App.tsx` owns edit lifecycle and reconciliation. All editor presentations
consume one draft. Utilities do conversion/calculation only. Backend
controllers and repositories own bounded persistence.

## ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-002: Shared Edit Draft
- ADR-003: Autosave Ownership
- ADR-004 and ADR-005 for the mobile presentation path

## Tests

- `App.test.tsx`: inline/mobile save, project/tags, schedule, recurrence,
  validation, and mobile edit behavior.
- `api/tasks.test.ts`: task, tag-association, and recurrence calls.
- Edit, scheduling, form, and time-shift utility tests.
- `TaskControllerTest.java`.

## Failure Boundaries

`getTask` failure during entry falls back to the task's current local tags;
recurrence-load failure clears the repeat draft. Invalid schedules stop save.
Base-save or tag-reconciliation failure sets `Failed to update task.`.
Recurrence reconciliation failure after the base save is treated as
non-critical and is silently ignored.

# Autosave

## User Intent

Have detail-panel task changes persist after a debounce or when the panel
closes or switches.

## Entry Point

`DetailHeader`, `DetailDescriptionField`, `DetailScheduleFields`, project/tag
controls, and `DetailRepeatRow` update the shared draft and call
`scheduleAutoSave`, often with delay `0` for discrete controls.

## Execution Path

`scheduleAutoSave` replaces the pending timer and captures the selected task
ID. When it fires, current refs resolve the latest task and `saveEdit`
function. Closing or switching panels clears the timer and directly awaits
`saveEdit`.

```text
Detail field callback
  -> App.tsx draft setter + scheduleAutoSave
  -> platform window.setTimeout
  -> tasksRef.current + saveEditRef.current
  -> App.tsx saveEdit
  -> scheduling/form utilities
  -> api.updateTask + tag association calls + optional recurrence calls
  -> TaskController -> TaskRepository / TagRepository / RecurrenceRuleRepository
  -> App tasks
```

## State Categories Involved

- **Persisted:** task, tags, recurrence.
- **Draft:** shared edit draft.
- **Derived:** schedule and validation.
- **Transient:** selected task, timer, current-task/save refs, error.
- **Platform:** timer lifecycle.

## Ownership Boundaries

`App.tsx` owns the timer, refs, selected task, draft, complete save workflow,
and flush behavior. Detail components only emit changes.

## ADRs

- ADR-002: Shared Edit Draft
- ADR-003: Autosave Ownership

## Tests

- Autosave, panel lifecycle, task switching, and edit behavior in
  `App.test.tsx`.
- `api/tasks.test.ts`, scheduling/form utility tests, and
  `TaskControllerTest.java`.

## Failure Boundaries

A newly scheduled save cancels the prior timer. If the captured selected task
no longer exists when the timer fires, no save occurs. `saveEdit` handles
validation and request failures as described in Edit Task. Panel close/switch
awaits the flush before clearing or changing selection.

# Complete Task

## User Intent

Toggle a non-recurring task between active and done, or reactivate a completed
recurring task without generating another occurrence.

## Entry Point

`TaskCardMain` status checkbox `onChange` invokes its `onToggleComplete`
callback, wired by `App.tsx` to `toggleComplete(task)`.

## Execution Path

For the ordinary path, `toggleComplete` normalizes the status, calculates the
next scalar status, patches it, and replaces the task in local state.

```text
TaskCardMain status checkbox
  -> App.tsx toggleComplete
  -> taskDisplay.normalizeTaskStatus
  -> api.patchTaskStatus
  -> TaskController.patchTaskStatus
  -> TaskRepository.findById + save
  -> Task entity/database
  -> App tasks replacement
```

## State Categories Involved

- **Persisted:** task status.
- **Derived:** normalized/current and next status.
- **Transient:** top-level error.

## Ownership Boundaries

`TaskCardMain` emits intent; `App.tsx` owns the mutation and primary task
working copy; `TaskController` owns the backend status endpoint.

## ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-007 distinguishes this path from active recurring completion

## Tests

- `App.test.tsx`: ordinary status behavior and completed recurring task
  reactivation.
- `api/tasks.test.ts`: `patchTaskStatus`.
- `TaskControllerTest.java`: status found/not-found cases.

## Failure Boundaries

A failed patch sets `Failed to update task status.` and leaves the local task
unchanged. A missing backend task returns 404 through the API error path.

# Complete Recurring Task

## User Intent

Complete an active recurring task and receive its next scheduled occurrence.

## Entry Point

`TaskCardMain` status checkbox calls `toggleComplete`; an active task with a
truthy `recurrenceRuleID` enters `completeRecurringTask`.

## Execution Path

The current occurrence is replaced rather than marked done. The workflow
loads the rule, calculates the next schedule, creates the replacement, copies
tags, attaches recurrence, refreshes its recurrence ID, deletes the old task,
then replaces local state and highlights the next occurrence.

```text
TaskCardMain status checkbox
  -> App.tsx toggleComplete -> api.getRecurrence
  -> TaskController.getRecurrence -> TaskRepository + RecurrenceRuleRepository
  -> App.tsx completeRecurringTask
  -> taskRecurrence.buildRecurringTaskSchedule
  -> api.createTask -> TaskController.createTask -> TaskRepository.save -> Task
  -> optional api.addTagToTask -> TaskController.addTag -> TagRepository + TaskRepository
  -> api.setRepeat -> TaskController.setRepeat -> RecurrenceRuleRepository + TaskRepository
  -> api.getTask -> TaskController.getTask -> TaskRepository
  -> api.deleteTask -> TaskController.deleteTask -> TaskRepository.deleteById
  -> App tasks + selection + platform scroll/highlight timers
```

## State Categories Involved

- **Persisted:** old and replacement tasks, tags, recurrence rule.
- **Derived:** next schedule and preserved duration.
- **Transient:** replacement workflow, selection, error.
- **Platform:** delayed scroll and highlight.

## Ownership Boundaries

`App.tsx` owns replacement ordering and local reconciliation;
`taskRecurrence.ts` owns calculation; `TaskController` owns each bounded
backend operation.

## ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-007: Recurring Task Replacement

## Tests

- `App.test.tsx`: next occurrence, duration preservation, and reactivation.
- `taskRecurrence.test.ts`, `api/tasks.test.ts`, `TaskControllerTest.java`.

## Failure Boundaries

Any failure in the multi-request replacement path sets
`Failed to complete recurring task.`. Earlier requests are not rolled back, so
failure can occur after the replacement or related records have been created.
Local replacement occurs only after old-task deletion succeeds.

# Delete Task

## User Intent

Delete one task after confirming the action.

## Entry Point

`TaskCardMain` action-menu Delete calls `handleDeleteTaskAction`, which shows
`ConfirmDelete`; its Delete button invokes `removeTask(taskID)`.

## Execution Path

```text
TaskCardMain Delete
  -> App.tsx handleDeleteTaskAction -> confirmDeleteId
  -> ConfirmDelete onConfirm
  -> App.tsx removeTask
  -> api.deleteTask
  -> TaskController.deleteTask
  -> TaskRepository.existsById + deleteById
  -> Task entity/database
  -> App tasks + useTaskDetailResources.clearDeletedTaskResources
  -> selected/detail edit state cleanup
```

## State Categories Involved

- **Persisted:** task deletion.
- **Transient:** confirmation target, selected task, active detail editor,
  error.
- **Presentation-local:** confirmation surface.

## Ownership Boundaries

`TaskCardMain` and `ConfirmDelete` render intent; `App.tsx` owns deletion and
cross-owner cleanup; `useTaskDetailResources` clears cached child resources.

## ADRs

- ADR-001: App.tsx Orchestration Owner

## Tests

- `App.test.tsx`: confirm, cancel, and delete-failure cases.
- `api/tasks.test.ts`: `deleteTask`.
- `TaskControllerTest.java`: delete found/not-found.

## Failure Boundaries

The confirmation can be canceled before transport. Backend/API failure sets
`Failed to delete task.`, keeps the task and cached resources, and then closes
the confirmation. A successful delete clears cached subtasks, notes, and
reminders; the current cache-clear function does not remove attachments.

# Bulk Complete

## User Intent

Mark all currently selected tasks done, respecting recurring-task semantics.

## Entry Point

`TaskListControls` bulk action bar Mark done button invokes
`App.tsx` `bulkMarkDone`.

## Execution Path

Each ID is handled sequentially. The workflow refreshes the task when
possible, probes recurrence for active tasks, delegates recurring tasks to the
replacement path, patches ordinary tasks done, then refreshes the complete
task list and clears selection.

```text
TaskListControls Mark done
  -> App.tsx bulkMarkDone reads useBulkSelection.bulkSelectedIds
  -> per ID: api.getTask -> TaskController.getTask -> TaskRepository
  -> taskDisplay.normalizeTaskStatus
  -> optional api.getRecurrence -> TaskController -> recurrence repository
  -> recurring: App.tsx completeRecurringTask -> replacement path
  -> ordinary: api.patchTaskStatus -> TaskController.patchTaskStatus -> TaskRepository.save
  -> api.getTasks -> TaskController.getTasks -> TaskRepository ordered query
  -> App tasks + useBulkSelection.clearBulkSelection
```

## State Categories Involved

- **Persisted:** task statuses or replacement tasks/tags/recurrence.
- **Derived:** normalized status and optional next schedules.
- **Transient:** bulk mode, selected IDs, workflow error.
- **Presentation-local:** bulk action bar.
- **Platform:** replacement scroll/highlight when recurrence participates.

## Ownership Boundaries

`useBulkSelection` owns selection only. `App.tsx` owns all mutations and
refresh. Recurrence calculation and backend bounded operations retain their
normal owners.

## ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-007: Recurring Task Replacement

## Tests

- `App.test.tsx`: ordinary, recurring, mixed, recurrence-probe, and cancel
  cases.
- `api/tasks.test.ts`, `taskRecurrence.test.ts`, `TaskControllerTest.java`.

## Failure Boundaries

`getTask` failure falls back to the local task. A recurrence probe can resolve
to no rule. Any uncaught mutation or final refresh failure stops the loop,
sets `Failed to update tasks.`, and leaves selection uncleared. Earlier
selected tasks may already be persisted.

# Bulk Delete

## User Intent

Delete all currently selected tasks.

## Entry Point

`TaskListControls` bulk action bar Delete button invokes `App.tsx`
`bulkDelete`.

## Execution Path

```text
TaskListControls Delete
  -> App.tsx bulkDelete reads useBulkSelection.bulkSelectedIds
  -> Promise.all(api.deleteTask)
  -> TaskController.deleteTask per ID
  -> TaskRepository.existsById + deleteById
  -> Task entities/database
  -> App tasks filter
  -> useBulkSelection.clearBulkSelection
```

## State Categories Involved

- **Persisted:** deleted tasks.
- **Transient:** bulk mode, selected IDs, error.
- **Presentation-local:** bulk action bar.

## Ownership Boundaries

`useBulkSelection` owns selected IDs; `App.tsx` owns deletion and primary task
reconciliation; `TaskController` owns each delete request.

## ADRs

- ADR-001: App.tsx Orchestration Owner

## Tests

- `App.test.tsx`: bulk Delete calls `deleteTask` for selected tasks.
- `api/tasks.test.ts`, `TaskControllerTest.java`.

## Failure Boundaries

Deletes execute concurrently. If any request rejects, `Promise.all` rejects,
`Failed to delete tasks.` is shown, and local tasks and selection are not
reconciled. Other concurrent deletes may already have succeeded in the
database.

# Create Project

## User Intent

Create a project from an inline project form and optionally apply it to the
current task draft.

## Entry Point

`InlineProjectForm` Create button or Enter calls one of `addProject` or
`addProjectInlineEdit`, depending on the rendered context.

## Execution Path

`useProjectTagCatalog.createProjectFromDraft` validates the trimmed draft,
persists the project, appends it to the catalog, and resets the draft.
`App.tsx` closes the form; edit-context creation also selects the project and
schedules immediate autosave.

```text
InlineProjectForm onSubmit
  -> App.tsx addProject or addProjectInlineEdit
  -> useProjectTagCatalog.createProjectFromDraft
  -> api.createProject
  -> ProjectController.createProject
  -> ProjectRepository.save
  -> Project entity/database
  -> hook projects + project draft
  -> App form visibility + optional editProjectID + scheduleAutoSave(0)
```

## State Categories Involved

- **Persisted:** project; possibly later task project assignment.
- **Draft:** new project title; edit project selection.
- **Transient:** error and optional autosave timer.
- **Presentation-local:** inline form visibility.
- **Platform:** input focus; timer in edit context.

## Ownership Boundaries

`useProjectTagCatalog` owns catalog draft, persistence, and catalog state.
`App.tsx` owns form coordination and applying a new project to task drafts.

## ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-008: No Backend Service Layer

## Tests

- `App.test.tsx`: creating a project from inline edit applies it on save.
- `api/tasks.test.ts`: `createProject`.
- `ProjectControllerTest.java`: valid and validation cases.

## Failure Boundaries

Blank trimmed titles return before transport. API failure sets
`Failed to create project.`, returns `null`, and leaves the form/draft for
correction. Edit-context task assignment is not changed when creation fails.

# Create Tag

## User Intent

Create a colored tag and optionally select it in the create or edit task
draft.

## Entry Point

`InlineTagForm` Create button or Enter invokes `addTagInline` or
`addTagInlineEdit`.

## Execution Path

```text
InlineTagForm onSubmit
  -> App.tsx addTagInline or addTagInlineEdit
  -> useProjectTagCatalog.createTagFromDraft
  -> api.createTag
  -> TagController.createTag
  -> TagRepository.save
  -> Tag entity/database
  -> hook tags + tag draft/color reset
  -> App create/edit selected tag IDs + form visibility
  -> edit context: scheduleAutoSave(0)
```

## State Categories Involved

- **Persisted:** tag; task/tag association occurs during later task save.
- **Draft:** new tag title/color and selected task-draft tag IDs.
- **Transient:** error and optional autosave timer.
- **Presentation-local:** inline form and color picker.
- **Platform:** input focus; timer in edit context.

## Ownership Boundaries

The catalog hook owns tag creation and catalog state. `App.tsx` owns applying
the resulting tag ID to create/edit drafts and any subsequent task save.

## ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-008: No Backend Service Layer

## Tests

- `App.test.tsx`: creating a tag from inline edit applies it on save.
- `api/tasks.test.ts`: `createTag`.
- `TagControllerTest.java`: creation and title/color validation.

## Failure Boundaries

Blank titles stop before transport. API or backend validation failure sets
`Failed to create tag.`, returns `null`, and does not select or close the
draft form.

# Delete Tag

## User Intent

Delete a tag catalog record and remove its local references from tasks,
drafts, and the active filter.

## Entry Point

Tag dropdown delete buttons rendered in `App.tsx` invoke `removeTag(tagID)`.

## Execution Path

```text
Tag dropdown delete button
  -> App.tsx removeTag
  -> useProjectTagCatalog.deleteTagFromCatalog
  -> api.deleteTag
  -> TagController.deleteTag
  -> TagRepository.existsById + deleteById
  -> Tag entity/database and TaskTag relationship effects
  -> hook tags
  -> App tasks + create/edit tag drafts + active tag filter
```

## State Categories Involved

- **Persisted:** deleted tag and database associations.
- **Draft:** selected create/edit tag IDs.
- **Derived:** tag-filtered visible tasks update from changed controls/tasks.
- **Transient:** error.
- **Presentation-local:** tag dropdown and active filter.

## Ownership Boundaries

The catalog hook owns deletion from the persisted catalog. `App.tsx` owns
cross-domain reconciliation because it owns tasks and task drafts.

## ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-008: No Backend Service Layer

## Tests

- `api/tasks.test.ts`: `deleteTag`.
- `TagControllerTest.java`: delete found/not-found.
- No dedicated frontend test currently covers the complete reconciliation.

## Failure Boundaries

The hook catches failure, sets `Failed to delete tag.`, and returns `false`.
`App.tsx` then performs no task, draft, or filter reconciliation. Successful
frontend reconciliation assumes the backend/database has handled persisted
task-tag associations.

# Create Reminder

## User Intent

Add a dated reminder to the selected task.

## Entry Point

`RemindersSection` Add Reminder button invokes the callback wired by `App.tsx`
to `useTaskDetailResources.addReminder(selectedTaskId)`.

## Execution Path

The hook requires a date, optionally requests browser notification permission,
builds a local date/time string, creates the reminder, appends it to the
task-keyed reminder map, and resets its draft.

```text
RemindersSection Add Reminder
  -> useTaskDetailResources.addReminder
  -> optional platform Notification.requestPermission
  -> dateTime.buildDateTimeString
  -> api.createReminder
  -> ReminderController.createReminder
  -> ParentTaskGuard -> TaskRepository.existsById -> Task
  -> ReminderRepository.save -> Reminder entity/database
  -> hook reminders[taskId] + reminder draft reset
```

## State Categories Involved

- **Persisted:** reminder.
- **Draft:** reminder date, time, and message.
- **Transient:** top-level error.
- **Presentation-local:** reminder section and date/time controls.
- **Platform:** browser notification permission.

## Ownership Boundaries

`RemindersSection` renders intent; `useTaskDetailResources` owns reminder
draft/CRUD; `ParentTaskGuard` owns parent existence; `App.tsx` does not own
creation but later owns delivery.

## ADRs

- ADR-006: Reminder Ownership Split
- ADR-008: No Backend Service Layer

## Tests

- `api/tasks.test.ts`: `createReminder`.
- `ReminderControllerTest.java`: create, missing parent, and validation.
- No dedicated frontend workflow test currently covers reminder creation.

## Failure Boundaries

No selected date stops before permission or transport. Permission request is
awaited outside the request `try`; a rejected permission promise can escape
the hook's API error handling. API/backend failure sets
`Failed to create reminder.` and preserves the reminder draft.

# Snooze Reminder

## User Intent

Move a delivered reminder to one hour later or tomorrow.

## Entry Point

`ToastList` snooze buttons call `onSnooze`, wired to `App.tsx`
`snoozeToast(toast, minutes)`.

## Execution Path

```text
ToastList snooze button
  -> App.tsx snoozeToast
  -> dateTime.toLocalDateTimeString(now + minutes)
  -> api.patchReminderDate
  -> ReminderController.patchReminder
  -> ReminderRepository.findById + save
  -> Reminder entity/database
  -> App firedReminders removal
  -> useTaskDetailResources.setReminders reconciliation
  -> App dismissToast
```

## State Categories Involved

- **Persisted:** reminder due date.
- **Derived:** new due date.
- **Transient:** toast queue and fired-reminder suppression.
- **Presentation-local:** toast actions.
- **Platform:** current time.

## Ownership Boundaries

`ToastList` renders intent; `App.tsx` owns snooze coordination and transient
delivery state; `useTaskDetailResources` owns the persisted reminder working
copy; `ReminderController` owns the patch endpoint.

## ADRs

- ADR-006: Reminder Ownership Split
- ADR-008: No Backend Service Layer

## Tests

- `api/tasks.test.ts`: `patchReminderDate`.
- `dateTime.test.ts`.
- `ReminderControllerTest.java`: patch found/not-found/validation.
- No dedicated `App.test.tsx` covers the complete snooze workflow.

## Failure Boundaries

Patch failure is silently ignored because the reminder may already be
deleted. On failure, fired-reminder suppression and hook reminder state are
unchanged, but the toast is still dismissed.

# Create Note

## User Intent

Add note text to the selected task.

## Entry Point

`DetailNotesPanel` Add Note button invokes the callback wired to
`useTaskDetailResources.addNote(selectedTaskId)`.

## Execution Path

```text
DetailNotesPanel Add Note
  -> useTaskDetailResources.addNote
  -> api.createNote(taskId, empty title, trimmed content)
  -> NoteController.createNote
  -> ParentTaskGuard -> TaskRepository.existsById -> Task
  -> NoteController assigns taskID + timestamp
  -> NoteRepository.save -> Note entity/database
  -> hook notes[taskId] + note draft reset
```

## State Categories Involved

- **Persisted:** note.
- **Draft:** new note content.
- **Transient:** selected task and error.
- **Presentation-local:** expanded notes section.

## Ownership Boundaries

`DetailNotesPanel` emits intent; the detail-resource hook owns note draft,
persistence, and local reconciliation; backend controller/guard/repository own
the request path.

## ADRs

- ADR-008: No Backend Service Layer

## Tests

- `api/tasks.test.ts`: `createNote`.
- `NoteControllerTest.java`: creation, missing parent, timestamp, and accepted
  empty title.
- No dedicated frontend workflow test currently covers note creation.

## Failure Boundaries

Blank trimmed content stops before transport. Missing parent produces 404;
validation/transport failures set `Failed to create note.` and preserve the
draft.

# Create Subtask

## User Intent

Add a subtask to the selected task.

## Entry Point

`DetailSubtasksPanel` Add button invokes the callback wired to
`useTaskDetailResources.addSubtask(selectedTaskId)`.

## Execution Path

```text
DetailSubtasksPanel Add
  -> useTaskDetailResources.addSubtask
  -> api.createSubtask
  -> SubtaskController.createSubtask
  -> ParentTaskGuard -> TaskRepository.existsById -> Task
  -> SubtaskController assigns parentTaskID and clears incoming ID
  -> SubtaskRepository.save -> Subtask entity/database
  -> hook subtasks[taskId] + subtask draft reset
```

## State Categories Involved

- **Persisted:** subtask.
- **Draft:** new subtask title.
- **Transient:** selected task and error.
- **Presentation-local:** expanded subtasks section.

## Ownership Boundaries

The detail panel renders intent; `useTaskDetailResources` owns subtask
draft/CRUD; `ParentTaskGuard` and `SubtaskController` own backend validation
and mutation.

## ADRs

- ADR-008: No Backend Service Layer

## Tests

- `api/tasks.test.ts`: `createSubtask`.
- `SubtaskControllerTest.java`: creation, missing parent, validation, and ID
  handling.
- No dedicated frontend workflow test currently covers subtask creation.

## Failure Boundaries

Blank trimmed title stops before transport. Missing parent or validation/API
failure sets `Failed to create subtask.` and preserves the draft.

# Open Task From Calendar

## User Intent

Select a calendar task and return to its task-list/detail presentation.

## Entry Point

Calendar task buttons call `onEditTask(taskID)`, wired to
`App.tsx` `openTaskFromCalendar`.

## Execution Path

The common path switches to the Tasks mobile page, clears list controls, and
schedules scroll/highlight. Desktop then selects the task without transport.
Mobile delegates to `openPanel`, which starts edit and loads detail resources.

```text
Calendar task button
  -> App.tsx openTaskFromCalendar
  -> App mobilePage + focusTaskById
  -> list-control reset + platform scroll/highlight timer
  -> desktop: App selectedTaskId only
  -> mobile: App openPanel
       -> startEdit -> taskEditDraft + api.getTask + optional api.getRecurrence
       -> useTaskDetailResources.loadTaskSections
       -> api.getSubtasks/getNotes/getReminders/getAttachments
       -> Task/detail controllers -> repositories -> entities/database
       -> shared draft + selected task + resource maps
```

## State Categories Involved

- **Persisted:** tasks already loaded; mobile may refresh task/detail records.
- **Draft:** mobile shared edit draft.
- **Derived:** calendar task subset.
- **Transient:** selected task and detail-resource loading/error.
- **Presentation-local:** calendar state, mobile page, list filters.
- **Platform:** layout detection, scroll, highlight timer.

## Ownership Boundaries

`Calendar` owns calendar-local presentation and emits the task ID. `App.tsx`
owns cross-presentation navigation/selection. The detail hook owns loaded
child resources.

## ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-002, ADR-004, and ADR-005 on the mobile path

## Tests

- `Calendar.test.tsx`.
- Calendar/mobile navigation, selection, edit entry, and focus tests in
  `App.test.tsx`.
- No dedicated test currently names the complete calendar-click transition.

## Failure Boundaries

If the task is already selected, the method returns after navigation/focus
preparation. If the task ID is absent from local tasks, it returns without
selection. Mobile task refresh failures fall back during `startEdit`; a
detail-resource read failure sets `Failed to load task details.` for the
combined resource load.

# Mobile Edit Entry

## User Intent

Tap a task on mobile and edit it in the dedicated task-list row.

## Entry Point

`TaskCardMain` root click calls `onOpenTask`, wired to
`handleTaskCardClick(task)`. With `mobileEditLayout` true, it calls
`openPanel(task)`.

## Execution Path

`openPanel` flushes a previously selected task if necessary, selects the new
task, starts the shared edit draft, loads detail resources, and causes
`App.tsx` to render `renderInlineEditForm(task, 'mobile')` inside
`.mobile-edit-row`. Focus events then activate the global focus/viewport
guard.

```text
TaskCardMain onOpenTask
  -> App.tsx handleTaskCardClick -> openPanel
  -> optional saveEdit(previous task)
  -> App selected/detail edit state
  -> App startEdit -> taskEditDraft.deriveTaskEditDraft
       -> api.getTask + optional api.getRecurrence -> TaskController -> repositories
  -> useTaskDetailResources.loadTaskSections
       -> detail GET APIs -> resource controllers + ParentTaskGuard -> repositories
  -> App renderInlineEditForm(..., mobile) -> .mobile-edit-row
  -> platform focusin/touch/scroll/visualViewport guard
```

## State Categories Involved

- **Persisted:** refreshed task, recurrence, and detail resources.
- **Draft:** shared edit draft.
- **Transient:** selected task, active editor, loading/error, focus sequence.
- **Presentation-local:** dedicated mobile edit row/panel.
- **Platform:** coarse/mobile layout, DOM focus scopes, touch, scroll,
  `visualViewport`.

## Ownership Boundaries

`TaskCardMain` emits intent. `App.tsx` owns mobile placement, selected task,
shared draft, previous-task flush, and platform guard. The detail hook owns
resource maps and drafts.

## ADRs

- ADR-001: App.tsx Orchestration Owner
- ADR-002: Shared Edit Draft
- ADR-003: Autosave Ownership
- ADR-004: Mobile Edit Row
- ADR-005: iOS Focus Guard

## Tests

- Extensive mobile edit placement, scroll-owner, shared save, focus-scope,
  touch, stale-blur, and viewport tests in `App.test.tsx`.
- Task/detail API and backend controller tests protect the read paths.

## Failure Boundaries

Opening the already selected task calls `closePanel`, which flushes pending
edit state. A previous selected task is saved before switching. Task refresh
failure falls back to local tag state; recurrence failure clears repeat draft;
any combined detail-resource load failure sets `Failed to load task details.`.
Platform drift is corrected through repeated guarded callbacks.

# Reminder Toast Delivery

## User Intent

Receive an in-app toast when a loaded reminder becomes due.

## Entry Point

An `App.tsx` effect runs whenever hook-owned `reminders` or primary `tasks`
change. It immediately calls `check` and then repeats every 30 seconds with
`setInterval`.

## Execution Path

Delivery is frontend-only. The effect flattens reminders already loaded by
`useTaskDetailResources`, skips IDs in `firedReminders`, parses each due date,
looks up the task title, marks the reminder fired, and appends a toast.
`ToastList` renders it; dismissal removes it from the queue.

```text
useTaskDetailResources reminder map or App tasks change
  -> App.tsx reminder-delivery useEffect
  -> check immediately + platform setInterval(30000)
  -> dateTime.parseLocalDateTime
  -> App firedReminders duplicate check
  -> App task-title lookup + toast queue append
  -> ToastList render
  -> optional ToastList Dismiss -> App dismissToast

No API/controller/repository executes during delivery.
```

## State Categories Involved

- **Persisted:** loaded reminder and task working copies are read.
- **Derived:** due comparison and task-title lookup.
- **Transient:** fired-reminder suppression and toast queue.
- **Presentation-local:** rendered toast.
- **Platform:** current time and interval lifecycle.

## Ownership Boundaries

`useTaskDetailResources` owns persisted reminder records. `App.tsx` owns
polling, due detection, suppression, and toast state. `ToastList` owns
presentation; it only auto-dismisses confirmation toasts, not reminder toasts.

## ADRs

- ADR-006: Reminder Ownership Split

## Tests

- Relevant toast behavior in `App.test.tsx`; confirmation auto-dismiss is
  directly covered.
- `dateTime.test.ts` protects parsing behavior.
- No dedicated frontend test currently covers due-reminder polling and
  duplicate suppression end to end.

## Failure Boundaries

Only reminders loaded into the running frontend are polled. If no reminders
are loaded, no interval is created. Invalid or unexpected due-date parsing can
affect comparison behavior without an explicit error path. Delivery performs
no backend request and does not retry or persist fired state across sessions.

# Most Complex Execution Paths

The ranking below reflects the current number of participating owners, state
categories, and cross-domain coordination. It does not rank user importance.

| Rank | Workflow | Owners involved | State categories involved | Cross-domain coordination |
| --- | --- | --- | --- | --- |
| 1 | Mobile Edit Entry | `TaskCardMain`, `App.tsx`, shared draft utilities, detail hook, API, task/detail controllers, guard/repositories, platform guard | Persisted, draft, transient, presentation-local, platform | Previous-task flush, selection, editing, four child-resource reads, mobile placement, focus/viewport protection |
| 2 | Complete Recurring Task | `TaskCardMain`, `App.tsx`, recurrence utility, API, task controller, task/tag/recurrence repositories | Persisted, derived, transient, platform | Rule read, replacement create, tag copy, recurrence attach, old deletion, selection and DOM reconciliation |
| 3 | Bulk Complete | `TaskListControls`, bulk-selection hook, `App.tsx`, recurrence utility, API, task controller, task/tag/recurrence repositories | Persisted, derived, transient, presentation-local, platform when recurring | Per-task refresh/probe, mixed ordinary and replacement completion, final collection refresh |
| 4 | Edit Task | Multiple edit presentations, `App.tsx`, draft/schedule/form utilities, API, task controller, task/tag/recurrence repositories | Persisted, draft, derived, transient, presentation-local, platform | Shared draft initialization, base save, tag reconciliation, recurrence reconciliation, multiple presentations |
| 5 | Create Task | Create components, `App.tsx`, catalog inputs, schedule/form utilities, API, task controller, task/tag/recurrence repositories | Persisted, draft, derived, transient, presentation-local, platform | Base creation followed by optional recurrence and tag associations, then reset/toast |
| 6 | Autosave | Detail components, `App.tsx`, timer/refs, save workflow, API and backend task owners | Persisted, draft, derived, transient, platform | Delayed current-task resolution, complete edit workflow, panel close/switch flushing |
| 7 | Open Task From Calendar | `Calendar`, derived view model, `App.tsx`, optional detail hook/API/backend owners | Persisted, draft on mobile, derived, transient, presentation-local, platform | Calendar-to-list transition, filter reset, selection, optional mobile edit/resource loading |
| 8 | Delete Tag | Tag presentation, `App.tsx`, catalog hook, API, tag controller/repository | Persisted, draft, derived, transient, presentation-local | Catalog deletion followed by task, create/edit draft, and filter reconciliation |
| 9 | Snooze Reminder | `ToastList`, `App.tsx`, date utility, detail hook setter, API, reminder controller/repository | Persisted, derived, transient, presentation-local, platform | Persisted due-date update plus delivery-suppression, resource-map, and toast reconciliation |
| 10 | Create Reminder | Reminder presentation, detail hook, date utility, API, reminder controller, parent guard, task/reminder repositories, Notification platform | Persisted, draft, transient, presentation-local, platform | Permission, date construction, parent validation, persistence, resource-map update |
| 11 | Delete Task | Task card, confirmation, `App.tsx`, detail hook cleanup, API, task controller/repository | Persisted, transient, presentation-local | Durable deletion plus primary-task, resource-cache, selection, and editor cleanup |
| 12 | Reminder Toast Delivery | Detail hook records, `App.tsx`, date utility, `ToastList`, platform timer | Persisted, derived, transient, presentation-local, platform | Application-lifecycle polling joins reminder records with task titles and duplicate suppression |
| 13 | Bulk Delete | Task controls, bulk-selection hook, `App.tsx`, API, task controller/repository | Persisted, transient, presentation-local | Concurrent deletions plus task-list and selection reconciliation |
| 14 | Create Tag | Inline tag form, `App.tsx`, catalog hook, API, tag controller/repository | Persisted, draft, transient, presentation-local, platform | Catalog creation plus optional task-draft selection and autosave scheduling |
| 15 | Create Project | Inline project form, `App.tsx`, catalog hook, API, project controller/repository | Persisted, draft, transient, presentation-local, platform | Catalog creation plus optional task-draft assignment and autosave scheduling |
| 16 | Create Note | Notes panel, detail hook, API, note controller, parent guard, task/note repositories | Persisted, draft, transient, presentation-local | Parent validation, server timestamp, resource-map update |
| 17 | Create Subtask | Subtask panel, detail hook, API, subtask controller, parent guard, task/subtask repositories | Persisted, draft, transient, presentation-local | Parent validation, resource creation, resource-map update |
| 18 | Complete Task | Task card, `App.tsx`, status utility, API, task controller/repository | Persisted, derived, transient | One bounded status mutation and local replacement |
