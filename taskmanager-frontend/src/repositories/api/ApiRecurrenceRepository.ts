import { getRecurrence, setRepeat } from '../../api/tasks';
import type { EntityId, RecurrenceIntervalInput, RecurrenceRule, Task } from '../../domain/models';
import type { RecurrenceRepository } from '../contracts';
import { mapRecurrenceDtoToDomain, mapRecurrenceIntervalInputToDto } from './mappers/RecurrenceMapper';
import { mapTaskDtoToDomain } from './mappers/TaskMapper';
import { toApiId } from './mappers/mapperUtils';

export class ApiRecurrenceRepository implements RecurrenceRepository {
  async getByTask(taskId: EntityId): Promise<RecurrenceRule> {
    return mapRecurrenceDtoToDomain(await getRecurrence(toApiId(taskId)));
  }

  async setForTask(taskId: EntityId, interval: RecurrenceIntervalInput): Promise<Task> {
    return mapTaskDtoToDomain(await setRepeat(toApiId(taskId), mapRecurrenceIntervalInputToDto(interval)));
  }
}
