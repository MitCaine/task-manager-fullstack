import type { CreateTaskInput, Task as DomainTask, UpdateTaskInput } from '../../../domain/models';
import type { Task as RestTask } from '../../../types/task';
import {
  createdAtFromRest,
  optionalToApiId,
  toOptionalDomainId,
  toRequiredDomainId,
  updatedAtFromRest,
} from './mapperUtils';
import { mapStatusIdDomainToDto, mapStatusIdDtoToDomain } from './StatusMapper';
import { mapTagDtoToDomain } from './TagMapper';

export function mapTaskDtoToDomain(dto: RestTask): DomainTask {
  return {
    id: toRequiredDomainId(dto.taskID, 'taskID'),
    title: dto.title,
    description: dto.description ?? '',
    dateTimeScheduled: dto.dateTimeScheduled ?? null,
    endDateTimeScheduled: dto.endDateTimeScheduled ?? null,
    statusId: mapStatusIdDtoToDomain(dto.statusID),
    scheduleId: toOptionalDomainId(dto.scheduleID),
    recurrenceRuleId: dto.recurrenceRuleID === undefined ? undefined : toOptionalDomainId(dto.recurrenceRuleID),
    projectId: toOptionalDomainId(dto.projectID),
    priority: dto.priority ?? null,
    tags: dto.tags?.map(mapTagDtoToDomain),
    createdAt: createdAtFromRest(dto.createdAt),
    updatedAt: updatedAtFromRest(null),
  };
}

export function mapCreateTaskInputToDto(input: CreateTaskInput): Omit<RestTask, 'taskID'> {
  return {
    title: input.title,
    description: input.description ?? '',
    dateTimeScheduled: input.dateTimeScheduled ?? null,
    endDateTimeScheduled: input.endDateTimeScheduled ?? null,
    statusID: mapStatusIdDomainToDto(input.statusId),
    projectID: optionalToApiId(input.projectId),
    priority: input.priority ?? null,
  };
}

export function mapUpdateTaskInputToDto(input: UpdateTaskInput): Omit<RestTask, 'taskID'> {
  const dto: Omit<RestTask, 'taskID'> = {
    title: input.title,
  };

  if (input.description !== undefined) dto.description = input.description;
  if (input.dateTimeScheduled !== undefined) dto.dateTimeScheduled = input.dateTimeScheduled;
  if (input.endDateTimeScheduled !== undefined) dto.endDateTimeScheduled = input.endDateTimeScheduled;
  if (input.statusId !== undefined) dto.statusID = mapStatusIdDomainToDto(input.statusId);
  if (input.projectId !== undefined) dto.projectID = input.projectId === null ? null : optionalToApiId(input.projectId);
  if (input.priority !== undefined) dto.priority = input.priority;
  if (input.recurrenceRuleId !== undefined) {
    dto.recurrenceRuleID = input.recurrenceRuleId === null ? null : optionalToApiId(input.recurrenceRuleId);
  }

  return dto;
}
