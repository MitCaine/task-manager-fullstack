import {
  buildDateTimeString,
  buildTaskDateTimeString,
  compareLocalDateTimes,
  dateOnlyToLocalDateTimeString,
  extractDateParts,
  formatDate,
  formatTime,
  getLocalWeekRange,
  getLocalWeekStart,
  isInLocalMonth,
  isInLocalWeek,
  isMidnightLocalDateTime,
  isSameLocalDate,
  toLocalDateTimeString,
} from './dateTime';

// buildDateTimeString converts form fields into backend LocalDateTime strings.

describe('buildDateTimeString', () => {
// Regular cases in 12-hour mode.

  test('12-hour PM converts hour correctly', () => {
    const result = buildDateTimeString('2026-04-08', '03', '30', 'PM', false);
    expect(result).toBe('2026-04-08T15:30:00');
  });

  test('12-hour AM keeps hour as-is', () => {
    const result = buildDateTimeString('2026-04-08', '08', '00', 'AM', false);
    expect(result).toBe('2026-04-08T08:00:00');
  });

  test('12-hour with minutes set correctly', () => {
    const result = buildDateTimeString('2026-06-15', '02', '45', 'PM', false);
    expect(result).toBe('2026-06-15T14:45:00');
  });

// Regular cases in 24-hour mode.

  test('24-hour mode ignores ampm parameter', () => {
    const result = buildDateTimeString('2026-04-08', '15', '30', 'PM', true);
    expect(result).toBe('2026-04-08T15:30:00');
  });

  test('24-hour mode with AM passed still uses raw hour', () => {
    const result = buildDateTimeString('2026-04-08', '09', '00', 'AM', true);
    expect(result).toBe('2026-04-08T09:00:00');
  });

// Edge cases for 12 AM, 12 PM, midnight, and noon.

  test('12 PM stays as hour 12 (noon)', () => {
    const result = buildDateTimeString('2026-01-01', '12', '00', 'PM', false);
    expect(result).toBe('2026-01-01T12:00:00');
  });

  test('12 AM converts to hour 0 (midnight)', () => {
    const result = buildDateTimeString('2026-01-01', '12', '00', 'AM', false);
    expect(result).toBe('2026-01-01T00:00:00');
  });

// Boundary times stay on the provided local date.

  test('24-hour 00:00 produces midnight string', () => {
    const result = buildDateTimeString('2026-04-08', '00', '00', 'AM', true);
    expect(result).toBe('2026-04-08T00:00:00');
  });

  test('24-hour 23:59 produces end-of-day string', () => {
    const result = buildDateTimeString('2026-04-08', '23', '59', 'AM', true);
    expect(result).toBe('2026-04-08T23:59:00');
  });

  test('result is always exactly 19 characters (no timezone suffix)', () => {
    const result = buildDateTimeString('2026-04-08', '10', '30', 'AM', false);
    expect(result).toHaveLength(19);
    expect(result).not.toContain('Z');
    expect(result).not.toContain('+');
  });
});

describe('local datetime helpers', () => {
  test('toLocalDateTimeString preserves local wall-clock values without timezone suffix', () => {
    const result = toLocalDateTimeString(new Date(2026, 3, 8, 15, 30, 0));
    expect(result).toBe('2026-04-08T15:30:00');
    expect(result).toHaveLength(19);
    expect(result).not.toContain('Z');
  });

  test('dateOnlyToLocalDateTimeString keeps date-only task payload shape', () => {
    expect(dateOnlyToLocalDateTimeString('2026-04-08')).toBe('2026-04-08T00:00:00');
  });

  test('buildTaskDateTimeString returns null for empty date', () => {
    expect(buildTaskDateTimeString('', false, '12', '00', 'AM', false)).toBeNull();
  });

  test('buildTaskDateTimeString uses midnight for date-only tasks', () => {
    expect(buildTaskDateTimeString('2026-04-08', false, '03', '30', 'PM', false)).toBe('2026-04-08T00:00:00');
  });

  test('buildTaskDateTimeString uses selected time when enabled', () => {
    expect(buildTaskDateTimeString('2026-04-08', true, '03', '30', 'PM', false)).toBe('2026-04-08T15:30:00');
  });

  test('compareLocalDateTimes returns positive only when end is after start', () => {
    expect(compareLocalDateTimes('2026-04-08T15:30:00', '2026-04-08T16:30:00')).toBeGreaterThan(0);
    expect(compareLocalDateTimes('2026-04-08T15:30:00', '2026-04-08T15:30:00')).toBe(0);
  });

  test('isMidnightLocalDateTime identifies date-only midnight values', () => {
    expect(isMidnightLocalDateTime('2026-04-08T00:00:00')).toBe(true);
    expect(isMidnightLocalDateTime('2026-04-08T00:01:00')).toBe(false);
  });

  test('local date range helpers match existing tab semantics', () => {
    const reference = new Date(2026, 3, 8, 12, 0, 0);
    const weekStart = new Date(2026, 3, 6, 0, 0, 0);
    const weekEnd = new Date(2026, 3, 13, 0, 0, 0);

    expect(isSameLocalDate('2026-04-08T23:59:00', reference)).toBe(true);
    expect(isInLocalWeek('2026-04-12T23:59:00', weekStart, weekEnd)).toBe(true);
    expect(isInLocalWeek('2026-04-13T00:00:00', weekStart, weekEnd)).toBe(false);
    expect(isInLocalMonth('2026-04-30T12:00:00', reference)).toBe(true);
    expect(isInLocalMonth('2026-05-01T00:00:00', reference)).toBe(false);
  });

  test('local week helpers use Monday start and exclude the following Monday', () => {
    const reference = new Date(2026, 3, 8, 12, 0, 0);
    const week = getLocalWeekRange(reference);

    expect(getLocalWeekStart(reference)).toEqual(new Date(2026, 3, 6, 0, 0, 0));
    expect(week.start).toEqual(new Date(2026, 3, 6, 0, 0, 0));
    expect(week.end).toEqual(new Date(2026, 3, 13, 0, 0, 0));
    expect(isInLocalWeek('2026-04-05T23:59:00', week.start, week.end)).toBe(false);
    expect(isInLocalWeek('2026-04-06T00:00:00', week.start, week.end)).toBe(true);
    expect(isInLocalWeek('2026-04-12T23:59:00', week.start, week.end)).toBe(true);
    expect(isInLocalWeek('2026-04-13T00:00:00', week.start, week.end)).toBe(false);
  });
});

// formatDate hides midnight times for date-only tasks.

describe('formatDate', () => {
  test('returns empty string for null', () => {
    expect(formatDate(null, 'en-US', false)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(formatDate(undefined, 'en-US', false)).toBe('');
  });

  test('midnight time is treated as date-only — no time portion shown', () => {
    // A date stored as T00:00:00 should display just the date, no hours/minutes
    const result = formatDate('2026-06-15T00:00:00', 'en-US', false);
    expect(result).not.toMatch(/\d{1,2}:\d{2}/); // no HH:MM in output
    expect(result).toContain('2026');
  });

  test('non-midnight time includes time in output', () => {
    const result = formatDate('2026-06-15T14:30:00', 'en-US', false);
    expect(result).toMatch(/\d{1,2}:\d{2}/); // HH:MM present
    expect(result).toContain('2026');
  });

  test('12-hour mode output differs from 24-hour mode for afternoon times', () => {
    const dt = '2026-06-15T14:30:00';
    const result12 = formatDate(dt, 'en-US', false);
    const result24 = formatDate(dt, 'en-US', true);
// 12-hour and 24-hour displays should use different time text.
    expect(result12).not.toBe(result24);
  });

  test('en-GB locale formats date differently from en-US', () => {
    const dt = '2026-06-15T00:00:00';
    const us = formatDate(dt, 'en-US', false);
    const gb = formatDate(dt, 'en-GB', false);
    // Both contain the date components but in different order/format
    expect(us).not.toBe(gb);
    // Both should contain the year and month/day digits
    expect(us).toContain('2026');
    expect(gb).toContain('2026');
  });

  test('morning time (non-midnight) includes both date and time', () => {
    const result = formatDate('2026-04-08T09:00:00', 'en-US', false);
    expect(result.length).toBeGreaterThan(8); // more than just a date
    expect(result).toMatch(/9|09/); // hour visible
  });

  test('European date format keeps uppercase AM/PM in 12-hour mode', () => {
    const result = formatDate('2026-06-15T21:00:00', 'en-GB', false);
    expect(result).toContain('9:00 PM');
    expect(result).not.toMatch(/\bpm\b/);
  });

  test('24-hour mode displays afternoon times with converted hour', () => {
    expect(formatDate('2026-06-15T21:00:00', 'en-US', true)).toContain('21:00');
  });
});

describe('formatTime', () => {
  test('9 PM displays uppercase in 12-hour mode', () => {
    expect(formatTime('2026-06-15T21:00:00', false)).toBe('9:00 PM');
  });

  test('9 PM displays as 21:00 in 24-hour mode', () => {
    expect(formatTime('2026-06-15T21:00:00', true)).toBe('21:00');
  });

  test('12 PM displays as 12:00 in 24-hour mode', () => {
    expect(formatTime('2026-06-15T12:00:00', true)).toBe('12:00');
  });

  test('12 AM displays as 00:00 in 24-hour mode', () => {
    expect(formatTime('2026-06-15T00:00:00', true)).toBe('00:00');
  });

  test('1:05 AM displays as 01:05 in 24-hour mode', () => {
    expect(formatTime('2026-06-15T01:05:00', true)).toBe('01:05');
  });
});

// extractDateParts maps stored datetimes back to form fields.

describe('extractDateParts', () => {
  test('extracts date in YYYY-MM-DD format', () => {
    const { date } = extractDateParts('2026-06-15T14:30:00', false);
    expect(date).toBe('2026-06-15');
  });

  test('zero-pads single-digit months and days', () => {
    const { date } = extractDateParts('2026-01-05T09:00:00', false);
    expect(date).toBe('2026-01-05');
  });

  test('12h mode: afternoon hour converts to 12h (14 → 02)', () => {
    const { hour, ampm } = extractDateParts('2026-06-15T14:30:00', false);
    expect(hour).toBe('02');
    expect(ampm).toBe('PM');
  });

  test('12h mode: noon (12:00) → hour=12, ampm=PM', () => {
    const { hour, ampm } = extractDateParts('2026-06-15T12:00:00', false);
    expect(hour).toBe('12');
    expect(ampm).toBe('PM');
  });

  test('12h mode: midnight (00:00) → hour=12, ampm=AM', () => {
    const { hour, ampm } = extractDateParts('2026-06-15T00:00:00', false);
    expect(hour).toBe('12');
    expect(ampm).toBe('AM');
  });

  test('12h mode: morning hour is AM (09:05 → hour=09, ampm=AM)', () => {
    const { hour, ampm } = extractDateParts('2026-06-15T09:05:00', false);
    expect(hour).toBe('09');
    expect(ampm).toBe('AM');
  });

  test('24h mode: hour stays as-is (14 → "14")', () => {
    const { hour, ampm } = extractDateParts('2026-06-15T14:30:00', true);
    expect(hour).toBe('14');
    expect(ampm).toBe('PM'); // ampm field still set but irrelevant in 24h
  });

  test('24h mode: midnight → hour=00', () => {
    const { hour } = extractDateParts('2026-06-15T00:00:00', true);
    expect(hour).toBe('00');
  });

  test('minutes are always zero-padded (05 not 5)', () => {
    const { minute } = extractDateParts('2026-06-15T14:05:00', false);
    expect(minute).toBe('05');
  });

  test('minutes at 30 return "30"', () => {
    const { minute } = extractDateParts('2026-06-15T14:30:00', false);
    expect(minute).toBe('30');
  });
});
