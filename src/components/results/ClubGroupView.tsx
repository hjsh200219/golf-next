'use client';

import { useState } from 'react';
import type { TeeTime } from '@/lib/types/tee-time';
import { groupByClub } from '@/lib/utils/group';
import { formatPrice } from '@/lib/utils/price';
import { formatTime } from '@/lib/utils/time';
import { formatDateKorean } from '@/lib/utils/date';
import { cleanEventText } from '@/lib/utils/event';

interface ClubGroupViewProps {
  data: TeeTime[];
}

function ClubSection({ clubName, items }: { clubName: string; items: TeeTime[] }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-xl bg-white shadow-card ring-1 ring-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 spring-hover"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">{clubName}</span>
          <span className="rounded-full bg-golf-primary/10 px-2 py-0.5 text-xs font-bold text-golf-primary tabular-nums">
            {items.length}
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {items.map((tt) => {
              const cleaned = cleanEventText(tt.event);
              return (
                <div key={tt.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-golf-primary font-semibold tabular-nums text-sm">
                      {formatTime(tt.teeoff)}
                    </span>
                    <span className="font-semibold text-gray-800 tabular-nums text-sm">
                      {formatPrice(tt.price)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>{formatDateKorean(tt.date)}</span>
                    {tt.course && (
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 font-medium text-gray-600 ring-1 ring-inset ring-gray-200/60">
                        {tt.course}
                      </span>
                    )}
                    {cleaned && (
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700 ring-1 ring-inset ring-amber-200/60">
                        {cleaned}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">시간</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">날짜</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">코스</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">가격</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((tt) => {
                  const cleaned = cleanEventText(tt.event);
                  return (
                    <tr key={tt.id} className="hover:bg-golf-surface-hover spring-hover">
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-golf-primary font-semibold tabular-nums text-[13px]">
                          {formatTime(tt.teeoff)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-[13px]">{formatDateKorean(tt.date)}</td>
                      <td className="px-4 py-2.5">
                        {tt.course ? (
                          <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200/60">
                            {tt.course}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-gray-800 tabular-nums text-[13px]">{formatPrice(tt.price)}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {cleaned ? (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200/60">
                            {cleaned}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
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

  return (
    <div className="animate-fade-up space-y-3">
      {[...groups.entries()].map(([clubName, items]) => (
        <ClubSection key={clubName} clubName={clubName} items={items} />
      ))}
    </div>
  );
}
