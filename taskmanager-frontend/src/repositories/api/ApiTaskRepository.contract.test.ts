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
import type { Tag, Task } from '../../types/task';
import { describeTaskRepositoryContract } from '../contracts/taskRepositoryContract';
import { ApiTaskRepository } from './ApiTaskRepository';
import { mapStatusIdDomainToDto } from './mappers/StatusMapper';

jest.mock('../../api/tasks');

const mockGetTasks = getTasks as jest.MockedFunction<typeof getTasks>;
const mockGetTask = getTask as jest.MockedFunction<typeof getTask>;
const mockCreateTask = createTask as jest.MockedFunction<typeof createTask>;
const mockUpdateTask = updateTask as jest.MockedFunction<typeof updateTask>;
const mockPatchTaskStatus = patchTaskStatus as jest.MockedFunction<typeof patchTaskStatus>;
const mockDeleteTask = deleteTask as jest.MockedFunction<typeof deleteTask>;
const mockAddTagToTask = addTagToTask as jest.MockedFunction<typeof addTagToTask>;
const mockRemoveTagFromTask = removeTagFromTask as jest.MockedFunction<typeof removeTagFromTask>;

let nextTaskId = 100;
const taskStore = new Map<number, Task>();
const tagStore = new Map<number, Tag>([
  [5, { tagID: 5, title: 'Focus', color: '#6366f1' }],
]);
const deletedTaskIds = new Set<number>();

function installTaskApiMocks() {
  mockGetTasks.mockImplementation(async () => Array.from(taskStore.values()));
  mockGetTask.mockImplementation(async id => {
    const task = taskStore.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    return task;
  });
  mockCreateTask.mockImplementation(async input => {
    const task: Task = { ...input, taskID: nextTaskId++ };
    taskStore.set(task.taskID, task);
    return task;
  });
  mockUpdateTask.mockImplementation(async (id, input) => {
    const current = taskStore.get(id);
    if (!current) throw new Error(`Task ${id} not found`);
    const task: Task = { ...current, ...input, taskID: id };
    taskStore.set(id, task);
    return task;
  });
  mockPatchTaskStatus.mockImplementation(async (id, statusID) => {
    const current = taskStore.get(id);
    if (!current) throw new Error(`Task ${id} not found`);
    const task: Task = { ...current, statusID };
    taskStore.set(id, task);
    return task;
  });
  mockDeleteTask.mockImplementation(async id => {
    deletedTaskIds.add(id);
    taskStore.delete(id);
  });
  mockAddTagToTask.mockImplementation(async (taskId, tagId) => {
    const current = taskStore.get(taskId);
    const tag = tagStore.get(tagId);
    if (!current || !tag) throw new Error('Task or tag not found');
    taskStore.set(taskId, { ...current, tags: [...(current.tags ?? []), tag] });
  });
  mockRemoveTagFromTask.mockImplementation(async (taskId, tagId) => {
    const current = taskStore.get(taskId);
    if (!current) throw new Error('Task not found');
    taskStore.set(taskId, { ...current, tags: (current.tags ?? []).filter(tag => tag.tagID !== tagId) });
  });
}

beforeEach(() => {
  nextTaskId = 100;
  taskStore.clear();
  deletedTaskIds.clear();
  jest.clearAllMocks();
  installTaskApiMocks();
});

describeTaskRepositoryContract({
  createRepository: () => new ApiTaskRepository(),
  seedTask: task => {
    taskStore.set(Number(task.id), {
      taskID: Number(task.id),
      title: task.title,
      description: task.description ?? '',
      statusID: mapStatusIdDomainToDto(task.statusId),
      projectID: task.projectId ? Number(task.projectId) : null,
      tags: [],
    });
  },
  expectDeleted: id => {
    expect(deletedTaskIds.has(Number(id))).toBe(true);
  },
});
