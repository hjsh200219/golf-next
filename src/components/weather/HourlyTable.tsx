'use client';

import type { HourlyWeather } from '@/lib/types/weather';
import {
  formatTemperature,
  formatWindSpeed,
  formatHumidity,
  getWeatherIcon,
} from '@/lib/utils/weather';

interface HourlyTableProps {
  data: HourlyWeather[];
  /** 최대 표시 행 수 (기본값: 24) */
  maxRows?: number;
}

function formatHour(dt: number): string {
  const d = new Date(dt * 1000);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatPop(pop: number): string {
  return `${Math.round(pop * 100)}%`;
}

export default function HourlyTable({ data, maxRows = 24 }: HourlyTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-gray-50 py-10 text-sm text-gray-400">
        시간별 날씨 데이터가 없습니다.
      </div>
    );
  }

  const rows = data.slice(0, maxRows);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500"
            >
              시간
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500"
            >
              온도(°C)
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500"
            >
              체감온도
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500"
            >
              습도(%)
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500"
            >
              풍속(m/s)
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500"
            >
              강수확률(%)
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500"
            >
              날씨
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((hour) => {
            const condition = hour.weather[0];
            const icon = condition ? getWeatherIcon(condition.id) : '🌡';
            const description = condition?.description ?? '';

            return (
              <tr key={hour.dt} className="transition-colors hover:bg-gray-50">
                <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-700">
                  {formatHour(hour.dt)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-gray-800">
                  {formatTemperature(hour.temp)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-gray-500">
                  {formatTemperature(hour.feels_like)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-gray-800">
                  {formatHumidity(hour.humidity)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-gray-800">
                  {formatWindSpeed(hour.wind_speed)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <span
                    className={[
                      'font-medium',
                      hour.pop >= 0.7
                        ? 'text-blue-600'
                        : hour.pop >= 0.4
                        ? 'text-blue-400'
                        : 'text-gray-600',
                    ].join(' ')}
                  >
                    {formatPop(hour.pop)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-center">
                  <span
                    title={description}
                    className="cursor-default text-base"
                    aria-label={description}
                  >
                    {icon}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
