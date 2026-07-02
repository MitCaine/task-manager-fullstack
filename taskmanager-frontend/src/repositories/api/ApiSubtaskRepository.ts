import {
  createSubtask,
  deleteSubtask,
  getSubtasks,
  patchSubtaskStatus,
  updateSubtask,
} from '../../api/tasks';
import type { CreateSubtaskInput, EntityId, Subtask, UpdateSubtaskInput } from '../../domain/models';
import type { SubtaskRepository } from '../contracts';
import {
  mapCreateSubtaskInputToApiArgs,
  mapSubtaskDtoToDomain,
  mapUpdateSubtaskInputToApiTitle,
} from './mappers/SubtaskMapper';
import { toApiId } from './mappers/mapperUtils';

export class ApiSubtaskRepository implements SubtaskRepository {
  async listByTask(taskId: EntityId): Promise<Subtask[]> {
    const subtasks = await getSubtasks(toApiId(taskId));
    return subtasks.map(mapSubtaskDtoToDomain);
  }

  async create(input: CreateSubtaskInput): Promise<Subtask> {
    const args = mapCreateSubtaskInputToApiArgs(input);
    return mapSubtaskDtoToDomain(await createSubtask(args.taskId, args.title));
  }

  async update(id: EntityId, input: UpdateSubtaskInput): Promise<Subtask> {
    return mapSubtaskDtoToDomain(await updateSubtask(toApiId(id), mapUpdateSubtaskInputToApiTitle(input)));
  }

  async updateStatus(id: EntityId, statusId: number | null): Promise<Subtask> {
    if (statusId === null) {
      throw new Error('REST subtask status endpoint requires a numeric status.');
    }
    return mapSubtaskDtoToDomain(await patchSubtaskStatus(toApiId(id), statusId));
  }

  async delete(id: EntityId): Promise<void> {
    await deleteSubtask(toApiId(id));
  }
}
