import {
  advanceRecurringDate,
  buildRecurringTaskSchedule,
  calculateNextOccurrence,
  preserveTaskDuration,
  formatRecurrenceInterval,
  legacyFrequencyToInterval,
} from './taskRecurrence';

describe('advanceRecurringDate', () => {
  it('advances interval recurrence dates', () => {
    expect(advanceRecurringDate(new Date(2026, 5, 4, 9, 0), { intervalUnit: 'day', intervalValue: 2 })).toEqual(new Date(2026, 5, 6, 9, 0));
    expect(advanceRecurringDate(new Date(2026, 5, 4, 9, 0), { intervalUnit: 'week', intervalValue: 3 })).toEqual(new Date(2026, 5, 25, 9, 0));
    expect(advanceRecurringDate(new Date(2026, 5, 4, 9, 0), { intervalUnit: 'month', intervalValue: 4 })).toEqual(new Date(2026, 9, 4, 9, 0));
    expect(advanceRecurringDate(new Date(2026, 5, 4, 9, 0), { intervalUnit: 'year', intervalValue: 5 })).toEqual(new Date(2031, 5, 4, 9, 0));
  });
});

describe('calculateNextOccurrence', () => {
  it('returns the next occurrence after the original scheduled time', () => {
    expect(calculateNextOccurrence('2026-06-04T09:00:00', { intervalUnit: 'week', intervalValue: 1 }, new Date(2026, 5, 4, 8, 0))).toBe('2026-06-11T09:00:00');
  });

  it('catches up repeated occurrences until the next date is not in the past', () => {
    expect(calculateNextOccurrence('2026-06-01T09:00:00', { intervalUnit: 'day', intervalValue: 1 }, new Date(2026, 5, 4, 8, 0))).toBe('2026-06-04T09:00:00');
  });

  it('uses now as the base when the task has no scheduled start', () => {
    expect(calculateNextOccurrence(null, { intervalUnit: 'day', intervalValue: 1 }, new Date(2026, 5, 4, 8, 30))).toBe('2026-06-05T08:30:00');
  });
});

describe('preserveTaskDuration', () => {
  it('preserves the original start/end duration on the next start', () => {
    expect(preserveTaskDuration({
      originalStartDateTime: '2026-06-04T09:15:00',
      originalEndDateTime: '2026-06-04T10:45:00',
      nextStartDateTime: '2026-06-11T09:15:00',
    })).toBe('2026-06-11T10:45:00');
  });

  it('returns null when original start or end is missing', () => {
    expect(preserveTaskDuration({
      originalStartDateTime: '2026-06-04T09:15:00',
      originalEndDateTime: null,
      nextStartDateTime: '2026-06-11T09:15:00',
    })).toBeNull();
    expect(preserveTaskDuration({
      originalStartDateTime: null,
      originalEndDateTime: '2026-06-04T10:45:00',
      nextStartDateTime: '2026-06-11T09:15:00',
    })).toBeNull();
  });
});

describe('buildRecurringTaskSchedule', () => {
  it('builds the next recurring schedule and preserves duration', () => {
    expect(buildRecurringTaskSchedule({
      dateTimeScheduled: '2026-06-04T09:15:00',
      endDateTimeScheduled: '2026-06-04T10:45:00',
      interval: { intervalUnit: 'week', intervalValue: 1 },
      now: new Date(2026, 5, 4, 8, 0),
    })).toEqual({
      dateTimeScheduled: '2026-06-11T09:15:00',
      endDateTimeScheduled: '2026-06-11T10:45:00',
    });
  });

  it('builds a recurring schedule without an end time', () => {
    expect(buildRecurringTaskSchedule({
      dateTimeScheduled: '2026-06-04T09:15:00',
      endDateTimeScheduled: null,
      interval: { intervalUnit: 'day', intervalValue: 1 },
      now: new Date(2026, 5, 4, 8, 0),
    })).toEqual({
      dateTimeScheduled: '2026-06-05T09:15:00',
      endDateTimeScheduled: null,
    });
  });
});

describe('recurrence display and compatibility', () => {
  it('formats singular and plural intervals', () => {
    expect(formatRecurrenceInterval(null)).toBe('Do not repeat');
    expect(formatRecurrenceInterval({ intervalUnit: 'day', intervalValue: 1 })).toBe('Every day');
    expect(formatRecurrenceInterval({ intervalUnit: 'week', intervalValue: 1 })).toBe('Every week');
    expect(formatRecurrenceInterval({ intervalUnit: 'month', intervalValue: 3 })).toBe('Every 3 months');
    expect(formatRecurrenceInterval({ intervalUnit: 'year', intervalValue: 5 })).toBe('Every 5 years');
  });

  it('normalizes legacy frequencies to intervals', () => {
    expect(legacyFrequencyToInterval('daily')).toEqual({ intervalUnit: 'day', intervalValue: 1 });
    expect(legacyFrequencyToInterval('weekly')).toEqual({ intervalUnit: 'week', intervalValue: 1 });
    expect(legacyFrequencyToInterval('monthly')).toEqual({ intervalUnit: 'month', intervalValue: 1 });
  });
});
