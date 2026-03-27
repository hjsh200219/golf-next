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
import LoadingState from '@/components/results/LoadingState';

interface TeeTimeTableProps {
  data?: TeeTime[];
  isLoading?: boolean;
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
    cell: (info) =>
      info.getValue() ? (
        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200/60">
          {info.getValue()}
        </span>
      ) : (
        <span className="text-gray-300">-</span>
      ),
  }),
];

export default function TeeTimeTable({ data, isLoading = false }: TeeTimeTableProps) {
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
        <p className="mt-1.5 text-xs text-gray-400">날짜나 필터를 변경해 보세요</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
      <table className="w-full min-w-[640px] text-sm">
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
  );
}
