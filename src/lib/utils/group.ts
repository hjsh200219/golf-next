import type { TeeTime } from '@/lib/types/tee-time';

/**
 * Groups tee times by cc_name (club display name).
 * Each group is sorted by teeoff ascending.
 * Groups are sorted alphabetically by club name.
 *
 * Note: cc_name is the display identifier. If two clubs share a name,
 * they will be merged into one group.
 */
export function groupByClub(teeTimes: TeeTime[]): Map<string, TeeTime[]> {
  const map = new Map<string, TeeTime[]>();

  for (const tt of teeTimes) {
    const key = tt.cc_name;
    const group = map.get(key);
    if (group) {
      group.push(tt);
    } else {
      map.set(key, [tt]);
    }
  }

  // Sort items within each group by teeoff
  for (const group of map.values()) {
    group.sort((a, b) => a.teeoff.localeCompare(b.teeoff));
  }

  // Return a new Map sorted by club name
  const sorted = new Map(
    [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  );

  return sorted;
}
