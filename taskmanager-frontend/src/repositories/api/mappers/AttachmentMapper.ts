import type { Attachment as DomainAttachment, CreateAttachmentInput } from '../../../domain/models';
import type { Attachment as RestAttachment } from '../../../types/task';
import { toApiId, toRequiredDomainId } from './mapperUtils';

export function mapAttachmentDtoToDomain(dto: RestAttachment): DomainAttachment {
  return {
    id: toRequiredDomainId(dto.attachmentID, 'attachmentID'),
    taskId: toRequiredDomainId(dto.taskID, 'taskID'),
    fileOrLink: dto.fileORLink,
    metadata: dto.metadata ?? null,
    fileSize: dto.fileSize ?? null,
    mimeType: null,
    localFilePath: null,
    createdAt: null,
    updatedAt: null,
  };
}

export function mapCreateAttachmentInputToApiArgs(input: CreateAttachmentInput): {
  taskId: number;
  fileOrLink: string;
  metadata: string;
} {
  return {
    taskId: toApiId(input.taskId),
    fileOrLink: input.fileOrLink,
    metadata: input.metadata ?? '',
  };
}
