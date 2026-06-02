import { describe, it, expect } from 'vitest';
import { kstToday, datesInRange, isDateInRange } from '@/lib/telegram/time';

// 2026-05-31T15:30:00Z is 2026-06-01 00:30 KST (UTC+9): the +9h shift crosses midnight.
const NOW = Date.parse('2026-05-31T15:30:00.000Z');

describe('telegram time', () => {
  it('kstToday returns the KST (next) day just before KST midnight', () => {
    expect(kstToday(NOW)).toBe('2026-06-01');
  });

  it('datesInRange returns 30 dates starting at D+1', () => {
    const dates = datesInRange(NOW);
    expect(dates).toHaveLength(30);
    expect(dates[0]).toBe('2026-06-02'); // D+1
    expect(dates[29]).toBe('2026-07-01'); // D+30
  });

  it('isDateInRange is true for D+1 and D+30', () => {
    expect(isDateInRange('2026-06-02', NOW)).toBe(true);
    expect(isDateInRange('2026-07-01', NOW)).toBe(true);
  });

  it('isDateInRange is false for D+0 and D+31', () => {
    expect(isDateInRange('2026-06-01', NOW)).toBe(false); // D+0 (today)
    expect(isDateInRange('2026-07-02', NOW)).toBe(false); // D+31 (out of range)
  });
});
