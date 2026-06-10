I’ll compare the original PDF/schema intent with the implemented frontend, backend, tests, and existing architecture documentation. I will keep this review read-only and ground each subsystem comparison in current code evidence.

The implemented architecture confirms a central difference already: the original model primarily predicted persistent nouns and relationships, while the production system’s hardest behavior sits in frontend transitions, mutation sequencing, and mobile browser invariants. I’m now mapping that difference subsystem by subsystem against the original schema and requirement language.

# Original Database Design vs. Current Implementation

## Executive Summary

The original database-class design correctly identified most durable domain concepts:

- tasks
- schedules
- recurrence
- dependencies
- reminders
- projects
- tags
- subtasks
- notes
- attachments
- users
- preferences
- devices

The current implementation confirms that these concepts were useful, but it also demonstrates a central production-engineering lesson:

> A database model describes persisted information. It does not describe the complete behavior, ownership, lifecycle, or platform constraints of an application.

The original design concentrated complexity in normalized entities and relationships. The working application instead concentrates much of its complexity in:

- mutation sequencing
- shared editing state
- autosave timing
- derived views
- cross-domain reconciliation
- mobile interaction behavior
- iOS WKWebView focus and viewport stability
- explicit ownership boundaries

The database became simpler than predicted in several areas. The frontend became substantially more complex than predicted.

---

# Subsystem Comparison

## 1. Core Task Management

### What the Original Design Predicted Correctly

The original schema correctly made `Task` the central domain entity. It anticipated that tasks would require:
- title and description
- scheduled date and time
- status
- priority
- project assignment
- recurrence assignment
- user ownership
- tags
- associated child resources

Evidence:

- [databasemodel.sql](/Users/mipoo/task-manager-fullstack/SQL%20Files/databasemodel.sql)
- [Task.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/Task.java)
- [TaskController.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/TaskController.java)

The original design also correctly predicted that status should be represented separately rather than stored as arbitrary task text.

### What Became More Complex

A user-visible task mutation is often not a single database update.

Creating or editing a task can involve:

1. Creating or updating the base task.
2. Assigning or removing tags.
3. Creating, updating, or removing recurrence.
4. Updating the local task collection.
5. Preserving selection and edit state.
6. Reconciling calendar, list, statistics, and filters.
7. Handling errors across multiple requests.

This orchestration is primarily owned by [App.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/App.tsx), not by the `Task` entity.

### What Became Simpler

The active application is effectively single-user. Task ownership through `userID` exists structurally, but authentication, authorization, account selection, and tenant isolation are not active application concerns.

The task entity remains mostly a persistence record rather than becoming a rich domain object.

### UI Complexity

A single task appears in multiple interfaces:

- task list
- board/status views
- calendar
- agenda
- inline editor
- mobile editor
- detail panel
- statistics

Each presentation needs different derived labels, controls, and interaction rules while sharing one authoritative task collection.

### Mobile Complexity

Task cards also participate in:

- long-press behavior
- mobile page navigation
- swipe exclusion
- mobile edit placement
- focus protection
- task-list scrolling

These concerns were not visible in the original task schema.

### Ownership and Orchestration Complexity
`App.tsx` owns the primary task collection and all task-level mutation workflows because narrower hooks and components lack enough context to coordinate them safely.
Presentation components emit intent upward rather than independently mutating tasks.

---

## 2. Scheduling and Rescheduling

### What the Original Design Predicted Correctly

The original design correctly treated scheduling as a core task-management concern. It included:

- `dateTimeScheduled`
- a separate `Schedule` entity
- start and end times
- schedule relationships for task instances

The current application confirms that scheduling and easy rescheduling are important product features.

Evidence:

- [databasemodel.sql](/Users/mipoo/task-manager-fullstack/SQL%20Files/databasemodel.sql)
- [taskScheduling.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/utils/taskScheduling.ts)
- [taskTimeShift.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/utils/taskTimeShift.ts)
- [taskForm.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/utils/taskForm.ts)

### What Became More Complex

Scheduling required considerably more application behavior than storing a datetime:

- optional start time
- optional end time
- end-after-start validation
- duration preservation during recurrence
- quick hour/day shifting
- 12-hour and 24-hour input conversion
- US and European date presentation
- create/edit draft synchronization
- calendar presentation
- overdue calculation

Adding `endDateTimeScheduled` affected the schema, backend validation, API payloads, task forms, recurrence logic, duplication, display helpers, and tests.

### What Became Simpler

The standalone `Schedule` entity is not the active scheduling owner. The application stores start and end scheduling values directly on `Task`.

This is less normalized, but much easier for the current task-centric workflows.

### UI Complexity

The UI must distinguish among:

- no date
- date without explicit time
- start time only
- start and end times
- invalid ranges
- compact display summaries
- open date/time selectors

The database only records the result. It does not describe these interaction states.

### Mobile Complexity

Date and time controls must coexist with mobile swipe navigation, dropdown placement, keyboard focus, and constrained screen space.

### Ownership and Orchestration Complexity

Pure calculations belong in scheduling utilities. Draft state and mutation sequencing remain in `App.tsx`.

This division keeps deterministic schedule calculations reusable without pretending that utilities own the edit lifecycle.

---

## 3. Recurrence

### What the Original Design Predicted Correctly

The original design correctly recognized recurrence as a distinct concept requiring its own rule representation.

It also anticipated that recurrence and individual task occurrences may need separate identities through `RecurrenceRule` and `TaskInstance`.

Evidence:

- [RecurrenceRule.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/RecurrenceRule.java)
- [taskRecurrence.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/utils/taskRecurrence.ts)
- [TaskController.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/TaskController.java)

### What Became More Complex

The difficult part was not calculating the next date. It was deciding what completing a recurring task means.

The active workflow:

1. Calculates the next occurrence.
2. Creates a replacement task.
3. Preserves the original duration.
4. Copies metadata.
5. Reattaches tags.
6. Attaches recurrence.
7. Deletes the completed occurrence.
8. Replaces local task state.
9. Preserves appropriate selection behavior.

This workflow crosses task, recurrence, tag, local-state, and presentation domains.

### What Became Simpler

The original `TaskInstance` architecture is not active.

The current product supports a simpler model:

- an active task references a recurrence rule;
- completing it replaces it with the next occurrence;
- historical occurrences are not retained.

This avoids full recurrence-series and occurrence-history semantics.

### UI Complexity

Recurrence must work consistently in:

- task creation
- inline editing
- mobile editing
- detail editing
- duplication
- completion
- bulk completion

The UI must also represent removing or changing recurrence.

### Mobile Complexity

Recurrence controls must remain usable within the protected mobile edit structure without disrupting focus or swipe behavior.

### Ownership and Orchestration Complexity

Date calculation belongs in [taskRecurrence.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/utils/taskRecurrence.ts).

Recurring completion remains in `App.tsx` because it is a cross-domain replacement workflow. Even bulk selection does not own recurring completion.

---

## 4. Task Dependencies

### What the Original Design Predicted Correctly

The original design correctly identified that task dependencies require a graph relationship rather than a simple task field.

The `TaskDependency` table supports predecessor/successor relationships and dependency types.

### What Became More Complex

A production dependency feature would require product semantics that the table does not answer:

- Should successor dates automatically shift?
- What happens when a predecessor is delayed?
- Are circular dependencies rejected?
- Can completed tasks be rescheduled?
- How are blocked tasks displayed?
- Does bulk rescheduling propagate?
- How are dependency conflicts explained?

### What Became Simpler

Dependencies were not implemented in the active backend or frontend.

Avoiding an incomplete dependency feature removed substantial graph-validation, scheduling, and UI complexity.

### UI Complexity

A usable dependency feature would need:

- dependency selection interfaces
- blocked-state indicators
- cycle-error feedback
- schedule propagation previews
- calendar visualization
- safe deletion behavior

### Mobile Complexity

Editing and visualizing dependency graphs on mobile would introduce significant interaction complexity.

### Ownership and Orchestration Complexity

Dependencies would require a new orchestration boundary spanning tasks, scheduling, validation, and mutation ordering. A join table alone is insufficient.

---

## 5. Bulk Modification

### What the Original Design Predicted Correctly

The original vision correctly identified bulk modification as useful for task management and rescheduling.

### What Became More Complex

Bulk operations cannot blindly apply the same mutation to every selected task.

For example, bulk completion must distinguish:

- normal tasks, which can be marked complete;
- recurring tasks, which must generate replacement occurrences.

Bulk operations also need partial-failure handling and local-state reconciliation.

Evidence:

- [useBulkSelection.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/hooks/useBulkSelection.ts)
- [App.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/App.tsx)
- [App.test.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/App.test.tsx)

### What Became Simpler

The bulk-selection hook owns only:

- whether bulk mode is active;
- which task IDs are selected;
- selection toggling and clearing.

It does not attempt to become a general bulk-mutation engine.

### UI Complexity

Bulk mode changes task-card behavior, available actions, selection state, and completion semantics.

### Mobile Complexity

Bulk selection must coexist with long presses, task opening, mobile editing, and swipe navigation.

### Ownership and Orchestration Complexity

Selection state has a clean hook owner. Bulk mutations remain centralized because they depend on task and recurrence ownership.

This is a practical example of separating interaction state from mutation responsibility.

---

## 6. Reminders and Notifications

### What the Original Design Predicted Correctly

The original schema correctly distinguished:

- reminder configuration;
- generated notifications;
- task association;
- notification method;
- due time and message.

Evidence:

- [Reminder.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/Reminder.java)
- [ReminderController.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/ReminderController.java)
- [useTaskDetailResources.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/hooks/useTaskDetailResources.ts)

### What Became More Complex

A reminder record is not the same thing as reminder delivery.

The current frontend must manage:

- polling
- due-time detection
- duplicate-toast suppression
- transient toast state
- dismissal
- snoozing
- persisted due-date updates
- browser notification permission

### What Became Simpler

The original `Notification` entity is inactive.

There is no backend delivery service, push-notification infrastructure, email delivery, retry queue, or delivery history. Reminders currently produce frontend-managed in-app behavior.

### UI Complexity

The application needs separate interfaces for:

- creating persisted reminders;
- showing transient reminder toasts;
- dismissing or snoozing toasts;
- updating persisted reminder state after snoozing.

### Mobile Complexity

True mobile push notifications would require native permissions, device tokens, background delivery, and server-side scheduling. The current implementation avoids that infrastructure.

### Ownership and Orchestration Complexity

Reminder ownership is intentionally split:

| Owner | Responsibility |
|---|---|
| `useTaskDetailResources` | Persisted reminder records and CRUD |
| `App.tsx` | Polling, due detection, suppression, snoozing, toast queue |
| `ToastList` | Toast presentation and confirmation auto-dismiss |

This split is more complex than a single `Reminder` table, but accurately reflects different lifecycles.

---

## 7. Projects, Tags, and Contexts

### What the Original Design Predicted Correctly

The original model correctly predicted that users need multiple task-classification mechanisms.

Projects and tags became useful active concepts:

- tasks may belong to a project;
- tasks may have multiple tags;
- tags may have colors;
- projects and tags support filtering.

Evidence:

- [Project.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/Project.java)
- [Tag.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/Tag.java)
- [useProjectTagCatalog.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/hooks/useProjectTagCatalog.ts)

### What Became More Complex

Deleting a project or tag affects more than the catalog record.

The frontend must reconcile:

- existing tasks
- create-task drafts
- edit-task drafts
- active filters
- selected tag IDs
- visible task chips
- local catalog state

### What Became Simpler

The original `Context` entity is inactive.

Tags already provide a flexible classification mechanism, making a separate context concept unnecessary for the current product.

Projects also remain lightweight. Project-level scheduling, collaboration, and project workflows are not active.

### UI Complexity

Projects and tags participate in:

- inline creation
- dropdown ownership
- color picking
- create forms
- edit forms
- filters
- task cards
- detail panels

### Mobile Complexity

Dropdowns, inline forms, and color controls must avoid conflicting with mobile focus and swipe behavior.

### Ownership and Orchestration Complexity
`useProjectTagCatalog` owns the catalogs and catalog mutations.

`App.tsx` owns task reconciliation after catalog mutations because the catalog hook does not own tasks, filters, or task drafts.
---

## 8. Subtasks, Notes, and Attachments

### What the Original Design Predicted Correctly

The original design correctly modeled these as task-associated child resources rather than fields embedded directly in `Task`.

Evidence:

- [Subtask.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/Subtask.java)
- [Note.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/Note.java)
- [Attachment.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/Attachment.java)
- [useTaskDetailResources.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/hooks/useTaskDetailResources.ts)

### What Became More Complex

The frontend must manage resources by task ID, load them when details open, preserve drafts, update individual collections, and clear cached resources when tasks are deleted.

The backend must also ensure that child-resource mutations reference an existing parent task.

### What Became Simpler

These resources remain bounded CRUD domains.

Attachments are links rather than a full file-upload system. Notes use a lightweight content-oriented UI. Subtasks have limited scheduling and status semantics.

### UI Complexity

Each resource requires its own:

- draft state
- list rendering
- add/delete behavior
- empty state
- validation
- loading lifecycle

### Mobile Complexity

These features appear inside the detail interface, where available screen space and keyboard interaction matter, but they do not own global mobile behavior.

### Ownership and Orchestration Complexity

The resources form a clean ownership boundary in `useTaskDetailResources`.

Task selection and panel visibility remain outside the hook because the hook owns resources, not navigation or task lifecycle.

---

## 9. User, Account, Device, Preferences, and Settings

### What the Original Design Predicted Correctly

The original design correctly recognized that a mature task manager may require:

- users
- accounts
- devices
- preferences
- privacy and security settings
- default reminder behavior

These entities would be relevant for a multi-user, synchronized product.

### What Became More Complex

If activated, these features would require much more than database tables:

- authentication
- password or identity-provider handling
- authorization
- tenant isolation
- API scoping
- device registration
- session management
- secure preference synchronization
- account lifecycle workflows

### What Became Simpler

These entities are inactive in the current product.

Current display preferences such as theme, date format, time format, and workspace name are handled locally in the frontend rather than through user preference tables.

### UI Complexity

Even local preferences require settings presentation and immediate application-wide updates.

### Mobile Complexity

Device registration and native notification permissions would become significant if the original device model were activated.

### Ownership and Orchestration Complexity

Local preferences remain close to the application shell because they affect formatting and presentation throughout the frontend.

The original database design overestimated the immediate need for persisted account infrastructure and underestimated the behavior needed to implement it securely.

---

## 10. Search, Filtering, Calendar, and Statistics

### What the Original Design Predicted Correctly

The original model included fields and indexes useful for querying tasks by:

- user
- schedule
- status
- priority
- project
- tags
- completion information

### What Became More Complex

The same task collection now powers several derived views:

- filtered task lists
- board-style status views
- calendar subsets
- overdue counts
- completed counts
- statistics
- empty-state messaging

These views must remain consistent after every task mutation.

Evidence:

- [useTaskListViewModel.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/hooks/useTaskListViewModel.ts)
- [taskFiltering.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/utils/taskFiltering.ts)
- [taskStatistics.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/utils/taskStatistics.ts)
- [Calendar.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/components/Calendar.tsx)

### What Became Simpler

Search, filtering, calendar subsets, and statistics are currently calculated client-side from the fully loaded task collection.

No server-side search engine, aggregation service, pagination, or reporting database is required.

### UI Complexity

The UI must explain why lists are empty, preserve filter state, display active filters, support multiple views, and open tasks from calendar presentation.

### Mobile Complexity

Calendar and task list are separate mobile pager destinations. Swipe behavior must not conflict with calendar controls.

### Ownership and Orchestration Complexity
`useTaskListViewModel` owns derived results but does not own filter controls or task state.

`Calendar` owns calendar-local navigation state but delegates task opening and mutation ownership back to `App.tsx`.
---

## 11. Editing and Autosave

### What the Original Design Predicted Correctly

The database design correctly assumed that tasks would be editable.

It did not predict that editing lifecycle would become one of the application’s most coupled subsystems.

### What Became More Complex

Inline, mobile, and detail-panel editing share one authoritative edit draft.

Autosave may execute after:

- fields change;
- the selected task changes;
- the panel closes;
- another editor opens;
- recurrence changes;
- tags change;
- a delayed callback fires.

Autosave therefore requires current task refs, delayed save coordination, mutation sequencing, and explicit flushing.

Evidence:

- [App.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/App.tsx)
- [taskEditDraft.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/utils/taskEditDraft.ts)
- [ownership-map.md](/Users/mipoo/task-manager-fullstack/docs/ownership-map.md)

### What Became Simpler

The application avoids separate independent drafts for every editor.

A single shared draft prevents competing edit states and reduces synchronization problems.

### UI Complexity

Multiple editing surfaces display the same underlying draft differently. Closing, switching, or saving one presentation must preserve consistent task state.

### Mobile Complexity

Mobile editing requires different DOM placement and different description controls while retaining the same edit ownership.

### Ownership and Orchestration Complexity

Autosave remains in `App.tsx` because it depends on:

- selected-task ownership
- shared edit-draft ownership
- primary task collection
- recurrence reconciliation
- tag reconciliation
- panel lifecycle

Extracting autosave independently would hide rather than reduce coupling.

---

## 12. Mobile Navigation and iOS WKWebView Focus

### What the Original Design Predicted Correctly

The original database design did not meaningfully predict this subsystem because it is not a persistence concern.

The broader product vision correctly implied that task management should be usable across devices, but the actual platform behavior was not representable in the ERD.

### What Became More Complex

Mobile text editing required an application-wide protection system involving:

- mobile edit placement outside the normal task card
- explicit scroll ownership
- `data-text-focus-scope`
- focus transition tracking
- stale blur protection
- touchmove prevention
- textarea overscroll handling
- repeated document-scroll correction
- `visualViewport` drift detection
- swipe exclusions
- root and pager sizing

Evidence:

- [mobile-focus-system.md](/Users/mipoo/task-manager-fullstack/docs/mobile-focus-system.md)
- [App.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/App.tsx)
- [App.css](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/App.css)
- [App.test.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/App.test.tsx)

### What Became Simpler

The final implementation avoids broader native ownership:

- no Capacitor Keyboard plugin dependency for focus correction
- no separate native editing screen
- no general shell-transform workaround
- no broad dynamic viewport-height system

### UI Complexity

DOM placement and scroll-container selection became architectural concerns rather than styling details.

### Mobile Complexity

This is the subsystem where mobile created the largest amount of entirely new complexity.

A visually reasonable refactor can break behavior because WKWebView focus, keyboard, caret scrolling, and visual viewport movement depend on exact structure and event sequencing.

### Ownership and Orchestration Complexity

The focus guard remains centralized in `App.tsx` because it coordinates global DOM and interaction state.

Distributing it among individual inputs would prevent any one owner from understanding transitions between editing surfaces.

---

## 13. Backend API Structure

### What the Original Design Predicted Correctly

The normalized data model mapped naturally to resource-oriented backend endpoints and repositories.

The active backend domains align closely with the active tables.

Evidence:

- [TaskController.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/TaskController.java)
- [ReminderController.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/ReminderController.java)
- [ParentTaskGuard.java](/Users/mipoo/task-manager-fullstack/src/main/java/com/example/taskmanager/ParentTaskGuard.java)
- [tasks.ts](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/api/tasks.ts)

### What Became More Complex

Controllers must handle:

- validation
- related-record checks
- status-specific updates
- recurrence-rule attachment
- tag associations
- parent-task existence
- structured errors
- frontend/mobile CORS

### What Became Simpler

The current backend does not use a dedicated service layer.

Controllers communicate directly with Spring Data repositories because most active backend operations are bounded CRUD operations.

This avoids service wrappers that would add files without gaining meaningful ownership.

### UI Complexity

Much of the product workflow remains in the frontend, so backend endpoints remain relatively narrow.

### Mobile Complexity

Mobile device testing required:

- configurable API base URL
- LAN-accessible backend binding
- Capacitor origins in CORS configuration

### Ownership and Orchestration Complexity

The backend owns bounded persistence mutations. The frontend owns user-visible workflows that combine several endpoints.

This is a deliberate division, not merely missing backend abstraction.

---

## 14. Database and Schema Management

### What the Original Design Predicted Correctly

The original ERD established useful persistence concepts, foreign keys, deletion behavior, uniqueness constraints, and indexes.

It correctly identified durable relationships such as:

- task-to-project
- task-to-tags
- task-to-recurrence
- task-to-child resources
- status references

### What Became More Complex

Production schema evolution requires controlled changes after data already exists.

For example, adding task end times required a migration that preserved existing tasks.

Evidence:

- [databasemodel.sql](/Users/mipoo/task-manager-fullstack/SQL%20Files/databasemodel.sql)
- [2026-05-20-add-task-end-date-time-scheduled.sql](/Users/mipoo/task-manager-fullstack/src/main/resources/schema-updates/2026-05-20-add-task-end-date-time-scheduled.sql)
- [application.properties](/Users/mipoo/task-manager-fullstack/src/main/resources/application.properties)

### What Became Simpler

Several academically modeled entities remain inactive:

- `Account`
- `Context`
- `CustomField`
- `Device`
- `Notification`
- `Schedule`
- `TaskDependency`
- `TaskInstance`
- `UserPreferences`
- `UserSettings`

The active system does not need their full complexity.

### UI Complexity

The hardest current behaviors, including focus ownership, autosave, mobile editing, and reminder toasts, have no direct database representation.

### Mobile Complexity

The database remains largely unaffected by mobile behavior, demonstrating that mobile architecture exists in a different system view.

### Ownership and Orchestration Complexity

Schema ownership is manual through `ddl-auto=none` and explicit SQL updates. This favors predictable persistence behavior over automatic convenience.

---

## 15. Testing

### What the Original Design Predicted Correctly

Database-class testing naturally emphasizes:

- constraints
- relationships
- repository behavior
- CRUD correctness

These remain useful and are represented in backend controller and repository tests.

### What Became More Complex

The production application needs tests for behavior that an ERD cannot express:

- recurring replacement workflows
- bulk recurrence semantics
- autosave
- focus transitions
- stale blur events
- mobile edit placement
- scroll ownership
- `visualViewport` drift
- swipe exclusions
- dropdown interactions
- task reconciliation after catalog mutations

Evidence:

- [App.test.tsx](/Users/mipoo/task-manager-fullstack/taskmanager-frontend/src/App.test.tsx)
- [TaskControllerTest.java](/Users/mipoo/task-manager-fullstack/src/test/java/com/example/taskmanager/TaskControllerTest.java)
- [ReminderControllerTest.java](/Users/mipoo/task-manager-fullstack/src/test/java/com/example/taskmanager/ReminderControllerTest.java)

### What Became Simpler

Pure utility functions provide small, deterministic testing boundaries for scheduling, filtering, recurrence, statistics, and formatting.

### UI Complexity

Many critical tests protect interaction contracts and DOM structure rather than only rendered text.

### Mobile Complexity

Mobile tests encode architectural invariants that could otherwise appear to be harmless implementation details.

### Ownership and Orchestration Complexity

Tests now document ownership boundaries. For example, they verify that recurring bulk completion still uses recurring-task orchestration rather than direct status mutation.

---

# Complexity Source Summary

| Subsystem | Original Model Accuracy | Became More Complex | Became Simpler | Primary New Complexity Source |
|---|---|---|---|---|
| Tasks | High | Cross-domain mutations and multiple presentations | Single-user ownership | UI and orchestration |
| Scheduling | High | Validation, formatting, ranges, rescheduling | Direct task datetime fields | UI and utilities |
| Recurrence | High conceptually | Completion lifecycle and replacement workflow | No task-instance history | Product semantics and orchestration |
| Dependencies | Structurally correct | Propagation and graph semantics | Not implemented | Product semantics |
| Bulk operations | Partially predicted | Recurrence-aware mutation behavior | Small selection hook | Orchestration |
| Reminders | High conceptually | Polling, snoozing, transient delivery | No notification service | Lifecycle ownership |
| Projects/tags | High | Reconciliation across tasks, drafts, filters | Contexts omitted | UI and orchestration |
| Child resources | High | Per-task loading and draft ownership | Bounded CRUD | Hook ownership |
| Users/accounts/devices | Forward-looking | Would require security and synchronization | Inactive | Infrastructure |
| Search/calendar/stats | Moderate | Multiple synchronized derived views | Client-side derivation | UI state |
| Editing/autosave | Barely represented | Delayed saves and shared drafts | One authoritative draft | Ownership and lifecycle |
| Mobile/iOS | Not represented | Focus, viewport, scroll, swipe invariants | Avoided native rewrite | Platform behavior |
| Backend | High structural fit | Validation and relationships | No service layer | Resource ownership |
| Database evolution | High starting value | Migrations and compatibility | Inactive tables | Operational ownership |
| Testing | Low behavioral prediction | Interaction and invariant coverage | Pure utility tests | Production behavior |

---

# Academic Design vs. Production Application Development

## Academic System Design

Academic database design usually begins with:

1. Identifying entities.
2. Identifying relationships.
3. Normalizing data.
4. Defining keys and constraints.
5. Modeling future capabilities.
6. Demonstrating query correctness.

This approach is valuable because it establishes durable nouns and prevents obvious persistence mistakes.

The original Task Manager design succeeded at this. It provided a vocabulary that still shapes the application.

However, academic design often treats an entity’s existence as evidence that the corresponding feature is designed. In production, a table is only the storage portion of a feature.

For example:

- `TaskDependency` stores graph edges but does not define propagation behavior.
- `Reminder` stores a due time but does not deliver notifications.
- `TaskInstance` stores occurrences but does not define recurring-series editing.
- `Device` stores device information but does not implement secure device registration.
- `UserPreferences` stores settings but does not define synchronization and conflict behavior.

## Production Application Development

Production development begins with concrete user workflows and failure conditions:

- What happens when the user closes an editor before autosave fires?
- What happens when a recurring task is bulk-completed?
- What happens when a deleted tag is still selected in an edit draft?
- What happens when iOS shifts the visual viewport while document scroll remains zero?
- Which owner coordinates a mutation spanning several API resources?
- What state is persisted, derived, transient, or presentation-local?
- What happens when one request in a multi-request workflow fails?

These questions determine architecture as strongly as the database does.

## The Practical Difference

| Academic Perspective | Production Perspective |
|---|---|
| Models entities and relationships | Models ownership, lifecycle, and failure behavior |
| Optimizes normalization | Balances normalization with workflow simplicity |
| Treats UI as a consumer of data | Treats UI behavior as a major architectural system |
| Designs for conceptual completeness | Implements only behavior justified by real workflows |
| Assumes clean operation boundaries | Handles mutations that cross several domains |
| Focuses on valid stored state | Also handles drafts, delayed state, transient state, and stale state |
| Treats mobile as another client | Treats mobile browser behavior as a platform constraint |
| Validates schemas and queries | Validates interaction sequences and architectural invariants |
| Often predicts future entities | Must pay the implementation cost of every active concept |

---

# Main Lessons

## 1. The Original ERD Was Useful, but It Was Not the Architecture

It correctly established the durable domain vocabulary. It did not capture frontend ownership, mobile platform behavior, mutation orchestration, or state lifecycle.

## 2. Product Semantics Must Precede Advanced Schema Design

Recurrence and dependencies demonstrate this most clearly. Before designing storage, the product must define what completion, propagation, history, deletion, and editing mean.

## 3. UI State Is Real Architectural State

Drafts, dropdowns, selected tasks, modal state, focus ownership, swipe eligibility, and toasts are not incidental. They determine whether workflows remain coherent.

## 4. Mobile Behavior Can Determine DOM and Ownership Boundaries

The mobile edit row, scroll ownership, and focus guard exist because apparently equivalent structures behave differently in WKWebView.

## 5. Simpler Persistence Can Be Better for the Active Product

Direct task scheduling fields, recurrence replacement, client-side derived views, and local preferences are simpler than the original generalized models and currently fit the implemented workflows.

## 6. Centralization Is Sometimes the Correct Design
`App.tsx` remains large because it owns workflows that cross tasks, drafts, recurrence, tags, selection, autosave, focus, and mobile behavior.

Splitting those workflows solely to reduce file size would make the system harder to understand.

## 7. Production Architecture Is Defined by Ownership

The most important question is often not:

> Which entity does this behavior concern?

It is:

> Which owner has enough context to execute this behavior correctly from beginning to end?

No files were modified.

# Additional Study Recommendations

## Reverse-Engineering Order

1. Read architecture.md.
2. Read ownership-map.md.
3. Read the ADR review.
4. Trace task creation end-to-end.
5. Trace task editing and autosave.
6. Trace recurring completion.
7. Trace reminders.
8. Study the mobile focus system last.

## Questions to Ask While Reading Code

- Who owns this state?
- Who owns this mutation?
- Is this persisted, derived, transient, or presentation-local state?
- What would break if this owner changed?
- Is this complexity domain complexity or platform complexity?

## Architectural Patterns Demonstrated

### Orchestration Layer
A central owner coordinates workflows spanning multiple domains.

### Bounded Hooks
Hooks own coherent state domains without taking ownership of unrelated workflows.

### Pure Domain Utilities
Scheduling, recurrence, filtering, and statistics logic remain deterministic and testable.

### Presentation Ownership
Components own presentation state while delegating domain mutations upward.

### Protected Invariants
Certain mobile and focus behaviors are architectural constraints, not implementation details.

## Recommended Future Study

- Build sequence diagrams for task creation, editing, reminders, and recurrence.
- Create dependency graphs for major hooks and components.
- Trace one backend endpoint from React callback to database persistence.
- Review test coverage as architecture documentation.
