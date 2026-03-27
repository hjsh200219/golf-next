import { describe, it, expect } from 'vitest';
import { cleanEventText } from '@/lib/utils/event';

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

  it('preserves valid event text', () => {
    expect(cleanEventText('2인플레이가능')).toBe('2인플레이가능');
  });

  it('preserves event text with numbers', () => {
    expect(cleanEventText('27홀예약')).toBe('27홀예약');
  });

  it('cleans leading/trailing commas', () => {
    expect(cleanEventText(',할인,')).toBe('할인');
  });

  it('cleans double commas', () => {
    expect(cleanEventText('할인,,특가')).toBe('할인, 특가');
  });

  it('preserves price-like event text', () => {
    expect(cleanEventText('90,000원')).toBe('90,000원');
  });
});
