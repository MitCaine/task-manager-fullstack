import { Capacitor } from '@capacitor/core';
import type { EntityId } from '../../domain/models';
import { CapacitorSQLiteDriver } from './CapacitorSQLiteDriver';
import { createSQLiteRepositories } from './createSQLiteRepositories';
import { getUserVersion } from './migrations';
import { SQLiteDatabaseService } from './SQLiteDatabaseService';

export const NATIVE_SQLITE_SMOKE_DATABASE = 'task_manager_sqlite_smoke';

export type NativeSQLiteSmokeStage = {
  name: string;
  passed: boolean;
  message?: string;
};

export type NativeSQLiteSmokeResult = {
  platform: string;
  databaseName: string;
  userVersion?: number;
  journalMode?: string | null;
  synchronous?: string | number | null;
  busyTimeout?: string | number | null;
  foreignKeysEnabled?: boolean;
  stages: NativeSQLiteSmokeStage[];
  passed: boolean;
  skipped: boolean;
  failedStage?: string;
  error?: string;
};

type SmokeResources = {
  projectId?: EntityId;
  tagId?: EntityId;
  taskId?: EntityId;
};

export async function runNativeSQLiteSmokeTest(): Promise<NativeSQLiteSmokeResult> {
  const platform = Capacitor.getPlatform();
  const stages: NativeSQLiteSmokeStage[] = [];

  if (!Capacitor.isNativePlatform()) {
    return {
      platform,
      databaseName: NATIVE_SQLITE_SMOKE_DATABASE,
      stages: [{ name: 'native-platform-check', passed: false, message: 'Skipped on web.' }],
      passed: false,
      skipped: true,
    };
  }

  let service: SQLiteDatabaseService | null = null;
  let resources: SmokeResources = {};
  let userVersion: number | undefined;
  let observedPragmas: ObservedPragmas = {};

  const runStage = async <T>(name: string, work: () => Promise<T>): Promise<T> => {
    try {
      const result = await work();
      stages.push({ name, passed: true });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stages.push({ name, passed: false, message });
      throw new Error(`${name}: ${message}`);
    }
  };

  try {
    const first = await runStage('initialize', async () => {
      const driver = new CapacitorSQLiteDriver({ database: NATIVE_SQLITE_SMOKE_DATABASE });
      const nextService = new SQLiteDatabaseService({ driver });
      const db = await nextService.initialize();
      service = nextService;
      return { db, repositories: createSQLiteRepositories(nextService) };
    });

    userVersion = await runStage('verify-migration-user-version', () => getUserVersion(first.db));
    observedPragmas = await runStage('observe-pragmas', () => observePragmas(first.db));
    if (!observedPragmas.foreignKeysEnabled) {
      throw new Error('observe-pragmas: foreign_keys is not enabled.');
    }

    const marker = `native-sqlite-smoke-${Date.now()}`;
    const scheduledAt = new Date().toISOString();
    const reminderDue = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const project = await runStage('create-project', () => first.repositories.projects.create({
      title: `${marker}-project`,
      description: 'Native SQLite smoke project',
    }));
    resources.projectId = project.id;

    const tag = await runStage('create-tag', () => first.repositories.tags.create({
      title: `${marker}-tag`,
      color: '#336699',
    }));
    resources.tagId = tag.id;

    const task = await runStage('create-task', () => first.repositories.tasks.create({
      title: `${marker}-task`,
      description: 'Native SQLite smoke task',
      dateTimeScheduled: scheduledAt,
      statusId: 'in_progress',
      projectId: project.id,
      priority: 'MEDIUM',
    }));
    resources.taskId = task.id;

    await runStage('add-tag', () => first.repositories.tasks.addTag(task.id, tag.id));
    await runStage('create-subtask', () => first.repositories.subtasks.create({
      parentTaskId: task.id,
      title: `${marker}-subtask`,
      statusId: 'not_started',
    }));
    await runStage('create-note', () => first.repositories.notes.create({
      taskId: task.id,
      title: `${marker}-note`,
      context: 'Native SQLite smoke note',
    }));
    await runStage('create-reminder', () => first.repositories.reminders.create({
      taskId: task.id,
      dueDate: reminderDue,
      message: 'Native SQLite smoke reminder',
    }));
    await runStage('create-attachment', () => first.repositories.attachments.create({
      taskId: task.id,
      fileOrLink: `https://example.invalid/${marker}`,
      metadata: marker,
      fileSize: 1,
      mimeType: 'text/plain',
    }));
    await runStage('set-recurrence', () => first.repositories.recurrence.setForTask(task.id, {
      intervalUnit: 'week',
      intervalValue: 1,
    }));

    await runStage('verify-task-and-children', async () => {
      await verifyTaskGraph(first.repositories, task.id, project.id, tag.id);
    });

    await runStage('close-first-service', async () => {
      await service?.close();
      service = null;
    });

    const reopened = await runStage('reopen-same-database', async () => {
      const driver = new CapacitorSQLiteDriver({ database: NATIVE_SQLITE_SMOKE_DATABASE });
      const nextService = new SQLiteDatabaseService({ driver });
      await nextService.initialize();
      service = nextService;
      return { repositories: createSQLiteRepositories(nextService) };
    });

    await runStage('verify-persisted-after-reopen', async () => {
      await verifyTaskGraph(reopened.repositories, task.id, project.id, tag.id);
    });

    await runStage('delete-task', () => reopened.repositories.tasks.delete(task.id));
    await runStage('verify-cascade-delete', async () => {
      await expectMissingTaskGraph(reopened.repositories, task.id);
    });
    resources.taskId = undefined;

    await runStage('delete-project-and-tag', async () => {
      await reopened.repositories.projects.delete(project.id);
      await reopened.repositories.tags.delete(tag.id);
      resources.projectId = undefined;
      resources.tagId = undefined;
    });

    await runStage('close-final-service', async () => {
      await service?.close();
      service = null;
    });

    return {
      platform,
      databaseName: NATIVE_SQLITE_SMOKE_DATABASE,
      userVersion,
      journalMode: observedPragmas.journalMode ?? null,
      synchronous: observedPragmas.synchronous ?? null,
      busyTimeout: observedPragmas.busyTimeout ?? null,
      foreignKeysEnabled: observedPragmas.foreignKeysEnabled,
      stages,
      passed: true,
      skipped: false,
    };
  } catch (error) {
    await cleanupSmokeResources(service, resources, stages);
    await closeServiceQuietly(service);
    const message = error instanceof Error ? error.message : String(error);
    return {
      platform,
      databaseName: NATIVE_SQLITE_SMOKE_DATABASE,
      userVersion,
      journalMode: observedPragmas.journalMode ?? null,
      synchronous: observedPragmas.synchronous ?? null,
      busyTimeout: observedPragmas.busyTimeout ?? null,
      foreignKeysEnabled: observedPragmas.foreignKeysEnabled,
      stages,
      passed: false,
      skipped: false,
      failedStage: stages.find(stage => !stage.passed)?.name,
      error: message,
    };
  }
}

async function closeServiceQuietly(service: SQLiteDatabaseService | null): Promise<void> {
  if (!service) return;
  await service.close().catch(() => undefined);
}

type Repositories = ReturnType<typeof createSQLiteRepositories>;

type ObservedPragmas = {
  journalMode?: string | null;
  synchronous?: string | number | null;
  busyTimeout?: string | number | null;
  foreignKeysEnabled?: boolean;
};

async function observePragmas(db: Awaited<ReturnType<SQLiteDatabaseService['initialize']>>): Promise<ObservedPragmas> {
  const [foreignKeys, journalMode, synchronous, busyTimeout] = await Promise.all([
    queryPragma(db, 'PRAGMA foreign_keys'),
    queryPragma(db, 'PRAGMA journal_mode'),
    queryPragma(db, 'PRAGMA synchronous'),
    queryPragma(db, 'PRAGMA busy_timeout'),
  ]);

  return {
    journalMode: journalMode == null ? null : String(journalMode),
    synchronous: normalizePragmaValue(synchronous),
    busyTimeout: normalizePragmaValue(busyTimeout),
    foreignKeysEnabled: Number(foreignKeys) === 1,
  };
}

function normalizePragmaValue(value: unknown): string | number | null {
  if (typeof value === 'string' || typeof value === 'number') return value;
  return value == null ? null : String(value);
}

async function queryPragma(
  db: Awaited<ReturnType<SQLiteDatabaseService['initialize']>>,
  statement: string,
): Promise<unknown> {
  const rows = await db.query<Record<string, unknown>>(statement);
  const row = rows[0];
  if (!row) return null;
  return Object.values(row)[0] ?? null;
}

async function verifyTaskGraph(
  repositories: Repositories,
  taskId: EntityId,
  projectId: EntityId,
  tagId: EntityId,
): Promise<void> {
  const task = await repositories.tasks.get(taskId);
  if (task.id !== taskId) throw new Error('Task ID mismatch.');
  if (task.projectId !== projectId) throw new Error('Task projectId mismatch.');
  if (task.statusId !== 'in_progress') throw new Error('Task statusId mismatch.');
  if (!task.tags?.some(tag => tag.id === tagId)) throw new Error('Task tag hydration mismatch.');
  if (!task.recurrenceRuleId) throw new Error('Task recurrenceRuleId was not hydrated.');

  const [subtasks, notes, reminders, attachments, recurrence] = await Promise.all([
    repositories.subtasks.listByTask(taskId),
    repositories.notes.listByTask(taskId),
    repositories.reminders.listByTask(taskId),
    repositories.attachments.listByTask(taskId),
    repositories.recurrence.getByTask(taskId),
  ]);

  if (subtasks.length !== 1) throw new Error('Subtask was not created.');
  if (notes.length !== 1) throw new Error('Note was not created.');
  if (reminders.length !== 1) throw new Error('Reminder was not created.');
  if (attachments.length !== 1) throw new Error('Attachment was not created.');
  if (recurrence.id !== task.recurrenceRuleId) throw new Error('Recurrence ID mismatch.');
}

async function expectMissingTaskGraph(repositories: Repositories, taskId: EntityId): Promise<void> {
  await repositories.tasks.get(taskId).then(
    () => {
      throw new Error('Task still exists after delete.');
    },
    () => undefined,
  );

  const [subtasks, notes, reminders, attachments] = await Promise.all([
    repositories.subtasks.listByTask(taskId),
    repositories.notes.listByTask(taskId),
    repositories.reminders.listByTask(taskId),
    repositories.attachments.listByTask(taskId),
  ]);
  if (subtasks.length !== 0) throw new Error('Subtasks did not cascade delete.');
  if (notes.length !== 0) throw new Error('Notes did not cascade delete.');
  if (reminders.length !== 0) throw new Error('Reminders did not cascade delete.');
  if (attachments.length !== 0) throw new Error('Attachments did not cascade delete.');

  await repositories.recurrence.getByTask(taskId).then(
    () => {
      throw new Error('Recurrence still exists after task delete.');
    },
    () => undefined,
  );
}

async function cleanupSmokeResources(
  service: SQLiteDatabaseService | null,
  resources: SmokeResources,
  stages: NativeSQLiteSmokeStage[],
): Promise<void> {
  let cleanupService = service;
  let ownsCleanupService = false;

  if (!cleanupService && (resources.taskId || resources.projectId || resources.tagId)) {
    try {
      cleanupService = new SQLiteDatabaseService({
        driver: new CapacitorSQLiteDriver({ database: NATIVE_SQLITE_SMOKE_DATABASE }),
      });
      await cleanupService.initialize();
      ownsCleanupService = true;
      stages.push({ name: 'cleanup-open-service', passed: true });
    } catch (error) {
      stages.push({
        name: 'cleanup-open-service',
        passed: false,
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  }

  if (!cleanupService) return;
  const repositories = createSQLiteRepositories(cleanupService);

  await recordCleanupStage(stages, 'cleanup-task', async () => {
    if (resources.taskId) {
      await repositories.tasks.delete(resources.taskId);
      resources.taskId = undefined;
    }
  });
  await recordCleanupStage(stages, 'cleanup-project', async () => {
    if (resources.projectId) {
      await repositories.projects.delete(resources.projectId);
      resources.projectId = undefined;
    }
  });
  await recordCleanupStage(stages, 'cleanup-tag', async () => {
    if (resources.tagId) {
      await repositories.tags.delete(resources.tagId);
      resources.tagId = undefined;
    }
  });

  if (ownsCleanupService) {
    await recordCleanupStage(stages, 'cleanup-close-service', () => cleanupService!.close());
  }
}

async function recordCleanupStage(
  stages: NativeSQLiteSmokeStage[],
  name: string,
  work: () => Promise<void>,
): Promise<void> {
  try {
    await work();
    stages.push({ name, passed: true });
  } catch (error) {
    stages.push({
      name,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
