import type { Ampm } from './taskForm';

export type TaskTimeShiftUnit = 'hour' | 'day';

export type TaskTimeShiftInput = {
  unit: TaskTimeShiftUnit;
  date: string;
  showTime: boolean;
  hour: string;
  minute: string;
  ampm: Ampm;
  is24Hour: boolean;
  now?: Date;
};

export type TaskTimeShiftResult = {
  date: string;
  hour?: string;
  minute?: string;
  ampm?: Ampm;
  showTime?: boolean;
};

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function calculateTaskTimeShift({
  unit,
  date,
  showTime,
  hour,
  minute,
  ampm,
  is24Hour,
  now = new Date(),
}: TaskTimeShiftInput): TaskTimeShiftResult {
  let base: Date;
  if (date) {
    const [year, month, day] = date.split('-').map(Number);
    if (showTime) {
      let hour24 = parseInt(hour, 10);
      if (!is24Hour) {
        if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
        if (ampm === 'AM' && hour24 === 12) hour24 = 0;
      }
      base = new Date(year, month - 1, day, hour24, parseInt(minute, 10));
    } else {
      base = new Date(year, month - 1, day, unit === 'hour' ? now.getHours() : 0, unit === 'hour' ? now.getMinutes() : 0);
    }
  } else {
    base = new Date(now);
  }

  const shifted = unit === 'hour'
    ? new Date(base.getTime() + 60 * 60 * 1000)
    : new Date(base.getTime() + 24 * 60 * 60 * 1000);

  const nextDate = formatLocalDate(shifted);
  if (unit === 'day') return { date: nextDate };

  const hour24 = shifted.getHours();
  const nextMinute = String(shifted.getMinutes()).padStart(2, '0');
  if (is24Hour) {
    return { date: nextDate, hour: String(hour24).padStart(2, '0'), minute: nextMinute, showTime: true };
  }
  return {
    date: nextDate,
    hour: String(hour24 % 12 || 12).padStart(2, '0'),
    minute: nextMinute,
    ampm: hour24 >= 12 ? 'PM' : 'AM',
    showTime: true,
  };
}
