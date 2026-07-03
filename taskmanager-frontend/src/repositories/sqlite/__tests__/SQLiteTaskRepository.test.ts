import { describeTaskRepositoryContract } from '../../contracts/taskRepositoryContract';
import { SQLiteDatabaseService } from '../SQLiteDatabaseService';
import { SQLiteTaskRepository } from '../SQLiteTaskRepository';
import { SqlJsTestDriver } from '../testing/SqlJsTestDriver';

class CountingSqlJsTestDriver extends SqlJsTestDriver {
  readonly queries: string[] = [];

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params = [],
  ): Promise<T[]> {
    this.queries.push(sql);
    return super.query<T>(sql, params);
  }
}

function createTaskTestContext(driver = new CountingSqlJsTestDriver()) {
  const service = new SQLiteDatabaseService({ driver });
  const repository = new SQLiteTaskRepository(service);
  return { driver, repository, service };
}

async function seedProject(service: SQLiteDatabaseService, id = '10', title = 'Work'): Promise<void> {
  const db = await service.getDb();
  await db.run(`
    INSERT INTO projects (id, title)
    VALUES (?, ?)
  `, [id, title]);
}

async function seedTag(
  service: SQLiteDatabaseService,
  id = '5',
  title = 'Focus',
  color: string | null = '#6366f1',
): Promise<void> {
  const db = await service.getDb();
  await db.run(`
    INSERT INTO tags (id, title, color)
    VALUES (?, ?, ?)
  `, [id, title, color]);
}

async function seedTask(service: SQLiteDatabaseService, task: {
  id: string;
  title: string;
  description?: string;
  statusId?: 'not_started' | 'in_progress' | 'completed' | null;
  projectId?: string | null;
  dateTimeScheduled?: string | null;
  endDateTimeScheduled?: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
}): Promise<void> {
  const db = await service.getDb();
  await db.run(`
    INSERT INTO tasks (
      id, title, description, status_id, project_id,
      date_time_scheduled, end_date_time_scheduled, priority
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    task.id,
    task.title,
    task.description ?? '',
    task.statusId ?? 'not_started',
    task.projectId ?? null,
    task.dateTimeScheduled ?? null,
    task.endDateTimeScheduled ?? null,
    task.priority ?? null,
  ]);
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

let context: ReturnType<typeof createTaskTestContext>;

beforeEach(() => {
  context = createTaskTestContext();
});

afterEach(async () => {
  await context.service.close();
});

describeTaskRepositoryContract({
  createRepository: () => context.repository,
  seedProject: project => seedProject(context.service, project.id, project.title),
  seedTag: tag => seedTag(context.service, tag.id, tag.title, tag.color ?? null),
  seedTask: task => seedTask(context.service, {
    id: task.id,
    title: task.title,
    description: task.description,
    statusId: task.statusId ?? 'not_started',
    projectId: task.projectId,
  }),
  expectDeleted: async id => {
    await expect(context.repository.get(id)).rejects.toThrow(`Task ${id} not found.`);
  },
});

describe('SQLiteTaskRepository relationships and constraints', () => {
  it('uses canonical status ids and defaults created tasks to not_started', async () => {
    const task = await context.repository.create({ title: 'Default status' });
    expect(task).toEqual(expect.objectContaining({ statusId: 'not_started' }));

    const db = await context.service.getDb();
    await expect(db.query<{ status_id: string }>('SELECT status_id FROM tasks WHERE id = ?', [task.id]))
      .resolves.toEqual([expect.objectContaining({ status_id: 'not_started' })]);
  });

  it('rejects missing project and tag foreign keys', async () => {
    await expect(context.repository.create({
      title: 'Missing project',
      projectId: 'missing',
    })).rejects.toThrow();

    const task = await context.repository.create({ title: 'Task' });
    await expect(context.repository.addTag(task.id, 'missing')).rejects.toThrow();
  });

  it('hydrates task tags without cross-contamination across multiple tasks', async () => {
    await seedTag(context.service, '1', 'One', '#111111');
    await seedTag(context.service, '2', 'Two', '#222222');
    await seedTask(context.service, { id: 'task-1', title: 'Task one' });
    await seedTask(context.service, { id: 'task-2', title: 'Task two' });

    await context.repository.addTag('task-1', '1');
    await context.repository.addTag('task-2', '2');

    await expect(context.repository.list()).resolves.toEqual([
      expect.objectContaining({
        id: 'task-1',
        tags: [expect.objectContaining({ id: '1', title: 'One' })],
      }),
      expect.objectContaining({
        id: 'task-2',
        tags: [expect.objectContaining({ id: '2', title: 'Two' })],
      }),
    ]);
  });

  it('does not issue one tag relationship query per listed task', async () => {
    await seedTag(context.service, '1', 'One', '#111111');
    await seedTag(context.service, '2', 'Two', '#222222');
    await seedTask(context.service, { id: 'task-1', title: 'Task one' });
    await seedTask(context.service, { id: 'task-2', title: 'Task two' });
    await seedTask(context.service, { id: 'task-3', title: 'Task three' });
    await context.repository.addTag('task-1', '1');
    await context.repository.addTag('task-2', '2');
    context.driver.queries.length = 0;

    await context.repository.list();

    const relationshipQueries = context.driver.queries.filter(sql => (
      sql.includes('FROM task_tags') && sql.includes('WHERE task_tags.task_id IN')
    ));
    expect(relationshipQueries).toHaveLength(1);
  });

  it('rolls back task creation and tag linking inside a supplied transaction', async () => {
    await seedTag(context.service, '5', 'Focus', '#6366f1');

    await expect(context.service.transaction(async tx => {
      const task = await context.repository.create({ title: 'Rolled back' }, { tx });
      await context.repository.addTag(task.id, '5', { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.list()).resolves.toEqual([]);
  });

  it('rolls back update inside a supplied transaction', async () => {
    await seedTask(context.service, {
      id: 'task-1',
      title: 'Original',
      statusId: 'in_progress',
      dateTimeScheduled: '2026-07-03T10:00:00',
      priority: 'LOW',
    });

    await expect(context.service.transaction(async tx => {
      await context.repository.update('task-1', {
        title: 'Changed',
        dateTimeScheduled: null,
        statusId: 'completed',
        priority: null,
      }, { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.get('task-1')).resolves.toEqual(expect.objectContaining({
      title: 'Original',
      statusId: 'in_progress',
      dateTimeScheduled: '2026-07-03T10:00:00',
      priority: 'LOW',
    }));
  });

  it('rolls back delete inside a supplied transaction', async () => {
    await seedTask(context.service, { id: 'task-1', title: 'Original' });

    await expect(context.service.transaction(async tx => {
      await context.repository.delete('task-1', { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.get('task-1')).resolves.toEqual(expect.objectContaining({
      id: 'task-1',
    }));
  });

  it('cascades task deletion to child tables', async () => {
    await seedTag(context.service, '5', 'Focus', '#6366f1');
    await seedTask(context.service, { id: 'task-1', title: 'Original' });
    await context.repository.addTag('task-1', '5');
    const db = await context.service.getDb();
    await db.run("INSERT INTO subtasks (id, parent_task_id, title, status_id) VALUES ('sub-1', 'task-1', 'Step', 'not_started')");
    await db.run("INSERT INTO notes (id, task_id, title, context) VALUES ('note-1', 'task-1', 'Note', 'Body')");
    await db.run("INSERT INTO reminders (id, task_id, due_date) VALUES ('reminder-1', 'task-1', '2026-07-04T09:00:00')");
    await db.run("INSERT INTO attachments (id, task_id, file_or_link) VALUES ('attachment-1', 'task-1', 'https://example.com/file')");
    await db.run(`
      INSERT INTO recurrence_rules (
        id, task_id, interval_unit, interval_value, times_of_recurrence, start_date_time, end_date_time
      )
      VALUES ('recurrence-1', 'task-1', 'day', 1, 0, '2026-07-03T10:00:00', '2026-07-04T10:00:00')
    `);

    await context.repository.delete('task-1');

    await expect(countRows(context.service, 'task_tags', 'task_id', 'task-1')).resolves.toBe(0);
    await expect(countRows(context.service, 'subtasks', 'parent_task_id', 'task-1')).resolves.toBe(0);
    await expect(countRows(context.service, 'notes', 'task_id', 'task-1')).resolves.toBe(0);
    await expect(countRows(context.service, 'reminders', 'task_id', 'task-1')).resolves.toBe(0);
    await expect(countRows(context.service, 'attachments', 'task_id', 'task-1')).resolves.toBe(0);
    await expect(countRows(context.service, 'recurrence_rules', 'task_id', 'task-1')).resolves.toBe(0);
  });

  it('uses task patch semantics for omitted, null, and explicit values', async () => {
    await seedProject(context.service, '10', 'Work');
    await seedProject(context.service, '11', 'Home');
    await seedTask(context.service, {
      id: 'task-1',
      title: 'Original',
      description: 'Original description',
      statusId: 'completed',
      projectId: '10',
      dateTimeScheduled: '2026-07-03T10:00:00',
      endDateTimeScheduled: '2026-07-03T11:00:00',
      priority: 'HIGH',
    });

    await expect(context.repository.update('task-1', {
      title: 'Title only',
    })).resolves.toEqual(expect.objectContaining({
      title: 'Title only',
      description: 'Original description',
      statusId: 'completed',
      projectId: '10',
      dateTimeScheduled: '2026-07-03T10:00:00',
      endDateTimeScheduled: '2026-07-03T11:00:00',
      priority: 'HIGH',
    }));

    await expect(context.repository.update('task-1', {
      title: 'Cleared',
      dateTimeScheduled: null,
      endDateTimeScheduled: null,
      statusId: null,
      projectId: null,
      priority: null,
    })).resolves.toEqual(expect.objectContaining({
      title: 'Cleared',
      statusId: 'not_started',
      projectId: null,
      dateTimeScheduled: null,
      endDateTimeScheduled: null,
      priority: null,
    }));

    await expect(context.repository.update('task-1', {
      title: 'Replaced',
      description: 'Replacement',
      dateTimeScheduled: '2026-07-04T10:00:00',
      endDateTimeScheduled: '2026-07-04T11:00:00',
      statusId: 'in_progress',
      projectId: '11',
      priority: 'MEDIUM',
    })).resolves.toEqual(expect.objectContaining({
      title: 'Replaced',
      description: 'Replacement',
      statusId: 'in_progress',
      projectId: '11',
      dateTimeScheduled: '2026-07-04T10:00:00',
      endDateTimeScheduled: '2026-07-04T11:00:00',
      priority: 'MEDIUM',
    }));
  });

  it('rejects invalid status ids and explicit recurrence updates', async () => {
    await seedTask(context.service, { id: 'task-1', title: 'Original' });

    await expect(context.repository.updateStatus('task-1', 'invalid' as never)).rejects.toThrow();
    await expect(context.repository.update('task-1', {
      title: 'Recurrence',
      recurrenceRuleId: 'recurrence-1',
    })).rejects.toThrow('does not persist recurrenceRuleId');
  });
});
