'use client';

import { useClubs } from '@/hooks/useClubs';
import {
  REGIONS,
  REGION_KEYS,
  getClubsByRegionFromCourses,
  type RegionKey,
} from '@/lib/constants/regions';

interface RegionFilterProps {
  selectedClubs: string[];
  onToggleRegion: (region: RegionKey) => void;
}

export default function RegionFilter({ selectedClubs, onToggleRegion }: RegionFilterProps) {
  const { data: clubs } = useClubs();
  const selectedSet = new Set(selectedClubs);

  return (
    <div className="flex flex-wrap gap-2">
      {REGION_KEYS.map((key) => {
        const regionClubs = getClubsByRegionFromCourses([key], clubs ?? []);
        const allSelected = regionClubs.length > 0 && regionClubs.every((id) => selectedSet.has(id));
        const someSelected = !allSelected && regionClubs.some((id) => selectedSet.has(id));

        return (
          <button
            key={key}
            onClick={() => onToggleRegion(key)}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-medium spring-hover active:scale-[0.97]',
              'ring-1 ring-inset transition-colors',
              allSelected
                ? 'bg-golf-primary text-white ring-golf-primary'
                : someSelected
                  ? 'bg-green-50 text-golf-primary ring-golf-primary/40'
                  : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50',
            ].join(' ')}
          >
            {REGIONS[key].label}
            <span className={`ml-1 text-[10px] ${allSelected ? 'text-white/70' : 'text-gray-400'}`}>
              {regionClubs.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
