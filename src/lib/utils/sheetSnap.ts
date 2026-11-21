export const SHEET_SNAPS = ['peek', 'half', 'full'] as const;
export type SheetSnap = (typeof SHEET_SNAPS)[number];

/** Flick speed (px/ms) above which the sheet moves one step in the flick direction. */
const FLICK_VELOCITY = 0.5;

/**
 * Where the bottom sheet settles after a drag.
 * @param visible  current visible height (px)
 * @param velocity release velocity in px/ms, positive = growing (finger moving up)
 * @param heights  visible height (px) of each snap
 */
export function resolveSnap(
  visible: number,
  velocity: number,
  heights: Record<SheetSnap, number>,
): SheetSnap {
  if (Math.abs(velocity) >= FLICK_VELOCITY) {
    const ordered = SHEET_SNAPS.map((s) => ({ s, h: heights[s] }));
    if (velocity > 0) return (ordered.find((o) => o.h > visible + 1) ?? ordered[ordered.length - 1]).s;
    return ([...ordered].reverse().find((o) => o.h < visible - 1) ?? ordered[0]).s;
  }
  let best: SheetSnap = 'peek';
  let dist = Infinity;
  for (const s of SHEET_SNAPS) {
    const d = Math.abs(heights[s] - visible);
    if (d < dist) { dist = d; best = s; }
  }
  return best;
}
