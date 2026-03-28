'use client';

import { create } from 'zustand';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';

export type TimeRangeKey = 'early' | 'morning' | 'afternoon' | 'evening';

export interface FilterState {
  selectedClubs: string[];
  timeRange: TimeRangeKey | null;
  priceMin: number | null;
  priceMax: number | null;
  setSelectedClubs: (clubs: string[]) => void;
  toggleClub: (clubId: string) => void;
  setTimeRange: (range: TimeRangeKey | null) => void;
  setPriceMin: (min: number | null) => void;
  setPriceMax: (max: number | null) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedClubs: [],
  timeRange: null,
  priceMin: null,
  priceMax: null,

  setSelectedClubs: (clubs) => set({ selectedClubs: clubs }),

  toggleClub: (clubId) =>
    set((state) => ({
      selectedClubs: state.selectedClubs.includes(clubId)
        ? state.selectedClubs.filter((id) => id !== clubId)
        : [...state.selectedClubs, clubId],
    })),

  setTimeRange: (range) => set({ timeRange: range }),
  setPriceMin: (min) => set({ priceMin: min }),
  setPriceMax: (max) => set({ priceMax: max }),

  resetFilters: () =>
    set({
      selectedClubs: [],
      timeRange: null,
      priceMin: null,
      priceMax: null,
    }),
}));

// --- UI Preferences (separate from filter state) ---

export type ViewMode = 'club' | 'time';

interface UIPreferencesState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const useUIPreferences = create<UIPreferencesState>((set) => ({
  viewMode: 'club',
  setViewMode: (mode) => set({ viewMode: mode }),
}));

/**
 * useFilters — convenience hook that syncs Zustand filter state
 * with URL search parameters for shareable/bookmarkable URLs.
 */
export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const store = useFilterStore();

  // Hydrate store from URL on first mount
  useEffect(() => {
    const clubs = searchParams.get('clubs');
    const timeRange = searchParams.get('timeRange') as TimeRangeKey | null;
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');

    store.setSelectedClubs(clubs ? clubs.split(',').filter(Boolean) : []);
    store.setTimeRange(timeRange ?? null);
    store.setPriceMin(priceMin ? Number(priceMin) : null);
    store.setPriceMax(priceMax ? Number(priceMax) : null);
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushParams = useCallback(
    (overrides: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(overrides)) {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const setSelectedClubs = useCallback(
    (clubs: string[]) => {
      store.setSelectedClubs(clubs);
      pushParams({ clubs: clubs.length > 0 ? clubs.join(',') : null });
    },
    [store, pushParams],
  );

  const toggleClub = useCallback(
    (clubId: string) => {
      const next = store.selectedClubs.includes(clubId)
        ? store.selectedClubs.filter((id) => id !== clubId)
        : [...store.selectedClubs, clubId];
      setSelectedClubs(next);
    },
    [store.selectedClubs, setSelectedClubs],
  );

  const setTimeRange = useCallback(
    (range: TimeRangeKey | null) => {
      store.setTimeRange(range);
      pushParams({ timeRange: range });
    },
    [store, pushParams],
  );

  const setPriceMin = useCallback(
    (min: number | null) => {
      store.setPriceMin(min);
      pushParams({ priceMin: min !== null ? String(min) : null });
    },
    [store, pushParams],
  );

  const setPriceMax = useCallback(
    (max: number | null) => {
      store.setPriceMax(max);
      pushParams({ priceMax: max !== null ? String(max) : null });
    },
    [store, pushParams],
  );

  const resetFilters = useCallback(() => {
    store.resetFilters();
    pushParams({ clubs: null, timeRange: null, priceMin: null, priceMax: null });
  }, [store, pushParams]);

  return {
    selectedClubs: store.selectedClubs,
    timeRange: store.timeRange,
    priceMin: store.priceMin,
    priceMax: store.priceMax,
    setSelectedClubs,
    toggleClub,
    setTimeRange,
    setPriceMin,
    setPriceMax,
    resetFilters,
  };
}
