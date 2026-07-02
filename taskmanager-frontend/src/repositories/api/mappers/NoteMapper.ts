import type { CreateNoteInput, Note as DomainNote } from '../../../domain/models';
import type { Note as RestNote } from '../../../types/task';
import { toApiId, toRequiredDomainId } from './mapperUtils';

export function mapNoteDtoToDomain(dto: RestNote): DomainNote {
  return {
    id: toRequiredDomainId(dto.noteID, 'noteID'),
    taskId: toRequiredDomainId(dto.taskID, 'taskID'),
    title: dto.title ?? null,
    context: dto.context,
    timestamp: dto.timestamp ?? null,
    createdAt: dto.timestamp ?? null,
    updatedAt: dto.timestamp ?? null,
  };
}

export function mapCreateNoteInputToApiArgs(input: CreateNoteInput): { taskId: number; title: string; context: string } {
  return {
    taskId: toApiId(input.taskId),
    title: input.title ?? '',
    context: input.context,
  };
}
