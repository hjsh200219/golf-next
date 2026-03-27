import { describe, it, expect } from 'vitest';
import {
  formatDateKorean,
  getKoreanDayOfWeek,
  toDateString,
  getNextNDays,
} from '@/lib/utils/date';

describe('formatDateKorean', () => {
  it('formats date to Korean string', () => {
    expect(formatDateKorean('2026-03-27')).toBe('3월 27일 (금)');
  });

  it('formats weekend correctly', () => {
    expect(formatDateKorean('2026-03-28')).toBe('3월 28일 (토)');
  });
});

describe('getKoreanDayOfWeek', () => {
  it('returns Korean day names', () => {
    // 2026-03-27 is Friday
    expect(getKoreanDayOfWeek(new Date('2026-03-27'))).toBe('금');
    expect(getKoreanDayOfWeek(new Date('2026-03-28'))).toBe('토');
    expect(getKoreanDayOfWeek(new Date('2026-03-29'))).toBe('일');
  });
});

describe('toDateString', () => {
  it('converts Date to YYYY-MM-DD', () => {
    expect(toDateString(new Date('2026-03-27T12:00:00'))).toBe('2026-03-27');
  });

  it('converts YYYYMMDD to YYYY-MM-DD', () => {
    expect(toDateString('20260327')).toBe('2026-03-27');
  });

  it('passes through YYYY-MM-DD format', () => {
    expect(toDateString('2026-03-27')).toBe('2026-03-27');
  });
});

describe('getNextNDays', () => {
  it('returns N dates starting from today', () => {
    const days = getNextNDays(3, new Date('2026-03-27'));
    expect(days).toEqual(['2026-03-27', '2026-03-28', '2026-03-29']);
  });

  it('returns 1 day', () => {
    const days = getNextNDays(1, new Date('2026-03-27'));
    expect(days).toEqual(['2026-03-27']);
  });
});
