import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabase, type QueryResponse } from '../../helpers/mock-supabase';

const mockSupabase = createMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}));

// NOTE: the shared mock cannot reproduce real partial-unique-index or row-lock
// semantics — every .eq()/.in()/.update()/.insert() is a no-op returning a canned
// response. So these tests verify the code's ERROR/ROW-COUNT MAPPING (23505 ->
// duplicate, 0-rows -> already_confirmed), NOT that the DB actually serializes
// concurrent claims/confirms. The real guarantee lives in migration 012's partial
// unique index + Postgres row-lock CAS; prove that with an integration test against
// real Postgres before the booking client goes live.
beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.__reset();
});

const fields = { chatId: 123, date: '2026-06-30', teeTime: '0612', course: '동' };

const sampleAttempt = {
  id: 1,
  chat_id: 123,
  date: '2026-06-30',
  tee_time: '0612',
  course: '동',
  resolved_pointid: null,
  status: 'pending',
  idempotency_key: '123|2026-06-30|0612|동',
  payload_log: null,
  created_at: '2026-06-02T00:00:00Z',
  updated_at: '2026-06-02T00:00:00Z',
};

describe('idempotencyKey', () => {
  it('is deterministic from chat_id|date|tee_time|course (no pointid)', async () => {
    const { idempotencyKey } = await import('@/lib/telegram-yangju/attempts');
    expect(idempotencyKey(fields)).toBe('123|2026-06-30|0612|동');
  });
});

describe('claimAttempt', () => {
  it('happy path → ok:true with the inserted attempt id (count under cap)', async () => {
    mockSupabase.__setResponseForTable('yangju_reservation_attempts', {
      data: sampleAttempt,
      error: null,
      count: 0,
    });

    const { claimAttempt } = await import('@/lib/telegram-yangju/attempts');
    const result = await claimAttempt(fields);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.id).toBe(1);
  });

  it('maps a unique conflict (23505) → ok:false reason duplicate (the webhook-retry guard relies on the DB index, verified separately)', async () => {
    // The count query must succeed cleanly (count 0, under cap); only the INSERT
    // raises 23505. A single shared response can't express that — drive `from`
    // directly: select-chain (count) resolves clean, insert-chain resolves 23505.
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      // count query (no .insert in this chain) resolves under-cap clean
      then: (r: (v: QueryResponse) => unknown) =>
        Promise.resolve({ data: [], error: null, count: 0 }).then(r),
      // insert chain resolves with the unique violation
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key' },
        }),
      }),
    }));

    const { claimAttempt } = await import('@/lib/telegram-yangju/attempts');
    const result = await claimAttempt(fields);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('duplicate');
  });

  it('daily cap reached → ok:false reason cap, no insert', async () => {
    const insertSpy = vi.fn().mockReturnThis();
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      insert: insertSpy,
      // count query resolves at the cap
      then: (r: (v: QueryResponse) => unknown) =>
        Promise.resolve({ data: [], error: null, count: 3 }).then(r),
    }));

    const { claimAttempt, MAX_DAILY_BOOKINGS } = await import('@/lib/telegram-yangju/attempts');
    expect(MAX_DAILY_BOOKINGS).toBe(3);

    const result = await claimAttempt(fields);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('cap');
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('count-query error → ok:false, no insert (fails CLOSED on unknown cap)', async () => {
    const insertSpy = vi.fn().mockReturnThis();
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      insert: insertSpy,
      then: (r: (v: QueryResponse) => unknown) =>
        Promise.resolve({ data: null, error: { message: 'count failed' }, count: null }).then(r),
    }));

    const { claimAttempt } = await import('@/lib/telegram-yangju/attempts');
    const result = await claimAttempt(fields);

    expect(result.ok).toBe(false);
    expect(insertSpy).not.toHaveBeenCalled();
  });
});

describe('confirmAttempt (maps CAS row-count; real serialization is a DB row-lock, verified separately)', () => {
  it('CAS succeeds (1 row updated pending→confirmed) → ok:true', async () => {
    // update().eq().eq().select() returns one row
    mockSupabase.__setResponseForTable('yangju_reservation_attempts', {
      data: [{ id: 5 }],
      error: null,
    });

    const { confirmAttempt } = await import('@/lib/telegram-yangju/attempts');
    const result = await confirmAttempt(5);

    expect(result.ok).toBe(true);
  });

  it('CAS finds no pending row (already confirmed / retry) → ok:false already_confirmed', async () => {
    mockSupabase.__setResponseForTable('yangju_reservation_attempts', {
      data: [],
      error: null,
    });

    const { confirmAttempt } = await import('@/lib/telegram-yangju/attempts');
    const result = await confirmAttempt(5);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('already_confirmed');
  });
});

describe('mark* outcome helpers', () => {
  it('markBooked updates status=booked with resolved_pointid + payload_log', async () => {
    const updateSpy = vi.fn().mockReturnThis();
    const eqSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => ({ update: updateSpy, eq: eqSpy }));

    const { markBooked } = await import('@/lib/telegram-yangju/attempts');
    await markBooked(5, '2', 'cmd=ins&...');

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'booked', resolved_pointid: '2', payload_log: 'cmd=ins&...' }),
    );
    expect(eqSpy).toHaveBeenCalledWith('id', 5);
  });

  it('markDryRun updates status=dry_run with payload_log', async () => {
    const updateSpy = vi.fn().mockReturnThis();
    const eqSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => ({ update: updateSpy, eq: eqSpy }));

    const { markDryRun } = await import('@/lib/telegram-yangju/attempts');
    await markDryRun(5, 'cmd=ins&...');

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'dry_run', payload_log: 'cmd=ins&...' }),
    );
  });

  it('markFailed updates status=failed (retryable — drops out of unique index)', async () => {
    const updateSpy = vi.fn().mockReturnThis();
    const eqSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => ({ update: updateSpy, eq: eqSpy }));

    const { markFailed } = await import('@/lib/telegram-yangju/attempts');
    await markFailed(5, 'slot gone');

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });
});
