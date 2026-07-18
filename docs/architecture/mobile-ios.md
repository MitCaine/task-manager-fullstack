# Mobile and iOS Architecture

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Mobile UI and native-runtime contributors |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

The React application is wrapped by Capacitor for iOS. This guide documents the
mobile pager, focus/viewport protections, native persistence boundary, and the
invariants most likely to regress on WKWebView.

## Scope

It covers runtime and interaction architecture. Xcode commands and manual
qualification steps are in the iOS development guide.

## Architectural Invariants

- Platform checks occur at composition or platform-helper boundaries, not inside
  feature components or repositories.
- Mobile pager transforms and page widths must remain synchronized.
- Swipe navigation ignores protected interactive controls.
- `.app__list` owns task-page vertical scrolling; document scrolling during text
  entry is treated as unintended.
- Mobile editing uses a dedicated row outside the normal task-card layout.
- Inline and mobile editors share one edit draft.
- Focus/viewport guards must be tested on real iOS before simplification.

## Mobile Page Architecture

The mobile pager contains create, task-list, and calendar pages. `App.tsx` owns
the active page and swipe transitions. On first mobile load, an empty task dataset
may select Create Task once; explicit user navigation is not repeatedly overridden.

Swipe initiation excludes controls, forms, cards, menus, date/time inputs, and
dialogs so horizontal navigation does not compete with editing or scrolling.

## Mobile Editing

Desktop editing renders inside the task row. Mobile/coarse-pointer editing renders
through a dedicated `mobile-edit-row` and `mobile-edit-panel` within task-list
scroll ownership. Moving it back into the normal card structure can reintroduce
caret scrolling and visual-viewport drift.

## Focus And Viewport Protection

WKWebView can leave the visual viewport offset even when document scroll values
are zero. The implementation coordinates:

- `data-text-focus-scope` markers;
- focus-in/focus-out sequencing;
- window, document, and `visualViewport` observation;
- document-scroll correction;
- touch guards for text fields and textareas;
- repeated edit-entry viewport resets;
- a narrow proxy-input focus assist for mobile edit and catalog rename fields;
- focus restoration after dialogs.

The proxy temporarily focuses a fixed input near the safe top, then focuses the
real mounted input with `preventScroll`. It does not move or replace the real
control.

## Scroll Ownership

| Surface | Scroll owner |
| --- | --- |
| Application shell and pager | Fixed viewport geometry, not document scroll |
| Task page | `.app__list` |
| Calendar page | Calendar card/container |
| Mobile edit | Task-list scroll; no nested vertical editor scroller |
| Dialogs/catalog panels | Their explicit modal content container |

Safe-area values and viewport sizing are shared shell concerns. A local CSS
change can affect Create Task, Task List, Calendar, and mobile editing together.

## Native Runtime

Capacitor packages the React build from `build/`. `capacitor.config.ts` defines
app ID `com.mitchell.taskmanager`, app name, web directory, and background color.
Swift Package Manager supplies native plugins.

REST remains the default in the native shell. SQLite requires the explicit
persistence flag and native iOS detection. The smoke harness remains separately
gated and never runs automatically.

## Code Map

- Pager/focus orchestration: `taskmanager-frontend/src/App.tsx`
- Shell and mobile CSS: `taskmanager-frontend/src/App.css`, `src/index.css`
- Focus helper: `src/utils/mobileFocusAssist.ts`
- Mobile edit presentation: `src/components/task-list/InlineTaskEditCard.tsx`
- Capacitor config: `taskmanager-frontend/capacitor.config.ts`
- Native project: `taskmanager-frontend/ios/`
- Native SQLite: `src/repositories/sqlite/CapacitorSQLiteDriver.ts`

## Testing

Jest covers pager choices, swipe guards, focus transitions, viewport correction,
proxy focus, provider lifecycle, and SQL.js-backed App startup. Browser simulation
cannot prove WKWebView behavior; keyboard/focus and native SQLite changes require
the manual iOS checklist.

## Known Limitations

- Android is not configured or qualified.
- CSS and focus logic remain coupled to `App.tsx` and global shell geometry.
- The native app has no background notification service or sync engine.
- Physical-device behavior can differ from Jest and desktop Safari.

## Related ADRs

- [ADR-0004: Mobile Edit Row](../adr/adr-0004-mobile-edit-row.md)
- [ADR-0005: iOS Focus Guard](../adr/adr-0005-ios-focus-guard.md)
- [ADR-0011: Runtime Provider Selection](../adr/adr-0011-runtime-provider-selection.md)

## Related Documents

- [iOS Development](../development/ios-development.md)
- [SQLite Architecture](sqlite.md)
- [Troubleshooting](../development/troubleshooting.md)
