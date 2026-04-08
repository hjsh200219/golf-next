'use client';

import useSWR, { KeyedMutator } from 'swr';
import type { Database } from '@/lib/types/database';

type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];
type GolfCourse = Database['public']['Tables']['golf_club_courses']['Row'];

export type ClubWithCourses = GolfClub & { courses: GolfCourse[] };

interface UseClubsResult {
  data: ClubWithCourses[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<ClubWithCourses[]>;
}

async function fetcher(url: string): Promise<ClubWithCourses[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch clubs: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function useClubs(): UseClubsResult {
  const { data, error, isLoading, mutate } = useSWR<ClubWithCourses[]>(
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
