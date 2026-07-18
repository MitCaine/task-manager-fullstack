# Roadmap And Architecture Pressure Points

| Field | Value |
| --- | --- |
| Status | Planning reference |
| Audience | Product and architecture contributors |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This document identifies future changes likely to require architectural decisions.
It does not describe these capabilities as implemented or committed.

## Current Implementation

The system has complete REST and SQLite repository sets, atomic runtime selection,
an opt-in iOS SQLite runtime, repository contract tests, and native smoke
validation. REST remains default. The stores are independent. The active UI still
uses legacy numeric models through adapters.

## Near-Term Pressure Points

### Legacy UI model removal

Moving App state to domain models would remove negative ID aliases and repeated
mapping, but touches task selection, filters, drafts, calendar, catalogs, and tests.
It should be a deliberate migration with string-ID regression coverage.

### Child-resource product boundary

Repositories exist while the active detail UI does not. Product direction should
either restore a supported UI with loading/delivery semantics or formally narrow
the exposed feature set.

### MySQL migration discipline

Further schema changes increase risk without an ordered migration tool and schema
history. Introducing one affects local setup and existing databases.

### App orchestration size

Cross-domain completion, bulk actions, toasts, mobile pager, and focus behavior
still converge in `App.tsx`. Extraction is justified only where an ownership
boundary can be tested without destabilizing mobile behavior.

## Larger Architecture Changes

### Synchronization or offline-first behavior

Requires identity, authority, mutation log, tombstone, conflict, retry,
authentication, and migration decisions. Equivalent repository contracts alone do
not provide synchronization semantics.

### Multi-user support

Requires backend ownership enforcement, authentication, query scoping, local-store
partitioning, provider configuration, migration, and UI session boundaries.

### Reliable notifications

Requires a native/background scheduling boundary, permissions, rescheduling on
edit/delete, timezone policy, duplicate prevention across restarts, and tests.

### Recurrence history and atomicity

Would likely require a stable series/occurrence model and an application transaction
boundary rather than the current replacement workflow.

### Deployment hardening

Requires environment profiles, secret management, TLS, database provisioning,
observability, migration execution, rollback, signing, and release evidence.

## Decision Rule

Before implementing one of these areas, write or update the affected ADRs and
canonical architecture guide. Do not smuggle synchronization, service layers, or
provider fallback into a feature patch.

## Related Documents

- [Known Limitations](known-limitations.md)
- [Synchronization Boundary](../architecture/synchronization.md)
- [Change Impact Guide](change-impact-guide.md)
