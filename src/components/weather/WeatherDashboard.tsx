'use client';

import { useState, useEffect } from 'react';
import { useClubs } from '@/hooks/useClubs';
import { useWeather } from '@/hooks/useWeather';
import HourlyChart from '@/components/weather/HourlyChart';
import DailyChart from '@/components/weather/DailyChart';
import MinutelyChart from '@/components/weather/MinutelyChart';
import HourlyTable from '@/components/weather/HourlyTable';
import type { Database } from '@/lib/types/database';

type GolfClub = Database['public']['Tables']['golf_clubs']['Row'] & {
  courses?: Array<{ lat: number | null; lon: number | null; course_name: string }>;
};

type TabKey = 'hourly' | 'daily' | 'minutely' | 'table';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'hourly', label: '시간별 차트' },
  { key: 'table', label: '시간별 상세' },
  { key: 'daily', label: '주간' },
  { key: 'minutely', label: '분별 강수' },
];

export default function WeatherDashboard() {
  const { data: clubs, isLoading: clubsLoading } = useClubs();
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('hourly');

  // 클럽 로드 시 첫 번째 클럽 자동 선택
  useEffect(() => {
    if (clubs && clubs.length > 0 && !selectedClubId) {
      setSelectedClubId(clubs[0].id);
    }
  }, [clubs, selectedClubId]);

  const selectedClub: GolfClub | undefined = clubs?.find(
    (c) => c.id === selectedClubId,
  );

  const firstCourse = selectedClub?.courses?.[0];
  const clubLat = selectedClub?.lat ?? firstCourse?.lat ?? null;
  const clubLon = selectedClub?.lon ?? firstCourse?.lon ?? null;

  const { data: weather, isLoading: weatherLoading } = useWeather(
    clubLat,
    clubLon,
  );

  function renderContent() {
    if (!selectedClubId) {
      return (
        <p className="py-10 text-center text-sm text-gray-400">
          날씨를 확인할 골프장을 선택하세요.
        </p>
      );
    }

    if (weatherLoading) {
      return (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          <span className="ml-2 text-sm text-gray-500">날씨 정보 불러오는 중...</span>
        </div>
      );
    }

    if (!weather) {
      return (
        <p className="py-10 text-center text-sm text-gray-400">
          날씨 데이터를 불러올 수 없습니다. (위치 정보 미등록)
        </p>
      );
    }

    switch (activeTab) {
      case 'hourly':
        return <HourlyChart data={weather.hourly ?? []} />;
      case 'daily':
        return <DailyChart data={weather.daily ?? []} />;
      case 'minutely':
        return (
          <MinutelyChart data={weather.minutely ?? []} />
        );
      case 'table':
        return <HourlyTable data={weather.hourly ?? []} />;
      default:
        return null;
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-gray-900">날씨</h2>

        {/* Club selector */}
        <div className="sm:w-56">
          <label htmlFor="weather-club-select" className="sr-only">
            골프장 선택
          </label>
          <select
            id="weather-club-select"
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            disabled={clubsLoading}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
          >
            <option value="">-- 골프장 선택 --</option>
            {(clubs ?? []).map((club) => (
              <option key={club.id} value={club.id}>
                {club.display_name ?? club.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 px-4">
        <nav className="-mb-px flex gap-4 overflow-x-auto" aria-label="날씨 탭">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={[
                'whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors focus:outline-none',
                activeTab === key
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
              aria-current={activeTab === key ? 'page' : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Chart / Table area */}
      <div className="px-4 py-5">{renderContent()}</div>
    </div>
  );
}
