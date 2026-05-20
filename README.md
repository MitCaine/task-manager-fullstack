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
- react-scripts
- React Testing Library
- Capacitor iOS

## Project Structure

```text
.
├── src/main/java/com/example/taskmanager/   # Spring Boot API, entities, repositories
├── src/main/resources/                      # Backend configuration
├── src/main/resources/schema-updates/       # Manual MySQL schema update scripts
├── src/test/java/com/example/taskmanager/   # Backend tests
├── SQL Files/                               # MySQL schema
├── taskmanager-frontend/                    # React + TypeScript frontend
├── taskmanager-frontend/ios/App             # Capacitor iOS project
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
- Optional persisted task end time, displayed as a start/end range
- Capacitor iOS build for iPhone testing

## Prerequisites

- Java 17+
- Maven 3.9+
- Node.js and npm
- MySQL running locally
- Xcode for iOS simulator or iPhone builds

The backend is configured for:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/TaskManagementDB
spring.datasource.username=taskuser
spring.datasource.password=taskpass
server.address=0.0.0.0
```

The schema is not managed automatically by Hibernate:

```properties
spring.jpa.hibernate.ddl-auto=none
```

Apply `SQL Files/databasemodel.sql` before running the backend against MySQL.

If upgrading an existing database, also apply any scripts in
`src/main/resources/schema-updates/`, including:

```sql
ALTER TABLE Task
  ADD COLUMN endDateTimeScheduled DATETIME NULL;
```

Existing tasks remain valid because `endDateTimeScheduled` is nullable.

## Backend

Backend tests run in GitHub Actions on push and pull request.

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

Frontend tests run in GitHub Actions on push and pull request.

## iOS App

The React frontend is configured as a Capacitor iOS app. The native Xcode project
lives under `taskmanager-frontend/ios/App`.

Apple/iOS-specific updates in this build:

- Capacitor iOS project added under `taskmanager-frontend/ios`.
- `@capacitor/core`, `@capacitor/ios`, and `@capacitor/cli` added to the frontend.
- `npm run ios:sync` builds React and syncs assets into the iOS project.
- `npm run ios:open` opens the native project in Xcode.
- Frontend API calls can use `REACT_APP_API_BASE_URL` for device testing.
- Backend binds to `0.0.0.0` so an iPhone can reach the Mac over the LAN.
- CORS allows `capacitor://localhost` and `ionic://localhost`.
- The viewport uses `viewport-fit=cover` so CSS can respect iPhone safe areas.

For device testing, set the API base URL to a backend address your iPhone can
reach. For example, if the Spring Boot API is running on your Mac:

```bash
cd taskmanager-frontend
cp .env.example .env.local
# edit .env.local and replace YOUR_MAC_LAN_IP with your Mac's LAN IP
npm run ios:sync
npm run ios:open
```

In Xcode, select your iPhone 17 Pro Max as the run destination and press Run.
For production use, point `REACT_APP_API_BASE_URL` at a deployed HTTPS backend.

If the iOS app loads but cannot reach the API, verify that:

- The backend is running with `mvn spring-boot:run`.
- Your Mac and iPhone are on the same network.
- `.env.local` uses the Mac LAN IP, not `localhost`.
- `curl http://YOUR_MAC_LAN_IP:8080/tasks` works from another device on the LAN.

Many Xcode WebKit, keyboard, haptic, and Auto Layout warnings printed by the
iOS simulator are system noise. The important app signal is that the WebView
loads and the API requests succeed.

## Recent Bug Updates

- Reworked the mobile task creation card for iPhone-sized screens without
  changing the main visual style.
- Fixed create-task menu switching so Priority, Project, Tags, Date, Start Time,
  End Time, and time segment dropdowns use consistent one-tap open/close behavior.
- Fixed outside-tap behavior so normal fields close open menus while active
  menus, date controls, and time dropdowns remain usable.
- Fixed create-task date selection so the visible date and preview update
  immediately.
- Fixed time dropdown anchoring and option alignment.
- Added real `endDateTimeScheduled` persistence across create, edit, duplicate,
  calendar display, task list display, and recurring task completion.

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

## Testing

The GitHub Actions workflow in `.github/workflows/ci.yml` runs backend and frontend tests on push and pull request.

Backend tests cover the controller and repository behavior for tasks, tags, reminders, subtasks, notes, projects, and attachments. Frontend tests cover task UI behavior, date/time utilities, API calls, recurring-copy handling, and duplicate title numbering.

## Notes

- The frontend source is centered around `taskmanager-frontend/src/App.tsx` with the calendar in `taskmanager-frontend/src/components/Calendar.tsx`.
- Shared frontend API helpers are in `taskmanager-frontend/src/api/tasks.ts`.
- Shared frontend types are in `taskmanager-frontend/src/types/task.ts`.
- The MySQL schema is kept in `SQL Files/databasemodel.sql`.
