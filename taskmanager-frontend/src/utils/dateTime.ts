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
  const d = new Date(dt);
  const datePart = d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) return datePart;
  return d.toLocaleString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: !is24Hour,
  });
}

/**
 * Parses a dateTimeScheduled string into the individual fields used by the
 * edit form (date, hour, minute, ampm). Respects the is24Hour display setting.
 */
export function extractDateParts(
  dt: string,
  is24Hour: boolean
): { date: string; hour: string; minute: string; ampm: Ampm } {
  const d = new Date(dt);
  const h24 = d.getHours();
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    hour: is24Hour ? String(h24).padStart(2, '0') : String(h24 % 12 || 12).padStart(2, '0'),
    minute: String(d.getMinutes()).padStart(2, '0'),
    ampm: h24 >= 12 ? 'PM' : 'AM',
  };
}
