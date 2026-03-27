'use client';

import SearchBar from '@/components/search/SearchBar';
import FilterPanel from '@/components/search/FilterPanel';
import TeeTimeTable from '@/components/results/TeeTimeTable';
import ResultSummary from '@/components/results/ResultSummary';
import { useTeeTimes } from '@/hooks/useTeeTimes';
import { useSearchParams } from 'next/navigation';
import { toDateString } from '@/lib/utils/date';
import { useCallback, useState } from 'react';
import { useFilterStore } from '@/hooks/useFilters';

export default function SearchSection() {
  const searchParams = useSearchParams();
  const date = searchParams.get('date') || toDateString(new Date());
  const selectedClubs = useFilterStore((s) => s.selectedClubs);
  const clubIds = selectedClubs.length > 0 ? selectedClubs : undefined;
  const { data, isLoading, isValidating, refresh } = useTeeTimes(date, clubIds);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState('');

  const teeTimes = data ?? [];
  const scrapedAt = teeTimes.length > 0 ? teeTimes[0].scraped_at : null;
  const busy = isLoading || isValidating || isScraping;

  const handleRefresh = useCallback(async () => {
    setIsScraping(true);
    const beforeCount = teeTimes.length;
    setScrapeMessage('스크래핑 요청 중...');

    try {
      const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });

      if (res.ok) {
        setScrapeMessage('골프장 데이터 수집 중... (약 15초 소요)');
        await new Promise((r) => setTimeout(r, 15000));
        setScrapeMessage('결과 불러오는 중...');
        await refresh();
        const afterCount = data?.length ?? 0;
        const diff = afterCount - beforeCount;
        if (diff > 0) {
          setScrapeMessage(`수집 완료! ${diff}건 추가됨`);
        } else {
          setScrapeMessage('수집 완료! 데이터가 갱신되었습니다');
        }
        setTimeout(() => setScrapeMessage(''), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setScrapeMessage(errData.error || '요청 실패');
        setTimeout(() => setScrapeMessage(''), 3000);
      }
    } catch {
      setScrapeMessage('요청 중 오류 발생');
      setTimeout(() => setScrapeMessage(''), 3000);
    } finally {
      setIsScraping(false);
    }
  }, [date, refresh, teeTimes.length, data]);

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
      {scrapeMessage && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm animate-fade-up ${
          isScraping ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
        }`}>
          {isScraping && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
          )}
          {!isScraping && <span>✓</span>}
          {scrapeMessage}
        </div>
      )}
      <TeeTimeTable data={teeTimes} isLoading={isLoading} />
    </div>
  );
}
