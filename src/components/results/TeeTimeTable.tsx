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
import { formatTime } from '@/lib/utils/time';
import { formatDateKorean } from '@/lib/utils/date';
import { cleanEventText } from '@/lib/utils/event';
import LoadingState from '@/components/results/LoadingState';
import ClubGroupView from '@/components/results/ClubGroupView';
import type { ViewMode } from '@/hooks/useFilters';

interface TeeTimeTableProps {
  data?: TeeTime[];
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
  columnHelper.accessor('date', {
    header: '날짜',
    cell: (info) => (
      <span className="text-gray-500 text-[13px]">{formatDateKorean(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('teeoff', {
    header: '시간',
    cell: (info) => (
      <span className="font-mono text-golf-primary font-semibold tabular-nums text-[13px]">
        {formatTime(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('course', {
    header: '코스',
    cell: (info) => info.getValue() ? (
      <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200/60">
        {info.getValue()}
      </span>
    ) : (
      <span className="text-gray-300">-</span>
    ),
  }),
  columnHelper.accessor('price', {
    header: '가격',
    cell: (info) => (
      <span className="font-semibold text-gray-800 tabular-nums text-[13px]">
        {formatPrice(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('event', {
    header: '비고',
    enableSorting: false,
    cell: (info) => {
      const cleaned = cleanEventText(info.getValue());
      return cleaned ? (
        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200/60">
          {cleaned}
        </span>
      ) : (
        <span className="text-gray-300">-</span>
      );
    },
  }),
];

export default function TeeTimeTable({ data, isLoading = false, scrapedAt, onRefresh, busy = false, viewMode = 'time' }: TeeTimeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'teeoff', desc: false },
  ]);

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
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-golf-primary/10 px-4 py-2 text-xs font-medium text-golf-primary hover:bg-golf-primary/20 spring-hover disabled:opacity-50"
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

  if (viewMode === 'club') {
    return <ClubGroupView data={data ?? []} />;
  }

  return (
    <>
    {/* Mobile card view */}
    <div className="animate-fade-up md:hidden space-y-2">
      {table.getRowModel().rows.map((row) => {
        const r = row.original;
        const cleaned = cleanEventText(r.event);
        return (
          <div key={row.id} className="rounded-xl bg-white p-3.5 shadow-card ring-1 ring-gray-100">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-gray-900 text-sm leading-tight">{r.cc_name}</span>
              <span className="font-mono text-golf-primary font-semibold tabular-nums text-sm shrink-0">
                {formatTime(r.teeoff)}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {r.course && (
                <span className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 font-medium text-gray-600 ring-1 ring-inset ring-gray-200/60">
                  {r.course}
                </span>
              )}
              <span className="font-semibold text-gray-800 tabular-nums">{formatPrice(r.price)}</span>
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

    {/* Desktop table view */}
    <div className="animate-fade-up hidden md:block overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-gray-100">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    className={[
                      'px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400',
                      canSort ? 'cursor-pointer select-none hover:text-gray-600 spring-hover' : '',
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
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              className="spring-hover hover:bg-golf-surface-hover"
              style={{ animationDelay: `${Math.min(i, 10) * 20}ms` }}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-gray-700">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
