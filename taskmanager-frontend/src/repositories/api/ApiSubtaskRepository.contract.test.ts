import {
  createSubtask,
  deleteSubtask,
  getSubtasks,
  patchSubtaskStatus,
  updateSubtask,
} from '../../api/tasks';
import type { Subtask } from '../../types/task';
import { describeSubtaskRepositoryContract } from '../contracts/subtaskRepositoryContract';
import { ApiSubtaskRepository } from './ApiSubtaskRepository';

jest.mock('../../api/tasks');

const mockGetSubtasks = getSubtasks as jest.MockedFunction<typeof getSubtasks>;
const mockCreateSubtask = createSubtask as jest.MockedFunction<typeof createSubtask>;
const mockUpdateSubtask = updateSubtask as jest.MockedFunction<typeof updateSubtask>;
const mockPatchSubtaskStatus = patchSubtaskStatus as jest.MockedFunction<typeof patchSubtaskStatus>;
const mockDeleteSubtask = deleteSubtask as jest.MockedFunction<typeof deleteSubtask>;

let nextSubtaskId = 100;
const subtaskStore = new Map<number, Subtask>();
const deletedSubtaskIds = new Set<number>();

function installSubtaskApiMocks() {
  mockGetSubtasks.mockImplementation(async taskId => (
    Array.from(subtaskStore.values()).filter(subtask => subtask.parentTaskID === taskId)
  ));
  mockCreateSubtask.mockImplementation(async (taskId, title) => {
    const subtask: Subtask = {
      subTaskID: nextSubtaskId++,
      parentTaskID: taskId,
      title,
      statusID: 1,
      dateTimeScheduled: null,
    };
    subtaskStore.set(subtask.subTaskID, subtask);
    return subtask;
  });
  mockUpdateSubtask.mockImplementation(async (id, title) => {
    const current = subtaskStore.get(id);
    if (!current) throw new Error(`Subtask ${id} not found`);
    const subtask: Subtask = { ...current, title };
    subtaskStore.set(id, subtask);
    return subtask;
  });
  mockPatchSubtaskStatus.mockImplementation(async (id, statusID) => {
    const current = subtaskStore.get(id);
    if (!current) throw new Error(`Subtask ${id} not found`);
    const subtask: Subtask = { ...current, statusID };
    subtaskStore.set(id, subtask);
    return subtask;
  });
  mockDeleteSubtask.mockImplementation(async id => {
    deletedSubtaskIds.add(id);
    subtaskStore.delete(id);
  });
}

beforeEach(() => {
  nextSubtaskId = 100;
  subtaskStore.clear();
  deletedSubtaskIds.clear();
  jest.clearAllMocks();
  installSubtaskApiMocks();
});

describeSubtaskRepositoryContract({
  createRepository: () => new ApiSubtaskRepository(),
  seedSubtask: subtask => {
    subtaskStore.set(Number(subtask.id), {
      subTaskID: Number(subtask.id),
      parentTaskID: Number(subtask.parentTaskId),
      title: subtask.title,
      statusID: subtask.statusId === 'completed' ? 3 : subtask.statusId === 'in_progress' ? 2 : 1,
      dateTimeScheduled: subtask.dateTimeScheduled,
    });
  },
  expectDeleted: id => {
    expect(deletedSubtaskIds.has(Number(id))).toBe(true);
  },
});
