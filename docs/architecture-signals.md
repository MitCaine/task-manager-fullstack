# Task Manager Architecture Signals

## Purpose

This guide helps maintainers decide whether a proposed code movement preserves
the architecture or weakens its ownership model.

Task Manager does not treat smaller files, more hooks, or more layers as
architectural improvements by themselves. A healthy boundary makes an owner,
lifecycle, and dependency direction easier to identify. An unhealthy boundary
moves implementation while leaving ownership elsewhere, usually replacing
visible orchestration with indirect callbacks or competing state authorities.

Use these signals when reviewing refactors, features, and maintenance changes.
They describe the current architecture rather than an idealized target.

## Governing Signal

Before moving code, ask:

> Can the proposed owner fully observe, operate, reset, and test the concept
> without reaching back into unrelated application state?

If yes, the move may create a healthy boundary. If no, the move is likely to
hide orchestration rather than transfer ownership.

A complete ownership boundary normally moves together:

- authoritative state;
- lifecycle and reset conditions;
- operations and error handling;
- required dependencies;
- local reconciliation;
- behavioral tests.

Moving only state, handlers, JSX, or API calls is not enough.

---

## 1. Healthy Hook Extraction Signals

A hook is a healthy boundary when it owns a coherent stateful concept with a
stable input/output interface. Its consumer should not need to understand the
hook's internal state transitions, but should still visibly own any workflows
that cross outside the hook's domain.

### Positive Signals

- The hook can name one concept rather than a collection of unrelated helpers.
- State and the operations that complete its lifecycle move together.
- Reset conditions are internal and unambiguous.
- Dependencies are narrow and flow inward through parameters or bounded API
  functions.
- The hook does not need DOM placement, global focus, outside-click, or mobile
  pager knowledge.
- The hook does not mutate state owned by another domain.
- The return interface expresses domain state and intent rather than exposing
  many orchestration callbacks.
- The hook can be tested as one behavioral unit.

### Existing Healthy Boundaries

| Hook | Healthy ownership signal | Boundary preserved |
| --- | --- | --- |
| `useTaskListViewModel` | Derives visible tasks, calendar tasks, counts, statistics, and empty-state data from tasks and controls | It does not persist tasks, own controls, select tasks, or mutate calendar state |
| `useBulkSelection` | Owns bulk mode, selected IDs, toggling, and clearing as one transient-selection lifecycle | Bulk task mutations and recurrence-aware completion remain in `App.tsx` |
| `useProjectTagCatalog` | Owns project/tag records, catalog drafts, loading, and catalog-level CRUD | Task assignments, filters, dropdowns, focus, and post-deletion task reconciliation remain external |
| `useTaskDetailResources` | Owns task-keyed subtasks, notes, reminders, attachments, drafts, loading, and resource CRUD | It does not select tasks, own panels, poll reminders, deliver toasts, or autosave tasks |

These hooks improve discoverability because their names match the concepts they
own and their exclusions are as clear as their responsibilities.

### Review Questions

- Can the hook perform its complete lifecycle without reading unrelated
  `App.tsx` state?
- Does it have one authoritative state domain?
- Does the caller retain only cross-domain coordination?
- Would a new maintainer correctly predict where mutations and resets occur
  from the hook name?

---

## 2. Unhealthy Hook Extraction Signals

A hook is unhealthy when it makes orchestration less visible without becoming
the workflow owner. This usually happens when a proposed hook needs many
setters, refs, callbacks, and state fragments from `App.tsx`.

### Warning Signals

- The hook name describes an action fragment instead of a complete concept.
- It accepts or returns a large bundle of unrelated setters and refs.
- It must mutate the primary task collection while another owner still
  controls selection, drafts, or reconciliation.
- It schedules work but cannot observe all flush, cancellation, and reset
  conditions.
- It depends on rendered placement, active DOM elements, dropdown ownership, or
  mobile page structure.
- It performs one step of a multi-request workflow while mutation ordering
  remains elsewhere.
- It hides important sequencing behind a callback-heavy interface.

### Existing Responsibilities That Should Not Become Narrow Hooks

| Responsibility | Why extraction would hide ownership |
| --- | --- |
| Autosave | It depends on the selected task, shared edit draft, current-task refs, timer lifecycle, close/switch flushing, base task updates, tag reconciliation, recurrence reconciliation, and primary task state |
| Selected-task lifecycle | Selection coordinates detail loading, panel visibility, autosave flushing, focus, task deletion, calendar opening, and mobile navigation |
| Recurring completion | Completion is a replacement workflow across recurrence calculation, task creation, tags, recurrence attachment, deletion, local replacement, selection, scrolling, and highlighting |
| Mobile focus guard | The guard must observe global focus transitions, `visualViewport`, document scroll, touch behavior, DOM scopes, mobile edit placement, and keyboard behavior |
| Catalog deletion reconciliation | `useProjectTagCatalog` can delete the catalog record, but only `App.tsx` can reconcile tasks, create/edit drafts, and active filters |

The common failure is partial ownership transfer. For example, a
`useAutosave` hook that receives the current task, every draft value, task
setters, tag operations, recurrence operations, and flush callbacks would make
the save sequence harder to trace while leaving its real owner unchanged.

### Decision Signal

If the proposed hook cannot own the complete workflow without acquiring
unrelated application domains, leave the workflow visible in `App.tsx`.

---

## 3. Healthy Component Extraction Signals

A component is a healthy boundary when it owns a meaningful presentation
surface and only the behavior necessary to operate that surface. It should
receive authoritative state and callbacks, render them, and emit user intent
without becoming a second domain owner.

### Positive Signals

- The JSX represents a recognizable feature section or reusable control.
- Props describe presentation data and user intent.
- Internal state is presentation-local and resets with the component surface.
- The component does not independently mutate the primary task collection.
- The component does not need to know mutation ordering across APIs.
- The component can be rendered and tested with supplied state and callbacks.
- Its name helps a maintainer locate a visible part of the interface.

### Existing Healthy Presentation Boundaries

| Area | Healthy component ownership |
| --- | --- |
| Task list | `TaskListControls`, `TaskListPresentation`, and `TaskCardMain` render list controls, list structure, and task-card content while emitting actions upward |
| Detail panel | Detail header, description, schedule, repeat, status, and auxiliary-panel components render selected-task and resource state without owning selected-task lifecycle or autosave |
| Create task | Create-task components render fields, recurrence controls, chips, and preview while `App.tsx` owns the create draft and creation workflow |
| Shared date/time controls | `DateTimeRow` and `TimeSelect` own bounded selector behavior, including active internal selectors and selected-option scrolling |
| Dialogs and overlays | Status, statistics, settings, confirmation, and toast components render bounded surfaces; visibility and application-wide focus coordination remain external |
| `Calendar` | Owns calendar rendering, selected date/view, picker state, navigation, and desktop-calendar layout detection while delegating task opening and mutation |

These components improve explainability because presentation responsibility is
easy to locate without moving domain authority into the rendering tree.

### Review Questions

- Is the proposed component a meaningful surface rather than a wrapper?
- Can its internal state be classified as presentation-local?
- Does it emit intent instead of performing cross-domain mutations?
- Can it remain unaware of selected-task, autosave, global focus, and mobile
  placement ownership?

---

## 4. Unhealthy Component Extraction Signals

A component boundary is unhealthy when moving JSX also moves or obscures
behavior that belongs to application orchestration. Components should not
become accidental state authorities merely because they render a workflow.

### Warning Signals

- The component would need the full shared edit draft plus many setters.
- It would need to own task mutations, autosave, or post-mutation
  reconciliation.
- It would decide where an editor is mounted in the mobile task list.
- It would own dropdown visibility while outside-click, Escape, or focus
  restoration remains global.
- It would duplicate task, selection, or draft state to simplify props.
- It would require refs from unrelated surfaces or coordinate focus across
  component boundaries.
- It is a tiny one-use wrapper that adds navigation cost without clarifying a
  feature boundary.

### Existing High-Risk Examples

| Area | Hidden ownership risk |
| --- | --- |
| `renderInlineEditForm` | Inline, mobile, and detail editing share one authoritative draft and save behavior. Moving the render function can imply a false independent editor owner |
| Mobile edit row placement | Placement is part of list scroll ownership and the iOS focus-stability system, not merely task-card presentation |
| Dropdown and focus ownership | A local dropdown component cannot observe application-wide outside-click, Escape ordering, placement, and focus restoration |
| Task mutation callbacks | Letting a presentation component call task APIs directly would bypass primary task state and cross-domain reconciliation |
| Shared edit draft consumers | Giving inline, mobile, or detail components separate drafts creates competing authorities and stale autosave risks |

### Decision Signal

If a component can render the surface only by becoming aware of application
workflow ordering or global platform behavior, presentation extraction is not
a clean boundary.

---

## 5. Healthy Orchestration Signals

Orchestration is healthy when one owner visibly coordinates a workflow that
crosses otherwise bounded domains. In this project, `App.tsx` is the
composition root and the correct owner for workflows that update primary task
state, coordinate hooks, preserve request ordering, or depend on application
placement and lifecycle.

### Positive Signals

- The workflow crosses multiple persisted resources.
- Order matters across several API calls.
- The result must reconcile multiple frontend state owners.
- The workflow affects selected task, drafts, filters, scrolling, focus, or
  rendered placement.
- No narrower hook or component has enough context to complete the operation.
- The sequence remains readable from user action through local-state update.

### Existing Healthy Orchestration

| Workflow | Why `App.tsx` is the healthy owner |
| --- | --- |
| Create task with tags and recurrence | Coordinates create draft, schedule validation, base task creation, optional recurrence, optional tags, primary task update, form reset, and toast |
| Edit task and autosave | Coordinates shared edit draft, selected task, timer/refs, base task save, tag reconciliation, recurrence reconciliation, and flush behavior |
| Complete recurring task | Coordinates next-schedule calculation, replacement creation, metadata/tags/recurrence copying, old-task deletion, local replacement, selection, scroll, and highlight |
| Reminder snooze | Crosses transient toast delivery and hook-owned persisted reminder state |
| Delete tag and reconcile tasks | Catalog deletion belongs to `useProjectTagCatalog`, while `App.tsx` reconciles tasks, drafts, and filters |
| Open task from calendar | Crosses calendar intent, filters, task visibility, mobile page transition, selection, detail loading, scrolling, and focus preparation |

The presence of several operations in one workflow is not itself unhealthy.
The important signal is whether the coordinator is the smallest owner able to
observe and complete the whole sequence.

### Evidence to Check

For these workflows, use [sequence-diagrams.md](sequence-diagrams.md) to verify
that a proposed movement preserves every participant and local-state update.
Use the related ADR to verify that the ownership model is unchanged.

---

## 6. Unhealthy Orchestration Signals

`App.tsx` becomes an unhealthy owner when it contains behavior that is
independent, duplicated, and fully explainable by a narrower concept. This
does not mean the behavior must be moved; it means the ownership boundary
deserves review.

### Warning Signals

- The same pure calculation is repeated in several workflows.
- Resource CRUD state is duplicated for multiple resource types despite having
  the same bounded lifecycle.
- Presentation-local state is controlled globally without global focus,
  placement, Escape, or outside-click requirements.
- Filtering, sorting, counts, statistics, or empty-state logic is copied
  instead of derived from one source.
- Backend transport details are implemented directly in `App.tsx` rather than
  the frontend API boundary.
- A block can be explained and tested without knowing selected task, primary
  task mutations, mobile behavior, focus, or another domain.

### Realistic Examples of the Signal

| Signal | Why it indicates possible misplaced ownership |
| --- | --- |
| Repeated pure date or schedule calculations | Deterministic transformations belong in utilities so all workflows use one rule |
| Duplicated resource CRUD collections and drafts | A bounded resource owner can make loading, mutation, reset, and error behavior explicit |
| Independent picker state stored globally | If no application-wide coordination exists, the rendering component is the more discoverable owner |
| Copied filtering or statistics logic | Derived state should have one calculation path rather than synchronized copies |
| Raw `fetch` calls inside orchestration | HTTP transport belongs to `src/api/tasks.ts`; orchestration should express product intent |

These are decision signals, not automatic extraction instructions. Confirm
that the narrower owner can take the full lifecycle before moving anything.

---

## 7. Backend Layering Signals

The current backend uses direct controller/repository ownership. Controllers
define endpoints, validate requests, check related records, perform bounded
mutation logic, and choose responses. Repositories provide persistence access.
Entities define persisted fields, relationships, and validation annotations.

### When Controller/Repository Is Sufficient

- The endpoint performs bounded CRUD on one resource.
- Related-record checks are simple and endpoint-specific.
- Persistence ordering is short and visible.
- No reusable business workflow exists across controllers.
- No cross-repository transaction must be named and owned.
- Adding another layer would only forward parameters and return values.

The project intentionally avoids service classes that merely mirror
controllers. This keeps current request and persistence flow direct.

### When a Service Owner Would Become Justified

- One business workflow is reused by multiple controllers or entry points.
- A mutation requires an explicit transaction across several repositories.
- Business rules are duplicated across controllers.
- Partial persistence would violate a domain invariant.
- The workflow has a coherent name, inputs, outputs, and failure semantics
  independent of HTTP.

`ParentTaskGuard` demonstrates the current threshold for backend extraction: a
reusable rule with a clear owner. A future service layer would require the
same standard at workflow scale.

### Unhealthy Backend Layering Signals

- A service class only forwards controller calls to a repository.
- Mapping and validation logic are duplicated across nominal layers.
- Transaction ownership remains unclear after adding the layer.
- Frontend orchestration is moved into a backend service without changing the
  product workflow or frontend state responsibilities.
- Complex cross-repository workflows remain duplicated in controllers despite
  requiring one transaction owner.

---

## 8. State Ownership Signals

State category determines the kind of owner needed. The storage mechanism
does not determine ownership; values held in React state may represent
persisted records, drafts, derived values, presentation controls, transient
workflow state, or platform observations.

| State category | Healthy ownership signal | Warning signal |
| --- | --- | --- |
| Persisted | One frontend working-copy owner reconciles successful backend mutations; backend remains durable authority | Multiple components or hooks maintain competing copies of the same records |
| Draft | The owner also validates, saves, resets, and flushes the draft | Draft setters move without save/reset lifecycle, or separate editors gain separate drafts |
| Derived | Values are recomputed from authoritative state and controls | Derived results are stored and manually synchronized as a second authority |
| Presentation-local | State remains near one surface unless global coordination requires a wider owner | State is lifted globally only for convenience, or localized despite global focus/placement rules |
| Transient | The smallest owner that can observe the complete workflow owns selection, timers, loading, or notifications | Timers or selections move away from the workflow conditions that clear them |
| Platform | The owner can observe the complete DOM, browser, focus, viewport, and event lifecycle | Platform behavior is distributed among isolated fields or treated as product state |

### Project-Specific Boundary Signals

- Primary tasks remain a frontend working copy owned by `App.tsx`; list,
  calendar, and detail presentations must not become separate task
  authorities.
- Project/tag catalogs and detail resources are persisted state with bounded
  hook owners.
- The shared edit draft remains with selected-task and autosave ownership.
- Filtered tasks, calendar tasks, counts, and statistics remain derived.
- Selected task is transient workflow state, not merely a detail-panel prop.
- Dropdown visibility may look presentation-local but remains global when
  outside-click, Escape, placement, and focus restoration require it.
- Reminder records, reminder drafts, reminder toasts, and notification
  permission belong to different state categories and therefore different
  owners.
- `visualViewport`, focus sequence, touch guards, and scroll positions are
  platform state and must not be persisted or localized casually.

Use [state-taxonomy.md](state-taxonomy.md) before moving any state. Moving a
value without its lifecycle, reset conditions, and mutation responsibility
does not create a valid boundary.

---

## 9. Mobile and Platform Signals

Mobile and focus changes require stricter review because their behavior is a
cross-cutting platform system rather than an isolated UI implementation.
TypeScript, JSX placement, CSS sizing, DOM scopes, event listeners, scroll
owners, and WKWebView behavior jointly preserve the current result.

### Healthy Change Signals

- The change preserves document-level zero scroll during mobile text entry.
- `.app__list` remains the task-page vertical scroll owner.
- The calendar card remains the calendar-page vertical scroll owner.
- Mobile editing remains in `.mobile-edit-row` and `.mobile-edit-panel`.
- The mobile edit panel does not gain independent vertical scrolling.
- Existing `data-text-focus-scope` placement remains valid.
- Stale blur events cannot disable protection for the active field.
- Focus restoration cannot steal focus from a newer interaction.
- Swipe navigation still excludes protected interactive controls.
- Inline, mobile, and detail editing continue to share one authoritative
  draft.
- Automated regression tests and iOS simulator/device checks cover the
  affected behavior.

### Warning Signals

- A change is described as only CSS, only JSX placement, or only focus cleanup
  despite touching a protected invariant.
- Repeated viewport or scroll corrections are removed as apparently
  redundant.
- Zero document scroll is treated as proof that the visual viewport is stable.
- Focus handling moves into individual fields that cannot observe transitions
  across surfaces.
- Mobile edit moves inside a normal task card or gains nested scrolling.
- Root, pager, page, or list sizing changes independently.
- `visualViewport`, touch, keyboard, swipe, and focus changes are reviewed
  separately even though they interact.

### Required Review Standard

Any change affecting mobile editing, focus, scrolling, keyboard behavior,
viewport handling, or pager/swipe behavior is an architecture-sensitive
change. Review it against:

- [mobile-focus-system.md](mobile-focus-system.md);
- [ADR-004: Mobile Edit Row](adr/ADR-004-mobile-edit-row.md);
- [ADR-005: iOS Focus Guard](adr/ADR-005-ios-focus-guard.md);
- the mobile edit and focus sequence diagram;
- the relevant `App.test.tsx` regressions;
- an iOS simulator or physical device when visual WKWebView behavior may
  change.

---

## 10. Pre-Refactor Checklist

Answer these questions before moving code. A missing answer is a signal that
the proposed move is not yet understood well enough.

### Ownership

- What coherent concept or workflow is being moved?
- Who owns the workflow before the change?
- Who will own it after the change?
- Does authoritative state move with its complete lifecycle?
- Can the new owner observe every save, reset, flush, cancellation, failure,
  and reconciliation condition?
- What must explicitly remain outside the new boundary?

### State

- What state category is involved: persisted, draft, derived,
  presentation-local, transient, or platform?
- Is any new duplicate authority being created?
- Are reset conditions and persistence semantics unchanged?
- Does the move separate a draft from validation, save, or flush ownership?

### Architecture Decisions

- Which ADR is affected?
- Does the proposal preserve the ADR, or is it an architecture change that
  requires a new decision?
- Does it alter `App.tsx` orchestration ownership, the shared edit draft,
  autosave, mobile edit placement, iOS focus protection, reminder ownership,
  recurring replacement, or backend layering?

### Flow and Dependencies

- Which sequence diagram changes?
- Are mutation ordering and local reconciliation still visible?
- Does the new boundary require many unrelated setters, refs, or callbacks?
- Does it depend on focus, dropdowns, outside-click, selected-task lifecycle,
  mobile placement, or platform state?
- Does dependency direction remain component to owner to API to controller to
  repository?

### Tests and Verification

- Which tests should protect the behavior?
- Are existing behavioral tests expected to pass unchanged?
- Is a new ownership unit independently testable?
- Does the change affect mobile/WKWebView behavior that requires simulator or
  physical-device validation?
- Can a future maintainer identify the new owner from file and symbol names?

### Final Classification

- Is this a refactor that preserves ownership and behavior?
- Is this an architecture change that transfers ownership or changes an
  invariant?
- Is the main benefit conceptual clarity, or only reduced file size?
- Would leaving the workflow centralized make its behavior easier to trace?

Do not proceed as a routine refactor when the proposal changes an ADR,
sequence, state authority, mutation owner, mobile invariant, or backend
transaction boundary.

---

## Related Documentation

- [Architecture](architecture.md)
- [Ownership Map](ownership-map.md)
- [State Taxonomy](state-taxonomy.md)
- [Sequence Diagrams](sequence-diagrams.md)
- [Mobile Focus System](mobile-focus-system.md)
- [ADR-001: App.tsx Orchestration Owner](adr/ADR-001-app-tsx-orchestration-owner.md)
- [ADR-002: Shared Edit Draft](adr/ADR-002-shared-edit-draft.md)
- [ADR-003: Autosave Ownership](adr/ADR-003-autosave-ownership.md)
- [ADR-004: Mobile Edit Row](adr/ADR-004-mobile-edit-row.md)
- [ADR-005: iOS Focus Guard](adr/ADR-005-ios-focus-guard.md)
- [ADR-006: Reminder Ownership Split](adr/ADR-006-reminder-ownership-split.md)
- [ADR-007: Recurring Task Replacement](adr/ADR-007-recurring-task-replacement.md)
- [ADR-008: No Backend Service Layer](adr/ADR-008-no-backend-service-layer.md)
