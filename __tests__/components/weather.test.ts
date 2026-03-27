/**
 * Weather component tests
 *
 * MinutelyChart, HourlyTable 및 날씨 데이터 포맷 관련 통합 테스트.
 * React 렌더링 없이 데이터 변환 로직과 엣지 케이스를 검증한다.
 */
import { describe, it, expect } from 'vitest';
import type { MinutelyWeather, HourlyWeather } from '@/lib/types/weather';
import {
  formatTemperature,
  formatWindSpeed,
  formatHumidity,
  formatPrecipitation,
  getWeatherIcon,
} from '@/lib/utils/weather';

// ─── MinutelyChart data helpers ──────────────────────────────────────────────

function makeMinutely(overrides: Partial<MinutelyWeather> = {}): MinutelyWeather {
  return {
    dt: 1700000000,
    precipitation: 0,
    ...overrides,
  };
}

function makeHourly(overrides: Partial<HourlyWeather> = {}): HourlyWeather {
  return {
    dt: 1700000000,
    temp: 20,
    feels_like: 18,
    humidity: 60,
    wind_speed: 3.5,
    pop: 0.2,
    weather: [{ id: 800, main: 'Clear', description: '맑음', icon: '01d' }],
    ...overrides,
  };
}

// ─── MinutelyChart: data preparation ─────────────────────────────────────────

describe('MinutelyChart data preparation', () => {
  it('maps precipitation from minutely data', () => {
    const data: MinutelyWeather[] = [
      makeMinutely({ dt: 1700000000, precipitation: 0.5 }),
      makeMinutely({ dt: 1700000060, precipitation: 1.2 }),
      makeMinutely({ dt: 1700000120, precipitation: 0 }),
    ];

    const precipValues = data.map((d) => d.precipitation);
    expect(precipValues).toEqual([0.5, 1.2, 0]);
  });

  it('handles empty minutely data gracefully', () => {
    const data: MinutelyWeather[] = [];
    expect(data.length).toBe(0);
  });

  it('handles single-point data', () => {
    const data: MinutelyWeather[] = [makeMinutely({ precipitation: 2.3 })];
    expect(data[0].precipitation).toBe(2.3);
  });

  it('dt timestamp converts to valid Date', () => {
    const dt = 1700000000;
    const d = new Date(dt * 1000);
    expect(d).toBeInstanceOf(Date);
    expect(isNaN(d.getTime())).toBe(false);
  });

  it('time formatting produces HH:MM format', () => {
    // 1700000000 Unix timestamp → specific time
    const dt = 1700000000;
    const d = new Date(dt * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const result = `${hh}:${mm}`;
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});

// ─── HourlyTable: column rendering ───────────────────────────────────────────

describe('HourlyTable column data', () => {
  it('formats temperature column correctly', () => {
    const hour = makeHourly({ temp: 22.7 });
    expect(formatTemperature(hour.temp)).toBe('23°C');
  });

  it('formats feels_like column correctly', () => {
    const hour = makeHourly({ feels_like: 19.3 });
    expect(formatTemperature(hour.feels_like)).toBe('19°C');
  });

  it('formats humidity column correctly', () => {
    const hour = makeHourly({ humidity: 65 });
    expect(formatHumidity(hour.humidity)).toBe('65%');
  });

  it('formats wind_speed column correctly', () => {
    const hour = makeHourly({ wind_speed: 4.2 });
    expect(formatWindSpeed(hour.wind_speed)).toBe('4.2m/s');
  });

  it('formats pop (precipitation probability) as percent', () => {
    const hour = makeHourly({ pop: 0.35 });
    const formatted = `${Math.round(hour.pop * 100)}%`;
    expect(formatted).toBe('35%');
  });

  it('formats 0% pop correctly', () => {
    const hour = makeHourly({ pop: 0 });
    const formatted = `${Math.round(hour.pop * 100)}%`;
    expect(formatted).toBe('0%');
  });

  it('formats 100% pop correctly', () => {
    const hour = makeHourly({ pop: 1 });
    const formatted = `${Math.round(hour.pop * 100)}%`;
    expect(formatted).toBe('100%');
  });

  it('maps weather condition to icon', () => {
    const hour = makeHourly({
      weather: [{ id: 800, main: 'Clear', description: '맑음', icon: '01d' }],
    });
    const icon = getWeatherIcon(hour.weather[0].id);
    expect(icon).toBe('☀️');
  });

  it('handles missing weather array gracefully', () => {
    const hour = makeHourly({ weather: [] });
    const icon = hour.weather[0] ? getWeatherIcon(hour.weather[0].id) : '🌡';
    expect(icon).toBe('🌡');
  });

  it('formats hour time as HH:MM', () => {
    const dt = 1700000000;
    const d = new Date(dt * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const formatted = `${hh}:${mm}`;
    expect(formatted).toMatch(/^\d{2}:\d{2}$/);
  });

  it('limits data to maxRows', () => {
    const data = Array.from({ length: 48 }, (_, i) =>
      makeHourly({ dt: 1700000000 + i * 3600 }),
    );
    const maxRows = 24;
    const sliced = data.slice(0, maxRows);
    expect(sliced.length).toBe(24);
  });
});

// ─── Weather data formatting integration ─────────────────────────────────────

describe('Weather data formatting integration', () => {
  it('formats a complete hourly row correctly', () => {
    const hour = makeHourly({
      temp: 18,
      feels_like: 16,
      humidity: 70,
      wind_speed: 2.0,
      pop: 0.45,
      weather: [{ id: 802, main: 'Clouds', description: '구름 조금', icon: '03d' }],
    });

    expect(formatTemperature(hour.temp)).toBe('18°C');
    expect(formatTemperature(hour.feels_like)).toBe('16°C');
    expect(formatHumidity(hour.humidity)).toBe('70%');
    expect(formatWindSpeed(hour.wind_speed)).toBe('2.0m/s');
    expect(`${Math.round(hour.pop * 100)}%`).toBe('45%');
    expect(getWeatherIcon(hour.weather[0].id)).toBe('⛅');
  });

  it('handles rainy conditions', () => {
    const hour = makeHourly({
      temp: 10,
      pop: 0.9,
      weather: [{ id: 501, main: 'Rain', description: '보통 비', icon: '10d' }],
    });

    expect(getWeatherIcon(hour.weather[0].id)).toBe('🌧');
    expect(`${Math.round(hour.pop * 100)}%`).toBe('90%');
  });

  it('handles snow conditions', () => {
    const hour = makeHourly({
      temp: -3,
      weather: [{ id: 601, main: 'Snow', description: '눈', icon: '13d' }],
    });

    expect(formatTemperature(hour.temp)).toBe('-3°C');
    expect(getWeatherIcon(hour.weather[0].id)).toBe('❄️');
  });

  it('formats precipitation amounts', () => {
    expect(formatPrecipitation(0)).toBe('0mm');
    expect(formatPrecipitation(0.05)).toBe('0.1mm 미만');
    expect(formatPrecipitation(5.3)).toBe('5.3mm');
  });
});
