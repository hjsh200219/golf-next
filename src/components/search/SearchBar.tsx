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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Date Selector */}
      <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
        {dates.map((date, index) => {
          const isSelected = date === selectedDate;
          return (
            <button
              key={date}
              onClick={() => selectDate(date)}
              aria-pressed={isSelected}
              className={[
                'flex flex-col items-center px-4 py-2 text-sm transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
                index > 0 ? 'border-l border-gray-200' : '',
                isSelected
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="font-semibold">{DAY_LABELS[index]}</span>
              <span className={isSelected ? 'text-green-100' : 'text-gray-400'}>
                {formatDateKorean(date)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 active:bg-green-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
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
