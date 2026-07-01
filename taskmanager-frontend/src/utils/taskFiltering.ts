import type { Task } from '../types/task';
import { getLocalWeekRange, isInLocalMonth, isInLocalWeek, isSameLocalDate } from './dateTime';
import { isTaskDone, isTaskOverdue } from './taskUtils';

export type TaskSortBy = 'dueAsc' | 'dueDesc' | 'titleAsc' | 'overdueFirst' | 'priorityDesc';
export type TaskFilterStatus = 'all' | 'active' | 'completed' | 'overdue' | 'high' | 'medium' | 'low';
export type TaskViewTab = 'all' | 'today' | 'week' | 'month';

type DeriveVisibleTasksInput = {
  tasks: Task[];
  search: string;
  viewTab: TaskViewTab;
  filterStatus: TaskFilterStatus;
  filterProjectID: number | '';
  filterTagID: number | '';
  sortBy: TaskSortBy;
  now?: Date;
};

const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function applyViewTab(tasks: Task[], viewTab: TaskViewTab, now: Date): Task[] {
  if (viewTab === 'today') {
    return tasks.filter(t => Boolean(t.dateTimeScheduled) && isSameLocalDate(t.dateTimeScheduled!, now));
  }
  if (viewTab === 'week') {
    const week = getLocalWeekRange(now);
    return tasks.filter(t => Boolean(t.dateTimeScheduled) && isInLocalWeek(t.dateTimeScheduled!, week.start, week.end));
  }
  if (viewTab === 'month') {
    return tasks.filter(t => Boolean(t.dateTimeScheduled) && isInLocalMonth(t.dateTimeScheduled!, now));
  }
  return tasks;
}

export function deriveVisibleTasks({
  tasks,
  search,
  viewTab,
  filterStatus,
  filterProjectID,
  filterTagID,
  sortBy,
  now,
}: DeriveVisibleTasksInput): Task[] {
  let list = tasks;
  if (filterStatus === 'completed') list = list.filter(isTaskDone);
  else list = list.filter(t => !isTaskDone(t));

  if (filterStatus === 'overdue') list = list.filter(t => isTaskOverdue(t, now));
  else if (filterStatus === 'high') list = list.filter(t => t.priority === 'HIGH');
  else if (filterStatus === 'medium') list = list.filter(t => t.priority === 'MEDIUM');
  else if (filterStatus === 'low') list = list.filter(t => t.priority === 'LOW');

  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q)
    );
  }

  if (sortBy === 'dueDesc') {
    list = [...list].sort((a, b) => (b.dateTimeScheduled ?? '').localeCompare(a.dateTimeScheduled ?? ''));
  } else if (sortBy === 'titleAsc') {
    list = [...list].sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'priorityDesc') {
    list = [...list].sort((a, b) =>
      (PRIORITY_ORDER[a.priority ?? ''] ?? 3) - (PRIORITY_ORDER[b.priority ?? ''] ?? 3)
    );
  } else if (sortBy === 'overdueFirst') {
    list = [...list].sort((a, b) => {
      const aO = isTaskOverdue(a, now) ? 0 : 1;
      const bO = isTaskOverdue(b, now) ? 0 : 1;
      return aO - bO || (a.dateTimeScheduled ?? '').localeCompare(b.dateTimeScheduled ?? '');
    });
  } else {
    list = [...list].sort((a, b) => (a.dateTimeScheduled ?? '').localeCompare(b.dateTimeScheduled ?? ''));
  }

  if (filterProjectID !== '') list = list.filter(t => Number(t.projectID) === Number(filterProjectID));
  if (filterTagID !== '') list = list.filter(t => t.tags?.some(tag => Number(tag.tagID) === Number(filterTagID)));

  return applyViewTab(list, viewTab, now ?? new Date());
}
