import {
  addTagToTask,
  createTask,
  deleteTask,
  getTask,
  getTasks,
  patchTaskStatus,
  removeTagFromTask,
  updateTask,
} from '../../api/tasks';
import type { CreateTaskInput, EntityId, Task, UpdateTaskInput } from '../../domain/models';
import type { TaskRepository } from '../contracts';
import { mapCreateTaskInputToDto, mapTaskDtoToDomain, mapUpdateTaskInputToDto } from './mappers/TaskMapper';
import { toApiId } from './mappers/mapperUtils';

export class ApiTaskRepository implements TaskRepository {
  async list(): Promise<Task[]> {
    const tasks = await getTasks();
    return tasks.map(mapTaskDtoToDomain);
  }

  async get(id: EntityId): Promise<Task> {
    return mapTaskDtoToDomain(await getTask(toApiId(id)));
  }

  async create(input: CreateTaskInput): Promise<Task> {
    return mapTaskDtoToDomain(await createTask(mapCreateTaskInputToDto(input)));
  }

  async update(id: EntityId, input: UpdateTaskInput): Promise<Task> {
    return mapTaskDtoToDomain(await updateTask(toApiId(id), mapUpdateTaskInputToDto(input)));
  }

  async updateStatus(id: EntityId, statusId: number | null): Promise<Task> {
    return mapTaskDtoToDomain(await patchTaskStatus(toApiId(id), statusId));
  }

  async delete(id: EntityId): Promise<void> {
    await deleteTask(toApiId(id));
  }

  async addTag(taskId: EntityId, tagId: EntityId): Promise<Task> {
    const numericTaskId = toApiId(taskId);
    await addTagToTask(numericTaskId, toApiId(tagId));
    return mapTaskDtoToDomain(await getTask(numericTaskId));
  }

  async removeTag(taskId: EntityId, tagId: EntityId): Promise<Task> {
    const numericTaskId = toApiId(taskId);
    await removeTagFromTask(numericTaskId, toApiId(tagId));
    return mapTaskDtoToDomain(await getTask(numericTaskId));
  }
}
