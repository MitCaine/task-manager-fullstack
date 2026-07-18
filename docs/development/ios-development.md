# iOS Development

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Contributors validating the Capacitor iOS application |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This guide covers building, syncing, running, and qualifying the iOS shell,
including explicit SQLite activation and the native smoke harness.

## Build And Open

From `taskmanager-frontend/`:

```bash
npm run ios:sync
npm run ios:open
```

`ios:sync` runs a React production build and `cap sync ios`. Xcode uses Swift
Package Manager artifacts under `ios/App/CapApp-SPM`; CocoaPods are not the current
plugin integration.

The checked-in project uses bundle ID `com.mitchell.taskmanager` without a committed
Apple development team. For a physical device, select your own team in Xcode. If
your account cannot sign that bundle ID, use a unique local bundle ID consistently
in `capacitor.config.ts` and the Xcode target; do not commit personal signing data.

## REST Device Runtime

REST remains the default. Set a device-reachable API URL in `.env.local`:

```properties
REACT_APP_API_BASE_URL=http://YOUR_MAC_LAN_IP:8080
```

The backend binds to `0.0.0.0`; the Mac and device must share network access.
Rebuild and sync after changing a Create React App environment variable.

## Opt-In SQLite Runtime

Set:

```properties
REACT_APP_ENABLE_SQLITE_PERSISTENCE=true
```

SQLite activates only when Capacitor reports native iOS. Web still uses REST even
with the flag. The production local database name is `task_manager_sqlite`.
Initialization occurs before repositories are exposed. Failure shows
`Persistence initialization failed.` and does not fall back to REST.

## Native Smoke Harness

The smoke hook is attached in development builds or when
`REACT_APP_ENABLE_SQLITE_SMOKE=true`. In Safari Web Inspector run:

```javascript
await window.runTaskManagerSQLiteSmokeTest()
```

The isolated database is `task_manager_sqlite_smoke`. A successful result has
`passed: true`, `skipped: false`, migration user version `1`, foreign keys enabled,
and passing create/read/close/reopen/cascade/cleanup stages.

The harness is independent of `RepositoryProvider` and never runs automatically.

## Native Activation Checklist

With SQLite enabled, test a fresh install or cleared app data, empty state,
project/tag CRUD, task creation/editing/status, scheduling, project/tag assignment,
recurrence set/change/clear, child repository flows where accessible, background
and foreground, terminate/relaunch persistence, task deletion cascades, and final
cleanup. Also verify mobile focus, keyboard dismissal, pager swipes, dialogs,
safe-area layout, and calendar/task-list scrolling.

## Connection Lifecycle

Provider-owned runtime selections close on unmount. Injected repository sets are
caller-owned. Late async initialization after unmount is closed without publishing
state. React StrictMode may mount effects more than once; the runtime selector and
provider deduplicate initialization and close each owned selection once.

## Known Limitations

- Android is unsupported.
- No automated Xcode UI or physical-device test runs in CI.
- Clearing app data or uninstalling removes native SQLite data.
- There is no REST/SQLite data migration.

## Related Documents

- [Mobile and iOS Architecture](../architecture/mobile-ios.md)
- [SQLite Architecture](../architecture/sqlite.md)
- [Troubleshooting](troubleshooting.md)
