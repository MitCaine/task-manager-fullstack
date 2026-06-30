import type { Task } from '../types/task';
import { isInLocalMonth, isInLocalWeek, isSameLocalDate, parseLocalDateTime } from './dateTime';
import { isTaskOverdue } from './taskUtils';

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

function isOverdueForFilter(task: Task, now?: Date): boolean {
  if (!now) return isTaskOverdue(task);
  return task.statusID !== 2 && !!task.dateTimeScheduled && parseLocalDateTime(task.dateTimeScheduled) < now;
}

function moveDoneToBottom(tasks: Task[], filterStatus: TaskFilterStatus): Task[] {
  if (filterStatus === 'completed') return tasks;
  return tasks.sort((a, b) => (a.statusID === 2 ? 1 : 0) - (b.statusID === 2 ? 1 : 0));
}

function applyViewTab(tasks: Task[], viewTab: TaskViewTab, now: Date): Task[] {
  if (viewTab === 'today') {
    return tasks.filter(t => Boolean(t.dateTimeScheduled) && isSameLocalDate(t.dateTimeScheduled!, now));
  }
  if (viewTab === 'week') {
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 7);
    return tasks.filter(t => Boolean(t.dateTimeScheduled) && isInLocalWeek(t.dateTimeScheduled!, mon, sun));
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
  if (filterStatus === 'completed') list = list.filter(t => t.statusID === 2);
  else list = list.filter(t => t.statusID !== 2);

  if (filterStatus === 'active') list = list.filter(t => t.statusID !== 2);
  else if (filterStatus === 'overdue') list = list.filter(t => isOverdueForFilter(t, now));
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
    list = moveDoneToBottom([...list].sort((a, b) => (b.dateTimeScheduled ?? '').localeCompare(a.dateTimeScheduled ?? '')), filterStatus);
  } else if (sortBy === 'titleAsc') {
    list = moveDoneToBottom([...list].sort((a, b) => a.title.localeCompare(b.title)), filterStatus);
  } else if (sortBy === 'priorityDesc') {
    list = moveDoneToBottom([...list].sort((a, b) =>
      (PRIORITY_ORDER[a.priority ?? ''] ?? 3) - (PRIORITY_ORDER[b.priority ?? ''] ?? 3)
    ), filterStatus);
  } else if (sortBy === 'overdueFirst') {
    list = moveDoneToBottom([...list].sort((a, b) => {
      const aO = isOverdueForFilter(a, now) ? 0 : 1;
      const bO = isOverdueForFilter(b, now) ? 0 : 1;
      return aO - bO || (a.dateTimeScheduled ?? '').localeCompare(b.dateTimeScheduled ?? '');
    }), filterStatus);
  } else {
    list = moveDoneToBottom([...list].sort((a, b) => (a.dateTimeScheduled ?? '').localeCompare(b.dateTimeScheduled ?? '')), filterStatus);
  }

  if (filterProjectID !== '') list = list.filter(t => Number(t.projectID) === Number(filterProjectID));
  if (filterTagID !== '') list = list.filter(t => t.tags?.some(tag => Number(tag.tagID) === Number(filterTagID)));

  return applyViewTab(list, viewTab, now ?? new Date());
}
