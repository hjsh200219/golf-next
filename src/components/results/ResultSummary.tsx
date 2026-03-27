interface ResultSummaryProps {
  count: number;
  scrapedAt?: string | null;
  isLoading?: boolean;
}

function formatScrapedAt(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ResultSummary({
  count,
  scrapedAt,
  isLoading = false,
}: ResultSummaryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-5 w-20 animate-shimmer rounded-md" />
        <div className="h-4 w-36 animate-shimmer rounded-md" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-medium text-gray-700 shadow-card ring-1 ring-gray-100">
        <span className="tabular-nums text-golf-primary font-semibold">
          {count.toLocaleString('ko-KR')}
        </span>
        <span className="text-gray-400">건</span>
      </span>
      {scrapedAt && (
        <span className="text-xs text-gray-400 tabular-nums">
          {formatScrapedAt(scrapedAt)} 수집
        </span>
      )}
    </div>
  );
}
