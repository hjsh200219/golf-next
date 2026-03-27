import FavoriteClubList from '@/components/favorites/FavoriteClubList';

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">즐겨찾기 관리</h1>
      <FavoriteClubList />
    </div>
  );
}
