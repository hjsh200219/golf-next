import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createScraper } from '@/lib/scrapers';
import type { LoginCredentials } from '@/lib/scrapers/base';
import { dedupeTeeTimeRows } from '@/lib/utils/tee-time';
import { createLogger } from '@/lib/logger';

const log = createLogger('scrape/club');

function getCredentials(): LoginCredentials {
  return {
    id: process.env.GOLF_LOGIN_ID ?? '',
    id2: process.env.GOLF_LOGIN_ID2 ?? '',
    email: process.env.GOLF_LOGIN_EMAIL ?? '',
    pw: process.env.GOLF_LOGIN_PW ?? '',
    pw1: process.env.GOLF_LOGIN_PW1 ?? '',
    pw2: process.env.GOLF_LOGIN_PW2 ?? '',
    pw3: process.env.GOLF_LOGIN_PW3 ?? '',
    pw4: process.env.GOLF_LOGIN_PW4 ?? '',
    pw5: process.env.GOLF_LOGIN_PW5 ?? '',
    pw6: process.env.GOLF_LOGIN_PW6 ?? '',
    name: process.env.GOLF_LOGIN_NAME ?? '',
    mobile: process.env.GOLF_LOGIN_MOBILE ?? '',
  };
}

export async function POST(request: NextRequest) {
  const headerKey = request.headers.get('x-api-key');
  const envKey = process.env.SCRAPE_API_KEY;
  if (!envKey || headerKey !== envKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { jobId?: number; clubId?: string; date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { jobId, clubId, date } = body;
  if (!jobId || !clubId || !date) {
    return NextResponse.json(
      { error: 'jobId, clubId, and date are required' },
      { status: 400 },
    );
  }

  const credentials = getCredentials();
  const scraper = createScraper(clubId, date, credentials);

  if (!scraper) {
    return NextResponse.json(
      { error: `No scraper found for club: ${clubId}` },
      { status: 404 },
    );
  }

  const supabase = createAdminClient();
  const start = Date.now();

  try {
    const result = await scraper.run();
    const durationMs = Date.now() - start;

    // Upsert tee times
    let upsertFailed: string | null = null;
    if (result.success && result.teeTimes.length > 0) {
      const now = new Date().toISOString();
      const rows = result.teeTimes.map((t) => ({
        club_id: clubId,
        cc_name: t.cc_name,
        date: t.date,
        teeoff: t.teeoff,
        course: t.course ?? '',
        price: t.price,
        event: t.event,
        scraped_at: now,
      }));

      // Collapse duplicate (club_id,date,teeoff,course) keys: a single upsert
      // batch with the same conflict key twice fails the WHOLE batch.
      const deduped = dedupeTeeTimeRows(rows);

      const { error: upsertError } = await supabase
        .from('tee_times')
        .upsert(deduped, {
          onConflict: 'club_id,date,teeoff,course',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        // Surface the failure — otherwise the job reports success with 0 rows in DB.
        upsertFailed = upsertError.message;
        log.error(`Upsert error for ${clubId}`, { error: upsertError.message });
      }
    }

    // A scrape that parsed rows but failed to persist them is NOT a success.
    const persisted = result.success && !upsertFailed;

    // Update scrape_club_results
    await supabase
      .from('scrape_club_results')
      .update({
        status: persisted ? 'success' : 'failed',
        error_message: upsertFailed ?? result.error ?? null,
        tee_time_count: persisted ? result.teeTimes.length : 0,
        duration_ms: durationMs,
        scraped_at: new Date().toISOString(),
      })
      .eq('job_id', jobId)
      .eq('club_id', clubId);

    // Update job progress
    const { data: jobResults } = await supabase
      .from('scrape_club_results')
      .select('status, club_id')
      .eq('job_id', jobId);

    if (jobResults) {
      const completed = jobResults.filter(
        (r) => r.status === 'success' || r.status === 'failed',
      ).length;
      const failed = jobResults.filter(
        (r) => r.status === 'failed',
      );

      const updateData: Record<string, unknown> = {
        completed_clubs: completed,
      };

      if (failed.length > 0) {
        updateData.failed_clubs = failed.map((r) => r.club_id);
      }

      if (completed === jobResults.length) {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
      }

      await supabase
        .from('scrape_jobs')
        .update(updateData)
        .eq('id', jobId);
    }

    return NextResponse.json({
      clubId,
      success: persisted,
      teeTimeCount: persisted ? result.teeTimes.length : 0,
      durationMs,
      error: upsertFailed ?? result.error,
    });
  } catch (error) {
    const durationMs = Date.now() - start;

    await supabase
      .from('scrape_club_results')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error),
        duration_ms: durationMs,
      })
      .eq('job_id', jobId)
      .eq('club_id', clubId);

    return NextResponse.json(
      {
        clubId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs,
      },
      { status: 500 },
    );
  }
}
