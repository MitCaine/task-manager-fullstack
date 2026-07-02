import type { CreateTaskInput, Task as DomainTask, UpdateTaskInput } from '../../../domain/models';
import type { Task as RestTask } from '../../../types/task';
import {
  createdAtFromRest,
  optionalToApiId,
  toOptionalDomainId,
  toRequiredDomainId,
  updatedAtFromRest,
} from './mapperUtils';
import { mapTagDtoToDomain } from './TagMapper';

export function mapTaskDtoToDomain(dto: RestTask): DomainTask {
  return {
    id: toRequiredDomainId(dto.taskID, 'taskID'),
    title: dto.title,
    description: dto.description ?? '',
    dateTimeScheduled: dto.dateTimeScheduled ?? null,
    endDateTimeScheduled: dto.endDateTimeScheduled ?? null,
    statusId: dto.statusID ?? null,
    scheduleId: toOptionalDomainId(dto.scheduleID),
    recurrenceRuleId: toOptionalDomainId(dto.recurrenceRuleID),
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
