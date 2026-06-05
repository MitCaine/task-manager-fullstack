import { parseLocalDateTime, toLocalDateTimeString } from './dateTime';

export type RecurrenceFrequency = string;

export function advanceRecurringDate(date: Date, frequency: RecurrenceFrequency): Date {
  const next = new Date(date);
  if (frequency === 'daily') next.setDate(next.getDate() + 1);
  if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  return next;
}

export function calculateNextOccurrence(
  startDateTime: string | null | undefined,
  frequency: RecurrenceFrequency,
  now = new Date(),
): string {
  let next = advanceRecurringDate(startDateTime ? parseLocalDateTime(startDateTime) : now, frequency);
  while (next < now) {
    const advanced = advanceRecurringDate(next, frequency);
    if (advanced.getTime() === next.getTime()) break;
    next = advanced;
  }
  return toLocalDateTimeString(next);
}

export function preserveTaskDuration({
  originalStartDateTime,
  originalEndDateTime,
  nextStartDateTime,
}: {
  originalStartDateTime: string | null | undefined;
  originalEndDateTime: string | null | undefined;
  nextStartDateTime: string;
}): string | null {
  if (!originalEndDateTime || !originalStartDateTime) return null;
  const durationMs = parseLocalDateTime(originalEndDateTime).getTime() - parseLocalDateTime(originalStartDateTime).getTime();
  if (!Number.isFinite(durationMs)) return null;
  const nextEnd = new Date(parseLocalDateTime(nextStartDateTime).getTime() + durationMs);
  return toLocalDateTimeString(nextEnd);
}

export function buildRecurringTaskSchedule({
  dateTimeScheduled,
  endDateTimeScheduled,
  frequency,
  now,
}: {
  dateTimeScheduled: string | null | undefined;
  endDateTimeScheduled: string | null | undefined;
  frequency: RecurrenceFrequency;
  now?: Date;
}): { dateTimeScheduled: string; endDateTimeScheduled: string | null } {
  const nextDateTimeScheduled = calculateNextOccurrence(dateTimeScheduled, frequency, now);
  return {
    dateTimeScheduled: nextDateTimeScheduled,
    endDateTimeScheduled: preserveTaskDuration({
      originalStartDateTime: dateTimeScheduled,
      originalEndDateTime: endDateTimeScheduled,
      nextStartDateTime: nextDateTimeScheduled,
    }),
  };
}
