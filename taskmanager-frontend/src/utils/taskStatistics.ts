import type { Task } from '../types/task';
import { getLocalWeekRange, isInLocalWeek } from './dateTime';
import { isTaskDone, isTaskOverdue } from './taskUtils';

export type TaskStatistics = {
  total: number;
  done: number;
  active: number;
  overdue: number;
  doneThisWeek: number;
  high: number;
  medium: number;
  low: number;
  noPriority: number;
  completionRate: number;
};

export function deriveTaskStatistics(tasks: Task[], now = new Date()): TaskStatistics {
  const total = tasks.length;
  const done = tasks.filter(isTaskDone).length;
  const active = tasks.filter(t => !isTaskDone(t)).length;
  const overdue = tasks.filter(t => isTaskOverdue(t, now)).length;
  const week = getLocalWeekRange(now);
  const doneThisWeek = tasks.filter(t => isTaskDone(t) && t.createdAt && isInLocalWeek(t.createdAt, week.start, week.end)).length;
  const high = tasks.filter(t => t.priority === 'HIGH').length;
  const medium = tasks.filter(t => t.priority === 'MEDIUM').length;
  const low = tasks.filter(t => t.priority === 'LOW').length;
  const noPriority = tasks.filter(t => !t.priority).length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, active, overdue, doneThisWeek, high, medium, low, noPriority, completionRate };
}
