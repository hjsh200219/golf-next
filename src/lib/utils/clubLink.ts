import type { Database } from '@/lib/types/database';

type GolfClub = Pick<
  Database['public']['Tables']['golf_clubs']['Row'],
  'url' | 'origin' | 'reservation_path'
>;

/**
 * User-facing 바로가기 URL.
 * `reservation_path` is a scraper AJAX endpoint — never join it for the UI.
 */
export function getClubHomepageUrl(club: GolfClub | undefined | null): string | null {
  if (!club) return null;
  if (club.origin) return club.origin;
  if (club.url) return club.url;
  return null;
}
