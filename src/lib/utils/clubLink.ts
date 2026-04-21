import type { Database } from '@/lib/types/database';

type GolfClub = Pick<
  Database['public']['Tables']['golf_clubs']['Row'],
  'url' | 'origin' | 'reservation_path'
>;

export function getClubReservationUrl(club: GolfClub | undefined | null): string | null {
  if (!club) return null;

  const { origin, reservation_path, url } = club;

  if (origin && reservation_path) {
    try {
      return new URL(reservation_path, origin).toString();
    } catch {
      // fall through to url
    }
  }

  if (url) return url;
  if (origin) return origin;
  return null;
}
