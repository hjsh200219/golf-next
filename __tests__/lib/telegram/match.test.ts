import { describe, it, expect } from 'vitest';
import { computeS, matchWatch, BACKSTOP_MS } from '@/lib/telegram/match';

const now = Date.parse('2026-06-01T03:00:00.000Z');
const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

const watch = { club_id: 'ga', time_from: '07:00', time_to: '07:30' };

describe('computeS', () => {
  it('returns null for empty array', () => {
    expect(computeS([])).toBeNull();
  });

  it('returns null when the only entry is null', () => {
    expect(computeS([{ scraped_at: null }])).toBeNull();
  });

  it('returns the max scraped_at over multiple entries', () => {
    const a = iso(-60 * 1000);
    const b = iso(0);
    const c = iso(-2 * 60 * 1000);
    expect(computeS([{ scraped_at: a }, { scraped_at: b }, { scraped_at: c }])).toBe(b);
  });

  it('ignores null among valid entries', () => {
    const a = iso(-30 * 60 * 1000);
    const b = iso(0);
    expect(
      computeS([{ scraped_at: a }, { scraped_at: null }, { scraped_at: b }]),
    ).toBe(b);
  });
});

describe('matchWatch', () => {
  it('DT-1 stale row (booked/frozen, < S) does NOT fire', () => {
    const S = iso(0); // fresh
    const row = { club_id: 'ga', teeoff: '07:00', scraped_at: iso(-10 * 60 * 1000) };
    expect(matchWatch(watch, [row], S, now)).toEqual([]);
  });

  it('DT-2 fresh row (== S) fires', () => {
    const S = iso(0);
    const row = { club_id: 'ga', teeoff: '07:00', scraped_at: S };
    expect(matchWatch(watch, [row], S, now)).toEqual([row]);
  });

  it('DT-3 S itself ~110min old (within BACKSTOP) still fires', () => {
    const S = iso(-110 * 60 * 1000); // 110min < 180min backstop
    const row = { club_id: 'ga', teeoff: '07:15', scraped_at: S };
    expect(matchWatch(watch, [row], S, now)).toEqual([row]);
  });

  it('DT-4 excludes out-of-range times and other clubs', () => {
    const S = iso(0);
    const before = { club_id: 'ga', teeoff: '06:00', scraped_at: S };
    const after = { club_id: 'ga', teeoff: '08:00', scraped_at: S };
    const otherClub = { club_id: 'na', teeoff: '07:00', scraped_at: S };
    const inRange = { club_id: 'ga', teeoff: '07:10', scraped_at: S };
    expect(matchWatch(watch, [before, after, otherClub, inRange], S, now)).toEqual([
      inRange,
    ]);
  });

  it('DT-5 empty-success scrape: only stale in-range rows exist → no fire', () => {
    const S = iso(0); // fresh S from a successful-but-empty scrape
    const stale = { club_id: 'ga', teeoff: '07:00', scraped_at: iso(-2 * 3600 * 1000) };
    expect(matchWatch(watch, [stale], S, now)).toEqual([]);
  });

  it('DT-6 fresh non-empty scrape: in-range row == S fires', () => {
    const S = iso(0);
    const row = { club_id: 'ga', teeoff: '07:00', scraped_at: S };
    expect(matchWatch(watch, [row], S, now)).toEqual([row]);
  });

  it('DT-7 C1 regression: in-range row 1min before S (booked, not re-upserted) MUST NOT fire', () => {
    const S = iso(0); // fresh
    const row = { club_id: 'ga', teeoff: '07:00', scraped_at: iso(-60 * 1000) };
    expect(matchWatch(watch, [row], S, now)).toEqual([]);
  });

  it('DT-8 S null → no fire', () => {
    const row = { club_id: 'ga', teeoff: '07:00', scraped_at: iso(0) };
    expect(matchWatch(watch, [row], null, now)).toEqual([]);
  });

  it('DT-9 latest attempt failed, earlier success: S = max over successes, in-range row == S fires', () => {
    // failed later attempt contributes nothing (absent from success-filtered input)
    const S = computeS([{ scraped_at: iso(-30 * 60 * 1000) }]);
    const row = { club_id: 'ga', teeoff: '07:00', scraped_at: S! };
    expect(matchWatch(watch, [row], S, now)).toEqual([row]);
  });

  it('exposes BACKSTOP_MS as 180 minutes', () => {
    expect(BACKSTOP_MS).toBe(180 * 60 * 1000);
  });

  it('does not fire when S itself is staler than BACKSTOP', () => {
    const S = iso(-200 * 60 * 1000); // 200min > 180min backstop
    const row = { club_id: 'ga', teeoff: '07:00', scraped_at: S };
    expect(matchWatch(watch, [row], S, now)).toEqual([]);
  });
});
