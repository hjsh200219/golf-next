'use client';

import { useFavorites } from '@/hooks/useFavorites';

interface FavoriteToggleProps {
  clubId: string;
  clubName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const BUTTON_CLASSES: Record<string, string> = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
};

export default function FavoriteToggle({
  clubId,
  clubName,
  size = 'md',
}: FavoriteToggleProps) {
  const { isFavorite, toggle, isLoading } = useFavorites();

  const favorited = isFavorite(clubId);
  const label = favorited
    ? `${clubName ?? '골프장'} 즐겨찾기 해제`
    : `${clubName ?? '골프장'} 즐겨찾기 추가`;

  return (
    <button
      type="button"
      onClick={() => toggle(clubId)}
      disabled={isLoading}
      aria-label={label}
      title={label}
      className={[
        'rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400',
        'disabled:opacity-50',
        BUTTON_CLASSES[size],
        favorited
          ? 'text-yellow-500 hover:text-yellow-600'
          : 'text-gray-300 hover:text-yellow-400',
      ].join(' ')}
    >
      {favorited ? (
        // Filled star
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={SIZE_CLASSES[size]}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ) : (
        // Outlined star
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={SIZE_CLASSES[size]}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      )}
    </button>
  );
}
