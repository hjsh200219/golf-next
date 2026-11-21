import { describe, it, expect } from 'vitest';
import { resolveSnap, SHEET_SNAPS } from '@/lib/utils/sheetSnap';

// Snap heights (px visible above the bottom): peek 160, half 400, full 700.
const H = { peek: 160, half: 400, full: 700 };

describe('resolveSnap', () => {
  it('exposes the three snap names in order', () => {
    expect(SHEET_SNAPS).toEqual(['peek', 'half', 'full']);
  });

  it('snaps to the nearest height when released slowly', () => {
    expect(resolveSnap(180, 0, H)).toBe('peek');
    expect(resolveSnap(350, 0, H)).toBe('half');
    expect(resolveSnap(640, 0, H)).toBe('full');
  });

  it('a fast upward flick goes to the next taller snap', () => {
    // velocity in px/ms, positive = sheet growing (finger moving up)
    expect(resolveSnap(200, 0.8, H)).toBe('half');
    expect(resolveSnap(420, 0.8, H)).toBe('full');
  });

  it('a fast downward flick goes to the next shorter snap', () => {
    expect(resolveSnap(650, -0.8, H)).toBe('half');
    expect(resolveSnap(380, -0.8, H)).toBe('peek');
  });

  it('never goes past the ends', () => {
    expect(resolveSnap(720, 2, H)).toBe('full');
    expect(resolveSnap(120, -2, H)).toBe('peek');
  });
});
