import type { Task } from '../types/task';
import { parseLocalDateTime } from './dateTime';

export const TASK_STATUS = {
  LEGACY_ACTIVE: 1,
  DONE: 2,
  IN_PROGRESS: 3,
} as const;

export function normalizeTaskStatus(statusID: number | null | undefined): number | null {
  return statusID === TASK_STATUS.LEGACY_ACTIVE ? null : statusID ?? null;
}

export function isTaskDone(t: Task): boolean {
  return normalizeTaskStatus(t.statusID) === TASK_STATUS.DONE;
}

/**
 * Returns true if the task is past its scheduled time and not yet completed.
 */
export function isTaskOverdue(t: Task, now = new Date()): boolean {
  return !isTaskDone(t) && !!t.dateTimeScheduled && parseLocalDateTime(t.dateTimeScheduled) < now;
}
