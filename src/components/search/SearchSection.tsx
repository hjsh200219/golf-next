'use client';

import SearchBar from '@/components/search/SearchBar';
import FilterPanel from '@/components/search/FilterPanel';
import TeeTimeTable from '@/components/results/TeeTimeTable';
import ResultSummary from '@/components/results/ResultSummary';
import { useTeeTimes } from '@/hooks/useTeeTimes';
import { useSearchParams } from 'next/navigation';
import { toDateString } from '@/lib/utils/date';
import { useCallback, useState } from 'react';

export default function SearchSection() {
  const searchParams = useSearchParams();
  const date = searchParams.get('date') || toDateString(new Date());
  const { data, isLoading, isValidating, refresh } = useTeeTimes(date);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState('');

  const teeTimes = data ?? [];
  const scrapedAt = teeTimes.length > 0 ? teeTimes[0].scraped_at : null;
  const busy = isLoading || isValidating || isScraping;

  const handleRefresh = useCallback(async () => {
    setIsScraping(true);
    setScrapeMessage('스크래핑 요청 중...');

    try {
      const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });

      if (res.ok) {
        setScrapeMessage('골프장 데이터 수집 중... (약 15초 소요)');
        // Wait for scrapers to finish
        await new Promise((r) => setTimeout(r, 15000));
        setScrapeMessage('결과 불러오는 중...');
        await refresh();
        setScrapeMessage('');
      } else {
        setScrapeMessage('');
        await refresh();
      }
    } catch {
      setScrapeMessage('');
      await refresh();
    } finally {
      setIsScraping(false);
    }
  }, [date, refresh]);

  return (
    <div className="space-y-4">
      <SearchBar onSearch={handleRefresh} />
      <FilterPanel />
      <div className="flex flex-wrap items-center gap-3">
        <ResultSummary count={teeTimes.length} scrapedAt={scrapedAt} isLoading={isLoading} />
        <button
          onClick={handleRefresh}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 ring-1 ring-gray-200 spring-hover hover:bg-gray-50 hover:text-gray-700 active:scale-[0.97] disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {busy ? '조회 중...' : '새로 수집'}
        </button>
      </div>
      {(isScraping || (isValidating && !isLoading)) && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 animate-fade-up">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
          {scrapeMessage || '데이터를 가져오는 중...'}
        </div>
      )}
      <TeeTimeTable data={teeTimes} isLoading={isLoading} />
    </div>
  );
}
