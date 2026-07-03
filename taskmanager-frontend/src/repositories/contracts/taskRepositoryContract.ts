import type { TaskRepository } from '../contracts';
import type { StatusId } from '../../domain/models';

type TaskRepositoryContractOptions = {
  createRepository: () => TaskRepository;
  seedProject?: (project: { id: string; title: string }) => Promise<void> | void;
  seedTag?: (tag: { id: string; title: string; color?: string | null }) => Promise<void> | void;
  seedTask: (task: {
    id: string;
    title: string;
    description?: string;
    statusId?: StatusId | null;
    projectId?: string | null;
  }) => Promise<void> | void;
  expectDeleted: (id: string) => Promise<void> | void;
};

export function describeTaskRepositoryContract({
  createRepository,
  seedProject,
  seedTag,
  seedTask,
  expectDeleted,
}: TaskRepositoryContractOptions) {
  describe('TaskRepository contract', () => {
    it('creates, reads, updates, changes status, mutates tags, and deletes tasks as domain models', async () => {
      const repository = createRepository();
      await seedProject?.({ id: '10', title: 'Work' });
      await seedTag?.({ id: '5', title: 'Focus', color: '#6366f1' });
      await seedTask({ id: '1', title: 'Existing task', description: 'Old', statusId: null, projectId: null });

      const created = await repository.create({
        title: 'Created task',
        description: 'New',
        statusId: 'not_started',
        projectId: '10',
      });
      expect(created).toEqual(expect.objectContaining({
        id: expect.any(String),
        title: 'Created task',
        description: 'New',
        statusId: 'not_started',
        projectId: '10',
      }));

      await expect(repository.get('1')).resolves.toEqual(expect.objectContaining({
        id: '1',
        title: 'Existing task',
      }));

      await expect(repository.update('1', {
        title: 'Updated task',
        description: 'Changed',
        statusId: null,
      })).resolves.toEqual(expect.objectContaining({
        id: '1',
        title: 'Updated task',
        description: 'Changed',
      }));

      await expect(repository.updateStatus('1', 'completed')).resolves.toEqual(expect.objectContaining({
        id: '1',
        statusId: 'completed',
      }));

      await expect(repository.addTag('1', '5')).resolves.toEqual(expect.objectContaining({
        id: '1',
        tags: [expect.objectContaining({ id: '5' })],
      }));

      await expect(repository.removeTag('1', '5')).resolves.toEqual(expect.objectContaining({
        id: '1',
        tags: [],
      }));

      await repository.delete('1');
      await expectDeleted('1');
    });
  });
}
