import { calculateTaskTimeShift } from './taskTimeShift';

describe('calculateTaskTimeShift', () => {
  it('shifts an existing 12-hour time by one hour across noon', () => {
    expect(calculateTaskTimeShift({
      unit: 'hour',
      date: '2026-06-04',
      showTime: true,
      hour: '11',
      minute: '30',
      ampm: 'AM',
      is24Hour: false,
    })).toEqual({
      date: '2026-06-04',
      hour: '12',
      minute: '30',
      ampm: 'PM',
      showTime: true,
    });
  });

  it('shifts a 24-hour time by one hour across midnight and rolls the date', () => {
    expect(calculateTaskTimeShift({
      unit: 'hour',
      date: '2026-06-04',
      showTime: true,
      hour: '23',
      minute: '45',
      ampm: 'AM',
      is24Hour: true,
    })).toEqual({
      date: '2026-06-05',
      hour: '00',
      minute: '45',
      showTime: true,
    });
  });

  it('shifts a date-only task by one hour using the provided clock and enables time', () => {
    expect(calculateTaskTimeShift({
      unit: 'hour',
      date: '2026-06-04',
      showTime: false,
      hour: '12',
      minute: '00',
      ampm: 'AM',
      is24Hour: false,
      now: new Date(2026, 5, 4, 14, 20),
    })).toEqual({
      date: '2026-06-04',
      hour: '03',
      minute: '20',
      ampm: 'PM',
      showTime: true,
    });
  });

  it('shifts a missing date from the provided clock', () => {
    expect(calculateTaskTimeShift({
      unit: 'hour',
      date: '',
      showTime: false,
      hour: '12',
      minute: '00',
      ampm: 'AM',
      is24Hour: true,
      now: new Date(2026, 5, 4, 23, 10),
    })).toEqual({
      date: '2026-06-05',
      hour: '00',
      minute: '10',
      showTime: true,
    });
  });

  it('shifts by one day and preserves existing time fields outside the calculation result', () => {
    expect(calculateTaskTimeShift({
      unit: 'day',
      date: '2026-06-30',
      showTime: true,
      hour: '11',
      minute: '45',
      ampm: 'PM',
      is24Hour: false,
    })).toEqual({ date: '2026-07-01' });
  });

  it('uses midnight for date-only day shifts', () => {
    expect(calculateTaskTimeShift({
      unit: 'day',
      date: '2026-12-31',
      showTime: false,
      hour: '12',
      minute: '00',
      ampm: 'AM',
      is24Hour: false,
      now: new Date(2026, 11, 31, 18, 45),
    })).toEqual({ date: '2027-01-01' });
  });
});
