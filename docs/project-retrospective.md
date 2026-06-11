# Task Manager Project Retrospective

## Purpose

This retrospective captures the engineering and architectural lessons learned
while Task Manager evolved from a database-class design into a working React,
Spring Boot, MySQL, and Capacitor application.

It is not a review of whether the project should have been built differently.
It records which assumptions held, which assumptions changed under real product
behavior, and which lessons are worth carrying forward.

# Original Vision

Task Manager began as a Personal Task Management System designed for a database
class. The original center of gravity was a normalized relational model. The
design anticipated a broad product with:

- tasks, schedules, statuses, priorities, and completion data;
- recurrence rules and task instances;
- projects, tags, contexts, and custom fields;
- subtasks, notes, attachments, reminders, and notifications;
- users, accounts, devices, preferences, and settings;
- task dependencies and bulk modification.

The early design assumed that identifying the right entities, relationships,
keys, and constraints would provide the main architectural blueprint. It
correctly treated persistence as important and looked ahead to capabilities
that a mature task manager might need.

The working product changed the emphasis. The active runtime model became
smaller than the original schema, while the frontend became substantially more
behavioral. The hardest problems were often not how to store a concept, but:

- what a user action meant from beginning to end;
- which owner had enough context to perform it;
- how several API operations should be ordered;
- how drafts, selection, timers, and rendered state should reconcile;
- how mobile browsers and WKWebView behaved during real interaction.

The original vision supplied a useful domain vocabulary. Implementation showed
that the database was one architectural view rather than the complete
architecture.

# What Proved Correct

Several early decisions survived because they described durable product
concepts rather than speculative implementation detail.

## Task as the Central Domain Record

Making `Task` the central entity proved correct. Title, description, status,
priority, project assignment, schedule, recurrence reference, and tags remain
the core persisted task data. The application has many presentations, but they
all depend on one primary task collection.

## Distinct Classification Concepts

Projects and tags proved useful as separate concepts. Projects provide a
single assignment, while tags provide flexible many-to-many classification and
color. Both participate in creation, editing, filtering, and display.

## Child Resources as Separate Records

Subtasks, notes, reminders, and attachments were correctly modeled as
task-associated resources instead of being embedded into the task record.
That decision enabled `useTaskDetailResources` to become a coherent frontend
owner and allowed the backend controllers to remain bounded by resource.

## Recurrence as a Separate Concept

The original design correctly recognized that recurrence is not merely another
task field. A recurrence rule still has separate persistence and API behavior,
even though the active occurrence model became simpler than originally
planned.

## Status as Structured Data

Representing status separately instead of relying on arbitrary text remained a
sound choice. It supports consistent status movement, filtering, display, and
backend validation.

## Relational Persistence and Explicit API Boundaries

The React frontend, REST boundary, Spring controllers, repositories, and
relational database remain a good fit for the current product. The direct
request path is understandable, and explicit API operations make multi-step
frontend workflows visible.

## Controlled Schema Ownership

Keeping schema evolution explicit with `ddl-auto=none` proved valuable. The
project could add fields such as task end time through deliberate migrations
without treating runtime entity changes as automatic database ownership.

# What Became More Complex

## Orchestration

The early mental model treated features as mostly independent domains. In the
working application, many user actions cross several domains.

Creating a task can require schedule construction, validation, base-task
creation, recurrence attachment, tag assignment, local task insertion, draft
reset, and a confirmation toast. Editing can require base-task updates, tag
reconciliation, recurrence reconciliation, local-state replacement, and
selected-task coordination.

This made orchestration a first-class architectural responsibility.
`App.tsx` remained large because it became the smallest owner able to observe
and complete these workflows. Its size is a cost, but the centralized mutation
flow is also a source of clarity.

## Recurrence

Calculating a next date was straightforward compared with defining completion
semantics.

The project had to decide whether a recurring task should be marked complete,
advanced in place, retained as history, or replaced. The final replacement
workflow creates the next task, preserves schedule duration and metadata,
copies tags, attaches recurrence, deletes the completed occurrence, replaces
local task state, and coordinates selection and highlighting.

Recurrence also had to behave consistently during creation, editing,
duplication, individual completion, and bulk completion. The complexity came
from lifecycle and identity, not only from date arithmetic.

## Reminders

A persisted reminder record did not solve reminder delivery.

The implementation needed separate ownership for reminder CRUD, polling,
due-time detection, duplicate suppression, toast state, dismissal, snoozing,
and presentation. Persisted reminders, reminder drafts, reminder toasts, and
browser notification capability belong to different state categories and
different lifecycles.

The original notification-oriented schema anticipated the concept, but the
working behavior required more runtime coordination than the table design
could express.

## Autosave

Autosave appeared to be a debounce around `updateTask`. It became a state and
lifecycle problem.

A delayed save must use the latest authoritative draft and target the correct
task after the user may have changed fields, switched tasks, closed a panel, or
changed tags and recurrence. The save path must reconcile the complete visible
edit, not only the base task record. Timers, refs, selected-task lifecycle,
flush behavior, and mutation ordering all became part of autosave ownership.

## Mobile Behavior

Responsive layout was not enough to make desktop interaction patterns reliable
on mobile.

Mobile support affected editor DOM placement, scroll ownership, description
control type, swipe exclusions, touch behavior, root sizing, focus scopes, and
keyboard handling. iOS WKWebView could leave the visual viewport offset even
when document scroll values were already zero.

The final focus system required empirical work: instrumentation,
`visualViewport` monitoring, stale-blur protection, repeated asynchronous
correction, bounded textarea scrolling, and a dedicated mobile edit row.
Platform behavior became an architectural force.

## Ownership

As features accumulated, the main question changed from “which feature does
this code belong to?” to “which owner can observe the complete lifecycle?”

The answer was sometimes a bounded hook, a pure utility, or a presentation
component. In other cases it remained `App.tsx` because the workflow crossed
tasks, drafts, APIs, selection, focus, mobile placement, or multiple hooks.

Ownership became more explicit because partial extraction repeatedly proved
less useful than complete lifecycle ownership.

# What Became Simpler

Some areas needed less architecture than the original design anticipated.

## The Active Persistence Model

The working product did not activate every planned entity. Accounts, devices,
contexts, custom fields, notifications, standalone schedules, task
dependencies, task instances, and persisted user settings remained outside the
active runtime model.

This was not a failure of the original schema. It showed that future-facing
concepts do not need implementation until concrete behavior justifies them.

## Scheduling Storage

Task scheduling became simpler by storing start and end values directly on the
task rather than activating a generalized schedule entity. The resulting
workflow is easier to follow for the current task-centric product.

## Recurrence Persistence

The project avoided full recurrence-series and occurrence-history semantics.
The replacement model supports the active product without introducing series
editing, exceptions, skipped occurrences, or historical task instances.

## Search, Filtering, Calendar, and Statistics

These features remained client-side derived views over the loaded task
collection. No search service, reporting service, aggregation database, or
server-side calendar model was required.

## Child Resources

Subtasks, notes, reminders, and link attachments remained bounded CRUD
resources. They needed clear ownership and lifecycle handling, but not a large
domain-service architecture.

## Backend Layering

The backend did not need a service class for every controller. Direct
controller/repository ownership remained sufficient for current bounded CRUD
behavior. `ParentTaskGuard` demonstrated that shared rules can be extracted
when they have a coherent purpose without adding nominal layers everywhere.

## State Management Tooling

The project did not require a global state-management library. React state,
refs, bounded hooks, and pure derived utilities were sufficient once
authorities and lifecycles became explicit.

# Major Turning Points

## Moving Beyond CRUD

The first major shift occurred when a user-visible action stopped mapping to
one endpoint. Task creation and editing began coordinating recurrence, tags,
draft reset, local reconciliation, and transient feedback. That exposed
orchestration as a real responsibility rather than leftover component logic.

## Defining Recurrence Implementation

Choosing replacement semantics for recurring completion was a product and
architecture turning point. It clarified that storage does not determine
behavior and that recurrence had to remain consistent across individual and
bulk completion.

## Adding Child Resources

Subtasks, notes, reminders, and attachments demonstrated a successful bounded
ownership model. They shared task-scoped loading and CRUD lifecycles without
taking ownership of selected-task navigation or task mutations.

## Expanding Mobile Support

Mobile support changed the meaning of “same feature.” Inline editing could
share draft and save ownership with desktop while requiring different DOM
placement and controls. This separated product behavior from presentation and
platform structure.

## Stabilizing iOS Focus

iOS focus stabilization was the clearest example of empirical architecture.
The solution emerged from observing actual viewport, focus, scroll, and touch
behavior rather than relying on conventional assumptions. Defensive code,
tests, and documentation became necessary parts of the subsystem.

## Extracting Bounded Hooks and Utilities

The useful extractions established a practical standard: move a coherent
concept with its state, operations, reset conditions, and tests. The project
gained `useTaskListViewModel`, `useBulkSelection`, `useProjectTagCatalog`,
`useTaskDetailResources`, and pure domain utilities without pretending that
cross-domain orchestration had disappeared.

## Documenting Ownership

Writing the ownership map, state taxonomy, ADRs, sequence diagrams, and
architecture signals changed the project from code that worked into a system
whose constraints could be explained. Documentation reconstructed the reasons
behind unusual code and made future architecture discussions more concrete.

# Biggest Technical Lessons

## Ownership

Ownership is more important than file size or framework convention.

A valid owner can observe, operate, reset, reconcile, and test the complete
concept. Moving code without moving its lifecycle does not create a useful
boundary. The most important architectural question became:

> Which owner has enough context to execute this behavior correctly from
> beginning to end?

## State Categories

State should be classified by meaning and lifecycle, not by whether it uses
React `useState`.

- Persisted state needs one frontend working-copy owner and a durable backend
  authority.
- Draft state belongs with validation, save, reset, and flush behavior.
- Derived state should be recomputed rather than manually synchronized.
- Presentation-local state should stay near its surface unless global
  coordination requires a wider owner.
- Transient state belongs with the workflow conditions that create and clear
  it.
- Platform state belongs with an owner that can observe the complete browser
  and DOM lifecycle.

This taxonomy explains why values that look related by name can require
different owners.

## Orchestration

Orchestration is not a failure to modularize. It is the visible coordination
of otherwise bounded domains.

Healthy orchestration preserves mutation order, error handling, local
reconciliation, and cross-domain lifecycle in one traceable place. The project
learned to extract calculations and bounded domains while leaving complete
cross-domain workflows visible.

## Bounded Hooks

Hooks worked best when they owned one coherent stateful concept and clearly
excluded unrelated behavior.

`useBulkSelection` owns selection but not bulk task mutation.
`useProjectTagCatalog` owns catalogs but not task reconciliation.
`useTaskDetailResources` owns resource CRUD but not task selection or reminder
delivery. `useTaskListViewModel` owns derived results but not source tasks or
controls.

The exclusions are as important as the responsibilities.

## Testing

Tests became executable architecture documentation.

Utility tests protect deterministic rules. API tests protect transport
contracts. Backend tests protect validation and bounded persistence behavior.
`App.test.tsx` protects orchestration, mobile structure, focus sequences,
recurrence behavior, and other relationships that are not obvious from one
function.

Tests also revealed their limits. jsdom can protect event sequencing and DOM
invariants, but real WKWebView visual behavior still requires simulator or
device validation.

## Platform Constraints

Platform-specific behavior can determine architecture.

The mobile edit row, scroll ownership, focus scopes, visual viewport guard,
touch restrictions, and repeated corrections are not styling details. They
are a coordinated response to observed browser behavior. A conventional
cleanup is not automatically an improvement when the platform violates the
assumptions behind it.

# Biggest Mistakes

These mistakes were useful because they exposed architectural forces that were
not visible at the beginning.

## Allowing Monolithic Growth Before Naming Orchestration

`App.tsx` accumulated responsibilities before the project explicitly
distinguished orchestration from code that belonged in hooks, utilities, and
components. Some growth was unavoidable, but the absence of early ownership
language made it harder to tell intentional centralization from extractable
behavior.

The lesson was not that a large `App.tsx` is inherently wrong. The lesson was
to identify the composition and orchestration owner earlier, then extract only
complete bounded concepts.

## Reviewing Architecture Late

The ownership map, state taxonomy, ADRs, and architecture signals were created
after many important decisions already existed in code.

That documentation was still valuable, but earlier review would have made
feature impact and protected boundaries visible sooner. It also would have
reduced the need to reconstruct why specialized mobile and autosave behavior
existed.

## Assuming Extraction Was Automatically Improvement

There was a natural pressure to make large files smaller by moving handlers,
state, or JSX into hooks and components. The project learned that partial
movement can hide coupling rather than reduce it.

The mistake was treating extraction as a structural goal before proving that
the new owner could take state, lifecycle, operations, reconciliation, and
tests together.

## Treating Autosave as Primarily a Timer

The early assumption underweighted target identity, stale closures, panel
transitions, shared drafts, and related-resource reconciliation. Autosave
became reliable only after it was treated as part of edit ownership.

## Assuming Responsive CSS Was Sufficient for Mobile

Desktop structures appeared reusable until virtual keyboards, caret
auto-scroll, touch gestures, nested scroll containers, and WKWebView viewport
behavior were exercised. Mobile interaction should have been tested as a
first-class platform earlier.

## Trusting Conventional Platform Signals Too Quickly

Zero document scroll appeared to indicate a stable viewport, but WKWebView
could still display an offset visual viewport. The project learned to
instrument observed behavior before simplifying or generalizing a fix.

## Designing Future Persistence Before Product Semantics

The original schema modeled several mature-product concepts before their
workflows were defined. Recurrence and dependencies showed that a table can
represent data without answering completion, propagation, history, conflict,
or editing semantics.

The lesson was to keep the vocabulary, but delay active architecture until the
user-visible lifecycle is understood.

# Decisions Worth Repeating

- Begin with a clear domain vocabulary, but keep the active model limited to
  demonstrated behavior.
- Give every authoritative state domain one named owner.
- Separate persisted, draft, derived, presentation-local, transient, and
  platform state early.
- Keep pure calculations in deterministic utilities.
- Extract hooks only when state and complete lifecycle move together.
- Keep cross-domain workflows visible in an orchestration owner.
- Let presentation components emit intent instead of becoming mutation
  authorities.
- Use direct backend layers while operations remain bounded, and add a layer
  only when it owns meaningful rules or transactions.
- Define recurrence and notification semantics before designing generalized
  storage.
- Treat mobile browsers and embedded webviews as distinct platforms.
- Instrument difficult platform behavior and preserve observed evidence.
- Write tests around behavioral invariants, not only functions and endpoints.
- Record ADRs, ownership maps, sequence diagrams, and protected invariants
  while the reasoning is still fresh.
- Keep manual schema changes explicit and reviewable.

# Decisions Not Worth Repeating

- Do not treat a comprehensive ERD as a complete application architecture.
- Do not activate speculative entities before a concrete workflow requires
  them.
- Do not wait for file size to become uncomfortable before naming ownership
  boundaries.
- Do not use line-count reduction as the primary measure of a successful
  extraction.
- Do not create hooks that need broad bundles of unrelated setters, refs, and
  callbacks.
- Do not give each presentation its own copy of authoritative task or edit
  state.
- Do not implement autosave before defining target identity, flush behavior,
  stale-work protection, and related-resource reconciliation.
- Do not assume desktop DOM structure and responsive CSS will behave
  equivalently on mobile.
- Do not treat a platform workaround as redundant until the original failure
  can be reproduced and the replacement is verified.
- Do not add backend layers solely to match a conventional diagram.
- Do not postpone architecture documentation until the end of feature growth.

# Advice To Future Maintainers

Start by understanding owners, not directories.

`App.tsx` is the composition root and cross-domain orchestration owner. Its
size alone is not evidence that a responsibility belongs elsewhere. The four
bounded hooks own deliberately narrower concepts, and their exclusions are
part of the architecture.

Before changing state, classify it using the state taxonomy. Determine whether
it is persisted, draft, derived, presentation-local, transient, or platform
state. Then identify its full lifecycle: initialization, mutation, save,
reset, flush, cancellation, reconciliation, and failure behavior.

Before moving code, ask whether the proposed owner can observe and complete
the entire concept without reaching back into unrelated application state. A
move that transfers only JSX, handlers, or setters is not an ownership
transfer.

Trace cross-domain behavior through the sequence diagrams. Task creation,
editing and autosave, recurring completion, reminder snooze, catalog deletion,
calendar opening, and mobile edit entry all depend on ordering and local-state
reconciliation.

Treat the mobile focus system as one subsystem even though it spans
TypeScript, JSX, CSS, DOM scopes, event listeners, touch behavior, scroll
owners, and tests. Mobile edit placement, `visualViewport` handling, repeated
corrections, and focus sequence protection record real failure history.

Use tests as architecture evidence. Existing behavior should remain protected
when code moves without intended behavior change. For mobile/WKWebView visual
behavior, automated tests are necessary but not sufficient.

Finally, distinguish a refactor from an architecture change. Changing an
owner, state authority, mutation sequence, mobile invariant, recurrence model,
or backend transaction boundary changes the architecture even when the visible
interface appears unchanged.

# Advice To Future Mitchell

If rebuilding Task Manager from scratch, preserve the original ambition but
sequence the work differently.

Preserve:

- the task-centered domain vocabulary;
- projects, tags, recurrence, and child resources as distinct concepts;
- an explicit REST boundary and relational persistence;
- one authoritative frontend task collection;
- pure utilities for deterministic domain calculations;
- bounded hooks for catalogs, detail resources, selection, and derived views;
- visible orchestration for workflows that cross domains;
- recurrence replacement unless product semantics intentionally change;
- tests that name interaction and platform invariants;
- empirical investigation when the platform behaves unexpectedly.

Approach differently:

- begin with concrete user workflows alongside the schema;
- define recurrence completion, reminder delivery, and failure semantics before
  generalizing their data models;
- write the ownership map and state taxonomy before major feature growth;
- name the orchestration owner before `App.tsx` accumulates cross-domain
  workflows;
- establish API operation boundaries and partial-failure expectations early;
- test mobile text entry, keyboard behavior, scrolling, and touch interaction
  from the first mobile iteration;
- create ADRs when decisions are made rather than reconstructing them later;
- maintain a feature-impact map covering persistence, drafts, derived views,
  mobile behavior, tests, and documentation;
- keep speculative entities outside the active runtime model until their
  product lifecycle is clear.

The most important thing to preserve is the willingness to let evidence change
the architecture. The final system became stronger when it stopped trying to
look like the original academic model or a generic reference architecture and
instead named the actual owners, workflows, and platform constraints of the
product being built.
