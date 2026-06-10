# ADR-002: Use One Shared Edit Draft Across Task Editors

## Status

Accepted

## Context

Task editing is presented through desktop inline editing, mobile editing, and
the detail panel. These presentations edit the same task fields and must
coordinate schedule, project, tags, priority, description, and recurrence.

Autosave, panel switching, and panel closing require one authoritative set of
pending values. Separate presentation-specific drafts would need conflict and
synchronization rules when the user moves between editing surfaces.

Mobile editing uses a different DOM structure from desktop editing, but that
placement difference does not create a separate task-editing lifecycle.

## Decision

Inline, mobile, and detail-panel editing use one shared edit draft owned by
`App.tsx`.

`taskEditDraft.ts` performs the pure conversion from a persisted task into
draft values. Presentation components receive draft values and emit changes,
but they do not own independent task drafts.

## Alternatives Considered

### Give Each Editor Its Own Draft

This would make each presentation more locally self-contained, but switching
editors would require synchronization and conflict resolution among multiple
pending versions of the same task.

### Store Draft State in Presentation Components

This would reduce top-level state, but autosave and task switching would lose
access to one authoritative draft. Unmounting an editor could also discard
pending changes.

### Persist Every Field Change Immediately

This would reduce explicit draft state, but task editing spans several API
resources and still requires ordering, error handling, and protection from
stale changes.

## Consequences

### Benefits

- All editing presentations show the same pending task values.
- Autosave observes one authoritative draft.
- Panel close and task switch behavior can flush one draft.
- Schedule, tag, project, and recurrence edits remain coordinated.

### Costs

- `App.tsx` owns a substantial amount of edit state.
- Presentation components depend on values and callbacks supplied by the
  orchestration owner.
- Changes to edit-draft structure affect all editing presentations.

## What Would Break If Changed

Creating separate drafts could:

- lose pending changes when an editor unmounts;
- show different values in inline, mobile, and detail editors;
- cause autosave to persist an older presentation's values;
- create conflicting tag, project, recurrence, or schedule state;
- make task switching and panel closing unable to flush one authoritative
  draft;
- break the mobile focus system by coupling edit ownership to mobile DOM
  placement.

## Related Docs

- [Architecture](../architecture.md)
- [Ownership Map](../ownership-map.md)
- [Mobile Focus System](../mobile-focus-system.md)
- [Lessons Learned](../guides/Lessons%20Learned.md)
- [Architectural Assumptions and Refactoring](../reviews/Architectural%20Assumptions%20and%20Refactoring.md)
