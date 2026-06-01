import { createAdminClient } from '@/lib/supabase/server';

/**
 * Durable idempotency + audit for irreversible yangju bookings.
 *
 * Two-tap serialization (the booking-causing tap is tap 2):
 *   Tap 1 (slot-select): `claimAttempt` INSERTs a `pending` row with a DETERMINISTIC
 *     idempotency key. A Telegram webhook retry of tap 1 hits the unique conflict
 *     (`23505`) and aborts.
 *   Tap 2 (confirm): `confirmAttempt` does an atomic CAS `pending -> confirmed`. A
 *     webhook retry of tap 2 finds the row no longer `pending` and aborts — this is
 *     what stops a double resOk POST, since tap 2 carries only the attempt id and
 *     does NOT re-INSERT.
 *
 * The key deliberately EXCLUDES pointid: a yangju slot is uniquely identified by
 * (chat_id, date, tee_time, course); the server-side pointid churns across alert
 * cycles, so including it would let the same logical slot be booked twice.
 */

export const MAX_DAILY_BOOKINGS = 3;

export interface AttemptFields {
  chatId: number;
  date: string; // YYYY-MM-DD
  teeTime: string; // HHMM
  course: string; // 동 / 서
}

export type ClaimResult =
  | { ok: true; id: number }
  | { ok: false; reason: 'duplicate' | 'cap' | string };

export type ConfirmResult = { ok: true } | { ok: false; reason: 'already_confirmed' | string };

/** Deterministic idempotency key — constant across Telegram webhook retries. */
export function idempotencyKey(f: AttemptFields): string {
  return `${f.chatId}|${f.date}|${f.teeTime}|${f.course}`;
}

const TABLE = 'yangju_reservation_attempts';

/**
 * Claim a booking attempt (INSERT-before-resOk). Enforces the daily cap, then
 * INSERTs a `pending` row keyed by the deterministic idempotency key. A unique
 * conflict means a retry/duplicate already claimed it.
 */
export async function claimAttempt(f: AttemptFields): Promise<ClaimResult> {
  const supabase = createAdminClient();

  // Daily per-chat cap. Count only attempts that consumed a booking slot
  // (pending/confirmed/booked) — dry_run and failed do not count.
  // NOTE: count-then-insert is not atomic — N concurrent claims for DISTINCT
  // slots can each pass the cap and over-book by a few. This is bounded (it can
  // NEVER double-book the SAME slot — the deterministic key + CAS guard that) and
  // accepted as best-effort. Strict enforcement would need a Postgres RPC.
  const { count, error: countError } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('chat_id', f.chatId)
    .eq('date', f.date)
    .in('status', ['pending', 'confirmed', 'booked']);

  // Fail CLOSED on a count error: never proceed to book when the cap is unknown.
  if (countError) {
    return { ok: false, reason: countError.message };
  }

  if ((count ?? 0) >= MAX_DAILY_BOOKINGS) {
    return { ok: false, reason: 'cap' };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      chat_id: f.chatId,
      date: f.date,
      tee_time: f.teeTime,
      course: f.course,
      idempotency_key: idempotencyKey(f),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, reason: 'duplicate' };
    }
    return { ok: false, reason: error.message };
  }

  return { ok: true, id: (data as { id: number }).id };
}

/**
 * Atomic CAS `pending -> confirmed` — the tap-2 webhook-retry guard. Returns
 * ok:true only if THIS call flipped the row (1 row affected); a concurrent
 * invocation or retry that finds the row no longer `pending` gets
 * `already_confirmed` and must abort before any resOk POST.
 */
export async function confirmAttempt(id: number): Promise<ConfirmResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    return { ok: false, reason: error.message };
  }
  if (!data || (data as unknown[]).length === 0) {
    return { ok: false, reason: 'already_confirmed' };
  }
  return { ok: true };
}

export interface AttemptRow {
  id: number;
  chat_id: number;
  date: string;
  tee_time: string;
  course: string;
  resolved_pointid: string | null;
  status: string;
  idempotency_key: string;
  payload_log: string | null;
}

/** Fetch a single attempt row by id (null if missing). */
export async function getAttempt(id: number): Promise<AttemptRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  return (data as AttemptRow | null) ?? null;
}

async function setStatus(id: number, patch: Record<string, unknown>): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
}

/** Mark a confirmed attempt as actually booked, with the resolved pointid + sent body. */
export async function markBooked(
  id: number,
  resolvedPointid: string,
  payloadLog: string,
): Promise<void> {
  await setStatus(id, { status: 'booked', resolved_pointid: resolvedPointid, payload_log: payloadLog });
}

/** Mark a DRY-RUN attempt: body assembled + logged, no live POST. */
export async function markDryRun(id: number, payloadLog: string): Promise<void> {
  await setStatus(id, { status: 'dry_run', payload_log: payloadLog });
}

/**
 * Mark an attempt failed (retryable — drops out of the partial unique index).
 * `_error` is reserved for a future `failure_reason` column (not yet in the
 * schema — currently logged by the caller, not persisted here).
 */
export async function markFailed(id: number, _error: string): Promise<void> {
  await setStatus(id, { status: 'failed' });
}
