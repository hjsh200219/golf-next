'use client';

import { useClubs } from '@/hooks/useClubs';
import { useFavorites } from '@/hooks/useFavorites';
import FavoriteToggle from '@/components/favorites/FavoriteToggle';
import type { Database } from '@/lib/types/database';

type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];

interface FavoriteClubListProps {
  /** If true, show only favorited clubs; otherwise show all clubs with favorite toggles */
  onlyFavorites?: boolean;
}

function ClubCard({ club }: { club: GolfClub }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">
          {club.display_name ?? club.name}
        </p>
        {club.address && (
          <p className="mt-0.5 truncate text-xs text-gray-400">{club.address}</p>
        )}
      </div>
      <FavoriteToggle clubId={club.id} clubName={club.display_name ?? club.name} />
    </div>
  );
}

export default function FavoriteClubList({
  onlyFavorites = false,
}: FavoriteClubListProps) {
  const { data: clubs, isLoading: clubsLoading, error: clubsError, mutate: retryClubs } = useClubs();
  const { favoriteIds, isLoading: favLoading } = useFavorites();

  const isLoading = clubsLoading || favLoading;

  if (clubsError) {
    return (
      <div className="animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-red-700">골프장 목록을 불러올 수 없습니다</p>
        <p className="mt-1 text-xs text-red-500">{clubsError.message}</p>
        <button
          onClick={() => retryClubs()}
          className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-200 spring-hover"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl bg-gray-200"
          />
        ))}
      </div>
    );
  }

  if (!clubs || clubs.length === 0) {
    return <p className="text-sm text-gray-500">등록된 골프장이 없습니다.</p>;
  }

  const displayedClubs = onlyFavorites
    ? clubs.filter((c) => favoriteIds.includes(c.id))
    : clubs;

  if (displayedClubs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-2 h-8 w-8 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
        <p className="text-sm font-medium text-gray-500">즐겨찾기한 골프장이 없습니다.</p>
        <p className="mt-1 text-xs text-gray-400">
          별표 버튼을 눌러 즐겨찾기를 추가해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {displayedClubs.map((club) => (
        <ClubCard key={club.id} club={club} />
      ))}
    </div>
  );
}
