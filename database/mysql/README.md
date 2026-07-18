# MySQL Schema

`schema.sql` is the authoritative schema for a fresh local REST database. It
already includes task end scheduling and recurrence interval columns.

Files under `historical-updates/` preserve the manual upgrades used by older
database instances. **Do not apply them after `schema.sql`**; doing so attempts to
add columns that the current baseline already contains. This project does not run
Flyway or Liquibase, so upgrades from an older private database must be selected
manually based on that database's existing columns.

## Fresh Setup

Prerequisites: MySQL 8 or newer and a MySQL account allowed to create a local
database and user.

```sql
CREATE DATABASE taskmanagementdb CHARACTER SET utf8mb4;
CREATE USER 'taskuser'@'localhost' IDENTIFIED BY 'taskpass';
GRANT ALL PRIVILEGES ON taskmanagementdb.* TO 'taskuser'@'localhost';
```

Import the schema from the repository root:

```bash
mysql -u taskuser -p taskmanagementdb < database/mysql/schema.sql
```

The username and password above are development defaults only. Override them with
`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and
`SPRING_DATASOURCE_PASSWORD` outside local development. See
[`config/backend.env.example`](../../config/backend.env.example).

## Reset Local State

Resetting destroys all local data. Stop the backend, then run:

```sql
DROP DATABASE taskmanagementdb;
CREATE DATABASE taskmanagementdb CHARACTER SET utf8mb4;
GRANT ALL PRIVILEGES ON taskmanagementdb.* TO 'taskuser'@'localhost';
```

Import `schema.sql` again. Hibernate schema generation remains disabled with
`spring.jpa.hibernate.ddl-auto=none`; application startup never replaces this
explicit setup step.
