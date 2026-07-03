import { createSQLiteRepositories } from '../createSQLiteRepositories';
import { SQLiteDatabaseService } from '../SQLiteDatabaseService';
import { SqlJsTestDriver } from '../testing/SqlJsTestDriver';

function createContext() {
  const service = new SQLiteDatabaseService({ driver: new SqlJsTestDriver() });
  const repositories = createSQLiteRepositories(service);
  return { repositories, service };
}

async function countRows(service: SQLiteDatabaseService, tableName: string, columnName: string, id: string): Promise<number> {
  const db = await service.getDb();
  const rows = await db.query<{ count: number }>(`
    SELECT COUNT(*) AS count
    FROM ${tableName}
    WHERE ${columnName} = ?
  `, [id]);
  return Number(rows[0]?.count ?? 0);
}

let context: ReturnType<typeof createContext>;

beforeEach(() => {
  context = createContext();
});

afterEach(async () => {
  await context.service.close();
});

describe('createSQLiteRepositories', () => {
  it('creates every repository key', () => {
    expect(Object.keys(context.repositories).sort()).toEqual([
      'attachments',
      'notes',
      'projects',
      'recurrence',
      'reminders',
      'subtasks',
      'tags',
      'tasks',
    ]);
  });

  it('uses one shared database service across repository interactions', async () => {
    const project = await context.repositories.projects.create({ title: 'Work' });
    const tag = await context.repositories.tags.create({ title: 'Focus', color: '#6366f1' });
    const task = await context.repositories.tasks.create({
      title: 'Shared service task',
      projectId: project.id,
      statusId: 'in_progress',
    });

    await context.repositories.tasks.addTag(task.id, tag.id);
    await expect(context.repositories.tasks.get(task.id)).resolves.toEqual(expect.objectContaining({
      id: task.id,
      projectId: project.id,
      statusId: 'in_progress',
      tags: [expect.objectContaining({ id: tag.id, title: 'Focus' })],
    }));
  });

  it('supports cross-repository task composition and cascade deletion', async () => {
    const project = await context.repositories.projects.create({ title: 'Work' });
    const tagA = await context.repositories.tags.create({ title: 'Focus', color: '#6366f1' });
    const tagB = await context.repositories.tags.create({ title: 'Deep', color: '#22c55e' });
    const task = await context.repositories.tasks.create({
      title: 'Composite task',
      description: 'Uses every child repository',
      projectId: project.id,
      statusId: 'not_started',
      dateTimeScheduled: '2026-07-03T10:00:00',
    });

    await context.repositories.tasks.addTag(task.id, tagA.id);
    await context.repositories.tasks.addTag(task.id, tagB.id);
    await context.repositories.notes.create({ taskId: task.id, title: 'Note', context: 'Body' });
    await context.repositories.reminders.create({ taskId: task.id, dueDate: '2026-07-04T09:00:00' });
    await context.repositories.attachments.create({ taskId: task.id, fileOrLink: 'https://example.com/file' });
    await context.repositories.subtasks.create({ parentTaskId: task.id, title: 'Step', statusId: 'not_started' });
    const recurringTask = await context.repositories.recurrence.setForTask(task.id, {
      intervalUnit: 'week',
      intervalValue: 1,
    });

    await expect(context.repositories.tasks.get(task.id)).resolves.toEqual(expect.objectContaining({
      id: task.id,
      projectId: project.id,
      statusId: 'not_started',
      recurrenceRuleId: recurringTask.recurrenceRuleId,
      tags: expect.arrayContaining([
        expect.objectContaining({ id: tagA.id }),
        expect.objectContaining({ id: tagB.id }),
      ]),
    }));

    await context.repositories.tasks.delete(task.id);

    await expect(countRows(context.service, 'task_tags', 'task_id', task.id)).resolves.toBe(0);
    await expect(countRows(context.service, 'notes', 'task_id', task.id)).resolves.toBe(0);
    await expect(countRows(context.service, 'reminders', 'task_id', task.id)).resolves.toBe(0);
    await expect(countRows(context.service, 'attachments', 'task_id', task.id)).resolves.toBe(0);
    await expect(countRows(context.service, 'subtasks', 'parent_task_id', task.id)).resolves.toBe(0);
    await expect(countRows(context.service, 'recurrence_rules', 'task_id', task.id)).resolves.toBe(0);
  });

  it('rolls back cross-repository writes with a shared transaction context', async () => {
    await expect(context.service.transaction(async tx => {
      const tag = await context.repositories.tags.create({ title: 'Focus' }, { tx });
      const task = await context.repositories.tasks.create({ title: 'Rolled back task' }, { tx });
      await context.repositories.tasks.addTag(task.id, tag.id, { tx });
      await context.repositories.notes.create({ taskId: task.id, context: 'Body' }, { tx });
      await context.repositories.reminders.create({ taskId: task.id, dueDate: '2026-07-04T09:00:00' }, { tx });
      await context.repositories.attachments.create({ taskId: task.id, fileOrLink: 'https://example.com/file' }, { tx });
      await context.repositories.subtasks.create({ parentTaskId: task.id, title: 'Step' }, { tx });
      await context.repositories.recurrence.setForTask(task.id, { intervalUnit: 'day', intervalValue: 1 }, { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repositories.tasks.list()).resolves.toEqual([]);
    await expect(context.repositories.tags.list()).resolves.toEqual([]);
  });

  it('persists cross-repository writes when the shared transaction succeeds', async () => {
    const result = await context.service.transaction(async tx => {
      const tag = await context.repositories.tags.create({ title: 'Focus', color: '#6366f1' }, { tx });
      const task = await context.repositories.tasks.create({ title: 'Committed task' }, { tx });
      await context.repositories.tasks.addTag(task.id, tag.id, { tx });
      await context.repositories.notes.create({ taskId: task.id, context: 'Body' }, { tx });
      await context.repositories.reminders.create({ taskId: task.id, dueDate: '2026-07-04T09:00:00' }, { tx });
      await context.repositories.attachments.create({ taskId: task.id, fileOrLink: 'https://example.com/file' }, { tx });
      await context.repositories.subtasks.create({ parentTaskId: task.id, title: 'Step' }, { tx });
      const recurringTask = await context.repositories.recurrence.setForTask(task.id, {
        intervalUnit: 'day',
        intervalValue: 1,
      }, { tx });
      return { taskId: task.id, tagId: tag.id, recurrenceRuleId: recurringTask.recurrenceRuleId };
    });

    await expect(context.repositories.tasks.get(result.taskId)).resolves.toEqual(expect.objectContaining({
      id: result.taskId,
      recurrenceRuleId: result.recurrenceRuleId,
      tags: [expect.objectContaining({ id: result.tagId })],
    }));
    await expect(context.repositories.notes.listByTask(result.taskId)).resolves.toHaveLength(1);
    await expect(context.repositories.reminders.listByTask(result.taskId)).resolves.toHaveLength(1);
    await expect(context.repositories.attachments.listByTask(result.taskId)).resolves.toHaveLength(1);
    await expect(context.repositories.subtasks.listByTask(result.taskId)).resolves.toHaveLength(1);
  });
});
