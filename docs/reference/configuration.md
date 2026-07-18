# Configuration Reference

| Field | Value |
| --- | --- |
| Status | Reference |
| Audience | Developers configuring local or native runtime |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Frontend Environment Variables

| Variable | Default | Effect |
| --- | --- | --- |
| `REACT_APP_API_BASE_URL` | Empty | Prefixes REST requests; browser dev otherwise uses package proxy |
| `REACT_APP_ENABLE_SQLITE_PERSISTENCE` | Not enabled | Selects SQLite only when exactly `true` and runtime is native iOS |
| `REACT_APP_ENABLE_SQLITE_SMOKE` | Not enabled | Exposes the explicit smoke function outside normal development gating |
| `NODE_ENV` | Set by React scripts | Development mode also exposes the smoke function |

Create React App embeds these values at build time. Rebuild and sync iOS after a
change. `.env.example` contains the device API URL shape; use `.env.local` for
machine-specific values.

## Runtime Database Names

| Purpose | Name |
| --- | --- |
| Normal native SQLite runtime | `task_manager_sqlite` |
| Native smoke harness | `task_manager_sqlite_smoke` |

## Backend Properties

`src/main/resources/application.properties` defines local defaults and reads:

- `SPRING_DATASOURCE_URL` with fallback `jdbc:mysql://localhost:3306/taskmanagementdb`;
- `SPRING_DATASOURCE_USERNAME` with fallback `taskuser`;
- `SPRING_DATASOURCE_PASSWORD` with fallback `taskpass`;
- bind address `0.0.0.0`;
- `spring.jpa.hibernate.ddl-auto=none`;
- formatted SQL logging;
- Open Session in View disabled;
- standard physical naming to preserve the historical schema names.

`config/backend.env.example` records the non-secret development shape. Runtime
environments must inject real credentials; no project-specific production secrets
service is supplied.

## Frontend Package Configuration

`taskmanager-frontend/package.json` proxies development requests to
`http://localhost:8080`. `capacitor.config.ts` uses app ID
`com.mitchell.taskmanager`, app name `Task Manager`, web directory `build`, and a
dark native background color.

## Security Notes

Fallback database credentials and HTTP examples are development defaults. They
must not be reused as production secret-management or transport guidance.

## Related Documents

- [Setup](../development/setup.md)
- [iOS Development](../development/ios-development.md)
- [Known Limitations](known-limitations.md)
