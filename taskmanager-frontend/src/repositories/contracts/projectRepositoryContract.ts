import type { ProjectRepository } from '../contracts';

type ProjectRepositoryContractOptions = {
  createRepository: () => ProjectRepository;
  seedProject: (project: {
    id: string;
    title: string;
    description?: string | null;
    dueDate?: string | null;
  }) => Promise<void> | void;
  expectDeleted: (id: string) => Promise<void> | void;
};

export function describeProjectRepositoryContract({
  createRepository,
  seedProject,
  expectDeleted,
}: ProjectRepositoryContractOptions) {
  describe('ProjectRepository contract', () => {
    it('lists, creates, updates, and deletes projects as domain models', async () => {
      const repository = createRepository();
      await seedProject({
        id: '1',
        title: 'Existing project',
        description: 'Old description',
        dueDate: '2026-08-01T00:00:00',
      });

      await expect(repository.list()).resolves.toEqual([
        expect.objectContaining({
          id: '1',
          title: 'Existing project',
          description: 'Old description',
          dueDate: '2026-08-01T00:00:00',
        }),
      ]);

      const created = await repository.create({
        title: 'Created project',
        description: null,
        dueDate: null,
      });
      expect(created).toEqual(expect.objectContaining({
        id: expect.any(String),
        title: 'Created project',
        description: null,
        dueDate: null,
      }));

      await expect(repository.update(created.id, {
        title: 'Updated project',
        description: 'New description',
        dueDate: '2026-09-01T00:00:00',
      })).resolves.toEqual(expect.objectContaining({
        id: created.id,
        title: 'Updated project',
        description: 'New description',
        dueDate: '2026-09-01T00:00:00',
      }));

      await expect(repository.update(created.id, {
        title: 'Patch title only',
      })).resolves.toEqual(expect.objectContaining({
        id: created.id,
        title: 'Patch title only',
        description: 'New description',
        dueDate: '2026-09-01T00:00:00',
      }));

      await expect(repository.update(created.id, {
        title: 'Clear nullable fields',
        description: null,
        dueDate: null,
      })).resolves.toEqual(expect.objectContaining({
        id: created.id,
        title: 'Clear nullable fields',
        description: null,
        dueDate: null,
      }));

      await expect(repository.update(created.id, {
        title: 'Replace nullable fields',
        description: 'Replacement description',
        dueDate: '2026-10-01T00:00:00',
      })).resolves.toEqual(expect.objectContaining({
        id: created.id,
        title: 'Replace nullable fields',
        description: 'Replacement description',
        dueDate: '2026-10-01T00:00:00',
      }));

      await repository.delete(created.id);
      await expectDeleted(created.id);
    });
  });
}
