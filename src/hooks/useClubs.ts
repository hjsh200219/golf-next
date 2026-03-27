'use client';

import useSWR, { KeyedMutator } from 'swr';
import type { Database } from '@/lib/types/database';

type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];

interface UseClubsResult {
  data: GolfClub[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<GolfClub[]>;
}

async function fetcher(url: string): Promise<GolfClub[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch clubs: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function useClubs(): UseClubsResult {
  const { data, error, isLoading, mutate } = useSWR<GolfClub[]>(
    '/api/clubs',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600_000, // 10 minutes
    },
  );

  return {
    data,
    isLoading,
    error: error as Error | undefined,
    mutate,
  };
}
