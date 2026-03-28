import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('favorites/device');

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_FAVORITES_PER_DEVICE = 50;

function isValidUuidV4(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

// GET /api/favorites/device?deviceId=<uuid>
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const deviceId = searchParams.get('deviceId');

  if (!deviceId) {
    return NextResponse.json(
      { error: 'deviceId query parameter is required' },
      { status: 400 },
    );
  }

  if (!isValidUuidV4(deviceId)) {
    return NextResponse.json(
      { error: 'deviceId must be a valid UUID v4' },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('device_favorites')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Failed to fetch device favorites', { error: error.message });
      return NextResponse.json(
        { error: 'Failed to fetch device favorites' },
        { status: 500 },
      );
    }

    // Update last_accessed_at in the background (non-blocking)
    if (data && data.length > 0) {
      supabase
        .from('device_favorites')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('device_id', deviceId)
        .then(({ error: updateError }) => {
          if (updateError) {
            log.error('Failed to update last_accessed_at', { error: updateError.message });
          }
        });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    log.error('Unexpected error in GET', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/favorites/device — add a club to device favorites
export async function POST(request: NextRequest) {
  let body: { deviceId?: unknown; clubId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { deviceId, clubId } = body;

  if (!deviceId || typeof deviceId !== 'string') {
    return NextResponse.json(
      { error: 'deviceId is required and must be a string' },
      { status: 400 },
    );
  }

  if (!isValidUuidV4(deviceId)) {
    return NextResponse.json(
      { error: 'deviceId must be a valid UUID v4' },
      { status: 400 },
    );
  }

  if (!clubId || typeof clubId !== 'string') {
    return NextResponse.json(
      { error: 'clubId is required and must be a string' },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();

    // Check current count for this device
    const { count, error: countError } = await supabase
      .from('device_favorites')
      .select('id', { count: 'exact', head: true })
      .eq('device_id', deviceId);

    if (countError) {
      log.error('Failed to count device favorites', { error: countError.message });
      return NextResponse.json(
        { error: 'Failed to validate device favorites count' },
        { status: 500 },
      );
    }

    if ((count ?? 0) >= MAX_FAVORITES_PER_DEVICE) {
      return NextResponse.json(
        {
          error: `Maximum of ${MAX_FAVORITES_PER_DEVICE} favorites per device reached`,
          code: 'MAX_FAVORITES_EXCEEDED',
        },
        { status: 422 },
      );
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('device_favorites')
      .select('id')
      .eq('device_id', deviceId)
      .eq('club_id', clubId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Club is already in device favorites' },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('device_favorites')
      .insert({
        device_id: deviceId,
        club_id: clubId,
        last_accessed_at: now,
      })
      .select()
      .single();

    if (error) {
      log.error('Failed to add device favorite', { error: error.message });
      return NextResponse.json(
        { error: 'Failed to add device favorite' },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    log.error('Unexpected error in POST', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/favorites/device — remove a club from device favorites
export async function DELETE(request: NextRequest) {
  let body: { deviceId?: unknown; clubId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { deviceId, clubId } = body;

  if (!deviceId || typeof deviceId !== 'string') {
    return NextResponse.json(
      { error: 'deviceId is required and must be a string' },
      { status: 400 },
    );
  }

  if (!isValidUuidV4(deviceId)) {
    return NextResponse.json(
      { error: 'deviceId must be a valid UUID v4' },
      { status: 400 },
    );
  }

  if (!clubId || typeof clubId !== 'string') {
    return NextResponse.json(
      { error: 'clubId is required and must be a string' },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();

    const { error, count } = await supabase
      .from('device_favorites')
      .delete({ count: 'exact' })
      .eq('device_id', deviceId)
      .eq('club_id', clubId);

    if (error) {
      log.error('Failed to delete device favorite', { error: error.message });
      return NextResponse.json(
        { error: 'Failed to remove device favorite' },
        { status: 500 },
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: 'Device favorite not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error('Unexpected error in DELETE', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
