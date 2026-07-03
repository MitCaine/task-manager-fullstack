import { describeTagRepositoryContract } from '../../contracts/tagRepositoryContract';
import { SQLiteDatabaseService } from '../SQLiteDatabaseService';
import { SQLiteTagRepository } from '../SQLiteTagRepository';
import { SqlJsTestDriver } from '../testing/SqlJsTestDriver';

function createTagTestContext() {
  const service = new SQLiteDatabaseService({ driver: new SqlJsTestDriver() });
  const repository = new SQLiteTagRepository(service);
  return { repository, service };
}

let context: ReturnType<typeof createTagTestContext>;

beforeEach(() => {
  context = createTagTestContext();
});

afterEach(async () => {
  await context.service.close();
});

describeTagRepositoryContract({
  createRepository: () => context.repository,
  seedTag: async tag => {
    const db = await context.service.getDb();
    await db.run(`
      INSERT INTO tags (id, title, color)
      VALUES (?, ?, ?)
    `, [tag.id, tag.title, tag.color ?? null]);
  },
  expectDeleted: async id => {
    const tags = await context.repository.list();
    expect(tags.find(tag => tag.id === id)).toBeUndefined();
  },
});

describe('SQLiteTagRepository transactions', () => {
  it('uses the provided transaction context', async () => {
    await expect(context.service.transaction(async tx => {
      await context.repository.create({ title: 'Rolled back tag', color: '#6366f1' }, { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(context.repository.list()).resolves.toEqual([]);
  });
});
