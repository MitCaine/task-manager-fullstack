# ADR-003: Keep Autosave With Selected-Task and Edit-Draft Ownership

## Status

Accepted

## Context

Task autosave is more than a debounce around a task update request. A delayed
save must target the current task, use the latest shared edit draft, reconcile
tags and recurrence, update primary task state, and flush when a task panel is
closed or switched.

The user may change fields, select another task, close the panel, or modify
related resources before the scheduled callback runs. The implementation uses
an autosave timer and refs so delayed work uses current task and save behavior
rather than stale React closures.

## Decision

`App.tsx` owns the complete autosave lifecycle:

- autosave timer management;
- current task and save-function refs;
- debounced save scheduling;
- flushing on panel close or task switch;
- base task update;
- tag reconciliation;
- recurrence reconciliation;
- updates to the primary task collection.

Autosave remains colocated with selected-task ownership and the shared edit
draft.

## Alternatives Considered

### Move Autosave Into Task Editor Components

Editors could schedule saves near their fields, but multiple presentations
would create competing timers and would not own selected-task transitions or
the complete mutation workflow.

### Extract Autosave Into an Independent Hook

A hook could own the timer, but a complete autosave hook would also need broad
access to selected task state, edit drafts, task state, mutation APIs, refs,
panel lifecycle, tags, and recurrence. A narrower hook would hide only the
timer while leaving ownership fragmented.

### Save Only the Base Task

This would simplify the save path, but the visible edit experience includes
tag and recurrence changes that must remain consistent with the base task.

## Consequences

### Benefits

- Delayed saves use the current authoritative task and draft.
- Closing or switching tasks can flush pending changes safely.
- Related task, tag, and recurrence updates remain one visible workflow.
- Autosave behavior is coordinated across all editing presentations.

### Costs

- Autosave is coupled to selected-task and edit-draft lifecycle.
- Refs and explicit flush behavior add implementation complexity.
- Changes require regression testing across editing, task switching, and
  related-resource reconciliation.

## What Would Break If Changed

Fragmenting autosave ownership could:

- save stale draft values or the wrong task;
- drop changes when panels close or selected tasks change;
- create multiple competing save timers;
- persist the base task without matching tag or recurrence changes;
- allow presentation unmounting to cancel or lose pending changes;
- make mobile and detail editing diverge despite sharing the same task.

## Related Docs

- [Architecture](../architecture.md)
- [Ownership Map](../ownership-map.md)
- [Mobile Focus System](../mobile-focus-system.md)
- [Lessons Learned](../Lessons%20Learned.md)
- [Future Architecture Pressure Points](../Future%20Architecture%20Pressure%20Points.md)
- [Architectural Assumptions and Refactoring](../Architectural%20Assumptions%20and%20Refactoring.md)

