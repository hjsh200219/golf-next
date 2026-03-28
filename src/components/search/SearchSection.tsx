'use client';

import SearchBar from '@/components/search/SearchBar';
import FilterPanel from '@/components/search/FilterPanel';
import TeeTimeTable from '@/components/results/TeeTimeTable';
import ResultSummary from '@/components/results/ResultSummary';
import { useTeeTimes } from '@/hooks/useTeeTimes';
import { useSearchParams } from 'next/navigation';
import { toDateString } from '@/lib/utils/date';
import { useCallback, useRef, useState } from 'react';
import { useFilterStore, useUIPreferences } from '@/hooks/useFilters';
import { useFavorites } from '@/hooks/useFavorites';
import { toast } from 'sonner';

const POLL_INTERVAL = 2000;
const POLL_TIMEOUT = 30000;

export default function SearchSection() {
  const searchParams = useSearchParams();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = searchParams.get('date') || toDateString(tomorrow);
  const selectedClubs = useFilterStore((s) => s.selectedClubs);
  const { favoriteIds } = useFavorites();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { viewMode, setViewMode } = useUIPreferences();

  const effectiveClubs = favoritesOnly && favoriteIds.length > 0
    ? favoriteIds
    : selectedClubs.length > 0 ? selectedClubs : undefined;

  const { data, isLoading, isValidating, error, refresh } = useTeeTimes(date, effectiveClubs);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const teeTimes = data ?? [];
  const scrapedAt = teeTimes.length > 0 ? teeTimes[0].scraped_at : null;
  const busy = isLoading || isValidating || isScraping;

  const pollJobStatus = useCallback(async (jobId: number) => {
    const start = Date.now();
    while (Date.now() - start < POLL_TIMEOUT) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      try {
        const res = await fetch(`/api/scrape/status?jobId=${jobId}`);
        if (!res.ok) break;
        const { job, summary } = await res.json();
        setScrapeProgress(`수집 중... (${summary.completed}/${summary.total})`);
        if (job.status === 'completed' || job.status === 'failed') {
          return job.status;
        }
      } catch {
        break;
      }
    }
    return 'timeout';
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsScraping(true);
    setScrapeProgress('스크래핑 요청 중...');

    try {
      const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });

      if (res.ok) {
        const responseData = await res.json();
        const jobId = responseData.jobIds?.[0];

        if (jobId) {
          const status = await pollJobStatus(jobId);
          if (status === 'completed') {
            setScrapeProgress('결과 불러오는 중...');
            await refresh();
            toast.success('데이터가 갱신되었습니다');
          } else if (status === 'failed') {
            toast.error('일부 골프장 수집에 실패했습니다');
            await refresh();
          } else {
            setScrapeProgress('결과 불러오는 중...');
            await refresh();
            toast.info('수집 시간이 초과되었습니다. 결과를 확인해 주세요');
          }
        } else {
          // Fallback: no jobId, wait briefly and refresh
          await new Promise((r) => setTimeout(r, 5000));
          await refresh();
          toast.success('데이터가 갱신되었습니다');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || '요청에 실패했습니다');
      }
    } catch {
      toast.error('네트워크 오류가 발생했습니다');
    } finally {
      setIsScraping(false);
      setScrapeProgress('');
    }
  }, [date, refresh, pollJobStatus]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar onSearch={handleRefresh} />
        <ResultSummary count={teeTimes.length} scrapedAt={scrapedAt} isLoading={isLoading} />
        <div className="flex rounded-lg ring-1 ring-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode('club')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'club'
                ? 'bg-golf-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            골프장별
          </button>
          <button
            type="button"
            onClick={() => setViewMode('time')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'time'
                ? 'bg-golf-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            시간순
          </button>
        </div>
      </div>

      <FilterPanel
        favoritesOnly={favoritesOnly}
        onToggleFavoritesOnly={() => setFavoritesOnly((p) => !p)}
        hasFavorites={favoriteIds.length > 0}
      />

      {scrapeProgress && (
        <div className="flex items-center gap-2 rounded-xl bg-golf-surface px-4 py-3 text-sm animate-fade-up text-golf-primary ring-1 ring-golf-primary/10">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-golf-primary border-t-transparent" />
          {scrapeProgress}
        </div>
      )}

      {error ? (
        <div className="animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-red-700">데이터를 불러올 수 없습니다</p>
          <p className="mt-1 text-xs text-red-500">{error.message}</p>
          <button
            onClick={() => refresh()}
            className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-200 spring-hover"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <TeeTimeTable
          data={teeTimes}
          isLoading={isLoading}
          scrapedAt={scrapedAt}
          onRefresh={handleRefresh}
          busy={busy}
          viewMode={viewMode}
        />
      )}
    </div>
  );
}
