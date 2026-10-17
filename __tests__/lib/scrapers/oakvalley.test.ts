import { describe, it, expect, vi, afterEach } from 'vitest';
import OakValleyScraper, { parseOakValleyFee } from '@/lib/scrapers/oakvalley';
import type { LoginCredentials } from '@/lib/scrapers/base';

const CREDS: LoginCredentials = {
  id: '', id2: '', email: '', pw: '', pw1: '', pw2: '', pw3: '', pw4: '', pw5: '', pw6: '',
  name: '', mobile: '',
};

afterEach(() => vi.restoreAllMocks());

// ACT_GREENFEE shapes captured live (2026-10-17, D+1~D+14, S1/G2/P1).
describe('parseOakValleyFee', () => {
  it('성문안: 천원 unit, 3~4인 price is the headline, 2인 price goes to event', () => {
    expect(parseOakValleyFee('3~4인 시 290천원 / 2인 시 340천원')).toEqual({
      price: 290000,
      event: '2인 시 340,000원',
    });
  });

  it('월송리: plain won amount for 2~4인 (with stray space)', () => {
    expect(parseOakValleyFee('2~4인 시 100,000')).toEqual({ price: 100000, event: '' });
    expect(parseOakValleyFee('2 ~4인 시 100,000')).toEqual({ price: 100000, event: '' });
  });

  it('월송리: 3~4인 / 2인 split in won', () => {
    expect(parseOakValleyFee('3~4인 시 120,000 / 2인 시 140,000 ')).toEqual({
      price: 120000,
      event: '2인 시 140,000원',
    });
    expect(parseOakValleyFee('3~4인 시 150,000 ')).toEqual({ price: 150000, event: '' });
  });

  it('오크힐스: 만/천 compound amount at the end, sunset label kept as event', () => {
    expect(parseOakValleyFee('18홀/월~목/선셋/17:00~17:59/9만5천')).toEqual({
      price: 95000,
      event: '선셋',
    });
    expect(parseOakValleyFee('18홀/금/선셋/16:30~16:59/11만')).toEqual({
      price: 110000,
      event: '선셋',
    });
    expect(parseOakValleyFee('18홀/일/선셋/19시~/7만9천')).toEqual({ price: 79000, event: '선셋' });
  });

  it('empty or unparseable → null price (never a stray leading digit)', () => {
    expect(parseOakValleyFee('')).toEqual({ price: null, event: '' });
    expect(parseOakValleyFee('문의')).toEqual({ price: null, event: '' });
  });
});

describe('OakValleyScraper.run', () => {
  it('stores real prices, not the leading digit of the fee sentence', async () => {
    const scraper = new OakValleyScraper('20261020', CREDS);
    vi.spyOn(
      scraper as unknown as { fetch: typeof globalThis.fetch },
      'fetch',
    ).mockImplementation(async (_url, init) => {
      const body = String(init?.body ?? '');
      const fee = body.includes('V_IN_GOLF_ID=S1')
        ? '3~4인 시 290천원 / 2인 시 340천원'
        : body.includes('V_IN_GOLF_ID=G2')
          ? '18홀/월~목/선셋/17:00~17:59/9만5천'
          : '2~4인 시 100,000';
      return new Response(
        JSON.stringify({ entitys: [{ r_TIME: '11:56', ROUND_TYPE_DESC: 'IN', ACT_GREENFEE: fee }] }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });

    const result = await scraper.run();
    expect(result.success).toBe(true);
    const byCc = Object.fromEntries(result.teeTimes.map((t) => [t.cc_name, t]));
    expect(byCc['성문안CC'].price).toBe(290000);
    expect(byCc['성문안CC'].event).toBe('2인 시 340,000원');
    expect(byCc['오크힐스CC'].price).toBe(95000);
    expect(byCc['월송리CC'].price).toBe(100000);
  });
});
