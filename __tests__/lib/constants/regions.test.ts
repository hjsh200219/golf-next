import { describe, it, expect } from 'vitest';
import {
  REGIONS,
  CLUB_REGION_MAP,
  getClubsByRegion,
  getRegionForClub,
  warnUnmappedClubs,
  type RegionKey,
} from '@/lib/constants/regions';

describe('REGIONS', () => {
  it('has 5 regions', () => {
    expect(Object.keys(REGIONS)).toHaveLength(5);
  });

  it('includes all expected regions', () => {
    expect(REGIONS).toHaveProperty('경기북부');
    expect(REGIONS).toHaveProperty('경기남부');
    expect(REGIONS).toHaveProperty('강원');
    expect(REGIONS).toHaveProperty('인천');
    expect(REGIONS).toHaveProperty('충청');
  });

  it('each region has label and description', () => {
    for (const region of Object.values(REGIONS)) {
      expect(region.label).toBeTruthy();
      expect(region.description).toBeTruthy();
    }
  });
});

describe('CLUB_REGION_MAP', () => {
  it('maps all active clubs', () => {
    expect(Object.keys(CLUB_REGION_MAP).length).toBeGreaterThanOrEqual(30);
  });

  it('every value is a valid RegionKey', () => {
    const validKeys = Object.keys(REGIONS);
    for (const region of Object.values(CLUB_REGION_MAP)) {
      expect(validKeys).toContain(region);
    }
  });

  it('maps specific clubs correctly', () => {
    expect(CLUB_REGION_MAP['purunsol']).toBe('경기북부');
    expect(CLUB_REGION_MAP['sonofelice']).toBe('강원');
    expect(CLUB_REGION_MAP['orangedunesyj']).toBe('인천');
    expect(CLUB_REGION_MAP['pinestone']).toBe('충청');
    expect(CLUB_REGION_MAP['edenblue']).toBe('경기남부');
  });
});

describe('getClubsByRegion', () => {
  it('returns club IDs for a single region', () => {
    const clubs = getClubsByRegion(['강원']);
    expect(clubs.length).toBeGreaterThan(0);
    clubs.forEach((id) => {
      expect(CLUB_REGION_MAP[id]).toBe('강원');
    });
  });

  it('returns union for multiple regions', () => {
    const clubs = getClubsByRegion(['강원', '인천']);
    clubs.forEach((id) => {
      expect(['강원', '인천']).toContain(CLUB_REGION_MAP[id]);
    });
  });

  it('returns empty array for empty input', () => {
    expect(getClubsByRegion([])).toEqual([]);
  });

  it('returns no duplicates', () => {
    const clubs = getClubsByRegion(['경기북부', '경기남부']);
    expect(new Set(clubs).size).toBe(clubs.length);
  });
});

describe('getRegionForClub', () => {
  it('returns region for known club', () => {
    expect(getRegionForClub('sonofelice')).toBe('강원');
  });

  it('returns null for unknown club', () => {
    expect(getRegionForClub('nonexistent')).toBeNull();
  });
});

describe('warnUnmappedClubs', () => {
  it('returns empty for fully mapped clubs', () => {
    const mappedIds = Object.keys(CLUB_REGION_MAP);
    expect(warnUnmappedClubs(mappedIds)).toEqual([]);
  });

  it('returns unmapped club IDs', () => {
    const ids = [...Object.keys(CLUB_REGION_MAP), 'newclub123'];
    expect(warnUnmappedClubs(ids)).toEqual(['newclub123']);
  });
});
