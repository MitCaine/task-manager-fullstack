# ADR-0004: Dedicated Mobile Edit Row

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-06-10 |
| Last verified | 2026-07-18 |

## Context

Rendering the mobile editor inside a normal task card interacted poorly with
task-list scrolling, focused fields, and WKWebView viewport movement.

## Decision

Render coarse-pointer/mobile editing through a dedicated task-list row and panel,
outside the normal task-card DOM structure.

## Alternatives

- Reusing the desktop nested card layout was rejected after mobile viewport issues.
- A modal editor was rejected because it changes the task-list interaction model.

## Consequences

Mobile and desktop presentation differ while sharing one draft. Task-list rendering
must preserve the dedicated row placement.

## Supersedes / Superseded By

None.

## Related Documents

- [Mobile and iOS Architecture](../architecture/mobile-ios.md)

## Verification

`InlineTaskEditCard.tsx` and task-list presentation use mobile-specific row/panel
classes under mobile/coarse-pointer layout.
