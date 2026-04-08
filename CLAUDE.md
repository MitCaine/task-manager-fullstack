# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack task management application with:
- **Backend**: Spring Boot 3.2.5 REST API (Java 17, Maven) connecting to MySQL
- **Frontend**: React + TypeScript SPA in `taskmanager-frontend/`
- **Database**: MySQL schema defined in `SQL Files/`

## Commands

### Backend
```bash
# Build
mvn clean package

# Run (requires MySQL running with credentials in application.properties)
mvn spring-boot:run

# The jar is also runnable directly:
java -jar target/taskmanager-1.0.0.jar
```

### Frontend
```bash
cd taskmanager-frontend
npm install
npm start        # dev server on port 3000
npm test         # run tests (Jest/React Testing Library)
npm run build    # production build
```

## Architecture

### Backend (`src/main/java/com/example/taskmanager/`)

Flat package structure — no service layer, controller talks directly to repository:

- **`Task`** — JPA entity mapped to the `Task` table. Fields: `taskID`, `title` (required, non-blank), `description` (max 1000 chars), `dateTimeScheduled` (`LocalDateTime`), `userID`.
- **`TaskRepository`** — Spring Data JPA interface. Custom queries: `findAllByOrderByDateTimeScheduledAsc()` and `findByUserIDOrderByDateTimeScheduledAsc(Long userID)`.
- **`TaskController`** — REST controller at `/tasks`. Supports GET (all or filtered by `?userID=`), GET by id, POST, PUT, DELETE.
- **`GlobalExceptionHandler`** / **`ValidationExceptionHandler`** — Both handle `MethodArgumentNotValidException` (duplicate handlers; `GlobalExceptionHandler` returns `Map<String, String>` per field, `ValidationExceptionHandler` returns `Map<String, List<String>>`).

### Database

`spring.jpa.hibernate.ddl-auto=none` — schema is **not** managed by Hibernate. Apply SQL manually from `SQL Files/`:
- `databasemodel.sql` — full schema with all tables (User, Task, Subtask, Project, Tag, Reminder, Note, Attachment, RecurrenceRule, TaskInstance, etc.)
- `inserts.sql` / `business_requirements.sql` — seed data and business logic queries

The full DB schema is much richer than what the backend currently exposes. The `Task` JPA entity only maps a subset of the `Task` table columns (no `statusID`, `scheduleID`, `recurrenceRuleID`).

### Frontend (`taskmanager-frontend/src/`)

- **`App.tsx`** — Single-component app. Fetches tasks from `/tasks` directly (no `/api` proxy prefix), handles add/remove with inline `fetch` calls. Has AM/PM vs 24-hour and US vs European date format toggles.
- **`api/tasks.ts`** — Separate API module using `/api` prefix (currently unused by `App.tsx`).
- **`types/task.ts`** — Shared `Task` type (`id`, `title`, `completed`, `dueDate`, `notes`) — **does not match** the backend's Task shape (`taskID`, `title`, `description`, `dateTimeScheduled`). This type is used only by `TaskList.tsx` and `api/tasks.ts`, not by `App.tsx`.
- **`components/TaskList.tsx`** — Unused component (App renders its own list inline).
- Strict TypeScript is enabled (`noImplicitAny`, `strictNullChecks`).

### Key inconsistency to be aware of

`App.tsx` uses the backend's field names (`taskID`, `dateTimeScheduled`) and calls `/tasks` directly. The `types/task.ts` + `api/tasks.ts` + `TaskList.tsx` files form a separate, incomplete abstraction layer with different field names and a `/api` prefix — these are not wired into the running app.

## Database Connection

Configured in `application.properties`:
- URL: `jdbc:mysql://localhost:3306/TaskManagementDB`
- User: `taskuser` / Password: `taskpass`
- DDL auto: `none` (schema must be applied manually)
