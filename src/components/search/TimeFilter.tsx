'use client';

import { TIME_RANGES } from '@/lib/utils/time';
import type { TimeRangeKey } from '@/hooks/useFilters';
import { useFilterStore } from '@/hooks/useFilters';

interface TimeFilterProps {
  /** Controlled value — if omitted, reads from Zustand store */
  value?: TimeRangeKey | null;
  onChange?: (range: TimeRangeKey | null) => void;
}

const TIME_RANGE_KEYS = Object.keys(TIME_RANGES) as TimeRangeKey[];

export default function TimeFilter({ value, onChange }: TimeFilterProps) {
  const storeValue = useFilterStore((s) => s.timeRange);
  const storeSet = useFilterStore((s) => s.setTimeRange);

  const current = value !== undefined ? value : storeValue;

  const handleClick = (key: TimeRangeKey) => {
    const next = current === key ? null : key;
    if (onChange) {
      onChange(next);
    } else {
      storeSet(next);
    }
  };

  return (
    <fieldset>
      <legend className="sr-only">시간대 선택</legend>
      <div className="flex flex-wrap gap-2">
        {TIME_RANGE_KEYS.map((key) => {
          const range = TIME_RANGES[key];
          const isActive = current === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleClick(key)}
              aria-pressed={isActive}
              className={[
                'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
                isActive
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-green-400 hover:text-green-700',
              ].join(' ')}
            >
              <span>{range.label}</span>
              <span className="ml-1 text-xs opacity-75">
                {range.from}~{range.to}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
