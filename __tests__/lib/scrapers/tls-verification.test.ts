import { describe, it, expect } from 'vitest';
import { SCRAPER_MAP } from '@/lib/scrapers';
import type { LoginCredentials } from '@/lib/scrapers/base';

const CREDS = { id: 'x', pw: 'x', mobile: '01000000000' } as LoginCredentials;

// Every scraper logs in with real credentials. Disabling certificate verification
// would expose them to MITM; sites with incomplete chains supply extraCaCerts instead.
describe('scraper TLS verification', () => {
  it.each(Object.keys(SCRAPER_MAP))('%s keeps certificate verification on', (id) => {
    const s = new SCRAPER_MAP[id]('20261123', CREDS) as unknown as { tlsRejectUnauthorized: boolean };
    expect(s.tlsRejectUnauthorized).toBe(true);
  });
});
