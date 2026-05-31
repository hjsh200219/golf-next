import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabase, type QueryResponse } from '../../helpers/mock-supabase';
import { datesInRange } from '@/lib/telegram/time';

const mockSupabase = createMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}));

const IN_RANGE_DATE = datesInRange()[0];
const OUT_OF_RANGE_DATE = '2020-01-01';

const ACTIVE_CLUB = { data: [{ id: 'club-1' }], error: null } as QueryResponse;
const INACTIVE_CLUB = { data: [], error: null } as QueryResponse;

const baseInput = {
  chatId: 123,
  clubId: 'club-1',
  date: IN_RANGE_DATE,
  timeFrom: '06:00',
  timeTo: '10:00',
};

const sampleRow = {
  id: 1,
  chat_id: 123,
  club_id: 'club-1',
  date: IN_RANGE_DATE,
  time_from: '06:00',
  time_to: '10:00',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.__reset();
});

describe('createWatch', () => {
  it('happy path → ok:true with the inserted watch', async () => {
    mockSupabase.__setResponseForTable('golf_clubs', ACTIVE_CLUB);
    // Same response feeds both the cap-count query (reads count) and the
    // insert (reads data). count:0 keeps us under the cap.
    mockSupabase.__setResponseForTable('telegram_watches', {
      data: sampleRow,
      error: null,
      count: 0,
    });

    const { createWatch } = await import('@/lib/telegram/watches');
    const result = await createWatch(baseInput);

    expect(result.ok).toBe(true);
    expect(result.watch).toEqual(sampleRow);
  });

  it('out-of-range date → ok:false reason out_of_range, no DB call', async () => {
    const { createWatch } = await import('@/lib/telegram/watches');
    const result = await createWatch({ ...baseInput, date: OUT_OF_RANGE_DATE });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('out_of_range');
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('inactive club → ok:false reason inactive_club', async () => {
    mockSupabase.__setResponseForTable('golf_clubs', INACTIVE_CLUB);

    const { createWatch } = await import('@/lib/telegram/watches');
    const result = await createWatch(baseInput);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('inactive_club');
  });

  it('cap reached (active count == 20) → ok:false reason cap, no insert', async () => {
    const insertSpy = vi.fn().mockReturnThis();
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'golf_clubs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (r: (v: QueryResponse) => unknown) =>
            Promise.resolve(ACTIVE_CLUB).then(r),
        };
      }
      // telegram_watches: count query resolves count == MAX (20)
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: insertSpy,
        then: (r: (v: QueryResponse) => unknown) =>
          Promise.resolve({ data: [], error: null, count: 20 }).then(r),
      };
    });

    const { createWatch, MAX_ACTIVE_WATCHES } = await import('@/lib/telegram/watches');
    expect(MAX_ACTIVE_WATCHES).toBe(20);

    const result = await createWatch(baseInput);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('cap');
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('duplicate (insert returns 23505) → ok:true reason duplicate, not thrown', async () => {
    mockSupabase.__setResponseForTable('golf_clubs', ACTIVE_CLUB);
    // Shared response: the cap-count query reads `count` (0, under cap) and
    // must NOT act on the error; only the insert reacts to error.code 23505.
    mockSupabase.__setResponseForTable('telegram_watches', {
      data: null,
      error: { code: '23505', message: 'duplicate key value' },
      count: 0,
    } as unknown as QueryResponse);

    const { createWatch } = await import('@/lib/telegram/watches');
    const result = await createWatch(baseInput);

    expect(result.ok).toBe(true);
    expect(result.reason).toBe('duplicate');
  });

  // The shared stub always succeeds and cannot reproduce the partial unique
  // index semantics: (1) a 2nd identical ACTIVE insert raises 23505, and
  // (2) inserting a new active row when a STOPPED duplicate exists SUCCEEDS
  // because the index only covers status='active'. Validating this requires a
  // real Postgres / Supabase-local instance.
  it.skip('idempotency + stopped→reactivate requires real Postgres', () => {
    // Needs a real PG/Supabase-local instance; cannot be faked green with the stub.
  });
});

describe('listActiveWatches', () => {
  it('returns the active rows from the mock', async () => {
    const rows = [sampleRow, { ...sampleRow, id: 2 }];
    mockSupabase.__setResponseForTable('telegram_watches', {
      data: rows,
      error: null,
    });

    const { listActiveWatches } = await import('@/lib/telegram/watches');
    const result = await listActiveWatches(123);

    expect(result).toEqual(rows);
  });
});

describe('stopWatch', () => {
  it("issues update with status='stopped' for the given id", async () => {
    const updateSpy = vi.fn().mockReturnThis();
    const eqSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => ({
      update: updateSpy,
      eq: eqSpy,
    }));

    const { stopWatch } = await import('@/lib/telegram/watches');
    await stopWatch(7);

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'stopped' }),
    );
    expect(eqSpy).toHaveBeenCalledWith('id', 7);
  });
});

describe('stopAllWatches', () => {
  it("issues update with status='stopped' for chat's active watches and returns count", async () => {
    const updateSpy = vi.fn().mockReturnThis();
    const calls: Array<[string, unknown]> = [];
    const eqSpy = vi.fn((col: string, val: unknown) => {
      calls.push([col, val]);
      const chain = {
        eq: eqSpy,
        then: (r: (v: QueryResponse) => unknown) =>
          Promise.resolve({ data: null, error: null, count: 3 }).then(r),
      };
      return chain;
    });
    mockSupabase.from.mockImplementation(() => ({
      update: updateSpy,
      eq: eqSpy,
    }));

    const { stopAllWatches } = await import('@/lib/telegram/watches');
    const count = await stopAllWatches(123);

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'stopped' }),
      expect.objectContaining({ count: 'exact' }),
    );
    expect(calls).toContainEqual(['chat_id', 123]);
    expect(calls).toContainEqual(['status', 'active']);
    expect(count).toBe(3);
  });
});
