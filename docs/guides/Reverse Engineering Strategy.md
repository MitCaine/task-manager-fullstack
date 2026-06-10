# Reverse Engineering Strategy

## Purpose

The dependency heat map identifies which files have the highest architectural information density.

A developer attempting to understand the Task Manager codebase should not begin by reading every file. Instead, begin with the ownership and architecture documentation, then follow the highest-impact files identified by the dependency analysis.

The goal is to understand:

- ownership boundaries
- mutation flow
- dependency direction
- orchestration responsibilities
- architectural constraints

before diving into implementation details.

## Recommended Documentation Reading Order

### 1. architecture.md

Provides the high-level system structure.

Questions answered:

- How is the application organized?
- Why does App.tsx remain the orchestration owner?
- How do frontend, backend, database, hooks, and utilities interact?

### 2. ownership-map.md

Defines responsibility boundaries.

Questions answered:

- Who owns task state?
- Who owns reminders?
- Who owns recurrence?
- Who owns projects and tags?
- What responsibilities remain intentionally centralized?

### 3. dependency-heat-map.md

Explains dependency relationships.

Questions answered:

- Which files are most influential?
- Which changes have the largest impact?
- Which files act as hubs?
- Which files are intentionally low-coupling leaves?

### 4. system-navigation-guide.md

Provides feature-level navigation.

Questions answered:

- Where does a feature start?
- Which files participate?
- Which APIs and entities are involved?
- Which tests protect the feature?

### 5. mobile-focus-system.md

Documents the most specialized subsystem in the application.

Questions answered:

- Why does mobile editing use a dedicated architecture?
- Why are visualViewport guards required?
- Which invariants must remain true?
- What implementation details should not be casually refactored?

## Highest Information-Density Files

After reviewing the documentation, inspect the following files in order.

These files provide the greatest architectural insight relative to their size and responsibility.

### Frontend

#### 1. App.tsx

Primary orchestration owner.

Study:

- task creation
- task editing
- task completion
- recurring task handling
- autosave
- mobile editing
- reminder delivery
- cross-domain workflows

Understanding App.tsx explains how the application behaves.

#### 2. types/task.ts

Shared frontend domain contracts.

Study:

- task model
- reminder model
- recurrence model
- project and tag structures

Understanding these contracts clarifies data flow throughout the frontend.

#### 3. dateTime.ts

Shared date and time behavior.

Study:

- formatting
- parsing
- local time handling
- display logic

Date and time behavior affects scheduling, reminders, recurrence, calendar views, and statistics.

#### 4. useTaskListViewModel.ts

Derived-view aggregation boundary.

Study:

- filtering
- statistics
- empty states
- calendar data
- task grouping

This file demonstrates how derived data should remain separate from authoritative state.

#### 5. useTaskDetailResources.ts

Task-detail resource owner.

Study:

- subtasks
- notes
- reminders
- attachments

This file demonstrates a successful bounded-hook architecture.

#### 6. useProjectTagCatalog.ts

Catalog ownership boundary.

Study:

- project loading
- tag loading
- catalog CRUD
- catalog draft management

This file demonstrates ownership of a shared resource catalog.

### Backend

#### 7. TaskController.java

Primary backend task behavior.

Study:

- CRUD operations
- status changes
- recurrence assignment
- tag assignment

This file reveals how frontend workflows map to backend resources.

#### 8. TaskRepository.java

Primary persistence boundary.

Study:

- task queries
- ordering behavior
- task persistence responsibilities

This file demonstrates how task persistence is centralized.

#### 9. ParentTaskGuard.java

Shared validation boundary.

Study:

- parent-task existence checks
- shared controller validation

This file is a good example of extracting a reusable business rule without introducing a full service layer.

## Suggested Feature Walkthrough Order

Developers learning the system should trace complete workflows rather than reading files in isolation.

Recommended order:

### Beginner

- Create task
- Edit task
- Delete task
- Project assignment
- Tag assignment

These features demonstrate the primary task lifecycle.

### Intermediate

- Filtering and sorting
- Statistics
- Calendar navigation
- Reminder creation
- Reminder snoozing

These features demonstrate derived state and resource ownership.

### Advanced

- Recurring task creation
- Recurring task completion
- Bulk recurring completion
- Autosave lifecycle
- Mobile editing

These features demonstrate cross-domain orchestration and architectural constraints.

## Architectural Reading Strategy

When examining a feature, follow this sequence:

```text
User Action
    ↓
Presentation Component
    ↓
App.tsx Handler or Owning Hook
    ↓
Utility Functions
    ↓
API Layer
    ↓
Backend Controller
    ↓
Repository
    ↓
Entity
    ↓
Tests
```

Avoid reading files in arbitrary order.

Following ownership boundaries and dependency direction provides a much clearer understanding of the system than reading components alphabetically.

## Key Insight

The dependency graph shows that Task Manager is intentionally asymmetric.

The architecture contains:

- one major frontend orchestration hub (App.tsx)
- several bounded domain hubs (useTaskDetailResources, useProjectTagCatalog, useTaskListViewModel)
- shared utility hubs (dateTime.ts, taskForm.ts, taskUtils.ts)
- mostly low-coupling presentation leaves
- direct backend controller and repository ownership

This asymmetry is intentional.

The goal of understanding the codebase is not to eliminate hubs. The goal is to understand why each hub exists, what it owns, and which responsibilities depend on it.
