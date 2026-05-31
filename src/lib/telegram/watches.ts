import { createAdminClient } from '@/lib/supabase/server';
import { isDateInRange } from '@/lib/telegram/time';
import type { Database } from '@/lib/types/database';

type Row = Database['public']['Tables']['telegram_watches']['Row'];

export const MAX_ACTIVE_WATCHES = 20;

export interface CreateWatchInput {
  chatId: number;
  clubId: string;
  date: string;
  timeFrom: string;
  timeTo: string;
}

export interface CreateWatchResult {
  ok: boolean;
  reason?: string;
  watch?: Row;
}

/**
 * Create an active watch for a chat, guarding against out-of-range dates,
 * inactive clubs, and the per-chat active-watch cap.
 *
 * Uses a plain `.insert(...)` (never `.upsert(...)` with onConflict): the
 * partial unique index `(chat_id,club_id,date,time_from,time_to) WHERE
 * status='active'` cannot act as an ON CONFLICT arbiter (Postgres 42P10).
 * A unique-violation (`23505`) from a concurrent identical active watch is
 * treated as idempotent success.
 */
export async function createWatch(input: CreateWatchInput): Promise<CreateWatchResult> {
  if (!isDateInRange(input.date)) {
    return { ok: false, reason: 'out_of_range' };
  }

  const supabase = createAdminClient();

  const { data: clubs } = await supabase
    .from('golf_clubs')
    .select('id')
    .eq('id', input.clubId)
    .eq('is_active', true);

  if (!clubs || clubs.length === 0) {
    return { ok: false, reason: 'inactive_club' };
  }

  const { count } = await supabase
    .from('telegram_watches')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('chat_id', input.chatId);

  if ((count ?? 0) >= MAX_ACTIVE_WATCHES) {
    return { ok: false, reason: 'cap' };
  }

  const { data: watch, error } = await supabase
    .from('telegram_watches')
    .insert({
      chat_id: input.chatId,
      club_id: input.clubId,
      date: input.date,
      time_from: input.timeFrom,
      time_to: input.timeTo,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: true, reason: 'duplicate' };
    }
    return { ok: false, reason: error.message };
  }

  return { ok: true, watch: watch as Row };
}

/** Active watches for a chat, ordered by date. */
export async function listActiveWatches(chatId: number): Promise<Row[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('telegram_watches')
    .select()
    .eq('status', 'active')
    .eq('chat_id', chatId)
    .order('date');

  return (data ?? []) as Row[];
}

/** Stop a single watch by id. */
export async function stopWatch(id: number): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('telegram_watches')
    .update({ status: 'stopped', updated_at: new Date().toISOString() })
    .eq('id', id);
}

/** Stop every active watch for a chat. Returns the number stopped if available. */
export async function stopAllWatches(chatId: number): Promise<number> {
  const supabase = createAdminClient();

  const { count } = await supabase
    .from('telegram_watches')
    .update({ status: 'stopped', updated_at: new Date().toISOString() }, { count: 'exact' })
    .eq('chat_id', chatId)
    .eq('status', 'active');

  return count ?? 0;
}
