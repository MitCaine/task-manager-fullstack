import type { CreateSubtaskInput, Subtask as DomainSubtask, UpdateSubtaskInput } from '../../../domain/models';
import type { Subtask as RestSubtask } from '../../../types/task';
import { toApiId, toRequiredDomainId } from './mapperUtils';
import { mapStatusIdDtoToDomain } from './StatusMapper';

export function mapSubtaskDtoToDomain(dto: RestSubtask): DomainSubtask {
  return {
    id: toRequiredDomainId(dto.subTaskID, 'subTaskID'),
    parentTaskId: toRequiredDomainId(dto.parentTaskID, 'parentTaskID'),
    title: dto.title,
    statusId: mapStatusIdDtoToDomain(dto.statusID),
    dateTimeScheduled: dto.dateTimeScheduled ?? null,
    createdAt: null,
    updatedAt: null,
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
