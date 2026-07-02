import { createReminder, deleteReminder, getReminders, patchReminderDate } from '../../api/tasks';
import type { CreateReminderInput, EntityId, Reminder } from '../../domain/models';
import type { ReminderRepository } from '../contracts';
import { mapCreateReminderInputToApiArgs, mapReminderDtoToDomain } from './mappers/ReminderMapper';
import { toApiId } from './mappers/mapperUtils';

export class ApiReminderRepository implements ReminderRepository {
  async listByTask(taskId: EntityId): Promise<Reminder[]> {
    const reminders = await getReminders(toApiId(taskId));
    return reminders.map(mapReminderDtoToDomain);
  }

  async create(input: CreateReminderInput): Promise<Reminder> {
    const args = mapCreateReminderInputToApiArgs(input);
    return mapReminderDtoToDomain(await createReminder(args.taskId, args.dueDate, args.message));
  }

  async updateDueDate(id: EntityId, dueDate: string): Promise<Reminder> {
    return mapReminderDtoToDomain(await patchReminderDate(toApiId(id), dueDate));
  }

  async delete(id: EntityId): Promise<void> {
    await deleteReminder(toApiId(id));
  }
}
