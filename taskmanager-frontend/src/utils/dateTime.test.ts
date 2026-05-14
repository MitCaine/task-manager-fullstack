import { buildDateTimeString, formatDate, extractDateParts } from './dateTime';

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
