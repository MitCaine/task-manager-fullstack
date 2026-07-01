import type { Tag, Task } from '../types/task';
import { deriveVisibleTasks } from './taskFiltering';

const NOW = new Date('2026-06-04T12:00:00');

function tag(tagID: number): Tag {
  return { tagID, title: `Tag ${tagID}` };
}

function task(overrides: Partial<Task>): Task {
  return {
    taskID: overrides.taskID ?? 1,
    title: overrides.title ?? `Task ${overrides.taskID ?? 1}`,
    description: overrides.description ?? '',
    dateTimeScheduled: overrides.dateTimeScheduled ?? null,
    recurrenceRuleID: null,
    ...overrides,
  };
}

function visibleTitles(tasks: Task[], overrides: Partial<Parameters<typeof deriveVisibleTasks>[0]> = {}): string[] {
  return deriveVisibleTasks({
    tasks,
    search: '',
    viewTab: 'all',
    filterStatus: 'all',
    filterProjectID: '',
    filterTagID: '',
    sortBy: 'dueAsc',
    now: NOW,
    ...overrides,
  }).map(t => t.title);
}

describe('deriveVisibleTasks', () => {
  it('matches search against title and description', () => {
    const tasks = [
      task({ taskID: 1, title: 'Buy milk' }),
      task({ taskID: 2, title: 'Plan trip', description: 'Book milk bar' }),
      task({ taskID: 3, title: 'Read docs' }),
      task({ taskID: 4, title: 'Done milk', statusID: 2 }),
    ];

    expect(visibleTitles(tasks, { search: 'milk' })).toEqual(['Buy milk', 'Plan trip']);
    expect(visibleTitles(tasks, { search: 'milk', filterStatus: 'completed' })).toEqual(['Done milk']);
  });

  it('filters active and completed statuses', () => {
    const tasks = [
      task({ taskID: 1, title: 'Active', statusID: null }),
      task({ taskID: 2, title: 'Progress', statusID: 3 }),
      task({ taskID: 3, title: 'Done', statusID: 2 }),
    ];

    expect(visibleTitles(tasks, { filterStatus: 'all' })).toEqual(['Active', 'Progress']);
    expect(visibleTitles(tasks, { filterStatus: 'active' })).toEqual(['Active', 'Progress']);
    expect(visibleTitles(tasks, { filterStatus: 'completed' })).toEqual(['Done']);
  });

  it('filters overdue tasks using the provided clock', () => {
    const tasks = [
      task({ taskID: 1, title: 'Past', statusID: null, dateTimeScheduled: '2026-06-01T09:00:00' }),
      task({ taskID: 2, title: 'Future', statusID: null, dateTimeScheduled: '2026-06-05T09:00:00' }),
      task({ taskID: 3, title: 'Done past', statusID: 2, dateTimeScheduled: '2026-06-01T09:00:00' }),
    ];

    expect(visibleTitles(tasks, { filterStatus: 'overdue' })).toEqual(['Past']);
  });

  it('filters priority values', () => {
    const tasks = [
      task({ taskID: 1, title: 'High', priority: 'HIGH' }),
      task({ taskID: 2, title: 'Medium', priority: 'MEDIUM' }),
      task({ taskID: 3, title: 'Low', priority: 'LOW' }),
      task({ taskID: 4, title: 'None', priority: null }),
      task({ taskID: 5, title: 'Done high', statusID: 2, priority: 'HIGH' }),
    ];

    expect(visibleTitles(tasks, { filterStatus: 'high' })).toEqual(['High']);
    expect(visibleTitles(tasks, { filterStatus: 'medium' })).toEqual(['Medium']);
    expect(visibleTitles(tasks, { filterStatus: 'low' })).toEqual(['Low']);
  });

  it('filters by project and tag after base filtering', () => {
    const tasks = [
      task({ taskID: 1, title: 'Home urgent', projectID: 10, tags: [tag(1)], priority: 'HIGH' }),
      task({ taskID: 2, title: 'Work urgent', projectID: 20, tags: [tag(1)], priority: 'HIGH' }),
      task({ taskID: 3, title: 'Home later', projectID: 10, tags: [tag(2)], priority: 'LOW' }),
    ];

    expect(visibleTitles(tasks, { filterStatus: 'high', filterProjectID: 10, filterTagID: 1 })).toEqual(['Home urgent']);
  });

  it('applies today, week, and month view tabs', () => {
    const tasks = [
      task({ taskID: 1, title: 'Today', dateTimeScheduled: '2026-06-04T09:00:00' }),
      task({ taskID: 2, title: 'This week', dateTimeScheduled: '2026-06-07T09:00:00' }),
      task({ taskID: 3, title: 'This month', dateTimeScheduled: '2026-06-20T09:00:00' }),
      task({ taskID: 4, title: 'Other month', dateTimeScheduled: '2026-07-01T09:00:00' }),
      task({ taskID: 5, title: 'Unscheduled', dateTimeScheduled: null }),
    ];

    expect(visibleTitles(tasks, { viewTab: 'today' })).toEqual(['Today']);
    expect(visibleTitles(tasks, { viewTab: 'week' })).toEqual(['Today', 'This week']);
    expect(visibleTitles(tasks, { viewTab: 'month' })).toEqual(['Today', 'This week', 'This month']);
  });

  it('uses Monday-start week boundaries for this week filtering', () => {
    const tasks = [
      task({ taskID: 1, title: 'Previous Sunday', dateTimeScheduled: '2026-04-05T23:59:00' }),
      task({ taskID: 2, title: 'Boundary Monday', dateTimeScheduled: '2026-04-06T00:00:00' }),
      task({ taskID: 3, title: 'Boundary Sunday', dateTimeScheduled: '2026-04-12T23:59:00' }),
      task({ taskID: 4, title: 'Next Monday', dateTimeScheduled: '2026-04-13T00:00:00' }),
    ];

    expect(visibleTitles(tasks, { viewTab: 'week', now: new Date(2026, 3, 8, 12, 0, 0) })).toEqual([
      'Boundary Monday',
      'Boundary Sunday',
    ]);
  });

  it('sorts by due date ascending and descending using existing empty-date behavior', () => {
    const tasks = [
      task({ taskID: 1, title: 'Later', dateTimeScheduled: '2026-06-06T09:00:00' }),
      task({ taskID: 2, title: 'Unscheduled', dateTimeScheduled: null }),
      task({ taskID: 3, title: 'Sooner', dateTimeScheduled: '2026-06-05T09:00:00' }),
    ];

    expect(visibleTitles(tasks, { sortBy: 'dueAsc' })).toEqual(['Unscheduled', 'Sooner', 'Later']);
    expect(visibleTitles(tasks, { sortBy: 'dueDesc' })).toEqual(['Later', 'Sooner', 'Unscheduled']);
  });

  it('sorts by title and priority', () => {
    const tasks = [
      task({ taskID: 1, title: 'Bravo', priority: 'LOW' }),
      task({ taskID: 2, title: 'Alpha', priority: 'HIGH' }),
      task({ taskID: 3, title: 'Charlie', priority: 'MEDIUM' }),
      task({ taskID: 4, title: 'Delta', priority: null }),
    ];

    expect(visibleTitles(tasks, { sortBy: 'titleAsc' })).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    expect(visibleTitles(tasks, { sortBy: 'priorityDesc' })).toEqual(['Alpha', 'Charlie', 'Bravo', 'Delta']);
  });

  it('sorts overdue tasks first, then due date', () => {
    const tasks = [
      task({ taskID: 1, title: 'Future', statusID: null, dateTimeScheduled: '2026-06-05T09:00:00' }),
      task({ taskID: 2, title: 'Older overdue', statusID: null, dateTimeScheduled: '2026-06-01T09:00:00' }),
      task({ taskID: 3, title: 'Recent overdue', statusID: null, dateTimeScheduled: '2026-06-03T09:00:00' }),
    ];

    expect(visibleTitles(tasks, { sortBy: 'overdueFirst' })).toEqual(['Older overdue', 'Recent overdue', 'Future']);
  });

  it('hides done tasks except in completed-only filtering', () => {
    const tasks = [
      task({ taskID: 1, title: 'Done early', statusID: 2, dateTimeScheduled: '2026-06-01T09:00:00' }),
      task({ taskID: 2, title: 'Active later', statusID: null, dateTimeScheduled: '2026-06-05T09:00:00' }),
      task({ taskID: 3, title: 'Active sooner', statusID: null, dateTimeScheduled: '2026-06-02T09:00:00' }),
    ];

    expect(visibleTitles(tasks, { sortBy: 'dueAsc' })).toEqual(['Active sooner', 'Active later']);
    expect(visibleTitles(tasks, { filterStatus: 'completed', sortBy: 'dueAsc' })).toEqual(['Done early']);
  });
});
