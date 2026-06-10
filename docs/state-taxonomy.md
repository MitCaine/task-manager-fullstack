# Task Manager State Taxonomy

## Purpose

This document classifies the state used by Task Manager according to its
authority, lifecycle, and owner.

The categories are intended to answer:

- Is this value an authoritative saved record, pending user input, or a
  calculation?
- How long should it live?
- Which owner has enough context to change it safely?
- What should reset it?
- What failure is likely if ownership moves?

State category is not determined only by whether a value uses React
`useState`. The same storage mechanism holds persisted working copies, drafts,
presentation controls, transient workflow state, and platform observations.
The correct category depends on what the value represents.

## Classification Summary

| Category | Meaning | Typical owner |
| --- | --- | --- |
| Persisted state | Saved domain records whose durable authority is the backend database, plus explicitly local saved preferences | `App.tsx`, bounded resource hooks, backend controllers and repositories |
| Draft state | Unsaved or partially saved user input being prepared for a mutation | `App.tsx` or the bounded hook that owns the matching form workflow |
| Derived state | Values calculated from authoritative state and controls rather than independently saved | `useTaskListViewModel`, pure utilities, and bounded presentation calculations |
| Presentation-local state | State needed only to render or operate one bounded presentation surface | The component that renders the surface, or `App.tsx` when coordination is application-wide |
| Transient state | Short-lived workflow, selection, notification, loading, or error state that coordinates behavior but is not a durable domain record | `App.tsx` or a bounded behavioral hook |
| Platform state | Browser, DOM, viewport, pointer, focus, timer, and scroll conditions observed or guarded by the application | `App.tsx`, platform-sensitive components, and DOM refs |

The frontend commonly holds a working copy of persisted records. The backend
database remains the durable authority, while the owning frontend state is the
authority for the currently rendered application until the next request or
mutation response.

---

## Persisted State

### Definition

Persisted state represents domain information or explicit preferences that
survive the current interaction and are expected to be restored later.

Most persisted state is saved through the REST API into MySQL. The frontend
stores working copies so it can render the current application and reconcile
successful mutation responses. A small set of display preferences is persisted
locally through `localStorage` instead of the backend.

### Examples From This App

- Tasks, including title, description, schedule, status, priority, project,
  recurrence ID, and tags
- Projects and tags
- Subtasks, notes, reminders, and attachments
- Recurrence rules
- Locally saved theme

### Current Owner

| State | Frontend owner | Durable owner |
| --- | --- | --- |
| Primary task collection | `App.tsx` | `TaskController`, `TaskRepository`, and the database |
| Project and tag catalogs | `useProjectTagCatalog` | Project/tag controllers, repositories, and the database |
| Subtasks, notes, reminders, attachments | `useTaskDetailResources` | Resource controllers, repositories, and the database |
| Theme | `App.tsx` | Browser `localStorage` |

The frontend API module transports persisted state but does not own it.
Presentation components render records and emit intent but do not become their
authoritative owner.

### Lifecycle

Backend-persisted state is:

1. Loaded during application hydration or when a task detail panel opens.
2. Stored in the owning frontend collection.
3. Updated after a successful API response.
4. Reconciled after related mutations.
5. Replaced by later server responses or removed after deletion.

Task-detail resources are cached by task ID while the application is running.
Their frontend copies are cleared when the parent task is deleted.

### Common Mistakes

- Treating a presentation component's copy of a record as authoritative
- Updating frontend state before considering whether the backend mutation
  succeeded
- Letting a catalog hook reconcile task assignments even though it does not
  own tasks
- Treating persisted reminders and transient reminder toasts as the same state
- Assuming a frontend working copy is durable without a successful API
  mutation
- Duplicating task state in calendar, list, and detail components

### Why This State Belongs Here

These values describe durable product information rather than a temporary UI
condition. They must survive the interaction that created or changed them and
must remain consistent across multiple presentations.

Tasks remain owned by `App.tsx` on the frontend because task mutations affect
the primary collection and frequently cross recurrence, tag, selection, and
rendered-list behavior. Projects, tags, and detail resources have narrower
hook owners because their persisted collections and CRUD operations form
coherent boundaries.

---

## Draft State

### Definition

Draft state is user input that has not yet become authoritative persisted
state, or that is waiting for a coordinated save workflow to complete.

Drafts may be initialized from persisted records, but they must remain
separate until validation and mutation behavior decide how to save them.

### Examples From This App

- Create-task title, description, date, time, end time, priority, project,
  selected tags, and recurrence frequency
- Shared edit-task title, description, schedule, priority, project, selected
  tags, and recurrence frequency
- New project and tag titles and new tag color
- New subtask title and subtask-title edit value
- New note content
- New reminder date, time, and message
- New attachment URL and label

### Current Owner

| Draft | Owner |
| --- | --- |
| Create-task draft | `App.tsx` |
| Shared inline/mobile/detail edit draft | `App.tsx` |
| Project and tag creation drafts | `useProjectTagCatalog` |
| Subtask, note, reminder, and attachment drafts | `useTaskDetailResources` |

Create and edit presentation components receive draft values and callbacks,
but do not own independent drafts.

### Lifecycle

Create-task drafts begin with form defaults, change through user input, and
reset after successful task creation.

The shared edit draft is initialized from a persisted task when editing
starts. It remains authoritative for pending inline, mobile, and detail-panel
changes until autosave or an explicit save reconciles it with persisted state.
Pending edits are flushed when the selected task or panel changes.

Bounded resource drafts reset after successful creation and when task-detail
sections load for a newly opened task.

### Common Mistakes

- Creating separate edit drafts for inline, mobile, and detail presentations
- Storing drafts inside components that may unmount before save
- Treating a draft as persisted before all related mutations complete
- Saving only base task fields while ignoring draft tag or recurrence changes
- Reusing one draft across unrelated resource domains
- Forgetting to reset a successful create draft

### Why This State Belongs Here

Drafts represent user intent that may still be incomplete, invalid, or
unsaved. They require a lifecycle distinct from durable records.

The shared edit draft belongs in `App.tsx` because autosave, selected-task
lifecycle, tags, recurrence, and all three edit presentations depend on one
authoritative pending version. Resource-specific drafts belong in their
bounded hooks because those hooks own the matching resource mutation.

---

## Derived State

### Definition

Derived state is calculated from authoritative state and control values. It is
not independently mutated or persisted.

When its inputs change, derived state should be recomputed rather than
manually synchronized.

### Examples From This App

- Filtered and sorted visible tasks (`tabTasks`)
- Calendar task subset (`calTasks`)
- Completed and overdue counts
- Statistics data
- Empty-state selection
- Interpreted priority filter values
- Calendar tasks grouped by date
- Upcoming agenda entries
- Form validation results and display formatting
- Whether a task is overdue

### Current Owner

`useTaskListViewModel` owns the main application-level derived task views:

- visible list tasks;
- calendar task subset;
- counts;
- statistics;
- empty-state data;
- interpreted filter values.

Pure utilities own deterministic calculations such as filtering, statistics,
schedule construction, recurrence dates, date/time formatting, and task
predicates.

`Calendar` owns calculations used only by its presentation, such as grouping
tasks by date and constructing agenda entries.

### Lifecycle

Derived values exist only while their inputs exist. They are recalculated when
tasks, filters, sort controls, calendar controls, or preferences change.

They do not require explicit reset logic. Resetting or changing the source
state naturally changes the derived result.

### Common Mistakes

- Storing filtered tasks as a second authoritative task collection
- Mutating the calendar task subset independently from the primary tasks
- Persisting counts or statistics that can be calculated from tasks
- Manually synchronizing derived state after every mutation
- Letting a view-model hook mutate the source task collection
- Moving pure calculations into stateful orchestration code without need

### Why This State Belongs Here

These values have no independent identity. Their correctness depends entirely
on their inputs.

Keeping them derived prevents synchronization bugs among list, calendar,
statistics, and task state. It also allows `useTaskListViewModel` and utilities
to remain bounded owners without taking responsibility for persisted tasks or
mutations.

---

## Presentation-Local State

### Definition

Presentation-local state controls how a bounded interface is currently shown
or operated. It does not represent durable domain data and does not coordinate
a cross-domain workflow.

This state should remain as close as practical to the presentation surface
that needs it. Some presentation state remains in `App.tsx` when global
outside-click, Escape ordering, focus restoration, or placement requires an
application-wide owner.

### Examples From This App

- Calendar year, month, week, day, current view, and picker visibility
- `DateTimeRow`'s internally open time selector
- Settings and statistics modal visibility
- Dropdown, action-menu, color-picker, and inline-form visibility
- Expanded task-tag display IDs
- Expanded detail sections
- Search, filter, sort, view-tab, and hide-completed controls
- Active mobile page

### Current Owner

| State | Owner |
| --- | --- |
| Calendar navigation and picker state | `Calendar` |
| Internal time selector | `DateTimeRow` |
| Search, filter, sort, view tab, calendar hide-completed | `App.tsx` |
| Global dropdown, overlay, action-menu, and inline-form visibility | `App.tsx` |
| Active mobile page and pager presentation | `App.tsx` |

Global presentation controls remain in `App.tsx` when they participate in
outside-click behavior, Escape priority, focus restoration, or mobile pager
coordination.

### Lifecycle

Presentation-local state normally begins with a default when its owner mounts
and changes through user interaction.

It resets when:

- the owning component unmounts;
- a picker, menu, modal, or panel closes;
- Escape or outside-click handling closes the active surface;
- a conflicting global control opens;
- the application intentionally returns to a default view.

The active mobile page persists only for the current mounted application
session. It is not a saved user preference.

### Common Mistakes

- Persisting temporary picker or menu visibility
- Moving globally coordinated dropdown state into isolated components
- Treating the active mobile page as task-domain state
- Letting calendar-local navigation mutate or own tasks
- Combining presentation controls with persisted catalogs or resources
- Assuming every presentation-local value must live in the rendering
  component, even when global Escape, focus, or outside-click behavior owns it

### Why This State Belongs Here

These values describe the current presentation rather than the product's
durable records or a pending mutation.

Calendar navigation is local because it affects only calendar rendering.
Dropdown and overlay state remains in `App.tsx` where application-wide
interaction rules require coordination. The mobile page is presentation state
owned by `App.tsx` because the pager and swipe system span the application's
three mobile surfaces.

---

## Transient State

### Definition

Transient state represents short-lived workflow or application conditions.
It coordinates behavior during the current session but is neither a durable
record nor merely a local visual control.

Transient state often crosses presentation boundaries or affects mutation
behavior, which is why it commonly belongs to `App.tsx` or a bounded
behavioral hook rather than a leaf component.

### Examples From This App

- Selected task ID and detail-panel lifecycle
- Active inline or mobile editing task ID
- Bulk mode and selected bulk task IDs
- Reminder toast queue
- Fired-reminder suppression set
- Loading and top-level error state
- Delete confirmation target
- Status-move target
- Autosave timer and current-save refs
- Swipe start coordinates and long-press state
- Focus restoration targets

### Current Owner

| State | Owner |
| --- | --- |
| Selected task and active editor identity | `App.tsx` |
| Bulk mode and selected IDs | `useBulkSelection` |
| Reminder toast queue and fired-reminder suppression | `App.tsx` |
| Confirmation, status-move, loading, and error workflow state | `App.tsx` |
| Confirmation-toast auto-dismiss timers | `ToastList` |
| Autosave timer and current task/save refs | `App.tsx` |

### Lifecycle

Transient state begins in response to an event or workflow and ends when that
workflow completes, is dismissed, becomes invalid, or the application
unmounts.

Examples:

- Selected task resets when the panel closes or the selected task is deleted.
- Bulk selection clears when bulk mode toggles or a bulk action completes.
- Reminder toasts disappear when dismissed or snoozed.
- Fired-reminder IDs suppress repeated delivery during the running session.
- Loading and error state change as requests begin, succeed, or fail.
- Autosave timers end when saves fire, flush, or are replaced.

### Common Mistakes

- Persisting selection, modal targets, or toast queues as domain records
- Treating the selected task as calendar- or detail-component-local state
- Moving bulk mutation behavior into `useBulkSelection`, which owns only
  selection state
- Combining reminder toasts with persisted reminder records
- Losing transient refs or timers by moving them into frequently unmounted
  components
- Allowing stale transient state to reference deleted tasks or closed panels

### Why This State Belongs Here

These values coordinate a live workflow but should not survive as durable
product data.

Selected-task state belongs in `App.tsx` because opening, switching, and
closing tasks affects detail resources, autosave, calendar navigation, mobile
pages, and focus behavior. Bulk selection has a bounded hook owner because its
state and operations are coherent, while bulk task mutations remain with the
task orchestration owner.

---

## Platform State

### Definition

Platform state represents conditions supplied by or tied to the browser,
WKWebView, DOM, viewport, pointer environment, focus system, scroll
containers, timers, and media queries.

The application observes or guards this state but does not treat it as product
data.

### Examples From This App

- `window.visualViewport` size and offsets
- Document and container scroll positions
- Current active element and text-focus scope
- Keyboard text-entry mode and focus transition sequence
- Touch start and movement positions
- Mobile/coarse-pointer layout detection
- Desktop calendar media-query match
- Connected DOM elements used for focus restoration
- DOM refs for dropdowns, inputs, dialogs, and pickers

### Current Owner

The global iOS text-focus and visual viewport system is owned by `App.tsx`.
This includes focus transition tracking, viewport drift detection,
document-scroll correction, touch guards, and edit-entry preparation.

Platform state local to a bounded presentation remains local. For example,
`Calendar` observes its desktop-calendar media query, and component refs
support bounded picker or selector behavior.

### Lifecycle

Platform state exists only while the relevant browser context, DOM element,
listener, timer, or media query exists.

It changes in response to:

- focus and blur;
- keyboard opening and dismissal;
- viewport resize and scroll;
- touch gestures;
- DOM mounting and unmounting;
- media-query changes;
- application navigation and overlay lifecycle.

Listeners and scheduled work are removed when their owner unmounts. Refs may
temporarily point to disconnected elements and must be checked before use.

### Common Mistakes

- Treating zero document scroll as proof that the visual viewport is stable
- Persisting viewport, focus, or DOM-ref state
- Moving focus protection into isolated fields that cannot observe global
  transitions
- Removing repeated corrections as redundant
- Changing scroll ownership or mobile edit placement as a local CSS cleanup
- Letting stale blur events disable protection for the active field
- Restoring focus to a disconnected element or stealing focus from a newer
  interaction

### Why This State Belongs Here

These values describe the runtime platform rather than application-domain
information. Their lifetime and validity are controlled by browser and DOM
events.

The iOS focus guard remains centralized because no individual input or
presentation can observe the complete transition among create, search,
inline, mobile, detail, keyboard, viewport, and scroll states.

---

## Boundary Cases

Some state has characteristics from more than one category. Classify it by
its primary responsibility and owner.

### Frontend Copies of Backend Records

The `tasks`, `projects`, `tags`, and detail-resource collections are persisted
state even though their frontend copies live in React state. Their identity
comes from backend records, and successful API mutations determine their
durable value.

### Locally Saved Preferences

Theme is persisted state because `App.tsx` writes it to `localStorage` and
restores it across application sessions.

`workspaceName` is initialized from `localStorage`, but the current source
does not contain a matching write path. It is therefore preference-like state
with a persisted initializer, not a reliably application-persisted preference.
Other controls such as filters and the active mobile page are
presentation-local because they are not currently saved.

### Selected Task

The selected task ID affects presentation, but it is classified as transient
workflow state because it coordinates detail loading, autosave, task
switching, panel lifecycle, focus, and mobile navigation.

### Dropdowns and Overlays

Dropdown visibility is presentation-local state. Its owner is still
`App.tsx` when global outside-click, Escape ordering, placement, or focus
restoration requires application-level coordination.

### Reminder State

Persisted reminder records belong to persisted state. Reminder form values are
draft state. The toast queue and fired-reminder suppression set are transient
state. Browser notification permission is platform state.

### Mobile State

The active mobile page is presentation-local state. Swipe coordinates and
long-press timers are transient interaction state. Coarse-pointer detection,
scroll positions, active focus, and `visualViewport` values are platform
state.

---

## Major State Mapping

| State area | Category | Current owner | Persisted? | Reset conditions | Risks if ownership moves |
| --- | --- | --- | --- | --- | --- |
| Tasks | Persisted state, held as a frontend working copy | `App.tsx`; durable records owned by backend task controller/repository | Yes, backend | Hydration replaces collection; successful mutations reconcile it; deletion removes records | Multiple task authorities, inconsistent list/calendar/detail views, fragmented cross-domain mutations |
| Projects | Persisted state, held as a catalog working copy | `useProjectTagCatalog`; durable records owned by backend project controller/repository | Yes, backend | Loaded on hydration; catalog mutations reconcile collection | Catalog CRUD could become mixed with task reconciliation, filters, dropdowns, and drafts |
| Tags | Persisted state, held as a catalog working copy | `useProjectTagCatalog`; durable records owned by backend tag controller/repository | Yes, backend | Loaded on hydration; create/update/delete reconcile collection | Task/tag reconciliation and catalog ownership could become ambiguous |
| Persisted reminders | Persisted task-detail resource state | `useTaskDetailResources`; durable records owned by reminder controller/repository | Yes, backend | Loaded per task; create/delete/snooze reconcile records; parent deletion clears cache | Persistence could become mixed with polling, delivery, and toast presentation |
| Reminder draft | Draft state | `useTaskDetailResources` | No | Reset after successful creation and when task sections load | Reminder form state could outlive or target the wrong task |
| Reminder toast queue | Transient state | `App.tsx`; `ToastList` renders and auto-dismisses confirmations | No | Dismiss, snooze, auto-dismiss where applicable, or app unmount | Toast presentation could mutate persistence, duplicate delivery, or desynchronize snoozes |
| Create-task draft | Draft state | `App.tsx` | No | Reset after successful task creation; defaults restored explicitly | Creation mutation, dropdown coordination, tags, recurrence, and form reset could fragment |
| Shared edit draft | Draft state | `App.tsx` | Not until autosave/save succeeds | Initialized on edit start; saved or flushed on changes, close, or task switch | Competing drafts, stale autosave, lost changes, inconsistent edit presentations |
| Filtered and sorted tasks (`tabTasks`) | Derived state | `useTaskListViewModel` | No | Recomputed whenever tasks or list controls change | A second task authority could emerge and drift from primary tasks |
| Calendar task subset (`calTasks`) | Derived state | `useTaskListViewModel` | No | Recomputed when tasks or hide-completed control changes | Calendar could mutate or own a divergent task collection |
| Counts, statistics, and empty-state data | Derived state | `useTaskListViewModel` and pure utilities | No | Recomputed from tasks and controls | Manual synchronization and stale reporting |
| Calendar navigation and pickers | Presentation-local state | `Calendar` | No | Calendar unmount, user navigation, picker close, outside click | Calendar presentation could become coupled to task ownership or global orchestration |
| Search, filters, sort, and view tab | Presentation-local control state | `App.tsx` | No | User clears or changes controls; app remount | Derived view controls could be confused with persisted task state |
| Selected task | Transient workflow state | `App.tsx` | No | Panel close, selected task deletion, or switching to another task | Detail loading, autosave, focus, calendar opening, and mobile lifecycle could diverge |
| Active editor identity | Transient workflow state | `App.tsx` | No | Save, cancel, panel close, task deletion, or editor switch | Editing presentation and shared-draft authority could separate |
| Bulk mode and selected IDs | Transient selection state | `useBulkSelection` | No | Toggle bulk mode, clear selection, or complete bulk workflow | Selection hook could incorrectly acquire task mutation and recurrence ownership |
| Dropdowns, action menus, inline forms, and overlays | Presentation-local state with global coordination | `App.tsx`; bounded internal selectors may remain component-local | No | Escape, outside click, conflicting control open, action completion, or unmount | Outside-click, focus restoration, Escape ordering, and placement could become inconsistent |
| Expanded detail sections and expanded tag rows | Presentation-local state | `App.tsx` | No | User collapse, selected task/presentation lifecycle, or app remount | UI-only state could become mixed with persisted task data |
| Active mobile page | Presentation-local application-shell state | `App.tsx` | No | Navigation/swipe changes it; app remount returns default | Pager, swipe, selected-task opening, and calendar transitions could lose one coordinator |
| Swipe and long-press tracking | Transient interaction state | `App.tsx` refs | No | Gesture end, cancellation, threshold completion, or unmount | Gesture behavior could conflict with task actions, controls, and mobile page ownership |
| Loading and top-level error | Transient application state | `App.tsx`; bounded hooks report through top-level error setter | No | Request completion, later mutation, dismissal, or replacement error | Errors and loading signals could become inconsistent or invisible across domains |
| Autosave timer and current-save refs | Transient workflow state | `App.tsx` | No | Timer fires, flushes, is replaced, or app unmounts | Stale saves, wrong-task updates, or lost edits |
| `visualViewport`, document scroll, focus sequence, and touch guard | Platform state | `App.tsx` global mobile focus system | No | Continuously observed; listeners and scheduled corrections end on unmount | White gaps, viewport drift, stale focus protection, or broken scroll ownership |
| Mobile/coarse-pointer layout detection | Platform state | `App.tsx` | No | Media-query or viewport condition changes; app unmount | Mobile editor could render in the wrong structure and invalidate focus invariants |
| Calendar desktop-layout detection | Platform state | `Calendar` | No | Media-query change or calendar unmount | Calendar-local presentation could become globally coupled |
| Theme | Persisted local preference state | `App.tsx` | Yes, browser `localStorage` | Explicit user change or storage clear | Preference state could be confused with backend user/account state that does not currently exist |
| Workspace name | Preference-like application state initialized from local storage | `App.tsx` | Read from `localStorage`, but no current application write path | App remount restores stored value or default | Treating it as reliably persisted would overstate current behavior; moving it could also create competing workspace-label owners |

## Ownership Rules

Use the following rules when adding or changing state:

1. Persisted records belong to the owner that performs their complete bounded
   mutation, or to `App.tsx` when mutation crosses domains.
2. Drafts belong with the workflow that validates, saves, resets, and flushes
   them.
3. Derived values should be recomputed from source state instead of stored as
   independent authorities.
4. Presentation-local state should remain near its surface unless global
   focus, outside-click, Escape, placement, or pager behavior requires a wider
   owner.
5. Transient workflow state belongs to the smallest owner that can observe the
   complete workflow.
6. Platform state must remain with the owner that can observe the complete DOM
   and event lifecycle.
7. Moving state without moving its complete lifecycle and mutation
   responsibility does not create a valid ownership boundary.

## Related Documentation

- [Architecture](architecture.md)
- [Ownership Map](ownership-map.md)
- [Mobile Focus System](mobile-focus-system.md)
- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)
- [ADR-002: Shared Edit Draft](adr/ADR-002-shared-edit-draft.md)
- [ADR-003: Autosave Ownership](adr/ADR-003-autosave-ownership.md)
- [ADR-005: iOS Focus Guard](adr/ADR-005-ios-focus-guard.md)
- [ADR-006: Reminder Ownership Split](adr/ADR-006-reminder-ownership-split.md)
- [Lessons Learned](guides/Lessons%20Learned.md)
