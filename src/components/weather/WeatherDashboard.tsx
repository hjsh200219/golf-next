'use client';

import { useState, useEffect } from 'react';
import { useClubs, type ClubWithCourses } from '@/hooks/useClubs';
import { useWeather } from '@/hooks/useWeather';
import HourlyChart from '@/components/weather/HourlyChart';
import DailyChart from '@/components/weather/DailyChart';
import MinutelyChart from '@/components/weather/MinutelyChart';
import HourlyTable from '@/components/weather/HourlyTable';

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

  const selectedClub: ClubWithCourses | undefined = clubs?.find(
    (c) => c.id === selectedClubId,
  );

  const firstCourse = selectedClub?.courses?.[0];
  const clubLat = selectedClub?.lat ?? firstCourse?.lat ?? null;
  const clubLon = selectedClub?.lon ?? firstCourse?.lon ?? null;

  const { data: weather, isLoading: weatherLoading, error: weatherError, mutate: retryWeather } = useWeather(
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
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-golf-primary border-t-transparent" />
          <span className="ml-2 text-sm text-gray-500">날씨 정보 불러오는 중...</span>
        </div>
      );
    }

    if (weatherError) {
      return (
        <div className="animate-fade-up flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-red-700">날씨 데이터를 불러올 수 없습니다</p>
          <p className="mt-1 text-xs text-red-500">{weatherError.message}</p>
          <button
            onClick={() => retryWeather()}
            className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-200 spring-hover"
          >
            다시 시도
          </button>
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
            className="w-full appearance-none rounded-xl border border-gray-300 bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat px-4 py-2.5 pr-10 text-sm text-gray-800 min-h-[44px] focus:border-golf-primary focus:outline-none focus:ring-2 focus:ring-golf-primary/40 disabled:opacity-50"
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
                  ? 'border-golf-primary text-golf-primary'
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
