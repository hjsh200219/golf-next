import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { toGeohash } from '@/lib/utils/geohash';
import type { Database } from '@/lib/types/database';
import { createLogger } from '@/lib/logger';

const log = createLogger('weather');

const CACHE_TTL_MINUTES = 30;

interface OpenWeatherCurrentResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: {
    dt: number;
    sunrise: number;
    sunset: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    rain?: { '1h': number };
    snow?: { '1h': number };
  };
  minutely?: unknown[];
  hourly?: unknown[];
  daily?: unknown[];
  alerts?: unknown[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');

  if (!latParam || !lonParam) {
    return NextResponse.json(
      { error: 'lat and lon query parameters are required' },
      { status: 400 },
    );
  }

  const lat = Number(latParam);
  const lon = Number(lonParam);

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: 'lat and lon must be valid numbers' },
      { status: 400 },
    );
  }

  if (lat < -90 || lat > 90) {
    return NextResponse.json(
      { error: 'lat must be between -90 and 90' },
      { status: 400 },
    );
  }

  if (lon < -180 || lon > 180) {
    return NextResponse.json(
      { error: 'lon must be between -180 and 180' },
      { status: 400 },
    );
  }

  const geohash = toGeohash(lat, lon);
  const now = new Date().toISOString();

  try {

    const supabase = createAdminClient();

    // Check weather cache
    const { data: cached, error: cacheError } = await supabase
      .from('weather_cache')
      .select('*')
      .eq('geohash', geohash)
      .eq('data_type', 'current')
      .gt('expires_at', now)
      .order('cached_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cacheError) {
      log.error('Cache lookup error', { error: cacheError.message });
      // Non-fatal — proceed to fetch from API
    }

    if (cached) {
      return NextResponse.json({
        source: 'cache',
        geohash,
        cached_at: cached.cached_at,
        expires_at: cached.expires_at,
        data: cached.data,
      });
    }

    // Cache miss — fetch from OpenWeatherMap One Call API 3.0
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Weather API key is not configured' },
        { status: 503 },
      );
    }

    const owmUrl =
      `https://api.openweathermap.org/data/3.0/onecall` +
      `?lat=${lat}&lon=${lon}` +
      `&exclude=minutely,alerts` +
      `&appid=${apiKey}` +
      `&units=metric` +
      `&lang=kr`;

    const owmResponse = await fetch(owmUrl, {
      next: { revalidate: 0 },
    });

    if (!owmResponse.ok) {
      const errorText = await owmResponse.text().catch(() => '');
      log.error(`OpenWeatherMap API error ${owmResponse.status}`, { error: errorText });
      return NextResponse.json(
        { error: `Weather API returned ${owmResponse.status}` },
        { status: 502 },
      );
    }

    const weatherData: OpenWeatherCurrentResponse = await owmResponse.json();

    // Store in cache with 30-minute expiry
    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from('weather_cache').insert({
      geohash,
      lat,
      lon,
      data_type: 'current',
      data: weatherData as unknown as Database['public']['Tables']['weather_cache']['Insert']['data'],
      expires_at: expiresAt,
    });

    if (insertError) {
      log.error('Failed to cache weather data', { error: insertError.message });
      // Non-fatal — return the data anyway
    }

    return NextResponse.json({
      source: 'api',
      geohash,
      cached_at: now,
      expires_at: expiresAt,
      data: weatherData,
    });
  } catch (err) {
    log.error('Unexpected error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
