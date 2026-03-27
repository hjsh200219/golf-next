'use client';

import useSWR, { KeyedMutator } from 'swr';
import type { TeeTime } from '@/lib/types/tee-time';

interface UseTeeTimesResult {
  data: TeeTime[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<TeeTime[]>;
}

async function fetcher(url: string): Promise<TeeTime[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch tee times: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function useTeeTimes(date: string | null): UseTeeTimesResult {
  const key = date ? `/api/tee-times?date=${date}` : null;

  const { data, error, isLoading, mutate } = useSWR<TeeTime[]>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  return {
    data,
    isLoading,
    error: error as Error | undefined,
    mutate,
  };
}
