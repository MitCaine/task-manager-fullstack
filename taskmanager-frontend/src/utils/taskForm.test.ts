import {
  TASK_TIME_RANGE_ERROR,
  convertHourForTimeMode,
  validateTaskTimeRange,
} from './taskForm';

describe('validateTaskTimeRange', () => {
  test('allows empty start or end values', () => {
    expect(validateTaskTimeRange(null, '2026-06-15T10:00:00')).toBeNull();
    expect(validateTaskTimeRange('2026-06-15T09:00:00', null)).toBeNull();
  });

  test('allows an end time after start time', () => {
    expect(validateTaskTimeRange('2026-06-15T09:00:00', '2026-06-15T10:00:00')).toBeNull();
  });

  test('rejects an end time equal to or before start time', () => {
    expect(validateTaskTimeRange('2026-06-15T09:00:00', '2026-06-15T09:00:00')).toBe(TASK_TIME_RANGE_ERROR);
    expect(validateTaskTimeRange('2026-06-15T09:00:00', '2026-06-15T08:59:00')).toBe(TASK_TIME_RANGE_ERROR);
  });
});

describe('convertHourForTimeMode', () => {
  test('converts 12-hour PM to 24-hour time', () => {
    expect(convertHourForTimeMode('03', 'PM', true)).toEqual({ hour: '15', ampm: 'PM' });
  });

  test('converts 12 AM to 00 in 24-hour time', () => {
    expect(convertHourForTimeMode('12', 'AM', true)).toEqual({ hour: '00', ampm: 'AM' });
  });

  test('converts 24-hour values to 12-hour display values', () => {
    expect(convertHourForTimeMode('00', 'AM', false)).toEqual({ hour: '12', ampm: 'AM' });
    expect(convertHourForTimeMode('13', 'AM', false)).toEqual({ hour: '01', ampm: 'PM' });
  });
});
