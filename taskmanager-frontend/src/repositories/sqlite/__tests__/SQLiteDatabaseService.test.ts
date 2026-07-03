import { SQLiteDatabaseService } from '../SQLiteDatabaseService';
import { getUserVersion } from '../migrations';
import { SqlJsTestDriver } from '../testing/SqlJsTestDriver';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

async function createInitializedService() {
  const driver = new SqlJsTestDriver();
  const service = new SQLiteDatabaseService({ driver });
  const db = await service.initialize();
  return { db, service };
}

describe('SQLiteDatabaseService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens once, applies migrations, and exposes the shared handle', async () => {
    const driver = new SqlJsTestDriver();
    const openSpy = jest.spyOn(driver, 'open');
    const service = new SQLiteDatabaseService({ driver });

    const first = await service.initialize();
    const second = await service.initialize();

    expect(first).toBe(second);
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(await getUserVersion(first)).toBe(1);

    await service.close();
  });

  it('runs migrations idempotently using PRAGMA user_version', async () => {
    const { db, service } = await createInitializedService();
    await db.run("INSERT INTO projects (id, title) VALUES (?, ?)", ['project-1', 'Work']);

    await service.initialize();

    expect(await getUserVersion(db)).toBe(1);
    await expect(db.query("SELECT id, title FROM projects WHERE id = ?", ['project-1']))
      .resolves.toEqual([{ id: 'project-1', title: 'Work' }]);

    await service.close();
  });

  it('seeds canonical status IDs', async () => {
    const { db, service } = await createInitializedService();

    await expect(db.query('SELECT id, label, sort_order FROM statuses ORDER BY sort_order'))
      .resolves.toEqual([
        { id: 'not_started', label: 'Not started', sort_order: 1 },
        { id: 'in_progress', label: 'In progress', sort_order: 2 },
        { id: 'completed', label: 'Completed', sort_order: 3 },
      ]);

    await service.close();
  });

  it('enforces foreign keys after initialization', async () => {
    const { db, service } = await createInitializedService();

    await expect(db.run(
      "INSERT INTO tasks (id, title, status_id, project_id) VALUES (?, ?, ?, ?)",
      ['task-1', 'Missing project', 'not_started', 'missing-project'],
    )).rejects.toThrow();

    await service.close();
  });

  it('rolls back transaction work when an operation fails', async () => {
    const { db, service } = await createInitializedService();

    await expect(service.transaction(async tx => {
      await tx.db.run("INSERT INTO projects (id, title) VALUES (?, ?)", ['project-rollback', 'Temporary']);
      await tx.db.run(
        "INSERT INTO tasks (id, title, status_id, project_id) VALUES (?, ?, ?, ?)",
        ['task-rollback', 'Broken', 'not_started', 'missing-project'],
      );
    })).rejects.toThrow();

    await expect(db.query("SELECT id FROM projects WHERE id = ?", ['project-rollback']))
      .resolves.toEqual([]);

    await service.close();
  });

  it('serializes concurrent transactions without joining the active transaction', async () => {
    const { db, service } = await createInitializedService();
    const firstCanFinish = deferred();
    const firstStarted = deferred();
    const events: string[] = [];

    const first = service.transaction(async tx => {
      events.push('first:start');
      await tx.db.run("INSERT INTO projects (id, title) VALUES (?, ?)", ['project-first', 'First']);
      firstStarted.resolve();
      await firstCanFinish.promise;
      events.push('first:end');
    });

    await firstStarted.promise;

    const second = service.transaction(async tx => {
      events.push('second:start');
      await tx.db.run("INSERT INTO projects (id, title) VALUES (?, ?)", ['project-second', 'Second']);
      events.push('second:end');
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(['first:start']);

    firstCanFinish.resolve();
    await Promise.all([first, second]);

    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
    await expect(db.query('SELECT id FROM projects ORDER BY id'))
      .resolves.toEqual([{ id: 'project-first' }, { id: 'project-second' }]);

    await service.close();
  });

  it('does not roll back a queued transaction when the prior transaction fails', async () => {
    const { db, service } = await createInitializedService();
    const firstCanFail = deferred();
    const firstStarted = deferred();
    const events: string[] = [];

    const first = service.transaction(async tx => {
      events.push('first:start');
      await tx.db.run("INSERT INTO projects (id, title) VALUES (?, ?)", ['project-rolled-back', 'Rolled back']);
      firstStarted.resolve();
      await firstCanFail.promise;
      events.push('first:fail');
      throw new Error('fail first transaction');
    });

    await firstStarted.promise;

    const second = service.transaction(async tx => {
      events.push('second:start');
      await tx.db.run("INSERT INTO projects (id, title) VALUES (?, ?)", ['project-committed', 'Committed']);
      events.push('second:end');
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(['first:start']);

    firstCanFail.resolve();
    await expect(first).rejects.toThrow('fail first transaction');
    await second;

    expect(events).toEqual(['first:start', 'first:fail', 'second:start', 'second:end']);
    await expect(db.query('SELECT id FROM projects ORDER BY id'))
      .resolves.toEqual([{ id: 'project-committed' }]);

    await service.close();
  });

  it('uses TEXT status columns and rejects numeric status IDs', async () => {
    const { db, service } = await createInitializedService();

    const taskColumns = await db.query<{ name: string; type: string; dflt_value: string | null }>(
      "PRAGMA table_info('tasks')",
    );
    const subtaskColumns = await db.query<{ name: string; type: string; dflt_value: string | null }>(
      "PRAGMA table_info('subtasks')",
    );

    expect(taskColumns.find(column => column.name === 'status_id')).toEqual(expect.objectContaining({
      type: 'TEXT',
      dflt_value: "'not_started'",
    }));
    expect(subtaskColumns.find(column => column.name === 'status_id')).toEqual(expect.objectContaining({
      type: 'TEXT',
      dflt_value: "'not_started'",
    }));

    await expect(db.run(
      "INSERT INTO tasks (id, title, status_id) VALUES (?, ?, ?)",
      ['task-numeric-status', 'Numeric status', 2],
    )).rejects.toThrow();

    await service.close();
  });

  it('rejects recurrence rules whose end is not after start', async () => {
    const { db, service } = await createInitializedService();

    await db.run("INSERT INTO tasks (id, title) VALUES (?, ?)", ['task-recurring', 'Recurring']);

    await expect(db.run(`
      INSERT INTO recurrence_rules (
        id,
        task_id,
        interval_unit,
        interval_value,
        start_date_time,
        end_date_time
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'rule-invalid',
      'task-recurring',
      'day',
      1,
      '2026-07-03T10:00:00',
      '2026-07-03T10:00:00',
    ])).rejects.toThrow();

    await expect(db.run(`
      INSERT INTO recurrence_rules (
        id,
        task_id,
        interval_unit,
        interval_value,
        start_date_time,
        end_date_time
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'rule-valid',
      'task-recurring',
      'day',
      1,
      '2026-07-03T10:00:00',
      '2026-07-03T10:30:00',
    ])).resolves.toBeUndefined();

    await service.close();
  });
});
