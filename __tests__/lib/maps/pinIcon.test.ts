import { describe, it, expect } from 'vitest';
import { pinIcon, dotIcon } from '@/lib/maps/pinIcon';

describe('pinIcon', () => {
  it('returns an SVG data URL containing the price text', () => {
    const icon = pinIcon('10.9만', false);
    expect(icon.url.startsWith('data:image/svg+xml;charset=UTF-8,')).toBe(true);
    expect(decodeURIComponent(icon.url)).toContain('10.9만');
  });

  it('grows with the text and is larger + darker when selected', () => {
    const short = pinIcon('9만', false);
    const long = pinIcon('22.7만', false);
    const sel = pinIcon('22.7만', true);
    expect(long.width).toBeGreaterThan(short.width);
    expect(sel.width).toBeGreaterThan(long.width);
    expect(decodeURIComponent(sel.url)).toContain('#14532d');
    expect(decodeURIComponent(long.url)).not.toContain('#14532d');
  });

  it('anchors at the bottom tip so the pin points at the course', () => {
    const icon = pinIcon('25만', false);
    expect(icon.anchorX).toBe(icon.width / 2);
    expect(icon.anchorY).toBe(icon.height);
  });

  it('escapes text so labels cannot inject markup', () => {
    expect(decodeURIComponent(pinIcon('<b>&', false).url)).toContain('&lt;b&gt;&amp;');
  });

  it('dotIcon is a small centered dot for pins hidden by overlap', () => {
    const d = dotIcon();
    expect(d.width).toBeLessThanOrEqual(14);
    expect(d.anchorX).toBe(d.width / 2);
    expect(d.anchorY).toBe(d.height / 2);
    expect(decodeURIComponent(d.url)).toContain('<circle');
  });
});
