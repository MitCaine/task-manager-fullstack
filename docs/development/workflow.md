# Development Workflow

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | All contributors |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This guide defines the expected change workflow and the boundaries that keep
frontend, backend, and persistence behavior coherent.

## Before Editing

1. Start at the [Repository Tour](../repository-tour.md).
2. Read the canonical architecture and domain guide for the change.
3. Check the [ADR Index](../adr/README.md) for binding decisions.
4. Locate the narrowest existing tests that express the behavior.
5. Inspect the working tree and preserve unrelated changes.

## Change By Ownership

### Presentation-only change

Edit the focused component and CSS. Keep callbacks and persistence behavior
unchanged. Verify mobile shell/focus rules when touching shared geometry.

### Workflow change

Prefer the hook that owns the workflow. Keep deterministic calculations in a
utility. `App.tsx` should coordinate behavior only when it crosses domains or
global surfaces.

### Repository change

Update the domain model/input only when the contract requires it, then update the
contract, shared contract suite, REST adapter/mappers, and SQLite adapter/tests.
Do not make one implementation the accidental specification.

### Backend/API change

Update controller/entity/repository behavior and backend tests, then update REST
DTO mappers and shared repository expectations. MySQL schema changes require an
incremental SQL script and documentation update.

### SQLite schema change

Add a new forward-only migration. Never edit migration version 1 after released
data may exist. Verify initialization from version 0 and upgrade from the previous
version.

## Validation Order

1. Run the narrowest affected unit or contract test.
2. Run the affected frontend or backend suite.
3. Run the frontend build for TypeScript and bundling validation.
4. Run `./scripts/verify-all.sh` before release or broad integration completion.
5. Use real iOS validation for native driver, keyboard, viewport, or safe-area work.

## Documentation Changes

Update the canonical owner document in the same change as production behavior.
Do not add a second guide for the same subsystem. Historical stage notes should
not be used to describe current behavior.

## Review Checklist

- Does the change preserve repository/provider boundaries?
- Are null/undefined update semantics explicit?
- Do REST and SQLite contracts still agree?
- Are multi-write transaction limits understood?
- Does mobile behavior preserve focus and scroll invariants?
- Are current limitations described without presenting future work as complete?

## Related Documents

- [Testing Guide](testing.md)
- [Change Impact Guide](../reference/change-impact-guide.md)
- [Documentation Guide](documentation.md)
