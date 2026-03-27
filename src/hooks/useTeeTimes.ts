'use client';

import useSWR from 'swr';
import type { TeeTime } from '@/lib/types/tee-time';

async function fetcher(url: string): Promise<TeeTime[]> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch tee times: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function useTeeTimes(date: string | null) {
  const key = date ? `/api/tee-times?date=${date}` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<TeeTime[]>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5_000,
  });

  const refresh = async () => {
    await mutate(undefined, { revalidate: true });
  };

  return {
    data,
    isLoading,
    isValidating,
    error: error as Error | undefined,
    mutate,
    refresh,
  };
}
