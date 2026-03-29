import { Suspense } from 'react';
import SearchSection from '@/components/search/SearchSection';
import LoadingState from '@/components/results/LoadingState';

export default function HomePage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-gray-800">예약 조회</h1>
      <Suspense fallback={<LoadingState />}>
        <SearchSection />
      </Suspense>
    </>
  );
}
