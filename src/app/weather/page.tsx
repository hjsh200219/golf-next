import WeatherDashboard from '@/components/weather/WeatherDashboard';

export default function WeatherPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">날씨 조회</h1>
      <WeatherDashboard />
    </div>
  );
}
