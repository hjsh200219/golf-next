import { describe, it, expect } from 'vitest';
import { formatPrice, parsePrice, isPriceInRange } from '@/lib/utils/price';

describe('formatPrice', () => {
  it('formats number with comma separator', () => {
    expect(formatPrice(150000)).toBe('150,000원');
  });

  it('returns "-" for null/undefined', () => {
    expect(formatPrice(null)).toBe('-');
    expect(formatPrice(undefined)).toBe('-');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('0원');
  });
});

describe('parsePrice', () => {
  it('parses comma-formatted string', () => {
    expect(parsePrice('150,000')).toBe(150000);
  });

  it('parses string with 원', () => {
    expect(parsePrice('150,000원')).toBe(150000);
  });

  it('parses plain number string', () => {
    expect(parsePrice('150000')).toBe(150000);
  });

  it('returns null for invalid input', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('무료')).toBeNull();
  });

  it('strips whitespace', () => {
    expect(parsePrice(' 150,000 ')).toBe(150000);
  });
});

describe('isPriceInRange', () => {
  it('returns true when in range', () => {
    expect(isPriceInRange(150000, 100000, 200000)).toBe(true);
  });

  it('returns true when no bounds specified', () => {
    expect(isPriceInRange(150000)).toBe(true);
  });

  it('returns false when below min', () => {
    expect(isPriceInRange(50000, 100000)).toBe(false);
  });

  it('returns false when above max', () => {
    expect(isPriceInRange(250000, undefined, 200000)).toBe(false);
  });

  it('handles null price', () => {
    expect(isPriceInRange(null, 100000, 200000)).toBe(true);
  });
});
