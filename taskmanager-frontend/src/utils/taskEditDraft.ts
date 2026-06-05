import type { Task } from '../types/task';
import { extractDateParts, isMidnightLocalDateTime } from './dateTime';
import type { Ampm } from './taskForm';

export type TaskEditDraft = {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | '';
  projectID: number | '';
  date: string;
  hour: string;
  minute: string;
  ampm: Ampm;
  showTime: boolean;
  endHour: string;
  endMinute: string;
  endAmpm: Ampm;
  showEndTime: boolean;
};

export function deriveTaskEditDraft(task: Task, is24Hour: boolean): TaskEditDraft {
  const startParts = task.dateTimeScheduled
    ? extractDateParts(task.dateTimeScheduled, is24Hour)
    : { date: '', hour: '12', minute: '00', ampm: 'AM' as Ampm };
  const endParts = task.endDateTimeScheduled
    ? extractDateParts(task.endDateTimeScheduled, is24Hour)
    : { date: '', hour: '12', minute: '00', ampm: 'AM' as Ampm };

  return {
    title: task.title,
    description: task.description ?? '',
    priority: task.priority ?? '',
    projectID: task.projectID ?? '',
    date: startParts.date,
    hour: startParts.hour,
    minute: startParts.minute,
    ampm: startParts.ampm,
    showTime: Boolean(task.dateTimeScheduled && !isMidnightLocalDateTime(task.dateTimeScheduled)),
    endHour: endParts.hour,
    endMinute: endParts.minute,
    endAmpm: endParts.ampm,
    showEndTime: Boolean(task.endDateTimeScheduled),
  };
}
