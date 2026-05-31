const KST_OFFSET_MS = 9 * 3600 * 1000;
const DAY_MS = 86400000;

/** Current date in KST (UTC+9, no DST) as `YYYY-MM-DD`. */
export function kstToday(now: number = Date.now()): string {
  return new Date(now + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Reservable dates D+1..D+14 relative to KST today, as `YYYY-MM-DD` strings. */
export function datesInRange(now: number = Date.now()): string[] {
  return Array.from({ length: 14 }, (_, i) => kstToday(now + (i + 1) * DAY_MS));
}

/** Whether `date` (`YYYY-MM-DD`) falls within the D+1..D+14 reservable window. */
export function isDateInRange(date: string, now: number = Date.now()): boolean {
  return datesInRange(now).includes(date);
}
