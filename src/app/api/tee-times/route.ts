import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('tee-times');

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
    const supabase = createServerSupabaseClient();

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

    // Supabase caps a single response at max_rows (default 1000). Page through
    // until a short page proves the result set is exhausted, so the count and
    // list reflect the true total instead of silently stopping at 1000.
    const PAGE_SIZE = 1000;
    const MAX_PAGES = 20; // safety ceiling: 20k rows
    const rows: NonNullable<Awaited<ReturnType<typeof buildQuery>>['data']> = [];

    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE;
      const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);

      if (error) {
        log.error('Supabase error', { error: error.message });
        return NextResponse.json(
          { error: 'Failed to fetch tee times' },
          { status: 500 },
        );
      }

      const batch = data ?? [];
      rows.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    }

    // Legacy scrapes stored partner CCs with a "[제휴]" prefix; strip it on the wire
    // so both display and grouping use the clean club name.
    const cleaned = rows.map((row) => ({
      ...row,
      cc_name: typeof row.cc_name === 'string' ? row.cc_name.replace(/^\[제휴\]\s*/, '') : row.cc_name,
    }));

    return NextResponse.json(cleaned);
  } catch (err) {
    log.error('Unexpected error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
