import { buildDateTimeString, buildTaskDateTimeString } from './dateTime';
import { validateTaskTimeRange } from './taskForm';
import type { Ampm } from './taskForm';

export type TaskScheduleInput = {
  date: string;
  showTime: boolean;
  hour: string;
  minute: string;
  ampm: Ampm;
  showEndTime: boolean;
  endHour: string;
  endMinute: string;
  endAmpm: Ampm;
  is24Hour: boolean;
};

export type TaskSchedule = {
  dateTimeScheduled: string | null;
  endDateTimeScheduled: string | null;
};

export type TaskScheduleValidation = TaskSchedule & {
  rangeError: string | null;
};

export function buildTaskSchedule({
  date,
  showTime,
  hour,
  minute,
  ampm,
  showEndTime,
  endHour,
  endMinute,
  endAmpm,
  is24Hour,
}: TaskScheduleInput): TaskSchedule {
  const dateTimeScheduled = buildTaskDateTimeString(date, showTime, hour, minute, ampm, is24Hour);
  const endDateTimeScheduled = date && showEndTime
    ? buildDateTimeString(date, endHour, endMinute, endAmpm, is24Hour)
    : null;
  return { dateTimeScheduled, endDateTimeScheduled };
}

export function buildValidatedTaskSchedule(input: TaskScheduleInput): TaskScheduleValidation {
  const schedule = buildTaskSchedule(input);
  return {
    ...schedule,
    rangeError: validateTaskTimeRange(schedule.dateTimeScheduled, schedule.endDateTimeScheduled),
  };
}

export function getDefaultEndTime({
  hour,
  minute,
  ampm,
  is24Hour,
}: {
  hour: string;
  minute: string;
  ampm: Ampm;
  is24Hour: boolean;
}): { endHour: string; endMinute: string; endAmpm: Ampm } {
  if (is24Hour) {
    const h = (parseInt(hour, 10) + 1) % 24;
    return { endHour: String(h).padStart(2, '0'), endMinute: minute, endAmpm: ampm };
  }

  let h24 = ampm === 'PM' ? (parseInt(hour, 10) % 12) + 12 : parseInt(hour, 10) % 12;
  h24 = (h24 + 1) % 24;
  return {
    endHour: String(h24 % 12 || 12).padStart(2, '0'),
    endMinute: minute,
    endAmpm: h24 >= 12 ? 'PM' : 'AM',
  };
}
