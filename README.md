# Task Manager Fullstack

A full-stack task management application with a Spring Boot REST API and a React + TypeScript frontend. The app supports task creation, scheduling, filtering, calendar views, projects, tags, subtasks, notes, reminders, attachments, and recurring tasks.

## Tech Stack

Backend:
- Java 17
- Spring Boot 3.2.5
- Spring Web
- Spring Data JPA
- Jakarta Bean Validation
- MySQL for local runtime
- H2 for backend tests

Frontend:
- React 18
- TypeScript
- Create React App / react-scripts
- React Testing Library

## Project Structure

```text
.
├── src/main/java/com/example/taskmanager/   # Spring Boot API, entities, repositories
├── src/main/resources/                      # Backend configuration
├── src/test/java/com/example/taskmanager/   # Backend tests
├── SQL Files/                               # Database schema and SQL support files
├── taskmanager-frontend/                    # React + TypeScript frontend
└── pom.xml                                  # Maven backend project
```

## Features

- Create, edit, delete, copy, and complete tasks
- Sort and filter by date, status, priority, project, tag, and search text
- Board, all, today, week, and month task list views
- Calendar with year range, month, week, and day views
- Upcoming task agenda
- Task details panel with subtasks, notes, reminders, attachments, projects, tags, and recurrence
- Recurring task support for daily, weekly, and monthly rules
- Tag and project management
- Bulk task selection and actions
- Light, dark, and system theme support
- 12-hour / 24-hour time and US / European date format toggles

## Prerequisites

- Java 17+
- Maven 3.9+
- Node.js and npm
- MySQL running locally

The backend is configured for:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/TaskManagementDB
spring.datasource.username=taskuser
spring.datasource.password=taskpass
```

The schema is not managed automatically by Hibernate:

```properties
spring.jpa.hibernate.ddl-auto=none
```

Apply the database schema from `SQL Files/` before running the backend against MySQL.

## Backend

Run tests:

```bash
mvn test
```

Run the API:

```bash
mvn spring-boot:run
```

Build the backend:

```bash
mvn clean package
```

The API runs on `http://localhost:8080` by default.

## Frontend

Install dependencies:

```bash
cd taskmanager-frontend
npm install
```

Run the frontend dev server:

```bash
npm start
```

The frontend runs on `http://localhost:3000` and proxies API calls to `http://localhost:8080`.

Build the frontend:

```bash
npm run build
```

Run frontend tests:

```bash
npm test
```

## Main API Areas

The backend exposes REST endpoints for:

- `/tasks`
- `/tasks/{id}/status`
- `/tasks/{id}/repeat`
- `/tasks/{id}/recurrence`
- `/tasks/{id}/tags/{tagId}`
- `/subtasks`
- `/notes`
- `/reminders`
- `/projects`
- `/tags`
- `/attachments`

Controllers currently live in a flat package structure under `com.example.taskmanager`, with repositories injected directly into controllers.

## Validation

The backend validates key inputs such as:

- Task title and description limits
- Tag title and color format
- Reminder required due date
- Supported recurrence frequencies: `daily`, `weekly`, `monthly`

Invalid requests return structured validation errors or a bad request response.

## Testing Status

Current verified commands:

```bash
mvn test
cd taskmanager-frontend
npm run build
```

Backend tests cover the controller and repository behavior for tasks, tags, reminders, subtasks, notes, projects, and attachments. Frontend tests cover task UI behavior, date/time utilities, API calls, recurring-copy handling, and duplicate title numbering.

## Notes

- The frontend source is centered around `taskmanager-frontend/src/App.tsx` with the calendar in `taskmanager-frontend/src/components/Calendar.tsx`.
- Shared frontend API helpers are in `taskmanager-frontend/src/api/tasks.ts`.
- Shared frontend types are in `taskmanager-frontend/src/types/task.ts`.
- Database schema files are kept in `SQL Files/`.
