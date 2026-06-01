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

const baseInput = {
  chatId: 123,
  date: IN_RANGE_DATE,
  timeFrom: '06:00',
  timeTo: '10:00',
};

const sampleRow = {
  id: 1,
  chat_id: 123,
  date: IN_RANGE_DATE,
  time_from: '06:00',
  time_to: '10:00',
  course: null,
  status: 'active',
  created_at: '2026-06-02T00:00:00Z',
  updated_at: '2026-06-02T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.__reset();
});

describe('createYangjuWatch', () => {
  it('happy path → ok:true with the inserted watch (NO golf_clubs is_active check)', async () => {
    mockSupabase.__setResponseForTable('yangju_reservation_watches', {
      data: sampleRow,
      error: null,
      count: 0,
    });

    const { createYangjuWatch } = await import('@/lib/telegram-yangju/watches');
    const result = await createYangjuWatch(baseInput);

    expect(result.ok).toBe(true);
    expect(result.watch).toEqual(sampleRow);
    // yangju-only bot: must NOT query golf_clubs at all
    expect(mockSupabase.from).not.toHaveBeenCalledWith('golf_clubs');
  });

  it('out-of-range date → ok:false reason out_of_range, no DB call', async () => {
    const { createYangjuWatch } = await import('@/lib/telegram-yangju/watches');
    const result = await createYangjuWatch({ ...baseInput, date: OUT_OF_RANGE_DATE });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('out_of_range');
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('cap reached → ok:false reason cap, no insert', async () => {
    const insertSpy = vi.fn().mockReturnThis();
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: insertSpy,
      then: (r: (v: QueryResponse) => unknown) =>
        Promise.resolve({ data: [], error: null, count: 20 }).then(r),
    }));

    const { createYangjuWatch, MAX_ACTIVE_YANGJU_WATCHES } = await import(
      '@/lib/telegram-yangju/watches'
    );
    expect(MAX_ACTIVE_YANGJU_WATCHES).toBe(20);

    const result = await createYangjuWatch(baseInput);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('cap');
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('duplicate (23505) → ok:true reason duplicate, not thrown', async () => {
    mockSupabase.__setResponseForTable('yangju_reservation_watches', {
      data: null,
      error: { code: '23505', message: 'duplicate key' },
      count: 0,
    } as unknown as QueryResponse);

    const { createYangjuWatch } = await import('@/lib/telegram-yangju/watches');
    const result = await createYangjuWatch(baseInput);

    expect(result.ok).toBe(true);
    expect(result.reason).toBe('duplicate');
  });
});

describe('listActiveYangjuWatches', () => {
  it('returns active rows from the mock', async () => {
    const rows = [sampleRow, { ...sampleRow, id: 2 }];
    mockSupabase.__setResponseForTable('yangju_reservation_watches', { data: rows, error: null });

    const { listActiveYangjuWatches } = await import('@/lib/telegram-yangju/watches');
    expect(await listActiveYangjuWatches(123)).toEqual(rows);
  });
});

describe('stopYangjuWatch', () => {
  it("updates status='stopped' for the id", async () => {
    const updateSpy = vi.fn().mockReturnThis();
    const eqSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => ({ update: updateSpy, eq: eqSpy }));

    const { stopYangjuWatch } = await import('@/lib/telegram-yangju/watches');
    await stopYangjuWatch(7);

    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'stopped' }));
    expect(eqSpy).toHaveBeenCalledWith('id', 7);
  });
});

describe('stopAllYangjuWatches', () => {
  it("stops chat's active watches and returns count", async () => {
    const updateSpy = vi.fn().mockReturnThis();
    const calls: Array<[string, unknown]> = [];
    const eqSpy = vi.fn((col: string, val: unknown) => {
      calls.push([col, val]);
      return {
        eq: eqSpy,
        then: (r: (v: QueryResponse) => unknown) =>
          Promise.resolve({ data: null, error: null, count: 2 }).then(r),
      };
    });
    mockSupabase.from.mockImplementation(() => ({ update: updateSpy, eq: eqSpy }));

    const { stopAllYangjuWatches } = await import('@/lib/telegram-yangju/watches');
    const count = await stopAllYangjuWatches(123);

    expect(calls).toContainEqual(['chat_id', 123]);
    expect(calls).toContainEqual(['status', 'active']);
    expect(count).toBe(2);
  });
});
