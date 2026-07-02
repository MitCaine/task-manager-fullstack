import type { Attachment as DomainAttachment, CreateAttachmentInput } from '../../../domain/models';
import type { Attachment as RestAttachment } from '../../../types/task';
import { MISSING_REST_TIMESTAMP, toApiId, toDomainId } from './mapperUtils';

export function mapAttachmentDtoToDomain(dto: RestAttachment): DomainAttachment {
  return {
    id: toDomainId(dto.attachmentID),
    taskId: toDomainId(dto.taskID),
    fileOrLink: dto.fileORLink,
    metadata: dto.metadata ?? null,
    fileSize: dto.fileSize ?? null,
    mimeType: null,
    localFilePath: null,
    createdAt: MISSING_REST_TIMESTAMP,
    updatedAt: MISSING_REST_TIMESTAMP,
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
