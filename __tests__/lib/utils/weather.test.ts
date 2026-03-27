import { describe, it, expect } from 'vitest';
import {
  formatTemperature,
  formatWindSpeed,
  formatHumidity,
  formatPrecipitation,
  getWeatherIcon,
} from '@/lib/utils/weather';

describe('formatTemperature', () => {
  it('formats positive temperature', () => {
    expect(formatTemperature(25)).toBe('25°C');
  });

  it('formats negative temperature', () => {
    expect(formatTemperature(-5)).toBe('-5°C');
  });

  it('rounds decimal temperatures', () => {
    expect(formatTemperature(22.7)).toBe('23°C');
    expect(formatTemperature(22.3)).toBe('22°C');
  });

  it('formats zero', () => {
    expect(formatTemperature(0)).toBe('0°C');
  });
});

describe('formatWindSpeed', () => {
  it('formats wind speed with one decimal place', () => {
    expect(formatWindSpeed(5.5)).toBe('5.5m/s');
  });

  it('formats integer wind speed with trailing zero', () => {
    expect(formatWindSpeed(3)).toBe('3.0m/s');
  });

  it('formats zero wind speed', () => {
    expect(formatWindSpeed(0)).toBe('0.0m/s');
  });

  it('formats high wind speed', () => {
    expect(formatWindSpeed(20.8)).toBe('20.8m/s');
  });
});

describe('formatHumidity', () => {
  it('formats humidity as percentage', () => {
    expect(formatHumidity(75)).toBe('75%');
  });

  it('formats 100% humidity', () => {
    expect(formatHumidity(100)).toBe('100%');
  });

  it('formats 0% humidity', () => {
    expect(formatHumidity(0)).toBe('0%');
  });

  it('rounds decimal humidity', () => {
    expect(formatHumidity(72.6)).toBe('73%');
  });
});

describe('formatPrecipitation', () => {
  it('formats zero precipitation', () => {
    expect(formatPrecipitation(0)).toBe('0mm');
  });

  it('formats trace precipitation (less than 0.1mm)', () => {
    expect(formatPrecipitation(0.05)).toBe('0.1mm 미만');
  });

  it('formats normal precipitation', () => {
    expect(formatPrecipitation(1.5)).toBe('1.5mm');
  });

  it('formats heavy precipitation', () => {
    expect(formatPrecipitation(25)).toBe('25.0mm');
  });
});

describe('getWeatherIcon', () => {
  it('returns thunderstorm icon for codes 200–232', () => {
    expect(getWeatherIcon(200)).toBe('⛈');
    expect(getWeatherIcon(232)).toBe('⛈');
  });

  it('returns drizzle icon for codes 300–321', () => {
    expect(getWeatherIcon(300)).toBe('🌦');
    expect(getWeatherIcon(321)).toBe('🌦');
  });

  it('returns rain icon for code 500', () => {
    expect(getWeatherIcon(500)).toBe('🌧');
  });

  it('returns snow icon for codes 600–622', () => {
    expect(getWeatherIcon(600)).toBe('❄️');
    expect(getWeatherIcon(622)).toBe('❄️');
  });

  it('returns clear sky icon for code 800', () => {
    expect(getWeatherIcon(800)).toBe('☀️');
  });

  it('returns partly cloudy icon for code 801', () => {
    expect(getWeatherIcon(801)).toBe('🌤');
  });

  it('returns scattered clouds icon for code 802', () => {
    expect(getWeatherIcon(802)).toBe('⛅');
  });

  it('returns overcast icon for codes 803–804', () => {
    expect(getWeatherIcon(803)).toBe('☁️');
    expect(getWeatherIcon(804)).toBe('☁️');
  });

  it('returns fallback icon for unknown code', () => {
    expect(getWeatherIcon(9999)).toBe('🌡');
  });

  it('returns fog icon for code 741', () => {
    expect(getWeatherIcon(741)).toBe('🌫');
  });

  it('returns tornado icon for code 781', () => {
    expect(getWeatherIcon(781)).toBe('🌪');
  });
});
