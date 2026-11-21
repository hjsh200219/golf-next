import type { TeeTime } from '@/lib/types/tee-time';
import type { ClubWithCourses } from '@/hooks/useClubs';
import { normalizeDisplayCcName } from '@/lib/utils/group';
import { getRegionForClub } from '@/lib/constants/regions';

/** One place on the map/list: a golf course (cc) of a club, with its open tee times. */
export interface ClubSpot {
  key: string;
  clubId: string;
  /** User-facing cc name (affiliate prefix stripped) */
  label: string;
  count: number;
  lowestPrice: number | null;
  /** null when the course has no known coordinates — listed, but not pinned */
  lat: number | null;
  lon: number | null;
  region: string | null;
  /** Sorted by teeoff ascending */
  teeTimes: TeeTime[];
}

type Course = ClubWithCourses['courses'][number];

const SUFFIX = /(cc|gc|gcc|컨트리클럽|골프클럽)$/u;

export function ccTokens(name: string): string[] {
  return normalizeDisplayCcName(name)
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(SUFFIX, ''))
    .filter(Boolean);
}

function courseNames(c: Course): string[] {
  return [c.cc_name, c.display_name, c.course_name].filter((n): n is string => !!n);
}

/**
 * Find the course row for a tee-time cc name. Exact (normalized) name first, then
 * a course whose name contains every token of the cc name — onetheclub spells the
 * same venue differently in tee times ("클럽72CC 레이크") and courses
 * ("클럽72CC 바다 레이크", "[제휴]크리스밸리").
 */
function matchCourse(courses: Course[], label: string): Course | undefined {
  const want = ccTokens(label);
  const key = want.join('');
  const located = courses.filter((c) => c.is_active && c.lat != null && c.lon != null);
  const exact = located.find((c) => courseNames(c).some((n) => ccTokens(n).join('') === key));
  if (exact) return exact;
  return located.find((c) => courseNames(c).some((n) => {
    const have = new Set(ccTokens(n));
    return want.every((t) => have.has(t));
  }));
}

export function buildClubSpots(teeTimes: TeeTime[], clubs: ClubWithCourses[]): ClubSpot[] {
  const clubsById = new Map(clubs.map((c) => [c.id, c]));
  const buckets = new Map<string, { clubId: string; label: string; items: TeeTime[] }>();

  for (const t of teeTimes) {
    const label = normalizeDisplayCcName(t.cc_name);
    const key = `${t.club_id}|${ccTokens(label).join('')}`;
    const b = buckets.get(key);
    if (b) b.items.push(t);
    else buckets.set(key, { clubId: t.club_id, label, items: [t] });
  }

  const spots: ClubSpot[] = [];
  for (const [key, { clubId, label, items }] of buckets) {
    const club = clubsById.get(clubId);
    const courses = club?.courses ?? [];
    const course = matchCourse(courses, label);
    // A club without course rows is a single venue → its own coordinates are right.
    // A club with course rows but no match is a multi-venue operator whose HQ
    // coordinates would put the pin in the wrong place → leave it unpinned.
    const lat = course?.lat ?? (courses.length === 0 ? club?.lat ?? null : null);
    const lon = course?.lon ?? (courses.length === 0 ? club?.lon ?? null : null);
    const sorted = [...items].sort((a, b) => a.teeoff.localeCompare(b.teeoff));
    const prices = sorted.map((t) => t.price).filter((p): p is number => p != null);
    spots.push({
      key,
      clubId,
      label,
      count: sorted.length,
      lowestPrice: prices.length ? Math.min(...prices) : null,
      lat,
      lon,
      region: course?.region ?? getRegionForClub(clubId) ?? null,
      teeTimes: sorted,
    });
  }

  return spots.sort((a, b) => {
    if (a.lowestPrice == null && b.lowestPrice == null) return a.label.localeCompare(b.label, 'ko');
    if (a.lowestPrice == null) return 1;
    if (b.lowestPrice == null) return -1;
    return a.lowestPrice - b.lowestPrice || a.label.localeCompare(b.label, 'ko');
  });
}

/** 109000 → "10.9만", 250000 → "25만". Pins show the lowest price of the day. */
export function formatPinPrice(price: number | null): string | null {
  if (price == null) return null;
  const man = Math.round(price / 1000) / 10;
  return `${Number.isInteger(man) ? man.toFixed(0) : man.toFixed(1)}만`;
}
