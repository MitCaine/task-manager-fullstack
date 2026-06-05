import type { Task } from '../types/task';
import { deriveTaskStatistics } from './taskStatistics';

function task(overrides: Partial<Task>): Task {
  return {
    taskID: overrides.taskID ?? 1,
    title: overrides.title ?? 'Task',
    description: '',
    dateTimeScheduled: null,
    recurrenceRuleID: null,
    ...overrides,
  };
}

describe('deriveTaskStatistics', () => {
  it('returns zero counts for an empty task list', () => {
    expect(deriveTaskStatistics([], new Date('2026-06-04T12:00:00'))).toEqual({
      total: 0,
      done: 0,
      active: 0,
      overdue: 0,
      doneThisWeek: 0,
      high: 0,
      medium: 0,
      low: 0,
      noPriority: 0,
      completionRate: 0,
    });
  });

  it('counts completed and active tasks using existing status semantics', () => {
    const stats = deriveTaskStatistics([
      task({ taskID: 1, statusID: 2 }),
      task({ taskID: 2, statusID: 3 }),
      task({ taskID: 3, statusID: null }),
    ], new Date('2026-06-04T12:00:00'));

    expect(stats.done).toBe(1);
    expect(stats.active).toBe(2);
    expect(stats.completionRate).toBe(33);
  });

  it('counts overdue tasks from clearly past scheduled dates', () => {
    const stats = deriveTaskStatistics([
      task({ taskID: 1, statusID: null, dateTimeScheduled: '2000-01-01T09:00:00' }),
      task({ taskID: 2, statusID: 2, dateTimeScheduled: '2000-01-01T09:00:00' }),
      task({ taskID: 3, statusID: null, dateTimeScheduled: '2099-01-01T09:00:00' }),
    ], new Date('2026-06-04T12:00:00'));

    expect(stats.overdue).toBe(1);
  });

  it('counts tasks completed within the previous seven days', () => {
    const stats = deriveTaskStatistics([
      task({ taskID: 1, statusID: 2, createdAt: '2026-06-03T12:00:00' }),
      task({ taskID: 2, statusID: 2, createdAt: '2026-05-28T12:00:00' }),
      task({ taskID: 3, statusID: 2, createdAt: '2026-05-27T12:00:00' }),
      task({ taskID: 4, statusID: null, createdAt: '2026-06-03T12:00:00' }),
    ], new Date('2026-06-04T12:00:00'));

    expect(stats.doneThisWeek).toBe(2);
  });

  it('counts priority breakdowns including tasks without priority', () => {
    const stats = deriveTaskStatistics([
      task({ taskID: 1, priority: 'HIGH' }),
      task({ taskID: 2, priority: 'MEDIUM' }),
      task({ taskID: 3, priority: 'LOW' }),
      task({ taskID: 4, priority: null }),
      task({ taskID: 5 }),
    ], new Date('2026-06-04T12:00:00'));

    expect(stats.high).toBe(1);
    expect(stats.medium).toBe(1);
    expect(stats.low).toBe(1);
    expect(stats.noPriority).toBe(2);
  });
});
