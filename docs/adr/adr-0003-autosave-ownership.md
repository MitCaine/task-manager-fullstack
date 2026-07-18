# ADR-0003: Historical Autosave Ownership

| Field | Value |
| --- | --- |
| Status | Superseded |
| Date | 2026-06-10 |
| Last verified | 2026-07-18 |

## Context

An earlier detail-panel editor persisted changes through an autosave timer owned
with the selected task and edit draft.

## Decision

Historical decision: autosave belonged with edit-draft ownership rather than in
individual fields.

## Alternatives

Field-local autosave and presentation-owned persistence were rejected.

## Consequences

The decision no longer governs active UI behavior. Current task editing uses an
explicit Save action in `useInlineEditWorkflow`.

## Supersedes / Superseded By

Superseded by the explicit Save workflow documented in
[Tasks and Scheduling](../domains/tasks-and-scheduling.md).

## Related Documents

- [Frontend Architecture](../architecture/frontend.md)
- [Architecture Timeline](../history/architecture-timeline.md)

## Verification

Active editors call `saveEdit`; no production autosave scheduler remains.
