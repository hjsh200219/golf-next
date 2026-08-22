/**
 * Tee-times are never deleted. A successful scrape restamps still-open slots
 * with `scraped_at = S`; a booked slot freezes at its last-seen timestamp.
 * A row is open now iff `row.scraped_at >= S`, where S is the latest
 * successful scrape for that club+date (`scrape_club_results`).
 */

export function latestSuccessByClub(
  results: { club_id: string; scraped_at: string | null }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of results) {
    if (r.scraped_at == null) continue;
    const prev = map.get(r.club_id);
    if (prev === undefined || r.scraped_at > prev) {
      map.set(r.club_id, r.scraped_at);
    }
  }
  return map;
}

export function filterLiveTeeTimes<T extends { club_id: string; scraped_at: string }>(
  rows: T[],
  sByClub: Map<string, string>,
): T[] {
  return rows.filter((row) => {
    const S = sByClub.get(row.club_id);
    if (S == null) return false;
    return row.scraped_at >= S;
  });
}
