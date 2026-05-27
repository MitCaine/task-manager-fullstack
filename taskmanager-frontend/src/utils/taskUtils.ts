import type { Task } from '../types/task';
import { parseLocalDateTime } from './dateTime';

/**
 * Returns true if the task is past its scheduled time and not yet completed.
 */
export function isTaskOverdue(t: Task): boolean {
  return t.statusID !== 2 && !!t.dateTimeScheduled && parseLocalDateTime(t.dateTimeScheduled) < new Date();
}
