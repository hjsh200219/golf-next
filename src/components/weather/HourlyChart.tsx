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
  ReferenceLine,
} from 'recharts';
import type { HourlyWeather } from '@/lib/types/weather';

interface HourlyChartProps {
  data: HourlyWeather[];
}

interface ChartDataPoint {
  hour: string;
  fullLabel: string;
  temp: number;
  precip: number;
  isNewDay: boolean;
}

function formatHour(dt: number): { hour: string; fullLabel: string; isNewDay: boolean } {
  const d = new Date(dt * 1000);
  const h = d.getHours();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return {
    hour: h === 0 ? `${m}/${day}` : `${h}시`,
    fullLabel: `${m}/${day} ${h}시`,
    isNewDay: h === 0,
  };
}

function prepareData(data: HourlyWeather[]): ChartDataPoint[] {
  return data.map((h) => {
    const { hour, fullLabel, isNewDay } = formatHour(h.dt);
    return {
      hour,
      fullLabel,
      temp: Math.round(h.temp),
      precip: Math.round(h.pop * 100),
      isNewDay,
    };
  });
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
  const dayBoundaries = chartData
    .map((d, i) => (d.isNewDay ? i : -1))
    .filter((i) => i > 0);

  return (
    <div>
      <p className="mb-2 text-xs text-gray-400 tabular-nums">{data.length}시간 예보</p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            interval={3}
          />
          <YAxis
            yAxisId="temp"
            orientation="left"
            tickFormatter={(v) => `${v}°`}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
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
            labelFormatter={(_label: string) => _label}
            labelStyle={{ fontSize: 12, fontWeight: 600 }}
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          />
          <Legend
            formatter={(value) => (value === 'temp' ? '기온 (°C)' : '강수 확률 (%)')}
            wrapperStyle={{ fontSize: 12 }}
          />
          {dayBoundaries.map((idx) => (
            <ReferenceLine
              key={idx}
              x={chartData[idx].hour}
              stroke="#d1d5db"
              strokeDasharray="4 4"
              yAxisId="temp"
            />
          ))}
          <Bar
            yAxisId="precip"
            dataKey="precip"
            fill="#bfdbfe"
            radius={[3, 3, 0, 0]}
            maxBarSize={16}
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
    </div>
  );
}
