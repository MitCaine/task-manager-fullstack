# ADR-007: Model Recurring Completion as Task Replacement

## Status

Accepted

## Context

The active product supports daily, weekly, and monthly recurrence. A task
references a recurrence rule, but the original database concept of persistent
task instances is not active.

The product still needs clear behavior when a recurring task is completed.
Simply marking the current task complete would stop recurrence. Retaining a
complete occurrence while creating a future task would introduce occurrence
history and series semantics that the current application does not support.

## Decision

Completing an active recurring task is a replacement workflow:

1. Load the recurrence rule.
2. Calculate the next schedule and preserve duration.
3. Create the next task occurrence.
4. Copy task metadata and tags.
5. Attach recurrence to the new task.
6. Delete the completed occurrence.
7. Replace the task in local state.
8. Scroll to and highlight the next occurrence when appropriate.

The next-occurrence calculation remains in the pure recurrence utility.
`App.tsx` owns the replacement workflow because it coordinates several APIs,
primary task state, selection, bulk completion semantics, and rendered-list
behavior.

## Alternatives Considered

### Mark the Current Recurring Task Complete

This would treat recurring and non-recurring completion uniformly, but it
would not generate the next active occurrence.

### Mutate the Current Task to the Next Date

This would avoid create/delete operations, but completion would no longer have
a clear replacement lifecycle and the current workflow's identity assumptions
would change.

### Persist Every Occurrence and Recurrence Series

This would support history, exceptions, and series editing, but it requires a
different data model and product semantics. The current application does not
activate the original `TaskInstance` model.

### Move Recurring Completion Into `useBulkSelection`

Bulk selection owns selected IDs, not task mutation orchestration. It does not
have enough context to perform the replacement workflow.

## Consequences

### Benefits

- The active task collection always contains the next actionable occurrence.
- Existing metadata, tags, project, priority, description, and duration are
  preserved.
- Recurrence behavior remains consistent for individual and bulk completion.
- The application avoids premature recurrence-series and history complexity.

### Costs

- Completion requires a multi-request create, associate, delete, and local
  replacement workflow.
- Completed recurring occurrences are not retained as history.
- The workflow depends on `App.tsx` orchestration and careful partial-failure
  handling.

## What Would Break If Changed

Treating recurring completion as an ordinary status change could:

- stop generation of the next occurrence;
- make bulk and individual completion behave differently;
- lose preserved duration, tags, project, priority, or recurrence metadata;
- leave local state pointing at the deleted or completed occurrence;
- break selection, scrolling, and highlighting of the replacement task;
- invalidate recurrence and application orchestration tests.

Introducing persistent occurrence history would replace, rather than merely
refactor, the current recurrence identity and lifecycle model.

## Related Docs

- [Architecture](../architecture.md)
- [Ownership Map](../ownership-map.md)
- [Lessons Learned](../Lessons%20Learned.md)
- [Future Architecture Pressure Points](../Future%20Architecture%20Pressure%20Points.md)
- [Architectural Assumptions and Refactoring](../Architectural%20Assumptions%20and%20Refactoring.md)

