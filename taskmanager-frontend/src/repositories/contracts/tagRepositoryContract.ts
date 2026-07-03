import type { TagRepository } from '../contracts';

type TagRepositoryContractOptions = {
  createRepository: () => TagRepository;
  seedTag: (tag: {
    id: string;
    title: string;
    color?: string | null;
  }) => Promise<void> | void;
  expectDeleted: (id: string) => Promise<void> | void;
};

export function describeTagRepositoryContract({
  createRepository,
  seedTag,
  expectDeleted,
}: TagRepositoryContractOptions) {
  describe('TagRepository contract', () => {
    it('lists, creates, updates, and deletes tags as domain models', async () => {
      const repository = createRepository();
      await seedTag({
        id: '1',
        title: 'Existing tag',
        color: '#6366f1',
      });

      await expect(repository.list()).resolves.toEqual([
        expect.objectContaining({
          id: '1',
          title: 'Existing tag',
          color: '#6366f1',
        }),
      ]);

      const created = await repository.create({
        title: 'Created tag',
        color: null,
      });
      expect(created).toEqual(expect.objectContaining({
        id: expect.any(String),
        title: 'Created tag',
        color: null,
      }));

      await expect(repository.update(created.id, {
        title: 'Updated tag',
        color: '#22c55e',
      })).resolves.toEqual(expect.objectContaining({
        id: created.id,
        title: 'Updated tag',
        color: '#22c55e',
      }));

      await repository.delete(created.id);
      await expectDeleted(created.id);
    });
  });
}
