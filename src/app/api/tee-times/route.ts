import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';
import { filterLiveTeeTimes, latestSuccessByClub } from '@/lib/utils/liveness';

const log = createLogger('tee-times');

const PAGE_SIZE = 1000;
const MAX_PAGES = 20; // safety ceiling: 20k rows
// Pages requested at once. A date has ~5 result pages and ~3 tee-time pages; one
// round trip per page made the warm response ~0.5s and the cold one ~4s.
const PAGE_BATCH = 3;

// Tee times change only when the hourly scrape lands, so let the CDN answer the
// first visitor instead of a cold function + 3 sequential queries. The stale
// window spans one scrape cycle: the first open after a quiet spell is served
// from the CDN (measured 3.8s cold MISS vs 0.1–0.4s HIT) while it refetches in
// the background, so the next refresh is current. Browsers keep max-age=0 so
// the in-app refresh still reaches the CDN.
const CDN_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=3600';
const cached = (body: unknown) =>
  NextResponse.json(body, { headers: { 'Cache-Control': CDN_CACHE } });

type QueryPage<T> = {
  range: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>;
};

async function fetchAllPages<T>(
  build: () => QueryPage<T>,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = [];
  for (let start = 0; start < MAX_PAGES; start += PAGE_BATCH) {
    const pages = Array.from({ length: Math.min(PAGE_BATCH, MAX_PAGES - start) }, (_, i) => start + i);
    // Fetch a batch concurrently, then append strictly in page order; the first
    // short page proves the set is exhausted (later pages in the batch are empty).
    const results = await Promise.all(
      pages.map((p) => build().range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1)),
    );
    for (const { data, error } of results) {
      if (error) return { data: rows, error };
      const batch = data ?? [];
      rows.push(...batch);
      if (batch.length < PAGE_SIZE) return { data: rows, error: null };
    }
  }
  return { data: rows, error: null };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const date = searchParams.get('date');
  const clubs = searchParams.get('clubs');
  const time_from = searchParams.get('time_from');
  const time_to = searchParams.get('time_to');
  const price_min = searchParams.get('price_min');
  const price_max = searchParams.get('price_max');

  if (!date) {
    return NextResponse.json(
      { error: 'date query parameter is required (YYYY-MM-DD)' },
      { status: 400 },
    );
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'date must be in YYYY-MM-DD format' },
      { status: 400 },
    );
  }

  // Validate time format if provided
  const timeRegex = /^\d{2}:\d{2}$/;
  if (time_from && !timeRegex.test(time_from)) {
    return NextResponse.json(
      { error: 'time_from must be in HH:MM format' },
      { status: 400 },
    );
  }
  if (time_to && !timeRegex.test(time_to)) {
    return NextResponse.json(
      { error: 'time_to must be in HH:MM format' },
      { status: 400 },
    );
  }

  try {
    // Service role: scrape_jobs / scrape_club_results are not public-readable
    // (anon RLS would return empty S and hide every slot).
    const supabase = createAdminClient();

    // Validate price params early so we don't build a partial query
    let parsedPriceMin: number | undefined;
    let parsedPriceMax: number | undefined;

    if (price_min !== null && price_min !== '') {
      parsedPriceMin = Number(price_min);
      if (isNaN(parsedPriceMin)) {
        return NextResponse.json(
          { error: 'price_min must be a number' },
          { status: 400 },
        );
      }
    }
    if (price_max !== null && price_max !== '') {
      parsedPriceMax = Number(price_max);
      if (isNaN(parsedPriceMax)) {
        return NextResponse.json(
          { error: 'price_max must be a number' },
          { status: 400 },
        );
      }
    }

    const clubIds = clubs
      ? clubs.split(',').map((id) => id.trim()).filter(Boolean)
      : [];

    const { data: jobs, error: jobsError } = await fetchAllPages<{ id: number }>(() =>
      supabase
        .from('scrape_jobs')
        .select('id')
        .eq('date', date)
        .order('id', { ascending: true }),
    );

    if (jobsError) {
      log.error('Failed to fetch scrape jobs', { error: jobsError.message });
      return NextResponse.json(
        { error: 'Failed to fetch tee times' },
        { status: 500 },
      );
    }

    const jobIds = jobs.map((j) => j.id);
    if (jobIds.length === 0) {
      return cached([]);
    }

    // Rebuild the filtered query per page: the builder is single-use, and each
    // page needs a fresh instance to apply its own .range().
    const buildQuery = () => {
      let query = supabase
        .from('tee_times')
        .select('*')
        .eq('date', date)
        // teeoff is the primary sort; id breaks ties so pagination is stable
        // (a nondeterministic tie order could drop or duplicate rows at a page
        // boundary).
        .order('teeoff', { ascending: true })
        .order('id', { ascending: true });

      if (clubIds.length > 0) query = query.in('club_id', clubIds);
      if (time_from) query = query.gte('teeoff', time_from);
      if (time_to) query = query.lte('teeoff', time_to);
      if (parsedPriceMin !== undefined) query = query.gte('price', parsedPriceMin);
      if (parsedPriceMax !== undefined) query = query.lte('price', parsedPriceMax);
      return query;
    };

    // S (latest success per club) and the tee-time rows are independent reads —
    // run them together instead of back to back.
    const [
      { data: results, error: resultsError },
      { data: rows, error: teeTimesError },
    ] = await Promise.all([
      // Thousands of success rows per date (hourly jobs × clubs). Must page —
      // a single select is capped at 1000 and would pin S to an early scrape.
      fetchAllPages<{ club_id: string; scraped_at: string | null }>(() =>
        supabase
          .from('scrape_club_results')
          .select('club_id, scraped_at')
          .in('job_id', jobIds)
          .eq('status', 'success')
          .order('id', { ascending: true }),
      ),
      fetchAllPages<NonNullable<Awaited<ReturnType<typeof buildQuery>>['data']>[number]>(buildQuery),
    ]);

    if (resultsError) {
      log.error('Failed to fetch scrape results', { error: resultsError.message });
      return NextResponse.json(
        { error: 'Failed to fetch tee times' },
        { status: 500 },
      );
    }

    const sByClub = latestSuccessByClub(results);
    if (sByClub.size === 0) {
      return cached([]);
    }

    if (teeTimesError) {
      log.error('Supabase error', { error: teeTimesError.message });
      return NextResponse.json(
        { error: 'Failed to fetch tee times' },
        { status: 500 },
      );
    }

    // Legacy scrapes stored partner CCs with a "[제휴]" prefix; strip it on the wire
    // so both display and grouping use the clean club name.
    const cleaned = rows.map((row) => ({
      ...row,
      cc_name: typeof row.cc_name === 'string' ? row.cc_name.replace(/^\[제휴\]\s*/, '') : row.cc_name,
    }));

    return cached(filterLiveTeeTimes(cleaned, sByClub));
  } catch (err) {
    log.error('Unexpected error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
