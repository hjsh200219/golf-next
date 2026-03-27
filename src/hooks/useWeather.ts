'use client';

import useSWR, { KeyedMutator } from 'swr';
import type { WeatherData } from '@/lib/types/weather';

interface WeatherApiResponse {
  source: string;
  geohash: string;
  cached_at: string;
  expires_at: string;
  data: WeatherData;
}

interface UseWeatherResult {
  data: WeatherData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<WeatherApiResponse>;
}

async function fetcher(url: string): Promise<WeatherApiResponse> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch weather: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function useWeather(lat: number | null, lon: number | null): UseWeatherResult {
  const key =
    lat !== null && lon !== null ? `/api/weather?lat=${lat}&lon=${lon}` : null;

  const { data: response, error, isLoading, mutate } = useSWR<WeatherApiResponse>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300_000,
  });

  return {
    data: response?.data,
    isLoading,
    error: error as Error | undefined,
    mutate,
  };
}
