'use client';

import { useState } from 'react';
import type { TeeTime } from '@/lib/types/tee-time';
import { groupByClub } from '@/lib/utils/group';
import { formatPrice } from '@/lib/utils/price';
import { formatTime } from '@/lib/utils/time';
import { formatEventDisplay } from '@/lib/utils/event';
import { getRegionForClub } from '@/lib/constants/regions';

interface ClubGroupViewProps {
  data: TeeTime[];
}

function ClubSection({ clubName, items }: { clubName: string; items: TeeTime[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const lowestPrice = items.reduce((min, tt) => {
    if (tt.price === null) return min;
    return min === null ? tt.price : Math.min(min, tt.price);
  }, null as number | null);

  const timeRange = items.length > 0
    ? `${formatTime(items[0].teeoff)}~${formatTime(items[items.length - 1].teeoff)}`
    : '';

  const region = items.length > 0 ? getRegionForClub(items[0].club_id) : null;

  return (
    <div className="rounded-xl bg-white shadow-card ring-1 ring-gray-100 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left cursor-pointer hover:bg-gray-50/80 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-golf-primary/40 focus-visible:ring-inset min-h-[44px]"
        aria-expanded={isOpen}
        aria-label={`${clubName} ${items.length}건 ${isOpen ? '접기' : '펼치기'}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-nowrap overflow-hidden">
          <h2 className="font-bold text-gray-900 text-base truncate shrink min-w-0">{clubName}</h2>
          {region && (
            <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {region}
            </span>
          )}
          <span className="shrink-0 rounded-full bg-golf-primary px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
            {items.length}
          </span>
          {lowestPrice !== null && (
            <span className="shrink-0 text-golf-primary font-semibold text-xs tabular-nums">
              최저 {formatPrice(lowestPrice)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          {!isOpen && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
              <span className="tabular-nums">{timeRange}</span>
            </div>
          )}
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
        </div>
      </button>

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

export default function ClubGroupView({ data }: ClubGroupViewProps) {
  const groups = groupByClub(data);

  if (groups.size === 0) return null;

  return (
    <div className="animate-fade-up space-y-3">
      {[...groups.entries()].map(([clubName, items]) => (
        <ClubSection key={clubName} clubName={clubName} items={items} />
      ))}
    </div>
  );
}
