import { describeNoteRepositoryContract } from '../../contracts/noteRepositoryContract';
import { SQLiteDatabaseService } from '../SQLiteDatabaseService';
import { SQLiteNoteRepository } from '../SQLiteNoteRepository';
import { SqlJsTestDriver } from '../testing/SqlJsTestDriver';
import { deleteTask, seedTask } from '../testing/repositoryTestUtils';

function createNoteTestContext() {
  const service = new SQLiteDatabaseService({ driver: new SqlJsTestDriver() });
  const repository = new SQLiteNoteRepository(service);
  return { repository, service };
}

let context: ReturnType<typeof createNoteTestContext>;

beforeEach(() => {
  context = createNoteTestContext();
});

afterEach(async () => {
  await context.service.close();
});

describeNoteRepositoryContract({
  createRepository: () => context.repository,
  seedParentTask: taskId => seedTask(context.service, taskId),
  seedNote: async note => {
    const db = await context.service.getDb();
    await db.run(`
      INSERT INTO notes (id, task_id, title, context, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, [note.id, note.taskId, note.title ?? null, note.context, note.timestamp ?? null]);
  },
  expectDeleted: async (_id, taskId) => {
    await expect(context.repository.listByTask(taskId)).resolves.toEqual([
      expect.objectContaining({ id: '1' }),
    ]);
  },
});

describe('SQLiteNoteRepository relational behavior', () => {
  it('rejects create when parent task is missing', async () => {
    await expect(context.repository.create({
      taskId: 'missing',
      title: 'No parent',
      context: 'Body',
    })).rejects.toThrow();
  });

  it('cascades delete when parent task is deleted', async () => {
    await seedTask(context.service, '42');
    await context.repository.create({ taskId: '42', title: 'Note', context: 'Body' });

    await deleteTask(context.service, '42');

    await expect(context.repository.listByTask('42')).resolves.toEqual([]);
  });

  it('rolls back create when using the provided transaction context', async () => {
    await seedTask(context.service, '42');

    await expect(context.service.transaction(async tx => {
      await context.repository.create({ taskId: '42', title: 'Note', context: 'Body' }, { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.listByTask('42')).resolves.toEqual([]);
  });

  it('rolls back delete when using the provided transaction context', async () => {
    await seedTask(context.service, '42');
    const note = await context.repository.create({ taskId: '42', title: 'Note', context: 'Body' });

    await expect(context.service.transaction(async tx => {
      await context.repository.delete(note.id, { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.listByTask('42')).resolves.toEqual([
      expect.objectContaining({ id: note.id }),
    ]);
  });
});
