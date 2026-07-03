import { describeProjectRepositoryContract } from '../../contracts/projectRepositoryContract';
import { SQLiteDatabaseService } from '../SQLiteDatabaseService';
import { SQLiteProjectRepository } from '../SQLiteProjectRepository';
import { SqlJsTestDriver } from '../testing/SqlJsTestDriver';

function createProjectTestContext() {
  const service = new SQLiteDatabaseService({ driver: new SqlJsTestDriver() });
  const repository = new SQLiteProjectRepository(service);
  return { repository, service };
}

let context: ReturnType<typeof createProjectTestContext>;

beforeEach(() => {
  context = createProjectTestContext();
});

afterEach(async () => {
  await context.service.close();
});

describeProjectRepositoryContract({
  createRepository: () => context.repository,
  seedProject: async project => {
    const db = await context.service.getDb();
    await db.run(`
      INSERT INTO projects (id, title, description, due_date)
      VALUES (?, ?, ?, ?)
    `, [project.id, project.title, project.description ?? null, project.dueDate ?? null]);
  },
  expectDeleted: async id => {
    const projects = await context.repository.list();
    expect(projects.find(project => project.id === id)).toBeUndefined();
  },
});

describe('SQLiteProjectRepository transactions', () => {
  it('uses the provided transaction context', async () => {
    const { repository, service } = createProjectTestContext();

    await expect(service.transaction(async tx => {
      await repository.create({ title: 'Rolled back project' }, { tx });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');

    await expect(repository.list()).resolves.toEqual([]);
  });
});
