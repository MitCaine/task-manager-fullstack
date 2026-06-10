# Lessons Learned Building Task Manager

## Introduction

Task Manager began as a database-class project for a Personal Task Management System. The original design emphasized a normalized relational model supporting tasks, schedules, recurrence, dependencies, reminders, notifications, projects, tags, contexts, users, devices, preferences, and accounts.

As the project became a working React, Spring Boot, MySQL, and Capacitor application, the most difficult engineering problems changed. Database relationships remained important, but much of the actual complexity emerged from user interaction, mutation coordination, mobile browser behavior, and ownership boundaries.

This retrospective records the assumptions behind the original design, what happened during implementation, and the lessons that apply to future projects.

---

## 1. Orchestration Is a Real Architectural Responsibility

### Original Assumption

Application behavior could be divided cleanly by feature. Tasks, recurrence, tags, scheduling, reminders, and editing would each have separate implementations that could operate mostly independently.

### What Actually Happened

Many important workflows crossed several domains.

Creating a task can involve:

1. Validating the title and schedule.
2. Creating the base task.
3. Attaching recurrence.
4. Assigning tags.
5. Updating frontend task state.
6. Resetting the creation draft.
7. Displaying a confirmation toast.

Editing a task can involve:

1. Saving base task fields.
2. Reconciling added and removed tags.
3. Updating recurrence through a separate endpoint.
4. Updating local task state.
5. Coordinating selected-task state and autosave.

Completing a recurring task involves creating the next occurrence, copying metadata, assigning recurrence and tags, deleting the previous occurrence, updating frontend state, and highlighting the replacement task.

These workflows needed a clear orchestration owner. In the current frontend, that owner is `App.tsx`.
### Why

The backend API exposes bounded resource operations, but user-visible actions frequently combine several of those operations.

The orchestration layer also needs context that individual components and hooks do not have:

- Current task collection
- Selected task
- Active edit draft
- Mobile layout
- Autosave lifecycle
- Toast state
- Rendered task-list behavior
- Error handling

### Engineering Lesson

Orchestration is not accidental leftover code. It is a legitimate architectural responsibility.

A function that coordinates several domains should not be forced into one of those domains merely to reduce the size of the orchestration layer.

### Application to Future Projects

Identify cross-domain workflows explicitly. Give them an owner that can see the complete operation.

Do not distribute a workflow across components or hooks unless each new boundary owns a coherent part of the process. Splitting code without transferring ownership makes behavior harder to trace.

---

## 2. Ownership Matters More Than File Size

### Original Assumption

Large files indicate poor architecture and should be divided into smaller files.

### What Actually Happened
`App.tsx` remained large even after extracting presentation components, pure utilities, task-detail resources, catalog ownership, bulk selection, and derived task-list behavior.

The remaining code primarily owns:

- Cross-domain task mutations
- Selected-task lifecycle
- Shared edit state
- Autosave
- Dropdown coordination
- Focus restoration
- Reminder delivery
- Mobile navigation
- iOS focus protection

These responsibilities are coupled by real application behavior rather than by missing file boundaries.

### Why

A smaller file is not automatically easier to understand. Moving tightly related behavior into several files can hide the actual state and mutation flow.

Several potential extractions would require passing large collections of state setters, refs, callbacks, and lifecycle signals into a custom hook. That would reduce line count while weakening conceptual ownership.

### Engineering Lesson

Architecture should optimize for clear responsibility, not minimum file length.

A large composition or orchestration owner can be appropriate when it coordinates behavior that cannot be safely understood in isolation.

### Application to Future Projects

Before extracting code, ask:

- What concept would the new module own?
- What state would move with it?
- What responsibilities would remain outside?
- Would the boundary reduce coupling or merely relocate it?
- Would a future developer know where to change the behavior?

If those questions do not have clear answers, leaving the behavior centralized may be the better design.

---

## 3. Hooks Work Best When They Own a Complete, Bounded Concept

### Original Assumption

Custom hooks could be used broadly to reduce component size and move logic out of `App.tsx`.

### What Actually Happened

The most successful hooks own concepts with stable boundaries:

- `useTaskListViewModel` owns derived task-list and calendar data.
- `useBulkSelection` owns bulk mode and selected IDs.
- `useProjectTagCatalog` owns catalog records, catalog drafts, and catalog-level mutations.
- `useTaskDetailResources` owns task-associated resources and their CRUD operations.

These hooks deliberately do not own unrelated concerns.

For example, `useBulkSelection` does not perform bulk completion because recurring-task completion requires application-level task orchestration. `useProjectTagCatalog` does not reconcile deleted tags into tasks because it does not own task state.

### Why

A hook becomes difficult to understand when it accepts many unrelated state values or must expose numerous callbacks to coordinate with its caller.

Hooks are strongest when they can answer clearly:

- What state do I own?
- What operations do I perform?
- What responsibilities do I explicitly not own?

### Engineering Lesson

A custom hook should represent a stateful domain or behavioral boundary, not simply a group of lines removed from a component.

### Application to Future Projects

Extract hooks when state and operations can move together.

Avoid hooks that:

- Depend on many unrelated setters
- Control application-wide focus or DOM placement
- Require broad access to several domains
- Hide cross-domain mutation ordering
- Exist only to make a parent component shorter

---

## 4. Autosave Is a State-Ownership Problem, Not Just a Timer

### Original Assumption

Autosave would be a straightforward debounce around an update API call.

### What Actually Happened

Autosave needed to coordinate:

- The currently selected task
- The latest edit-draft values
- Current task data
- Tag assignment changes
- Recurrence changes
- Panel close and panel-switch behavior
- Immediate saves after quick schedule changes
- Delayed callbacks that must not use stale React closures

The implementation uses a timer plus refs to keep delayed saves pointed at current task and save behavior.

### Why

Autosave occurs after the interaction that scheduled it. By the time the timer fires, the user may have changed fields, selected another task, closed the panel, or changed recurrence and tags.

Saving only the base task is also insufficient because the edit experience spans multiple API resources.

### Engineering Lesson

Autosave must have a clearly defined authoritative draft, target identity, mutation order, cancellation policy, and flush policy.

The timer is the simplest part.

### Application to Future Projects

Before implementing autosave, define:

- Which draft is authoritative?
- How is the current entity identified?
- What happens when selection changes?
- What happens when the editor closes?
- Which related resources must save together?
- How are stale delayed callbacks prevented?
- What happens after partial failure?

Keep autosave close to the state and mutation lifecycle it coordinates.

---

## 5. Recurrence Semantics Must Be Chosen Explicitly

### Original Assumption

A normalized `RecurrenceRule` and `TaskInstance` model would naturally support recurring behavior.

### What Actually Happened

The active application uses a simpler recurrence model:

- Tasks can repeat daily, weekly, or monthly.
- A task references a recurrence rule.
- Completing an active recurring task creates the next occurrence.
- Tags, project, priority, description, and duration are preserved.
- The completed occurrence is deleted and replaced in active frontend state.

The original `TaskInstance` concept was not activated.

### Why

A database recurrence model does not define product semantics by itself.

The application still needed answers to questions such as:

- Does completion create the next task?
- Is the current task retained?
- Should completion history remain visible?
- How are durations preserved?
- What metadata is copied?
- How does bulk completion treat recurring tasks?
- What happens when recurrence is removed?

The replacement workflow provided useful behavior without introducing a full recurrence-series architecture.

### Engineering Lesson

Recurrence is primarily a product and lifecycle decision. The database model follows from those semantics.

### Application to Future Projects

Define recurrence behavior before designing the schema:

- Series versus occurrence identity
- Completion history
- Future occurrence generation
- Series editing
- Exceptions and skipped occurrences
- End dates or occurrence counts
- Partial-failure behavior

A simpler recurrence model can be correct when its limitations are understood.

---

## 6. Mobile Browsers Change the Architecture

### Original Assumption

Responsive CSS would allow desktop interaction patterns to work on mobile with minor layout adjustments.

### What Actually Happened

Mobile behavior affected:

- Editor DOM placement
- Description control type
- Scroll ownership
- Root and page sizing
- Swipe navigation
- Touchmove handling
- Dropdown interactions
- Focus transitions
- Keyboard behavior

Mobile editing could not safely use the same task-card placement as desktop editing. The mobile editor now renders through a dedicated row outside the normal task-card flow.

### Why

Mobile browsers combine touch input, virtual keyboards, caret visibility, viewport resizing, and browser-controlled scrolling. These behaviors are not equivalent to desktop pointer and keyboard interactions.

A layout that appears visually equivalent can behave very differently once a mobile keyboard opens.

### Engineering Lesson

Mobile support is not only a styling concern. It can require distinct structural and behavioral architecture.

### Application to Future Projects

Test mobile interaction early, especially for:

- Text entry
- Nested scroll containers
- Sticky elements
- Virtual keyboard opening and dismissal
- Touch gestures
- Focus transitions
- Dynamic content replacement

Treat DOM placement and scroll ownership as architectural decisions when mobile browsers depend on them.

---

## 7. iOS WKWebView Requires Empirical Engineering

### Original Assumption

Resetting document scroll or using standard focus behavior would be sufficient to stabilize mobile text entry.

### What Actually Happened

WKWebView could leave the visible viewport offset even when document scroll values were already zero.

The final system required:

- `visualViewport` monitoring
- Focus transition tracking
- Protection against stale blur events
- Repeated asynchronous scroll corrections
- Touchmove prevention outside active fields
- Bounded textarea scrolling
- Explicit text-focus scopes
- Stable mobile editor placement
- Debug logging
- Extensive regression tests

The final solution intentionally avoided broad shell transforms, general viewport-height manipulation, pre-focus blocking, and Capacitor Keyboard plugin ownership.

### Why

The WebKit visual viewport and document scroll position are related but distinct. Browser adjustments may occur asynchronously after focus, blur, resize, scroll, or touch events.

The problem could not be solved reliably by reasoning from normal browser behavior alone. It required observation, instrumentation, and device-oriented testing.

### Engineering Lesson

Platform-specific failures sometimes justify specialized architecture that looks unusual outside its historical context.

Reliable engineering may require preserving repeated or defensive behavior that would otherwise appear redundant.

### Application to Future Projects

For difficult platform behavior:

1. Instrument the system.
2. Record the actual failing state.
3. Separate assumptions from observed behavior.
4. Build focused regression tests.
5. Document protected invariants.
6. Avoid “cleanup” that removes defensive behavior without reproducing the original failure.

---

## 8. State Management Is Primarily About Choosing Authorities

### Original Assumption

As the application grew, it would likely need a centralized state-management library.

### What Actually Happened

The application remained understandable using React state, bounded hooks, refs, and pure derived utilities.

Different authorities emerged:

- `App.tsx` owns primary task state and cross-domain workflows.
- `useTaskDetailResources` owns task-associated resources.
- `useProjectTagCatalog` owns project and tag catalogs.
- `useBulkSelection` owns selected bulk IDs.
- `useTaskListViewModel` derives views without storing them.
- `Calendar` owns calendar-local navigation.
- Presentation components emit intent upward.

### Why

The primary challenge was not access to state. It was deciding which owner should be authoritative for each concept.

A global store would not automatically resolve mutation ordering, mobile placement, focus ownership, or autosave semantics.

### Engineering Lesson

State-management quality depends more on authority and lifecycle than on the chosen library.

Derived data should generally remain derived. Presentation-local state should remain local. Cross-domain state should have an explicit orchestration owner.

### Application to Future Projects

Before adding a state library, map:

- Authoritative persisted state
- Draft state
- Derived state
- Presentation-local state
- Transient notification state
- Cross-domain orchestration state

Choose tooling only after ownership and lifecycle are understood.

---

## 9. Tests Became Executable Architecture Documentation

### Original Assumption

Tests would mainly verify task CRUD, endpoint responses, and utility calculations.

### What Actually Happened

The test suite protects architectural invariants that are not obvious from individual functions.

Examples include:

- Mobile edit renders outside task-card flow.
- The task list remains the mobile scroll owner.
- The mobile edit panel is not sticky or independently scrollable.
- Stale blur events cannot disable active focus protection.
- Visual viewport drift is detected after document scroll correction.
- Swipes do not begin from interactive controls.
- Recurring bulk completion follows recurrence semantics.
- Task duration is preserved when generating the next occurrence.
- End times must follow start times.
- Child-resource endpoints require an existing task.

### Why

Many important failures emerge from relationships among components, state, CSS, event timing, and APIs. Unit-level correctness alone cannot protect those relationships.

Tests became the most precise record of behaviors that future maintainers must preserve.

### Engineering Lesson

Tests do more than detect regressions. They define system invariants and explain which unusual implementation details are intentional.

### Application to Future Projects

Use different test levels for different responsibilities:

- Utility tests for deterministic calculations
- API tests for transport contracts
- Controller tests for validation and response behavior
- Integration-style component tests for ownership and workflow behavior
- Device or simulator testing for platform-specific visual behavior

Name tests after the invariant being protected, not only the implementation method.

---

## 10. Backend Layers Should Follow Actual Complexity

### Original Assumption

A conventional backend architecture should include controllers, services, repositories, entities, and possibly richer domain models.

### What Actually Happened

The active backend uses a direct controller/repository structure.

Controllers currently own:

- Endpoint definitions
- Request validation
- Basic mutation logic
- Related-record checks
- Response status selection

Repositories own persistence access. `ParentTaskGuard` centralizes the repeated requirement that task-associated resources reference an existing task.

There is no dedicated service layer.

### Why

Most current backend operations are bounded CRUD operations. Adding service wrappers for every controller would create more files without transferring meaningful ownership.

The frontend currently owns the most complex cross-domain workflows, including recurring completion and task-edit reconciliation.

### Engineering Lesson

Layers should exist because they own distinct responsibilities, not because a reference architecture includes them.

A service layer becomes useful when there are reusable business rules, cross-repository transactions, or workflows that no longer belong in controllers.

### Application to Future Projects

Begin with the simplest structure that clearly represents the current behavior.

Introduce a new layer when it can answer:

- What responsibility moves here?
- Which callers reuse it?
- Which transaction boundary does it own?
- Which rules become clearer?

Avoid nominal layers that only forward method calls.

---

## 11. Database Design Does Not Define Product Behavior

### Original Assumption

A comprehensive normalized ERD would provide a strong blueprint for the application.

The original model included entities such as:

- User
- Account
- Device
- UserPreferences
- UserSettings
- Context
- CustomField
- Schedule
- TaskDependency
- TaskInstance
- Notification

### What Actually Happened

The working product uses a smaller active model centered on:

- Task
- Project
- Tag
- Status
- RecurrenceRule
- Subtask
- Note
- Reminder
- Attachment

Several original entities remain schema-only because the application never developed behavior requiring them.

At the same time, some of the hardest implementation problems—focus ownership, autosave, mobile editing, swipe guards, reminder toasts, and viewport correction—were invisible in the original ERD.

### Why

Normalization describes persisted relationships. It does not define:

- Interaction workflows
- Mutation ordering
- UI state ownership
- Focus behavior
- Mobile browser behavior
- Error recovery
- Autosave semantics
- Notification presentation

Some normalized entities also represented hypothetical future requirements rather than demonstrated product needs.

### Engineering Lesson

A database model is one architectural view, not the architecture of the complete system.

Schemas should support validated product behavior rather than activate every theoretically normalized concept.

### Application to Future Projects

Design the database alongside concrete workflows.

For each proposed entity, identify:

- Which user-visible behavior requires it?
- Which API owns it?
- Which lifecycle creates and deletes it?
- Which rule cannot be represented more simply?
- Which tests will prove its behavior?

Keep unused future concepts out of the active runtime model until their behavior is understood.

---

## 12. Feature Growth Reveals Hidden Cross-Domain Coupling

### Original Assumption

Adding features would mostly mean adding new components, endpoints, and tables.

### What Actually Happened

Features frequently affected existing ownership boundaries.

Examples:

- Recurrence affected completion, duplication, bulk actions, editing, and scheduling.
- Projects and tags affected creation, editing, filtering, display, deletion reconciliation, and duplication.
- End times affected create/edit drafts, validation, recurrence duration, display formatting, API payloads, schema, and tests.
- Mobile editing affected rendering, focus behavior, scroll ownership, description controls, and CSS.
- Reminders affected task-detail resources, polling, transient toasts, and snoozing.

### Why

User-visible features rarely remain isolated after they become integrated into a complete product.

The cost of a feature is determined by how many existing workflows and authorities it intersects, not by how many new files it creates.

### Engineering Lesson

Feature estimates should include integration surfaces and ownership changes, not only the feature’s local implementation.

### Application to Future Projects

Before implementing a feature, map its impact across:

- Persisted entities
- APIs
- Primary state
- Draft state
- Derived views
- Existing mutations
- Mobile behavior
- Accessibility
- Tests
- Documentation

This impact map is often more useful than a file-level implementation plan.

---

## 13. Documentation Preserves the Reasons Behind Unusual Code

### Original Assumption

Readable code, comments, and tests would be enough for future maintainers to understand the system.

### What Actually Happened

Several important decisions cannot be understood from local code alone:

- Why `App.tsx` remains large
- Why autosave uses refs
- Why reminder ownership is split
- Why mobile edit uses a separate row
- Why mobile edit descriptions use inputs
- Why document scroll is repeatedly reset
- Why `visualViewport` is monitored
- Why the backend has no service layer
- Why some database tables are inactive

Without architectural documentation, these decisions could look like cleanup opportunities rather than intentional constraints.

The project now includes:

- `docs/architecture.md`
- `docs/ownership-map.md`
- `docs/mobile-focus-system.md`

### Why

Code explains what happens. Tests explain required behavior. Architecture documentation explains why responsibilities are located where they are and which alternatives were rejected.

That historical reasoning is essential when the current implementation intentionally differs from common patterns.

### Engineering Lesson

Documentation is most valuable when it records decisions, ownership, invariants, and failure history—not when it merely repeats function names.

### Application to Future Projects

Document:

- Authoritative owners
- Cross-domain workflows
- Protected invariants
- Platform-specific constraints
- Alternatives that failed
- Behaviors that look unusual but are intentional
- Navigation paths for maintainers

Update documentation when ownership changes, not only when features change.

---

# Final Retrospective

Task Manager began as a database-centered design and became an interaction-centered application.

The original ERD helped establish durable concepts such as tasks, projects, tags, recurrence, reminders, and task-associated resources. However, implementation showed that normalized persistence is only one part of system architecture.

The most important engineering work became:

- Defining authoritative owners
- Preserving visible mutation flow
- Coordinating cross-domain workflows
- Managing drafts and autosave
- Handling recurrence semantics
- Responding to real mobile-browser behavior
- Protecting unusual but necessary solutions with tests
- Documenting why the system differs from an academic ideal

The central lesson is that architecture should reflect the actual forces acting on the software.

Sometimes the correct boundary is a custom hook. Sometimes it is a pure utility or presentation component. Sometimes it is a direct controller over a repository. Sometimes it is a large orchestration owner. Sometimes it is a highly specialized platform guard.

The quality of the architecture depends less on conforming to a preferred pattern and more on whether each responsibility has a clear owner, whether important behavior is visible, and whether future maintainers can understand what must remain true.

# What I Would Do Differently Next Time

- Create ownership documentation earlier.
- Establish architectural boundaries before large feature growth.
- Treat mobile browsers as a first-class platform from the beginning.
- Define recurrence semantics before designing recurrence storage.
- Distinguish orchestration code from feature code sooner.
- Add ADRs during development instead of reconstructing them later.
- Build navigation and architecture documents before the codebase reaches several thousand lines.