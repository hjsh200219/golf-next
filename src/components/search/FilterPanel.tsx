'use client';

import { useState } from 'react';
import RegionFilter from '@/components/search/RegionFilter';
import ClubFilter from '@/components/search/ClubFilter';
import TimeFilter from '@/components/search/TimeFilter';
import PriceFilter from '@/components/search/PriceFilter';
import { useFilters } from '@/hooks/useFilters';
import { getClubsByRegion, type RegionKey } from '@/lib/constants/regions';
import { useCallback } from 'react';
import { useFilterStore } from '@/hooks/useFilters';

interface FilterPanelProps {
  /** Whether to show the panel initially expanded (default: true on desktop, false on mobile) */
  defaultOpen?: boolean;
}

export default function FilterPanel({ defaultOpen = false }: FilterPanelProps) {
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
          className="flex items-center gap-2 text-sm font-semibold text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
          aria-expanded={isOpen}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-green-600"
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
            <span className="ml-1 rounded-full bg-green-600 px-1.5 py-0.5 text-xs font-bold text-white">
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
