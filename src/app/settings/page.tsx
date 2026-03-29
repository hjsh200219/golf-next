import FavoriteClubList from '@/components/favorites/FavoriteClubList';

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">즐겨찾기 관리</h1>
        <p className="mt-1 text-sm text-gray-500">자주 가는 골프장을 즐겨찾기하면 홈에서 바로 필터할 수 있어요</p>
      </div>
      <FavoriteClubList />
    </div>
  );
}
