import { buildDateTimeString } from './dateTime';

describe('buildDateTimeString', () => {
  // -------------------------------------------------------------------------
  // Regular cases — 12-hour mode
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Regular cases — 24-hour mode
  // -------------------------------------------------------------------------

  test('24-hour mode ignores ampm parameter', () => {
    // "03 PM" in 24-hour mode should stay as hour 03, not convert to 15
    const result = buildDateTimeString('2026-04-08', '15', '30', 'PM', true);
    expect(result).toBe('2026-04-08T15:30:00');
  });

  test('24-hour mode with AM passed still uses raw hour', () => {
    const result = buildDateTimeString('2026-04-08', '09', '00', 'AM', true);
    expect(result).toBe('2026-04-08T09:00:00');
  });

  // -------------------------------------------------------------------------
  // Edge cases — 12 AM / 12 PM (midnight / noon)
  // -------------------------------------------------------------------------

  test('12 PM stays as hour 12 (noon)', () => {
    const result = buildDateTimeString('2026-01-01', '12', '00', 'PM', false);
    expect(result).toBe('2026-01-01T12:00:00');
  });

  test('12 AM converts to hour 0 (midnight)', () => {
    const result = buildDateTimeString('2026-01-01', '12', '00', 'AM', false);
    expect(result).toBe('2026-01-01T00:00:00');
  });

  // -------------------------------------------------------------------------
  // Edge cases — boundary times
  // -------------------------------------------------------------------------

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
