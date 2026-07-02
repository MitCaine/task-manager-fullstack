# Repository Migration Boundary

Stage 1 defines repository contracts only. Runtime code still uses the
existing REST API module until Stage 2/3.

Planned ownership:

- `domain/` owns persistence-independent frontend domain models and inputs.
- `repositories/contracts.ts` owns split repository interfaces.
- REST repositories will map REST DTOs to domain models.
- SQLite repositories will map SQLite rows to domain models.
- The future database layer will own SQLite connection lifecycle, migrations,
  and transactions.
- Repositories may receive an operation `tx`, but they must not create SQLite
  connections.

The web app should continue using REST repositories. Native Capacitor builds
can switch to SQLite repositories after the database layer and SQLite
implementations exist.
