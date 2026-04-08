type Ampm = 'AM' | 'PM';

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
  // Strip timezone offset so the backend receives the user's local time as-is
  return new Date(local.getTime() - local.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
}
