# ADR-001: Keep `App.tsx` as the Frontend Orchestration Owner

## Status

Accepted

## Context

The frontend exposes user workflows that cross several otherwise bounded
domains. Creating or editing a task may involve the primary task record,
schedule validation, recurrence, tags, local task state, draft reset, selected
task state, and toasts. Recurring completion also coordinates creation,
deletion, recurrence, tags, selection, scrolling, and highlighting.

The extracted hooks own coherent concepts:

- `useTaskListViewModel` owns derived task views.
- `useBulkSelection` owns bulk-mode selection state.
- `useProjectTagCatalog` owns project and tag catalogs.
- `useTaskDetailResources` owns task-associated resources.

None of these hooks owns the primary task collection or has enough context to
coordinate cross-domain task workflows. Presentation components similarly
emit intent upward rather than mutating primary application state.

## Decision

`taskmanager-frontend/src/App.tsx` remains the frontend composition root and
orchestration owner.

It owns the primary task collection, task-level and cross-domain mutations,
selected-task lifecycle, shared edit drafts, autosave, global focus and
dropdown coordination, reminder delivery behavior, and mobile application
behavior.

Responsibilities are extracted only when state and behavior move together
behind a coherent boundary. File size alone is not a reason to move
orchestration out of `App.tsx`.

## Alternatives Considered

### Move Each Workflow Into a Feature Hook

This would reduce the size of `App.tsx`, but the hooks would need broad access
to unrelated state, setters, refs, lifecycle signals, and mutation callbacks.
The cross-domain workflow would become harder to trace without gaining a clear
new owner.

### Let Presentation Components Mutate Tasks

This would place mutation behavior near user controls, but task mutations
would become distributed among list, calendar, detail, and edit
presentations. Primary task ownership and mutation ordering would become
ambiguous.

### Introduce a Global State Store

A global store could change how state is accessed, but it would not determine
who owns mutation ordering, autosave, focus, mobile placement, or recurrence
semantics.

## Consequences

### Benefits

- Cross-domain workflows have one visible owner.
- Mutation ordering remains traceable.
- Components and bounded hooks retain narrow responsibilities.
- Selected-task, autosave, focus, mobile, and task mutation behavior can be
  coordinated without callback-heavy intermediate abstractions.

### Costs

- `App.tsx` remains large.
- Changes to orchestration require understanding several related domains.
- The file has a high architectural impact and requires broad regression
  testing.

## What Would Break If Changed

Moving orchestration piecemeal could:

- create multiple authorities for the primary task collection;
- separate recurring completion from task replacement and selection behavior;
- separate catalog mutations from task and draft reconciliation;
- allow calendar or presentation components to mutate tasks independently;
- fragment selected-task, autosave, focus, and mobile lifecycle ownership;
- hide multi-request mutation ordering behind indirect callback chains.

Affected behavior is primarily protected by
`taskmanager-frontend/src/App.test.tsx`.

## Related Docs

- [Architecture](../architecture.md)
- [Ownership Map](../ownership-map.md)
- [Lessons Learned](../guides/Lessons%20Learned.md)
- [Future Architecture Pressure Points](../reviews/Future%20Architecture%20Pressure%20Points.md)
- [Architectural Assumptions and Refactoring](../reviews/Architectural%20Assumptions%20and%20Refactoring.md)
