# ADR-0001: App As Cross-Domain Orchestration Owner

| Field | Value |
| --- | --- |
| Status | Amended |
| Date | 2026-06-10 |
| Last verified | 2026-07-18 |

## Context

Task list, creation, calendar, settings, recurrence completion, bulk actions,
toasts, and mobile navigation share task state and interaction constraints.

## Decision

`App.tsx` remains the composition and cross-domain orchestration owner. Bounded
workflows are extracted into focused hooks; App no longer owns every form mutation
directly.

## Alternatives

- A global state framework was rejected because current scope does not require it.
- Keeping every workflow in App was rejected as extraction boundaries became clear.
- Letting presentation components call persistence was rejected.

## Consequences

Cross-domain behavior remains visible in one root, while creation, editing,
catalogs, detail resources, selection, and view derivation have focused owners.
App changes still have a broad regression surface.

## Supersedes / Superseded By

Amended by the implemented workflow-hook extractions; not superseded.

## Related Documents

- [Frontend Architecture](../architecture/frontend.md)
- [Repository Tour](../repository-tour.md)

## Verification

`App.tsx` composes `useCreateTaskWorkflow`, `useInlineEditWorkflow`,
`useProjectTagCatalog`, and the other focused hooks while retaining cross-domain
completion, bulk, toast, and mobile coordination.
