import type { ReminderRepository } from '../contracts';

type ReminderRepositoryContractOptions = {
  createRepository: () => ReminderRepository;
  seedReminder: (reminder: {
    id: string;
    taskId: string;
    dueDate: string;
    notificationMethod?: string | null;
    message?: string | null;
  }) => Promise<void> | void;
  seedParentTask?: (taskId: string) => Promise<void> | void;
  expectDeleted: (id: string, taskId: string) => Promise<void> | void;
};

export function describeReminderRepositoryContract({
  createRepository,
  seedReminder,
  seedParentTask,
  expectDeleted,
}: ReminderRepositoryContractOptions) {
  describe('ReminderRepository contract', () => {
    it('lists, creates, updates, and deletes reminders as domain models', async () => {
      const repository = createRepository();
      await seedParentTask?.('42');
      await seedReminder({
        id: '1',
        taskId: '42',
        dueDate: '2026-07-03T09:00:00',
        notificationMethod: 'browser',
        message: 'Existing reminder',
      });

      await expect(repository.listByTask('42')).resolves.toEqual([
        expect.objectContaining({
          id: '1',
          taskId: '42',
          dueDate: '2026-07-03T09:00:00',
          notificationMethod: 'browser',
          message: 'Existing reminder',
        }),
      ]);

      const created = await repository.create({
        taskId: '42',
        dueDate: '2026-07-04T09:00:00',
        message: 'Created reminder',
      });
      expect(created).toEqual(expect.objectContaining({
        id: expect.any(String),
        taskId: '42',
        dueDate: '2026-07-04T09:00:00',
        message: 'Created reminder',
      }));

      await expect(repository.updateDueDate(created.id, '2026-07-05T09:00:00'))
        .resolves.toEqual(expect.objectContaining({
          id: created.id,
          taskId: '42',
          dueDate: '2026-07-05T09:00:00',
        }));

      await repository.delete(created.id);
      await expectDeleted(created.id, '42');
    });
  });
}
