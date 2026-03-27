'use client';

import { useClubs } from '@/hooks/useClubs';
import { useFilterStore } from '@/hooks/useFilters';

interface ClubFilterProps {
  /** If provided, overrides the global Zustand store (controlled mode) */
  selectedClubs?: string[];
  onChange?: (clubs: string[]) => void;
}

export default function ClubFilter({ selectedClubs, onChange }: ClubFilterProps) {
  const { data: clubs, isLoading, error } = useClubs();

  const storeSelected = useFilterStore((s) => s.selectedClubs);
  const storeToggle = useFilterStore((s) => s.toggleClub);

  const currentSelected = selectedClubs ?? storeSelected;

  const handleToggle = (clubId: string) => {
    if (onChange) {
      const next = currentSelected.includes(clubId)
        ? currentSelected.filter((id) => id !== clubId)
        : [...currentSelected, clubId];
      onChange(next);
    } else {
      storeToggle(clubId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-6 w-full animate-pulse rounded bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-500">
        골프장 목록을 불러오지 못했습니다.
      </p>
    );
  }

  if (!clubs || clubs.length === 0) {
    return <p className="text-sm text-gray-500">등록된 골프장이 없습니다.</p>;
  }

  return (
    <fieldset>
      <legend className="sr-only">골프장 선택</legend>
      <ul className="max-h-64 overflow-y-auto space-y-1 pr-1">
        {clubs.map((club) => {
          const isChecked = currentSelected.includes(club.id);
          return (
            <li key={club.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  checked={isChecked}
                  onChange={() => handleToggle(club.id)}
                />
                <span className="text-sm text-gray-700">
                  {club.display_name ?? club.name}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
