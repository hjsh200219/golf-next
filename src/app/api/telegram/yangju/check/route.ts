import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendMessage } from '@/lib/telegram/client';
import { BACKSTOP_MS, computeS, matchWatch } from '@/lib/telegram/match';
import { kstToday } from '@/lib/telegram/time';
import { encodeReserveCb } from '@/lib/telegram-yangju/keyboards';
import { toYmd, toHhmm } from '@/lib/telegram-yangju/slot-format';
import { createLogger } from '@/lib/logger';
import type { Database } from '@/lib/types/database';

type Watch = Database['public']['Tables']['yangju_reservation_watches']['Row'];
type TeeTime = Database['public']['Tables']['tee_times']['Row'];

const log = createLogger('telegram/yangju/check');

export const maxDuration = 60;

const CLUB = 'yangju';

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    log.warn('Unauthorized yangju check request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_JK_BOT_TOKEN;
  const now = Date.now();
  const today = kstToday(now);
  const supabase = createAdminClient();

  const { data: activeWatches } = await supabase
    .from('yangju_reservation_watches')
    .select('*')
    .eq('status', 'active');

  const watches = (activeWatches ?? []) as Watch[];

  // Auto-expire watches whose date has passed (a watch dated exactly today stays).
  const expired = watches.filter((w) => w.date < today).length;
  if (expired > 0) {
    await supabase
      .from('yangju_reservation_watches')
      .update({ status: 'stopped', updated_at: new Date(now).toISOString() })
      .lt('date', today)
      .eq('status', 'active');
  }

  const remaining = watches.filter((w) => w.date >= today);

  let sNullSkips = 0;
  let matches = 0;
  let sent = 0;

  for (const watch of remaining) {
    // S two-step (freshness anchor). Step 1: jobs for this date.
    const { data: jobs } = await supabase.from('scrape_jobs').select('id').eq('date', watch.date);
    const jobIds = (jobs ?? []).map((j) => (j as { id: number }).id);
    if (jobIds.length === 0) {
      sNullSkips++;
      continue;
    }

    const { data: results } = await supabase
      .from('scrape_club_results')
      .select('scraped_at')
      .in('job_id', jobIds)
      .eq('club_id', CLUB)
      .eq('status', 'success');

    const S = computeS((results ?? []) as { scraped_at: string | null }[]);
    if (S == null || Date.parse(S) < now - BACKSTOP_MS) {
      sNullSkips++;
      continue;
    }

    const { data: rows } = await supabase
      .from('tee_times')
      .select('*')
      .eq('club_id', CLUB)
      .eq('date', watch.date)
      .gte('scraped_at', S);

    // matchWatch needs club_id/time_from/time_to; yangju watch has no club_id column,
    // so pass the fixed club id for the comparison.
    const matched = matchWatch(
      { club_id: CLUB, time_from: watch.time_from, time_to: watch.time_to },
      (rows ?? []).map((r) => ({ ...(r as TeeTime), club_id: CLUB })) as TeeTime[],
      S,
      now,
    );

    // Optional course filter on the watch (null = any course).
    const slots = watch.course
      ? matched.filter((r) => (r.course ?? '') === watch.course)
      : matched;

    if (slots.length > 0) {
      matches++;
      await sendMessage(watch.chat_id, buildMessage(watch, slots), reserveKeyboard(slots, watch.date), undefined, token);
      sent++;
    }
  }

  log.info('yangju check', { watches: watches.length, expired, sNullSkips, matches, sent });
  return NextResponse.json({ watches: watches.length, expired, sNullSkips, matches, sent });
}

function buildMessage(watch: Watch, matched: TeeTime[]): string {
  const times = matched
    .map((r) => r.teeoff.slice(0, 5))
    .sort()
    .join(', ');
  return `⛳️ 양주CC ${watch.date} 빈자리 알림\n예약 가능 시간: ${times}\n\n아래 버튼으로 바로 예약하세요:`;
}

/**
 * One [예약] button per matched slot. callback_data is format-IDENTICAL to /book's
 * (date=YYYYMMDD, time=HHMM) so a slot reached via alert and via /book produce the
 * SAME idempotency key — no double-book across entry paths. pointid is empty
 * (tee_times has none); it is re-fetched at confirm and excluded from the key.
 */
function reserveKeyboard(slots: TeeTime[], dateDash: string) {
  return {
    inline_keyboard: slots.map((s) => [
      {
        text: `⛳️ ${s.teeoff.slice(0, 5)} ${s.course ?? ''}`,
        callback_data: encodeReserveCb({
          date: toYmd(dateDash),
          time: toHhmm(s.teeoff),
          course: s.course ?? '',
          pointid: '',
        }),
      },
    ]),
  };
}
