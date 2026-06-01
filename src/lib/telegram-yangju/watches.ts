import { createAdminClient } from '@/lib/supabase/server';
import { isDateInRange } from '@/lib/telegram/time';
import type { Database } from '@/lib/types/database';

type Row = Database['public']['Tables']['yangju_reservation_watches']['Row'];

export const MAX_ACTIVE_YANGJU_WATCHES = 20;

export interface CreateYangjuWatchInput {
  chatId: number;
  date: string;
  timeFrom: string;
  timeTo: string;
  course?: string | null;
}

export interface CreateYangjuWatchResult {
  ok: boolean;
  reason?: string;
  watch?: Row;
}

/**
 * Create an active yangju watch. Mirrors `src/lib/telegram/watches.ts` but is
 * yangju-only: there is NO club-selection step, so it does NOT do the
 * `golf_clubs.is_active` FK check the shared bot does.
 *
 * Plain `.insert(...)` (never upsert): the partial unique index
 * `(chat_id,date,time_from,time_to,course) WHERE status='active'` cannot be an
 * ON CONFLICT arbiter. A `23505` from a concurrent identical active watch is
 * treated as idempotent success.
 */
export async function createYangjuWatch(
  input: CreateYangjuWatchInput,
): Promise<CreateYangjuWatchResult> {
  if (!isDateInRange(input.date)) {
    return { ok: false, reason: 'out_of_range' };
  }

  const supabase = createAdminClient();

  const { count } = await supabase
    .from('yangju_reservation_watches')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('chat_id', input.chatId);

  if ((count ?? 0) >= MAX_ACTIVE_YANGJU_WATCHES) {
    return { ok: false, reason: 'cap' };
  }

  const { data: watch, error } = await supabase
    .from('yangju_reservation_watches')
    .insert({
      chat_id: input.chatId,
      date: input.date,
      time_from: input.timeFrom,
      time_to: input.timeTo,
      course: input.course ?? null,
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

/** Active yangju watches for a chat, ordered by date. */
export async function listActiveYangjuWatches(chatId: number): Promise<Row[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('yangju_reservation_watches')
    .select()
    .eq('status', 'active')
    .eq('chat_id', chatId)
    .order('date');

  return (data ?? []) as Row[];
}

/** Stop a single yangju watch by id. */
export async function stopYangjuWatch(id: number): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('yangju_reservation_watches')
    .update({ status: 'stopped', updated_at: new Date().toISOString() })
    .eq('id', id);
}

/** Stop every active yangju watch for a chat. Returns the number stopped. */
export async function stopAllYangjuWatches(chatId: number): Promise<number> {
  const supabase = createAdminClient();

  const { count } = await supabase
    .from('yangju_reservation_watches')
    .update({ status: 'stopped', updated_at: new Date().toISOString() }, { count: 'exact' })
    .eq('chat_id', chatId)
    .eq('status', 'active');

  return count ?? 0;
}
