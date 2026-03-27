import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isValidUUIDv4 } from '@/lib/utils/uuid';

// ---------------------------------------------------------------------------
// isValidUUIDv4
// ---------------------------------------------------------------------------
describe('isValidUUIDv4', () => {
  it('accepts a well-formed UUID v4', () => {
    expect(isValidUUIDv4('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
  });

  it('accepts a UUID v4 with uppercase hex digits', () => {
    expect(isValidUUIDv4('F47AC10B-58CC-4372-A567-0E02B2C3D479')).toBe(true);
  });

  it('rejects a UUID v1 (version digit is not 4)', () => {
    expect(isValidUUIDv4('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(false);
  });

  it('rejects a UUID v5', () => {
    expect(isValidUUIDv4('886313e1-3b8a-5372-9b90-0c9aee199e5d')).toBe(false);
  });

  it('rejects a string with wrong variant nibble', () => {
    // Fourth group starts with 'c', not 8/9/a/b
    expect(isValidUUIDv4('f47ac10b-58cc-4372-c567-0e02b2c3d479')).toBe(false);
  });

  it('rejects an all-zero UUID', () => {
    expect(isValidUUIDv4('00000000-0000-0000-0000-000000000000')).toBe(false);
  });

  it('rejects a string that is too short', () => {
    expect(isValidUUIDv4('f47ac10b-58cc-4372-a567-0e02b2c3d47')).toBe(false);
  });

  it('rejects a string that is too long', () => {
    expect(isValidUUIDv4('f47ac10b-58cc-4372-a567-0e02b2c3d4799')).toBe(false);
  });

  it('rejects a UUID without hyphens', () => {
    expect(isValidUUIDv4('f47ac10b58cc4372a5670e02b2c3d479')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidUUIDv4('')).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(isValidUUIDv4('z47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Device ID generation (mirrors useDeviceId logic)
// ---------------------------------------------------------------------------
describe('Device ID generation', () => {
  it('crypto.randomUUID produces a valid UUID v4', () => {
    // Node.js (and modern browsers) expose crypto.randomUUID()
    const id = crypto.randomUUID();
    expect(isValidUUIDv4(id)).toBe(true);
  });

  it('fallback UUID v4 template produces a valid UUID v4', () => {
    // Reproduce the fallback implementation from useDeviceId.ts
    const generateFallbackUUID = () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

    // Run the generator multiple times to guard against accidental correctness.
    for (let i = 0; i < 20; i++) {
      const id = generateFallbackUUID();
      expect(isValidUUIDv4(id)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Favorites migration logic (device -> user)
// ---------------------------------------------------------------------------
describe('Favorites migration logic', () => {
  /**
   * Simplified version of the migration helper that would be called when a
   * user logs in and we want to adopt their device favorites into user_favorites.
   *
   * Real implementation lives in the API route; here we test the pure logic.
   */
  function migrateDeviceFavoritesToUser(
    deviceFavorites: Array<{ club_id: string }>,
    existingUserFavorites: Array<{ club_id: string }>,
  ): Array<{ club_id: string }> {
    const existingIds = new Set(existingUserFavorites.map((f) => f.club_id));
    return deviceFavorites.filter((df) => !existingIds.has(df.club_id));
  }

  it('returns all device favorites when the user has none', () => {
    const deviceFavs = [{ club_id: 'club-a' }, { club_id: 'club-b' }];
    const result = migrateDeviceFavoritesToUser(deviceFavs, []);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.club_id)).toEqual(['club-a', 'club-b']);
  });

  it('excludes clubs already in the user favorites', () => {
    const deviceFavs = [
      { club_id: 'club-a' },
      { club_id: 'club-b' },
      { club_id: 'club-c' },
    ];
    const userFavs = [{ club_id: 'club-b' }];
    const result = migrateDeviceFavoritesToUser(deviceFavs, userFavs);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.club_id)).toEqual(['club-a', 'club-c']);
  });

  it('returns an empty array when all device favorites already exist', () => {
    const deviceFavs = [{ club_id: 'club-a' }, { club_id: 'club-b' }];
    const userFavs = [{ club_id: 'club-a' }, { club_id: 'club-b' }];
    const result = migrateDeviceFavoritesToUser(deviceFavs, userFavs);
    expect(result).toHaveLength(0);
  });

  it('returns an empty array when there are no device favorites', () => {
    const result = migrateDeviceFavoritesToUser([], [{ club_id: 'club-a' }]);
    expect(result).toHaveLength(0);
  });

  it('handles duplicate club_ids in device favorites gracefully', () => {
    // Duplicates should still be de-duped against user favorites
    const deviceFavs = [
      { club_id: 'club-a' },
      { club_id: 'club-a' }, // duplicate
      { club_id: 'club-b' },
    ];
    const userFavs = [{ club_id: 'club-a' }];
    const result = migrateDeviceFavoritesToUser(deviceFavs, userFavs);
    // Both 'club-a' entries are excluded; only 'club-b' passes through
    expect(result.map((r) => r.club_id)).toEqual(['club-b']);
  });
});

// ---------------------------------------------------------------------------
// localStorage device ID persistence (mocked)
// ---------------------------------------------------------------------------
describe('Device ID persistence via localStorage', () => {
  const DEVICE_ID_KEY = 'golf_device_id';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores a generated UUID in localStorage', () => {
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    expect(localStorage.getItem(DEVICE_ID_KEY)).toBe(id);
    expect(isValidUUIDv4(id)).toBe(true);
  });

  it('reuses the same ID on subsequent reads', () => {
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);

    // Simulate a second "mount"
    const retrieved = localStorage.getItem(DEVICE_ID_KEY) ?? crypto.randomUUID();
    expect(retrieved).toBe(id);
  });

  it('creates a new ID when none exists', () => {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    expect(existing).toBeNull();

    const newId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, newId);
    expect(isValidUUIDv4(newId)).toBe(true);
  });
});
