/**
 * Freshness match rule for the tee-time watch bot.
 *
 * `tee_times` rows are never deleted. A scrape upserts open slots with
 * `scraped_at = <run timestamp>` (re-stamped each successful run); a booked slot
 * stops being returned and its row freezes at its last-seen `scraped_at`.
 * So a tee_time is "open NOW" iff `row.scraped_at >= S`, where `S` is the latest
 * SUCCESSFUL scrape timestamp for that club+date.
 */

/** Backstop window: if S itself is older than this, treat the data as stale. */
export const BACKSTOP_MS = 180 * 60 * 1000;

export interface TeeTimeRow {
  club_id: string;
  teeoff: string; // HH:MM or HH:MM:SS
  scraped_at: string;
}

export interface Watch {
  club_id: string;
  time_from: string; // HH:MM
  time_to: string; // HH:MM
}

/**
 * Latest successful scrape timestamp over `results` (already success-filtered by
 * the caller — failed attempts are simply absent). Returns the lexical max
 * `scraped_at`, ignoring null/undefined; `null` if empty or all-null.
 * ISO UTC strings compare lexically == chronologically.
 */
export function computeS(results: { scraped_at: string | null }[]): string | null {
  let max: string | null = null;
  for (const r of results) {
    if (r.scraped_at != null && (max === null || r.scraped_at > max)) {
      max = r.scraped_at;
    }
  }
  return max;
}

/** Normalize a time to comparable `HH:MM`. */
const hhmm = (t: string): string => t.slice(0, 5);

/**
 * Rows matching `watch` that are open NOW relative to freshness anchor `S`.
 * `now` is epoch ms.
 */
export function matchWatch<T extends TeeTimeRow>(
  watch: Watch,
  rows: T[],
  S: string | null,
  now: number,
): T[] {
  if (S == null) return [];
  if (Date.parse(S) < now - BACKSTOP_MS) return [];

  const from = hhmm(watch.time_from);
  const to = hhmm(watch.time_to);

  return rows.filter((row) => {
    if (row.club_id !== watch.club_id) return false;
    if (row.scraped_at < S) return false;
    const t = hhmm(row.teeoff);
    return from <= t && t <= to;
  });
}
