# Project Retrospective

| Field | Value |
| --- | --- |
| Status | Historical |
| Audience | Maintainers reviewing project evolution |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 for historical classification |

## Purpose

This retrospective combines the durable lessons from earlier lessons-learned and
project-retrospective documents. It is context, not current architecture authority.

## What Worked

### Incremental ownership extraction

Extracting presentation, pure utilities, and then bounded workflow hooks reduced
`App.tsx` responsibility without forcing a state-management rewrite. Tests provided
the safety needed to preserve mobile and recurrence behavior.

### Contract-first persistence migration

Domain models and shared repository contracts were established before SQLite
repositories. Implementing lower-risk catalogs and child resources before tasks
and recurrence exposed patch, transaction, relationship, and identity issues in a
controlled order.

### Native validation before provider activation

The SQL.js suite could not reveal Capacitor connection-consistency ordering, WAL
inside plugin transactions, or nested migration transactions. The explicit native
smoke harness found each issue before SQLite became a selectable App runtime.

### Treating iOS focus as a system

WKWebView keyboard problems crossed DOM placement, scroll ownership, viewport
events, touch behavior, and timing. A coordinated focus system was more reliable
than repeated local CSS fixes.

## What Created Cost

### Backend-shaped UI models

Numeric IDs and REST field names spread through App state before a domain boundary
existed. Legacy adapters now contain that debt, but the eventual UI model migration
will remain broad.

### Documentation by investigation stage

Feature atlases, traces, ownership maps, reading guides, and risk reviews each
captured useful observations but repeated the same architecture. As code evolved,
they drifted at different rates and made historical autosave/direct-REST behavior
look current.

### Manual schema evolution

MySQL's baseline-plus-loose-update-script process works locally but provides weak
upgrade evidence and no automated history. SQLite's versioned runner demonstrates a
more maintainable model.

## Durable Engineering Lessons

1. Normalize meaning at boundaries instead of propagating storage identity.
2. Make ownership explicit before adding a second implementation.
3. Distinguish shared contract guarantees from adapter-specific strengths.
4. Treat null and omission as separate update states where the domain does.
5. Give multi-write workflows an explicit transaction owner or document partial
   failure risk.
6. Use native validation for plugin and WebView behavior.
7. Keep current guides separate from implementation history.

## Related Documents

- [Architecture Timeline](architecture-timeline.md)
- [Why This Exists](../reference/why-this-exists.md)
- [Development Workflow](../development/workflow.md)
