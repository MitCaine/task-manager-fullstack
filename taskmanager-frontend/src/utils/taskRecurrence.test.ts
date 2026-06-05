import {
  advanceRecurringDate,
  buildRecurringTaskSchedule,
  calculateNextOccurrence,
  preserveTaskDuration,
} from './taskRecurrence';

describe('advanceRecurringDate', () => {
  it('advances daily, weekly, and monthly recurrence dates', () => {
    expect(advanceRecurringDate(new Date(2026, 5, 4, 9, 0), 'daily')).toEqual(new Date(2026, 5, 5, 9, 0));
    expect(advanceRecurringDate(new Date(2026, 5, 4, 9, 0), 'weekly')).toEqual(new Date(2026, 5, 11, 9, 0));
    expect(advanceRecurringDate(new Date(2026, 5, 4, 9, 0), 'monthly')).toEqual(new Date(2026, 6, 4, 9, 0));
  });

  it('leaves unknown frequencies unchanged', () => {
    const start = new Date(2026, 5, 4, 9, 0);
    expect(advanceRecurringDate(start, 'yearly')).toEqual(start);
  });
});

describe('calculateNextOccurrence', () => {
  it('returns the next occurrence after the original scheduled time', () => {
    expect(calculateNextOccurrence('2026-06-04T09:00:00', 'weekly', new Date(2026, 5, 4, 8, 0))).toBe('2026-06-11T09:00:00');
  });

  it('catches up repeated occurrences until the next date is not in the past', () => {
    expect(calculateNextOccurrence('2026-06-01T09:00:00', 'daily', new Date(2026, 5, 4, 8, 0))).toBe('2026-06-04T09:00:00');
  });

  it('uses now as the base when the task has no scheduled start', () => {
    expect(calculateNextOccurrence(null, 'daily', new Date(2026, 5, 4, 8, 30))).toBe('2026-06-05T08:30:00');
  });

  it('preserves current no-op behavior for unknown frequencies', () => {
    expect(calculateNextOccurrence('2026-06-05T09:00:00', 'yearly', new Date(2026, 5, 4, 8, 0))).toBe('2026-06-05T09:00:00');
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
      frequency: 'weekly',
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
      frequency: 'daily',
      now: new Date(2026, 5, 4, 8, 0),
    })).toEqual({
      dateTimeScheduled: '2026-06-05T09:15:00',
      endDateTimeScheduled: null,
    });
  });
});
