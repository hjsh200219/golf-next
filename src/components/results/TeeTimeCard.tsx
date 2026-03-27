import type { TeeTime } from '@/lib/types/tee-time';
import { formatPrice } from '@/lib/utils/price';
import { formatTime } from '@/lib/utils/time';
import { formatDateKorean } from '@/lib/utils/date';

interface TeeTimeCardProps {
  teeTime: TeeTime;
}

export default function TeeTimeCard({ teeTime }: TeeTimeCardProps) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-semibold text-gray-900">{teeTime.cc_name}</p>
          {teeTime.course && (
            <p className="mt-0.5 text-sm text-gray-500">{teeTime.course}</p>
          )}
        </div>
        <span className="ml-2 whitespace-nowrap rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
          {formatPrice(teeTime.price)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {formatDateKorean(teeTime.date)}
        </span>
        <span className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {formatTime(teeTime.teeoff)}
        </span>
      </div>

      {teeTime.event && (
        <p className="mt-2 rounded bg-yellow-50 px-2 py-1 text-xs text-yellow-700">
          {teeTime.event}
        </p>
      )}
    </article>
  );
}
