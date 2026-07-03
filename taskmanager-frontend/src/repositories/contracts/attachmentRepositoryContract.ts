import type { AttachmentRepository } from '../contracts';

type AttachmentRepositoryContractOptions = {
  createRepository: () => AttachmentRepository;
  seedAttachment: (attachment: {
    id: string;
    taskId: string;
    fileOrLink: string;
    metadata?: string | null;
    fileSize?: number | null;
  }) => Promise<void> | void;
  seedParentTask?: (taskId: string) => Promise<void> | void;
  expectDeleted: (id: string, taskId: string) => Promise<void> | void;
};

export function describeAttachmentRepositoryContract({
  createRepository,
  seedAttachment,
  seedParentTask,
  expectDeleted,
}: AttachmentRepositoryContractOptions) {
  describe('AttachmentRepository contract', () => {
    it('lists, creates, and deletes attachments as domain models', async () => {
      const repository = createRepository();
      await seedParentTask?.('42');
      await seedAttachment({
        id: '1',
        taskId: '42',
        fileOrLink: 'https://example.com/existing',
        metadata: 'existing metadata',
        fileSize: 10,
      });

      await expect(repository.listByTask('42')).resolves.toEqual([
        expect.objectContaining({
          id: '1',
          taskId: '42',
          fileOrLink: 'https://example.com/existing',
          metadata: 'existing metadata',
          fileSize: 10,
        }),
      ]);

      const created = await repository.create({
        taskId: '42',
        fileOrLink: 'https://example.com/created',
        metadata: 'created metadata',
      });
      expect(created).toEqual(expect.objectContaining({
        id: expect.any(String),
        taskId: '42',
        fileOrLink: 'https://example.com/created',
        metadata: 'created metadata',
      }));

      await repository.delete(created.id);
      await expectDeleted(created.id, '42');
    });
  });
}
