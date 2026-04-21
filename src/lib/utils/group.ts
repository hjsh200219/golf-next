import type { TeeTime } from '@/lib/types/tee-time';

/**
 * Strip common affiliate/booking-platform prefixes from a raw cc_name.
 * Used for the label shown to users.
 *
 * Examples:
 *   "[제휴]사우스스프링스"  → "사우스스프링스"
 *   "(제휴)파인힐스"       → "파인힐스"
 */
export function normalizeDisplayCcName(raw: string): string {
  return raw.trim().replace(/^\s*[\[\(]?\s*제휴\s*[\]\)]?\s*/u, '').trim();
}

/**
 * Build a canonical grouping key from a display name by dropping trailing
 * reservation-type tokens like "CC", "GC", and whitespace, and lowercasing.
 * Using this as the map key lets variants like "사우스스프링스" and
 * "사우스스프링스CC" collapse into one group.
 */
function groupKey(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/(cc|gc|gcc|컨트리클럽|골프클럽)$/u, '');
}

/**
 * Choose the richer of two display names for the same group. Prefer the
 * name that still carries the CC/GC suffix, or the longer one if neither
 * does.
 */
function preferredDisplay(a: string, b: string): string {
  const hasSuffix = (s: string) => /(CC|GC|GCC|컨트리클럽|골프클럽)\s*$/u.test(s);
  if (hasSuffix(a) && !hasSuffix(b)) return a;
  if (hasSuffix(b) && !hasSuffix(a)) return b;
  return a.length >= b.length ? a : b;
}

/**
 * Groups tee times by display cc_name. Affiliate prefixes like "[제휴]"
 * are stripped before grouping so that duplicate labels referring to
 * the same club (e.g. "사우스스프링스CC" scraped directly vs
 * "[제휴]사우스스프링스" surfaced through onetheclub) collapse into one
 * section.
 *
 * Each group is sorted by teeoff ascending and groups are sorted by
 * display name.
 */
export function groupByClub(teeTimes: TeeTime[]): Map<string, TeeTime[]> {
  // canonical key -> { display label chosen so far, items }
  const buckets = new Map<string, { display: string; items: TeeTime[] }>();

  for (const tt of teeTimes) {
    const display = normalizeDisplayCcName(tt.cc_name);
    const key = groupKey(display);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.items.push(tt);
      bucket.display = preferredDisplay(bucket.display, display);
    } else {
      buckets.set(key, { display, items: [tt] });
    }
  }

  for (const bucket of buckets.values()) {
    bucket.items.sort((a, b) => a.teeoff.localeCompare(b.teeoff));
  }

  const entries = [...buckets.values()]
    .map((b) => [b.display, b.items] as const)
    .sort(([a], [b]) => a.localeCompare(b));

  return new Map(entries);
}
