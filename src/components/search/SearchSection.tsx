'use client';

import SearchBar from '@/components/search/SearchBar';
import FilterPanel from '@/components/search/FilterPanel';
import TeeTimeTable from '@/components/results/TeeTimeTable';
import ResultSummary from '@/components/results/ResultSummary';
import { useTeeTimes } from '@/hooks/useTeeTimes';
import { useSearchParams } from 'next/navigation';
import { toDateString } from '@/lib/utils/date';
import { useState } from 'react';

export default function SearchSection() {
  const searchParams = useSearchParams();
  const date = searchParams.get('date') || toDateString(new Date());
  const { data, isLoading, mutate } = useTeeTimes(date);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const teeTimes = data ?? [];
  const scrapedAt = teeTimes.length > 0 ? teeTimes[0].scraped_at : null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-4">
      <SearchBar />
      <FilterPanel />
      <div className="flex flex-wrap items-center gap-3">
        <ResultSummary count={teeTimes.length} scrapedAt={scrapedAt} isLoading={isLoading} />
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 ring-1 ring-gray-200 spring-hover hover:bg-gray-50 hover:text-gray-700 active:scale-[0.97] disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          다시 조회
        </button>
      </div>
      <TeeTimeTable data={teeTimes} isLoading={isLoading} />
    </div>
  );
}
