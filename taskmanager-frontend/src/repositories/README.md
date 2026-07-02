# Repository Migration Boundary

The repository layer is being introduced in small stages so the web app can
continue using the existing Spring Boot REST backend while native builds later
gain SQLite persistence.

Current ownership:

- `domain/` owns persistence-independent frontend domain models and inputs.
- `repositories/contracts.ts` owns split repository interfaces.
- `repositories/api/` owns REST-backed repository implementations.
- `repositories/api/mappers/` maps REST DTOs to domain models and domain inputs
  back to REST payloads.
- `RepositoryProvider` exposes a repository set through React context and
  defaults to `createRestRepositories()`.

Runtime migration status:

- REST repositories exist and are available through `RepositoryProvider`.
- The React root is wrapped with `RepositoryProvider`.
- App and hooks still call the existing REST API functions directly until the
  next migration stage.
- SQLite repositories and the database layer do not exist yet.

Planned ownership:

- SQLite repositories will map SQLite rows to domain models.
- The future database layer will own SQLite connection lifecycle, migrations,
  and transactions.
- Repositories may receive an operation `tx`, but they must not create SQLite
  connections.

The web app should continue using REST repositories. Native Capacitor builds
can switch to SQLite repositories after the database layer and SQLite
implementations exist.
