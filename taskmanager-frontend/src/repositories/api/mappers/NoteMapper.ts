import type { CreateNoteInput, Note as DomainNote } from '../../../domain/models';
import type { Note as RestNote } from '../../../types/task';
import { MISSING_REST_TIMESTAMP, toApiId, toDomainId } from './mapperUtils';

export function mapNoteDtoToDomain(dto: RestNote): DomainNote {
  return {
    id: toDomainId(dto.noteID),
    taskId: toDomainId(dto.taskID),
    title: dto.title ?? null,
    context: dto.context,
    timestamp: dto.timestamp ?? null,
    createdAt: dto.timestamp ?? MISSING_REST_TIMESTAMP,
    updatedAt: dto.timestamp ?? MISSING_REST_TIMESTAMP,
  };
}

export function mapCreateNoteInputToApiArgs(input: CreateNoteInput): { taskId: number; title: string; context: string } {
  return {
    taskId: toApiId(input.taskId),
    title: input.title ?? '',
    context: input.context,
  };
}
