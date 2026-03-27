'use client';

import useSWR, { KeyedMutator } from 'swr';
import type { WeatherData } from '@/lib/types/weather';

interface UseWeatherResult {
  data: WeatherData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<WeatherData>;
}

async function fetcher(url: string): Promise<WeatherData> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch weather: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function useWeather(lat: number | null, lon: number | null): UseWeatherResult {
  const key =
    lat !== null && lon !== null ? `/api/weather?lat=${lat}&lon=${lon}` : null;

  const { data, error, isLoading, mutate } = useSWR<WeatherData>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300_000, // 5 minutes
  });

  return {
    data,
    isLoading,
    error: error as Error | undefined,
    mutate,
  };
}
