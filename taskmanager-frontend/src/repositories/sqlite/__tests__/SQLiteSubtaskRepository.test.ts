import { describeSubtaskRepositoryContract } from '../../contracts/subtaskRepositoryContract';
import { SQLiteDatabaseService } from '../SQLiteDatabaseService';
import { SQLiteSubtaskRepository } from '../SQLiteSubtaskRepository';
import { mapSubtaskRowToDomain } from '../mappers';
import { SqlJsTestDriver } from '../testing/SqlJsTestDriver';
import { deleteTask, seedTask } from '../testing/repositoryTestUtils';

function createSubtaskTestContext() {
  const service = new SQLiteDatabaseService({ driver: new SqlJsTestDriver() });
  const repository = new SQLiteSubtaskRepository(service);
  return { repository, service };
}

let context: ReturnType<typeof createSubtaskTestContext>;

beforeEach(() => {
  context = createSubtaskTestContext();
});

afterEach(async () => {
  await context.service.close();
});

describeSubtaskRepositoryContract({
  createRepository: () => context.repository,
  seedParentTask: taskId => seedTask(context.service, taskId),
  seedSubtask: async subtask => {
    const db = await context.service.getDb();
    await db.run(`
      INSERT INTO subtasks (id, parent_task_id, title, status_id, date_time_scheduled)
      VALUES (?, ?, ?, ?, ?)
    `, [
      subtask.id,
      subtask.parentTaskId,
      subtask.title,
      subtask.statusId ?? 'not_started',
      subtask.dateTimeScheduled ?? null,
    ]);
  },
  expectDeleted: async (_id, taskId) => {
    await expect(context.repository.listByTask(taskId)).resolves.toEqual([
      expect.objectContaining({ id: '1' }),
    ]);
  },
});

describe('SQLiteSubtaskRepository relational and status behavior', () => {
  it('rejects create when parent task is missing', async () => {
    await expect(context.repository.create({
      parentTaskId: 'missing',
      title: 'No parent',
    })).rejects.toThrow();
  });

  it('cascades delete when parent task is deleted', async () => {
    await seedTask(context.service, '42');
    await context.repository.create({ parentTaskId: '42', title: 'Subtask' });

    await deleteTask(context.service, '42');

    await expect(context.repository.listByTask('42')).resolves.toEqual([]);
  });

  it('defaults missing input status to not_started', async () => {
    await seedTask(context.service, '42');

    await expect(context.repository.create({
      parentTaskId: '42',
      title: 'Subtask',
    })).resolves.toEqual(expect.objectContaining({
      statusId: 'not_started',
    }));
  });

  it('maps legacy null row status to not_started', async () => {
    expect(mapSubtaskRowToDomain({
      id: 'legacy-null-status',
      parent_task_id: '42',
      title: 'Legacy status',
      status_id: null,
      date_time_scheduled: null,
      created_at: null,
      updated_at: null,
    })).toEqual(expect.objectContaining({
      id: 'legacy-null-status',
      statusId: 'not_started',
    }));
  });

  it('treats null update status as not_started', async () => {
    await seedTask(context.service, '42');
    const subtask = await context.repository.create({
      parentTaskId: '42',
      title: 'Subtask',
      statusId: 'completed',
    });

    await expect(context.repository.updateStatus(subtask.id, null)).resolves.toEqual(
      expect.objectContaining({ statusId: 'not_started' }),
    );
  });

  it('rolls back create when using the provided transaction context', async () => {
    await seedTask(context.service, '42');

    await expect(context.service.transaction(async tx => {
      await context.repository.create({ parentTaskId: '42', title: 'Subtask' }, { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.listByTask('42')).resolves.toEqual([]);
  });

  it('rolls back update when using the provided transaction context', async () => {
    await seedTask(context.service, '42');
    const subtask = await context.repository.create({ parentTaskId: '42', title: 'Subtask' });

    await expect(context.service.transaction(async tx => {
      await context.repository.update(subtask.id, {
        title: 'Changed',
        statusId: 'completed',
        dateTimeScheduled: '2026-07-02T10:00:00',
      }, { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.listByTask('42')).resolves.toEqual([
      expect.objectContaining({
        id: subtask.id,
        title: 'Subtask',
        statusId: 'not_started',
        dateTimeScheduled: null,
      }),
    ]);
  });

  it('rolls back delete when using the provided transaction context', async () => {
    await seedTask(context.service, '42');
    const subtask = await context.repository.create({ parentTaskId: '42', title: 'Subtask' });

    await expect(context.service.transaction(async tx => {
      await context.repository.delete(subtask.id, { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.listByTask('42')).resolves.toEqual([
      expect.objectContaining({ id: subtask.id }),
    ]);
  });
});
