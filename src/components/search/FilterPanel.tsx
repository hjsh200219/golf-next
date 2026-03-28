'use client';

import { useState, useCallback } from 'react';
import RegionFilter from '@/components/search/RegionFilter';
import ClubFilter from '@/components/search/ClubFilter';
import TimeFilter from '@/components/search/TimeFilter';
import PriceFilter from '@/components/search/PriceFilter';
import { useFilters, useFilterStore } from '@/hooks/useFilters';
import { getClubsByRegion, type RegionKey } from '@/lib/constants/regions';

interface FilterPanelProps {
  /** Whether to show the panel initially expanded (default: true on desktop, false on mobile) */
  defaultOpen?: boolean;
  favoritesOnly?: boolean;
  onToggleFavoritesOnly?: () => void;
  hasFavorites?: boolean;
}

export default function FilterPanel({ defaultOpen = false, favoritesOnly = false, onToggleFavoritesOnly, hasFavorites = false }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { resetFilters, selectedClubs, timeRange, priceMin, priceMax } = useFilters();
  const store = useFilterStore();

  const handleToggleRegion = useCallback((region: RegionKey) => {
    const regionClubs = getClubsByRegion([region]);
    const currentSet = new Set(store.selectedClubs);
    const allSelected = regionClubs.every((id) => currentSet.has(id));

    if (allSelected) {
      // Deselect all clubs in this region
      const next = store.selectedClubs.filter((id) => !regionClubs.includes(id));
      store.setSelectedClubs(next);
    } else {
      // Select all clubs in this region (union with current)
      const next = [...new Set([...store.selectedClubs, ...regionClubs])];
      store.setSelectedClubs(next);
    }
  }, [store]);

  const activeFilterCount =
    selectedClubs.length +
    (timeRange ? 1 : 0) +
    (priceMin !== null ? 1 : 0) +
    (priceMax !== null ? 1 : 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header — always visible */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-golf-primary/40 rounded"
          aria-expanded={isOpen}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-golf-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 .7 1.71L14 11.41V19a1 1 0 0 1-1.45.89l-4-2A1 1 0 0 1 8 17v-5.59L3.3 4.71A1 1 0 0 1 3 4z"
            />
          </svg>
          필터
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-golf-primary px-1.5 py-0.5 text-xs font-bold text-white">
              {activeFilterCount}
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`ml-1 h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          {hasFavorites && onToggleFavoritesOnly && (
            <button
              type="button"
              onClick={onToggleFavoritesOnly}
              className={[
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium spring-hover',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-golf-primary/40',
                favoritesOnly
                  ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200'
                  : 'text-gray-500 hover:bg-gray-50',
              ].join(' ')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={favoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              즐겨찾기만
            </button>
          )}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* Collapsible body */}
      {isOpen && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-5">
          {/* Region filter */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              지역
            </h3>
            <RegionFilter
              selectedClubs={store.selectedClubs}
              onToggleRegion={handleToggleRegion}
            />
          </section>

          {/* Club filter */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              골프장
            </h3>
            <ClubFilter />
          </section>

          {/* Time filter */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              시간대
            </h3>
            <TimeFilter />
          </section>

          {/* Price filter */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              가격
            </h3>
            <PriceFilter />
          </section>
        </div>
      )}
    </div>
  );
}
