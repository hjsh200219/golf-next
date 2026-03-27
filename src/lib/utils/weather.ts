/**
 * Weather data formatting utilities
 * 날씨 데이터 포맷 유틸리티
 */

/**
 * 온도를 소수점 없이 °C 단위로 포맷한다.
 */
export function formatTemperature(temp: number): string {
  return `${Math.round(temp)}°C`;
}

/**
 * 풍속을 m/s 단위로 포맷한다.
 */
export function formatWindSpeed(speed: number): string {
  return `${speed.toFixed(1)}m/s`;
}

/**
 * 습도를 % 단위로 포맷한다.
 */
export function formatHumidity(humidity: number): string {
  return `${Math.round(humidity)}%`;
}

/**
 * 강수량을 mm 단위로 포맷한다.
 */
export function formatPrecipitation(mm: number): string {
  if (mm === 0) return '0mm';
  if (mm < 0.1) return '0.1mm 미만';
  return `${mm.toFixed(1)}mm`;
}

/**
 * OpenWeatherMap 날씨 코드를 이모지 아이콘으로 변환한다.
 * https://openweathermap.org/weather-conditions
 */
export function getWeatherIcon(code: number): string {
  // Thunderstorm: 200–232
  if (code >= 200 && code < 300) return '⛈';

  // Drizzle: 300–321
  if (code >= 300 && code < 400) return '🌦';

  // Rain: 500–531
  if (code === 500) return '🌧';
  if (code === 501) return '🌧';
  if (code === 502 || code === 503 || code === 504) return '🌧';
  if (code === 511) return '🌨'; // freezing rain
  if (code >= 520 && code < 532) return '🌦'; // shower rain

  // Snow: 600–622
  if (code >= 600 && code < 700) return '❄️';

  // Atmosphere: 700–781
  if (code === 701 || code === 741) return '🌫';
  if (code === 711) return '💨'; // smoke
  if (code === 721) return '🌁'; // haze
  if (code === 731 || code === 761) return '🌪'; // dust/sand
  if (code === 762) return '🌋'; // volcanic ash
  if (code === 771) return '💨'; // squalls
  if (code === 781) return '🌪'; // tornado

  // Clear: 800
  if (code === 800) return '☀️';

  // Clouds: 801–804
  if (code === 801) return '🌤';
  if (code === 802) return '⛅';
  if (code === 803 || code === 804) return '☁️';

  return '🌡';
}
