# Synchronization Boundary

| Field | Value |
| --- | --- |
| Status | Canonical non-claim |
| Audience | Persistence and product contributors |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This document makes the absence of synchronization explicit. It prevents the
optional SQLite runtime from being interpreted as an offline cache for REST data.

## Current Implementation

- A runtime selects one complete REST or SQLite repository composition.
- REST and SQLite use equivalent repository contracts but independent datasets.
- There are no dual writes, fallback reads, sync queues, tombstones, versions,
  conflict rules, or REST-to-SQLite import.
- Switching persistence configuration changes the active data source; it does not
  move data.

## Architectural Invariants

- No adapter calls the other adapter.
- Provider selection remains atomic.
- SQLite initialization failure does not fall back to REST.
- Repository methods do not claim offline commit or eventual synchronization.

## Future Work Prerequisites

A real sync design would need explicit decisions for global identity, authoritative
ownership, mutation logs, retries and idempotency, deletion tombstones, field or
entity conflict policy, recurrence replacement, ordering, schema compatibility,
authentication, and migration of existing REST records. Those decisions must
precede implementation.

## Testing

Runtime selector tests prove atomic composition and web fallback before SQLite
initialization. No sync tests exist because no synchronization behavior exists.

## Known Limitations

Users cannot currently carry the same dataset between REST and SQLite modes.
Native local data is not backed up to the backend.

## Related Documents

- [Persistence Architecture](persistence.md)
- [Known Limitations](../reference/known-limitations.md)
- [Roadmap and Pressure Points](../reference/roadmap-and-pressure-points.md)
