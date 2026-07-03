import { createAttachment, deleteAttachment, getAttachments } from '../../api/tasks';
import type { Attachment } from '../../types/task';
import { describeAttachmentRepositoryContract } from '../contracts/attachmentRepositoryContract';
import { ApiAttachmentRepository } from './ApiAttachmentRepository';

jest.mock('../../api/tasks');

const mockGetAttachments = getAttachments as jest.MockedFunction<typeof getAttachments>;
const mockCreateAttachment = createAttachment as jest.MockedFunction<typeof createAttachment>;
const mockDeleteAttachment = deleteAttachment as jest.MockedFunction<typeof deleteAttachment>;

let nextAttachmentId = 100;
const attachmentStore = new Map<number, Attachment>();
const deletedAttachmentIds = new Set<number>();

function installAttachmentApiMocks() {
  mockGetAttachments.mockImplementation(async taskId => (
    Array.from(attachmentStore.values()).filter(attachment => attachment.taskID === taskId)
  ));
  mockCreateAttachment.mockImplementation(async (taskId, fileORLink, metadata) => {
    const attachment: Attachment = {
      attachmentID: nextAttachmentId++,
      taskID: taskId,
      fileORLink,
      metadata,
      fileSize: 0,
    };
    attachmentStore.set(attachment.attachmentID, attachment);
    return attachment;
  });
  mockDeleteAttachment.mockImplementation(async id => {
    deletedAttachmentIds.add(id);
    attachmentStore.delete(id);
  });
}

beforeEach(() => {
  nextAttachmentId = 100;
  attachmentStore.clear();
  deletedAttachmentIds.clear();
  jest.clearAllMocks();
  installAttachmentApiMocks();
});

describeAttachmentRepositoryContract({
  createRepository: () => new ApiAttachmentRepository(),
  seedAttachment: attachment => {
    attachmentStore.set(Number(attachment.id), {
      attachmentID: Number(attachment.id),
      taskID: Number(attachment.taskId),
      fileORLink: attachment.fileOrLink,
      metadata: attachment.metadata,
      fileSize: attachment.fileSize ?? 0,
    });
  },
  expectDeleted: id => {
    expect(deletedAttachmentIds.has(Number(id))).toBe(true);
  },
});
