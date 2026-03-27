export interface WeatherData {
  minutely?: MinutelyWeather[];
  hourly?: HourlyWeather[];
  daily?: DailyWeather[];
}

export interface MinutelyWeather {
  dt: number;
  precipitation: number;
}

export interface HourlyWeather {
  dt: number;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  pop: number;
  weather: WeatherCondition[];
}

export interface DailyWeather {
  dt: number;
  temp: { min: number; max: number; day: number };
  humidity: number;
  wind_speed: number;
  pop: number;
  weather: WeatherCondition[];
}

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}
