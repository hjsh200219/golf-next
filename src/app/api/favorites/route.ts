import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/types/database';

type UserFavorite = Database['public']['Tables']['user_favorites']['Row'];

// GET /api/favorites — list the authenticated user's favorite clubs
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerSupabaseClient() as any;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) as {
        data: UserFavorite[] | null;
        error: { message: string } | null;
      };

    if (error) {
      console.error('[favorites] Failed to fetch favorites:', error);
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[favorites] Unexpected error in GET:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/favorites — add a club to favorites
export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerSupabaseClient() as any;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { clubId?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { clubId } = body;

    if (!clubId || typeof clubId !== 'string') {
      return NextResponse.json(
        { error: 'clubId is required and must be a string' },
        { status: 400 },
      );
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('club_id', clubId)
      .maybeSingle() as { data: { id: number } | null };

    if (existing) {
      return NextResponse.json(
        { error: 'Club is already in favorites' },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .insert({ user_id: user.id, club_id: clubId })
      .select()
      .single() as { data: UserFavorite | null; error: { message: string } | null };

    if (error) {
      console.error('[favorites] Failed to add favorite:', error);
      return NextResponse.json(
        { error: 'Failed to add favorite' },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[favorites] Unexpected error in POST:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/favorites — remove a club from favorites
export async function DELETE(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerSupabaseClient() as any;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { clubId?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { clubId } = body;

    if (!clubId || typeof clubId !== 'string') {
      return NextResponse.json(
        { error: 'clubId is required and must be a string' },
        { status: 400 },
      );
    }

    const { error, count } = await supabase
      .from('user_favorites')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .eq('club_id', clubId) as { error: { message: string } | null; count: number | null };

    if (error) {
      console.error('[favorites] Failed to delete favorite:', error);
      return NextResponse.json(
        { error: 'Failed to remove favorite' },
        { status: 500 },
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: 'Favorite not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[favorites] Unexpected error in DELETE:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
