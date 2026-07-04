'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { TeeTime } from '@/lib/types/tee-time';
import { groupByClub, type EmptyClub } from '@/lib/utils/group';
import { formatPrice } from '@/lib/utils/price';
import { formatTime } from '@/lib/utils/time';
import { formatEventDisplay } from '@/lib/utils/event';
import { getRegionForClub } from '@/lib/constants/regions';
import { getClubReservationUrl } from '@/lib/utils/clubLink';
import { useClubs } from '@/hooks/useClubs';
import type { Database } from '@/lib/types/database';

type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];

interface ClubGroupViewProps {
  data: TeeTime[];
  emptyClubs?: EmptyClub[];
}

function pickDominantClubId(items: TeeTime[]): string | undefined {
  const counts = new Map<string, number>();
  for (const t of items) counts.set(t.club_id, (counts.get(t.club_id) ?? 0) + 1);
  let best: string | undefined;
  let max = -1;
  for (const [id, n] of counts) {
    if (n > max) { max = n; best = id; }
  }
  return best;
}

function ClubSection({
  clubName,
  items,
  club,
  dominantClubId,
}: {
  clubName: string;
  items: TeeTime[];
  club: GolfClub | undefined;
  dominantClubId: string | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const reservationUrl = getClubReservationUrl(club);

  const lowestPrice = items.reduce((min, tt) => {
    if (tt.price === null) return min;
    return min === null ? tt.price : Math.min(min, tt.price);
  }, null as number | null);

  const timeRange = items.length > 0
    ? `${formatTime(items[0].teeoff)}~${formatTime(items[items.length - 1].teeoff)}`
    : '';

  const region = dominantClubId ? getRegionForClub(dominantClubId) : null;
  const isEmpty = items.length === 0;

  return (
    <div className="rounded-xl bg-white shadow-card ring-1 ring-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex w-full items-center gap-1 pr-2 hover:bg-gray-50/80 transition-colors duration-150">
        <button
          type="button"
          onClick={() => setIsOpen((p) => !p)}
          disabled={isEmpty}
          className={`flex flex-1 items-center justify-between px-4 py-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-golf-primary/40 focus-visible:ring-inset min-h-[44px] ${isEmpty ? 'cursor-default' : 'cursor-pointer'}`}
          aria-expanded={isEmpty ? undefined : isOpen}
          aria-label={isEmpty ? `${clubName} 예약 가능 시간 없음` : `${clubName} ${items.length}건 ${isOpen ? '접기' : '펼치기'}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-nowrap overflow-hidden">
            <h2 className={`font-bold text-base truncate shrink min-w-0 ${isEmpty ? 'text-gray-400' : 'text-gray-900'}`}>{clubName}</h2>
            {region && (
              <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {region}
              </span>
            )}
            {isEmpty ? (
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-400">
                예약 가능 시간 없음
              </span>
            ) : (
              <>
                <span className="shrink-0 rounded-full bg-golf-primary px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
                  {items.length}
                </span>
                {lowestPrice !== null && (
                  <span className="shrink-0 text-golf-primary font-semibold text-xs tabular-nums">
                    {Math.floor(lowestPrice / 1000)}K
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-2">
            {!isOpen && !isEmpty && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                <span className="tabular-nums">{timeRange}</span>
              </div>
            )}
            {!isEmpty && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </button>
        {reservationUrl && (
          <a
            href={reservationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-golf-primary/10 px-2.5 py-1.5 text-xs font-semibold text-golf-primary hover:bg-golf-primary/20 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-golf-primary/40 min-h-[36px]"
            aria-label={`${clubName} 예약 페이지 새 탭에서 열기`}
          >
            <span>바로가기</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        )}
      </div>

      {isOpen && (
        <>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100/80">
            {items.map((tt, idx) => {
              const display = formatEventDisplay(tt.event, tt.price);
              const staggerDelay = idx < 10 ? `${idx * 40}ms` : undefined;
              return (
                <div
                  key={tt.id}
                  className="px-4 py-3 active:bg-gray-50 transition-colors motion-safe:animate-fade-up"
                  style={staggerDelay ? { animationDelay: staggerDelay } : undefined}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center rounded-lg bg-golf-primary/10 px-2.5 py-1 font-mono text-golf-primary font-bold tabular-nums text-[15px]">
                        {formatTime(tt.teeoff)}
                      </span>
                      {tt.course && (
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          {tt.course}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900 tabular-nums text-sm">
                      {formatPrice(tt.price)}
                    </span>
                  </div>
                  {display && (
                    <div className="mt-1.5 pl-0.5">
                      {display.type === 'discount' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 ring-1 ring-inset ring-red-200/60">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" transform="rotate(180 10 10)" /></svg>
                          할인 {display.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 ring-1 ring-inset ring-blue-200/60">
                          {display.label}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-20">시간</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">코스</th>
                  <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-28">가격</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((tt, i) => {
                  const display = formatEventDisplay(tt.event, tt.price);
                  const staggerDelay = i < 10 ? `${i * 40}ms` : undefined;
                  return (
                    <tr
                      key={tt.id}
                      className={`transition-colors duration-100 hover:bg-golf-surface-hover motion-safe:animate-fade-up ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}
                      style={staggerDelay ? { animationDelay: staggerDelay } : undefined}
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-golf-primary font-semibold tabular-nums text-[13px]">
                          {formatTime(tt.teeoff)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {tt.course ? (
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            {tt.course}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-semibold text-gray-800 tabular-nums text-[13px]">{formatPrice(tt.price)}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {display ? (
                          display.type === 'discount' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-200/60">
                              할인 {display.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 ring-1 ring-inset ring-blue-200/60">
                              {display.label}
                            </span>
                          )
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// How many club sections to render on first paint, and how many more to reveal
// each time the sentinel scrolls into view. Keeping the first paint small makes
// the club view mount fast even with 30+ clubs; the rest stream in as the user
// scrolls.
const INITIAL_VISIBLE = 10;
const STEP = 10;

type ClubEntry =
  | { kind: 'group'; clubName: string; items: TeeTime[] }
  | { kind: 'empty'; club: EmptyClub };

export default function ClubGroupView({ data, emptyClubs = [] }: ClubGroupViewProps) {
  const { data: clubs } = useClubs();

  const clubsById = useMemo(() => {
    const map = new Map<string, GolfClub>();
    for (const c of clubs ?? []) map.set(c.id, c);
    return map;
  }, [clubs]);

  // Clubs with times first, empty (no-availability) clubs last — a single
  // ordered list so lazy reveal spans both.
  const entries = useMemo<ClubEntry[]>(() => {
    const groups = groupByClub(data);
    return [
      ...[...groups.entries()].map(
        ([clubName, items]): ClubEntry => ({ kind: 'group', clubName, items }),
      ),
      ...emptyClubs.map((club): ClubEntry => ({ kind: 'empty', club })),
    ];
  }, [data, emptyClubs]);

  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const total = entries.length;
  const hasMore = visibleCount < total;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset the window whenever the underlying list changes (new date, filter,
  // refresh) so a scrolled-down state doesn't carry over to fresh results.
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [entries]);

  // Reveal the next page when the bottom sentinel enters the viewport.
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      (obsEntries) => {
        if (obsEntries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + STEP, total));
        }
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, total]);

  if (total === 0) return null;

  return (
    <div className="animate-fade-up space-y-3">
      {entries.slice(0, visibleCount).map((entry) => {
        if (entry.kind === 'empty') {
          return (
            <ClubSection
              key={`empty-${entry.club.clubId}`}
              clubName={entry.club.clubName}
              items={[]}
              club={clubsById.get(entry.club.clubId)}
              dominantClubId={entry.club.clubId}
            />
          );
        }
        const dominantClubId = pickDominantClubId(entry.items);
        return (
          <ClubSection
            key={entry.clubName}
            clubName={entry.clubName}
            items={entry.items}
            club={dominantClubId ? clubsById.get(dominantClubId) : undefined}
            dominantClubId={dominantClubId}
          />
        );
      })}
      {hasMore && <div ref={sentinelRef} aria-hidden className="h-1 w-full" />}
    </div>
  );
}
