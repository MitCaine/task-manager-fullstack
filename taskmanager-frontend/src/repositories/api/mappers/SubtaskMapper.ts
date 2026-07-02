import type { CreateSubtaskInput, Subtask as DomainSubtask, UpdateSubtaskInput } from '../../../domain/models';
import type { Subtask as RestSubtask } from '../../../types/task';
import { MISSING_REST_TIMESTAMP, toApiId, toDomainId } from './mapperUtils';

export function mapSubtaskDtoToDomain(dto: RestSubtask): DomainSubtask {
  return {
    id: toDomainId(dto.subTaskID),
    parentTaskId: toDomainId(dto.parentTaskID),
    title: dto.title,
    statusId: dto.statusID ?? null,
    dateTimeScheduled: dto.dateTimeScheduled ?? null,
    createdAt: MISSING_REST_TIMESTAMP,
    updatedAt: MISSING_REST_TIMESTAMP,
  };
}

export function mapCreateSubtaskInputToApiArgs(input: CreateSubtaskInput): { taskId: number; title: string } {
  return {
    taskId: toApiId(input.parentTaskId),
    title: input.title,
  };
}

export function mapUpdateSubtaskInputToApiTitle(input: UpdateSubtaskInput): string {
  return input.title;
}
