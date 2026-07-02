import type { CreateTaskInput, Task as DomainTask, UpdateTaskInput } from '../../../domain/models';
import type { Task as RestTask } from '../../../types/task';
import {
  createdAtOrMissing,
  optionalToApiId,
  toDomainId,
  updatedAtFromRest,
} from './mapperUtils';
import { mapTagDtoToDomain } from './TagMapper';

export function mapTaskDtoToDomain(dto: RestTask): DomainTask {
  return {
    id: toDomainId(dto.taskID),
    title: dto.title,
    description: dto.description ?? '',
    dateTimeScheduled: dto.dateTimeScheduled ?? null,
    endDateTimeScheduled: dto.endDateTimeScheduled ?? null,
    statusId: dto.statusID ?? null,
    scheduleId: dto.scheduleID === null || dto.scheduleID === undefined ? null : toDomainId(dto.scheduleID),
    recurrenceRuleId: dto.recurrenceRuleID === null || dto.recurrenceRuleID === undefined ? null : toDomainId(dto.recurrenceRuleID),
    projectId: dto.projectID === null || dto.projectID === undefined ? null : toDomainId(dto.projectID),
    priority: dto.priority ?? null,
    tags: dto.tags?.map(mapTagDtoToDomain),
    createdAt: createdAtOrMissing(dto.createdAt),
    updatedAt: updatedAtFromRest(dto.createdAt),
  };
}

export function mapCreateTaskInputToDto(input: CreateTaskInput): Omit<RestTask, 'taskID'> {
  return {
    title: input.title,
    description: input.description ?? '',
    dateTimeScheduled: input.dateTimeScheduled ?? null,
    endDateTimeScheduled: input.endDateTimeScheduled ?? null,
    statusID: input.statusId ?? null,
    projectID: optionalToApiId(input.projectId),
    priority: input.priority ?? null,
  };
}

export function mapUpdateTaskInputToDto(input: UpdateTaskInput): Omit<RestTask, 'taskID'> {
  return {
    ...mapCreateTaskInputToDto(input),
    recurrenceRuleID: optionalToApiId(input.recurrenceRuleId),
  };
}
