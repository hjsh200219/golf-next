'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DailyWeather } from '@/lib/types/weather';

interface DailyChartProps {
  data: DailyWeather[];
}

interface ChartDataPoint {
  date: string;
  tempMin: number;
  tempMax: number;
  pop: number;
}

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDay(dt: number): string {
  const d = new Date(dt * 1000);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = WEEK_DAYS[d.getDay()];
  return `${month}/${day}(${dow})`;
}

function prepareData(data: DailyWeather[]): ChartDataPoint[] {
  return data.slice(0, 7).map((d) => ({
    date: formatDay(d.dt),
    tempMin: Math.round(d.temp.min),
    tempMax: Math.round(d.temp.max),
    pop: Math.round(d.pop * 100),
  }));
}

export default function DailyChart({ data }: DailyChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-gray-50 py-10 text-sm text-gray-400">
        일별 날씨 데이터가 없습니다.
      </div>
    );
  }

  const chartData = prepareData(data);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
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
          yAxisId="pop"
          orientation="right"
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          width={36}
          domain={[0, 100]}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'tempMax') return [`${value}°C`, '최고 기온'];
            if (name === 'tempMin') return [`${value}°C`, '최저 기온'];
            return [`${value}%`, '강수 확률'];
          }}
          labelStyle={{ fontSize: 12, fontWeight: 600 }}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
        />
        <Legend
          formatter={(value) => {
            if (value === 'tempMax') return '최고 기온 (°C)';
            if (value === 'tempMin') return '최저 기온 (°C)';
            return '강수 확률 (%)';
          }}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar
          yAxisId="pop"
          dataKey="pop"
          fill="#bfdbfe"
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
          name="pop"
        />
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="tempMax"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 3, fill: '#ef4444' }}
          activeDot={{ r: 5 }}
          name="tempMax"
        />
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="tempMin"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3, fill: '#3b82f6' }}
          activeDot={{ r: 5 }}
          name="tempMin"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
