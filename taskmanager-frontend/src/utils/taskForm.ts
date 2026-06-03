import { compareLocalDateTimes } from './dateTime';

export type Ampm = 'AM' | 'PM';

export const TASK_TIME_RANGE_ERROR = 'End time must be after start time.';

export function validateTaskTimeRange(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  return compareLocalDateTimes(start, end) > 0 ? null : TASK_TIME_RANGE_ERROR;
}

export function convertHourForTimeMode(hourValue: string, ampmValue: Ampm, to24Hour: boolean): { hour: string; ampm: Ampm } {
  const parsed = parseInt(hourValue, 10);
  const hour = Number.isNaN(parsed) ? 0 : parsed;
  if (to24Hour) {
    let hour24 = hour;
    if (ampmValue === 'PM' && hour24 !== 12) hour24 += 12;
    if (ampmValue === 'AM' && hour24 === 12) hour24 = 0;
    return { hour: String(hour24).padStart(2, '0'), ampm: ampmValue };
  }
  const normalized = ((hour % 24) + 24) % 24;
  return {
    hour: String(normalized % 12 || 12).padStart(2, '0'),
    ampm: normalized >= 12 ? 'PM' : 'AM',
  };
}
