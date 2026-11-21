import type { TeeTime } from '@/lib/types/tee-time';
import { ccTokens } from '@/lib/utils/mapPins';

interface CourseNames {
  cc_name: string | null;
  display_name?: string | null;
  course_name?: string | null;
  is_active: boolean;
}

/** Same venue when one name's tokens are all in the other's ("클럽72CC 레이크" ⊂ "클럽72CC 바다 레이크"). */
function sameCc(a: string, b: string): boolean {
  const ta = ccTokens(a);
  const tb = ccTokens(b);
  if (!ta.length || !tb.length) return false;
  const sa = new Set(ta);
  const sb = new Set(tb);
  return ta.every((t) => sb.has(t)) || tb.every((t) => sa.has(t));
}

/**
 * Apply the region filter's per-club cc restrictions to tee times. Course rows
 * (cc_name) and scraped cc names are spelled differently, so match by tokens. A cc
 * that matches none of the club's course rows was picked by the club-level region
 * and is kept.
 */
export function filterByCcRestrictions(
  rows: TeeTime[],
  restrictions: Record<string, string[]>,
  clubs: Array<{ id: string; courses?: CourseNames[] }>,
): TeeTime[] {
  if (Object.keys(restrictions).length === 0) return rows;
  const namesByClub = new Map(
    clubs.map((c) => [
      c.id,
      (c.courses ?? [])
        .filter((k) => k.is_active)
        .flatMap((k) => [k.cc_name, k.display_name, k.course_name])
        .filter((n): n is string => !!n),
    ]),
  );
  return rows.filter((t) => {
    const allowed = restrictions[t.club_id];
    if (!allowed) return true;
    if (allowed.some((a) => sameCc(a, t.cc_name))) return true;
    return !(namesByClub.get(t.club_id) ?? []).some((n) => sameCc(n, t.cc_name));
  });
}
