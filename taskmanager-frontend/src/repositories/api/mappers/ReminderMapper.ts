import type { CreateReminderInput, Reminder as DomainReminder } from '../../../domain/models';
import type { Reminder as RestReminder } from '../../../types/task';
import { MISSING_REST_TIMESTAMP, toApiId, toDomainId } from './mapperUtils';

export function mapReminderDtoToDomain(dto: RestReminder): DomainReminder {
  return {
    id: toDomainId(dto.reminderID),
    taskId: toDomainId(dto.taskID),
    dueDate: dto.dueDate,
    notificationMethod: dto.notificationMethod ?? null,
    message: dto.message ?? null,
    createdAt: MISSING_REST_TIMESTAMP,
    updatedAt: MISSING_REST_TIMESTAMP,
  };
}

export function mapCreateReminderInputToApiArgs(input: CreateReminderInput): { taskId: number; dueDate: string; message: string } {
  return {
    taskId: toApiId(input.taskId),
    dueDate: input.dueDate,
    message: input.message ?? '',
  };
}
