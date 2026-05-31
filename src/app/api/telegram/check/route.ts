import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendMessage } from '@/lib/telegram/client';
import { BACKSTOP_MS, computeS, matchWatch } from '@/lib/telegram/match';
import { kstToday } from '@/lib/telegram/time';
import { createLogger } from '@/lib/logger';
import type { Database } from '@/lib/types/database';

type Watch = Database['public']['Tables']['telegram_watches']['Row'];
type TeeTime = Database['public']['Tables']['tee_times']['Row'];

const log = createLogger('telegram/check');

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    log.warn('Unauthorized telegram check request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const today = kstToday(now);
  const supabase = createAdminClient();

  const { data: activeWatches } = await supabase
    .from('telegram_watches')
    .select('*')
    .eq('status', 'active');

  const watches = (activeWatches ?? []) as Watch[];

  // Auto-expire watches whose date has passed (strict: a watch dated exactly
  // today stays active). Issue one batch update; count expired in-memory.
  const expired = watches.filter((w) => w.date < today).length;
  if (expired > 0) {
    await supabase
      .from('telegram_watches')
      .update({ status: 'stopped', updated_at: new Date(now).toISOString() })
      .lt('date', today)
      .eq('status', 'active');
  }

  const remaining = watches.filter((w) => w.date >= today);

  let sNullSkips = 0;
  let matches = 0;
  let sent = 0;

  for (const watch of remaining) {
    // S two-step. Step 1: jobs for this date.
    const { data: jobs } = await supabase
      .from('scrape_jobs')
      .select('id')
      .eq('date', watch.date);

    const jobIds = (jobs ?? []).map((j) => (j as { id: number }).id);

    // Step 2: no jobs → S is null → skip without any results/tee_times query.
    if (jobIds.length === 0) {
      sNullSkips++;
      continue;
    }

    const { data: results } = await supabase
      .from('scrape_club_results')
      .select('scraped_at')
      .in('job_id', jobIds)
      .eq('club_id', watch.club_id)
      .eq('status', 'success');

    const S = computeS((results ?? []) as { scraped_at: string | null }[]);

    // S-null / stale short-circuit BEFORE any tee_times query.
    if (S == null || Date.parse(S) < now - BACKSTOP_MS) {
      sNullSkips++;
      continue;
    }

    const { data: rows } = await supabase
      .from('tee_times')
      .select('*')
      .eq('club_id', watch.club_id)
      .eq('date', watch.date)
      .gte('scraped_at', S);

    const matched = matchWatch(watch, (rows ?? []) as TeeTime[], S, now);

    if (matched.length > 0) {
      matches++;
      await sendMessage(watch.chat_id, buildMessage(watch, matched));
      sent++;
    }
  }

  log.info('telegram check', {
    watches: watches.length,
    expired,
    sNullSkips,
    matches,
    sent,
  });

  return NextResponse.json({
    watches: watches.length,
    expired,
    sNullSkips,
    matches,
    sent,
  });
}

function buildMessage(watch: Watch, matched: TeeTime[]): string {
  const name = matched[0]?.cc_name ?? watch.club_id;
  const times = matched
    .map((r) => r.teeoff.slice(0, 5))
    .sort()
    .join(', ');
  return `⛳️ ${name} ${watch.date} 빈자리 알림\n예약 가능 시간: ${times}`;
}
