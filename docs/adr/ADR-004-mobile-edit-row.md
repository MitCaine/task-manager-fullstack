# ADR-004: Render Mobile Editing Through a Dedicated Task-List Row

## Status

Accepted

## Context

Desktop inline editing can render inside the normal task card. On mobile and
coarse-pointer layouts, the same placement produced unstable interactions
among focused fields, task-card layout, nested scrolling, caret auto-scroll,
the virtual keyboard, and WKWebView visual viewport movement.

The mobile task list is the intended vertical scroll owner. Giving the editor
its own scroll container or placing it back inside the normal task-card flow
can reintroduce viewport drift and white-gap failures.

## Decision

Mobile editing renders through a dedicated `.mobile-edit-row` containing a
`.mobile-edit-panel`, outside the normal `li.item` task-card flow while
remaining in the task-list context.

The mobile edit panel participates in `.app__list` scrolling and does not own
an independent nested vertical scroll container. Mobile edit descriptions use
title-style inputs, while create-task and desktop edit descriptions remain
textareas.

## Alternatives Considered

### Render Mobile Edit Inside the Normal Task Card

This would align desktop and mobile markup, but it previously increased
layout, caret-scroll, and visual viewport instability.

### Make the Mobile Edit Panel Sticky

This could keep the editor visible, but sticky positioning interacts poorly
with keyboard-driven viewport changes and the established task-list scroll
owner.

### Give the Mobile Editor Independent Vertical Scrolling

This could contain a long form, but it would create a nested scroll owner and
increase the chance of touch and viewport movement leaking outside the
intended container.

### Use a Textarea for the Mobile Edit Description

This would align field types across presentations, but it would introduce
another internal scroll surface into the protected mobile editing flow.

## Consequences

### Benefits

- Mobile edit placement remains stable during keyboard interaction.
- The task list remains the single mobile task-page scroll owner.
- Mobile editing stays visually associated with the selected task.
- The structure cooperates with the iOS focus and viewport guard.

### Costs

- Desktop and mobile editing use different DOM placement.
- CSS and tests must protect the dedicated row and scroll behavior.
- Mobile edit description behavior intentionally differs from desktop.

## What Would Break If Changed

Changing the mobile edit row or scroll ownership could:

- reintroduce visual viewport drift and white gaps;
- cause focused caret auto-scrolling to move the wrong container;
- create competing nested scroll behavior;
- reposition the task list when entering edit mode;
- break touchmove and textarea overscroll assumptions;
- invalidate focus-scope placement and mobile focus regression tests.

## Related Docs

- [Architecture](../architecture.md)
- [Ownership Map](../ownership-map.md)
- [Mobile Focus System](../mobile-focus-system.md)
- [Lessons Learned](../guides/Lessons%20Learned.md)
- [Architectural Assumptions and Refactoring](../reviews/Architectural%20Assumptions%20and%20Refactoring.md)
