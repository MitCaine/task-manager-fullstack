# Test Coverage Map

## Purpose

This document describes how the current application is protected by tests. It
maps user-visible features to direct assertions, indirect protection, frontend
integration coverage, frontend API transport coverage, and backend controller
or repository coverage.

The frontend and backend suites run independently. `App.test.tsx` integrates
React presentation, hooks, utilities, and `App.tsx` orchestration with mocked
API functions. `api/tasks.test.ts` verifies frontend HTTP contracts. Backend
controller tests use mocked repositories, while `TaskRepositoryTest.java`
exercises repository behavior. There is no current automated browser-to-Spring
end-to-end suite.

## Confidence Scale

- **High:** Important feature behavior is asserted directly across its main
  current owners, including orchestration or presentation where applicable.
- **Medium:** Core calculations or persistence contracts are directly tested,
  but part of the user workflow is protected only indirectly.
- **Low:** Tests protect transport and backend contracts, but the current
  frontend user workflow is not directly exercised.

# Coverage Summary

## Direct Tests

- `taskmanager-frontend/src/App.test.tsx` directly protects major task
  creation/editing workflows, recurrence replacement, bulk actions, mobile
  editing, mobile focus protection, settings interactions, statistics modal
  behavior, filter shortcuts, and several task-list empty states.
- Focused frontend suites directly protect calendar presentation and pure
  utilities for schedules, edit drafts, recurrence, statistics, filtering,
  sorting, display helpers, and empty-state selection.
- `taskmanager-frontend/src/api/tasks.test.ts` directly protects the frontend
  request method, path, payload, and response handling for every current
  persisted resource.
- Backend controller suites directly protect task, project, tag, note,
  subtask, reminder, and attachment endpoint behavior and validation.
- `TaskRepositoryTest.java` directly protects default task ordering and
  representative persistence behavior.

## Indirect Tests

- Project and tag catalog deletion/reconciliation, calendar task opening,
  autosave debounce/flush behavior, and some settings persistence behavior are
  exercised through adjacent owners but do not have dedicated workflow cases.
- Notes, subtasks, reminders, and attachments receive indirect frontend
  protection when task detail resources are loaded during task selection and
  mobile editing, but their frontend CRUD workflows are not directly asserted.
- Backend task CRUD endpoints indirectly protect the persisted portions of
  frontend-created, edited, bulk-updated, and recurring replacement tasks.

## Integration Coverage

- Frontend integration coverage is concentrated in `App.test.tsx`. It verifies
  multi-owner behavior inside the React application while mocking the API
  boundary.
- `Calendar.test.tsx` integrates the calendar component with its local view and
  layout behavior.
- Backend MockMvc tests integrate request mapping, validation, controller
  behavior, JSON responses, and mocked repository interactions.
- The repository suite integrates Spring Data task queries with test
  persistence.
- No test currently integrates the real frontend transport with a running
  backend and database.

## Backend Coverage

- Strongest for bounded controller CRUD and validation.
- Task recurrence and task/tag association endpoints are covered in
  `TaskControllerTest.java`.
- Detail resources have dedicated controller suites.
- Default task ordering has repository coverage.
- Cross-domain workflows such as recurring replacement, bulk completion,
  autosave, and reminder delivery are frontend-owned and therefore are not
  backend workflow tests.

## Frontend Coverage

- Strongest for `App.tsx` orchestration, mobile platform behavior, task
  creation/editing, recurrence, bulk selection, filtering, and empty states.
- Pure derivation and formatting behavior has focused utility coverage.
- Every current frontend API function has transport coverage.
- Detail-resource CRUD presentation and several cross-domain lifecycle paths
  have no dedicated frontend workflow tests.

# Feature Coverage

## Task Creation

**Coverage summary:** Direct frontend tests cover title validation, Add and
Enter submission, list reconciliation, confirmation toasts, schedules,
priority, project, tags, recurrence, and time-range validation. Scheduling and
form utilities, API transport, and backend creation validation are directly
tested.

**Files:** `taskmanager-frontend/src/App.test.tsx`;
`taskmanager-frontend/src/api/tasks.test.ts`;
`taskmanager-frontend/src/utils/taskScheduling.test.ts`;
`taskmanager-frontend/src/utils/taskForm.test.ts`;
`taskmanager-frontend/src/utils/dateTime.test.ts`;
`src/test/java/com/example/taskmanager/TaskControllerTest.java`;
`src/test/java/com/example/taskmanager/TaskRepositoryTest.java`.

**Confidence level: High.** The main user workflow and its principal
calculation, transport, validation, and persistence boundaries are asserted.

**Failure detection:** Likely catches broken submission, invalid-title
acceptance, schedule payload regressions, invalid time ranges, lost project or
tag assignment, recurrence setup failures, missing local insertion, and toast
regressions.

**Known coverage gaps:** No automated test runs task creation from the rendered
frontend through a real backend and database. Partial failure after base task
creation but before recurrence or all tag associations is not directly
covered.

## Task Editing

**Coverage summary:** Direct frontend tests cover edit entry, shared draft
hydration, explicit save, schedule/end-time changes, project and tag
reconciliation, recurrence changes, validation, and mobile save behavior.
Utilities, transport, and backend update behavior are directly tested.

**Files:** `taskmanager-frontend/src/App.test.tsx`;
`taskmanager-frontend/src/api/tasks.test.ts`;
`taskmanager-frontend/src/utils/taskEditDraft.test.ts`;
`taskmanager-frontend/src/utils/taskScheduling.test.ts`;
`taskmanager-frontend/src/utils/taskForm.test.ts`;
`taskmanager-frontend/src/utils/taskTimeShift.test.ts`;
`src/test/java/com/example/taskmanager/TaskControllerTest.java`.

**Confidence level: High.** Explicit editing crosses the shared draft,
orchestration, API, and controller boundaries under direct tests.

**Failure detection:** Likely catches incorrect draft hydration, broken edit
entry/save/cancel, lost metadata, invalid schedule acceptance, incorrect tag
reconciliation, recurrence change/removal failures, and local card update
regressions.

**Known coverage gaps:** No real frontend-to-backend edit test exists. Detail
panel field editing is less directly exercised than inline and mobile explicit
save paths.

## Autosave

**Coverage summary:** The complete save workflow, shared edit draft, API
transport, and backend update contracts are protected by task-editing tests.
There is no dedicated frontend test that directly asserts debounce timing,
timer replacement, or flushing on panel close or task switch.

**Files:** `taskmanager-frontend/src/App.test.tsx`;
`taskmanager-frontend/src/api/tasks.test.ts`;
`taskmanager-frontend/src/utils/taskEditDraft.test.ts`;
`taskmanager-frontend/src/utils/taskScheduling.test.ts`;
`taskmanager-frontend/src/utils/taskForm.test.ts`;
`src/test/java/com/example/taskmanager/TaskControllerTest.java`.

**Confidence level: Medium.** The save operation is well protected, but the
autosave lifecycle that invokes it is mostly indirect.

**Failure detection:** Likely catches malformed saved task, tag, recurrence, or
schedule data once a save occurs.

**Known coverage gaps:** Debounce behavior, stale timer/ref protection,
competing edits, and pending-save flush on close or task switch are not
directly asserted.

## Recurrence

**Coverage summary:** Direct tests cover create/edit recurrence selection,
clearing recurrence, duplication, individual and bulk recurring completion,
mixed bulk completion, recurrence probing, next-date calculation, duration
preservation, transport, and backend recurrence endpoints.

**Files:** `taskmanager-frontend/src/App.test.tsx`;
`taskmanager-frontend/src/utils/taskRecurrence.test.ts`;
`taskmanager-frontend/src/api/tasks.test.ts`;
`src/test/java/com/example/taskmanager/TaskControllerTest.java`.

**Confidence level: High.** Both pure recurrence semantics and the frontend
replacement workflow are directly protected.

**Failure detection:** Likely catches incorrect next dates, lost duration or
metadata, failure to create the replacement task, failure to preserve
recurrence, incorrect completed-task behavior, and recurrence endpoint
validation regressions.

**Known coverage gaps:** No real-backend replacement workflow test exists.
Partial failures during the multi-request create/associate/delete replacement
sequence are not directly covered.

## Bulk Selection

**Coverage summary:** Direct frontend tests cover entering and leaving bulk
mode, selected-state action-bar visibility, bulk deletion, ordinary bulk
completion, recurring completion, mixed completion, and recurrence probing.
Task status/delete transport and backend endpoints are directly tested.

**Files:** `taskmanager-frontend/src/App.test.tsx`;
`taskmanager-frontend/src/api/tasks.test.ts`;
`taskmanager-frontend/src/utils/taskRecurrence.test.ts`;
`src/test/java/com/example/taskmanager/TaskControllerTest.java`.

**Confidence level: High.** The principal selection states and both mutation
paths are asserted at the frontend orchestration boundary.

**Failure detection:** Likely catches broken mode transitions, missing action
bar, wrong selected-task mutations, ordinary/recurring path confusion, and
failure to clear or reconcile tasks after bulk actions.

**Known coverage gaps:** Partial failure among multiple selected task requests
and real-backend bulk execution are not directly covered.

## Projects

**Coverage summary:** Direct frontend tests cover project assignment during
create/edit, project creation from inline edit, display lookup, and project
filter derivation. API transport and backend project CRUD are directly tested.

**Files:** `taskmanager-frontend/src/App.test.tsx`;
`taskmanager-frontend/src/api/tasks.test.ts`;
`taskmanager-frontend/src/utils/taskDisplayHelpers.test.ts`;
`taskmanager-frontend/src/utils/taskFiltering.test.ts`;
`src/test/java/com/example/taskmanager/ProjectControllerTest.java`;
`src/test/java/com/example/taskmanager/TaskControllerTest.java`.

**Confidence level: Medium.** Assignment, creation, filtering, transport, and
backend CRUD are protected, but the full catalog lifecycle is not.

**Failure detection:** Likely catches broken assignment payloads, missing
project choices, project lookup/filter regressions, project creation contract
failures, and backend validation regressions.

**Known coverage gaps:** Frontend project deletion and reconciliation of tasks,
drafts, and active filters are not directly asserted. Backend project update
has no matching frontend API function test because the current frontend does
not expose that operation.

## Tags

**Coverage summary:** Direct frontend tests cover create/edit assignment,
removal during edit reconciliation, inline tag creation, tag-chip color
presentation, lookup, and tag filtering. Transport and backend tag CRUD and
task/tag association endpoints are directly tested.

**Files:** `taskmanager-frontend/src/App.test.tsx`;
`taskmanager-frontend/src/api/tasks.test.ts`;
`taskmanager-frontend/src/utils/taskDisplayHelpers.test.ts`;
`taskmanager-frontend/src/utils/taskFiltering.test.ts`;
`src/test/java/com/example/taskmanager/TagControllerTest.java`;
`src/test/java/com/example/taskmanager/TaskControllerTest.java`.

**Confidence level: Medium.** Assignment and bounded API behavior are strong,
while catalog deletion and some presentation paths remain indirect.

**Failure detection:** Likely catches broken assignment/removal requests,
missing tag choices, bad filter/lookup behavior, color presentation
regressions, and backend tag validation failures.

**Known coverage gaps:** Frontend tag deletion reconciliation across tasks,
drafts, and active filters is not directly asserted. Expanded tag-row and
color-picker workflows do not have dedicated frontend behavior tests.

## Calendar

**Coverage summary:** Direct component tests cover week/month/day empty states,
overview range sizing, desktop layout behavior, and completed-task control
styling. `App.test.tsx` directly covers guarded calendar swipes and indirectly
protects task selection behavior.

**Files:** `taskmanager-frontend/src/components/Calendar.test.tsx`;
`taskmanager-frontend/src/App.test.tsx`;
`taskmanager-frontend/src/utils/dateTime.test.ts`;
`taskmanager-frontend/src/utils/taskDisplay.test.ts`.

**Confidence level: Medium.** Calendar-local presentation has focused tests,
but complete navigation and task-opening integration is only partially
protected.

**Failure detection:** Likely catches calendar empty-state regressions,
overview layout/range changes, completed-control styling changes, and mobile
swipe interference with calendar controls.

**Known coverage gaps:** Opening a task from each calendar view, date
navigation semantics, agenda rendering, hide-completed behavior, and
calendar-to-detail/mobile-page coordination are not directly asserted.

## Statistics

**Coverage summary:** Direct utility tests cover empty counts, active/completed
counts, overdue tasks, recent completions, and priority breakdowns. Direct
frontend tests cover opening and closing the statistics modal.

**Files:** `taskmanager-frontend/src/utils/taskStatistics.test.ts`;
`taskmanager-frontend/src/App.test.tsx`.

**Confidence level: High.** The derived values and modal lifecycle are both
directly tested.

**Failure detection:** Likely catches incorrect statistics calculations,
missing Stats control, modal open/close regressions, and failures to display
derived summaries.

**Known coverage gaps:** Modal focus restoration and every visual/statistical
label combination are not directly asserted.

## Filtering

**Coverage summary:** Direct utility tests cover search, status, overdue,
priority, project, tag, date-tab, and completed-task behavior. Direct
`App.test.tsx` cases cover task-count shortcuts and completed/overdue results
and empty states.

**Files:** `taskmanager-frontend/src/utils/taskFiltering.test.ts`;
`taskmanager-frontend/src/utils/taskDisplayHelpers.test.ts`;
`taskmanager-frontend/src/utils/taskEmptyState.test.ts`;
`taskmanager-frontend/src/App.test.tsx`.

**Confidence level: High.** Filter derivation and representative user controls
are directly protected.

**Failure detection:** Likely catches incorrect visible-task sets, priority
interpretation, project/tag filtering, overdue calculation, date-tab
filtering, and count-shortcut regressions.

**Known coverage gaps:** Not every rendered filter control and reset
combination is directly exercised in `App.test.tsx`.

## Sorting

**Coverage summary:** Direct utility tests cover due-date ascending/descending,
title, priority, overdue-first, null-date, and completed-task ordering.
Repository tests cover default backend chronological ordering.

**Files:** `taskmanager-frontend/src/utils/taskFiltering.test.ts`;
`src/test/java/com/example/taskmanager/TaskRepositoryTest.java`;
`taskmanager-frontend/src/App.test.tsx`.

**Confidence level: Medium.** Sorting algorithms and default repository order
are directly tested, but rendered sort-control interaction is not directly
asserted.

**Failure detection:** Likely catches incorrect computed ordering, null-date
placement changes, completed-task placement changes, and backend default-order
regressions.

**Known coverage gaps:** Selecting and resetting sort through the rendered
frontend controls is not directly covered.

## Notes

**Coverage summary:** Frontend API transport and backend note controller
behavior are directly tested. Task selection/detail loading gives indirect
protection to resource loading, but note CRUD through the rendered frontend is
not directly tested.

**Files:** `taskmanager-frontend/src/api/tasks.test.ts`;
`src/test/java/com/example/taskmanager/NoteControllerTest.java`;
`taskmanager-frontend/src/App.test.tsx`.

**Confidence level: Low.** Persistence contracts are protected, but the
frontend note workflow and hook reconciliation are not directly exercised.

**Failure detection:** Likely catches wrong note API paths/payloads, missing
parent-task handling, invalid controller responses, timestamp behavior, and
delete endpoint regressions.

**Known coverage gaps:** Frontend note loading, section expansion, draft
handling, creation, rendered list update, deletion, and error reconciliation
are not directly asserted.

## Subtasks

**Coverage summary:** Frontend transport and backend controller tests directly
cover list, create, update, status patch, delete, validation, and parent-task
checks. The rendered frontend workflow is not directly tested.

**Files:** `taskmanager-frontend/src/api/tasks.test.ts`;
`src/test/java/com/example/taskmanager/SubtaskControllerTest.java`;
`taskmanager-frontend/src/App.test.tsx`.

**Confidence level: Low.** Endpoint coverage is broad, but frontend subtask
state and interactions have no dedicated workflow cases.

**Failure detection:** Likely catches transport contract regressions, invalid
title handling, parent-task failures, status update failures, and missing
update/delete responses.

**Known coverage gaps:** Frontend subtask loading, create/edit drafts, rendered
creation/update/deletion, status toggling, and local reconciliation are not
directly asserted.

## Reminders

**Coverage summary:** Frontend transport and backend controller tests directly
cover reminder list/create/delete/date-patch contracts and validation.
Date/time utilities provide indirect support. No dedicated frontend workflow
test covers reminder CRUD, polling, due delivery, dismissal, or snoozing.

**Files:** `taskmanager-frontend/src/api/tasks.test.ts`;
`taskmanager-frontend/src/utils/dateTime.test.ts`;
`taskmanager-frontend/src/utils/taskForm.test.ts`;
`src/test/java/com/example/taskmanager/ReminderControllerTest.java`;
`taskmanager-frontend/src/App.test.tsx`.

**Confidence level: Low.** Persisted reminder operations are protected, but
the frontend-owned delivery lifecycle is not directly tested.

**Failure detection:** Likely catches incorrect reminder request contracts,
missing due dates, parent-task failures, and backend snooze date updates.

**Known coverage gaps:** Frontend reminder form behavior, local CRUD
reconciliation, polling, due detection, duplicate suppression, toast
delivery/dismissal, snoozing coordination, and browser notification behavior
are not directly asserted.

## Attachments

**Coverage summary:** Frontend API transport and backend controller behavior
are directly tested for list/create/delete, parent-task checks, validation,
path-owned task IDs, and file-size defaults. The rendered frontend workflow is
not directly tested.

**Files:** `taskmanager-frontend/src/api/tasks.test.ts`;
`src/test/java/com/example/taskmanager/AttachmentControllerTest.java`;
`taskmanager-frontend/src/App.test.tsx`.

**Confidence level: Low.** Bounded persistence contracts are strong, but
frontend attachment behavior has no dedicated workflow coverage.

**Failure detection:** Likely catches wrong attachment request contracts,
blank/missing link validation, parent-task failures, task-ID trust
regressions, and delete endpoint failures.

**Known coverage gaps:** Frontend attachment loading, URL/label drafts,
rendered creation/deletion, link presentation, and local reconciliation are
not directly asserted.

## Mobile Editing

**Coverage summary:** Extensive direct `App.test.tsx` coverage protects mobile
edit entry, dedicated-row placement, card replacement, save/cancel, controls,
scroll ownership, focus scope, stable entry position, and mobile description
input semantics. Shared edit utilities and task transport/backend update tests
provide additional protection.

**Files:** `taskmanager-frontend/src/App.test.tsx`;
`taskmanager-frontend/src/utils/taskEditDraft.test.ts`;
`taskmanager-frontend/src/utils/taskScheduling.test.ts`;
`taskmanager-frontend/src/utils/taskForm.test.ts`;
`taskmanager-frontend/src/api/tasks.test.ts`;
`src/test/java/com/example/taskmanager/TaskControllerTest.java`.

**Confidence level: High.** The architecture-sensitive mobile edit placement
and explicit save behavior are directly asserted.

**Failure detection:** Likely catches edit-row placement changes, nested/sticky
scroll regressions, lost card replacement, broken controls, wrong input type,
focus-scope regressions, and failed save/cancel behavior.

**Known coverage gaps:** Tests run in jsdom rather than an actual mobile
browser or WKWebView. Real keyboard, caret, touch, and visual layout behavior
remain outside automated coverage.

## Mobile Focus Protection

**Coverage summary:** Extensive direct `App.test.tsx` cases protect focus
transitions across create, search, and edit fields; stale blur handling;
sequence reuse; document and visual viewport correction; touchmove
prevention; bounded textarea scrolling; debug gating; and swipe coexistence.

**Files:** `taskmanager-frontend/src/App.test.tsx`.

**Confidence level: High.** The guard's observable event sequencing and DOM
invariants have unusually detailed regression coverage.

**Failure detection:** Likely catches stale blur disabling protection, missed
scroll/viewport correction, duplicate scheduling, touch leakage, textarea
overscroll, broken focus scopes, and interference with horizontal paging.

**Known coverage gaps:** jsdom cannot reproduce real iOS WKWebView keyboard,
visual viewport, caret auto-scroll, or white-gap rendering failures. Device or
simulator behavior is not automated.

## Settings

**Coverage summary:** Direct frontend tests cover settings trigger state,
rendered controls, time-format toggling, time/date display effects, and Escape
priority while a detail panel is open. Date/time and form utilities are
directly tested.

**Files:** `taskmanager-frontend/src/App.test.tsx`;
`taskmanager-frontend/src/utils/dateTime.test.ts`;
`taskmanager-frontend/src/utils/taskForm.test.ts`.

**Confidence level: Medium.** Main interactions and format consequences are
protected, but the complete preference lifecycle is not.

**Failure detection:** Likely catches missing settings controls, broken
open/close state, Escape ordering regressions, and 12/24-hour display or form
conversion failures.

**Known coverage gaps:** Theme changes, local-storage persistence/restoration,
outside-click behavior, and focus restoration are not directly asserted.

## Empty States

**Coverage summary:** Direct utility tests protect empty-state precedence and
messages for search, completed, overdue, active filters, tabs, and default
state. `App.test.tsx` directly covers default/mobile, completed, and overdue
task-list empty states. Calendar tests cover week, month, and day empty states.

**Files:** `taskmanager-frontend/src/utils/taskEmptyState.test.ts`;
`taskmanager-frontend/src/utils/taskFiltering.test.ts`;
`taskmanager-frontend/src/App.test.tsx`;
`taskmanager-frontend/src/components/Calendar.test.tsx`.

**Confidence level: High.** Both derivation and representative rendered
task-list/calendar states are directly asserted.

**Failure detection:** Likely catches wrong empty-state precedence, incorrect
completed/overdue/default messaging, missing mobile Add guidance, and missing
calendar view empty states.

**Known coverage gaps:** Not every filter/tab/search combination is rendered
through `App.test.tsx`, and calendar agenda/overview empty-state variants are
not directly asserted.

# Coverage Matrix

| Feature | Frontend tests | Backend tests | Integration protection | Confidence level |
| --- | --- | --- | --- | --- |
| Task Creation | App workflow, API, schedule/form/date utilities | Task controller, task repository | Frontend orchestration + backend request/persistence layers, separately | High |
| Task Editing | App workflow, API, edit/schedule/form/time-shift utilities | Task controller | Frontend orchestration + backend request layer, separately | High |
| Autosave | Shared edit/save path and API; no direct lifecycle case | Task controller | Save path only; debounce/flush lifecycle indirect | Medium |
| Recurrence | App workflow, API, recurrence utility | Task controller | Frontend replacement orchestration + backend recurrence endpoints, separately | High |
| Bulk Selection | App workflow, API, recurrence utility | Task controller | Frontend bulk orchestration + bounded backend mutations, separately | High |
| Projects | App assignment/create paths, API, display/filter utilities | Project and task controllers | Partial frontend catalog workflow + backend CRUD, separately | Medium |
| Tags | App assignment/create/display paths, API, display/filter utilities | Tag and task controllers | Partial frontend catalog workflow + backend CRUD/associations, separately | Medium |
| Calendar | Calendar component, App swipe/selection-adjacent cases, date/display utilities | None specific | Component integration only | Medium |
| Statistics | Statistics utility and App modal cases | None specific | Derived-data utility + modal integration | High |
| Filtering | Filtering/display/empty-state utilities and App shortcut cases | None | Derived-data utility + representative App controls | High |
| Sorting | Filtering utility; no direct rendered control case | Task repository default ordering | Algorithm and repository layers, separately | Medium |
| Notes | API transport; no frontend CRUD workflow | Note controller | Transport and backend request layers only | Low |
| Subtasks | API transport; no frontend CRUD workflow | Subtask controller | Transport and backend request layers only | Low |
| Reminders | API/date/form support; no frontend delivery workflow | Reminder controller | Transport and backend request layers only | Low |
| Attachments | API transport; no frontend CRUD workflow | Attachment controller | Transport and backend request layers only | Low |
| Mobile Editing | Extensive App workflow plus edit utilities/API | Task controller | Frontend mobile orchestration + backend task update, separately | High |
| Mobile Focus Protection | Extensive App event/DOM regression cases | None | Frontend jsdom integration only | High |
| Settings | App interaction/display cases and date/form utilities | None | Frontend integration only | Medium |
| Empty States | Empty-state/filter utilities, App cases, Calendar cases | None | Utility + rendered frontend integration | High |
