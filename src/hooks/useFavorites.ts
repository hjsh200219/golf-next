'use client';

import useSWR, { KeyedMutator } from 'swr';
import { useDeviceId } from '@/hooks/useDeviceId';

interface DeviceFavorite {
  id: number;
  device_id: string;
  club_id: string;
  created_at: string;
  last_accessed_at: string;
}

interface UseFavoritesResult {
  favoriteIds: string[];
  isLoading: boolean;
  error: Error | undefined;
  toggle: (clubId: string) => Promise<void>;
  isFavorite: (clubId: string) => boolean;
  mutate: KeyedMutator<DeviceFavorite[]>;
}

async function fetcher(url: string): Promise<DeviceFavorite[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch favorites: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function useFavorites(): UseFavoritesResult {
  const deviceId = useDeviceId();
  const key = deviceId ? `/api/favorites/device?deviceId=${deviceId}` : null;

  const { data, error, isLoading, mutate } = useSWR<DeviceFavorite[]>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    },
  );

  const favoriteIds = (data ?? []).map((f) => f.club_id);

  const isFavorite = (clubId: string): boolean => favoriteIds.includes(clubId);

  const toggle = async (clubId: string): Promise<void> => {
    if (!deviceId) return;

    const alreadyFavorited = isFavorite(clubId);

    // Optimistic update
    await mutate(
      async () => {
        if (alreadyFavorited) {
          const res = await fetch('/api/favorites/device', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, clubId }),
          });
          if (!res.ok) throw new Error('즐겨찾기 삭제에 실패했습니다.');
          return (data ?? []).filter((f) => f.club_id !== clubId);
        } else {
          const res = await fetch('/api/favorites/device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, clubId }),
          });
          if (!res.ok) throw new Error('즐겨찾기 추가에 실패했습니다.');
          const newFavorite: DeviceFavorite = await res.json();
          return [...(data ?? []), newFavorite];
        }
      },
      {
        optimisticData: alreadyFavorited
          ? (data ?? []).filter((f) => f.club_id !== clubId)
          : [
              ...(data ?? []),
              {
                id: -1,
                device_id: deviceId,
                club_id: clubId,
                created_at: new Date().toISOString(),
                last_accessed_at: new Date().toISOString(),
              },
            ],
        rollbackOnError: true,
      },
    );
  };

  return {
    favoriteIds,
    isLoading,
    error: error as Error | undefined,
    toggle,
    isFavorite,
    mutate,
  };
}
