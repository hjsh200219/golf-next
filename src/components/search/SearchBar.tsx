'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { getNextNDays, formatDateKorean } from '@/lib/utils/date';

const DAY_LABELS = ['오늘', '내일', '모레'];

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const today = new Date();
  const dates = getNextNDays(3, today);
  const selectedDate = searchParams.get('date') ?? dates[0];

  const selectDate = useCallback(
    (date: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('date', date);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('date')) {
      params.set('date', dates[0]);
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams, dates]);

  return (
    <div className="animate-fade-up flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex rounded-2xl bg-white p-1 shadow-card stagger-children">
        {dates.map((date, index) => {
          const isSelected = date === selectedDate;
          return (
            <button
              key={date}
              onClick={() => selectDate(date)}
              aria-pressed={isSelected}
              className={[
                'flex flex-col items-center px-5 py-2.5 rounded-xl text-sm spring-hover',
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
      </div>

      <button
        onClick={handleSearch}
        className="flex items-center justify-center gap-2 rounded-xl bg-golf-primary px-7 py-3 text-sm font-semibold text-white shadow-btn spring-hover hover:shadow-btn-hover hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-golf-primary/40 focus-visible:ring-offset-2"
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
