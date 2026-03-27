'use client';

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { HourlyWeather } from '@/lib/types/weather';

interface HourlyChartProps {
  data: HourlyWeather[];
}

interface ChartDataPoint {
  hour: string;
  temp: number;
  precip: number;
}

function formatHour(dt: number): string {
  const d = new Date(dt * 1000);
  const h = d.getHours();
  return `${h}시`;
}

function prepareData(data: HourlyWeather[]): ChartDataPoint[] {
  return data.slice(0, 24).map((h) => ({
    hour: formatHour(h.dt),
    temp: Math.round(h.temp),
    precip: Math.round(h.pop * 100),
  }));
}

export default function HourlyChart({ data }: HourlyChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-gray-50 py-10 text-sm text-gray-400">
        시간별 날씨 데이터가 없습니다.
      </div>
    );
  }

  const chartData = prepareData(data);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          interval={2}
        />
        {/* Left Y-axis: temperature */}
        <YAxis
          yAxisId="temp"
          orientation="left"
          tickFormatter={(v) => `${v}°`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        {/* Right Y-axis: precipitation probability */}
        <YAxis
          yAxisId="precip"
          orientation="right"
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          width={36}
          domain={[0, 100]}
        />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === 'temp' ? [`${value}°C`, '기온'] : [`${value}%`, '강수 확률']
          }
          labelStyle={{ fontSize: 12, fontWeight: 600 }}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
        />
        <Legend
          formatter={(value) => (value === 'temp' ? '기온 (°C)' : '강수 확률 (%)')}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar
          yAxisId="precip"
          dataKey="precip"
          fill="#bfdbfe"
          radius={[3, 3, 0, 0]}
          maxBarSize={20}
          name="precip"
        />
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="temp"
          stroke="#059669"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          name="temp"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
