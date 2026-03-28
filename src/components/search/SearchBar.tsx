'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';
import { getNextNDays, formatDateKorean, toDateString } from '@/lib/utils/date';

const DAY_LABELS = ['내일', '모레', '글피'];

interface SearchBarProps {
  onSearch?: () => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dates = getNextNDays(3, tomorrow);
  const selectedDate = searchParams.get('date') ?? dates[0];
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isQuickDate = dates.includes(selectedDate);

  const selectDate = useCallback(
    (date: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('date', date);
      router.push(`${pathname}?${params.toString()}`);
      setShowDatePicker(false);
    },
    [router, pathname, searchParams],
  );

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('date')) {
      params.set('date', dates[0]);
    }
    router.push(`${pathname}?${params.toString()}`);
    onSearch?.();
  }, [router, pathname, searchParams, dates, onSearch]);

  return (
    <div className="animate-fade-up flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="relative flex rounded-2xl bg-white p-1 shadow-card stagger-children">
        {dates.map((date, index) => {
          const isSelected = date === selectedDate;
          return (
            <button
              key={date}
              onClick={() => selectDate(date)}
              aria-pressed={isSelected}
              className={[
                'flex flex-col items-center px-4 sm:px-5 py-2.5 rounded-xl text-sm spring-hover',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-golf-primary/40',
                isSelected
                  ? 'bg-golf-primary text-white shadow-btn'
                  : 'text-gray-600 hover:bg-golf-surface-hover active:scale-[0.98]',
              ].join(' ')}
            >
              <span className="font-semibold leading-tight">{DAY_LABELS[index]}</span>
              <span className={[
                'text-xs mt-0.5 tabular-nums',
                isSelected ? 'text-white/70' : 'text-gray-400',
              ].join(' ')}>
                {formatDateKorean(date)}
              </span>
            </button>
          );
        })}

        {/* Date picker - inside the card */}
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={[
            'flex flex-col items-center justify-center px-3 sm:px-4 py-2.5 rounded-xl text-sm spring-hover',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-golf-primary/40',
            !isQuickDate
              ? 'bg-golf-primary text-white shadow-btn'
              : 'text-gray-500 hover:bg-golf-surface-hover active:scale-[0.98]',
          ].join(' ')}
          title="날짜 직접 선택"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {!isQuickDate && (
            <span className="text-xs mt-0.5 tabular-nums">{formatDateKorean(selectedDate)}</span>
          )}
        </button>

        {showDatePicker && (
          <div className="absolute top-full left-0 z-30 mt-2 rounded-xl bg-white p-3 shadow-card-hover ring-1 ring-gray-100">
            <input
              type="date"
              value={selectedDate}
              min={toDateString(tomorrow)}
              onChange={(e) => {
                if (e.target.value) selectDate(e.target.value);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-golf-primary focus:outline-none focus:ring-1 focus:ring-golf-primary"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        className="flex items-center justify-center gap-1.5 rounded-xl bg-golf-primary px-5 py-2.5 text-sm font-semibold text-white shadow-btn spring-hover hover:shadow-btn-hover hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-golf-primary/40 focus-visible:ring-offset-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        조회
      </button>
    </div>
  );
}
