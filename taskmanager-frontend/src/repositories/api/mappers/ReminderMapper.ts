import type { CreateReminderInput, Reminder as DomainReminder } from '../../../domain/models';
import type { Reminder as RestReminder } from '../../../types/task';
import { toApiId, toRequiredDomainId } from './mapperUtils';

export function mapReminderDtoToDomain(dto: RestReminder): DomainReminder {
  return {
    id: toRequiredDomainId(dto.reminderID, 'reminderID'),
    taskId: toRequiredDomainId(dto.taskID, 'taskID'),
    dueDate: dto.dueDate,
    notificationMethod: dto.notificationMethod ?? null,
    message: dto.message ?? null,
    createdAt: null,
    updatedAt: null,
  };
}

export function mapCreateReminderInputToApiArgs(input: CreateReminderInput): { taskId: number; dueDate: string; message: string } {
  return {
    taskId: toApiId(input.taskId),
    dueDate: input.dueDate,
    message: input.message ?? '',
  };
}
