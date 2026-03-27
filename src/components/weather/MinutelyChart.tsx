'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MinutelyWeather } from '@/lib/types/weather';

interface MinutelyChartProps {
  data: MinutelyWeather[];
}

interface ChartDataPoint {
  time: string;
  precipitation: number;
}

function formatTimeLabel(dt: number): string {
  const d = new Date(dt * 1000);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function prepareData(data: MinutelyWeather[]): ChartDataPoint[] {
  return data.map((item) => ({
    time: formatTimeLabel(item.dt),
    precipitation: item.precipitation,
  }));
}

export default function MinutelyChart({ data }: MinutelyChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-gray-50 py-10 text-sm text-gray-400">
        분별 강수 데이터가 없습니다.
      </div>
    );
  }

  const chartData = prepareData(data);

  // Show every 10-minute tick to avoid crowding
  const tickInterval = Math.max(1, Math.floor(chartData.length / 6));

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-700">분별 강수확률</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="precipGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval - 1}
          />
          <YAxis
            tickFormatter={(v) => `${v}mm`}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value: number) => [`${value}mm`, '강수량']}
            labelFormatter={(label) => `시각: ${label}`}
            labelStyle={{ fontSize: 12, fontWeight: 600 }}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="precipitation"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#precipGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#2563eb' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
