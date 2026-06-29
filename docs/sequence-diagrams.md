# Task Manager Sequence Diagrams

## Purpose

This document traces important user-visible workflows through the current Task
Manager architecture.

The diagrams show existing behavior only. They distinguish:

- presentation components that emit user intent;
- `App.tsx` workflows that coordinate multiple domains;
- bounded hook ownership;
- pure utility calculations;
- frontend API transport;
- backend controller and repository behavior;
- frontend local-state reconciliation;
- tests that protect each flow.

Backend controllers communicate directly with repositories. There is no
backend service layer in the current implementation.

## Diagram Conventions

| Participant | Meaning |
| --- | --- |
| User | Person interacting with the application |
| Component | Presentation component that emits the action |
| `App.tsx` | Frontend composition and cross-domain orchestration owner |
| Hook | Bounded state and mutation owner |
| Utility | Pure calculation or transformation |
| Frontend API | Functions in `taskmanager-frontend/src/api/tasks.ts` |
| Controller | Spring REST controller |
| Repository / Entity | Spring Data repository and persisted entity |
| Local State | React state, hook state, refs, DOM state, or derived view updates |

---

## 1. Create Task

The create-task presentation collects values, while `App.tsx` owns the draft,
validation, multi-request creation workflow, local task update, form reset, and
confirmation toast.

```mermaid
sequenceDiagram
    actor User
    participant Form as Create-task components
    participant App as App.tsx / addTask
    participant Util as taskScheduling + taskForm
    participant API as Frontend API
    participant TaskCtl as TaskController
    participant TaskRepo as TaskRepository / Task
    participant TagRepo as TagRepository / Task.tags
    participant RecRepo as RecurrenceRuleRepository / RecurrenceRule
    participant State as App local state

    User->>Form: Enter task fields and click Add
    Form->>App: addTask()
    App->>Util: buildTaskSchedule(create draft)
    Util-->>App: start and optional end timestamps
    App->>Util: validateTaskTimeRange(start, end)

    alt Invalid title or time range
        App->>State: Set validation feedback
    else Valid task
        App->>API: createTask(base task payload)
        API->>TaskCtl: POST /tasks
        TaskCtl->>TaskCtl: Validate task and time range
        TaskCtl->>TaskRepo: save(Task)
        TaskRepo-->>TaskCtl: Saved task
        TaskCtl-->>API: 201 Created with task
        API-->>App: Saved task

        opt Recurrence selected
            App->>API: setRepeat(taskID, frequency)
            API->>TaskCtl: PATCH /tasks/{id}/repeat
            TaskCtl->>RecRepo: save(RecurrenceRule)
            TaskCtl->>TaskRepo: save(task with recurrenceRuleID)
            TaskCtl-->>App: Task with recurrence reference
        end

        opt Tags selected
            loop Each selected tag
                App->>API: addTagToTask(taskID, tagID)
                API->>TaskCtl: POST /tasks/{id}/tags/{tagId}
                TaskCtl->>TagRepo: findById(tagID)
                TaskCtl->>TaskRepo: save(task with tag)
            end
        end

        App->>State: Append composed task
        App->>State: Reset create draft
        App->>State: Queue confirmation toast
    end
```

### Existing Owners

- **User action:** Enter values and click Add.
- **Frontend component:** Create-task field components render the draft and
  invoke the callback supplied by `App.tsx`.
- **Owner:** `App.tsx` owns `addTask`, the create draft, mutation ordering,
  task state, reset behavior, and toast queue.
- **Utilities:** `buildTaskSchedule` and `validateTaskTimeRange`.
- **Frontend API:** `createTask`, optional `setRepeat`, and optional
  `addTagToTask`.
- **Backend:** `TaskController` with `TaskRepository`, `TagRepository`, and
  `RecurrenceRuleRepository`.
- **Local update:** The composed task is appended to `tasks`; create fields
  reset; a confirmation toast is queued.

### Tests Protecting the Flow

- `App.test.tsx`
  - `clicking Add shows a non-disruptive task-created toast`
  - `task-created confirmation toast auto-dismisses`
  - `create task can select daily recurrence and saves it`
  - `create task can select weekly and monthly recurrence`
  - `create task with start and end sends endDateTimeScheduled with priority project and tags`
  - `create task blocks end time before start time`
  - `create task blocks end time equal to start time and clears when valid`
- `api/tasks.test.ts`: `createTask`, `setRepeat`, and `addTagToTask` transport
  tests.
- `TaskControllerTest.java`: task creation, validation, scheduling,
  recurrence, and tag-association endpoint tests.
- Utility tests: `taskScheduling.test.ts` and `taskForm.test.ts`.

---

## 2. Edit Task and Autosave

Inline, mobile, and detail editing share one draft. `App.tsx` initializes that
draft, owns both explicit saves and detail-panel autosave, updates the base
task, reconciles tags and recurrence, and updates the primary task collection.

```mermaid
sequenceDiagram
    actor User
    participant Editor as Inline, mobile, or detail editor
    participant App as App.tsx
    participant DraftUtil as taskEditDraft
    participant ScheduleUtil as taskScheduling + taskForm
    participant API as Frontend API
    participant TaskCtl as TaskController
    participant TaskRepo as TaskRepository / Task
    participant TagRepo as TagRepository / Task.tags
    participant RecRepo as RecurrenceRuleRepository / RecurrenceRule
    participant State as Shared edit draft + tasks

    User->>Editor: Start editing task
    Editor->>App: startEdit(task) or openPanel(task)
    App->>DraftUtil: deriveTaskEditDraft(task, time mode)
    DraftUtil-->>App: Shared edit values
    App->>State: Populate one shared edit draft
    App->>API: getTask(taskID)
    API->>TaskCtl: GET /tasks/{id}
    TaskCtl->>TaskRepo: findById(taskID)
    TaskCtl-->>App: Fresh task and tag ordering

    opt Existing recurrence
        App->>API: getRecurrence(taskID)
        API->>TaskCtl: GET /tasks/{id}/recurrence
        TaskCtl->>RecRepo: findById(recurrenceRuleID)
        TaskCtl-->>App: Recurrence rule
    end

    User->>Editor: Change a field
    Editor->>App: Update shared edit draft
    alt Detail-panel edit or immediate autosave action
        Editor->>App: scheduleAutoSave()
        App->>State: Replace pending autosave timer
        Note over App,State: After debounce, refs resolve current task and save function
    else Inline or mobile edit
        User->>Editor: Click Save
        Editor->>App: saveEdit(task)
    end

    App->>ScheduleUtil: buildTaskSchedule(edit draft)
    ScheduleUtil-->>App: start and optional end timestamps
    App->>ScheduleUtil: validateTaskTimeRange(start, end)

    alt Valid edit
        App->>API: updateTask(taskID, base fields)
        API->>TaskCtl: PUT /tasks/{id}
        TaskCtl->>TaskRepo: findById and save(Task)
        TaskCtl-->>App: Saved base task

        par Add selected tags
            App->>API: addTagToTask(taskID, tagID)
            API->>TaskCtl: POST /tasks/{id}/tags/{tagId}
            TaskCtl->>TagRepo: findById(tagID)
            TaskCtl->>TaskRepo: save(task with tag)
        and Remove deselected tags
            App->>API: removeTagFromTask(taskID, tagID)
            API->>TaskCtl: DELETE /tasks/{id}/tags/{tagId}
            TaskCtl->>TaskRepo: save(task without tag)
        end

        App->>State: Replace task with saved base fields and reconciled tags

        opt Recurrence changed
            App->>API: setRepeat(taskID, frequency or null)
            API->>TaskCtl: PATCH /tasks/{id}/repeat
            TaskCtl->>RecRepo: Save or delete recurrence rule
            TaskCtl->>TaskRepo: Save recurrence reference
            App->>API: getTask(taskID)
            App->>State: Reconcile recurrenceRuleID
        end
    end
```

### Existing Owners

- **User action:** Open an editor and change task fields.
- **Frontend component:** Inline edit form, mobile edit form, or detail-panel
  fields.
- **Owner:** `App.tsx` owns `startEdit`, the shared edit draft,
  `scheduleAutoSave`, `saveEdit`, task selection, and local task
  reconciliation.
- **Utilities:** `deriveTaskEditDraft`, `buildTaskSchedule`, and
  `validateTaskTimeRange`.
- **Frontend API:** `getTask`, `getRecurrence`, `updateTask`,
  `addTagToTask`, `removeTagFromTask`, and `setRepeat`.
- **Backend:** `TaskController`, `TaskRepository`, `TagRepository`, and
  `RecurrenceRuleRepository`.
- **Local update:** Shared draft values change immediately. Detail-panel field
  changes schedule debounced autosave, while inline and mobile editors normally
  use explicit Save. Successful save replaces the task in `tasks`; recurrence
  is reconciled separately.

Closing or switching task panels clears the timer and flushes the pending edit
through `saveEdit`.

### Tests Protecting the Flow

- `App.test.tsx`
  - `saving mobile edit restores the updated task card`
  - `inline edit form hydrates and saves changed project and tags`
  - `inline edit end time can be changed and saved`
  - `inline edit hydrates existing recurrence`
  - `inline edit can change recurrence`
  - `inline edit can remove recurrence`
  - `creating a new project from inline edit applies it on save`
  - `creating a new tag from inline edit applies it on save`
- `api/tasks.test.ts`: `getTask`, `updateTask`, `addTagToTask`,
  `removeTagFromTask`, `getRecurrence`, and `setRepeat`.
- `TaskControllerTest.java`: update, time-range validation, tag association,
  and recurrence endpoint tests.
- Utility tests: `taskEditDraft.test.ts`, `taskScheduling.test.ts`, and
  `taskForm.test.ts`.

---

## 3. Complete Recurring Task

Completing an active recurring task is a replacement workflow, not a status
update. `App.tsx` creates the next occurrence, copies associations, deletes the
completed occurrence, and replaces local task state.

```mermaid
sequenceDiagram
    actor User
    participant Card as TaskCardMain
    participant App as App.tsx
    participant Util as taskRecurrence
    participant API as Frontend API
    participant TaskCtl as TaskController
    participant TaskRepo as TaskRepository / Task
    participant TagRepo as TagRepository / Task.tags
    participant RecRepo as RecurrenceRuleRepository / RecurrenceRule
    participant State as App tasks + selection + DOM highlight

    User->>Card: Complete active recurring task
    Card->>App: toggleComplete(task)
    App->>API: getRecurrence(taskID)
    API->>TaskCtl: GET /tasks/{id}/recurrence
    TaskCtl->>TaskRepo: findById(taskID)
    TaskCtl->>RecRepo: findById(recurrenceRuleID)
    TaskCtl-->>App: Recurrence rule

    App->>Util: buildRecurringTaskSchedule(task schedule, frequency)
    Util-->>App: Next start and duration-preserving end

    App->>API: createTask(next occurrence payload)
    API->>TaskCtl: POST /tasks
    TaskCtl->>TaskRepo: save(next Task)
    TaskCtl-->>App: Next task

    opt Original task has tags
        loop Each original tag
            App->>API: addTagToTask(nextTaskID, tagID)
            API->>TaskCtl: POST /tasks/{id}/tags/{tagId}
            TaskCtl->>TagRepo: findById(tagID)
            TaskCtl->>TaskRepo: save(next task with tag)
        end
    end

    App->>API: setRepeat(nextTaskID, frequency)
    API->>TaskCtl: PATCH /tasks/{id}/repeat
    TaskCtl->>RecRepo: save(RecurrenceRule)
    TaskCtl->>TaskRepo: save(next task recurrence reference)

    App->>API: getTask(nextTaskID)
    App->>API: deleteTask(completedTaskID)
    API->>TaskCtl: DELETE /tasks/{id}
    TaskCtl->>TaskRepo: deleteById(completedTaskID)

    App->>State: Remove completed task and append replacement
    App->>State: Clear selection if it targeted completed task
    App->>State: Scroll to and highlight next occurrence
```

### Existing Owners

- **User action:** Complete a recurring task from the task card or a status
  movement that resolves to Done.
- **Frontend component:** `TaskCardMain` emits `onToggleComplete`.
- **Owner:** `App.tsx` owns `toggleComplete` and `completeRecurringTask`.
- **Utility:** `buildRecurringTaskSchedule` preserves the scheduled duration.
- **Frontend API:** `getRecurrence`, `createTask`, `addTagToTask`, `setRepeat`,
  `getTask`, and `deleteTask`.
- **Backend:** `TaskController`, `TaskRepository`, `TagRepository`, and
  `RecurrenceRuleRepository`.
- **Local update:** The completed occurrence is replaced in `tasks`; matching
  selection closes; the next occurrence is highlighted.

### Tests Protecting the Flow

- `App.test.tsx`
  - `completing a recurring task with end time creates the next occurrence with matching duration`
  - `completed recurring task checkbox toggles back to active without generating a next occurrence`
- `api/tasks.test.ts`: task, recurrence, tag-association, and deletion
  transport tests.
- `TaskControllerTest.java`: create, delete, recurrence, and tag-association
  endpoint tests.
- `taskRecurrence.test.ts`: next-occurrence and duration-preservation
  calculations.

---

## 4. Bulk Complete Recurring Tasks

`useBulkSelection` owns only bulk mode and selected IDs. `App.tsx` owns the
bulk mutation because every selected task may require either a normal status
update or the recurring replacement workflow.

```mermaid
sequenceDiagram
    actor User
    participant Controls as TaskListControls
    participant BulkHook as useBulkSelection
    participant App as App.tsx / bulkMarkDone
    participant Util as taskUtils + taskRecurrence
    participant API as Frontend API
    participant TaskCtl as TaskController
    participant Repos as Task, Tag, and Recurrence repositories
    participant State as App tasks + bulk selection

    User->>Controls: Select tasks and click Mark done
    Controls->>App: bulkMarkDone()
    App->>BulkHook: Read bulkSelectedIds

    loop Each selected task ID, sequentially
        App->>API: getTask(taskID), falling back to local task on failure
        API->>TaskCtl: GET /tasks/{id}
        TaskCtl->>Repos: find task
        TaskCtl-->>App: Current task
        App->>Util: normalizeTaskStatus(task.statusID)

        opt Active task may recur
            App->>API: getRecurrence(taskID)
            API->>TaskCtl: GET /tasks/{id}/recurrence
            TaskCtl->>Repos: find recurrence rule
        end

        alt Recurrence rule exists
            App->>Util: buildRecurringTaskSchedule(...)
            App->>API: Create replacement, copy tags, set repeat, delete old task
            API->>TaskCtl: Multiple bounded task endpoints
            TaskCtl->>Repos: Persist replacement workflow
            App->>State: Replace recurring task locally
        else Non-recurring or already completed
            App->>API: patchTaskStatus(taskID, 2)
            API->>TaskCtl: PATCH /tasks/{id}/status
            TaskCtl->>Repos: save task status
            App->>State: Replace updated task locally
        end
    end

    App->>API: getTasks()
    API->>TaskCtl: GET /tasks
    TaskCtl->>Repos: findAllByOrderByDateTimeScheduledAsc()
    TaskCtl-->>App: Refreshed task collection
    App->>State: Replace tasks with refreshed collection
    App->>BulkHook: clearBulkSelection()
```

### Existing Owners

- **User action:** Select tasks in bulk mode and click Mark done.
- **Frontend component:** `TaskListControls` renders the bulk action bar.
- **Owners:** `useBulkSelection` owns selected IDs; `App.tsx` owns
  `bulkMarkDone` and all task mutations.
- **Utilities:** `normalizeTaskStatus` and, for recurring tasks,
  `buildRecurringTaskSchedule`.
- **Frontend API:** `getTask`, optional `getRecurrence`, recurring replacement
  endpoints, `patchTaskStatus`, and final `getTasks`.
- **Backend:** `TaskController` and task/tag/recurrence repositories.
- **Local update:** Each result is reconciled during the loop; the complete
  task collection is refreshed afterward; bulk mode and selection clear.

### Tests Protecting the Flow

- `App.test.tsx`
  - `"Mark done" in bulk bar calls patchTaskStatus for each selected task`
  - `bulk mark done on a recurring task generates the next occurrence`
  - `bulk mark done on mixed recurring and non-recurring tasks handles both paths`
  - `bulk mark done probes recurrence when selected task data has no recurrenceRuleID`
  - `clicking Cancel exits bulk mode`
- `api/tasks.test.ts`: task status, task loading, recurrence, creation,
  association, and deletion transport tests.
- `TaskControllerTest.java`: status, recurrence, creation, and deletion
  endpoint tests.
- `taskRecurrence.test.ts`: recurring schedule calculation.

---

## 5. Reminder Snooze

Reminder snoozing crosses persisted reminder state and transient toast state.
`App.tsx` owns the workflow, while `useTaskDetailResources` continues to own
the persisted reminder collection.

```mermaid
sequenceDiagram
    actor User
    participant Toast as ToastList
    participant App as App.tsx / snoozeToast
    participant Util as dateTime / toLocalDateTimeString
    participant API as Frontend API / patchReminderDate
    participant Ctl as ReminderController
    participant Repo as ReminderRepository / Reminder
    participant HookState as useTaskDetailResources reminders
    participant ToastState as App toast queue + firedReminders

    User->>Toast: Choose snooze duration
    Toast->>App: snoozeToast(toast, minutes)
    App->>Util: Convert now + minutes to local datetime string
    Util-->>App: New due date
    App->>API: patchReminderDate(reminderID, dueDate)
    API->>Ctl: PATCH /reminders/{id}
    alt Patch succeeds
        Ctl->>Repo: findById(reminderID)
        Ctl->>Repo: save reminder with new due date
        Repo-->>Ctl: Saved reminder
        Ctl-->>App: Updated reminder
        App->>ToastState: Remove reminderID from firedReminders
        App->>HookState: setReminders() with new due date
    else Reminder was already deleted or patch fails
        API-->>App: Patch failure
        App->>App: Silently ignore persisted update failure
    end
    App->>ToastState: Dismiss transient toast
```

### Existing Owners

- **User action:** Select a snooze duration on a reminder toast.
- **Frontend component:** `ToastList`.
- **Owner:** `App.tsx` owns `snoozeToast`, fired-reminder suppression, and the
  toast queue. `useTaskDetailResources` owns the persisted reminder map.
- **Utility:** `toLocalDateTimeString`.
- **Frontend API:** `patchReminderDate`.
- **Backend:** `ReminderController` and `ReminderRepository`.
- **Local update:** On success, remove the reminder ID from
  duplicate-suppression state and update the hook-owned reminder due date
  through `setReminders`. The toast is dismissed whether the patch succeeds or
  fails.

### Tests Protecting the Flow

- `api/tasks.test.ts`: `patchReminderDate` request and error behavior.
- `ReminderControllerTest.java`
  - `patchReminder_found_updatesDueDate`
  - `patchReminder_notFound_returns404`
  - `patchReminder_missingDueDate_returns400`
- `dateTime.test.ts`: local date/time conversion behavior used by reminder
  scheduling.

There is currently no dedicated `App.test.tsx` test that exercises the full
snooze-to-toast-dismiss workflow end to end.

---

## 6. Delete Tag and Reconcile Tasks

Tag deletion demonstrates the boundary between catalog ownership and
cross-domain task reconciliation. The hook deletes the persisted catalog
record and updates its catalog. `App.tsx` then removes the tag from tasks,
drafts, and the active filter.

```mermaid
sequenceDiagram
    actor User
    participant TagUI as Tag dropdown / delete control
    participant App as App.tsx / removeTag
    participant Hook as useProjectTagCatalog
    participant API as Frontend API / deleteTag
    participant Ctl as TagController
    participant Repo as TagRepository / Tag
    participant Catalog as Hook tag catalog
    participant State as App tasks + drafts + filter

    User->>TagUI: Delete tag
    TagUI->>App: removeTag(tagID)
    App->>Hook: deleteTagFromCatalog(tagID)
    Hook->>API: deleteTag(tagID)
    API->>Ctl: DELETE /tags/{id}
    Ctl->>Repo: existsById(tagID)
    Ctl->>Repo: deleteById(tagID)
    Ctl-->>Hook: 204 No Content
    Hook->>Catalog: Remove tag from catalog
    Hook-->>App: true

    App->>State: Remove tag from every local task
    App->>State: Remove tagID from create-task draft
    App->>State: Remove tagID from shared edit draft
    opt Deleted tag is the active tag filter
        App->>State: Clear filterTagID
    end

    alt Backend deletion fails
        Hook->>State: Set top-level error
        Hook-->>App: false
        Note over App,State: No reconciliation occurs
    end
```

### Existing Owners

- **User action:** Click Delete tag from a tag-management surface.
- **Frontend component:** Tag dropdown/delete control rendered by `App.tsx`
  using tag presentation components.
- **Owners:** `useProjectTagCatalog` owns persisted tag deletion and catalog
  state; `App.tsx` owns `removeTag` and reconciliation into tasks, drafts, and
  filters.
- **Utilities:** No utility function participates in this workflow.
- **Frontend API:** `deleteTag`.
- **Backend:** `TagController` and `TagRepository`. Database relationships
  remove the deleted tag association.
- **Local update:** Remove the tag from the catalog, all task tag arrays,
  create/edit selected-tag IDs, and the active tag filter.

### Tests Protecting the Flow

- `api/tasks.test.ts`: `deleteTag` transport and error behavior.
- `TagControllerTest.java`
  - `deleteTag_found_returns204`
  - `deleteTag_notFound_returns404`

There is currently no dedicated `App.test.tsx` test for the complete
catalog-delete plus task/draft/filter reconciliation workflow.

---

## 7. Open Task From Calendar

The calendar owns calendar-local navigation and emits a task ID. `App.tsx`
owns the cross-presentation transition back to the task page, list visibility,
selection, and mobile detail editing.

```mermaid
sequenceDiagram
    actor User
    participant Calendar as Calendar
    participant ViewModel as useTaskListViewModel
    participant App as App.tsx / openTaskFromCalendar
    participant Util as focusTaskById list-control reset
    participant API as Frontend API
    participant Controllers as Task and detail-resource controllers
    participant Repos as Task and detail-resource repositories
    participant State as Mobile page + filters + selection + detail state

    ViewModel-->>Calendar: calTasks derived from primary tasks
    User->>Calendar: Click task in calendar or agenda
    Calendar->>App: onEditTask(taskID)
    App->>State: Set mobilePage to tasks
    App->>Util: focusTaskById(taskID)
    Util->>State: Clear search and task filters
    Util->>State: Schedule scroll and highlight after render

    alt Task is already selected
        App-->>Calendar: Keep current selection
    else Mobile edit layout
        App->>App: openPanel(task)
        App->>API: getTask and optional getRecurrence
        App->>API: Load subtasks, notes, reminders, and attachments
        API->>Controllers: GET bounded task/detail endpoints
        Controllers->>Repos: Read persisted records
        App->>State: Select task, populate shared edit draft, cache detail resources
    else Desktop layout
        App->>State: Close floating controls and action menu
        App->>State: Clear detail-edit identity and select task
    end
```

### Existing Owners

- **User action:** Click a task in calendar or agenda presentation.
- **Frontend component:** `Calendar` invokes `onEditTask(taskID)`.
- **Owners:** `Calendar` owns calendar-local navigation; `App.tsx` owns
  `openTaskFromCalendar`, task-page navigation, list focusing, selection, and
  optional mobile panel opening.
- **Utilities and derived state:** `useTaskListViewModel` derives `calTasks`.
  `focusTaskById` is an `App.tsx` helper that resets list controls and
  schedules DOM scroll/highlight.
- **Frontend API:** No mutation occurs. Mobile panel opening may call
  `getTask`, optional `getRecurrence`, and task-detail resource GET functions.
- **Backend:** No backend call is required on the desktop selection path.
  Mobile panel opening may read through `TaskController` and detail-resource
  controllers/repositories.
- **Local update:** Switch to the task mobile page, clear filters, scroll and
  highlight the task, then select it or open its mobile detail editor.

### Tests Protecting the Flow

- `Calendar.test.tsx`: protects calendar-local year, month, week, and day
  presentation behavior and empty states.
- `App.test.tsx`
  - `swipe starting on the calendar background changes back to task list`
  - `swipe starting on a calendar navigation button does not change mobile view`
- `App.test.tsx` mobile panel and selection tests protect the path used after
  opening a task on mobile.

There is currently no dedicated test named for the complete
calendar-task-click to `openTaskFromCalendar` transition.

---

## 8. Mobile Edit Entry and Focus Protection

Mobile task opening and text focus are one coordinated subsystem. Opening the
task prepares the shared edit draft and detail resources. Once a text field
receives focus, the global guard observes focus, scroll, touch, and
`visualViewport` behavior while preserving the task list as the intended
scroll owner.

```mermaid
sequenceDiagram
    actor User
    participant Card as TaskCardMain
    participant App as App.tsx / mobile ownership
    participant DraftUtil as taskEditDraft
    participant DetailHook as useTaskDetailResources
    participant API as Frontend API
    participant Controllers as Task and detail-resource controllers
    participant Repos as Task and detail-resource repositories
    participant DOM as mobile-edit-row + focus scope
    participant Guard as iOS text-focus guard
    participant Platform as DOM scroll + visualViewport

    User->>Card: Tap task on mobile/coarse pointer layout
    Card->>App: handleTaskCardClick(task)
    App->>App: openPanel(task)
    App->>DraftUtil: deriveTaskEditDraft(task, time mode)
    DraftUtil-->>App: Shared edit values
    App->>API: getTask(taskID)
    App->>API: optional getRecurrence(taskID)
    App->>DetailHook: loadTaskSections(taskID)
    DetailHook->>API: getSubtasks, getNotes, getReminders, getAttachments
    API->>Controllers: GET bounded task and resource endpoints
    Controllers->>Repos: Read records
    App->>DOM: Render mobile editor through mobile-edit-row
    App->>DOM: Attach data-text-focus-scope

    User->>DOM: Touch mobile edit text field
    DOM->>Guard: Prevent native touch focus
    Guard->>DOM: Focus fixed proxy input near safe viewport top
    Guard->>DOM: After 250ms, focus real input with preventScroll
    User->>DOM: Focus mobile edit text field
    DOM->>Guard: focusin event
    Guard->>Guard: Track active field, scope, sequence, and keyboard text mode
    Guard->>Platform: Reset unintended document scroll immediately and in bursts

    par Platform movement
        Platform->>Guard: scroll, resize, or visualViewport event
        Guard->>Platform: Detect drift and correct document scroll
    and Touch movement
        Platform->>Guard: touchstart or touchmove
        Guard->>Platform: Allow bounded textarea scroll or prevent viewport drag
    and Field transition
        DOM->>Guard: focusout followed by focusin
        Guard->>Guard: Reject stale blur cleanup using focus sequence
    end

    Note over DOM,Platform: .app__list remains the mobile task-page scroll owner
```

### Existing Owners

- **User action:** Tap a task on mobile, then focus an edit field.
- **Frontend component:** `TaskCardMain`; the mobile editor is rendered by
  `renderInlineEditForm(task, 'mobile')` through `.mobile-edit-row`.
- **Owners:** `App.tsx` owns mobile task-card behavior, `openPanel`, the shared
  edit draft, mobile edit placement, focus scopes, and the global focus guard.
  `useTaskDetailResources` owns loaded task-detail resources.
- **Utilities:** `deriveTaskEditDraft` and `mobileFocusAssist`. App-owned
  focus and viewport corrections remain post-focus platform helpers.
- **Frontend API:** `getTask`, optional `getRecurrence`, `getSubtasks`,
  `getNotes`, `getReminders`, and `getAttachments`.
- **Backend:** `TaskController` and task-detail resource
  controllers/repositories provide persisted data. Focus protection itself
  performs no backend operation.
- **Local and platform update:** Select the task, populate one shared edit
  draft, cache detail resources, render the dedicated mobile edit row, track
  active focus scope, and correct unintended document/visual viewport drift.

### Tests Protecting the Flow

`App.test.tsx` contains extensive regression coverage, including:

- `mobile edit renders in a stable panel outside the task list item flow`
- `mobile edit panel replaces the edited task item in the task list context`
- `mobile edit panel is not sticky or an independent scroll container`
- `mobile task list remains the scroll owner for mobile edit`
- `mobile edit panel keeps the edit text focus scope separate from the list card`
- `mobile edit entry does not reposition the task list`
- `mobile edit description renders title-style input by default`
- `mobile edit text fields use proxy focus assist before native focus`
- `mobile edit title and description focus do not report visual viewport drift in a stable viewport`
- `visual viewport drift is detected after document scroll has been corrected`
- `mobile text focus prevents touchmove outside the active text field by default`
- `mobile text focus touch guard allows active textarea scrolling within bounds`
- `mobile text focus touch guard prevents textarea overscroll at the top and bottom`
- stale blur, repeated focus, search-to-edit, and edit-entry reset regression
  tests

The mobile focus system also requires simulator or physical-device validation
for the WKWebView-specific visual result.

---

## Cross-Flow Ownership Summary

| Flow | Primary workflow owner | Bounded supporting owner | Durable mutation? |
| --- | --- | --- | --- |
| Create Task | `App.tsx` | Scheduling/form utilities | Yes |
| Edit Task and Autosave | `App.tsx` | Shared edit utilities | Yes |
| Complete Recurring Task | `App.tsx` | Recurrence utility | Yes |
| Bulk Complete Recurring Tasks | `App.tsx` | `useBulkSelection` owns selected IDs only | Yes |
| Reminder Snooze | `App.tsx` | `useTaskDetailResources` owns reminder records | Yes |
| Delete Tag and Reconcile Tasks | `App.tsx` for reconciliation | `useProjectTagCatalog` for catalog deletion | Yes |
| Open Task From Calendar | `App.tsx` | `Calendar` owns calendar-local navigation | No task mutation |
| Mobile Edit Entry and Focus Protection | `App.tsx` | `useTaskDetailResources` for loaded resources | Reads persisted data; focus protection is platform-local |

## Related Documentation

- [Architecture](architecture.md)
- [Ownership Map](ownership-map.md)
- [State Taxonomy](state-taxonomy.md)
- [Mobile Focus System](mobile-focus-system.md)
- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)
- [ADR-003: Autosave Ownership](adr/ADR-003-autosave-ownership.md)
- [ADR-004: Mobile Edit Row](adr/ADR-004-mobile-edit-row.md)
- [ADR-005: iOS Focus Guard](adr/ADR-005-ios-focus-guard.md)
- [ADR-006: Reminder Ownership Split](adr/ADR-006-reminder-ownership-split.md)
- [ADR-007: Recurring Task Replacement](adr/ADR-007-recurring-task-replacement.md)
