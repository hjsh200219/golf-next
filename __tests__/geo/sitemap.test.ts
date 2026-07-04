import { describe, it, expect } from 'vitest';
import sitemap from '@/app/sitemap';

describe('sitemap', () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it('lists the public indexable routes', () => {
    expect(urls).toContain('https://golfshin.vercel.app');
    expect(urls).toContain('https://golfshin.vercel.app/weather');
    expect(urls).toContain('https://golfshin.vercel.app/chatbot');
  });

  it('excludes auth/user-specific and offline routes', () => {
    expect(urls.some((u) => u.includes('/settings'))).toBe(false);
    expect(urls.some((u) => u.includes('/login'))).toBe(false);
    expect(urls.some((u) => u.includes('/_offline'))).toBe(false);
  });

  it('uses absolute https URLs under golfshin.vercel.app', () => {
    urls.forEach((u) => expect(u).toMatch(/^https:\/\/golfshin\.vercel\.app/));
  });

  it('sets valid priorities (0..1) and changeFrequency on every entry', () => {
    const freqs = new Set([
      'always',
      'hourly',
      'daily',
      'weekly',
      'monthly',
      'yearly',
      'never',
    ]);
    entries.forEach((e) => {
      expect(typeof e.priority).toBe('number');
      expect(e.priority).toBeGreaterThanOrEqual(0);
      expect(e.priority).toBeLessThanOrEqual(1);
      expect(freqs.has(e.changeFrequency as string)).toBe(true);
    });
  });

  it('gives the homepage top priority', () => {
    const home = entries.find((e) => e.url === 'https://golfshin.vercel.app');
    expect(home?.priority).toBe(1);
  });
});
