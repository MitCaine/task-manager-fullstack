# Architecture-Changing Feature Review

# Future Architecture Pressure Points

## Purpose

This document identifies features that would significantly stress or invalidate assumptions in the current architecture.

It is intended for project planning and architectural analysis.

The goal is not to determine whether a feature should be implemented.

The goal is to understand:

- which assumptions currently exist
- which ownership boundaries would be affected
- which ADRs would be stressed
- which architectural costs accompany a feature

Before implementing a major capability, review this document to understand the likely impact on existing architecture.

## Current Architectural Baseline

The current system assumes:

- One frontend-owned, fully loaded task collection
- Mostly single-user operation
- Client-side filtering, statistics, calendar derivation, and bulk actions
- Cross-domain task workflows orchestrated by `App.tsx`
- Resource-oriented REST endpoints
- Direct controller/repository backend structure
- No server-initiated frontend updates
- No durable client-side offline store
- Recurring tasks represented by replacing completed occurrences
- Reminders delivered through frontend polling
- Manual database schema management

## Risk Scale

| Level | Meaning |
| --- | --- |
| Medium | Existing ownership remains recognizable, but several boundaries must expand. |
| High | Multiple owners, API contracts, and persistence models are affected. |
| Critical | A foundational assumption of the current architecture changes. |

---

# 1. Authentication and Authorization

## Feature

User registration, login, logout, session management, password recovery, and authenticated API access.

## Affected Owners

- `App.tsx`: initial hydration, application-loading state, local preferences, and error behavior become session-aware.
- Frontend API boundary: every protected request must carry authentication context.
- Backend controllers: access can no longer be based only on record IDs supplied by clients.
- `CorsConfig`: authentication and credential policy become part of request handling.

## Affected Hooks

- All hooks that load or mutate persisted resources:
  - `useTaskDetailResources`
  - `useProjectTagCatalog`
- `useTaskListViewModel` remains primarily derived, but its input task collection becomes authenticated-user scoped.

## Affected Utilities

Existing task utilities are mostly unaffected.

Authentication-specific token, session-expiry, and access-state behavior would create new cross-cutting concerns outside the current utility model.

## Affected Backend Components

- Every controller
- Every repository query
- `GlobalExceptionHandler`
- `CorsConfig`
- New user/account/security ownership
- Parent-resource validation must also validate ownership

Current raw `userID` request values cannot provide authorization.

## Database Implications

The original schema already contains `User`, `Account`, `UserSettings`, and `UserPreferences`, but these are not active backend entities.

Authentication would require persisted credentials or external identity references, ownership constraints, account lifecycle, and user-scoped indexes.

## Existing ADRs Stressed

- **ADR-01:** `App.tsx` as orchestration layer
- **ADR-04:** Task-detail resource ownership
- **ADR-05:** Project/tag catalog ownership
- **ADR-15:** Direct controller/repository backend

## Risk Level

**Critical**

Authentication changes the trust boundary of every persisted operation.

---

# 2. Full Multi-User Data Isolation

## Feature

Allow multiple users to maintain independent tasks, projects, tags, reminders, notes, and attachments.

## Affected Owners

- Primary task collection ownership becomes user-scoped.
- Catalogs and detail-resource caches must be scoped to the active user.
- Application hydration must react to user changes.
- Selection, drafts, and autosave must not survive an ownership-context switch incorrectly.

## Affected Hooks

- `useTaskDetailResources`: task-keyed caches require user-context isolation.
- `useProjectTagCatalog`: catalog records and drafts become user-scoped.
- `useTaskListViewModel`: derives only the active user's visible tasks.
- `useBulkSelection`: selected IDs must be cleared when user context changes.

## Affected Utilities

Most pure utilities remain valid.

Filtering and display helpers would receive already-authorized, user-scoped records rather than a global collection.

## Affected Backend Components

- All controllers and repositories
- `ParentTaskGuard`
- Task/tag association endpoints
- Project and tag deletion behavior
- Reminder, note, subtask, and attachment access checks
`GET /tasks?userID=...` is insufficient because the caller currently chooses the ID.

## Database Implications

- Activate `User` ownership relationships.
- Ensure every user-owned resource has enforceable ownership.
- Add ownership indexes and constraints.
- Define cascading deletion and account deletion behavior.

## Existing ADRs Stressed

- **ADR-01:** Central task orchestration
- **ADR-04:** Task-detail resource hook
- **ADR-05:** Catalog ownership
- **ADR-08:** Reminder ownership split
- **ADR-15:** Direct backend structure

## Risk Level

**Critical**

The current architecture assumes resource IDs are globally usable and trusted.

---

# 3. Shared Projects and Collaborative Tasks

## Feature

Allow multiple users to share projects, assign tasks, collaborate, and have different permissions.

## Affected Owners

- Tasks and catalogs can no longer be treated as belonging to one local workspace.
- Project membership, task assignment, and permissions become new shared domains.
- Task mutation orchestration must account for collaborators and permission failures.
- Catalog deletion becomes a collaborative lifecycle decision rather than simple local reconciliation.

## Affected Hooks

- `useProjectTagCatalog`: a project becomes more than a simple catalog record.
- `useTaskDetailResources`: notes and attachments may include author or permission information.
- `useTaskListViewModel`: filtering may include assigned-to-me, shared, or workspace views.
- `useBulkSelection`: bulk actions require permission-aware eligibility.

## Affected Utilities

- Filtering and display helpers
- Statistics derivation
- Task-copy behavior if copies inherit collaboration metadata

## Affected Backend Components

- `ProjectController`
- `TaskController`
- Every task-associated resource controller
- New membership, invitation, role, and permission owners
- Backend authorization becomes domain-specific

## Database Implications

The current single `Project.userID` ownership model would be insufficient.

Shared projects require membership or access-control relationships. Tasks may require creator, assignee, and project-level ownership distinctions.

## Existing ADRs Stressed

- **ADR-01:** `App.tsx` orchestration
- **ADR-05:** Catalog ownership separated from task reconciliation
- **ADR-06:** Derived task view model
- **ADR-07:** Bulk selection versus mutation ownership
- **ADR-15:** Direct controller/repository backend

## Risk Level

**Critical**

A project would change from a catalog item into an authorization and collaboration boundary.

---

# 4. Task Dependencies and Automatic Schedule Propagation

## Feature

Allow predecessor/successor relationships, prevent invalid completion, and automatically move dependent task schedules.

## Affected Owners

- Completion is no longer a task-local operation.
- Scheduling changes may mutate several tasks.
- Bulk completion and bulk rescheduling must understand dependency graphs.
- Task deletion must handle dependency relationships.
- Calendar and list views must update after propagated changes.

## Affected Hooks

- `useTaskListViewModel`: may derive blocked or dependency-affected states.
- `useBulkSelection`: selection remains bounded, but bulk mutations become graph-aware.
- A dependency resource owner would interact strongly with selected-task and task mutation ownership.

## Affected Utilities

- Scheduling utilities
- Time-shift utilities
- Task predicates and display helpers
- New graph traversal, cycle detection, and propagation calculations

## Affected Backend Components

- `TaskController`
- `TaskRepository`
- New dependency entity/controller/repository ownership
- Backend transaction ownership
- Completion and schedule mutation rules

Dependency propagation would exceed the current bounded controller mutation model.

## Database Implications

The original `TaskDependency` table exists in the schema but has no active entity or behavior.

The database would need:

- Dependency pairs
- Dependency types
- Cycle prevention strategy
- Referential deletion behavior
- Transactional schedule updates

## Existing ADRs Stressed

- **ADR-01:** Cross-domain frontend orchestration
- **ADR-07:** Bulk selection with centralized mutations
- **ADR-12:** Shared scheduling utilities
- **ADR-13:** Recurring completion workflow
- **ADR-15:** Direct controller/repository backend

## Risk Level

**Critical**

Dependencies turn isolated task mutations into graph-wide transactional workflows.

---

# 5. Push Notifications and Multi-Device Reminder Delivery

## Feature

Deliver reminders while the application is closed through native push, local notifications, email, or registered devices.

## Affected Owners

- Reminder delivery can no longer belong only to the running frontend.
- `App.tsx` polling and transient toasts become one delivery channel rather than the delivery authority.
- Device registration, notification permission, delivery status, and retry behavior need explicit owners.

## Affected Hooks

- `useTaskDetailResources`: persisted reminder records may gain delivery configuration.
- Reminder ownership split would expand beyond the existing hook, `App.tsx`, and `ToastList`.

## Affected Utilities

- Date/time handling
- Time-zone conversion
- Delivery scheduling and display formatting

## Affected Backend Components

- `ReminderController`
- New notification delivery services
- New device-registration endpoints
- Background scheduling
- Retry and delivery-result handling
- Authentication and ownership checks

## Database Implications

The original schema includes `Device`, `Notification`, `UserPreferences`, and notification-related fields, but these are inactive.

Durable delivery would require device tokens, delivery channels, delivery status, attempts, and user notification preferences.

## Existing ADRs Stressed

- **ADR-08:** Split reminder persistence and delivery
- **ADR-15:** Direct controller/repository backend
- **ADR-01:** `App.tsx` orchestration, because it would no longer be the primary delivery owner

## Risk Level

**Critical**

Reminder delivery moves from frontend lifecycle behavior to a durable distributed subsystem.

---

# 6. Offline Mode and Durable Client-Side Persistence

## Feature

Allow task viewing and mutation without a network connection, then synchronize changes later.

## Affected Owners

- The frontend task collection can no longer be treated simply as the latest server response.
- Every mutation needs pending, successful, failed, and conflict states.
- Autosave must write locally before or independently from server confirmation.
- Detail resources and catalogs need durable caches.
- Error handling changes from immediate failure to deferred synchronization.

## Affected Hooks

- `useTaskDetailResources`: resource maps require persistent offline storage and queued mutations.
- `useProjectTagCatalog`: catalog changes require offline identifiers and queued reconciliation.
- `useBulkSelection`: bulk mutations may create many queued operations.
- `useTaskListViewModel`: may expose pending or conflicted tasks.

## Affected Utilities

- Temporary ID handling
- Merge/conflict calculations
- Mutation serialization
- Local persistence transformations

## Affected Backend Components

Existing endpoints remain relevant, but synchronization requires:

- Idempotency
- Version or timestamp comparison
- Conflict reporting
- Batch synchronization
- Possibly deleted-record tombstones

## Database Implications

- Record versions or update timestamps
- Stable synchronization identities
- Tombstones or deletion history
- Idempotency keys
- Client-side persistent database

## Existing ADRs Stressed

- **ADR-01:** `App.tsx` as task authority
- **ADR-03:** Autosave ownership
- **ADR-04:** Detail-resource hook ownership
- **ADR-05:** Catalog ownership
- **ADR-13:** Recurring replacement workflow
- **ADR-15:** Direct backend request path

## Risk Level

**Critical**

Offline mode changes the system from request/response state management into synchronization state management.

---

# 7. Real-Time Multi-Client Synchronization

## Feature

Immediately reflect task and project changes made from another browser, device, or collaborator.

## Affected Owners

- `App.tsx` can no longer assume all task updates originate locally.
- Shared edit drafts and autosave must handle incoming changes.
- Selected-task state may become stale while open.
- Detail-resource and catalog hooks need external update ingestion.
- Toasts or conflict indicators may represent remote activity.

## Affected Hooks

- `useTaskDetailResources`
- `useProjectTagCatalog`
- `useTaskListViewModel`
- `useBulkSelection`, because selected tasks may be deleted or changed remotely

## Affected Utilities

- Merge and version comparison
- Conflict detection
- Task-list reconciliation
- Remote event normalization

## Affected Backend Components

- Server-sent events, WebSockets, or another event channel
- Event publication after mutations
- Authentication and subscription authorization
- Record versioning
- Possibly transactional event delivery

## Database Implications

- Update versions or timestamps
- Change-event or outbox records
- Stable event ordering
- Conflict and deletion semantics

## Existing ADRs Stressed

- **ADR-01:** Central task orchestration
- **ADR-02:** Shared edit draft
- **ADR-03:** Autosave
- **ADR-04:** Detail-resource ownership
- **ADR-05:** Catalog ownership
- **ADR-15:** Direct controller/repository backend

## Risk Level

**Critical**

The frontend currently assumes local actions and explicit requests are the only sources of state changes.

---

# 8. Persistent Recurring Task History and Series Editing

## Feature

Retain completed occurrences, display recurrence history, edit an entire series, edit one occurrence, and manage future occurrences.

## Affected Owners

- Recurring completion can no longer delete and replace the current task.
- Task selection must distinguish a series from an occurrence.
- Create and edit drafts need series-edit semantics.
- Calendar and statistics must decide whether they operate on tasks, occurrences, or both.
- Bulk actions need series-aware behavior.

## Affected Hooks

- `useTaskListViewModel`: list, calendar, counts, and statistics require occurrence-aware derivation.
- `useBulkSelection`: selected identities may represent occurrences or series.
- `useTaskDetailResources`: resources may belong to the series, occurrence, or both.

## Affected Utilities

- `taskRecurrence.ts`
- `taskEditDraft.ts`
- `taskFiltering.ts`
- `taskStatistics.ts`
- Scheduling and display utilities

## Affected Backend Components

- `TaskController`
- `RecurrenceRuleRepository`
- New occurrence/series APIs and ownership
- Completion behavior
- Series-edit transactions

## Database Implications

The original `TaskInstance` table would become relevant.

The system would need clear relationships among:

- Series definition
- Recurrence rule
- Generated occurrence
- Completion history
- Occurrence exceptions
- Future occurrence regeneration

## Existing ADRs Stressed

- **ADR-02:** Shared edit draft
- **ADR-04:** Task-detail resource ownership
- **ADR-06:** Derived task views
- **ADR-07:** Bulk mutation ownership
- **ADR-12:** Shared scheduling utilities
- **ADR-13:** Recurring replacement workflow
- **ADR-15:** Direct backend structure

## Risk Level

**Critical**

This directly replaces the current recurrence identity and lifecycle model.

---

# 9. Audit Logs and Reversible Change History

## Feature

Record who changed tasks, what changed, when it changed, and potentially allow restoring previous values.

## Affected Owners

- Every mutation becomes both a state change and an audit event.
- Frontend workflows may display history or offer undo.
- Autosave may generate excessive or noisy history unless changes are grouped.
- Bulk and recurring workflows need meaningful audit grouping.

## Affected Hooks

- `useTaskDetailResources`: task history may become another task-associated resource.
- `useProjectTagCatalog`: catalog changes require audit representation.
- Existing hooks remain owners of current state but no longer represent complete historical state.

## Affected Utilities

- Diff generation
- Change formatting
- History grouping
- Restore payload construction

## Affected Backend Components

- Every mutating controller
- New audit service or persistence owner
- User identity integration
- Transaction coordination between mutation and audit record
- Restore operations and authorization

## Database Implications

- Audit-event table
- Actor identity
- Entity type and ID
- Before/after values or structured changes
- Correlation IDs for multi-step workflows
- Retention policy

## Existing ADRs Stressed

- **ADR-03:** Autosave ownership
- **ADR-08:** Reminder ownership
- **ADR-13:** Recurring replacement workflow
- **ADR-15:** Direct controller/repository backend

## Risk Level

**High**

Audit history cross-cuts every mutation and makes transaction ownership more important.

---

# 10. Server-Side Search, Filtering, Pagination, and Large Datasets

## Feature

Support task collections too large to load entirely into the frontend.

## Affected Owners

- `App.tsx` can no longer own a complete task collection.
- `useTaskListViewModel` can no longer derive all list, calendar, statistics, and count data from local tasks.
- Bulk selection may need “select all matching” semantics beyond loaded IDs.
- Calendar views may require date-range queries.
- Statistics may require server aggregation.
- `focusTaskById` cannot assume the target task is already loaded.

## Affected Hooks

- `useTaskListViewModel`: its current pure derivation contract would be fundamentally stressed.
- `useBulkSelection`: selected IDs may span unloaded pages.
- `useTaskDetailResources`: detail loading remains compatible but task navigation changes.
- `useProjectTagCatalog`: mostly unaffected unless catalogs also become paginated.

## Affected Utilities

- `taskFiltering.ts`
- `taskStatistics.ts`
- `taskEmptyState.ts`
- Calendar date-range helpers
- Client-side sorting assumptions

## Affected Backend Components

- `TaskController`
- `TaskRepository`
- New query specification or search ownership
- Pagination responses
- Server-side statistics and count endpoints
- Indexed filtering and sorting

## Database Implications

- Search and filter indexes
- Pagination-compatible ordering
- Date-range indexes
- Project, tag, status, priority, and user indexes
- Potential text-search support

## Existing ADRs Stressed

- **ADR-01:** `App.tsx` as primary task collection owner
- **ADR-06:** `useTaskListViewModel`
- **ADR-07:** Bulk selection
- **ADR-14:** Calendar presentation ownership
- **ADR-15:** Direct backend structure

## Risk Level

**High**

This changes the current assumption that all user-visible views derive from one fully loaded task collection.

---

# Impact Ranking

| Rank | Feature | Risk | Foundational assumption changed |
| ---: | --- | --- | --- |
| 1 | Offline mode | Critical | Server response is the authoritative current state |
| 2 | Real-time synchronization | Critical | State changes originate from local actions and explicit requests |
| 3 | Authentication and authorization | Critical | Requests and record IDs are trusted |
| 4 | Shared projects and collaboration | Critical | Projects are simple user-owned catalog records |
| 5 | Persistent recurrence history | Critical | Recurring completion replaces the current task |
| 6 | Task dependencies | Critical | Task mutations are mostly isolated |
| 7 | Multi-user data isolation | Critical | Collections and caches need no active-user scope |
| 8 | Push notifications | Critical | Reminder delivery belongs to the running frontend |
| 9 | Audit logs | High | Mutations only need to produce current state |
| 10 | Server-side pagination/search | High | The frontend owns the complete task collection |

## ADRs Under the Most Pressure

| ADR | Most affected by |
| --- | --- |
| **ADR-01: `App.tsx` as orchestration layer** | Nearly every listed feature, especially offline mode, real-time sync, dependencies, and collaboration |
| **ADR-03: Autosave ownership** | Offline mode, real-time sync, audit logs, collaborative editing |
| **ADR-04: Task-detail resource hook** | Multi-user isolation, collaboration, offline mode, real-time sync, recurrence history |
| **ADR-05: Catalog ownership** | Shared projects, multi-user support, offline mode, real-time sync |
| **ADR-06: Task-list view model** | Server-side pagination, recurrence history, shared projects |
| **ADR-07: Bulk selection split** | Dependencies, collaboration permissions, pagination, offline mode |
| **ADR-08: Reminder ownership split** | Push notifications and multi-device delivery |
| **ADR-13: Recurring replacement workflow** | Recurrence history, offline mode, audit logs, dependencies |
| **ADR-15: Direct controller/repository backend** | Authentication, collaboration, dependencies, notifications, audit logs, and synchronization |

The mobile-specific ADRs remain comparatively stable. Most listed features would stress data ownership, synchronization, authorization, and backend transaction boundaries rather than the established mobile focus and scroll architecture.

# Features Least Likely To Require Architectural Change

Examples:

- Additional task fields
- New task statuses
- Additional reminder types
- Additional recurrence intervals
- New statistics views
- Additional filtering options
- UI themes
- Accessibility improvements
- New dashboard views

These features primarily extend existing ownership boundaries rather than redefining them.