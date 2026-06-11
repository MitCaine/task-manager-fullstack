# Task Manager Architecture Timeline

## Purpose

This document explains how Task Manager evolved from a database-class design
into the current React, Spring Boot, MySQL, and Capacitor application.

It is historical and educational. The milestones describe the concerns that
became visible, the decisions recorded in the current architecture, and the
lasting lessons preserved by the implementation and documentation. They do
not evaluate code quality or propose future changes.

The timeline uses repository history to establish broad ordering, but several
architectural decisions became explicit only after their behavior already
existed. Dates therefore identify implementation periods rather than claiming
that every idea began in one commit.

```text
Database-centered design
    -> CRUD application
    -> feature and workflow expansion
    -> mobile and platform adaptation
    -> bounded extraction and ownership clarification
    -> ADRs, architecture maps, and reverse-engineering documentation
```

# Original Database-Class Design

## What Existed Before

The project began as a Personal Task Management System concept for a database
class. The initial architecture was primarily an entity-and-relationship
model rather than a running application.

## What Changed

A normalized domain vocabulary was established around tasks, schedules,
statuses, recurrence, projects, tags, subtasks, notes, reminders,
attachments, dependencies, users, devices, preferences, and related records.

## Why It Changed

The class project required a structured relational model capable of
representing a broad task-management product. The database was the first
concrete architectural artifact.

## Architectural Impact

The schema made `Task` the central domain record and established separate
concepts for classification, recurrence, and task-associated resources. It
also created a larger conceptual product boundary than the active application
would eventually implement.

## Ownership Impact

Ownership was expressed mainly through tables, foreign keys, and
relationships. Application workflow owners, frontend state authorities, and
platform owners had not yet become architectural concerns.

## State Impact

The design emphasized persisted state. Draft, derived, transient,
presentation-local, and platform state were largely outside the original
model because they emerge from runtime interaction rather than relational
storage.

## Lasting Lessons

The original model supplied a durable vocabulary. It also established the
lesson that persistence is one view of architecture: a table can represent a
concept without defining its user-visible lifecycle, workflow ordering, or
runtime owner.

# Initial CRUD Implementation

## What Existed Before

The project had a broad database design but not yet a complete working path
from user interaction through frontend state, HTTP transport, backend
validation, and persistence.

## What Changed

The application gained a React frontend, Spring Boot controllers and
repositories, persisted task records, and direct REST operations for creating,
reading, updating, and deleting tasks. Repository history records the initial
frontend in June 2025 and a backend/frontend task-creation refactor in April
2026.

## Why It Changed

The database concepts needed to become a usable application. CRUD operations
provided the first complete execution path from interface to database and
back.

## Architectural Impact

The system settled on a direct layered path:

```text
React UI -> frontend API -> Spring controller -> repository -> database
```

The backend remained controller/repository based, while the frontend began to
hold a rendered working copy of tasks.

## Ownership Impact

`App.tsx` became the practical owner of the primary frontend task collection
and task mutations. Controllers owned HTTP behavior and bounded mutation
logic; repositories owned persistence access.

## State Impact

Persisted task records gained a frontend working-copy lifecycle. Create and
edit form values introduced draft state, while loading, error, and selection
introduced transient state.

## Lasting Lessons

A working CRUD path made the boundary between transport and ownership visible.
The frontend API could carry requests, but the caller still had to own draft
reset, local reconciliation, and user-facing failure behavior.

# Introduction of Projects and Tags

## What Existed Before

Tasks were the central active records, with basic task creation and mutation
already crossing the frontend and backend.

## What Changed

Projects and tags became active catalog resources. Projects supplied a single
task classification; tags supplied many-to-many classification, color, task
display, filtering, and task-association endpoints.

## Why It Changed

Tasks needed organization beyond status and schedule. The original database
vocabulary already distinguished projects and tags, and the working
application activated those concepts.

## Architectural Impact

Task creation and editing stopped being single-resource mutations. A visible
task could depend on a base task request, catalog records, and separate
task/tag association requests. Catalog deletion also required frontend
reconciliation beyond deleting the catalog record.

## Ownership Impact

Catalog state and CRUD eventually became the bounded responsibility of
`useProjectTagCatalog`. `App.tsx` retained task assignment and post-deletion
reconciliation because the catalog owner does not own tasks, filters, or task
drafts.

## State Impact

Projects and tags added persisted catalog state, catalog creation drafts,
task-draft assignment state, derived lookup/filter results, and
presentation-local dropdown and color-picker state.

## Lasting Lessons

Concepts that share a catalog can have a bounded owner, while workflows that
reconcile those concepts into tasks still require the primary task owner.
Related data does not automatically imply one lifecycle.

# Recurrence Support

## What Existed Before

Tasks could be created, edited, classified, and completed through ordinary
task mutations.

## What Changed

Daily, weekly, and monthly recurrence became active. Recurrence gained a
separate rule record and endpoint behavior. Completing an active recurring
task became a replacement workflow rather than an ordinary status update.
Repository history records recurring-task expansion in April 2026 and later
alignment of bulk completion with recurrence behavior.

## Why It Changed

A repeating task must continue producing an actionable future occurrence.
The original schema identified recurrence as distinct, but the running
application needed explicit completion semantics.

## Architectural Impact

Recurring completion became one of the first clearly cross-domain workflows:
load the rule, calculate the next schedule, create a replacement task, copy
metadata and tags, attach recurrence, delete the old task, and reconcile the
rendered list.

## Ownership Impact

`taskRecurrence.ts` became the owner of deterministic next-schedule
calculation. `App.tsx` remained the owner of replacement ordering, primary
task state, selection, scrolling, and highlighting. `TaskController` retained
bounded recurrence and task/tag endpoints.

## State Impact

Recurrence added persisted rule state, create/edit recurrence drafts, derived
next-schedule and duration values, and transient replacement/highlight state.

## Lasting Lessons

The difficult part of recurrence was identity and lifecycle rather than date
arithmetic. The current architecture preserves the lesson that a pure
calculation and a cross-domain mutation workflow need different owners.

# Child Resource System

## What Existed Before

The active application centered on tasks, projects, tags, schedules, and
recurrence. Task detail behavior had not yet formed one bounded resource
system.

## What Changed

Subtasks, notes, reminders, and link attachments became task-scoped resources
with their own entities, repositories, controllers, frontend API functions,
drafts, and task-keyed collections. Shared parent-task validation was later
extracted into `ParentTaskGuard` in May 2026.

## Why It Changed

Task details needed richer records that could be loaded and mutated
independently without expanding the central task record.

## Architectural Impact

The application gained parallel resource paths:

```text
Detail presentation
    -> useTaskDetailResources
    -> frontend API
    -> matching controller
    -> matching repository/entity
```

The direct controller/repository backend remained sufficient for these
bounded CRUD domains.

## Ownership Impact

`useTaskDetailResources` became the frontend owner of task-keyed resource
collections, resource drafts, loading, and resource CRUD. `App.tsx` retained
selected-task and detail-panel lifecycle. `ParentTaskGuard` became the shared
backend owner of parent existence checks.

## State Impact

The system added persisted resource maps, resource-specific drafts,
task-detail loading and errors, active subtask-edit identity, and
presentation-local expanded sections.

## Lasting Lessons

Child resources demonstrated a successful bounded ownership model. A hook can
own several related resources when they share a coherent task-detail
lifecycle, while selection and application navigation remain outside that
boundary.

# Calendar Integration

## What Existed Before

Tasks were primarily presented through list and status-oriented interfaces,
with scheduling already stored on tasks.

## What Changed

Calendar presentations were added for year, month, week, day, and agenda-like
views. The calendar gained local date/view navigation and the ability to open
a task back in the task-list/detail context.

## Why It Changed

Scheduled tasks needed a time-oriented presentation in addition to list and
status views.

## Architectural Impact

Calendar behavior established a distinct presentation boundary over the same
authoritative task collection. Calendar task subsets and groupings remained
derived rather than becoming a second persisted or synchronized task model.

## Ownership Impact

`Calendar` became the owner of calendar-local navigation, picker state, and
rendering. `useTaskListViewModel` supplied the derived calendar task subset.
`App.tsx` retained task opening, selection, filter reset, mobile transition,
and optional detail loading.

## State Impact

Calendar introduced derived task subsets and groupings,
presentation-local date/view/picker state, transient task-opening state, and
platform media-query detection.

## Lasting Lessons

A major presentation can own its local navigation without owning the domain
records it displays. Derived views remain consistent when they calculate from
one primary task authority.

# Shared Edit Draft Model

## What Existed Before

Task editing had expanded across inline, mobile, and detail-panel
presentations. Each presentation needed access to the same task fields and
related assignment controls.

## What Changed

Editing converged on one authoritative shared edit draft owned by `App.tsx`.
`taskEditDraft.ts` became the pure conversion boundary from persisted task to
draft values. The model was later recorded in ADR-002.

## Why It Changed

Changing presentation did not create a new task-editing lifecycle. Task
switching, panel closing, tags, recurrence, schedules, and later autosave all
needed one current pending version.

## Architectural Impact

Inline, mobile, and detail editors became presentation consumers of one draft
rather than independent state authorities. Different DOM structures could
share the same edit workflow and persistence behavior.

## Ownership Impact

`App.tsx` owned draft initialization, mutation, validation, save, reset, and
flush behavior. Presentation components received values and callbacks.
`taskEditDraft.ts` owned deterministic conversion only.

## State Impact

Persisted task state and pending edit draft state became explicitly distinct.
Active editor and selected task remained transient, while dropdowns and
editor placement remained presentation or platform concerns.

## Lasting Lessons

A draft belongs with its complete lifecycle, not necessarily with the
component currently rendering it. Shared product behavior can coexist with
different presentation structures.

# Autosave Introduction

## What Existed Before

The shared edit model supported explicit task saves and several editing
presentations.

## What Changed

Detail-panel changes gained debounced autosave. Timers, current task/save
refs, immediate saves for discrete controls, and flush-on-close/switch
behavior became part of task editing. The ownership decision was later
recorded in ADR-003.

## Why It Changed

The detail editing experience needed changes to persist without requiring
explicit Save for every field, while still preserving the complete visible
task edit.

## Architectural Impact

Autosave revealed that delayed work is a workflow lifecycle rather than a
standalone timer. A save had to target the current task, use the latest shared
draft, reconcile tags and recurrence, and interact with panel transitions.

## Ownership Impact

Autosave remained in `App.tsx` beside selected-task ownership, shared edit
draft ownership, and the full `saveEdit` workflow. Detail components emitted
changes and save intent but did not own timers or persistence.

## State Impact

Autosave added transient timers and current-value refs, while preserving the
distinction between draft values and successfully persisted task state.
Browser timer behavior became a platform-state dependency.

## Lasting Lessons

Delayed behavior belongs with the owner that can observe every cancellation,
flush, target, and reconciliation condition. The visible save operation may
span more resources than its initial trigger suggests.

# Mobile Support

## What Existed Before

The application had desktop-oriented list, edit, detail, and calendar
behavior.

## What Changed

Capacitor iOS support and mobile application behavior were introduced in May
2026. The frontend gained mobile pages for Add, Tasks, and Calendar, guarded
swipe navigation, coarse-pointer/mobile edit behavior, larger touch targets,
and mobile-specific interaction rules.

## Why It Changed

The application needed to operate as a mobile experience rather than only a
responsive desktop page.

## Architectural Impact

Mobile support introduced a second platform context around the same product
workflows. Page navigation, touch gestures, task-card behavior, edit
placement, and CORS/API configuration became architectural concerns.

## Ownership Impact

`App.tsx` became the owner of active mobile page, pager transitions, swipe
eligibility, long-press behavior, mobile layout detection, and mobile editor
entry. Product mutations and drafts remained shared with desktop behavior.

## State Impact

Mobile added presentation-local active-page state, transient gesture and
long-press state, and platform state for touch, layout detection, scrolling,
and focus.

## Lasting Lessons

Mobile is a platform adaptation, not only a smaller layout. Product ownership
can remain shared while presentation placement and platform interaction
require distinct behavior.

# iOS Focus Problems

## What Existed Before

The mobile application had page navigation, task editing, responsive controls,
and a Capacitor iOS wrapper.

## What Changed

Real mobile text entry exposed WKWebView behavior in which keyboard, focus,
blur, caret scrolling, touch, and viewport changes could shift the visible
application or leave white gaps. Document scroll values could report zero
while the visual viewport remained offset.

## Why It Changed

The platform did not consistently preserve the assumptions of desktop browser
layout and focus behavior. The failure became visible only through actual
mobile interaction.

## Architectural Impact

Focus, viewport, scroll ownership, DOM placement, root sizing, and touch
behavior became one cross-cutting subsystem. Styling and event handling could
no longer be understood independently for mobile text entry.

## Ownership Impact

No individual field or presentation had enough context to observe transitions
among create, search, inline, mobile, and detail text entry. Global focus and
viewport behavior therefore remained with the application orchestration
owner.

## State Impact

Platform state became explicit: active DOM element, focus scope, focus
sequence, keyboard text mode, document and container scroll positions,
touch movement, and `visualViewport` offsets.

## Lasting Lessons

Platform behavior can reveal architecture that is invisible in a data model
or component hierarchy. Conventional signals such as zero document scroll
were insufficient without observing the visual viewport.

# Mobile Focus Stabilization

## What Existed Before

The iOS application had reproducible focus and viewport instability during
mobile text editing.

## What Changed

The mobile text-focus system was stabilized in May 2026 through a dedicated
`.mobile-edit-row` and `.mobile-edit-panel`, explicit scroll ownership,
`data-text-focus-scope`, focus sequence protection, repeated scroll
corrections, `visualViewport` monitoring, touch guards, and extensive
regression tests. These decisions were later captured in ADR-004 and ADR-005.

## Why It Changed

The application needed to preserve stable text entry despite asynchronous
WKWebView viewport movement, stale blur events, caret scrolling, and touch
overscroll.

## Architectural Impact

DOM placement and CSS overflow rules became protected architectural
invariants. The task list remained the mobile task-page scroll owner; the
mobile editor participated in that scroll context without becoming a nested
scroll container.

## Ownership Impact

`App.tsx` retained the global focus guard because it could observe all
editing surfaces and platform transitions. The mobile editor kept the shared
edit draft and save owner while using a distinct presentation structure.

## State Impact

Platform state gained an explicit guarded lifecycle. Focus sequences rejected
stale cleanup; scheduled corrections handled asynchronous movement; touch
state distinguished valid textarea scrolling from viewport drag.

## Lasting Lessons

Empirical evidence can make defensive behavior architecturally meaningful.
Tests can preserve event and DOM invariants, while simulator or device
validation remains part of understanding platform-specific visual behavior.

# Component Extraction Phase

## What Existed Before

Feature growth, multiple presentations, and mobile behavior had accumulated
substantial rendering and calculation responsibilities around `App.tsx`.

## What Changed

In early June 2026, a sustained extraction phase created shared utilities,
feature-organized presentation components, and bounded hooks. Repository
history records extraction of date/time, form, display, recurrence, task
editor, task-list, detail, dialog, settings, toast, resource, catalog,
view-model, and bulk-selection boundaries.

## Why It Changed

The application had enough repeated or coherent behavior to name smaller
boundaries without changing the cross-domain workflows that still required
central coordination.

## Architectural Impact

The frontend settled into its current dependency direction:

```text
Presentation -> App.tsx or bounded hook -> utility/API
```

Pure calculations moved to utilities. Bounded persisted and transient domains
moved to hooks. Recognizable visual surfaces moved to components.

## Ownership Impact

`useTaskDetailResources`, `useProjectTagCatalog`, `useTaskListViewModel`, and
`useBulkSelection` became named owners with explicit exclusions. Components
became presentation owners that emit intent. `App.tsx` retained primary tasks,
cross-domain orchestration, selected-task lifecycle, autosave, focus, and
mobile behavior.

## State Impact

Persisted catalog/resource working copies moved to bounded hooks; bulk
selection moved to its transient-state hook; major derived task views moved
to the view-model hook; component-local controls remained near their
presentation.

## Lasting Lessons

Extraction became an ownership exercise rather than a line-count exercise.
The useful boundaries moved state, operations, reset conditions, and
dependencies together while leaving cross-domain workflows visible.

# Ownership Review Phase

## What Existed Before

The component, utility, and hook boundaries existed in code, but many reasons
for keeping responsibilities centralized were still implicit.

## What Changed

Architecture and ownership documentation was added on June 5, 2026. The
project explicitly named `App.tsx` as the frontend composition and
orchestration owner, documented hook exclusions, described the direct
controller/repository backend, and later added a state taxonomy and
architecture signals.

## Why It Changed

The implementation needed language for distinguishing healthy bounded
ownership from partial extraction and for explaining why some large,
cross-cutting responsibilities remained centralized.

## Architectural Impact

Ownership became a first-class architectural dimension alongside files,
features, and persistence layers. The project could describe dependency
direction, lifecycle boundaries, and protected centralized workflows in
consistent terms.

## Ownership Impact

Named owners and non-owners became explicit:

- `App.tsx` owns primary tasks and cross-domain workflows;
- hooks own bounded concepts;
- components own presentation surfaces;
- utilities own deterministic calculations;
- API functions own transport;
- controllers and repositories own bounded backend request/persistence paths.

## State Impact

State was classified as persisted, draft, derived, presentation-local,
transient, or platform state. This clarified why similarly named values, such
as reminder records and reminder toasts, belonged to different owners.

## Lasting Lessons

Architecture becomes easier to preserve when ownership includes exclusions.
The question “who can observe and complete the whole lifecycle?” became more
useful than “which file would be smaller if this moved?”

# ADR Documentation Phase

## What Existed Before

Important architecture decisions already existed in behavior and tests:
central orchestration, one shared edit draft, autosave ownership, mobile edit
placement, the focus guard, reminder ownership split, recurring replacement,
and direct backend layering.

## What Changed

Eight accepted Architecture Decision Records were added on June 10, 2026.
They documented the context, decision, alternatives, consequences, and
breakage risks for the project's major architectural boundaries.

## Why It Changed

The project needed to preserve not only what the architecture was, but why
unusual or centralized behavior existed and which alternatives had already
been considered.

## Architectural Impact

Previously implicit constraints became explicit decisions. The ADR set linked
frontend orchestration, edit lifecycle, mobile platform behavior, recurrence,
reminders, and backend layering into one explainable architecture.

## Ownership Impact

The ADRs formalized current owners:

- ADR-001: `App.tsx` orchestration;
- ADR-002: shared edit draft;
- ADR-003: autosave with selected-task/edit ownership;
- ADR-004 and ADR-005: mobile edit and focus ownership;
- ADR-006: split reminder ownership;
- ADR-007: recurring replacement;
- ADR-008: direct controller/repository backend ownership.

## State Impact

The records connected state lifecycles to decisions. Draft authority,
transient timers and toasts, persisted resources, and platform focus/viewport
state became part of the rationale for ownership boundaries.

## Lasting Lessons

An ADR is most useful when it records the force behind a decision and the
consequences of changing it. The records turned historical implementation
experience into maintainable architectural context.

# Architecture Documentation Phase

## What Existed Before

The application had current owners, protected decisions, extensive tests, and
an initial architecture/ownership explanation.

## What Changed

The documentation expanded into a connected maintenance and learning system:
state taxonomy, sequence diagrams, architecture signals, code-reading guide,
feature atlas, test-coverage map, breakage guide, retrospective, dependency
analysis, trace atlas, onboarding paths, and this historical timeline.

## Why It Changed

The architecture had become rich enough that no single code file or diagram
could answer every maintenance question. Different documents were needed to
explain features, flows, dependencies, tests, ownership, failure assumptions,
and history.

## Architectural Impact

Documentation became a navigable model of the current system. Sequence and
trace documents exposed execution ordering; dependency and ownership maps
exposed structure; coverage and breakage documents exposed protection and
constraints; the retrospective and timeline exposed lessons and evolution.

## Ownership Impact

Maintenance questions gained explicit reading paths. A maintainer can now
locate an owner, understand its dependencies and state categories, follow an
execution path, identify relevant ADRs, and see which tests preserve the
behavior.

## State Impact

The state taxonomy became shared terminology throughout the documentation.
Persisted, draft, derived, presentation-local, transient, and platform state
could be traced across features and historical decisions.

## Lasting Lessons

Reverse engineering and documentation can clarify an architecture after
feature growth, especially when they connect current behavior to the
historical pressures that shaped it. Documentation became part of preserving
the system's operational memory.

# Architectural Eras

## Era 1: Data Modeling

### Dominant Concerns

The dominant concern was representing a broad personal task-management domain
through normalized relational entities, keys, relationships, and constraints.

### Major Decisions

`Task` became the central record. Projects, tags, recurrence, statuses, and
child resources were modeled as distinct concepts. The schema also anticipated
future-facing concepts such as task instances, dependencies, users, devices,
notifications, and preferences.

### Resulting Architecture

The era produced a durable domain vocabulary and persistence blueprint. It did
not yet describe runtime ownership, user-action sequencing, or platform
behavior.

## Era 2: Feature Expansion

### Dominant Concerns

The dominant concern shifted to turning the model into a useful application:
CRUD, classification, recurrence, child resources, calendar views, editing,
bulk operations, and reminders.

### Major Decisions

The frontend held one primary task working copy. The backend used direct
controllers and repositories. Recurring completion became replacement.
Projects/tags and child resources received bounded persistence paths.
Calendar and statistics remained derived from loaded tasks.

### Resulting Architecture

The application became workflow-oriented. `App.tsx` accumulated
cross-domain orchestration, while the backend remained resource-oriented and
direct.

## Era 3: Mobile Adaptation

### Dominant Concerns

The dominant concerns were touch interaction, mobile navigation, edit
placement, scroll ownership, keyboard behavior, and iOS WKWebView viewport
stability.

### Major Decisions

Mobile gained a page/pager model and guarded swipes. Mobile editing used a
dedicated task-list row while sharing the edit draft. A global focus and
visual viewport guard coordinated focus scopes, touch, scroll corrections,
and stale-event protection.

### Resulting Architecture

Platform state became a first-class architectural category. DOM placement,
CSS overflow, event sequencing, and device validation became part of the
working architecture alongside product workflows.

## Era 4: Ownership Clarification

### Dominant Concerns

The dominant concern was distinguishing responsibilities that could form
bounded owners from workflows that still required application-wide context.

### Major Decisions

Pure calculations moved into utilities. Presentation surfaces moved into
components. Catalogs, detail resources, derived views, and bulk selection
became bounded hooks. `App.tsx` remained the orchestration owner for primary
tasks, selected-task lifecycle, autosave, recurrence, focus, reminders, and
mobile behavior.

### Resulting Architecture

The current frontend dependency direction became explicit: components emit
intent, bounded owners manage coherent state, utilities calculate, the API
transports, and `App.tsx` coordinates cross-domain workflows.

## Era 5: Documentation and Reverse Engineering

### Dominant Concerns

The dominant concern became preserving architectural knowledge: owners,
state categories, execution paths, dependencies, tests, breakage assumptions,
decisions, and historical lessons.

### Major Decisions

Architecture and ownership maps were followed by ADRs, state taxonomy,
sequence diagrams, architecture signals, reading paths, feature/coverage maps,
maintenance guides, retrospective analysis, dependency analysis, and trace
documentation.

### Resulting Architecture

The code architecture remained the same, but its rationale and constraints
became inspectable through multiple complementary documentation paths. The
project gained an explicit maintenance model around the running system.

# Lessons That Changed Future Development

## Database Design Is Not Complete Application Design

The original schema remained valuable, but implementation showed that
ownership, workflow ordering, drafts, failure handling, derived views,
transient behavior, and platform constraints are equally architectural.

## User Actions Reveal Architecture

The most consequential boundaries became visible by tracing complete user
actions. Create, edit, recurring completion, autosave, reminder snooze,
calendar opening, and mobile edit entry each showed which owner had enough
context to complete the workflow.

## Ownership Includes Lifecycle And Exclusions

An owner is defined by what it can initialize, operate, save, reset, flush,
reconcile, and test. The extracted hooks became clear partly because their
non-responsibilities were documented alongside their responsibilities.

## State Meaning Determines Ownership

Persisted, draft, derived, presentation-local, transient, and platform state
require different lifecycles. Classifying state by meaning explained why one
React component or one domain name could not automatically own all related
values.

## Orchestration Is A Real Responsibility

Cross-domain coordination did not disappear when components, hooks, and
utilities were extracted. Keeping mutation ordering and reconciliation
visible in the smallest capable owner became a deliberate architectural
choice.

## Platform Evidence Can Override Conventional Assumptions

Mobile and WKWebView behavior showed that responsive layout and common browser
signals were not sufficient. Instrumentation, observed failure modes,
defensive event handling, and platform-specific validation changed how mobile
work was understood.

## Tests Preserve Architectural Relationships

Tests evolved from CRUD and validation checks into executable evidence for
recurrence semantics, shared editing, mobile DOM placement, focus sequences,
scroll ownership, and cross-domain orchestration.

## Documentation Preserves Operational Memory

The later documentation phase converted accumulated implementation knowledge
into named decisions, paths, constraints, and lessons. This made the current
architecture explainable as the result of evolving product and platform
requirements rather than as a static arrangement of files.
