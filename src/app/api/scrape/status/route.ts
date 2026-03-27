import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/types/database';
import { createLogger } from '@/lib/logger';

const log = createLogger('scrape/status');

type ScrapeJob = Database['public']['Tables']['scrape_jobs']['Row'];
type ScrapeClubResult = Database['public']['Tables']['scrape_club_results']['Row'];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const jobIdParam = searchParams.get('jobId');

  if (!jobIdParam) {
    return NextResponse.json(
      { error: 'jobId query parameter is required' },
      { status: 400 },
    );
  }

  const jobId = Number(jobIdParam);
  if (isNaN(jobId) || !Number.isInteger(jobId) || jobId <= 0) {
    return NextResponse.json(
      { error: 'jobId must be a positive integer' },
      { status: 400 },
    );
  }

  try {

    const supabase = createAdminClient() as any;

    // Fetch job record
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('id', jobId)
      .single() as { data: ScrapeJob | null; error: { message: string; code?: string } | null };

    if (jobError) {
      if (jobError.code === 'PGRST116') {
        return NextResponse.json(
          { error: `Scrape job ${jobId} not found` },
          { status: 404 },
        );
      }
      log.error('Failed to fetch job', { error: jobError.message });
      return NextResponse.json(
        { error: 'Failed to fetch scrape job' },
        { status: 500 },
      );
    }

    // Fetch per-club results
    const { data: clubResults, error: resultsError } = await supabase
      .from('scrape_club_results')
      .select('*')
      .eq('job_id', jobId)
      .order('scraped_at', { ascending: true }) as {
        data: ScrapeClubResult[] | null;
        error: { message: string } | null;
      };

    if (resultsError) {
      log.error('Failed to fetch club results', { error: resultsError.message });
      return NextResponse.json(
        { error: 'Failed to fetch club results' },
        { status: 500 },
      );
    }

    // Summary counts
    const results = clubResults ?? [];
    const completedCount = results.filter((r) => r.status === 'success').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;
    const pendingCount = results.filter((r) => r.status === 'pending').length;
    const runningCount = results.filter((r) => r.status === 'running').length;

    return NextResponse.json({
      job,
      summary: {
        total: results.length,
        completed: completedCount,
        failed: failedCount,
        pending: pendingCount,
        running: runningCount,
      },
      clubResults: results,
    });
  } catch (err) {
    log.error('Unexpected error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
