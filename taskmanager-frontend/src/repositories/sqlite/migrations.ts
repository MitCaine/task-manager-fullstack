import type { SqliteDriver } from './types';

export type SQLiteMigration = {
  version: number;
  name: string;
  up: string;
};

export const SQLITE_MIGRATIONS: SQLiteMigration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
CREATE TABLE IF NOT EXISTS statuses (
  id TEXT PRIMARY KEY CHECK (id IN ('not_started', 'in_progress', 'completed')),
  label TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(trim(title)) > 0),
  description TEXT,
  due_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(trim(title)) > 0),
  color TEXT CHECK(color IS NULL OR color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  date_time_scheduled TEXT,
  end_date_time_scheduled TEXT,
  status_id TEXT NOT NULL DEFAULT 'not_started'
    REFERENCES statuses(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  schedule_id TEXT,
  project_id TEXT
    REFERENCES projects(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  priority TEXT CHECK(priority IS NULL OR priority IN ('LOW', 'MEDIUM', 'HIGH')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(end_date_time_scheduled IS NULL OR date_time_scheduled IS NULL OR end_date_time_scheduled > date_time_scheduled)
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL
    REFERENCES tasks(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  tag_id TEXT NOT NULL
    REFERENCES tags(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(task_id, tag_id)
);

CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY,
  parent_task_id TEXT NOT NULL
    REFERENCES tasks(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  title TEXT NOT NULL CHECK(length(trim(title)) > 0),
  status_id TEXT NOT NULL DEFAULT 'not_started'
    REFERENCES statuses(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  date_time_scheduled TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL
    REFERENCES tasks(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  title TEXT,
  context TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL
    REFERENCES tasks(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  due_date TEXT NOT NULL,
  notification_method TEXT DEFAULT 'browser',
  message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL
    REFERENCES tasks(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  file_or_link TEXT NOT NULL CHECK(length(trim(file_or_link)) > 0),
  metadata TEXT,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT,
  local_file_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recurrence_rules (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE
    REFERENCES tasks(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  frequency TEXT,
  interval_unit TEXT NOT NULL CHECK(interval_unit IN ('day', 'week', 'month', 'year')),
  interval_value INTEGER NOT NULL DEFAULT 1 CHECK(interval_value > 0),
  times_of_recurrence INTEGER NOT NULL DEFAULT 0,
  start_date_time TEXT NOT NULL,
  end_date_time TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(end_date_time > start_date_time)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status_scheduled ON tasks(status_id, date_time_scheduled);
CREATE INDEX IF NOT EXISTS idx_tasks_project_scheduled ON tasks(project_id, date_time_scheduled);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_parent_status ON subtasks(parent_task_id, status_id);
CREATE INDEX IF NOT EXISTS idx_notes_task_timestamp ON notes(task_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_task_id ON recurrence_rules(task_id);

INSERT OR IGNORE INTO statuses (id, label, sort_order) VALUES
  ('not_started', 'Not started', 1),
  ('in_progress', 'In progress', 2),
  ('completed', 'Completed', 3);
`,
  },
];

export async function getUserVersion(db: SqliteDriver): Promise<number> {
  const rows = await db.query<{ user_version: number }>('PRAGMA user_version');
  return Number(rows[0]?.user_version ?? 0);
}

export async function setUserVersion(db: SqliteDriver, version: number): Promise<void> {
  await db.execute(`PRAGMA user_version = ${version}`, { transaction: false });
}

export async function runMigrations(
  db: SqliteDriver,
  migrations = SQLITE_MIGRATIONS,
): Promise<number> {
  const sorted = [...migrations].sort((a, b) => a.version - b.version);
  let currentVersion = await getUserVersion(db);

  for (const migration of sorted) {
    if (migration.version <= currentVersion) continue;

    await db.beginTransaction();
    try {
      await db.execute(migration.up, { transaction: false });
      await setUserVersion(db, migration.version);
      await db.commitTransaction();
      currentVersion = migration.version;
    } catch (error) {
      await db.rollbackTransaction();
      throw error;
    }
  }

  return currentVersion;
}
