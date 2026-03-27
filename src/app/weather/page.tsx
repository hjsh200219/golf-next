import WeatherDashboard from '@/components/weather/WeatherDashboard';

export default function WeatherPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">골프장 날씨</h1>
      <WeatherDashboard />
    </div>
  );
}
