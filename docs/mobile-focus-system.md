# Mobile and iOS Text-Focus System

## Purpose

The mobile focus system protects the Capacitor iOS application from WKWebView
behavior that can shift the visual viewport while a text field is focused,
switched, dragged, or blurred.

In the failure state, document scroll positions may already report zero while
the visible viewport remains offset. The user sees an incorrectly shifted
application shell or a white gap after keyboard interaction.

This subsystem combines:

- mobile edit DOM placement;
- root and page sizing;
- explicit scroll ownership;
- text-focus transition tracking;
- touchmove guards;
- visual viewport monitoring;
- document-scroll correction;
- keyboard and focus-restoration behavior.

The implementation is primarily located in:

- `taskmanager-frontend/src/App.tsx`;
- `taskmanager-frontend/src/App.css`;
- `taskmanager-frontend/src/App.test.tsx`;
- the iOS project under `taskmanager-frontend/ios/`.

## Mobile Page Architecture

The mobile interface uses three application pages:

```text
mobile-pager
├── mobile-page--add
├── mobile-page--tasks
└── mobile-page--calendar
```

`App.tsx` owns the active page and pager transitions. Swipe gestures move
between pages only when they begin outside protected interactive elements.

Interactive controls, menus, date/time inputs, task cards, edit forms, and
dialogs are excluded from swipe initiation. This prevents page navigation from
competing with task actions, scrolling, selection, and text entry.

## Mobile Editing Architecture

Desktop inline editing renders the editor within the task card.

Mobile and coarse-pointer editing uses a different structure:

```text
Task list
├── normal task row
├── normal task row
└── mobile-edit-row
    └── mobile-edit-panel
```

The mobile editor is rendered outside the normal `li.item` task-card flow
while remaining visually associated with the selected task.

This placement avoids unstable interactions among:

- focused fields;
- task-card layout;
- nested scrolling;
- sticky positioning;
- caret auto-scrolling;
- WKWebView visual viewport movement.

The `.mobile-edit-row` placement is an architectural invariant. Moving mobile
edit back into the normal task-card row can reintroduce viewport drift and
white-gap failures.

## Shared Edit Draft

Inline, mobile, and detail-panel editing use the same edit-draft state owned by
`App.tsx`.

The shared draft ensures that:

- moving between edit presentations does not create competing task state;
- autosave observes the same values regardless of presentation;
- tag, project, recurrence, and schedule mutations remain coordinated;
- closing or switching selected tasks can flush one authoritative draft.

Mobile edit placement differs from desktop placement, but edit ownership does
not.

## Text Focus Scopes

Relevant text-entry surfaces use `data-text-focus-scope`.

Current scopes include:

- create-task fields;
- inline task editors;
- mobile task editors;
- detail-panel task editing.

The focus guard uses the nearest scope to understand transitions between text
fields and to associate diagnostic information with the active editing
surface.

`data-text-focus-scope` placement must remain aligned with the DOM structures
that own text entry. Moving or removing a scope can make transitions appear to
belong to the wrong surface.

## Scroll Ownership

The mobile layout assigns vertical scrolling to specific containers:

| Surface | Scroll owner |
| --- | --- |
| Application shell | Fixed to the configured viewport height; not the general vertical scroll owner. |
| Mobile pager and pages | Control page placement; do not become general document scroll containers. |
| Task page | `.app__list` owns vertical task-list scrolling. |
| Calendar page | Calendar card owns vertical calendar scrolling. |
| Mobile edit | Participates in task-list scrolling. |
| Mobile edit panel | Must not become an independent nested vertical scroll container. |

Document-level scroll is treated as unintended during mobile text entry and is
corrected to zero.

Root, app, pager, mobile-page, list, calendar, and edit-panel height and
overflow rules work together. A local CSS change to one of these containers
can change focus and viewport behavior elsewhere.

## Mobile Description Controls

Mobile edit descriptions intentionally render as title-style text inputs.

Create-task descriptions and desktop edit descriptions remain textareas.

This distinction is deliberate:

- mobile edit avoids an additional textarea scroll surface inside the task
  list;
- create and desktop descriptions retain multiline editing;
- textarea touch handling allows internal scrolling only within valid bounds
  and prevents overscroll from leaking into the visual viewport.

Do not normalize these controls to a single element type without validating
the mobile focus system.

## Edit Entry Preparation

Entering inline editing performs a controlled viewport reset:

```text
Blur current active element
    |
    v
Reset document-level scroll positions
    |
    v
Dispatch task-manager:edit-entry-reset
    |
    v
Reset again on requestAnimationFrame
    |
    v
Reset again after a short timeout
```

The repeated corrections are intentional. WebKit may apply asynchronous
viewport movement after the initiating event has completed.

## Focus Transition Tracking

The text-focus guard tracks whether the application is currently in keyboard
text-entry mode and which field and scope are active.

It handles cases including:

- direct transitions between text fields;
- focus temporarily passing through `document.body`;
- stale blur events firing after another field becomes active;
- an edited field unmounting during a transition;
- repeated `focusin` events for the same field;
- transitions between create, inline edit, mobile edit, detail edit, and
  search;
- entering edit mode while the task list is scrolled.

A focus sequence counter prevents delayed work from an older transition from
disabling protection for the currently active text field.

## Visual Viewport Monitoring

The focus guard observes:

- window scroll;
- captured document scroll;
- `focusin`;
- `focusout`;
- touch start;
- touch move;
- `window.visualViewport.resize`;
- `window.visualViewport.scroll`;
- the custom `task-manager:edit-entry-reset` event.

Visual viewport drift is detected when:

- keyboard text-entry mode is active;
- document-level scroll positions are already zero;
- `visualViewport.offsetTop` or `visualViewport.pageTop` remains non-zero.

```text
Document scroll is zero
    +
Text field is active
    +
Visual viewport remains offset
    =
Visual viewport drift
```

`window.scrollY === 0` is not sufficient evidence that the visible WKWebView
viewport is correctly positioned.

## Scroll Correction

During text-entry mode, the guard corrects unintended document scrolling by
resetting:

- `window.scrollY`;
- `document.scrollingElement.scrollTop`;
- `document.documentElement.scrollTop`;
- `document.body.scrollTop`.

Corrections run immediately and in scheduled bursts because browser viewport
movement may occur after focus, blur, touch, scroll, or resize events.

The guard does not reset the intended task-list or calendar scroll owner.

## Touch Guards

While keyboard text-entry mode is active:

- touch movement outside the active text field is prevented;
- active textarea movement is allowed only when the textarea can scroll in the
  requested direction;
- textarea overscroll at the top or bottom is prevented;
- touch movement on a textarea without internal scroll is prevented.

This preserves valid internal textarea scrolling without allowing the gesture
to drag the visual viewport.

## Keyboard Behavior

Global keyboard behavior is owned by `App.tsx`.

Keyboard shortcuts are ignored while focus is inside an input, textarea, or
select.

Escape closes the highest-priority active layer in this order:

1. status-move dialog;
2. statistics modal;
3. settings panel;
4. selected task/detail panel;
5. floating controls and action menus;
6. search text;
7. bulk mode.

This ordering prevents hidden overlays from remaining active and keeps focus
restoration aligned with the layer that closed.

## Focus Restoration

`App.tsx` manages focus restoration for:

- the statistics modal;
- the settings panel;
- the status-move dialog.

Before opening one of these surfaces, the currently focused element is
remembered. After closing, focus is restored only when:

- the current active element is absent, `document.body`, or disconnected; and
- the remembered target remains connected.

This prevents restoration from stealing focus from a newer valid interaction.

## Debugging Support

The focus guard contains optional diagnostic logging for:

- focus transitions;
- focus scopes;
- keyboard text mode;
- document and container scroll positions;
- visual viewport position;
- correction results;
- scheduled transition summaries.

Debug logging is enabled through the existing
`taskManagerTextFocusDebug` mechanism. Diagnostic logging must remain disabled
by default.

## Catalog Rename Focus Assist

Project and tag renaming inside the Catalog Management modal has one
additional iOS/WKWebView-specific focus assist. This applies only to the
Project/Tag Management rename textboxes, not to create-task fields, task edit
fields, search fields, create textareas, or general modal controls.

### Symptom

On iOS/WKWebView, focusing a catalog rename textbox while it is low in the
modal can visually pull the app shell and expose a white gap. Web Inspector
showed that the focused input's `getBoundingClientRect()` remained stable,
`window.scrollY`, `document.documentElement.scrollTop`, and
`document.body.scrollTop` remained `0`, and `visualViewport.offsetTop` and
`visualViewport.pageTop` remained `0`. The visible motion therefore did not
present as normal DOM scroll, element movement, or reported visual viewport
offset drift.

### Cause

The observed behavior is WKWebView's focused-input visibility adjustment. When
the input is too low relative to the keyboard, iOS attempts to keep the focused
caret visible by recomposing or panning the visible app surface. This movement
can occur even when DOM geometry and scroll metrics report no movement.

Web Inspector isolated the threshold: the inline catalog rename input around
`top: 498px` triggered the pull, while the same input temporarily moved to
fixed positions around `top: 180px`, `240px`, `300px`, or `360px` did not.
Moving the edit row higher in the modal, near `top: 204px`, also avoided the
pull.

### Failed Normal Fixes

The following fixes addressed adjacent issues or proved insufficient for this
specific path:

- setting the rename input to `16px` fixed input zoom but not the pull;
- adding focus scopes did not stop WKWebView's visibility adjustment;
- edit-entry scroll reset did not help because document scroll was already
  stable;
- modal overlay height, overflow, and scroll-owner changes did not move the
  reported geometry;
- changing native or DOM background colors could mask the exposed color but did
  not stop the motion.

### Actual Fix

`CatalogManagementModal.tsx` intercepts touch focus for catalog rename inputs
on mobile/coarse-pointer devices only. The handler:

1. prevents the default touch focus;
2. stops propagation so the same touch sequence cannot fall through to nearby
   edit-row controls;
3. appends a temporary proxy `input` to `document.body`;
4. positions the proxy as `fixed` near the safe top portion of the viewport;
5. focuses the proxy with `preventScroll` when supported;
6. after a short delay, focuses the real rename input with `preventScroll`;
7. removes the proxy.

The real rename input remains in the edit row for the entire sequence. An
earlier production attempt temporarily moved the real input itself; that avoided
the viewport pull, but it also let the adjacent Tag Color control occupy the row
and receive the later tap/click target. The proxy-input approach satisfies
WKWebView's focus geometry without creating a layout vacancy in the edit row.
The global `visualViewport` logic is not changed.

### Future Reuse Rule

Use this focus assist only for iOS/WKWebView text fields that pull because they
focus too low in the viewport. First verify the diagnosis with Web Inspector by
temporarily moving the same input to a safe fixed `top` before focus. If moving
the real editor higher is acceptable, prefer that normal layout fix instead.

This is an iOS focus-assist shim, not a general layout pattern. Do not apply it
globally and do not modify the global text-focus guard unless that global
system itself regresses.

## Invariants

The following invariants define the working mobile focus architecture:

- Document-level scroll positions remain zero during mobile text entry.
- Task-page vertical scrolling belongs to `.app__list`.
- Calendar-page vertical scrolling belongs to the calendar card.
- Mobile edit renders through `.mobile-edit-row` and `.mobile-edit-panel`.
- The mobile edit panel participates in task-list scrolling.
- The mobile edit panel does not own nested vertical scrolling.
- Mobile edit descriptions use title-style inputs.
- Create-task and desktop edit descriptions use textareas.
- Text focus scopes remain attached to create, edit, and detail surfaces.
- A stale blur cannot disable protection for the current active field.
- Swipe navigation cannot begin from protected interactive controls.
- Focus restoration cannot steal focus from a newer valid interaction.
- Inline, mobile, and detail editing share one authoritative edit draft.

## Protected Areas

Do not casually refactor or relocate:

- the iOS text-focus guard;
- `visualViewport` listeners, snapshots, or drift detection;
- `data-text-focus-scope` placement;
- mobile edit row placement;
- `.mobile-edit-panel` scroll behavior;
- root, app, pager, and mobile-page sizing;
- document-scroll correction;
- textarea bounded-scroll behavior;
- focus transition sequence tracking;
- keyboard guards and Escape ordering;
- swipe and pager behavior;
- `renderInlineEditForm`;
- autosave behavior associated with mobile/detail editing.

These areas form one cross-cutting system even though their implementation is
spread across TypeScript, JSX, CSS, and tests.

## Failure Modes

Common changes that can break the system include:

- moving mobile edit back inside the normal task-card row;
- adding `overflow-y: auto` or another independent scroll surface to the
  mobile edit panel;
- changing root or mobile-page height and overflow rules in isolation;
- removing repeated scroll corrections as redundant;
- treating zero document scroll as proof that the visual viewport is stable;
- allowing textarea overscroll to escape into the page;
- moving focus logic into isolated components without preserving transition
  ownership;
- changing Escape ordering without considering focus restoration;
- allowing swipe gestures to begin from inputs, menus, task cards, edit forms,
  or dialogs;
- moving `data-text-focus-scope` away from its current editing surface;
- creating separate edit drafts for mobile and desktop presentations.

## Testing Guidance

Run the focused frontend application tests:

```bash
cd taskmanager-frontend
npm test -- App.test.tsx --watchAll=false --silent
```

Run the complete frontend verification:

```bash
npm test -- --watchAll=false --silent
npm run build
```

For changes to the mobile focus system, also synchronize the iOS application:

```bash
npm run ios:sync
```

Validate on an iOS simulator or physical device:

- create-title to create-description transitions;
- search to edit transitions;
- edit-title to edit-description transitions;
- repeated switching among text fields;
- closing and reopening editors;
- entering edit mode from a scrolled task list;
- scrolling while a text field is active;
- textarea scrolling in the middle and at both boundaries;
- mobile edit title and description behavior;
- opening and closing dialogs and dropdowns;
- swiping between pages without triggering from controls;
- absence of white gaps after keyboard dismissal.

## Test Coverage

`taskmanager-frontend/src/App.test.tsx` contains regression coverage for:

- document-scroll correction after focus and blur;
- repeated and stale focus transitions;
- edit entry from a scrolled list;
- visual viewport drift detection;
- touchmove prevention;
- bounded textarea internal scrolling;
- textarea overscroll prevention;
- mobile edit description element choice;
- mobile edit save behavior;
- swipe gesture guards;
- focus restoration and dialog semantics.

The tests protect behavior, while simulator or device verification confirms the
WKWebView-specific visual result.
