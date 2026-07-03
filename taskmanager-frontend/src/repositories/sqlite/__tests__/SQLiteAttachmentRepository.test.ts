import { describeAttachmentRepositoryContract } from '../../contracts/attachmentRepositoryContract';
import { SQLiteAttachmentRepository } from '../SQLiteAttachmentRepository';
import { SQLiteDatabaseService } from '../SQLiteDatabaseService';
import { SqlJsTestDriver } from '../testing/SqlJsTestDriver';
import { deleteTask, seedTask } from '../testing/repositoryTestUtils';

function createAttachmentTestContext() {
  const service = new SQLiteDatabaseService({ driver: new SqlJsTestDriver() });
  const repository = new SQLiteAttachmentRepository(service);
  return { repository, service };
}

let context: ReturnType<typeof createAttachmentTestContext>;

beforeEach(() => {
  context = createAttachmentTestContext();
});

afterEach(async () => {
  await context.service.close();
});

describeAttachmentRepositoryContract({
  createRepository: () => context.repository,
  seedParentTask: taskId => seedTask(context.service, taskId),
  seedAttachment: async attachment => {
    const db = await context.service.getDb();
    await db.run(`
      INSERT INTO attachments (id, task_id, file_or_link, metadata, file_size)
      VALUES (?, ?, ?, ?, ?)
    `, [
      attachment.id,
      attachment.taskId,
      attachment.fileOrLink,
      attachment.metadata ?? null,
      attachment.fileSize ?? 0,
    ]);
  },
  expectDeleted: async (_id, taskId) => {
    await expect(context.repository.listByTask(taskId)).resolves.toEqual([
      expect.objectContaining({ id: '1' }),
    ]);
  },
});

describe('SQLiteAttachmentRepository relational behavior', () => {
  it('rejects create when parent task is missing', async () => {
    await expect(context.repository.create({
      taskId: 'missing',
      fileOrLink: 'https://example.com/missing',
    })).rejects.toThrow();
  });

  it('cascades delete when parent task is deleted', async () => {
    await seedTask(context.service, '42');
    await context.repository.create({
      taskId: '42',
      fileOrLink: 'https://example.com/file',
    });

    await deleteTask(context.service, '42');

    await expect(context.repository.listByTask('42')).resolves.toEqual([]);
  });

  it('rolls back create when using the provided transaction context', async () => {
    await seedTask(context.service, '42');

    await expect(context.service.transaction(async tx => {
      await context.repository.create({
        taskId: '42',
        fileOrLink: 'https://example.com/file',
      }, { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.listByTask('42')).resolves.toEqual([]);
  });

  it('rolls back delete when using the provided transaction context', async () => {
    await seedTask(context.service, '42');
    const attachment = await context.repository.create({
      taskId: '42',
      fileOrLink: 'https://example.com/file',
    });

    await expect(context.service.transaction(async tx => {
      await context.repository.delete(attachment.id, { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.listByTask('42')).resolves.toEqual([
      expect.objectContaining({ id: attachment.id }),
    ]);
  });
});
