# Testing Guide

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Contributors writing or reviewing tests |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

Tests are organized by architectural guarantee: deterministic rules, workflows,
public repository behavior, adapter-specific behavior, integration, and native
qualification.

## Test Layers

| Layer | Main location | Guarantee |
| --- | --- | --- |
| Backend controller/repository | `src/test/java/` | HTTP, validation, JPA behavior, relationships |
| Frontend utilities | `src/utils/*.test.ts` | Pure scheduling, filtering, display, recurrence rules |
| Hooks/components | `src/hooks/`, `src/components/` tests | Focused workflow and presentation behavior |
| App integration | `App.test.tsx` | Cross-component user behavior with repository-shaped data |
| Repository contracts | `src/repositories/contracts/` | Shared REST/SQLite public behavior |
| SQLite-specific | `src/repositories/sqlite/__tests__/` | SQL constraints, transactions, cascades, hydration, driver lifecycle |
| Runtime integration | `App.sqliteRuntime.test.tsx`, context tests | Provider selection, readiness, cleanup, persisted App startup |
| Native smoke | `nativeSmokeTest.ts` | Real Capacitor SQLite and close/reopen persistence |

## Commands

Backend:

```bash
./mvnw test
```

Frontend, from `taskmanager-frontend/`:

```bash
npm test -- --watchAll=false
npm run build
```

Full repository validation:

```bash
./scripts/verify-all.sh
```

Use Jest's filename or `-t` filtering for a narrow test. Do not use arbitrary
delays to stabilize React tests; await user interactions and genuine asynchronous
rendering instead.

## Repository Contract Strategy

Each shared suite accepts an implementation-specific harness. Assertions included
in a shared contract must be guaranteed by the public interface. Richer SQLite
semantics, constraints, query bounds, and transactions belong in SQLite tests
rather than weakening REST or overstating the shared contract.

## SQLite Strategy

SQL.js is deterministic and runs in Jest through `SqlJsTestDriver`. Tests initialize
the real migration/service layer and use parent task helpers for child repositories.
Driver mock tests verify Capacitor API delegation and lifecycle without pretending
to prove native behavior.

The native smoke harness must be run manually for native plugin changes. Its result
is structured and stage-specific; a passing Jest suite is not a substitute.

## CI

GitHub Actions runs Maven tests and the frontend Jest suite on pushes and pull
requests. It currently does not run the frontend production build, iOS sync, native
smoke harness, or documentation link checks. Local full verification is broader.

## Known Limitations

- H2 does not prove all MySQL DDL behavior.
- JSDOM does not prove WKWebView layout, keyboard, or visual viewport behavior.
- SQL.js does not prove Capacitor plugin connection behavior.
- No end-to-end browser or Xcode UI automation suite exists.

## Related Documents

- [iOS Development](ios-development.md)
- [Repository Architecture](../architecture/repositories.md)
- [Release Guide](release.md)
