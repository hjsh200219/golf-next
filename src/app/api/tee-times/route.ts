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

    let query = supabase
      .from('tee_times')
      .select('*')
      .eq('date', date)
      .order('teeoff', { ascending: true });

    // Filter by club IDs
    if (clubs) {
      const clubIds = clubs
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (clubIds.length > 0) {
        query = query.in('club_id', clubIds);
      }
    }

    // Filter by tee-off time range
    if (time_from) {
      query = query.gte('teeoff', time_from);
    }
    if (time_to) {
      query = query.lte('teeoff', time_to);
    }

    // Filter by price range
    if (parsedPriceMin !== undefined) {
      query = query.gte('price', parsedPriceMin);
    }
    if (parsedPriceMax !== undefined) {
      query = query.lte('price', parsedPriceMax);
    }

    const { data, error } = await query;

    if (error) {
      log.error('Supabase error', { error: error.message });
      return NextResponse.json(
        { error: 'Failed to fetch tee times' },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    log.error('Unexpected error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
