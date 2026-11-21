/**
 * declutter — 겹치는 가격 핀 중 우선순위 높은 핀만 남긴다(나머지는 점으로 표시).
 * Boxes arrive in priority order; anchor (x, y) is the bottom-center of the pin.
 */
import { describe, it, expect } from 'vitest';
import { declutter } from '@/lib/maps/declutter';

const box = (key: string, x: number, y: number, w = 60, h = 30) => ({ key, x, y, w, h });

describe('declutter', () => {
  it('keeps every pin when none overlap', () => {
    const kept = declutter([box('a', 0, 0), box('b', 100, 0), box('c', 0, 100)]);
    expect([...kept]).toEqual(['a', 'b', 'c']);
  });

  it('drops a later pin that overlaps an earlier one', () => {
    const kept = declutter([box('cheap', 50, 50), box('pricey', 70, 60)]);
    expect(kept.has('cheap')).toBe(true);
    expect(kept.has('pricey')).toBe(false);
  });

  it('a dropped pin does not block pins after it', () => {
    // b overlaps a (dropped); c overlaps only b → c stays
    const kept = declutter([box('a', 0, 0), box('b', 50, 0), box('c', 100, 0)]);
    expect([...kept]).toEqual(['a', 'c']);
  });

  it('respects the gap between pins', () => {
    expect(declutter([box('a', 0, 0), box('b', 61, 0)], 0).has('b')).toBe(true);
    expect(declutter([box('a', 0, 0), box('b', 61, 0)], 4).has('b')).toBe(false);
  });
});
