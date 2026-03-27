import ngeohash from 'ngeohash';

export function toGeohash(lat: number, lon: number): string {
  return ngeohash.encode(lat, lon, 6);
}

const GEOHASH_CHARS = /^[0-9b-hjkmnp-z]+$/;

export function isValidGeohash(hash: string): boolean {
  if (!hash || hash.length === 0) return false;
  return GEOHASH_CHARS.test(hash);
}
