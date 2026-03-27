/**
 * Scraper registry tests (src/lib/scrapers/index.ts)
 *
 * Covers createScraper(), getActiveScraperIds(), and the cross-reference
 * between SCRAPER_MAP keys and CLUB_REGION_MAP entries.
 */
import { describe, it, expect } from 'vitest';
import { SCRAPER_MAP, createScraper, getActiveScraperIds } from '@/lib/scrapers/index';
import { CLUB_REGION_MAP } from '@/lib/constants/regions';
import type { LoginCredentials } from '@/lib/scrapers/base';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_CREDENTIALS: LoginCredentials = {
  id: 'test', id2: 'test2', email: 'test@test.com',
  pw: 'pw', pw1: 'pw1', pw2: 'pw2', pw3: 'pw3', pw4: 'pw4', pw5: 'pw5',
  name: 'Test', mobile: '01012345678',
};

const VALID_DATE = '20260328';

// ── createScraper ─────────────────────────────────────────────────────────────

describe('createScraper', () => {
  it('returns a scraper instance for every registered club ID', () => {
    for (const id of Object.keys(SCRAPER_MAP)) {
      const scraper = createScraper(id, VALID_DATE, MOCK_CREDENTIALS);
      expect(scraper, `createScraper('${id}') should not be null`).not.toBeNull();
    }
  });

  it('returns an instance whose clubId matches the requested ID', () => {
    for (const id of Object.keys(SCRAPER_MAP)) {
      const scraper = createScraper(id, VALID_DATE, MOCK_CREDENTIALS);
      expect(scraper!.clubId).toBe(id);
    }
  });

  it('returns null for an unknown club ID', () => {
    expect(createScraper('unknown-club', VALID_DATE, MOCK_CREDENTIALS)).toBeNull();
  });

  it('returns null for an empty string club ID', () => {
    expect(createScraper('', VALID_DATE, MOCK_CREDENTIALS)).toBeNull();
  });

  it('returns distinct instances on each call', () => {
    const first = createScraper('ga', VALID_DATE, MOCK_CREDENTIALS);
    const second = createScraper('ga', VALID_DATE, MOCK_CREDENTIALS);
    expect(first).not.toBe(second);
  });
});

// ── getActiveScraperIds ───────────────────────────────────────────────────────

describe('getActiveScraperIds', () => {
  it('returns an array', () => {
    expect(Array.isArray(getActiveScraperIds())).toBe(true);
  });

  it('contains every key present in SCRAPER_MAP', () => {
    const ids = getActiveScraperIds();
    for (const key of Object.keys(SCRAPER_MAP)) {
      expect(ids).toContain(key);
    }
  });

  it('has the same length as SCRAPER_MAP', () => {
    expect(getActiveScraperIds()).toHaveLength(Object.keys(SCRAPER_MAP).length);
  });

  it('returns a new array on each call (not a shared reference)', () => {
    const a = getActiveScraperIds();
    const b = getActiveScraperIds();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ── Cross-reference: SCRAPER_MAP ↔ CLUB_REGION_MAP ───────────────────────────

/**
 * Known scraper IDs that intentionally have no region mapping yet.
 * Add entries here (with a TODO comment) when a scraper is registered before
 * its region classification is finalised.
 */
const KNOWN_UNMAPPED_SCRAPERS = new Set<string>([
  'sungmoon', // TODO: classify region before enabling region-filter UI
]);

describe('SCRAPER_MAP / CLUB_REGION_MAP cross-reference', () => {
  it('every scraper ID has a corresponding entry in CLUB_REGION_MAP (or is in the known-unmapped allowlist)', () => {
    const unexpectedlyUnmapped: string[] = [];
    for (const id of Object.keys(SCRAPER_MAP)) {
      if (!(id in CLUB_REGION_MAP) && !KNOWN_UNMAPPED_SCRAPERS.has(id)) {
        unexpectedlyUnmapped.push(id);
      }
    }
    expect(
      unexpectedlyUnmapped,
      `Scraper IDs missing from CLUB_REGION_MAP (not in allowlist): ${unexpectedlyUnmapped.join(', ')}`,
    ).toHaveLength(0);
  });

  it('KNOWN_UNMAPPED_SCRAPERS allowlist contains only real scraper IDs', () => {
    for (const id of KNOWN_UNMAPPED_SCRAPERS) {
      expect(
        Object.keys(SCRAPER_MAP),
        `'${id}' is in the allowlist but not in SCRAPER_MAP`,
      ).toContain(id);
    }
  });
});
