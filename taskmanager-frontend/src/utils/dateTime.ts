type Ampm = 'AM' | 'PM';

export function parseLocalDateTime(dt: string): Date {
  return new Date(dt);
}

export function toLocalDateTimeString(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
}

export function dateOnlyToLocalDateTimeString(date: string): string {
  return `${date}T00:00:00`;
}

function datePart(dt: string, locale: string): string {
  const d = parseLocalDateTime(dt);
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTime(
  dt: string,
  is24Hour: boolean
): string {
  const d = parseLocalDateTime(dt);
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  if (is24Hour) return `${String(hours).padStart(2, '0')}:${minutes}`;

  const displayHour = hours % 12 || 12;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${displayHour}:${minutes} ${suffix}`;
}

export function formatDateTime(
  dt: string,
  locale: string,
  is24Hour: boolean
): string {
  return `${datePart(dt, locale)}, ${formatTime(dt, is24Hour)}`;
}

/**
 * Builds an ISO-8601 local datetime string (without timezone) from the
 * individual date/time fields used by the task form.
 *
 * The result is always in "YYYY-MM-DDTHH:mm:ss" format, which is what the
 * Spring backend expects for LocalDateTime deserialization.
 */
export function buildDateTimeString(
  date: string,
  hour: string,
  minute: string,
  ampm: Ampm,
  is24Hour: boolean
): string {
  const [year, month, day] = date.split('-').map(Number);
  let hr = parseInt(hour, 10);
  if (!is24Hour) {
    if (ampm === 'PM' && hr !== 12) hr += 12;
    if (ampm === 'AM' && hr === 12) hr = 0;
  }
  const local = new Date(year, month - 1, day, hr, parseInt(minute, 10));
  // Strip timezone offset so the backend receives the user's local time as-is.
  return toLocalDateTimeString(local);
}

export function buildTaskDateTimeString(
  date: string,
  showTime: boolean,
  hour: string,
  minute: string,
  ampm: Ampm,
  is24Hour: boolean
): string | null {
  if (!date) return null;
  return showTime
    ? buildDateTimeString(date, hour, minute, ampm, is24Hour)
    : dateOnlyToLocalDateTimeString(date);
}

export function compareLocalDateTimes(start: string, end: string): number {
  return parseLocalDateTime(end).getTime() - parseLocalDateTime(start).getTime();
}

export function isMidnightLocalDateTime(dt: string): boolean {
  const d = parseLocalDateTime(dt);
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
}

export function isSameLocalDate(dt: string, date: Date): boolean {
  return parseLocalDateTime(dt).toDateString() === date.toDateString();
}

export function isInLocalWeek(dt: string, weekStart: Date, weekEnd: Date): boolean {
  const d = parseLocalDateTime(dt);
  return d >= weekStart && d < weekEnd;
}

export function isInLocalMonth(dt: string, date: Date): boolean {
  const d = parseLocalDateTime(dt);
  return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
}

/**
 * Formats a dateTimeScheduled string for display in the task list / edit panel.
 * If the time is midnight (00:00:00) it is treated as "date only" and omitted.
 */
export function formatDate(
  dt: string | null | undefined,
  locale: string,
  is24Hour: boolean
): string {
  if (!dt) return '';
  const d = parseLocalDateTime(dt);
  const date = datePart(dt, locale);
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) return date;
  return `${date}, ${formatTime(dt, is24Hour)}`;
}

/**
 * Parses a dateTimeScheduled string into the individual fields used by the
 * edit form (date, hour, minute, ampm). Respects the is24Hour display setting.
 */
export function extractDateParts(
  dt: string,
  is24Hour: boolean
): { date: string; hour: string; minute: string; ampm: Ampm } {
  const d = parseLocalDateTime(dt);
  const h24 = d.getHours();
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    hour: is24Hour ? String(h24).padStart(2, '0') : String(h24 % 12 || 12).padStart(2, '0'),
    minute: String(d.getMinutes()).padStart(2, '0'),
    ampm: h24 >= 12 ? 'PM' : 'AM',
  };
}
