import { describeReminderRepositoryContract } from '../../contracts/reminderRepositoryContract';
import { SQLiteDatabaseService } from '../SQLiteDatabaseService';
import { SQLiteReminderRepository } from '../SQLiteReminderRepository';
import { SqlJsTestDriver } from '../testing/SqlJsTestDriver';
import { deleteTask, seedTask } from '../testing/repositoryTestUtils';

function createReminderTestContext() {
  const service = new SQLiteDatabaseService({ driver: new SqlJsTestDriver() });
  const repository = new SQLiteReminderRepository(service);
  return { repository, service };
}

let context: ReturnType<typeof createReminderTestContext>;

beforeEach(() => {
  context = createReminderTestContext();
});

afterEach(async () => {
  await context.service.close();
});

describeReminderRepositoryContract({
  createRepository: () => context.repository,
  seedParentTask: taskId => seedTask(context.service, taskId),
  seedReminder: async reminder => {
    const db = await context.service.getDb();
    await db.run(`
      INSERT INTO reminders (id, task_id, due_date, notification_method, message)
      VALUES (?, ?, ?, ?, ?)
    `, [
      reminder.id,
      reminder.taskId,
      reminder.dueDate,
      reminder.notificationMethod ?? 'browser',
      reminder.message ?? null,
    ]);
  },
  expectDeleted: async (_id, taskId) => {
    await expect(context.repository.listByTask(taskId)).resolves.toEqual([
      expect.objectContaining({ id: '1' }),
    ]);
  },
});

describe('SQLiteReminderRepository relational behavior', () => {
  it('rejects create when parent task is missing', async () => {
    await expect(context.repository.create({
      taskId: 'missing',
      dueDate: '2026-07-04T09:00:00',
      message: 'No parent',
    })).rejects.toThrow();
  });

  it('cascades delete when parent task is deleted', async () => {
    await seedTask(context.service, '42');
    await context.repository.create({
      taskId: '42',
      dueDate: '2026-07-04T09:00:00',
      message: 'Reminder',
    });

    await deleteTask(context.service, '42');

    await expect(context.repository.listByTask('42')).resolves.toEqual([]);
  });

  it('rolls back create when using the provided transaction context', async () => {
    await seedTask(context.service, '42');

    await expect(context.service.transaction(async tx => {
      await context.repository.create({
        taskId: '42',
        dueDate: '2026-07-04T09:00:00',
        message: 'Reminder',
      }, { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.listByTask('42')).resolves.toEqual([]);
  });

  it('rolls back update when using the provided transaction context', async () => {
    await seedTask(context.service, '42');
    const reminder = await context.repository.create({
      taskId: '42',
      dueDate: '2026-07-04T09:00:00',
      message: 'Reminder',
    });

    await expect(context.service.transaction(async tx => {
      await context.repository.updateDueDate(reminder.id, '2026-07-05T09:00:00', { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.listByTask('42')).resolves.toEqual([
      expect.objectContaining({ id: reminder.id, dueDate: '2026-07-04T09:00:00' }),
    ]);
  });

  it('rolls back delete when using the provided transaction context', async () => {
    await seedTask(context.service, '42');
    const reminder = await context.repository.create({
      taskId: '42',
      dueDate: '2026-07-04T09:00:00',
      message: 'Reminder',
    });

    await expect(context.service.transaction(async tx => {
      await context.repository.delete(reminder.id, { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.listByTask('42')).resolves.toEqual([
      expect.objectContaining({ id: reminder.id }),
    ]);
  });
});
