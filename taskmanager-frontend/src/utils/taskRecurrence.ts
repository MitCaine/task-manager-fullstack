import { parseLocalDateTime, toLocalDateTimeString } from './dateTime';
import type { RecurrenceRule } from '../types/task';

export type RecurrenceUnit = 'day' | 'week' | 'month' | 'year';
export type RecurrenceInterval = {
  intervalUnit: RecurrenceUnit;
  intervalValue: number;
};
export type RepeatValue = RecurrenceInterval | null;

export const RECURRENCE_UNIT_LIMITS: Record<RecurrenceUnit, number> = {
  day: 7,
  week: 4,
  month: 12,
  year: 5,
};

export const RECURRENCE_UNITS: RecurrenceUnit[] = ['day', 'week', 'month', 'year'];

export function legacyFrequencyToInterval(frequency: string | null | undefined): RecurrenceInterval | null {
  if (!frequency) return null;
  const normalized = frequency.trim().toLowerCase();
  if (normalized === 'daily') return { intervalUnit: 'day', intervalValue: 1 };
  if (normalized === 'weekly') return { intervalUnit: 'week', intervalValue: 1 };
  if (normalized === 'monthly') return { intervalUnit: 'month', intervalValue: 1 };
  return null;
}

export function clampRecurrenceInterval(interval: RecurrenceInterval): RecurrenceInterval {
  const max = RECURRENCE_UNIT_LIMITS[interval.intervalUnit];
  const intervalValue = Math.min(Math.max(Math.trunc(interval.intervalValue), 1), max);
  return { ...interval, intervalValue };
}

export function normalizeRecurrenceRule(rule: RecurrenceRule | null | undefined): RecurrenceInterval | null {
  if (!rule) return null;
  if (rule.intervalUnit && typeof rule.intervalValue === 'number') {
    const unit = rule.intervalUnit.trim().toLowerCase() as RecurrenceUnit;
    if (RECURRENCE_UNITS.includes(unit)) {
      return clampRecurrenceInterval({ intervalUnit: unit, intervalValue: rule.intervalValue });
    }
  }
  return legacyFrequencyToInterval(rule.frequency);
}

export function formatRecurrenceInterval(interval: RepeatValue): string {
  if (!interval) return 'Do not repeat';
  const normalized = clampRecurrenceInterval(interval);
  const { intervalUnit, intervalValue } = normalized;
  if (intervalValue === 1) return `Every ${intervalUnit}`;
  return `Every ${intervalValue} ${intervalUnit}s`;
}

export function recurrenceIntervalKey(interval: RepeatValue): string {
  if (!interval) return '';
  const normalized = clampRecurrenceInterval(interval);
  return `${normalized.intervalValue}:${normalized.intervalUnit}`;
}

export function advanceRecurringDate(date: Date, interval: RecurrenceInterval): Date {
  const normalized = clampRecurrenceInterval(interval);
  const next = new Date(date);
  if (normalized.intervalUnit === 'day') next.setDate(next.getDate() + normalized.intervalValue);
  if (normalized.intervalUnit === 'week') next.setDate(next.getDate() + (normalized.intervalValue * 7));
  if (normalized.intervalUnit === 'month') next.setMonth(next.getMonth() + normalized.intervalValue);
  if (normalized.intervalUnit === 'year') next.setFullYear(next.getFullYear() + normalized.intervalValue);
  return next;
}

export function calculateNextOccurrence(
  startDateTime: string | null | undefined,
  interval: RecurrenceInterval,
  now = new Date(),
): string {
  let next = advanceRecurringDate(startDateTime ? parseLocalDateTime(startDateTime) : now, interval);
  while (next < now) {
    const advanced = advanceRecurringDate(next, interval);
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
  interval,
  now,
}: {
  dateTimeScheduled: string | null | undefined;
  endDateTimeScheduled: string | null | undefined;
  interval: RecurrenceInterval;
  now?: Date;
}): { dateTimeScheduled: string; endDateTimeScheduled: string | null } {
  const nextDateTimeScheduled = calculateNextOccurrence(dateTimeScheduled, interval, now);
  return {
    dateTimeScheduled: nextDateTimeScheduled,
    endDateTimeScheduled: preserveTaskDuration({
      originalStartDateTime: dateTimeScheduled,
      originalEndDateTime: endDateTimeScheduled,
      nextStartDateTime: nextDateTimeScheduled,
    }),
  };
}
