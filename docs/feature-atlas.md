# Task Manager Feature Atlas

## Purpose

This atlas catalogs current user-visible features and the implementation areas
that support them. It identifies the owners, state categories, transport,
utilities, tests, architecture decisions, and documented workflows associated
with each feature.

"None" means the feature does not use that layer in the current
implementation. It does not imply missing behavior.

---

# Task Creation

## User Behavior

Users enter a title, description, schedule, priority, project, tags, and
optional recurrence, then add the task to the task list.

## Frontend Owners

- `App.tsx`: create draft, validation flow, `addTask`, mutation ordering,
  primary task update, draft reset, and confirmation toast.
- Create-task components: `TaskEditorFields`, `RecurrenceControl`,
  `TagProjectChips`, `TaskTags`, `SelectedProjectChip`, and `AddTaskPreview`.
- `useProjectTagCatalog`: supplies project/tag catalog records and catalog
  creation actions.

## Backend Owners

- `TaskController`, `TaskRepository`, and `Task`.
- `RecurrenceRuleRepository` and `RecurrenceRule` when recurrence is selected.
- `TagRepository` and the `Task.tags` relationship when tags are selected.

## State Categories

- **Persisted:** created task, recurrence rule, and task/tag associations.
- **Draft:** create-task field values.
- **Derived:** create preview and formatted schedule values.
- **Transient:** validation feedback and confirmation toast.
- **Presentation:** create dropdown and date/time selector visibility.
- **Platform:** create-field focus and mobile text-entry protection.

## APIs

- `createTask`
- `setRepeat`
- `addTagToTask`

## Utilities

- `taskScheduling.ts`
- `taskForm.ts`
- `dateTime.ts`

## Tests

- `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/api/tasks.test.ts`
- `taskmanager-frontend/src/utils/taskScheduling.test.ts`
- `taskmanager-frontend/src/utils/taskForm.test.ts`
- `src/test/java/com/example/taskmanager/TaskControllerTest.java`

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)

## Sequence Diagrams

- [Create Task](sequence-diagrams.md#1-create-task)

---

# Task Editing

## User Behavior

Users open inline, mobile, or detail-panel editing; change task fields,
project, tags, schedule, or recurrence; then save explicitly or through
detail-panel autosave.

## Frontend Owners

- `App.tsx`: selected-task lifecycle, shared edit draft, `startEdit`,
  `saveEdit`, task/tag and recurrence reconciliation, and primary task update.
- `renderInlineEditForm`: shared inline/mobile edit presentation.
- Detail components: `DetailDescriptionField`, `DetailScheduleFields`,
  `DetailRepeatRow`, `DetailStatusBadges`, and `DetailHeader`.
- Create-task field components reused as edit presentation controls.

## Backend Owners

- `TaskController`, `TaskRepository`, and `Task`.
- `TagRepository` and `Task.tags`.
- `RecurrenceRuleRepository` and `RecurrenceRule`.

## State Categories

- **Persisted:** task, tag associations, and recurrence rule.
- **Draft:** one shared edit draft.
- **Transient:** selected task, active editor identity, validation feedback,
  and pending save state.
- **Presentation:** edit dropdowns and expanded detail sections.
- **Platform:** focus, DOM placement, and mobile edit conditions.

## APIs

- `getTask`
- `getRecurrence`
- `updateTask`
- `addTagToTask`
- `removeTagFromTask`
- `setRepeat`

## Utilities

- `taskEditDraft.ts`
- `taskScheduling.ts`
- `taskForm.ts`
- `taskTimeShift.ts`
- `dateTime.ts`

## Tests

- `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/api/tasks.test.ts`
- Edit, schedule, form, and time-shift utility tests.
- `src/test/java/com/example/taskmanager/TaskControllerTest.java`

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)
- [ADR-002: Shared Edit Draft](adr/ADR-002-shared-edit-draft.md)
- [ADR-003: Autosave Ownership](adr/ADR-003-autosave-ownership.md)

## Sequence Diagrams

- [Edit Task and Autosave](sequence-diagrams.md#2-edit-task-and-autosave)

---

# Autosave

## User Behavior

Detail-panel field changes save after a debounce. Closing or switching task
panels flushes pending edits. Inline and mobile editors normally use explicit
Save while sharing the same complete save workflow.

## Frontend Owners

- `App.tsx`: autosave timer, current-task/save refs, `scheduleAutoSave`,
  flushing, `saveEdit`, and reconciliation.
- Detail-panel field components emit changes that schedule autosave.

## Backend Owners

- Same persisted owners as task editing: `TaskController`, `TaskRepository`,
  `Task`, `TagRepository`, and `RecurrenceRuleRepository`.

## State Categories

- **Persisted:** saved task, tag associations, and recurrence.
- **Draft:** shared edit draft.
- **Transient:** timer, current-save refs, selected task, and pending workflow.

## APIs

- `updateTask`
- `addTagToTask`
- `removeTagFromTask`
- `setRepeat`
- `getTask`

## Utilities

- `taskScheduling.ts`
- `taskForm.ts`

## Tests

- `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/api/tasks.test.ts`
- `src/test/java/com/example/taskmanager/TaskControllerTest.java`

## ADRs

- [ADR-002: Shared Edit Draft](adr/ADR-002-shared-edit-draft.md)
- [ADR-003: Autosave Ownership](adr/ADR-003-autosave-ownership.md)

## Sequence Diagrams

- [Edit Task and Autosave](sequence-diagrams.md#2-edit-task-and-autosave)

---

# Recurrence

## User Behavior

Users assign or clear an interval-based recurrence rule made from
`intervalValue` and `intervalUnit`. Supported units are day, week, month, and
year with limits of 1-7 days, 1-4 weeks, 1-12 months, and 1-5 years. Legacy
`daily`, `weekly`, and `monthly` frequency values normalize to one-day,
one-week, and one-month intervals. Completing an active recurring task replaces
it with the next occurrence while preserving duration and metadata.

## Frontend Owners

- `App.tsx`: recurrence selection during create/edit, `toggleComplete`,
  `completeRecurringTask`, replacement ordering, local replacement, selection,
  scrolling, and highlighting.
- `RecurrenceControl` and `DetailRepeatRow`: recurrence presentation.

## Backend Owners

- `TaskController`, `TaskRepository`, and `Task`.
- `RecurrenceRuleRepository` and `RecurrenceRule`.
- `TagRepository` when replacement task tags are copied.

## State Categories

- **Persisted:** task and recurrence rule.
- **Draft:** selected create/edit recurrence interval.
- **Derived:** next schedule, preserved duration, and display labels such as `Every day`, `Every 2 weeks`, and `Every 3 months`.
- **Transient:** replacement workflow, highlight, and selected-task cleanup.

## APIs

- `getRecurrence`
- `setRepeat`
- `createTask`
- `getTask`
- `addTagToTask`
- `deleteTask`

## Utilities

- `taskRecurrence.ts`
- `taskScheduling.ts`
- `dateTime.ts`

## Tests

- `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/utils/taskRecurrence.test.ts`
- `taskmanager-frontend/src/api/tasks.test.ts`
- `src/test/java/com/example/taskmanager/TaskControllerTest.java`

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)
- [ADR-007: Recurring Task Replacement](adr/ADR-007-recurring-task-replacement.md)

## Sequence Diagrams

- [Complete Recurring Task](sequence-diagrams.md#3-complete-recurring-task)
- [Bulk Complete Recurring Tasks](sequence-diagrams.md#4-bulk-complete-recurring-tasks)

---

# Projects

## User Behavior

Users create, search, sort/filter, rename, delete, and bulk-create or
bulk-delete projects in Project Management. They assign a project during task
creation or editing, display project labels, and filter tasks by project.
Project rows show usage counts, and create/search/list controls, rename/edit
mode, bulk selection, and delete confirmations are mutually exclusive
interaction modes.

## Frontend Owners

- `useProjectTagCatalog`: project records, loading, catalog-level creation,
  deletion, and API state.
- `App.tsx`: assignment in task drafts, dropdown coordination, project-deletion
  reconciliation into tasks, selected-task state, drafts, and filters, and
  active project filter.
- Project chips, inline project form, task-list, and detail components render
  project choices and labels.

## Backend Owners

- `ProjectController`, `ProjectRepository`, and `Project`.
- `TaskController`, `TaskRepository`, and `Task.projectID` for assignment.

## State Categories

- **Persisted:** projects and task project assignment.
- **Draft:** task draft project selection and catalog-management
  bulk-create/rename text.
- **Derived:** displayed project lookup and project-filtered task list.
- **Presentation:** project dropdown visibility plus catalog-management search,
  sort/filter, bulk selection, delete confirmation, and mobile modal state.

## APIs

- `getProjects`
- `createProject`
- `updateProject`
- `deleteProject`
- `createTask`
- `updateTask`

## Utilities

- `taskDisplayHelpers.ts`
- `taskFiltering.ts`

## Tests

- `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/api/tasks.test.ts`
- `taskmanager-frontend/src/utils/taskDisplayHelpers.test.ts`
- `taskmanager-frontend/src/utils/taskFiltering.test.ts`
- `src/test/java/com/example/taskmanager/ProjectControllerTest.java`
- `src/test/java/com/example/taskmanager/TaskControllerTest.java`

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)

## Sequence Diagrams

- No project-specific sequence diagram. Project assignment participates in
  [Create Task](sequence-diagrams.md#1-create-task) and
  [Edit Task and Autosave](sequence-diagrams.md#2-edit-task-and-autosave).

---

# Tags

## User Behavior

Users create, color, search, sort/filter, rename, delete, bulk-create,
bulk-delete, assign, remove, display, expand, and filter by tags. Tag rows show
usage counts, bulk-created tags share the selected new-tag color, and
create/search/list controls, rename/edit mode, bulk selection, and delete
confirmations are mutually exclusive interaction modes.

## Frontend Owners

- `useProjectTagCatalog`: tag records, loading, catalog-level creation,
  color/title updates, deletion, and API state.
- `App.tsx`: task/tag assignment, dropdown/focus coordination, tag deletion
  reconciliation into tasks, selected-task state, drafts, and filters, and
  active tag filter.
- `TaskTags`, `TagProjectChips`, `InlineTagForm`, and `TagColorPicker`:
  presentation.

## Backend Owners

- `TagController`, `TagRepository`, and `Tag`.
- `TaskController`, `TaskRepository`, and the `Task.tags` relationship.

## State Categories

- **Persisted:** tags, colors, and task/tag associations.
- **Draft:** new-tag fields and selected task-draft tag IDs.
- **Derived:** tag lookup, display, and tag-filtered tasks.
- **Presentation:** tag dropdown, expanded rows, inline form, and color picker.

## APIs

- `getTags`
- `createTag`
- `updateTag`
- `deleteTag`
- `addTagToTask`
- `removeTagFromTask`

## Utilities

- `taskDisplayHelpers.ts`
- `taskFiltering.ts`

## Tests

- `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/api/tasks.test.ts`
- `taskmanager-frontend/src/utils/taskDisplayHelpers.test.ts`
- `taskmanager-frontend/src/utils/taskFiltering.test.ts`
- `src/test/java/com/example/taskmanager/TagControllerTest.java`
- `src/test/java/com/example/taskmanager/TaskControllerTest.java`

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)

## Sequence Diagrams

- [Delete Tag and Reconcile Tasks](sequence-diagrams.md#6-delete-tag-and-reconcile-tasks)
- Tag assignment also participates in the create, edit, and recurrence
  sequences.

---

# Bulk Selection

## User Behavior

Users enter bulk mode, select task cards, mark selected tasks done, delete
selected tasks, or cancel selection.

## Frontend Owners

- `useBulkSelection`: bulk mode, selected task IDs, toggling, and clearing.
- `App.tsx`: bulk completion, recurrence-aware replacement, bulk deletion,
  errors, and primary task reconciliation.
- Task-list components render selection controls and the bulk action bar.

## Backend Owners

- `TaskController`, `TaskRepository`, and `Task`.
- Recurrence and tag repositories when selected recurring tasks are replaced.

## State Categories

- **Persisted:** task status or replacement/deletion results.
- **Transient:** bulk mode, selected IDs, and bulk workflow progress.
- **Presentation:** bulk action bar visibility.

## APIs

- `patchTaskStatus`
- `deleteTask`
- Recurrence replacement APIs when applicable.

## Utilities

- `taskRecurrence.ts` for recurring selected tasks.

## Tests

- `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/api/tasks.test.ts`
- `taskmanager-frontend/src/utils/taskRecurrence.test.ts`
- `src/test/java/com/example/taskmanager/TaskControllerTest.java`

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)
- [ADR-007: Recurring Task Replacement](adr/ADR-007-recurring-task-replacement.md)

## Sequence Diagrams

- [Bulk Complete Recurring Tasks](sequence-diagrams.md#4-bulk-complete-recurring-tasks)

---

# Calendar

## User Behavior

Users browse task schedules in overview, month, week, day, and agenda-style
calendar presentations; hide completed tasks; navigate dates; and open tasks.

## Frontend Owners

- `Calendar`: calendar rendering, local selected date/view, picker visibility,
  navigation, and desktop-layout detection.
- `useTaskListViewModel`: derived calendar task subset.
- `App.tsx`: calendar task opening, task visibility, selection, detail loading,
  and mobile page transition.

## Backend Owners

- None for calendar behavior. Calendar uses the task collection already loaded
  through `TaskController` and `TaskRepository`.

## State Categories

- **Derived:** calendar task subset.
- **Presentation:** calendar date, view, pickers, and hide-completed control.
- **Transient:** task-opening workflow.
- **Platform:** desktop-calendar media-query detection.

## APIs

- No calendar-specific API. Opening a mobile task may use `getTask`,
  `getRecurrence`, and detail-resource reads.

## Utilities

- `dateTime.ts`
- `taskDisplay.ts`

## Tests

- `taskmanager-frontend/src/components/Calendar.test.tsx`
- Relevant calendar-opening, swipe, and task-selection cases in
  `taskmanager-frontend/src/App.test.tsx`

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)

## Sequence Diagrams

- [Open Task From Calendar](sequence-diagrams.md#7-open-task-from-calendar)

---

# Statistics

## User Behavior

Users open a statistics modal and view counts and summaries derived from the
current task collection.

## Frontend Owners

- `useTaskListViewModel`: statistics derivation.
- `StatsModal`: statistics presentation.
- `App.tsx`: modal visibility, focus restoration, and source task collection.

## Backend Owners

- None. Statistics are derived from frontend task state.

## State Categories

- **Derived:** statistics data.
- **Presentation:** modal visibility.
- **Platform:** modal focus restoration.

## APIs

- None specific. Statistics use tasks loaded by `getTasks`.

## Utilities

- `taskStatistics.ts`

## Tests

- `taskmanager-frontend/src/utils/taskStatistics.test.ts`
- Statistics modal cases in `taskmanager-frontend/src/App.test.tsx`

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)

## Sequence Diagrams

- None.

---

# Notes

## User Behavior

Users open a task detail panel, add text notes, view notes, and delete notes.

## Frontend Owners

- `useTaskDetailResources`: task-keyed note records, note draft, loading,
  creation, deletion, and local reconciliation.
- `DetailAuxiliaryPanels`: note presentation.
- `App.tsx`: selected-task and detail-panel lifecycle.

## Backend Owners

- `NoteController`, `NoteRepository`, `Note`, and `ParentTaskGuard`.

## State Categories

- **Persisted:** notes.
- **Draft:** new-note content.
- **Transient:** selected task and detail-resource loading.
- **Presentation:** detail-section expansion.

## APIs

- `getNotes`
- `createNote`
- `deleteNote`

## Utilities

- None specific.

## Tests

- `taskmanager-frontend/src/api/tasks.test.ts`
- No dedicated frontend workflow test currently covers note CRUD.
- `src/test/java/com/example/taskmanager/NoteControllerTest.java`

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)
- [ADR-008: No Backend Service Layer](adr/ADR-008-no-backend-service-layer.md)

## Sequence Diagrams

- None specific. Loading notes participates in
  [Mobile Edit Entry and Focus Protection](sequence-diagrams.md#8-mobile-edit-entry-and-focus-protection).

---

# Subtasks

## User Behavior

Users add subtasks, edit subtask titles, mark subtasks active/done, view them,
and delete them from a task detail panel.

## Frontend Owners

- `useTaskDetailResources`: task-keyed subtask records, create/edit drafts,
  loading, status toggling, title updates, deletion, and reconciliation.
- `DetailAuxiliaryPanels`: subtask presentation.
- `App.tsx`: selected-task and detail-panel lifecycle.

## Backend Owners

- `SubtaskController`, `SubtaskRepository`, `Subtask`, and `ParentTaskGuard`.

## State Categories

- **Persisted:** subtasks.
- **Draft:** new and editing subtask titles.
- **Transient:** selected task and active subtask edit identity.
- **Presentation:** expanded detail section.

## APIs

- `getSubtasks`
- `createSubtask`
- `updateSubtask`
- `patchSubtaskStatus`
- `deleteSubtask`

## Utilities

- None specific.

## Tests

- `taskmanager-frontend/src/api/tasks.test.ts`
- No dedicated frontend workflow test currently covers subtask CRUD.
- `src/test/java/com/example/taskmanager/SubtaskControllerTest.java`

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)
- [ADR-008: No Backend Service Layer](adr/ADR-008-no-backend-service-layer.md)

## Sequence Diagrams

- None specific. Loading subtasks participates in the mobile edit/detail
  loading sequence.

---

# Reminders

## User Behavior

Users create and delete task reminders, receive due reminder toasts, dismiss
them, and snooze them to a later time.

## Frontend Owners

- `useTaskDetailResources`: persisted reminder records, reminder draft,
  loading, creation, deletion, and exposed reminder setter.
- `App.tsx`: polling, due detection, duplicate suppression, toast queue,
  dismissal, and snoozing.
- `RemindersSection` and `ToastList`: reminder and toast presentation.

## Backend Owners

- `ReminderController`, `ReminderRepository`, `Reminder`, and
  `ParentTaskGuard`.

## State Categories

- **Persisted:** reminder records.
- **Draft:** reminder date/time/message.
- **Transient:** due polling, fired-reminder suppression, and toast queue.
- **Presentation:** reminder section and toast rendering.
- **Platform:** browser notification permission and timers.

## APIs

- `getReminders`
- `createReminder`
- `deleteReminder`
- `patchReminderDate`

## Utilities

- `dateTime.ts`
- `taskForm.ts` for reminder time-mode values.

## Tests

- `taskmanager-frontend/src/api/tasks.test.ts`
- No dedicated frontend workflow test currently covers reminder CRUD or
  snoozing.
- `src/test/java/com/example/taskmanager/ReminderControllerTest.java`

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)
- [ADR-006: Reminder Ownership Split](adr/ADR-006-reminder-ownership-split.md)
- [ADR-008: No Backend Service Layer](adr/ADR-008-no-backend-service-layer.md)

## Sequence Diagrams

- [Reminder Snooze](sequence-diagrams.md#5-reminder-snooze)

---

# Attachments

## User Behavior

Users add labeled links to tasks, view them in task details, and remove them.

## Frontend Owners

- `useTaskDetailResources`: task-keyed attachment records, URL/label drafts,
  loading, creation, deletion, and reconciliation.
- `DetailAuxiliaryPanels`: link presentation.
- `App.tsx`: selected-task and detail-panel lifecycle.

## Backend Owners

- `AttachmentController`, `AttachmentRepository`, `Attachment`, and
  `ParentTaskGuard`.

## State Categories

- **Persisted:** attachment link and metadata records.
- **Draft:** new attachment URL and label.
- **Transient:** selected task and detail-resource loading.
- **Presentation:** expanded detail section.

## APIs

- `getAttachments`
- `createAttachment`
- `deleteAttachment`

## Utilities

- None specific.

## Tests

- `taskmanager-frontend/src/api/tasks.test.ts`
- No dedicated frontend workflow test currently covers attachment CRUD.
- `src/test/java/com/example/taskmanager/AttachmentControllerTest.java`

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)
- [ADR-008: No Backend Service Layer](adr/ADR-008-no-backend-service-layer.md)

## Sequence Diagrams

- None specific. Loading attachments participates in task detail loading.

---

# Search

## User Behavior

Users enter text to narrow the visible task list and clear search through the
list controls or global Escape behavior.

## Frontend Owners

- `App.tsx`: search control state, Escape coordination, and reset behavior.
- `TaskListControls`: search input presentation.
- `useTaskListViewModel`: derives visible tasks and empty-state data.

## Backend Owners

- None. Search is performed against the frontend task collection.

## State Categories

- **Presentation:** search control value.
- **Derived:** searched visible task list and matching empty state.
- **Platform:** search-field focus and mobile text-focus protection.

## APIs

- None specific.

## Utilities

- `taskFiltering.ts`
- `taskEmptyState.ts`

## Tests

- Search and search-to-edit cases in `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/utils/taskFiltering.test.ts`
- `taskmanager-frontend/src/utils/taskEmptyState.test.ts`

## ADRs

- [ADR-005: iOS Focus Guard](adr/ADR-005-ios-focus-guard.md)

## Sequence Diagrams

- None specific.

---

# Filtering

## User Behavior

Users filter tasks by status, priority interpretation, project, tag, task
count shortcuts, completed tasks, or overdue tasks, and reset filters.

## Frontend Owners

- `App.tsx`: filter-control state and reset behavior.
- `TaskListControls` and task-count controls: presentation.
- `useTaskListViewModel`: interprets filters and derives visible tasks, counts,
  and active-filter state.

## Backend Owners

- None. Filtering uses the frontend task collection.

## State Categories

- **Presentation:** filter controls.
- **Derived:** filtered tasks, completed/overdue counts, and empty-state data.

## APIs

- None specific.

## Utilities

- `taskFiltering.ts`
- `taskDisplayHelpers.ts`
- `taskUtils.ts`
- `taskEmptyState.ts`

## Tests

- Filter/count/empty-state cases in `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/utils/taskFiltering.test.ts`
- `taskmanager-frontend/src/utils/taskDisplayHelpers.test.ts`
- `taskmanager-frontend/src/utils/taskEmptyState.test.ts`

## ADRs

- None specific.

## Sequence Diagrams

- None specific. Filter reset participates in
  [Open Task From Calendar](sequence-diagrams.md#7-open-task-from-calendar).

---

# Sorting

## User Behavior

Users choose the order in which visible tasks are displayed and reset sorting
to the default due-date order.

## Frontend Owners

- `App.tsx`: sort control state and reset behavior.
- `TaskListControls`: sort presentation.
- `useTaskListViewModel`: derives sorted visible tasks.

## Backend Owners

- None for user-selected frontend sorting. `TaskRepository` defines default
  ordering for loaded tasks.

## State Categories

- **Presentation:** selected sort value.
- **Derived:** sorted visible task list.

## APIs

- None specific.

## Utilities

- `taskFiltering.ts`

## Tests

- Relevant list-control behavior in `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/utils/taskFiltering.test.ts`
- `src/test/java/com/example/taskmanager/TaskRepositoryTest.java` for default
  repository ordering.

## ADRs

- None specific.

## Sequence Diagrams

- None.

---

# Mobile Editing

## User Behavior

Mobile users tap a task to edit it in a dedicated row that replaces the task
card content while remaining in the task-list scroll context.

## Frontend Owners

- `App.tsx`: mobile task-card behavior, selected task, shared edit draft,
  mobile edit row placement, edit entry, save/cancel, focus preparation, and
  list coordination.
- Task-list components and `renderInlineEditForm`: presentation.
- `useTaskDetailResources`: loads task detail resources when the task opens.

## Backend Owners

- Same task and detail-resource owners used by task editing and detail loading.

## State Categories

- **Persisted:** edited task and loaded detail resources.
- **Draft:** shared edit draft.
- **Transient:** selected task and active editor identity.
- **Presentation:** mobile edit row and panel.
- **Platform:** mobile layout detection, focus, scroll, touch, and viewport.

## APIs

- Task editing APIs plus detail-resource read APIs.

## Utilities

- `taskEditDraft.ts`
- `taskScheduling.ts`
- `taskForm.ts`

## Tests

- Mobile edit, placement, scroll-owner, save, focus-scope, and entry cases in
  `taskmanager-frontend/src/App.test.tsx`

## ADRs

- [ADR-002: Shared Edit Draft](adr/ADR-002-shared-edit-draft.md)
- [ADR-003: Autosave Ownership](adr/ADR-003-autosave-ownership.md)
- [ADR-004: Mobile Edit Row](adr/ADR-004-mobile-edit-row.md)
- [ADR-005: iOS Focus Guard](adr/ADR-005-ios-focus-guard.md)

## Sequence Diagrams

- [Mobile Edit Entry and Focus Protection](sequence-diagrams.md#8-mobile-edit-entry-and-focus-protection)
- [Edit Task and Autosave](sequence-diagrams.md#2-edit-task-and-autosave)

---

# Mobile Navigation

## User Behavior

Mobile users move among Add, Tasks, and Calendar pages through navigation
buttons or guarded horizontal swipe gestures.

## Frontend Owners

- `App.tsx`: active mobile page, pager transitions, swipe eligibility,
  thresholds, gesture tracking, and integration with task/calendar opening.
- Mobile page sections and navigation buttons: presentation.

## Backend Owners

- None.

## State Categories

- **Presentation:** active mobile page.
- **Transient:** swipe start/movement and long-press interaction state.
- **Platform:** touch events, coarse-pointer/mobile layout detection, and DOM
  target eligibility.

## APIs

- None specific.

## Utilities

- None specific.

## Tests

- Swipe, protected-control, task-card, calendar-control, and mobile-page cases
  in `taskmanager-frontend/src/App.test.tsx`

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)
- [ADR-004: Mobile Edit Row](adr/ADR-004-mobile-edit-row.md)
- [ADR-005: iOS Focus Guard](adr/ADR-005-ios-focus-guard.md)

## Sequence Diagrams

- Mobile page transition participates in
  [Open Task From Calendar](sequence-diagrams.md#7-open-task-from-calendar) and
  [Mobile Edit Entry and Focus Protection](sequence-diagrams.md#8-mobile-edit-entry-and-focus-protection).

---

# Toast Notifications

## User Behavior

Users see non-disruptive confirmation toasts and due-reminder toasts, dismiss
toasts, and snooze reminder toasts.

## Frontend Owners

- `App.tsx`: toast queue, IDs, dismissal, task-created confirmation, reminder
  detection, duplicate suppression, and snoozing.
- `ToastList`: toast presentation and confirmation-toast auto-dismiss timers.
- `useTaskDetailResources`: persisted reminder records used by snoozing.

## Backend Owners

- None for confirmation toasts.
- `ReminderController`, `ReminderRepository`, and `Reminder` for reminder
  snoozing.

## State Categories

- **Persisted:** reminder due date after snooze.
- **Transient:** toast queue, fired-reminder suppression, and timers.
- **Presentation:** rendered toast list.
- **Platform:** timer lifecycle and browser notification capability.

## APIs

- `patchReminderDate` for reminder snooze.

## Utilities

- `dateTime.ts`

## Tests

- Task-created toast, auto-dismiss, and relevant reminder behavior in
  `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/api/tasks.test.ts`
- `src/test/java/com/example/taskmanager/ReminderControllerTest.java`

## ADRs

- [ADR-006: Reminder Ownership Split](adr/ADR-006-reminder-ownership-split.md)

## Sequence Diagrams

- [Reminder Snooze](sequence-diagrams.md#5-reminder-snooze)

---

# Settings

## User Behavior

Users open the settings panel and change display preferences such as time/date
format and theme.

## Frontend Owners

- `App.tsx`: settings visibility, preference state, local-storage interaction,
  outside-click/Escape behavior, and focus restoration.
- `SettingsPanel`: settings presentation and controls.

## Backend Owners

- None. Current settings are frontend/local preferences.

## State Categories

- **Persisted:** locally stored theme.
- **Presentation:** settings-panel visibility and display-format controls.
- **Platform:** local storage, outside-click, Escape, and focus restoration.

## APIs

- None.

## Utilities

- `dateTime.ts` and `taskForm.ts` support display/time-mode behavior.

## Tests

- Settings, format toggle, time display, Escape, and popover cases in
  `taskmanager-frontend/src/App.test.tsx`
- Date/time and form utility tests.

## ADRs

- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)

## Sequence Diagrams

- None.

---

# Empty States

## User Behavior

Users see contextual messages when no tasks exist or when search, completed,
overdue, calendar, or other current views have no matching tasks.

## Frontend Owners

- `useTaskListViewModel`: derives task-list empty-state content.
- `TaskListPresentation`: renders task-list empty states.
- `Calendar`: renders calendar-view empty states.
- `App.tsx`: supplies source tasks and active controls.

## Backend Owners

- None.

## State Categories

- **Derived:** empty-state selection from tasks and active controls.
- **Presentation:** rendered empty-state message.

## APIs

- None specific.

## Utilities

- `taskEmptyState.ts`
- `taskFiltering.ts`

## Tests

- `taskmanager-frontend/src/utils/taskEmptyState.test.ts`
- Empty-state cases in `taskmanager-frontend/src/App.test.tsx`
- Calendar empty-state cases in
  `taskmanager-frontend/src/components/Calendar.test.tsx`

## ADRs

- None specific.

## Sequence Diagrams

- None.

---

# Feature Dependency Matrix

| Feature | Primary frontend owner | Primary backend owner | State categories | Mobile impact | ADR impact |
| --- | --- | --- | --- | --- | --- |
| Task Creation | `App.tsx` | `TaskController` | Persisted, draft, derived, transient, presentation, platform | Create page, focus, dropdowns | ADR-001 |
| Task Editing | `App.tsx` | `TaskController` | Persisted, draft, transient, presentation, platform | Shared mobile editor and focus | ADR-001, ADR-002, ADR-003 |
| Autosave | `App.tsx` | `TaskController` | Persisted, draft, transient | Shared draft and panel lifecycle | ADR-002, ADR-003 |
| Recurrence | `App.tsx` | `TaskController` | Persisted, draft, derived, transient | Completion may change selected/list task | ADR-001, ADR-007 |
| Projects | `useProjectTagCatalog`; `App.tsx` reconciliation | `ProjectController` | Persisted, draft, derived, presentation | Dropdown and inline form focus | ADR-001 |
| Tags | `useProjectTagCatalog`; `App.tsx` reconciliation | `TagController`; `TaskController` associations | Persisted, draft, derived, presentation | Dropdown, picker, and inline form focus | ADR-001 |
| Bulk Selection | `useBulkSelection`; `App.tsx` mutations | `TaskController` | Persisted, transient, presentation | Long-press/task-card interaction | ADR-001, ADR-007 |
| Calendar | `Calendar`; `App.tsx` opening | Existing task backend only | Derived, presentation, transient, platform | Calendar page and task opening | ADR-001 |
| Statistics | `useTaskListViewModel`; `StatsModal` | None | Derived, presentation, platform | Modal focus only | ADR-001 |
| Notes | `useTaskDetailResources` | `NoteController` | Persisted, draft, transient, presentation | Detail/mobile task opening | ADR-001, ADR-008 |
| Subtasks | `useTaskDetailResources` | `SubtaskController` | Persisted, draft, transient, presentation | Detail/mobile task opening | ADR-001, ADR-008 |
| Reminders | `useTaskDetailResources`; `App.tsx` delivery | `ReminderController` | Persisted, draft, transient, presentation, platform | Toasts and detail opening | ADR-001, ADR-006, ADR-008 |
| Attachments | `useTaskDetailResources` | `AttachmentController` | Persisted, draft, transient, presentation | Detail/mobile task opening | ADR-001, ADR-008 |
| Search | `App.tsx`; `useTaskListViewModel` | None | Presentation, derived, platform | Text-focus guard | ADR-005 |
| Filtering | `App.tsx`; `useTaskListViewModel` | None | Presentation, derived | Calendar opening may reset filters | None specific |
| Sorting | `App.tsx`; `useTaskListViewModel` | None | Presentation, derived | Task-list ordering | None specific |
| Mobile Editing | `App.tsx` | Existing task/detail backend | Persisted, draft, transient, presentation, platform | Core feature | ADR-002, ADR-003, ADR-004, ADR-005 |
| Mobile Navigation | `App.tsx` | None | Presentation, transient, platform | Core feature | ADR-001, ADR-004, ADR-005 |
| Toast Notifications | `App.tsx`; `ToastList` | `ReminderController` for snooze | Persisted, transient, presentation, platform | Global overlay behavior | ADR-006 |
| Settings | `App.tsx`; `SettingsPanel` | None | Persisted-local, presentation, platform | Display and focus behavior | ADR-001 |
| Empty States | `useTaskListViewModel`; `Calendar` | None | Derived, presentation | Mobile-specific guidance and calendar pages | None specific |

---

# Related Documentation

- [Architecture](architecture.md)
- [Ownership Map](ownership-map.md)
- [State Taxonomy](state-taxonomy.md)
- [Sequence Diagrams](sequence-diagrams.md)
- [Code Reading Guide](code-reading-guide.md)
- [Architecture Decision Records](adr/)
