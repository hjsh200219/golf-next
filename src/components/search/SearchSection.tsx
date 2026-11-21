'use client';

import SearchBar from '@/components/search/SearchBar';
import FilterPanel from '@/components/search/FilterPanel';
import TeeTimeTable from '@/components/results/TeeTimeTable';
import ResultSummary from '@/components/results/ResultSummary';
import { filterByCcRestrictions } from '@/lib/utils/ccFilter';
import { useTeeTimes } from '@/hooks/useTeeTimes';
import { useSearchParams } from 'next/navigation';
import { toDateString } from '@/lib/utils/date';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFilterStore, useUIPreferences, type ViewMode } from '@/hooks/useFilters';
import MapExplorer from '@/components/map/MapExplorer';
import { buildClubSpots } from '@/lib/utils/mapPins';
import { getClubHomepageUrl } from '@/lib/utils/clubLink';
import { useMediaQuery, useMobileNavHeight } from '@/hooks/useMediaQuery';
import { useFavorites } from '@/hooks/useFavorites';
import { useClubs } from '@/hooks/useClubs';
import { getEmptyClubs } from '@/lib/utils/group';
import { toast } from 'sonner';

const POLL_INTERVAL = 2000;
const POLL_TIMEOUT = 30000;

export default function SearchSection() {
  const searchParams = useSearchParams();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = searchParams.get('date') || toDateString(tomorrow);
  const selectedClubs = useFilterStore((s) => s.selectedClubs);
  const ccRestrictions = useFilterStore((s) => s.ccRestrictions);
  const { favoriteIds } = useFavorites();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { viewMode: preferredView, setViewMode } = useUIPreferences();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const navHeight = useMobileNavHeight();
  // 지도 보기는 모든 너비에서 기본이다. md 이상(펼친 폴더블·태블릿·데스크톱)은 왼쪽 패널 + 지도(split),
  // 모바일은 바텀시트. isDesktop 이 null(서버 렌더·하이드레이션)이면 지도 틀만 그리고 구글 지도는 올리지 않는다.
  const viewMode: ViewMode = preferredView;
  const mapMode = viewMode === 'map';
  const mapLive = mapMode && isDesktop !== null;

  const effectiveClubs = favoritesOnly && favoriteIds.length > 0
    ? favoriteIds
    : selectedClubs.length > 0 ? selectedClubs : undefined;

  const { data, isLoading, isValidating, error, refresh } = useTeeTimes(date, effectiveClubs);
  const { data: allClubs } = useClubs();
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState('');

  // cc-level 추가 필터링: ccRestrictions에 키가 있는 클럽만 부분집합으로 제한
  // 즐겨찾기 모드일 때는 region 기반 cc 제한을 적용하지 않는다.
  const teeTimes = useMemo(() => {
    const all = data ?? [];
    if (favoritesOnly) return all;
    return filterByCcRestrictions(all, ccRestrictions, allClubs ?? []);
  }, [data, ccRestrictions, favoritesOnly, allClubs]);
  // 화면에 표시하는 "수집 시각"은 행 하나의 값(teeTimes[0])이 아닌 전체 중 최신 시각.
  // 특정 클럽 스크레이퍼가 오래전에 멈춰 있어도 다른 클럽의 최근 수집 기록이 반영된다.
  const scrapedAt = useMemo(() => {
    let latest: string | null = null;
    for (const t of teeTimes) {
      const s = t.scraped_at;
      if (!s) continue;
      if (latest === null || s > latest) latest = s;
    }
    return latest;
  }, [teeTimes]);

  // tee-off 없는 클럽도 "예약 가능 시간 없음"으로 표시하기 위해, 현재 필터가
  // 기대하는 클럽 집합(effectiveClubs, 없으면 활성 클럽 전체)에서 결과에
  // 한 건도 없는 클럽을 골라낸다. 골프장별 뷰에서만 사용된다.
  const emptyClubs = useMemo(() => {
    const activeClubs = (allClubs ?? []).filter((c) => c.is_active);
    const nameById: Record<string, string> = {};
    for (const c of activeClubs) nameById[c.id] = c.name;
    const activeIds = activeClubs.map((c) => c.id);
    const expected = effectiveClubs
      ? effectiveClubs.filter((id) => nameById[id] !== undefined)
      : activeIds;
    return getEmptyClubs(teeTimes, expected, nameById);
  }, [allClubs, effectiveClubs, teeTimes]);
  const busy = isLoading || isValidating || isScraping;
  const spots = useMemo(
    () => (mapMode ? buildClubSpots(teeTimes, allClubs ?? []) : []),
    [mapMode, teeTimes, allClubs],
  );
  const clubUrl = useCallback(
    (clubId: string) => getClubHomepageUrl((allClubs ?? []).find((c) => c.id === clubId)),
    [allClubs],
  );

  // 지도 보기에서는 페이지가 스크롤되지 않게 한다 (지도·시트가 화면을 채움)
  useEffect(() => {
    if (!mapLive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mapLive]);


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

  if (mapMode) {
    return (
      <div
        className="fixed inset-x-0 top-14 z-30"
        style={{ bottom: isDesktop ? 0 : navHeight }}
      >
        <MapExplorer
          layout={isDesktop ? 'split' : 'sheet'}
          mapEnabled={mapLive}
          spots={spots}
          emptyClubs={emptyClubs}
          clubUrl={clubUrl}
          isLoading={isLoading}
          error={error ?? null}
          onRetry={() => refresh()}
          header={<SearchBar compact onSearch={handleRefresh} />}
          summary={
            <div className="flex items-center gap-2">
              <ResultSummary compact count={teeTimes.length} scrapedAt={scrapedAt} isLoading={isLoading} />
              {scrapeProgress && <span className="text-xs text-golf-primary">{scrapeProgress}</span>}
            </div>
          }
          filters={
            <FilterPanel
              favoritesOnly={favoritesOnly}
              onToggleFavoritesOnly={() => setFavoritesOnly((p) => !p)}
              hasFavorites={favoriteIds.length > 0}
            />
          }
          viewSwitch={<ViewSwitch value={viewMode} onChange={setViewMode} size="sm" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SearchBar onSearch={handleRefresh} />

      <div className="flex">
        <ViewSwitch value={viewMode} onChange={setViewMode} />
      </div>

      {/* 건수 · 수집 시각 · 필터를 한 줄에 둔다. 필터 본문은 줄바꿈되어 아래 전체 너비로 펼쳐진다 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ResultSummary count={teeTimes.length} scrapedAt={scrapedAt} isLoading={isLoading} />
        <FilterPanel
          favoritesOnly={favoritesOnly}
          onToggleFavoritesOnly={() => setFavoritesOnly((p) => !p)}
          hasFavorites={favoriteIds.length > 0}
        />
      </div>

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
          emptyClubs={viewMode === 'club' ? emptyClubs : []}
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

const VIEW_LABEL: Record<ViewMode, string> = { map: '지도', club: '골프장별', time: '시간순' };

function ViewSwitch({
  value, onChange, size = 'md',
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  size?: 'sm' | 'md';
}) {
  const modes: ViewMode[] = ['map', 'club', 'time'];
  return (
    <div className="flex shrink-0 overflow-hidden rounded-lg ring-1 ring-gray-200" role="group" aria-label="보기 방식">
      {modes.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={value === m}
          onClick={() => onChange(m)}
          className={[
            'font-medium transition-colors min-h-[44px]',
            size === 'sm' ? 'px-3 text-xs' : 'px-4 py-2 text-sm',
            value === m ? 'bg-golf-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          {VIEW_LABEL[m]}
        </button>
      ))}
    </div>
  );
}
