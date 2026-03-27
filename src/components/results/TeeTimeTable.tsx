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
      <span className="font-medium text-gray-900">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('date', {
    header: '날짜',
    cell: (info) => formatDateKorean(info.getValue()),
  }),
  columnHelper.accessor('teeoff', {
    header: '시간',
    cell: (info) => (
      <span className="font-mono text-green-700">{formatTime(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('course', {
    header: '코스',
    cell: (info) => info.getValue() ?? <span className="text-gray-300">-</span>,
  }),
  columnHelper.accessor('price', {
    header: '가격',
    cell: (info) => (
      <span className="font-semibold text-gray-800">{formatPrice(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('event', {
    header: '비고',
    enableSorting: false,
    cell: (info) =>
      info.getValue() ? (
        <span className="rounded bg-yellow-50 px-1.5 py-0.5 text-xs text-yellow-700">
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-3 h-10 w-10 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm font-medium text-gray-500">조회 결과가 없습니다.</p>
        <p className="mt-1 text-xs text-gray-400">날짜나 필터를 변경해 보세요.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    className={[
                      'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500',
                      canSort
                        ? 'cursor-pointer select-none hover:text-gray-700'
                        : '',
                    ].join(' ')}
                    aria-sort={
                      sortDir === 'asc'
                        ? 'ascending'
                        : sortDir === 'desc'
                          ? 'descending'
                          : 'none'
                    }
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && (
                        <span className="text-gray-400">
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
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-gray-100 last:border-b-0 hover:bg-green-50 transition-colors"
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
