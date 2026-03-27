import { describe, it, expect } from 'vitest';
import { toGeohash, isValidGeohash } from '@/lib/utils/geohash';

describe('toGeohash', () => {
  it('encodes Seoul coordinates', () => {
    const hash = toGeohash(37.5665, 126.9780);
    expect(hash).toHaveLength(6);
    expect(typeof hash).toBe('string');
  });

  it('nearby locations get same geohash (within ~1.2km)', () => {
    // Two points very close together
    const hash1 = toGeohash(37.2785, 127.0890);
    const hash2 = toGeohash(37.2786, 127.0891);
    expect(hash1).toBe(hash2);
  });

  it('distant locations get different geohash', () => {
    const hash1 = toGeohash(37.5665, 126.9780); // Seoul
    const hash2 = toGeohash(35.1796, 129.0756); // Busan
    expect(hash1).not.toBe(hash2);
  });
});

describe('isValidGeohash', () => {
  it('validates correct geohash', () => {
    expect(isValidGeohash('wydm9d')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidGeohash('')).toBe(false);
  });

  it('rejects invalid characters', () => {
    expect(isValidGeohash('abc!@#')).toBe(false);
  });
});
