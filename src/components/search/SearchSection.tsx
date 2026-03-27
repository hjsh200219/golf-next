'use client';

import SearchBar from '@/components/search/SearchBar';
import FilterPanel from '@/components/search/FilterPanel';
import TeeTimeTable from '@/components/results/TeeTimeTable';
import ResultSummary from '@/components/results/ResultSummary';
import { useTeeTimes } from '@/hooks/useTeeTimes';
import { useSearchParams } from 'next/navigation';
import { toDateString } from '@/lib/utils/date';

export default function SearchSection() {
  const searchParams = useSearchParams();
  const date = searchParams.get('date') || toDateString(new Date());
  const { data, isLoading } = useTeeTimes(date);

  const teeTimes = data ?? [];
  const scrapedAt = teeTimes.length > 0 ? teeTimes[0].scraped_at : null;

  return (
    <div className="space-y-4">
      <SearchBar />
      <FilterPanel />
      <ResultSummary count={teeTimes.length} scrapedAt={scrapedAt} isLoading={isLoading} />
      <TeeTimeTable />
    </div>
  );
}
