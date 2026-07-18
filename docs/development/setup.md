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
- Node.js 20 and npm for parity with CI
- MySQL for the normal REST runtime
- Xcode for simulator or physical iOS work

Use the checked-in Maven Wrapper; a global Maven installation is not required.

## Backend Database

The committed development configuration expects:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/taskmanagementdb
spring.datasource.username=taskuser
spring.datasource.password=taskpass
```

Create that database and user, then import `SQL Files/databasemodel.sql`. The SQL
file does not create the database or user. Apply every required script under
`src/main/resources/schema-updates/` in chronological order. Hibernate will not
create or update the schema because `ddl-auto=none`.

## Install And Verify

From the repository root:

```bash
./mvnw test
cd taskmanager-frontend
npm ci
npm test -- --watchAll=false
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

It runs backend tests, frontend tests, frontend build, iOS sync, and
`git diff --check`.

## Known Limitations

There is no containerized development environment or automated MySQL bootstrap.
Committed datasource credentials are local defaults, not production guidance.

## Related Documents

- [Configuration Reference](../reference/configuration.md)
- [Development Workflow](workflow.md)
- [Troubleshooting](troubleshooting.md)
