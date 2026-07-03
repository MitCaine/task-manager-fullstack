import type { NoteRepository } from '../contracts';

type NoteRepositoryContractOptions = {
  createRepository: () => NoteRepository;
  seedNote: (note: {
    id: string;
    taskId: string;
    title?: string | null;
    context: string;
    timestamp?: string | null;
  }) => Promise<void> | void;
  seedParentTask?: (taskId: string) => Promise<void> | void;
  expectDeleted: (id: string, taskId: string) => Promise<void> | void;
};

export function describeNoteRepositoryContract({
  createRepository,
  seedNote,
  seedParentTask,
  expectDeleted,
}: NoteRepositoryContractOptions) {
  describe('NoteRepository contract', () => {
    it('lists, creates, and deletes notes as domain models', async () => {
      const repository = createRepository();
      await seedParentTask?.('42');
      await seedNote({
        id: '1',
        taskId: '42',
        title: 'Existing note',
        context: 'Existing context',
        timestamp: '2026-07-02T10:00:00',
      });

      await expect(repository.listByTask('42')).resolves.toEqual([
        expect.objectContaining({
          id: '1',
          taskId: '42',
          title: 'Existing note',
          context: 'Existing context',
          timestamp: '2026-07-02T10:00:00',
        }),
      ]);

      const created = await repository.create({
        taskId: '42',
        title: null,
        context: 'Created context',
      });
      expect(created).toEqual(expect.objectContaining({
        id: expect.any(String),
        taskId: '42',
        context: 'Created context',
      }));

      await repository.delete(created.id);
      await expectDeleted(created.id, '42');
    });
  });
}
