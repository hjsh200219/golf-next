import { describe, it, expect } from 'vitest';
import { kstToday, datesInRange, isDateInRange } from '@/lib/telegram/time';

// 2026-05-31T15:30:00Z is 2026-06-01 00:30 KST (UTC+9): the +9h shift crosses midnight.
const NOW = Date.parse('2026-05-31T15:30:00.000Z');

describe('telegram time', () => {
  it('kstToday returns the KST (next) day just before KST midnight', () => {
    expect(kstToday(NOW)).toBe('2026-06-01');
  });

  it('datesInRange returns 14 dates starting at D+1', () => {
    const dates = datesInRange(NOW);
    expect(dates).toHaveLength(14);
    expect(dates[0]).toBe('2026-06-02'); // D+1
    expect(dates[13]).toBe('2026-06-15'); // D+14
  });

  it('isDateInRange is true for D+1 and D+14', () => {
    expect(isDateInRange('2026-06-02', NOW)).toBe(true);
    expect(isDateInRange('2026-06-15', NOW)).toBe(true);
  });

  it('isDateInRange is false for D+0 and D+15', () => {
    expect(isDateInRange('2026-06-01', NOW)).toBe(false); // D+0 (today)
    expect(isDateInRange('2026-06-16', NOW)).toBe(false); // D+15 (out of range)
  });
});
