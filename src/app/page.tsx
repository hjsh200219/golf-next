import { Suspense } from 'react';
import SearchSection from '@/components/search/SearchSection';
import LoadingState from '@/components/results/LoadingState';

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">골프 티타임 예약 조회 - GolfShin</h1>
      <Suspense fallback={<LoadingState />}>
        <SearchSection />
      </Suspense>
    </>
  );
}
