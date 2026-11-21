'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import TeeTimeMap from '@/components/map/TeeTimeMap';
import BottomSheet from '@/components/map/BottomSheet';
import { formatPinPrice, type ClubSpot } from '@/lib/utils/mapPins';
import type { SheetSnap } from '@/lib/utils/sheetSnap';
import type { EmptyClub } from '@/lib/utils/group';
import { formatTime } from '@/lib/utils/time';
import { formatEventDisplay } from '@/lib/utils/event';

interface MapExplorerProps {
  spots: ClubSpot[];
  emptyClubs: EmptyClub[];
  clubUrl: (clubId: string) => string | null;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  /** Date tabs + 조회 (always visible in the sheet) */
  header: ReactNode;
  /** 건수 · 수집 시각 */
  summary: ReactNode;
  /** Filter panel, top of the sheet body */
  filters: ReactNode;
  /** 지도 / 골프장별 / 시간순 switch */
  viewSwitch?: ReactNode;
}

/**
 * Mobile 예약 조회: price pins on a map + a bottom sheet holding the date tabs,
 * filters, course list and the selected course's tee times. The list works on its
 * own, so a map failure never blocks 조회.
 */
export default function MapExplorer({
  spots, emptyClubs, clubUrl, isLoading, error, onRetry, header, summary, filters, viewSwitch,
}: MapExplorerProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [snap, setSnap] = useState<SheetSnap>('half');
  const [mapError, setMapError] = useState<string | null>(null);
  const [peekH, setPeekH] = useState(160);

  const pinned = useMemo(() => spots.filter((s) => s.lat != null && s.lon != null), [spots]);
  const selected = spots.find((s) => s.key === selectedKey) ?? null;

  const select = useCallback((key: string) => {
    setSelectedKey(key);
    setSnap((s) => (s === 'peek' ? 'half' : s));
  }, []);
  const onMapError = useCallback((m: string) => setMapError(m), []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <TeeTimeMap
        spots={pinned}
        selectedKey={selectedKey}
        onSelect={select}
        onError={onMapError}
        bottomInset={snap === 'full' ? peekH : Math.max(peekH, 0)}
      />
      <BottomSheet
        snap={snap}
        onSnapChange={setSnap}
        onPeekHeight={setPeekH}
        header={
          <div className="space-y-2.5 px-4 pb-3">
            {header}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">{summary}</div>
              {viewSwitch}
            </div>
          </div>
        }
      >
        {mapError && (
          <p role="alert" className="mx-4 mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
            지도를 불러오지 못했습니다. 아래 목록으로 조회할 수 있습니다.
          </p>
        )}
        {selected ? (
          <SpotDetail spot={selected} url={clubUrl(selected.clubId)} onBack={() => setSelectedKey(null)} />
        ) : (
          <div className="px-4 pb-6 pt-3">
            <div className="mb-3">{filters}</div>
            <SpotList
              spots={spots}
              emptyClubs={emptyClubs}
              isLoading={isLoading}
              error={error}
              onRetry={onRetry}
              onSelect={select}
            />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function SpotList({
  spots, emptyClubs, isLoading, error, onRetry, onSelect,
}: {
  spots: ClubSpot[];
  emptyClubs: EmptyClub[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onSelect: (key: string) => void;
}) {
  if (error) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-4 py-8 text-center">
        <p className="text-sm font-medium text-red-700">데이터를 불러올 수 없습니다</p>
        <p className="mt-1 text-xs text-red-500">{error.message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 min-h-[44px] rounded-lg bg-red-100 px-4 text-xs font-medium text-red-700 hover:bg-red-200"
        >
          다시 시도
        </button>
      </div>
    );
  }
  if (isLoading && spots.length === 0) {
    return (
      <div role="status" aria-label="티타임 불러오는 중" className="space-y-2">
        <span className="sr-only">불러오는 중</span>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[60px] rounded-2xl bg-gray-100 animate-shimmer" />
        ))}
      </div>
    );
  }
  if (spots.length === 0 && emptyClubs.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-500">조건에 맞는 티타임이 없습니다.</p>;
  }

  return (
    <ul aria-label="골프장 목록" className="divide-y divide-gray-100">
      {spots.map((s) => {
        const first = s.teeTimes[0];
        return (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onSelect(s.key)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-3 text-left min-h-[56px] active:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-golf-primary/40 rounded-lg"
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold text-gray-900">{s.label}</span>
                <span className="mt-0.5 block truncate text-xs text-gray-500">
                  {[s.region, `${s.count}팀`, first ? `첫 티 ${formatTime(first.teeoff)}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                  {s.lat == null && <span className="text-gray-400"> · 지도 위치 없음</span>}
                </span>
              </span>
              <span className="text-right tabular-nums">
                <span className="block text-[11px] text-gray-400">최저</span>
                <span className="block text-base font-bold text-golf-primary">
                  {formatPinPrice(s.lowestPrice) ?? '-'}
                </span>
              </span>
            </button>
          </li>
        );
      })}
      {emptyClubs.map((c) => (
        <li key={`empty-${c.clubId}`} className="flex items-center justify-between py-3 min-h-[52px]">
          <span className="truncate text-[15px] font-medium text-gray-400">{c.clubName}</span>
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-400">
            예약 가능 시간 없음
          </span>
        </li>
      ))}
    </ul>
  );
}

function SpotDetail({ spot, url, onBack }: { spot: ClubSpot; url: string | null; onBack: () => void }) {
  return (
    <section className="px-4 pb-8 pt-2" aria-labelledby="spot-title">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="목록으로 돌아가기"
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-golf-primary/40"
        >
          <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 id="spot-title" className="min-w-0 flex-1 truncate text-lg font-bold text-gray-900">{spot.label}</h2>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${spot.label} 홈페이지 새 탭에서 열기`}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-lg bg-golf-primary px-3 text-xs font-semibold text-white shadow-btn active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-golf-primary/40"
          >
            바로가기
            <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        )}
      </div>
      <p className="mt-0.5 pl-9 text-xs text-gray-500 tabular-nums">
        {[spot.region, `${spot.count}팀`, spot.lowestPrice != null ? `최저 ${formatPinPrice(spot.lowestPrice)}` : null]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <ul aria-label={`${spot.label} 티타임`} className="mt-4 grid grid-cols-3 gap-2">
        {spot.teeTimes.map((t) => {
          const ev = formatEventDisplay(t.event, t.price);
          return (
            <li
              key={t.id}
              className="rounded-xl bg-golf-surface-hover px-2 py-2 text-center ring-1 ring-inset ring-golf-primary/10"
            >
              <span className="block font-mono text-[15px] font-bold tabular-nums text-golf-primary">
                {formatTime(t.teeoff)}
              </span>
              <span className="block text-xs font-semibold tabular-nums text-gray-800">
                {formatPinPrice(t.price) ?? '가격 미표기'}
              </span>
              {t.course && <span className="mt-0.5 block truncate text-[11px] text-gray-500">{t.course}</span>}
              {ev && <span className="mt-0.5 block truncate text-[11px] text-red-600">{ev.type === 'discount' ? `할인 ${ev.label}` : ev.label}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
