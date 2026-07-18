# Troubleshooting

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Developers diagnosing local, test, or native failures |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Backend Does Not Start

- Confirm MySQL is running and `taskmanagementdb` exists.
- Confirm the configured `taskuser` credentials work.
- Import the baseline schema and required schema-update scripts.
- Remember that Hibernate will not repair missing tables or columns.
- Use Java 17 or newer and run through `./mvnw`.

## Frontend Cannot Reach REST

- Browser development should use the package proxy with relative requests.
- A physical device cannot use the Mac's `localhost`; set
  `REACT_APP_API_BASE_URL` to the Mac's LAN address.
- Rebuild/sync after changing `.env.local`.
- Confirm the backend is bound to `0.0.0.0` and reachable from another device.
- Confirm CORS permits the Capacitor origin.

## Persistence Initialization Failed

This message means SQLite was selected and initialization failed. The app
intentionally does not fall back to REST.

- Verify the runtime flag is intended and the platform is native iOS.
- Inspect the native console for the failed open, pragma, or migration operation.
- Check for stale/duplicate plugin connections after development reloads.
- Run the explicit native smoke harness for a stage-specific result.
- Remove the flag to return to the default REST runtime; this does not migrate data.

## SQLite Native Errors

- `cannot change into wal mode from within a transaction`: pragma execution must
  remain nontransactional at the plugin boundary.
- `cannot start a transaction within a transaction`: migration SQL and
  `user_version` changes inside service transactions must disable plugin-managed
  transactions.
- Connection consistency failure: retrieve/create the connection before checking
  consistency; do not require a preexisting connection.

## Mobile Keyboard Or White Gap

Do not patch a single field before checking shared scroll ownership. Confirm the
mobile edit row remains outside the normal task card, document scroll is zero,
focus scopes are present, and visual viewport events are observed. Test on real
iOS; desktop emulation is insufficient.

## Jest React `act(...)` Warnings

Inspect test timing first. Await `userEvent` interactions and asynchronous initial
repository loading. Do not suppress `console.error`, add arbitrary sleeps, or wrap
large test bodies in manual `act` calls.

## Frontend Command Reports Missing `package.json`

Run npm commands from `taskmanager-frontend/`, not the repository root.

## Tests Pass But Full Verification Fails

`verify-all.sh` also runs the frontend production build, iOS sync, and diff check.
Inspect which stage failed rather than treating unit tests as the complete gate.

## Related Documents

- [Setup](setup.md)
- [Testing Guide](testing.md)
- [iOS Development](ios-development.md)
