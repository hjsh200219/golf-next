import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/types/database';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
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
    if (price_min !== null && price_min !== '') {
      const min = Number(price_min);
      if (isNaN(min)) {
        return NextResponse.json(
          { error: 'price_min must be a number' },
          { status: 400 },
        );
      }
      query = query.gte('price', min);
    }
    if (price_max !== null && price_max !== '') {
      const max = Number(price_max);
      if (isNaN(max)) {
        return NextResponse.json(
          { error: 'price_max must be a number' },
          { status: 400 },
        );
      }
      query = query.lte('price', max);
    }

    const { data, error } = await query as { data: TeeTime[] | null; error: { message: string } | null };

    if (error) {
      console.error('[tee-times] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tee times' },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[tee-times] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
