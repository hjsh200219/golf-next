export default function LoadingState({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Table header skeleton */}
      <div className="grid grid-cols-6 gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3">
        {['골프장', '날짜', '시간', '코스', '가격', '비고'].map((col) => (
          <div key={col} className="h-4 w-full animate-pulse rounded bg-gray-300" />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-6 gap-4 border-b border-gray-100 px-4 py-3 last:border-b-0"
        >
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
