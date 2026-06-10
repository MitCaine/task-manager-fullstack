# ADR-005: Protect iOS Text Entry With a Global Focus and Visual Viewport Guard

## Status

Accepted

## Context

In the Capacitor iOS application, WKWebView can leave the visible viewport
offset after keyboard, focus, blur, scroll, or touch interactions even when
document scroll positions already report zero. The visible result is a shifted
application shell or white gap.

The failure crosses editing surfaces and depends on global DOM placement,
scroll ownership, touch behavior, asynchronous browser adjustments, and focus
transitions. Stale blur events and temporary focus through `document.body`
can also disable protection for a newer active field unless transition order
is tracked.

## Decision

`App.tsx` owns a global iOS text-focus guard that coordinates:

- text-focus transition tracking and sequence protection;
- `data-text-focus-scope` lookup;
- `visualViewport` resize and scroll monitoring;
- document-scroll detection and correction;
- repeated asynchronous correction after edit entry and focus changes;
- touchmove prevention outside the active field;
- bounded textarea internal scrolling;
- optional diagnostic logging.

The guard works with the established mobile edit row, root sizing, scroll
ownership, keyboard behavior, and focus restoration. These mechanisms are
treated as one protected subsystem.

## Alternatives Considered

### Reset Document Scroll Once

A single correction is insufficient because WebKit may move the viewport
asynchronously after the initiating event.

### Treat Zero Document Scroll as a Stable Viewport

This misses cases where `visualViewport.offsetTop` or
`visualViewport.pageTop` remains non-zero.

### Move Focus Handling Into Individual Inputs

Individual fields cannot understand transitions among create, search, inline,
mobile, and detail editing surfaces or protect against stale events from
another surface.

### Use Broad Shell Transforms or Viewport-Height Manipulation

These approaches were avoided because they would alter the entire application
layout rather than correcting the observed focus and viewport failure.

### Delegate to Capacitor Keyboard Plugin Hooks

The working implementation does not depend on plugin ownership. It uses
browser focus, touch, scroll, and visual viewport evidence directly.

## Consequences

### Benefits

- The application can detect viewport drift that document-scroll checks miss.
- Stale focus events cannot disable protection for the current field.
- Intended task-list and calendar scrolling remain separate from unintended
  document scrolling.
- Mobile focus behavior is protected by detailed regression tests and optional
  diagnostics.

### Costs

- The guard is specialized, defensive, and intentionally complex.
- Repeated corrections and global listeners may look redundant without
  historical context.
- DOM placement, CSS overflow, focus scopes, and event sequencing become
  architectural invariants.
- Simulator or device verification remains necessary for visual WKWebView
  behavior.

## What Would Break If Changed

Simplifying or distributing the guard could:

- allow white gaps or shifted application content after keyboard interaction;
- stop detecting drift when document scroll is already zero;
- let stale blur events disable protection for the active field;
- allow touch gestures or textarea overscroll to drag the visual viewport;
- interfere with the intended task-list or calendar scroll owner;
- break transitions among search, create, inline, mobile, and detail fields;
- invalidate the extensive mobile focus regression suite in `App.test.tsx`.

## Related Docs

- [Architecture](../architecture.md)
- [Ownership Map](../ownership-map.md)
- [Mobile Focus System](../mobile-focus-system.md)
- [Lessons Learned](../Lessons%20Learned.md)
- [Architectural Assumptions and Refactoring](../Architectural%20Assumptions%20and%20Refactoring.md)

