import { getRecurrence, setRepeat } from '../../api/tasks';
import type { RecurrenceRule, Task } from '../../types/task';
import { describeRecurrenceRepositoryContract } from '../contracts/recurrenceRepositoryContract';
import { ApiRecurrenceRepository } from './ApiRecurrenceRepository';

jest.mock('../../api/tasks');

const mockGetRecurrence = getRecurrence as jest.MockedFunction<typeof getRecurrence>;
const mockSetRepeat = setRepeat as jest.MockedFunction<typeof setRepeat>;

const taskStore = new Map<number, Task>();
const recurrenceStore = new Map<number, RecurrenceRule>();
let nextRecurrenceId = 100;

function installRecurrenceApiMocks() {
  mockGetRecurrence.mockImplementation(async taskId => {
    const task = taskStore.get(taskId);
    const recurrenceId = task?.recurrenceRuleID;
    const recurrence = recurrenceId ? recurrenceStore.get(recurrenceId) : undefined;
    if (!recurrence) throw new Error(`Recurrence for task ${taskId} not found`);
    return recurrence;
  });
  mockSetRepeat.mockImplementation(async (taskId, interval) => {
    const task = taskStore.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    if (interval === null) {
      if (task.recurrenceRuleID) recurrenceStore.delete(task.recurrenceRuleID);
      const updatedTask: Task = { ...task, recurrenceRuleID: null };
      taskStore.set(taskId, updatedTask);
      return updatedTask;
    }

    const recurrenceId = task.recurrenceRuleID ?? nextRecurrenceId++;
    const recurrence: RecurrenceRule = {
      recurrenceRuleID: recurrenceId,
      frequency: interval.intervalValue === 1 && interval.intervalUnit === 'week' ? 'weekly' : null,
      intervalUnit: interval.intervalUnit,
      intervalValue: interval.intervalValue,
      timesOfRecurrence: 0,
      startDateTime: task.dateTimeScheduled ?? '2026-07-03T10:00:00',
      endDateTime: '2036-07-03T10:00:00',
    };
    recurrenceStore.set(recurrenceId, recurrence);
    const updatedTask: Task = { ...task, recurrenceRuleID: recurrenceId };
    taskStore.set(taskId, updatedTask);
    return updatedTask;
  });
}

beforeEach(() => {
  taskStore.clear();
  recurrenceStore.clear();
  nextRecurrenceId = 100;
  jest.clearAllMocks();
  installRecurrenceApiMocks();
});

describeRecurrenceRepositoryContract({
  createRepository: () => new ApiRecurrenceRepository(),
  seedTask: task => {
    taskStore.set(Number(task.id), {
      taskID: Number(task.id),
      title: task.title,
      description: '',
      dateTimeScheduled: task.dateTimeScheduled,
      statusID: null,
      recurrenceRuleID: null,
      tags: [],
    });
  },
});
