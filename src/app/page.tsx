import { Suspense } from 'react';
import SearchSection from '@/components/search/SearchSection';
import LoadingState from '@/components/results/LoadingState';

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SearchSection />
    </Suspense>
  );
}
