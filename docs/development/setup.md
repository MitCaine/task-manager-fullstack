# Development Setup

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Developers setting up the repository |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This guide establishes a working backend, frontend, MySQL database, and optional
iOS environment from a clean checkout.

## Prerequisites

- Java 17 or newer
- Node.js 22 and npm 10 or newer (`.nvmrc` records the CI major version)
- MySQL 8 or newer for the normal REST runtime
- Xcode for simulator or physical iOS work

Use the checked-in Maven Wrapper; a global Maven installation is not required.

## Backend Database

The backend defaults to the following local settings:

```properties
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/taskmanagementdb
SPRING_DATASOURCE_USERNAME=taskuser
SPRING_DATASOURCE_PASSWORD=taskpass
```

Create that database and user, then import `database/mysql/schema.sql`. It is the
complete fresh-install schema and does not create the database or user. Files under
`database/mysql/historical-updates/` are upgrade records for older databases and
must not be applied after the current schema. Follow the authoritative
[MySQL setup](../../database/mysql/README.md), including reset instructions.

The defaults are non-secret development values. Source
`config/backend.env.example` as a starting point or provide the three standard
Spring datasource environment variables through the process environment.

## Install And Verify

From the repository root:

```bash
./mvnw test
cd taskmanager-frontend
npm ci
npm test -- --watchAll=false
npm run typecheck
npm run build
```

Use `npm install` only when intentionally changing dependency resolution and the
lockfile. Frontend npm commands must run under `taskmanager-frontend/`.

## Run Locally

Start the backend from the repository root:

```bash
./mvnw spring-boot:run
```

Start the frontend in a second shell:

```bash
cd taskmanager-frontend
npm start
```

The frontend runs at `http://localhost:3000` and proxies relative API requests to
`http://localhost:8080`.

## Optional iOS Setup

Copy `taskmanager-frontend/.env.example` to `.env.local`, replace the placeholder
with a backend URL reachable from the device, then run:

```bash
cd taskmanager-frontend
npm run ios:sync
npm run ios:open
```

See [iOS Development](ios-development.md) before enabling SQLite persistence.

## Verification

Run the full repository check from the root:

```bash
./scripts/verify-all.sh
```

It runs backend tests, frontend tests, TypeScript checking, frontend build, iOS sync, and
`git diff --check`.

## Known Limitations

There is no containerized development environment or automated MySQL bootstrap.
Production secret storage and database provisioning remain operator concerns.

## Related Documents

- [Configuration Reference](../reference/configuration.md)
- [Development Workflow](workflow.md)
- [Troubleshooting](troubleshooting.md)
