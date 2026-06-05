import { buildTaskSchedule, getDefaultEndTime } from './taskScheduling';

describe('buildTaskSchedule', () => {
  it('builds a date-only start schedule without an end date', () => {
    expect(buildTaskSchedule({
      date: '2026-06-04',
      showTime: false,
      hour: '03',
      minute: '30',
      ampm: 'PM',
      showEndTime: false,
      endHour: '04',
      endMinute: '30',
      endAmpm: 'PM',
      is24Hour: false,
    })).toEqual({
      dateTimeScheduled: '2026-06-04T00:00:00',
      endDateTimeScheduled: null,
    });
  });

  it('builds timed start and end schedules', () => {
    expect(buildTaskSchedule({
      date: '2026-06-04',
      showTime: true,
      hour: '03',
      minute: '30',
      ampm: 'PM',
      showEndTime: true,
      endHour: '04',
      endMinute: '45',
      endAmpm: 'PM',
      is24Hour: false,
    })).toEqual({
      dateTimeScheduled: '2026-06-04T15:30:00',
      endDateTimeScheduled: '2026-06-04T16:45:00',
    });
  });

  it('returns null start and end schedules when date is empty', () => {
    expect(buildTaskSchedule({
      date: '',
      showTime: true,
      hour: '09',
      minute: '00',
      ampm: 'AM',
      showEndTime: true,
      endHour: '10',
      endMinute: '00',
      endAmpm: 'AM',
      is24Hour: false,
    })).toEqual({
      dateTimeScheduled: null,
      endDateTimeScheduled: null,
    });
  });
});

describe('getDefaultEndTime', () => {
  it('adds one hour in 24-hour mode and preserves minute and hidden AM/PM state', () => {
    expect(getDefaultEndTime({ hour: '23', minute: '15', ampm: 'AM', is24Hour: true })).toEqual({
      endHour: '00',
      endMinute: '15',
      endAmpm: 'AM',
    });
  });

  it('crosses noon in 12-hour mode', () => {
    expect(getDefaultEndTime({ hour: '11', minute: '45', ampm: 'AM', is24Hour: false })).toEqual({
      endHour: '12',
      endMinute: '45',
      endAmpm: 'PM',
    });
  });

  it('crosses midnight in 12-hour mode', () => {
    expect(getDefaultEndTime({ hour: '11', minute: '05', ampm: 'PM', is24Hour: false })).toEqual({
      endHour: '12',
      endMinute: '05',
      endAmpm: 'AM',
    });
  });
});
