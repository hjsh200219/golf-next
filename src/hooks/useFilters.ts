'use client';

import { create } from 'zustand';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';

export type TimeRangeKey = 'early' | 'morning' | 'afternoon' | 'evening';

/**
 * cc-level 필터 제한.
 * - 키가 없는 club_id: 클럽 단위 매칭 (해당 클럽 모든 cc 표시)
 * - 키가 있고 값 배열이 비어있지 않은 club_id: 그 cc_name만 표시 (region 필터 등)
 *
 * tee-times 서버 쿼리는 club_id 단위로만 수행하고, 클라이언트에서 이 제한을
 * 추가로 적용한다(부분집합). 이렇게 하면 onetheclub처럼 region이 cc별로
 * 다른 클럽도 region 필터링 시 정확히 부분집합만 보여줄 수 있다.
 */
export type CcRestrictions = Record<string, string[]>;

export interface FilterState {
  selectedClubs: string[];
  ccRestrictions: CcRestrictions;
  timeRange: TimeRangeKey | null;
  priceMin: number | null;
  priceMax: number | null;
  setSelectedClubs: (clubs: string[]) => void;
  toggleClub: (clubId: string) => void;
  setCcRestrictions: (restrictions: CcRestrictions) => void;
  setTimeRange: (range: TimeRangeKey | null) => void;
  setPriceMin: (min: number | null) => void;
  setPriceMax: (max: number | null) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedClubs: [],
  ccRestrictions: {},
  timeRange: null,
  priceMin: null,
  priceMax: null,

  setSelectedClubs: (clubs) => set({ selectedClubs: clubs }),

  toggleClub: (clubId) =>
    set((state) => {
      // 클럽 직접 토글은 cc 제한을 해제(전체 cc 매칭으로 복귀)
      const nextRestrictions = { ...state.ccRestrictions };
      delete nextRestrictions[clubId];
      return {
        selectedClubs: state.selectedClubs.includes(clubId)
          ? state.selectedClubs.filter((id) => id !== clubId)
          : [...state.selectedClubs, clubId],
        ccRestrictions: nextRestrictions,
      };
    }),

  setCcRestrictions: (restrictions) => set({ ccRestrictions: restrictions }),

  setTimeRange: (range) => set({ timeRange: range }),
  setPriceMin: (min) => set({ priceMin: min }),
  setPriceMax: (max) => set({ priceMax: max }),

  resetFilters: () =>
    set({
      selectedClubs: [],
      ccRestrictions: {},
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
      // store.toggleClub을 위임 호출해 ccRestrictions 정리 로직과 일관성 유지
      store.toggleClub(clubId);
      const next = store.selectedClubs.includes(clubId)
        ? store.selectedClubs.filter((id) => id !== clubId)
        : [...store.selectedClubs, clubId];
      pushParams({ clubs: next.length > 0 ? next.join(',') : null });
    },
    [store, pushParams],
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
