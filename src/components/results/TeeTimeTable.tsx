'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import type { TeeTime } from '@/lib/types/tee-time';
import { formatPrice } from '@/lib/utils/price';
import { formatTime, getTimeBand, TIME_BANDS } from '@/lib/utils/time';
import { formatDateKorean } from '@/lib/utils/date';
import { formatEventDisplay } from '@/lib/utils/event';
import LoadingState from '@/components/results/LoadingState';
import ClubGroupView from '@/components/results/ClubGroupView';
import type { EmptyClub } from '@/lib/utils/group';
import type { ViewMode } from '@/hooks/useFilters';

interface TeeTimeTableProps {
  data?: TeeTime[];
  emptyClubs?: EmptyClub[];
  isLoading?: boolean;
  scrapedAt?: string | null;
  onRefresh?: () => void;
  busy?: boolean;
  viewMode?: ViewMode;
}

const columnHelper = createColumnHelper<TeeTime>();

const columns = [
  columnHelper.accessor('cc_name', {
    header: '골프장',
    cell: (info) => (
      <span className="font-semibold text-gray-900 text-[13px]">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('teeoff', {
    header: '시간',
    cell: (info) => (
      <span className="inline-flex items-center justify-center rounded-md bg-golf-primary/10 px-2 py-0.5 font-mono text-golf-primary font-bold tabular-nums text-[13px]">
        {formatTime(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('course', {
    header: '코스',
    cell: (info) => info.getValue() ? (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        {info.getValue()}
      </span>
    ) : (
      <span className="text-gray-300">-</span>
    ),
  }),
  columnHelper.accessor('price', {
    header: () => <span className="block text-right">가격</span>,
    cell: (info) => (
      <span className="block text-right font-bold text-gray-900 tabular-nums text-[13px]">
        {formatPrice(info.getValue())}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'event_display',
    header: '비고',
    cell: ({ row }) => {
      const display = formatEventDisplay(row.original.event, row.original.price);
      if (!display) return null;
      return display.type === 'discount' ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200/60">
          할인 {display.label}
        </span>
      ) : (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 ring-1 ring-inset ring-blue-200/60">
          {display.label}
        </span>
      );
    },
  }),
];

const PAGE_SIZE = 50;

export default function TeeTimeTable({ data, emptyClubs = [], isLoading = false, scrapedAt, onRefresh, busy = false, viewMode = 'time' }: TeeTimeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'teeoff', desc: false },
  ]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return <LoadingState />;
  }

  // Club view: render even when there are no tee-times, as long as the active
  // filter expects clubs to show (they appear as "예약 가능 시간 없음").
  if (viewMode === 'club' && ((data && data.length > 0) || emptyClubs.length > 0)) {
    return <ClubGroupView data={data ?? []} emptyClubs={emptyClubs} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-500">조회 결과가 없습니다</p>
        <p className="mt-1.5 text-xs text-gray-400">날짜나 필터를 변경하거나, 새로고침을 눌러 보세요</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={busy}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-golf-primary/10 px-4 py-2 text-xs font-medium text-golf-primary cursor-pointer hover:bg-golf-primary/20 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {busy ? '수집 중...' : '새로고침'}
          </button>
        )}
      </div>
    );
  }


  const allRows = table.getRowModel().rows;
  const visibleRows = allRows.slice(0, visibleCount);
  const hasMore = allRows.length > visibleCount;

  // Group visible rows by time band
  const bandGroups = TIME_BANDS.map((band) => {
    const rows = visibleRows.filter((row) => getTimeBand(row.original.teeoff) === band.key);
    // Count total (not just visible) for the band label
    const totalCount = allRows.filter((row) => getTimeBand(row.original.teeoff) === band.key).length;
    return { ...band, rows, totalCount };
  }).filter((g) => g.totalCount > 0);

  return (
    <>
    {bandGroups.map((band) => (
      <div key={band.key} className="animate-fade-up">
        {/* Band header */}
        <h2 className="sticky top-14 z-10 flex items-center gap-2 bg-golf-bg/95 backdrop-blur-sm px-1 py-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          <span>{band.label}</span>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-600 tabular-nums">
            {band.totalCount}건
          </span>
        </h2>

        {band.rows.length > 0 ? (
          <>
          {/* Mobile card view */}
          <div className="md:hidden space-y-2">
            {band.rows.map((row, idx) => {
              const r = row.original;
              const display = formatEventDisplay(r.event, r.price);
              const staggerDelay = idx < 10 ? `${idx * 40}ms` : undefined;
              return (
                <div
                  key={row.id}
                  className="rounded-xl bg-white p-3.5 shadow-card ring-1 ring-gray-100 active:bg-gray-50 transition-colors motion-safe:animate-fade-up"
                  style={staggerDelay ? { animationDelay: staggerDelay } : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="inline-flex items-center justify-center rounded-lg bg-golf-primary/10 px-2.5 py-1 font-mono text-golf-primary font-bold tabular-nums text-[15px] shrink-0">
                        {formatTime(r.teeoff)}
                      </span>
                      <span className="font-semibold text-gray-900 text-sm leading-tight truncate">{r.cc_name}</span>
                    </div>
                    <span className="font-bold text-gray-900 tabular-nums text-base shrink-0">
                      {formatPrice(r.price)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 pl-0.5">
                    {r.course && (
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">
                        {r.course}
                      </span>
                    )}
                    <span>{formatDateKorean(r.date)}</span>
                    {display && (
                      display.type === 'discount' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 font-semibold text-red-700 ring-1 ring-inset ring-red-200/60">
                          할인 {display.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 font-medium text-blue-600 ring-1 ring-inset ring-blue-200/60">
                          {display.label}
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-gray-100 bg-gray-50/40">
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const sortDir = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          className={[
                            'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400',
                            canSort ? 'cursor-pointer select-none hover:text-gray-600 transition-colors duration-150' : '',
                          ].join(' ')}
                          aria-sort={
                            sortDir === 'asc' ? 'ascending'
                              : sortDir === 'desc' ? 'descending'
                                : 'none'
                          }
                        >
                          <span className="flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && (
                              <span className={sortDir ? 'text-golf-primary' : 'text-gray-300'}>
                                {sortDir === 'asc' ? '↑' : sortDir === 'desc' ? '↓' : '↕'}
                              </span>
                            )}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-50">
                {band.rows.map((row, i) => {
                  const staggerDelay = i < 10 ? `${i * 40}ms` : undefined;
                  return (
                  <tr
                    key={row.id}
                    className={`transition-colors duration-100 hover:bg-golf-surface-hover motion-safe:animate-fade-up ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}
                    style={staggerDelay ? { animationDelay: staggerDelay } : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-gray-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <p className="py-4 text-center text-xs text-gray-400">더 보기를 눌러 확인하세요</p>
        )}
      </div>
    ))}

    {/* Load more */}
    {hasMore && (
      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="rounded-xl bg-golf-primary/10 px-6 py-3 text-sm font-medium text-golf-primary hover:bg-golf-primary/20 transition-colors min-h-[44px]"
        >
          더 보기 ({visibleCount}/{allRows.length}건)
        </button>
      </div>
    )}
    </>
  );
}
