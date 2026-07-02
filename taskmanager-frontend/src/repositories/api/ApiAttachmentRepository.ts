import { createAttachment, deleteAttachment, getAttachments } from '../../api/tasks';
import type { Attachment, CreateAttachmentInput, EntityId } from '../../domain/models';
import type { AttachmentRepository } from '../contracts';
import { mapAttachmentDtoToDomain, mapCreateAttachmentInputToApiArgs } from './mappers/AttachmentMapper';
import { toApiId } from './mappers/mapperUtils';

export class ApiAttachmentRepository implements AttachmentRepository {
  async listByTask(taskId: EntityId): Promise<Attachment[]> {
    const attachments = await getAttachments(toApiId(taskId));
    return attachments.map(mapAttachmentDtoToDomain);
  }

  async create(input: CreateAttachmentInput): Promise<Attachment> {
    const args = mapCreateAttachmentInputToApiArgs(input);
    return mapAttachmentDtoToDomain(await createAttachment(args.taskId, args.fileOrLink, args.metadata));
  }

  async delete(id: EntityId): Promise<void> {
    await deleteAttachment(toApiId(id));
  }
}
