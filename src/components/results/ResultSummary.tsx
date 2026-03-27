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
        <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="font-semibold text-gray-800">
        총{' '}
        <span className="text-green-600">{count.toLocaleString('ko-KR')}</span>
        건
      </span>
      {scrapedAt && (
        <span className="text-gray-400">
          마지막 수집: {formatScrapedAt(scrapedAt)}
        </span>
      )}
    </div>
  );
}
