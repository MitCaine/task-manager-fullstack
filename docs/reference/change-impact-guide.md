# Change Impact Guide

| Field | Value |
| --- | --- |
| Status | Reference |
| Audience | Contributors planning or reviewing changes |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This guide identifies boundaries that commonly make an apparently local change
cross-cutting. It replaces older duplicated dependency and breakage analyses.

## Impact Matrix

| Change | Inspect together | Main risk |
| --- | --- | --- |
| Task domain field | Domain/input, contract, REST mapper/DTO, SQLite schema/mapper/repository, legacy adapter, UI workflows | Silent field loss or reset |
| Nullable update field | Input type, REST payload, SQLite update SQL, contract tests | Collapsing null and undefined |
| Status behavior | Domain status, REST status mapper, backend seed IDs, SQLite check/seed, legacy adapter | Identity mismatch |
| Task relationships | Task hydration, tag/recurrence repositories, backend controller, cascades | Partial writes or N+1 queries |
| Recurrence | Calculation utility, create/edit workflows, both recurrence adapters, completion workflow | Duplicate ownership or broken replacement |
| Catalog deletion | UI usage/confirmation, task relationship behavior, both stores | Unexpected task deletion or stale assignment |
| Child resource | Parent validation, contract, both adapters, cascades, inactive UI boundary | Orphan records or overstated feature support |
| Runtime selection | Selector, provider, error boundary, native lifecycle tests | Mixed providers, duplicate connection, silent fallback |
| SQLite migration | Fresh DB, previous version, native driver transaction options | Data loss or nested transaction |
| Shared mobile CSS | Shell, pager, task list, calendar, editor, overlays, focus guard | Width/scroll/keyboard regression |
| Text input on mobile | Focus scope, proxy helper, viewport handlers, tests, real iOS | White gap or snapback |
| Backend schema | Baseline assumptions, update SQL, JPA entity, H2/MySQL tests, REST mapper | Runtime schema mismatch |

## High-Risk Invariants

- Do not bypass repository contracts from App or hooks.
- Do not introduce a second recurrence ownership column in SQLite.
- Do not call `service.transaction()` from a repository already using `options.tx`.
- Do not use `??` where null clears and undefined preserves.
- Do not place mobile edit back inside the normal task card without native testing.
- Do not interpret SQLite activation as synchronization.

## Review Questions

1. Which layer owns the behavior today?
2. Is the change common contract behavior or adapter-specific behavior?
3. Does it affect fresh and existing databases?
4. Can multiple writes partially succeed?
5. Does a legacy numeric ID cross into a domain contract?
6. Does App state refresh relationship data after persistence?
7. Which automated test proves the invariant, and what still needs native/manual
   verification?

## Related Documents

- [Architecture Overview](../architecture/overview.md)
- [Development Workflow](../development/workflow.md)
- [Testing Guide](../development/testing.md)
