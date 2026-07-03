import type { RecurrenceRepository } from '../contracts';

type RecurrenceRepositoryContractOptions = {
  createRepository: () => RecurrenceRepository;
  seedTask: (task: {
    id: string;
    title: string;
    dateTimeScheduled?: string | null;
  }) => Promise<void> | void;
};

export function describeRecurrenceRepositoryContract({
  createRepository,
  seedTask,
}: RecurrenceRepositoryContractOptions) {
  describe('RecurrenceRepository contract', () => {
    it('sets, reads, updates, and clears recurrence for a task', async () => {
      const repository = createRepository();
      await seedTask({
        id: '42',
        title: 'Recurring task',
        dateTimeScheduled: '2026-07-03T10:00:00',
      });

      const createdTask = await repository.setForTask('42', {
        intervalUnit: 'week',
        intervalValue: 2,
      });
      expect(createdTask).toEqual(expect.objectContaining({
        id: '42',
        recurrenceRuleId: expect.any(String),
      }));

      await expect(repository.getByTask('42')).resolves.toEqual(expect.objectContaining({
        id: createdTask.recurrenceRuleId,
        intervalUnit: 'week',
        intervalValue: 2,
        timesOfRecurrence: 0,
      }));

      const updatedTask = await repository.setForTask('42', {
        intervalUnit: 'month',
        intervalValue: 1,
      });
      expect(updatedTask).toEqual(expect.objectContaining({
        id: '42',
        recurrenceRuleId: createdTask.recurrenceRuleId,
      }));
      await expect(repository.getByTask('42')).resolves.toEqual(expect.objectContaining({
        id: createdTask.recurrenceRuleId,
        intervalUnit: 'month',
        intervalValue: 1,
      }));

      await expect(repository.setForTask('42', null)).resolves.toEqual(expect.objectContaining({
        id: '42',
        recurrenceRuleId: null,
      }));
      await expect(repository.getByTask('42')).rejects.toThrow();
    });
  });
}
