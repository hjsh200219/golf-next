import { describe, it, expect } from 'vitest';
import { cleanEventText, formatEventDisplay } from '@/lib/utils/event';

describe('cleanEventText', () => {
  it('returns null for null input', () => {
    expect(cleanEventText(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(cleanEventText('')).toBeNull();
    expect(cleanEventText('  ')).toBeNull();
  });

  it('returns null for raw code like P0015,,B,', () => {
    expect(cleanEventText('P0015,,B,')).toBeNull();
  });

  it('returns null for comma-only strings', () => {
    expect(cleanEventText(',,,')).toBeNull();
    expect(cleanEventText(',')).toBeNull();
  });

  it('returns null for raw code patterns', () => {
    expect(cleanEventText('P0017,,B,')).toBeNull();
    expect(cleanEventText('B,A,')).toBeNull();
  });

  it('returns null for codes like P0029,200000,S,', () => {
    expect(cleanEventText('P0029,200000,S,')).toBeNull();
  });

  it('returns null for bare number strings that match price', () => {
    expect(cleanEventText('125,000')).toBeNull();
    expect(cleanEventText('140,000')).toBeNull();
    expect(cleanEventText('310,000')).toBeNull();
  });

  it('preserves valid Korean event text', () => {
    expect(cleanEventText('2인플레이가능')).toBe('2인플레이가능');
  });

  it('preserves event text with numbers', () => {
    expect(cleanEventText('27홀예약')).toBe('27홀예약');
  });

  it('preserves price-with-unit event (할인가)', () => {
    expect(cleanEventText('90,000원')).toBe('90,000원');
  });

  it('preserves promotional text', () => {
    expect(cleanEventText('얼리버드 특가')).toBe('얼리버드 특가');
    expect(cleanEventText('카트 포함')).toBe('카트 포함');
    expect(cleanEventText('주중 할인')).toBe('주중 할인');
  });

  it('cleans leading/trailing commas', () => {
    expect(cleanEventText(',할인,')).toBe('할인');
  });

  it('cleans double commas', () => {
    expect(cleanEventText('할인,,특가')).toBe('할인, 특가');
  });
});

describe('formatEventDisplay', () => {
  it('returns null for null/empty event', () => {
    expect(formatEventDisplay(null, null)).toBeNull();
    expect(formatEventDisplay('', null)).toBeNull();
  });

  it('returns null for garbage data', () => {
    expect(formatEventDisplay('P0015,,B,', null)).toBeNull();
    expect(formatEventDisplay('125,000', 125000)).toBeNull();
  });

  it('returns discount label when event has price lower than actual price', () => {
    const result = formatEventDisplay('90,000원', 250000);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('discount');
    expect(result!.label).toContain('90,000');
  });

  it('returns info label for Korean text events', () => {
    const result = formatEventDisplay('2인플레이가능', 100000);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('info');
    expect(result!.label).toBe('2인플레이가능');
  });

  it('returns info label for promotional text', () => {
    const result = formatEventDisplay('카트 포함', 150000);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('info');
    expect(result!.label).toBe('카트 포함');
  });

  it('returns null when event price equals actual price (duplicate)', () => {
    expect(formatEventDisplay('125,000', 125000)).toBeNull();
    expect(formatEventDisplay('250,000', 250000)).toBeNull();
  });
});
