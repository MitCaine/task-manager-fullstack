# Task Manager Feature Atlas

## System Navigation

```text
User interface
    |
    v
App.tsx orchestration or bounded feature hook
    |
    v
Frontend API: src/api/tasks.ts
    |
    v
Spring REST controller
    |
    v
Spring Data repository
    |
    v
Database entity/table
```

## Primary Ownership Guide

| Need to understand | Start here |
| --- | --- |
| Cross-domain task workflows | [App.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/App.tsx) |
| Architecture and ownership | [architecture.md](/Users/mipoo/task-manager-fullstack/docs/architecture.md), [ownership-map.md](/Users/mipoo/task-manager-fullstack/docs/ownership-map.md) |
| Mobile focus behavior | [mobile-focus-system.md](/Users/mipoo/task-manager-fullstack/docs/mobile-focus-system.md) |
| Frontend API contract | [tasks.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/api/tasks.ts) |
| Backend task behavior | [TaskController.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/TaskController.java) |
| Detail resources | [useTaskDetailResources.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/hooks/useTaskDetailResources.ts) |
| Projects and tags | [useProjectTagCatalog.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/hooks/useProjectTagCatalog.ts) |
| Filtering and derived views | [useTaskListViewModel.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/hooks/useTaskListViewModel.ts) |
| Bulk selection | [useBulkSelection.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/hooks/useBulkSelection.ts) |
| Main frontend behavior tests | [App.test.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/App.test.tsx) |
| Backend endpoint tests | `src/test/java/com/example/taskmanager/` |

---

# Task Management

## Task List and Task Cards

**Purpose**

Display tasks, their completion state, schedule, description, status, priority, project, tags, and subtask progress.

**Entry points**

- Tasks mobile navigation button
- Main task list
- Task-card click
- Task count badges

**Components**

- [TaskCardMain.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/components/task-list/TaskCardMain.tsx)
- [TaskListControls.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/components/task-list/TaskListControls.tsx)
- [TaskListPresentation.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/components/task-list/TaskListPresentation.tsx)
- `ProjectBadge`, `TaskTags`, and tag chips

**Hooks**

- `useTaskListViewModel`
- `useBulkSelection`
- `useProjectTagCatalog`
- `useTaskDetailResources` for subtask counts

**Utilities**

- `taskFiltering.ts`
- `taskDisplay.ts`
- `taskDisplayHelpers.ts`
- `taskEmptyState.ts`
- `taskUtils.ts`

**API endpoints**

- `GET /tasks`
- `GET /tasks/{id}`

**Database entities**

- `Task`
- `Project`
- `Tag`
- `Status`
- `Subtask`

**Tests**

- `App.test.tsx`: loading, titles, task counts, formatted dates, empty states, status badges, tag chips
- `taskFiltering.test.ts`
- `taskDisplay.test.ts`
- `taskDisplayHelpers.test.ts`
- `taskEmptyState.test.ts`
- `TaskControllerTest`
- `TaskRepositoryTest`

---

## Create Task

**Purpose**

Create a task with title, description, optional schedule, priority, project, tags, and recurrence.

**Entry points**

- Add mobile navigation page
- Add Task button
- Enter key in task-title field

**Components**

- `TaskEditorFields`
- `DateTimeRow`
- `TimeSelect`
- `RecurrenceControl`
- `AddTaskPreview`
- `SelectedProjectChip`
- `SelectedTagChips`
- `InlineProjectForm`
- `InlineTagForm`

**Hooks**

- `useProjectTagCatalog`

**Utilities**

- `taskScheduling.ts`
- `taskForm.ts`
- `dateTime.ts`
- `taskDisplayHelpers.ts`

**API endpoints**

- `POST /tasks`
- `PATCH /tasks/{id}/repeat`
- `POST /tasks/{id}/tags/{tagId}`

**Database entities**

- `Task`
- `RecurrenceRule`
- `Project`
- `Tag`
- Task/tag join table

**Tests**

- `App.test.tsx`: creation, Enter submission, empty-title validation, confirmation toast, metadata, start/end times, projects, tags, and recurrence
- `taskScheduling.test.ts`
- `taskForm.test.ts`
- `dateTime.test.ts`
- `api/tasks.test.ts`
- `TaskControllerTest`

---

## Edit Task and Autosave

**Purpose**

Edit task title, description, schedule, priority, project, tags, and recurrence through inline, mobile, or detail-panel interfaces.

**Entry points**

- Task action menu → Edit
- Task detail panel
- Mobile task-card selection

**Components**

- `TaskEditorFields`
- `DetailHeader`
- `DetailDescriptionField`
- `DetailScheduleFields`
- `DetailRepeatRow`
- `DateTimeRow`
- Inline project/tag forms

**Hooks**

- `useProjectTagCatalog`
- `useTaskDetailResources` for detail resources

**Utilities**

- `taskEditDraft.ts`
- `taskScheduling.ts`
- `taskForm.ts`
- `taskTimeShift.ts`
- `taskDisplayHelpers.ts`

**API endpoints**

- `GET /tasks/{id}`
- `PUT /tasks/{id}`
- `GET /tasks/{id}/recurrence`
- `PATCH /tasks/{id}/repeat`
- `POST /tasks/{id}/tags/{tagId}`
- `DELETE /tasks/{id}/tags/{tagId}`

**Database entities**

- `Task`
- `RecurrenceRule`
- `Project`
- `Tag`

**Tests**

- `App.test.tsx`: edit hydration, save behavior, project/tag reconciliation, recurrence editing, end-time editing, validation, mobile save behavior
- `taskEditDraft.test.ts`
- `taskScheduling.test.ts`
- `taskForm.test.ts`
- `api/tasks.test.ts`
- `TaskControllerTest`

---

## Complete and Reactivate Task

**Purpose**

Mark ordinary tasks done or active and advance recurring tasks when completed.

**Entry points**

- Task-card completion checkbox
- Status movement dialog
- Bulk Mark done action

**Components**

- `TaskCardMain`
- `StatusMoveDialog`
- `TaskListControls`

**Hooks**

- `useBulkSelection`

**Utilities**

- `taskDisplay.ts`
- `taskRecurrence.ts`

**API endpoints**

- `PATCH /tasks/{id}/status`
- Recurring completion additionally uses task, recurrence, and tag endpoints

**Database entities**

- `Task`
- `Status`
- `RecurrenceRule`
- `Tag`

**Tests**

- `App.test.tsx`: status movement, recurring completion, completed recurring reactivation, bulk completion
- `taskRecurrence.test.ts`
- `api/tasks.test.ts`
- `TaskControllerTest.patchTaskStatus_*`

---

## Move Task Between Statuses

**Purpose**

Move a task among Active, In Progress, and Done states.

**Entry points**

- Task status badge/button
- Long press
- Context menu

**Components**

- `TaskCardMain`
- `StatusMoveDialog`

**Hooks**

- None; owned by `App.tsx`

**Utilities**

- `normalizeTaskStatus` from `taskDisplay.ts`

**API endpoints**

- `PATCH /tasks/{id}/status`

**Database entities**

- `Task`
- `Status`

**Tests**

- `App.test.tsx`: move menu visibility and status updates
- `TaskControllerTest.patchTaskStatus_*`

---

## Duplicate Task

**Purpose**

Create a copy of a task while preserving schedule, description, priority, project, tags, and recurrence.

**Entry points**

- Task action menu → Copy

**Components**

- `TaskCardMain`

**Hooks**

- None; cross-domain workflow owned by `App.tsx`

**Utilities**

- `taskCopyTitle.ts`

**API endpoints**

- `POST /tasks`
- `POST /tasks/{id}/tags/{tagId}`
- `GET /tasks/{id}/recurrence`
- `PATCH /tasks/{id}/repeat`

**Database entities**

- `Task`
- `Tag`
- `RecurrenceRule`
- `Project`

**Tests**

- `App.test.tsx`: copy suffix generation and recurrence preservation
- `taskCopyTitle.test.ts`
- `api/tasks.test.ts`

---

## Delete Task

**Purpose**

Delete a task after confirmation and clear related frontend state.

**Entry points**

- Task action menu → Delete
- Confirmation controls
- Bulk Delete

**Components**

- `TaskCardMain`
- `ConfirmDelete`
- `TaskListControls`

**Hooks**

- `useBulkSelection`
- `useTaskDetailResources.clearDeletedTaskResources`

**Utilities**

- None

**API endpoints**

- `DELETE /tasks/{id}`

**Database entities**

- `Task`
- Cascading task-associated resource tables

**Tests**

- `App.test.tsx`: confirm, cancel, failure handling, bulk deletion
- `api/tasks.test.ts`
- `TaskControllerTest.deleteTask_*`

---

## Search, Filter, Sort, and View Tabs

**Purpose**

Find and organize tasks by text, date window, status, priority, project, tag, or sorting order.

**Entry points**

- Search input
- All/Today/Week/Month tabs
- Show, Priority, Project, Tag, and Sort controls
- All, Done, and Overdue count badges
- Reset filters

**Components**

- `TaskListControls`
- `TaskListEmptyState`

**Hooks**

- `useTaskListViewModel`

**Utilities**

- `taskFiltering.ts`
- `taskEmptyState.ts`
- `taskDisplayHelpers.ts`
- `taskUtils.ts`

**API endpoints**

- `GET /tasks`; filtering is performed client-side

**Database entities**

- `Task`
- `Project`
- `Tag`
- `Status`

**Tests**

- `App.test.tsx`: count badges, filter empty states, search placeholder
- `taskFiltering.test.ts`
- `taskEmptyState.test.ts`

---

## Bulk Selection

**Purpose**

Select multiple tasks and apply completion or deletion actions.

**Entry points**

- Select button
- Per-task bulk checkboxes
- Bulk action bar

**Components**

- `TaskListControls`
- `TaskCardMain`

**Hooks**

- `useBulkSelection`

**Utilities**

- `taskDisplay.ts`
- `taskRecurrence.ts` for recurring completion

**API endpoints**

- `PATCH /tasks/{id}/status`
- `DELETE /tasks/{id}`
- Recurrence-related endpoints when selected tasks recur

**Database entities**

- `Task`
- `Status`
- `RecurrenceRule`

**Tests**

- `App.test.tsx`: entering/exiting bulk mode, selection, bulk done, recurring bulk done, mixed completion, bulk delete

---

## Workspace and Display Settings

**Purpose**

Customize workspace label, theme, time format, and date format.

**Entry points**

- Workspace title
- Settings button

**Components**

- `SettingsPanel`
- `TaskListDateLabel`
- Date/time presentation components

**Hooks**

- None; locally owned by `App.tsx`

**Utilities**

- `dateTime.ts`
- `taskForm.ts`
- `taskDisplayHelpers.ts`

**API endpoints**

- None; settings are local frontend state and `localStorage`

**Database entities**

- None

**Tests**

- `App.test.tsx`: settings visibility, format toggles, 12/24-hour formatting, US/European formatting, Escape behavior
- `dateTime.test.ts`
- `taskForm.test.ts`

---

# Scheduling

## Start Date and Time

**Purpose**

Assign or edit a task start date and optional time.

**Entry points**

- Create-task date/time controls
- Inline editor
- Detail-panel schedule controls

**Components**

- `DateTimeRow`
- `TimeSelect`
- `TaskEditorFields`
- `DetailScheduleFields`
- `AddTaskPreview`

**Hooks**

- None; schedule drafts belong to `App.tsx`

**Utilities**

- `taskScheduling.ts`
- `dateTime.ts`
- `taskForm.ts`
- `taskEditDraft.ts`

**API endpoints**

- `POST /tasks`
- `PUT /tasks/{id}`

**Database entities**

- `Task.dateTimeScheduled`

**Tests**

- `App.test.tsx`: date selection, time editor interactions, create/edit schedule saving
- `taskScheduling.test.ts`
- `dateTime.test.ts`
- `taskEditDraft.test.ts`
- `TaskControllerTest` scheduled-date tests

---

## Optional End Time and Time-Range Validation

**Purpose**

Represent task duration and prevent end times that are equal to or before the start time.

**Entry points**

- Start/end time editors in create, inline edit, and detail edit

**Components**

- `DateTimeRow`
- `TaskEditorFields`
- `DetailScheduleFields`

**Hooks**

- None

**Utilities**

- `taskScheduling.ts`
- `taskForm.ts`
- `dateTime.ts`

**API endpoints**

- `POST /tasks`
- `PUT /tasks/{id}`

**Database entities**

- `Task.dateTimeScheduled`
- `Task.endDateTimeScheduled`

**Tests**

- `App.test.tsx`: create/edit end-time saving and invalid-range warnings
- `taskForm.test.ts`
- `taskScheduling.test.ts`
- `TaskControllerTest.createTask_end*`
- `TaskControllerTest.updateTask_end*`

---

## Quick Rescheduling

**Purpose**

Shift a selected task forward by one hour or to tomorrow.

**Entry points**

- Detail panel → `+1 hour`
- Detail panel → `Tomorrow`

**Components**

- `DetailScheduleFields`
- `DetailTimeShiftRow`

**Hooks**

- None; autosave and edit state belong to `App.tsx`

**Utilities**

- `taskTimeShift.ts`
- `taskScheduling.ts`

**API endpoints**

- `PUT /tasks/{id}` through autosave

**Database entities**

- `Task`

**Tests**

- `taskTimeShift.test.ts`
- `App.test.tsx` edit/autosave scheduling behavior

---

## Date and Time Display

**Purpose**

Display task schedules consistently in list, preview, calendar, and detail views using selected locale and time format.

**Entry points**

- All task schedule labels
- Settings time/date format controls

**Components**

- `TaskCardMain`
- `AddTaskPreview`
- `Calendar`
- `RemindersSection`
- `TaskListDateLabel`

**Hooks**

- `useTaskListViewModel` supplies task subsets

**Utilities**

- `dateTime.ts`
- `taskDisplayHelpers.ts`

**API endpoints**

- None beyond the underlying loaded records

**Database entities**

- `Task`
- `Reminder`

**Tests**

- `App.test.tsx`: 12-hour, 24-hour, European, and range formatting
- `dateTime.test.ts`
- `taskDisplayHelpers.test.ts`

---

# Recurrence

## Set, Change, or Remove Recurrence

**Purpose**

Configure tasks to repeat on constrained day, week, month, or year intervals,
or not at all.

**Entry points**

- Create form Repeat control
- Inline/mobile edit Repeat control
- Detail-panel repeat row

**Components**

- `RecurrenceControl`
- `DetailRepeatRow`
- `TaskEditorFields`

**Hooks**

- None; recurrence reconciliation belongs to `App.tsx`

**Utilities**

- `taskRecurrence.ts`

**API endpoints**

- `GET /tasks/{id}/recurrence`
- `PATCH /tasks/{id}/repeat`

**Database entities**

- `Task`
- `RecurrenceRule`

**Tests**

- `App.test.tsx`: create recurrence, hydrate edit recurrence, change recurrence, remove recurrence
- `taskRecurrence.test.ts`
- `api/tasks.test.ts`
- `TaskControllerTest.getRecurrence_*`
- `TaskControllerTest.setRepeat_*`

---

## Generate Next Occurrence on Completion

**Purpose**

Replace an active recurring task with its next scheduled occurrence while preserving duration and task metadata.

**Entry points**

- Completion checkbox
- Move to Done
- Bulk Mark done

**Components**

- `TaskCardMain`
- `StatusMoveDialog`
- `TaskListControls`

**Hooks**

- `useBulkSelection` for bulk selection only

**Utilities**

- `taskRecurrence.ts`

**API endpoints**

- `GET /tasks/{id}/recurrence`
- `POST /tasks`
- `POST /tasks/{id}/tags/{tagId}`
- `PATCH /tasks/{id}/repeat`
- `GET /tasks/{id}`
- `DELETE /tasks/{id}`

**Database entities**

- `Task`
- `RecurrenceRule`
- `Tag`
- `Project`

**Tests**

- `App.test.tsx`: recurring completion, duration preservation, bulk recurrence, mixed bulk completion, reactivating completed recurring tasks
- `taskRecurrence.test.ts`
- `TaskControllerTest` recurrence endpoint tests

---

# Reminders

## Create and Delete Reminder

**Purpose**

Attach dated reminder records and optional messages to a task.

**Entry points**

- Task detail panel → Reminders section

**Components**

- `RemindersSection`
- `DateTimeRow`
- `DetailSectionShell`

**Hooks**

- `useTaskDetailResources`

**Utilities**

- `dateTime.ts`
- `taskForm.ts`

**API endpoints**

- `GET /tasks/{taskId}/reminders`
- `POST /tasks/{taskId}/reminders`
- `DELETE /reminders/{id}`

**Database entities**

- `Reminder`
- `Task`

**Tests**

- `api/tasks.test.ts`
- `ReminderControllerTest`
- `useTaskDetailResources` behavior is exercised through application integration paths

---

## In-App Reminder Toasts and Snoozing

**Purpose**

Notify the user when loaded reminders become due and allow dismissal or snoozing.

**Entry points**

- Automatically triggered reminder toast
- `+1 hr`
- `Tomorrow`
- Dismiss

**Components**

- `ToastList`

**Hooks**

- `useTaskDetailResources` owns reminder records
- `App.tsx` owns polling and toast lifecycle

**Utilities**

- `dateTime.ts`

**API endpoints**

- `PATCH /reminders/{id}`

**Database entities**

- `Reminder`
- `Task`

**Tests**

- `api/tasks.test.ts`: reminder date patch
- `ReminderControllerTest.patchReminder_*`
- Toast auto-dismiss behavior is covered by `App.test.tsx` for confirmation toasts; reminder delivery ownership is primarily protected by current application integration behavior

---

# Projects

## Create and Assign Projects

**Purpose**

Organize tasks under one selected project.

**Entry points**

- Create-task Project control
- Inline/mobile edit Project control
- Detail-panel Project control
- Inline new-project forms

**Components**

- `InlineProjectForm`
- `SelectedProjectChip`
- `ProjectBadge`
- Project selectors in `App.tsx`

**Hooks**

- `useProjectTagCatalog`

**Utilities**

- `findProjectById` from `taskDisplayHelpers.ts`

**API endpoints**

- `GET /projects`
- `POST /projects`
- Task assignment persists through `POST /tasks` or `PUT /tasks/{id}`

**Database entities**

- `Project`
- `Task.projectID`

**Tests**

- `App.test.tsx`: project dropdown behavior, task creation with project, edit assignment, inline project creation
- `api/tasks.test.ts`
- `ProjectControllerTest`

---

## Delete Project and Reconcile Tasks

**Purpose**

Delete a project and detach it from tasks and active frontend selections.

**Entry points**

- Project delete controls in create/detail selectors

**Components**

- Project selector controls in `App.tsx`

**Hooks**

- `useProjectTagCatalog.deleteProjectFromCatalog`

**Utilities**

- `findProjectById`

**API endpoints**

- `DELETE /projects/{id}`

**Database entities**

- `Project`
- `Task.projectID`

**Tests**

- `api/tasks.test.ts`
- `ProjectControllerTest.deleteProject_*`
- Application project reconciliation is covered through `App.tsx` behavior

---

## Filter Tasks by Project

**Purpose**

Show only tasks assigned to a selected project.

**Entry points**

- Task-list Project filter

**Components**

- `TaskListControls`

**Hooks**

- `useTaskListViewModel`
- `useProjectTagCatalog`

**Utilities**

- `taskFiltering.ts`

**API endpoints**

- `GET /tasks`
- `GET /projects`

**Database entities**

- `Task`
- `Project`

**Tests**

- `taskFiltering.test.ts`
- `App.test.tsx` filter-control behavior

---

# Tags

## Create and Assign Tags

**Purpose**

Apply multiple colored labels to tasks.

**Entry points**

- Create-task Tags control
- Inline/mobile edit Tags control
- Detail-panel Tags control
- Inline new-tag forms

**Components**

- `InlineTagForm`
- `TagColorPicker`
- `SelectedTagChips`
- `TagChip`
- `TaskTags`

**Hooks**

- `useProjectTagCatalog`

**Utilities**

- `findTagsByIds` from `taskDisplayHelpers.ts`

**API endpoints**

- `GET /tags`
- `POST /tags`
- `POST /tasks/{id}/tags/{tagId}`
- `DELETE /tasks/{id}/tags/{tagId}`

**Database entities**

- `Tag`
- `Task`
- Task/tag join table

**Tests**

- `App.test.tsx`: create-task tags, tag chips, edit assignment, inline tag creation
- `api/tasks.test.ts`
- `TagControllerTest`
- `TaskControllerTest.addTag_*`
- `TaskControllerTest.removeTag_*`

---

## Change Tag Color

**Purpose**

Change a tag’s accent color and propagate it to displayed task tags.

**Entry points**

- Tag color controls

**Components**

- `TagColorPicker`
- Tag selectors and chips

**Hooks**

- `useProjectTagCatalog.updateTagColor`

**Utilities**

- None beyond tag display helpers

**API endpoints**

- `PATCH /tags/{id}`

**Database entities**

- `Tag`

**Tests**

- `App.test.tsx`: user tag colors remain visual accents
- `api/tasks.test.ts`
- `TagControllerTest.updateTag_*`

---

## Delete Tag and Reconcile Tasks

**Purpose**

Delete a tag and remove it from tasks, active drafts, and active tag filters.

**Entry points**

- Tag delete controls

**Components**

- Tag selectors in `App.tsx`

**Hooks**

- `useProjectTagCatalog.deleteTagFromCatalog`

**Utilities**

- `taskDisplayHelpers.ts`

**API endpoints**

- `DELETE /tags/{id}`

**Database entities**

- `Tag`
- Task/tag join table

**Tests**

- `api/tasks.test.ts`
- `TagControllerTest.deleteTag_*`
- Task/tag removal endpoints protected by `TaskControllerTest`

---

## Expand and Filter Tags

**Purpose**

Display additional tags on task cards and filter the task list by tag.

**Entry points**

- Task-card tag expansion
- Task-list Tag filter

**Components**

- `TaskTags`
- `TagMore`
- `TaskListControls`

**Hooks**

- `useTaskListViewModel`
- `useProjectTagCatalog`

**Utilities**

- `taskFiltering.ts`

**API endpoints**

- `GET /tasks`
- `GET /tags`

**Database entities**

- `Task`
- `Tag`

**Tests**

- `App.test.tsx`: tag chip display
- `taskFiltering.test.ts`

---

# Subtasks

## View, Create, Complete, Edit, and Delete Subtasks

**Purpose**

Track smaller work items under a task and show their completion progress.

**Entry points**

- Task detail panel → Subtasks section
- Subtask progress displayed on task cards

**Components**

- `DetailSubtasksPanel`
- Internal `SubtasksSection`
- `TaskCardMain`

**Hooks**

- `useTaskDetailResources`

**Utilities**

- None

**API endpoints**

- `GET /tasks/{taskId}/subtasks`
- `POST /tasks/{taskId}/subtasks`
- `PUT /subtasks/{id}`
- `PATCH /subtasks/{id}/status`
- `DELETE /subtasks/{id}`

**Database entities**

- `Subtask`
- `Task`
- `Status`

**Tests**

- `api/tasks.test.ts`
- `SubtaskControllerTest`
- Task-card progress rendering is exercised through `App.test.tsx`

---

# Notes

## View, Create, and Delete Notes

**Purpose**

Store free-text notes associated with a task.

**Entry points**

- Task detail panel → Notes section

**Components**

- `DetailNotesPanel`
- Internal `NotesSection`
- `DetailSectionShell`

**Hooks**

- `useTaskDetailResources`

**Utilities**

- None

**API endpoints**

- `GET /tasks/{taskId}/notes`
- `POST /tasks/{taskId}/notes`
- `DELETE /notes/{id}`

**Database entities**

- `Note`
- `Task`

**Tests**

- `api/tasks.test.ts`
- `NoteControllerTest`

---

# Attachments

## View, Add, Open, and Delete Links

**Purpose**

Associate labeled external links with a task.

**Entry points**

- Task detail panel → Links section
- Add Link controls
- Rendered link anchor

**Components**

- `DetailLinksPanel`
- Internal `LinksSection`
- `DetailSectionShell`

**Hooks**

- `useTaskDetailResources`

**Utilities**

- None

**API endpoints**

- `GET /tasks/{taskId}/attachments`
- `POST /tasks/{taskId}/attachments`
- `DELETE /attachments/{id}`

**Database entities**

- `Attachment`
- `Task`

**Tests**

- `api/tasks.test.ts`
- `AttachmentControllerTest`

---

# Calendar

## Year, Month, Week, Day, and Agenda Navigation

**Purpose**

Present scheduled tasks through calendar-oriented views and allow navigation between time ranges.

**Entry points**

- Calendar mobile navigation button
- Calendar breadcrumbs, range selectors, day cells, Today controls

**Components**

- [Calendar.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/components/Calendar.tsx)

**Hooks**

- Calendar-local React state
- `useTaskListViewModel` supplies calendar task subset

**Utilities**

- `dateTime.ts`
- Calendar-local grid and date helpers

**API endpoints**

- `GET /tasks`
- `GET /projects`

**Database entities**

- `Task`
- `Project`

**Tests**

- `Calendar.test.tsx`: week/month/day empty states, desktop and mobile range sizes, stable controls
- `App.test.tsx`: calendar swipe guards and task opening
- `dateTime.test.ts`

---

## Open Task from Calendar

**Purpose**

Navigate from a calendar task to its corresponding task-list/detail editing context.

**Entry points**

- Calendar task rows and task links

**Components**

- `Calendar`

**Hooks**

- None; cross-view navigation belongs to `App.tsx`

**Utilities**

- Task-list filtering state is reset by `App.tsx`

**API endpoints**

- Uses already loaded tasks; may load task details when opening mobile edit

**Database entities**

- `Task`

**Tests**

- Calendar task activation is protected through `Calendar.test.tsx` and `App.test.tsx` integration behavior

---

## Hide Completed Calendar Tasks

**Purpose**

Exclude completed tasks from calendar display.

**Entry points**

- Show/Hide done calendar control

**Components**

- `Calendar`

**Hooks**

- `useTaskListViewModel`

**Utilities**

- None beyond task status interpretation

**API endpoints**

- None beyond initial `GET /tasks`

**Database entities**

- `Task`
- `Status`

**Tests**

- `Calendar.test.tsx`: stable show/hide done control styling
- Derived calendar filtering is owned by `useTaskListViewModel`

---

# Statistics

## Statistics Dashboard

**Purpose**

Display total, done, active, overdue, weekly completion, priority distribution, and completion rate.

**Entry points**

- Stats button
- Statistics modal

**Components**

- `StatsModal`

**Hooks**

- `useTaskListViewModel`

**Utilities**

- `taskStatistics.ts`
- `taskUtils.ts`

**API endpoints**

- None beyond `GET /tasks`; statistics are derived client-side

**Database entities**

- `Task`

**Tests**

- `App.test.tsx`: Stats button, modal open, modal close
- `taskStatistics.test.ts`

---

# Mobile Editing

## Mobile Page Navigation and Swipe

**Purpose**

Navigate among Add, Tasks, and Calendar views on mobile without conflicting with interactive controls.

**Entry points**

- Mobile page navigation buttons
- Horizontal page swipe

**Components**

- Mobile pager and page structure in `App.tsx`
- `Calendar`
- Task list and create-task card

**Hooks**

- None; owned by `App.tsx`

**Utilities**

- `shouldIgnoreSwipeStart` in `App.tsx`

**API endpoints**

- None directly

**Database entities**

- None directly

**Tests**

- `App.test.tsx`: page-area swipes, create/calendar swipes, input guards, time-dropdown guards, calendar-control guards, task-action-menu guards

---

## Stable Mobile Task Editor

**Purpose**

Edit a task on mobile without destabilizing task-list scrolling or the iOS visual viewport.

**Entry points**

- Tap task card on mobile
- Task action menu → Edit

**Components**

- Shared `renderInlineEditForm`
- `TaskEditorFields`
- `DateTimeRow`
- `.mobile-edit-row`
- `.mobile-edit-panel`

**Hooks**

- `useProjectTagCatalog`
- Shared edit state remains in `App.tsx`

**Utilities**

- `taskEditDraft.ts`
- `taskScheduling.ts`
- `taskForm.ts`

**API endpoints**

- Same endpoints as task editing

**Database entities**

- `Task`
- `Project`
- `Tag`
- `RecurrenceRule`

**Tests**

- `App.test.tsx`: mobile edit placement, visual replacement, save behavior, scroll ownership, focus scope, recurrence/project/tag controls, no list repositioning
- Relevant architecture: [mobile-focus-system.md](/Users/mipoo/task-manager-fullstack/docs/mobile-focus-system.md)

---

## iOS Text-Focus and Visual Viewport Guard

**Purpose**

Prevent WKWebView text-entry interactions from shifting the document or leaving visible viewport gaps.

**Entry points**

- Automatically active during create, search, inline edit, mobile edit, and detail text focus
- Mobile inline edit title/description and catalog rename fields additionally
  use the shared proxy-input focus assist before native focus on mobile/coarse
  pointer devices

**Components**

- Text fields marked by `data-text-focus-scope`
- Mobile edit panel
- Create-task card
- Detail editor
- Catalog management rename rows

**Hooks**

- None; globally owned by `App.tsx`

**Utilities**

- Focus and viewport helpers local to `App.tsx`
- `mobileFocusAssist.ts` for the WKWebView proxy-input focus assist. Do not
  replace it with only scroll-reset timers, `touch-action`, or overscroll CSS.

**API endpoints**

- None

**Database entities**

- None

**Tests**

- `App.test.tsx`: document-scroll reset, repeated focus transitions, stale blur handling, visual viewport drift, proxy-input focus assist, touchmove prevention, textarea bounded scrolling, debug logging, and edit-entry reset
- Architecture reference: [mobile-focus-system.md](/Users/mipoo/task-manager-fullstack/docs/mobile-focus-system.md)

---

## Mobile Scroll Ownership

**Purpose**

Keep the task list and calendar as intentional scroll owners while preventing document and nested edit-panel scrolling.

**Entry points**

- All mobile task-list, calendar, and editing interactions

**Components**

- `.app`
- `.mobile-pager`
- `.mobile-page`
- `.app__list`
- Calendar card
- `.mobile-edit-panel`

**Hooks**

- None

**Utilities**

- Focus guard scroll helpers in `App.tsx`

**API endpoints**

- None

**Database entities**

- None

**Tests**

- `App.test.tsx`: task-list scroll ownership, mobile edit non-sticky behavior, no independent edit-panel scroll container
- CSS implementation: [App.css](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/App.css)

---

# Developer Navigation Guide

## Follow a Task Mutation

1. Start with the user callback passed from [App.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/App.tsx).
2. Find the orchestration handler such as `addTask`, `saveEdit`, `toggleComplete`, `removeTask`, or `duplicateTask`.
3. Follow calls into [tasks.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/api/tasks.ts).
4. Match the route to its backend controller.
5. Inspect the corresponding entity and repository.
6. Read the matching `App.test.tsx`, API test, and backend controller test.

## Follow a Detail Resource

1. Start with the matching panel in `components/detail-panel/`.
2. Follow callbacks into `useTaskDetailResources`.
3. Follow the API function in `src/api/tasks.ts`.
4. Inspect the matching backend controller, entity, repository, and controller test.

## Follow Project or Tag Behavior

1. Start with `useProjectTagCatalog`.
2. For catalog CRUD, follow the hook directly to the API.
3. For task assignment or deletion reconciliation, continue into `App.tsx`.
4. Inspect `ProjectController`, `TagController`, or task/tag endpoints in `TaskController`.

## Follow List, Filter, Calendar, or Statistics Behavior

1. Start with `useTaskListViewModel`.
2. Follow into the relevant pure utility:
   - `taskFiltering.ts`
   - `taskStatistics.ts`
   - `taskEmptyState.ts`
3. For calendar-local navigation, continue into `Calendar.tsx`.
4. For task opening or mutation, return to `App.tsx`.

## Follow Scheduling Behavior

1. Start with `TaskEditorFields`, `DateTimeRow`, or `DetailScheduleFields`.
2. Follow draft ownership into `App.tsx`.
3. Inspect:
   - `taskScheduling.ts`
   - `taskForm.ts`
   - `taskEditDraft.ts`
   - `taskTimeShift.ts`
   - `dateTime.ts`
4. Follow saves through task API endpoints and `TaskController`.

## Follow Recurrence Behavior

1. Start with `RecurrenceControl` or `DetailRepeatRow`.
2. Follow recurrence draft ownership into `App.tsx`.
3. Inspect `taskRecurrence.ts`.
4. Follow `getRecurrence`, `setRepeat`, and recurring completion orchestration.
5. Inspect recurrence endpoint tests and recurring completion tests.

## Follow Mobile or Focus Behavior

1. Read [mobile-focus-system.md](/Users/mipoo/task-manager-fullstack/docs/mobile-focus-system.md).
2. Inspect the mobile/focus section of `App.tsx`.
3. Inspect mobile sizing and scroll ownership in `App.css`.
4. Read the mobile-focus and swipe tests in `App.test.tsx`.
5. Treat DOM placement, focus scopes, scroll ownership, and `visualViewport` behavior as one subsystem.
