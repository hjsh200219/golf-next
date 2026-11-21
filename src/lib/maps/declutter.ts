export interface PinBox {
  key: string;
  /** anchor = bottom-center of the pin, in screen pixels */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Greedy collision culling. Boxes come in priority order (selected, then cheapest);
 * a box is kept only if it does not overlap any box kept before it. Dropped boxes
 * never block later ones. Returns the kept keys in input order.
 */
export function declutter(boxes: PinBox[], gap = 2): Set<string> {
  const kept: PinBox[] = [];
  const out = new Set<string>();
  for (const b of boxes) {
    const hit = kept.some(
      (k) =>
        Math.abs(b.x - k.x) < (b.w + k.w) / 2 + gap &&
        b.y - b.h < k.y + gap &&
        k.y - k.h < b.y + gap,
    );
    if (!hit) {
      kept.push(b);
      out.add(b.key);
    }
  }
  return out;
}
