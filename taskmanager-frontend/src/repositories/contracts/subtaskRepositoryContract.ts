import type { SubtaskRepository } from '../contracts';

type SubtaskRepositoryContractOptions = {
  createRepository: () => SubtaskRepository;
  seedSubtask: (subtask: {
    id: string;
    parentTaskId: string;
    title: string;
    statusId?: 'not_started' | 'in_progress' | 'completed' | null;
    dateTimeScheduled?: string | null;
  }) => Promise<void> | void;
  seedParentTask?: (taskId: string) => Promise<void> | void;
  expectDeleted: (id: string, taskId: string) => Promise<void> | void;
};

export function describeSubtaskRepositoryContract({
  createRepository,
  seedSubtask,
  seedParentTask,
  expectDeleted,
}: SubtaskRepositoryContractOptions) {
  describe('SubtaskRepository contract', () => {
    it('lists, creates, updates, updates status, and deletes subtasks as domain models', async () => {
      const repository = createRepository();
      await seedParentTask?.('42');
      await seedSubtask({
        id: '1',
        parentTaskId: '42',
        title: 'Existing subtask',
        statusId: 'not_started',
        dateTimeScheduled: '2026-07-02T10:00:00',
      });

      await expect(repository.listByTask('42')).resolves.toEqual([
        expect.objectContaining({
          id: '1',
          parentTaskId: '42',
          title: 'Existing subtask',
          statusId: 'not_started',
        }),
      ]);

      const created = await repository.create({
        parentTaskId: '42',
        title: 'Created subtask',
      });
      expect(created).toEqual(expect.objectContaining({
        id: expect.any(String),
        parentTaskId: '42',
        title: 'Created subtask',
      }));

      await expect(repository.update(created.id, {
        title: 'Updated subtask',
      })).resolves.toEqual(expect.objectContaining({
        id: created.id,
        parentTaskId: '42',
        title: 'Updated subtask',
      }));

      await expect(repository.updateStatus(created.id, 'completed'))
        .resolves.toEqual(expect.objectContaining({
          id: created.id,
          parentTaskId: '42',
          statusId: 'completed',
        }));

      await repository.delete(created.id);
      await expectDeleted(created.id, '42');
    });
  });
}
