import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/types/database';
import { createLogger } from '@/lib/logger';

const log = createLogger('scrape');

type ScrapeJob = Database['public']['Tables']['scrape_jobs']['Row'];
type GolfClub = Pick<Database['public']['Tables']['golf_clubs']['Row'], 'id' | 'name' | 'scraper_type'>;

function validateApiKey(request: NextRequest): boolean {
  const headerKey = request.headers.get('x-api-key');
  const envKey = process.env.SCRAPE_API_KEY;

  if (!envKey) {
    log.error('SCRAPE_API_KEY env var is not set');
    return false;
  }

  return headerKey === envKey;
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { dates?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { dates } = body;

  if (!Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json(
      { error: 'dates is required and must be a non-empty array of YYYY-MM-DD strings' },
      { status: 400 },
    );
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const invalidDates = (dates as unknown[]).filter(
    (d) => typeof d !== 'string' || !dateRegex.test(d as string),
  );
  if (invalidDates.length > 0) {
    return NextResponse.json(
      { error: 'All dates must be in YYYY-MM-DD format', invalid: invalidDates },
      { status: 400 },
    );
  }

  const validDates = dates as string[];

  try {

    const supabase = createAdminClient() as any;

    // Fetch all active clubs
    const { data: clubs, error: clubsError } = await supabase
      .from('golf_clubs')
      .select('id, name, scraper_type')
      .eq('is_active', true) as { data: GolfClub[] | null; error: { message: string } | null };

    if (clubsError) {
      log.error('Failed to fetch clubs', { error: clubsError.message });
      return NextResponse.json(
        { error: 'Failed to fetch active clubs' },
        { status: 500 },
      );
    }

    if (!clubs || clubs.length === 0) {
      return NextResponse.json(
        { error: 'No active clubs found' },
        { status: 404 },
      );
    }

    // Create a scrape_job record for each date
    const jobIds: number[] = [];

    for (const date of validDates) {
      const { data: job, error: jobError } = await supabase
        .from('scrape_jobs')
        .insert({
          date,
          status: 'pending',
          total_clubs: clubs.length,
          completed_clubs: 0,
          failed_clubs: [],
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single() as { data: Pick<ScrapeJob, 'id'> | null; error: { message: string } | null };

      if (jobError || !job) {
        log.error(`Failed to create job for date ${date}`, { error: jobError?.message });
        return NextResponse.json(
          { error: `Failed to create scrape job for date ${date}` },
          { status: 500 },
        );
      }

      jobIds.push(job.id);

      // Insert club result placeholders
      const clubResults = clubs.map((club) => ({
        job_id: job.id,
        club_id: club.id,
        status: 'pending',
        tee_time_count: 0,
      }));

      const { error: resultsError } = await supabase
        .from('scrape_club_results')
        .insert(clubResults) as { error: { message: string } | null };

      if (resultsError) {
        log.error(`Failed to insert club results for job ${job.id}`, { error: resultsError.message });
        // Non-fatal — job was created, continue
      }

      // Trigger individual scraper calls per club (fire-and-forget)
      // Use the incoming request's origin to avoid deployment-specific URL issues
      const requestOrigin = new URL(request.url).origin;
      const baseUrl = requestOrigin !== 'http://localhost' ? requestOrigin
        : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

      for (const club of clubs) {
        const scraperUrl = `${baseUrl}/api/scrape/club`;
        fetch(scraperUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.SCRAPE_API_KEY ?? '',
          },
          body: JSON.stringify({
            jobId: job.id,
            clubId: club.id,
            date,
          }),
        }).catch((err) => {
          log.error(`Failed to trigger scraper for club ${club.id}, date ${date}`, { error: err instanceof Error ? err.message : String(err) });
        });
      }

      // Update job status to running
      await supabase
        .from('scrape_jobs')
        .update({ status: 'running' })
        .eq('id', job.id);
    }

    return NextResponse.json(
      {
        jobIds,
        dates: validDates,
        totalClubs: clubs.length,
        message: `Scrape jobs created for ${validDates.length} date(s) across ${clubs.length} club(s)`,
      },
      { status: 201 },
    );
  } catch (err) {
    log.error('Unexpected error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
