import { describeRecurrenceRepositoryContract } from '../../contracts/recurrenceRepositoryContract';
import { SQLiteDatabaseService } from '../SQLiteDatabaseService';
import { SQLiteRecurrenceRepository } from '../SQLiteRecurrenceRepository';
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

function createRecurrenceTestContext(driver = new CountingSqlJsTestDriver()) {
  const service = new SQLiteDatabaseService({ driver });
  const recurrence = new SQLiteRecurrenceRepository(service);
  const tasks = new SQLiteTaskRepository(service);
  return { driver, recurrence, service, tasks };
}

async function seedTask(
  service: SQLiteDatabaseService,
  id = '42',
  title = 'Task',
  dateTimeScheduled: string | null = '2026-07-03T10:00:00',
): Promise<void> {
  const db = await service.getDb();
  await db.run(`
    INSERT INTO tasks (id, title, description, date_time_scheduled, status_id)
    VALUES (?, ?, '', ?, 'not_started')
  `, [id, title, dateTimeScheduled]);
}

async function seedTag(service: SQLiteDatabaseService, id: string, title: string): Promise<void> {
  const db = await service.getDb();
  await db.run('INSERT INTO tags (id, title) VALUES (?, ?)', [id, title]);
}

let context: ReturnType<typeof createRecurrenceTestContext>;

beforeEach(() => {
  context = createRecurrenceTestContext();
});

afterEach(async () => {
  await context.service.close();
});

describeRecurrenceRepositoryContract({
  createRepository: () => context.recurrence,
  seedTask: task => seedTask(context.service, task.id, task.title, task.dateTimeScheduled ?? null),
});

describe('SQLiteRecurrenceRepository constraints and task hydration', () => {
  it('rejects recurrence for a missing task and enforces one rule per task', async () => {
    await expect(context.recurrence.setForTask('missing', {
      intervalUnit: 'day',
      intervalValue: 1,
    })).rejects.toThrow();

    await seedTask(context.service, '42');
    await context.recurrence.setForTask('42', { intervalUnit: 'day', intervalValue: 1 });
    const db = await context.service.getDb();
    await expect(db.run(`
      INSERT INTO recurrence_rules (
        id, task_id, interval_unit, interval_value, times_of_recurrence, start_date_time, end_date_time
      )
      VALUES ('duplicate', '42', 'week', 1, 0, '2026-07-03T10:00:00', '2036-07-03T10:00:00')
    `)).rejects.toThrow();
  });

  it('rejects invalid interval values and invalid date invariants', async () => {
    await seedTask(context.service, '42');
    await expect(context.recurrence.setForTask('42', {
      intervalUnit: 'invalid' as never,
      intervalValue: 1,
    })).rejects.toThrow('intervalUnit');
    await expect(context.recurrence.setForTask('42', {
      intervalUnit: 'day',
      intervalValue: 0,
    })).rejects.toThrow('intervalValue');

    const db = await context.service.getDb();
    await expect(db.run(`
      INSERT INTO recurrence_rules (
        id, task_id, interval_unit, interval_value, times_of_recurrence, start_date_time, end_date_time
      )
      VALUES ('bad-dates', '42', 'day', 1, 0, '2026-07-03T10:00:00', '2026-07-03T10:00:00')
    `)).rejects.toThrow();
  });

  it('hydrates recurrenceRuleId as derived task relationship data', async () => {
    await seedTask(context.service, 'without-rule', 'No rule');
    await seedTask(context.service, 'with-rule', 'With rule');

    await expect(context.tasks.get('without-rule')).resolves.toEqual(expect.objectContaining({
      id: 'without-rule',
      recurrenceRuleId: null,
    }));

    const taskWithRule = await context.recurrence.setForTask('with-rule', {
      intervalUnit: 'week',
      intervalValue: 1,
    });

    await expect(context.tasks.get('with-rule')).resolves.toEqual(expect.objectContaining({
      id: 'with-rule',
      recurrenceRuleId: taskWithRule.recurrenceRuleId,
    }));
  });

  it('hydrates recurrence IDs and tags for multiple tasks without cross-contamination or N+1 queries', async () => {
    await seedTask(context.service, 'task-1', 'One');
    await seedTask(context.service, 'task-2', 'Two');
    await seedTask(context.service, 'task-3', 'Three');
    await seedTag(context.service, 'tag-1', 'Tag one');
    await seedTag(context.service, 'tag-2', 'Tag two');
    await context.tasks.addTag('task-1', 'tag-1');
    await context.tasks.addTag('task-2', 'tag-2');
    const taskOne = await context.recurrence.setForTask('task-1', { intervalUnit: 'day', intervalValue: 1 });
    const taskTwo = await context.recurrence.setForTask('task-2', { intervalUnit: 'month', intervalValue: 1 });
    context.driver.queries.length = 0;

    await expect(context.tasks.list()).resolves.toEqual([
      expect.objectContaining({
        id: 'task-1',
        recurrenceRuleId: taskOne.recurrenceRuleId,
        tags: [expect.objectContaining({ id: 'tag-1' })],
      }),
      expect.objectContaining({
        id: 'task-2',
        recurrenceRuleId: taskTwo.recurrenceRuleId,
        tags: [expect.objectContaining({ id: 'tag-2' })],
      }),
      expect.objectContaining({
        id: 'task-3',
        recurrenceRuleId: null,
        tags: [],
      }),
    ]);

    const tagQueries = context.driver.queries.filter(sql => (
      sql.includes('FROM task_tags') && sql.includes('WHERE task_tags.task_id IN')
    ));
    const recurrenceQueries = context.driver.queries.filter(sql => (
      sql.includes('FROM recurrence_rules') && sql.includes('WHERE task_id IN')
    ));
    expect(tagQueries).toHaveLength(1);
    expect(recurrenceQueries).toHaveLength(1);
  });

  it('deleting recurrence updates task hydration and deleting task cascades recurrence', async () => {
    await seedTask(context.service, '42');
    const task = await context.recurrence.setForTask('42', { intervalUnit: 'day', intervalValue: 1 });
    expect(task.recurrenceRuleId).toEqual(expect.any(String));

    await expect(context.recurrence.setForTask('42', null)).resolves.toEqual(expect.objectContaining({
      recurrenceRuleId: null,
    }));
    await expect(context.tasks.get('42')).resolves.toEqual(expect.objectContaining({
      recurrenceRuleId: null,
    }));

    await context.recurrence.setForTask('42', { intervalUnit: 'week', intervalValue: 1 });
    await context.tasks.delete('42');
    await expect(context.recurrence.getByTask('42')).rejects.toThrow();
  });

  it('rolls back create, update, and delete using the supplied transaction context', async () => {
    await seedTask(context.service, '42');

    await expect(context.service.transaction(async tx => {
      await context.recurrence.setForTask('42', { intervalUnit: 'day', intervalValue: 1 }, { tx });
      throw new Error('rollback create');
    })).rejects.toThrow('rollback create');
    await expect(context.tasks.get('42')).resolves.toEqual(expect.objectContaining({ recurrenceRuleId: null }));

    await context.recurrence.setForTask('42', { intervalUnit: 'day', intervalValue: 1 });
    const original = await context.recurrence.getByTask('42');
    await expect(context.service.transaction(async tx => {
      await context.recurrence.setForTask('42', { intervalUnit: 'week', intervalValue: 2 }, { tx });
      throw new Error('rollback update');
    })).rejects.toThrow('rollback update');
    await expect(context.recurrence.getByTask('42')).resolves.toEqual(expect.objectContaining({
      id: original.id,
      intervalUnit: 'day',
      intervalValue: 1,
    }));

    await expect(context.service.transaction(async tx => {
      await context.recurrence.setForTask('42', null, { tx });
      throw new Error('rollback delete');
    })).rejects.toThrow('rollback delete');
    await expect(context.tasks.get('42')).resolves.toEqual(expect.objectContaining({
      recurrenceRuleId: original.id,
    }));
  });
});
